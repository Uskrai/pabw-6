use argon2::Argon2;
use axum::{
    extract::{FromRef, FromRequestParts, State},
    headers::{authorization::Bearer, Authorization, Cookie, Header, SetCookie},
    http::{request::Parts, HeaderValue},
    Json, RequestPartsExt, TypedHeader,
};
use bson::oid::ObjectId;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use tap::TapFallible;
use time::OffsetDateTime;
use validator::Validate;

use crate::{
    error::{Error, UnauthorizedType},
    mongo_ext::Collection,
    util::{hash_password, verify_password, DecimalString, FormattedDateTime, ObjectIdString},
};

use super::token::{
    create_refresh_token, decode_access_token, decode_refresh_token, generate_access_token,
    JwtState, RefreshTokenClaims, RefreshTokenCollection,
};

#[derive(Clone)]
pub struct UserCollection(pub Collection<UserModel>);

impl std::ops::Deref for UserCollection {
    type Target = Collection<UserModel>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct UserModel {
    #[serde(rename = "_id")]
    pub id: ObjectId,

    pub name: String,
    pub email: String,
    pub password: String,
    pub role: UserRole,

    #[serde(default)]
    pub balance: Decimal,

    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum UserRole {
    #[default]
    Customer,
    Courier,
    Admin,
}

#[derive(Debug)]
pub struct UserAccess {
    pub id: ObjectId,
    pub role: UserRole,
}

impl UserAccess {
    pub fn from_token(jwt_state: &JwtState, token: &str) -> Result<Self, Error> {
        let token = decode_access_token(jwt_state, token)?;

        if token.claims.is_expired() {
            return Err(Error::Unauthorized(UnauthorizedType::InvalidAccessToken));
        }

        Ok(Self {
            id: token.claims.sub.0,
            role: token.claims.user_role,
        })
    }
}

#[axum::async_trait]
impl<S> FromRequestParts<S> for UserAccess
where
    JwtState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Error;
    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let TypedHeader(Authorization(token)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| Error::Unauthorized(UnauthorizedType::InvalidAccessToken))?;

        let jwt = JwtState::from_ref(&state);

        Self::from_token(&jwt, token.token())
    }
}

#[derive(Debug)]
pub struct RefreshToken(String);

#[axum::async_trait]
impl<S> FromRequestParts<S> for RefreshToken {
    type Rejection = Error;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let cookie = parts
            .extract::<TypedHeader<Cookie>>()
            .await
            .map_err(|_| Error::Unauthorized(UnauthorizedType::InvalidRefreshToken))
            .tap_err(|_| tracing::debug!("cookie not found"))?;

        let refresh_token = cookie
            .get("refresh_token")
            .ok_or_else(|| Error::Unauthorized(UnauthorizedType::InvalidRefreshToken))
            .tap_err(|_| tracing::debug!("token not found"))?;

        Ok(Self(refresh_token.to_string()))
    }
}

#[derive(Debug)]
pub struct RefreshClaim(pub RefreshTokenClaims, pub String);

impl RefreshClaim {
    pub fn from_token(jwt_state: &JwtState, refresh_token: String) -> Result<Self, Error> {
        let token = decode_refresh_token(&jwt_state, &refresh_token)
            .map_err(|_| Error::Unauthorized(UnauthorizedType::InvalidRefreshToken))?;

        Ok(Self(token.claims, refresh_token))
    }
}

#[axum::async_trait]
impl<S> FromRequestParts<S> for RefreshClaim
where
    JwtState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Error;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let RefreshToken(refresh_token) = parts.extract::<RefreshToken>().await?;

        let jwt = JwtState::from_ref(state);

        Ok(Self::from_token(&jwt, refresh_token)?)
    }
}

impl UserModel {
    pub async fn from_id(
        id: ObjectId,
        UserCollection(users): &UserCollection,
    ) -> Result<Self, Error> {
        users
            .find_one(
                bson::doc! {
                    "_id": id
                },
                None,
            )
            .await?
            .ok_or_else(|| Error::Unauthorized(UnauthorizedType::InvalidAccessToken))
    }
}

#[axum::async_trait]
impl<S> FromRequestParts<S> for UserModel
where
    JwtState: FromRef<S>,
    UserCollection: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Error;
    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let access = parts.extract_with_state::<UserAccess, _>(state).await?;
        let users = UserCollection::from_ref(state);
        Self::from_id(access.id, &users).await
    }
}

#[derive(Validate, Serialize, Deserialize, Debug, Clone)]
pub struct RegisterRequest {
    #[validate(length(min = 1, max = 124))]
    pub name: String,

    #[validate(email)]
    pub email: String,

    #[validate(length(min = 8, max = 64))]
    pub password: String,

    #[validate(must_match = "password")]
    pub confirm_password: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RegisterResponse {
    pub id: ObjectIdString,

    pub name: String,
    pub email: String,
    pub role: UserRole,

    pub balance: DecimalString,

    pub created_at: FormattedDateTime,
    pub updated_at: FormattedDateTime,
}

impl From<UserModel> for RegisterResponse {
    fn from(value: UserModel) -> Self {
        Self {
            id: value.id.into(),
            name: value.name,
            email: value.email,
            role: value.role,

            balance: value.balance.into(),

            created_at: value.created_at.into(),
            updated_at: value.updated_at.into(),
        }
    }
}

#[derive(Validate)]
pub struct CreateUserRequest {
    #[validate(length(min = 1, max = 124))]
    pub name: String,

    #[validate(email)]
    pub email: String,

    #[validate(length(min = 8, max = 64))]
    pub password: String,

    #[validate(must_match = "password")]
    pub confirm_password: String,

    pub balance: Decimal,

    pub role: UserRole,
}

pub async fn create_user(
    users: UserCollection,
    argon: Argon2<'_>,
    request: CreateUserRequest,
) -> Result<UserModel, Error> {
    request.validate()?;
    let count = users
        .count_documents(
            bson::doc! {
                "email": &request.email
            },
            None,
        )
        .await?;

    if count > 0 {
        return Err(Error::MustUniqueError("email".to_string()));
    }

    let model = UserModel {
        id: ObjectId::new(),
        name: request.name,
        email: request.email,
        password: hash_password(&argon, &request.password)?,
        role: request.role,
        balance: request.balance,
        created_at: OffsetDateTime::now_utc().into(),
        updated_at: OffsetDateTime::now_utc().into(),
    };
    users.insert_one(&model, None).await?;

    Ok(model)
}

pub async fn register(
    State(users): State<UserCollection>,
    State(argon): State<Argon2<'_>>,
    Json(request): Json<RegisterRequest>,
) -> Result<Json<RegisterResponse>, Error> {
    create_user(
        users,
        argon,
        CreateUserRequest {
            name: request.name,
            email: request.email,
            password: request.password,
            confirm_password: request.confirm_password,
            balance: Decimal::from(0),
            role: UserRole::Customer,
        },
    )
    .await
    .map(|it| Json(it.into()))
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LoginResponse {
    pub refresh_token: String,
    pub access_token: String,
}

pub async fn login(
    State(users): State<UserCollection>,
    State(refresh_tokens): State<RefreshTokenCollection>,
    State(jwt_state): State<JwtState>,
    State(argon): State<Argon2<'static>>,
    Json(request): Json<LoginRequest>,
) -> Result<(TypedHeader<SetCookie>, Json<LoginResponse>), Error> {
    let user = users
        .find_one(
            bson::doc! {
                "email": &request.email
            },
            None,
        )
        .await?;

    let user = match user {
        Some(user) if verify_password(&argon, &request.password, &user.password) => user,
        _ => {
            return Err(Error::Unauthorized(
                UnauthorizedType::WrongUsernameOrPassword,
            ))
        }
    };

    let refresh_token = create_refresh_token(&jwt_state, &argon, refresh_tokens, &user).await?;
    let access_token = generate_access_token(&jwt_state, &user)?;

    let header = TypedHeader(
        SetCookie::decode(
            &mut [HeaderValue::from_str(&format!(
                "refresh_token={}; HttpOnly; Path=/",
                refresh_token
            ))
            .unwrap()]
            .as_slice()
            .iter(),
        )
        .unwrap(),
    );

    Ok((
        header,
        Json(LoginResponse {
            refresh_token,
            access_token: access_token.token,
        }),
    ))
}

pub async fn logout(
    State(refresh_tokens): State<RefreshTokenCollection>,
    RefreshClaim(claim, _): RefreshClaim,
) -> Result<(), Error> {
    let _m = refresh_tokens
        .find_one(bson::doc! { "_id": claim.sub }, None)
        .await?
        .ok_or_else(|| Error::Unauthorized(UnauthorizedType::InvalidRefreshToken))?;

    refresh_tokens
        .delete_one(bson::doc! { "_id": claim.sub }, None)
        .await?;

    Ok(())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RefreshAccessTokenResponse {
    pub access_token: String,
    pub expired_at: FormattedDateTime,
}

pub async fn refresh_access_token(
    State(users): State<UserCollection>,
    State(refresh_tokens): State<RefreshTokenCollection>,
    State(jwt_state): State<JwtState>,
    State(argon): State<Argon2<'static>>,
    RefreshClaim(claim, refresh_token): RefreshClaim,
) -> Result<Json<RefreshAccessTokenResponse>, Error> {
    tracing::debug!("{:?}", claim);
    let model = refresh_tokens
        .find_one(bson::doc! { "_id": claim.sub }, None)
        .await?
        .ok_or_else(|| Error::Unauthorized(UnauthorizedType::InvalidRefreshToken))?;

    if !verify_password(&argon, &refresh_token, &model.token) {
        refresh_tokens
            .delete_one(bson::doc! { "_id": claim.sub }, None)
            .await?;
    }

    let user = users
        .find_one(bson::doc! { "_id": claim.user_id }, None)
        .await?
        .ok_or_else(|| Error::Unauthorized(UnauthorizedType::InvalidRefreshToken))?;

    let access_token = generate_access_token(&jwt_state, &user)?;

    Ok(Json(RefreshAccessTokenResponse {
        access_token: access_token.token,
        expired_at: access_token.expired_at.into(),
    }))
}

#[cfg(test)]
mod test {
    use assert_matches::assert_matches;
    use axum::{extract::FromRequestParts, Json};

    use crate::{
        api::v1::tests::bootstrap,
        error::{Error, UnauthorizedType},
    };

    #[tokio::test]
    async fn test_register() {
        let bootstrap = bootstrap().await;

        let _ = super::register(
            bootstrap.user_collection(),
            bootstrap.argon(),
            Json(super::RegisterRequest {
                name: "name".to_string(),
                email: "email@gmail.com".to_string(),
                password: "password".to_string(),
                confirm_password: "password".to_string(),
            }),
        )
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn test_login() {
        let bootstrap = bootstrap().await;

        let _ = super::register(
            bootstrap.user_collection(),
            bootstrap.argon(),
            Json(super::RegisterRequest {
                name: "name".to_string(),
                email: "email@test.com".to_string(),
                password: "password".to_string(),
                confirm_password: "password".to_string(),
            }),
        )
        .await
        .unwrap();

        let (_, Json(user)) = super::login(
            bootstrap.user_collection(),
            bootstrap.refresh_token_collection(),
            bootstrap.jwt_state(),
            bootstrap.argon(),
            Json(super::LoginRequest {
                email: "email@test.com".to_string(),
                password: "password".to_string(),
            }),
        )
        .await
        .unwrap();

        let _token = super::refresh_access_token(
            bootstrap.user_collection(),
            bootstrap.refresh_token_collection(),
            bootstrap.jwt_state(),
            bootstrap.argon(),
            super::RefreshClaim::from_token(
                &bootstrap.app_state.jwt_state,
                user.refresh_token.clone(),
            )
            .unwrap(),
        )
        .await
        .unwrap();

        let err = super::login(
            bootstrap.user_collection(),
            bootstrap.refresh_token_collection(),
            bootstrap.jwt_state(),
            bootstrap.argon(),
            Json(super::LoginRequest {
                email: "email@test.com".to_string(),
                password: "wrongpassword".to_string(),
            }),
        )
        .await
        .unwrap_err();
        assert_matches!(
            err,
            Error::Unauthorized(UnauthorizedType::WrongUsernameOrPassword)
        );

        let err = super::login(
            bootstrap.user_collection(),
            bootstrap.refresh_token_collection(),
            bootstrap.jwt_state(),
            bootstrap.argon(),
            Json(super::LoginRequest {
                email: "wrongemail@test.com".to_string(),
                password: "wrongpassword".to_string(),
            }),
        )
        .await
        .unwrap_err();
        assert_matches!(
            err,
            Error::Unauthorized(UnauthorizedType::WrongUsernameOrPassword)
        );
    }

    #[tokio::test]
    async fn test_logout() {
        let bootstrap = bootstrap().await;

        let _ = super::register(
            bootstrap.user_collection(),
            bootstrap.argon(),
            Json(super::RegisterRequest {
                name: "name".to_string(),
                email: "email@test.com".to_string(),
                password: "password".to_string(),
                confirm_password: "password".to_string(),
            }),
        )
        .await
        .unwrap();

        let (_, Json(user)) = super::login(
            bootstrap.user_collection(),
            bootstrap.refresh_token_collection(),
            bootstrap.jwt_state(),
            bootstrap.argon(),
            Json(super::LoginRequest {
                email: "email@test.com".to_string(),
                password: "password".to_string(),
            }),
        )
        .await
        .unwrap();

        let _ = super::logout(
            bootstrap.refresh_token_collection(),
            super::RefreshClaim::from_token(
                &bootstrap.app_state.jwt_state,
                user.refresh_token.clone(),
            )
            .unwrap(),
        )
        .await
        .unwrap();

        let err = super::logout(
            bootstrap.refresh_token_collection(),
            super::RefreshClaim::from_token(
                &bootstrap.app_state.jwt_state,
                user.refresh_token.clone(),
            )
            .unwrap(),
        )
        .await
        .unwrap_err();

        assert_matches!(
            err,
            Error::Unauthorized(UnauthorizedType::InvalidRefreshToken)
        );

        let err = super::refresh_access_token(
            bootstrap.user_collection(),
            bootstrap.refresh_token_collection(),
            bootstrap.jwt_state(),
            bootstrap.argon(),
            super::RefreshClaim::from_token(
                &bootstrap.app_state.jwt_state,
                user.refresh_token.clone(),
            )
            .unwrap(),
        )
        .await
        .unwrap_err();

        assert_matches!(
            err,
            Error::Unauthorized(UnauthorizedType::InvalidRefreshToken)
        );
    }

    #[tokio::test]
    async fn test_refresh_access_token_deleted_user() {
        let bootstrap = bootstrap().await;

        let refresh_token = bootstrap.user_refresh_token().await;

        bootstrap
            .app_state
            .user_collection
            .delete_one(
                bson::doc! {
                    "_id": bootstrap.user_id()
                },
                None,
            )
            .await
            .unwrap();

        let error = super::refresh_access_token(
            bootstrap.user_collection(),
            bootstrap.refresh_token_collection(),
            bootstrap.jwt_state(),
            bootstrap.argon(),
            super::RefreshClaim::from_token(&bootstrap.app_state.jwt_state, refresh_token).unwrap(),
        )
        .await
        .unwrap_err();
        assert_matches!(
            error,
            Error::Unauthorized(UnauthorizedType::InvalidRefreshToken)
        );
    }

    #[tokio::test]
    async fn test_unique_email() {
        let bootstrap = bootstrap().await;

        let _ = super::register(
            bootstrap.user_collection(),
            bootstrap.argon(),
            Json(super::RegisterRequest {
                name: "name".to_string(),
                email: "email@gmail.com".to_string(),
                password: "password".to_string(),
                confirm_password: "password".to_string(),
            }),
        )
        .await
        .unwrap();

        let err = super::register(
            bootstrap.user_collection(),
            bootstrap.argon(),
            Json(super::RegisterRequest {
                name: "name".to_string(),
                email: "email@gmail.com".to_string(),
                password: "password".to_string(),
                confirm_password: "password".to_string(),
            }),
        )
        .await
        .expect_err("");
        assert_matches!(err, Error::MustUniqueError(_))
    }

    #[tokio::test]
    pub async fn test_user_access() {
        let bootstrap = bootstrap().await;

        let (mut parts, _) = axum::http::request::Request::get("http://localhost")
            .header(
                "Authorization",
                format!("Bearer {}", bootstrap.user_token()),
            )
            .body(())
            .unwrap()
            .into_parts();

        let user = super::UserAccess::from_request_parts(&mut parts, &bootstrap.app_state)
            .await
            .unwrap();

        assert_eq!(user.id, bootstrap.user_id());
    }

    #[tokio::test]
    pub async fn test_user_access_invalid() {
        let bootstrap = bootstrap().await;

        let (mut parts, _) = axum::http::request::Request::get("http://localhost")
            .header(
                "Authorization",
                format!(
                    "Bearer {}",
                    super::super::token::generate_access_token_with_exp(
                        &bootstrap.app_state.jwt_state,
                        &bootstrap.user_model,
                        0
                    )
                    .unwrap()
                ),
            )
            .body(())
            .unwrap()
            .into_parts();

        let err = super::UserAccess::from_request_parts(&mut parts, &bootstrap.app_state)
            .await
            .unwrap_err();
        assert_matches!(
            err,
            Error::Unauthorized(UnauthorizedType::InvalidAccessToken)
        );
    }

    #[tokio::test]
    pub async fn test_user_model() {
        let bootstrap = bootstrap().await;

        let (mut parts, _) = axum::http::request::Request::get("http://localhost")
            .header(
                "Authorization",
                format!("Bearer {}", bootstrap.user_token()),
            )
            .body(())
            .unwrap()
            .into_parts();

        let model = super::UserModel::from_request_parts(&mut parts, &bootstrap.app_state)
            .await
            .unwrap();

        assert_eq!(model, bootstrap.user_model);
    }

    #[tokio::test]
    async fn test_user_model_on_deleted_user() {
        let bootstrap = bootstrap().await;

        bootstrap
            .app_state
            .user_collection
            .delete_one(
                bson::doc! {
                    "_id": bootstrap.user_id()
                },
                None,
            )
            .await
            .unwrap();

        let error =
            super::UserModel::from_id(bootstrap.user_id(), &bootstrap.app_state.user_collection)
                .await
                .unwrap_err();

        assert_matches!(
            error,
            Error::Unauthorized(UnauthorizedType::InvalidAccessToken)
        );
    }

    #[tokio::test]
    pub async fn test_refresh_token() {
        let bootstrap = bootstrap().await;

        let token = bootstrap.user_token();

        let (mut parts, _) = axum::http::request::Request::get("http://localhost")
            .header("Cookie", format!("refresh_token=Bearer {}", token))
            .body(())
            .unwrap()
            .into_parts();

        let user = super::RefreshToken::from_request_parts(&mut parts, &bootstrap.app_state)
            .await
            .unwrap();

        assert_eq!(user.0, format!("Bearer {}", token));
    }

    #[tokio::test]
    pub async fn test_refresh_token_invalid() {
        let bootstrap = bootstrap().await;

        let token = bootstrap.user_token();

        let (mut parts, _) = axum::http::request::Request::get("http://localhost")
            // .header("Cookie", format!("refresh_token=Bearer {}", token))
            .body(())
            .unwrap()
            .into_parts();

        let error = super::RefreshToken::from_request_parts(&mut parts, &bootstrap.app_state)
            .await
            .unwrap_err();

        assert_matches!(
            error,
            Error::Unauthorized(UnauthorizedType::InvalidRefreshToken)
        );
    }

    #[tokio::test]
    pub async fn test_refresh_claim() {
        let bootstrap = bootstrap().await;

        let refresh_token = bootstrap.user_refresh_token().await;

        let (mut parts, _) = axum::http::request::Request::get("http://localhost")
            .header("Cookie", format!("refresh_token={}", refresh_token))
            .body(())
            .unwrap()
            .into_parts();

        let user = super::RefreshClaim::from_request_parts(&mut parts, &bootstrap.app_state)
            .await
            .unwrap();

        assert_eq!(bootstrap.user_id(), user.0.user_id.0);
    }
}

use std::str::FromStr;

use argon2::Argon2;
use axum::{
    extract::{Path, State},
    Json,
};
use bson::oid::ObjectId;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use validator::Validate;

use crate::{error::Error, util::DecimalString};

use super::auth::{RegisterResponse, UserAccess, UserCollection, UserModel, UserRole};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IndexResponse {
    pub accounts: Vec<RegisterResponse>,
}

pub async fn index(State(collection): State<UserCollection>) -> Result<Json<IndexResponse>, Error> {
    let mut cursor = collection.find_exists(None, None).await?;

    let mut accounts = vec![];

    while cursor.advance().await? {
        let account = cursor.deserialize_current()?;

        accounts.push(account.into());
    }

    Ok(Json(IndexResponse { accounts }))
}

pub async fn show(
    State(accounts): State<UserCollection>,
    Path(account_id): Path<String>,
) -> Result<Json<RegisterResponse>, Error> {
    let account_id = ObjectId::from_str(&account_id).map_err(|_| Error::NoResource)?;

    let account = accounts
        .find_one(
            bson::doc! {
                "_id": account_id,
            },
            None,
        )
        .await?
        .ok_or_else(|| Error::NoResource)?;

    Ok(Json(account.into()))
}

#[derive(Validate, Serialize, Deserialize, Debug, Clone)]
pub struct AccountRequest {
    pub name: String,

    #[validate(email)]
    pub email: String,

    #[validate(length(min = 8, max = 64))]
    pub password: String,

    #[validate(must_match = "password")]
    #[allow(unused_variables)]
    pub confirm_password: String,

    pub balance: Option<DecimalString>,

    pub role: UserRole,
}

pub async fn create(
    State(accounts): State<UserCollection>,
    State(argon): State<Argon2<'_>>,
    user: UserAccess,
    Json(request): Json<AccountRequest>,
) -> Result<Json<RegisterResponse>, Error> {
    match user.role {
        super::auth::UserRole::Customer | super::auth::UserRole::Courier => {
            return Err(Error::Forbidden)
        }
        super::auth::UserRole::Admin => {}
    }

    let insert = super::auth::create_user(
        accounts,
        argon,
        super::auth::CreateUserRequest {
            name: request.name,
            email: request.email,
            password: request.password,
            confirm_password: request.confirm_password,
            balance: request
                .balance
                .map(|it| it.0)
                .unwrap_or_else(|| Decimal::from(0)),
            role: request.role,
        },
    )
    .await?;

    Ok(Json(insert.into()))
}

pub struct InsertResponse {
    pub model: UserModel,
}

#[derive(Validate, Serialize, Deserialize)]
pub struct UpdateRequest {
    #[validate(length(min = 1, max = 124))]
    pub name: Option<String>,

    #[validate(email)]
    pub email: Option<String>,

    #[validate(length(min = 8, max = 64))]
    pub password: Option<String>,

    #[validate(must_match = "password")]
    #[serde(rename = "confirm_password")]
    pub _confirm_password: Option<String>,

    pub balance: Option<DecimalString>,

    pub role: Option<UserRole>,
}

pub async fn update(
    user: UserAccess,
    State(accounts): State<UserCollection>,
    State(argon): State<Argon2<'_>>,
    Path(account_id): Path<String>,
    Json(request): Json<UpdateRequest>,
) -> Result<Json<RegisterResponse>, Error> {
    request.validate()?;

    match user.role {
        crate::api::v1::auth::UserRole::Customer | crate::api::v1::auth::UserRole::Courier => {
            return Err(Error::Forbidden)
        }
        crate::api::v1::auth::UserRole::Admin => {}
    }

    let account_id = ObjectId::from_str(&account_id).map_err(|_| Error::NoResource)?;

    let account = accounts
        .find_one(bson::doc! {"_id": account_id}, None)
        .await?
        .ok_or_else(|| Error::NoResource)?;

    if let Some(email) = &request.email {
        if email != &account.email {
            let count = accounts
                .count_documents(
                    bson::doc! {
                        "email": email
                    },
                    None,
                )
                .await?;

            if count > 0 {
                return Err(Error::MustUniqueError("email".to_string()));
            }
        }
    }

    let account = UserModel {
        id: account.id,
        name: request.name.unwrap_or(account.name),
        email: request.email.unwrap_or(account.email),
        password: request
            .password
            .map(|it| crate::util::hash_password(&argon, &it))
            .unwrap_or(Ok(account.password))?,
        role: request.role.unwrap_or(account.role),
        balance: request.balance.map(Into::into).unwrap_or(account.balance),
        updated_at: OffsetDateTime::now_utc().into(),
        created_at: account.created_at,
        // deleted_at: account.deleted_at,
    };

    // accounts.find_one_by_id
    accounts
        .update_exists_one_by_id(
            account_id,
            bson::doc! {
                "$set": bson::to_document(&account)?
            },
        )
        .await?;

    Ok(Json(account.into()))
}

pub async fn delete(
    State(accounts): State<UserCollection>,
    user: UserAccess,
    Path(account_id): Path<String>,
) -> Result<(), Error> {
    match user.role {
        crate::api::v1::auth::UserRole::Customer | crate::api::v1::auth::UserRole::Courier => {
            return Err(Error::Forbidden)
        }
        crate::api::v1::auth::UserRole::Admin => {}
    }

    let account_id = ObjectId::from_str(&account_id).map_err(|_| Error::NoResource)?;

    accounts
        .find_exists_one_by_id(account_id)
        .await?
        .ok_or_else(|| Error::NoResource)?;

    accounts.soft_delete_one_by_id(account_id).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use assert_matches::assert_matches;
    use axum::{extract::Path, Json};
    use bson::oid::ObjectId;
    use rust_decimal::Decimal;

    use crate::{
        api::v1::{auth::UserRole, tests::bootstrap},
        error::Error,
    };

    #[tokio::test]
    async fn test_create() {
        let bootstrap = bootstrap().await;

        let it = super::create(
            bootstrap.user_collection(),
            bootstrap.argon(),
            bootstrap.user_access(),
            Json(super::AccountRequest {
                name: "test".to_string(),
                email: "email@test.com".to_string(),
                password: "password".to_string(),
                confirm_password: "password".to_string(),
                balance: Some(Decimal::from(0).into()),
                role: UserRole::Customer,
            }),
        )
        .await
        .unwrap();

        let response = super::index(bootstrap.user_collection()).await.unwrap().0;

        assert_eq!(response.accounts.len(), 2);

        let _ = super::show(bootstrap.user_collection(), Path(it.id.to_string()))
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_update() {
        let bootstrap = bootstrap().await;

        let it = super::create(
            bootstrap.user_collection(),
            bootstrap.argon(),
            bootstrap.user_access(),
            Json(super::AccountRequest {
                name: "test".to_string(),
                email: "email@test.com".to_string(),
                password: "password".to_string(),
                confirm_password: "password".to_string(),
                balance: Some(Decimal::from(0).into()),
                role: UserRole::Customer,
            }),
        )
        .await
        .unwrap();

        let _it = super::update(
            bootstrap.user_access(),
            bootstrap.user_collection(),
            bootstrap.argon(),
            Path(it.id.to_string()),
            Json(super::UpdateRequest {
                name: "test".to_string().into(),
                email: "email@test.com".to_string().into(),
                password: "updatepasssword".to_string().into(),
                _confirm_password: "updatepasssword".to_string().into(),
                balance: Some(Decimal::from(0).into()),
                role: UserRole::Customer.into(),
            }),
        )
        .await
        .expect("cannot update with same email");

        let _it = super::update(
            bootstrap.user_access(),
            bootstrap.user_collection(),
            bootstrap.argon(),
            Path(it.id.to_string()),
            Json(super::UpdateRequest {
                name: "test".to_string().into(),
                email: "updateemail@test.com".to_string().into(),
                password: "updatepasssword".to_string().into(),
                _confirm_password: "updatepasssword".to_string().into(),
                balance: Some(Decimal::from(0).into()),
                role: UserRole::Customer.into(),
            }),
        )
        .await
        .expect("cannot update");

        let error = super::update(
            bootstrap.user_access(),
            bootstrap.user_collection(),
            bootstrap.argon(),
            Path(it.id.to_string()),
            Json(super::UpdateRequest {
                name: "test".to_string().into(),
                email: bootstrap.user_email().into(),
                password: "updatepasssword".to_string().into(),
                _confirm_password: "updatepasssword".to_string().into(),
                balance: Some(Decimal::from(0).into()),
                role: UserRole::Customer.into(),
            }),
        )
        .await
        .expect_err("can update with same email");

        assert_matches!(error, Error::MustUniqueError(string) if string == "email");
    }

    #[tokio::test]
    async fn test_delete() {
        let bootstrap = bootstrap().await;

        let it = super::create(
            bootstrap.user_collection(),
            bootstrap.argon(),
            bootstrap.user_access(),
            Json(super::AccountRequest {
                name: "test".to_string(),
                email: "email@test.com".to_string(),
                password: "password".to_string(),
                confirm_password: "password".to_string(),
                balance: Some(Decimal::from(0).into()),
                role: UserRole::Customer,
            }),
        )
        .await
        .unwrap();

        super::delete(
            bootstrap.user_collection(),
            bootstrap.user_access(),
            Path(it.id.0.to_string()),
        )
        .await
        .unwrap();

        let response = super::index(bootstrap.user_collection()).await.unwrap().0;

        assert_eq!(response.accounts.len(), 1);
    }

    #[tokio::test]
    async fn test_noresource() {
        let bootstrap = bootstrap().await;

        let id = ObjectId::new();

        let error = super::show(bootstrap.user_collection(), Path(id.to_string()))
            .await
            .expect_err("can show noresource");
        assert_matches!(error, Error::NoResource);

        let error = super::update(
            bootstrap.user_access(),
            bootstrap.user_collection(),
            bootstrap.argon(),
            Path(id.to_string()),
            Json(super::UpdateRequest {
                name: "test".to_string().into(),
                email: bootstrap.user_email().into(),
                password: "updatepasssword".to_string().into(),
                _confirm_password: "updatepasssword".to_string().into(),
                balance: Some(Decimal::from(0).into()),
                role: UserRole::Customer.into(),
            }),
        )
        .await
        .expect_err("can update noresource");
        assert_matches!(error, Error::NoResource);

        let error = super::delete(
            bootstrap.user_collection(),
            bootstrap.user_access(),
            Path(id.to_string()),
        )
        .await
        .expect_err("can delete noresource");
        assert_matches!(error, Error::NoResource);
    }

    #[tokio::test]
    async fn test_as_user() {
        let bootstrap = bootstrap().await;
        let id = ObjectId::new();

        for (i, role) in [UserRole::Customer, UserRole::Courier]
            .into_iter()
            .enumerate()
        {
            let bootstrap = bootstrap
                .derive(&format!("user{i}@test.com"), "password", role)
                .await;
            let error = super::create(
                bootstrap.user_collection(),
                bootstrap.argon(),
                bootstrap.user_access(),
                Json(super::AccountRequest {
                    name: "test".to_string(),
                    email: "email@test.com".to_string(),
                    password: "password".to_string(),
                    confirm_password: "password".to_string(),
                    balance: Some(Decimal::from(0).into()),
                    role: UserRole::Customer,
                }),
            )
            .await
            .expect_err("can create as user");
            assert_matches!(error, Error::Forbidden);

            let error = super::update(
                bootstrap.user_access(),
                bootstrap.user_collection(),
                bootstrap.argon(),
                Path(id.to_string()),
                Json(super::UpdateRequest {
                    name: "test".to_string().into(),
                    email: bootstrap.user_email().into(),
                    password: "updatepasssword".to_string().into(),
                    _confirm_password: "updatepasssword".to_string().into(),
                    balance: Some(Decimal::from(0).into()),
                    role: UserRole::Customer.into(),
                }),
            )
            .await
            .expect_err("can update as user");
            assert_matches!(error, Error::Forbidden);

            let error = super::delete(
                bootstrap.user_collection(),
                bootstrap.user_access(),
                Path(id.to_string()),
            )
            .await
            .expect_err("can delete as user");
            assert_matches!(error, Error::Forbidden);
        }
    }
}

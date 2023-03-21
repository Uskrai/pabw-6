use std::str::FromStr;

use argon2::Argon2;
use axum::{
    extract::{Path, State},
    Json,
};
use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use validator::Validate;

use crate::error::Error;

use super::auth::{RegisterResponse, UserAccess, UserCollection, UserModel, UserRole};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IndexResponse {
    pub accounts: Vec<RegisterResponse>,
}

pub async fn index(
    State(UserCollection(collection)): State<UserCollection>,
) -> Result<Json<IndexResponse>, Error> {
    let mut cursor = collection.find(None, None).await?;

    let mut accounts = vec![];

    while cursor.advance().await? {
        let account = cursor.deserialize_current()?;

        accounts.push(account.into());
    }

    Ok(Json(IndexResponse { accounts }))
}

pub async fn show(
    State(UserCollection(accounts)): State<UserCollection>,
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
    #[validate(email)]
    pub email: String,

    #[validate(length(min = 8, max = 64))]
    pub password: String,

    #[validate(must_match = "password")]
    #[allow(unused_variables)]
    pub confirm_password: String,

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

    let insert = insert(&accounts, &argon, request).await?;

    Ok(Json(insert.model.into()))
}

pub struct InsertResponse {
    pub model: UserModel,
}

pub async fn insert(
    accounts: &UserCollection,
    argon: &Argon2<'_>,
    request: AccountRequest,
) -> Result<InsertResponse, Error> {
    let id = ObjectId::new();

    let model = UserModel {
        id,
        email: request.email,
        password: crate::util::hash_password(argon, &request.password)?,
        role: request.role,
        created_at: OffsetDateTime::now_utc().into(),
        updated_at: OffsetDateTime::now_utc().into(),
    };
    accounts.insert_one(&model, None).await?;

    Ok(InsertResponse { model })
}

#[derive(Validate, Serialize, Deserialize)]
pub struct UpdateRequest {
    #[validate(email)]
    pub email: Option<String>,

    #[validate(length(min = 8, max = 64))]
    pub password: Option<String>,
    #[validate(must_match = "password")]
    #[allow(unused_variables)]
    pub confirm_password: Option<String>,

    pub role: Option<UserRole>,
}

pub async fn update(
    user: UserAccess,
    State(UserCollection(accounts)): State<UserCollection>,
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

    let account = UserModel {
        id: account.id,
        email: request.email.unwrap_or(account.email),
        password: request
            .password
            .map(|it| crate::util::hash_password(&argon, &it))
            .unwrap_or(Ok(account.password))?,
        role: request.role.unwrap_or(account.role),
        updated_at: OffsetDateTime::now_utc().into(),
        created_at: account.created_at,
        // deleted_at: account.deleted_at,
    };

    // accounts.find_one_by_id
    accounts
        .update_one_by_id(
            account_id,
            bson::doc! {
                "$set": bson::to_document(&account)?
            },
        )
        .await?;

    Ok(Json(account.into()))
}

pub async fn delete(
    State(UserCollection(accounts)): State<UserCollection>,
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
        .get_one_by_id(account_id)
        .await?
        .ok_or_else(|| Error::NoResource)?;

    accounts.soft_delete_one_by_id(account_id).await?;

    Ok(())
}

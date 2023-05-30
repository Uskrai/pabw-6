use std::str::FromStr;

use crate::mongo_ext::Collection;
use axum::{
    extract::{Path, State},
    Json,
};
use bson::oid::ObjectId;
use num_bigint::BigInt;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

use crate::{
    error::Error,
    util::{BigIntString, FormattedDateTime, ObjectIdString},
};

use super::auth::UserAccess;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProductModel {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub user_id: ObjectId,

    pub name: String,
    pub description: String,

    pub stock: BigInt,
    pub price: Decimal,

    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
    pub deleted_at: Option<bson::DateTime>,
}

#[derive(Clone)]
pub struct ProductCollection(pub Collection<ProductModel>);

impl std::ops::Deref for ProductCollection {
    type Target = Collection<ProductModel>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Product {
    pub id: ObjectIdString,
    pub user_id: ObjectIdString,
    pub name: String,
    pub description: String,

    pub stock: BigIntString,
    pub price: Decimal,

    pub created_at: FormattedDateTime,
    pub updated_at: FormattedDateTime,
    pub deleted_at: Option<FormattedDateTime>,
}

impl From<ProductModel> for Product {
    fn from(product: ProductModel) -> Self {
        Self {
            id: product.id.into(),
            user_id: product.user_id.into(),
            name: product.name,
            description: product.description,

            stock: product.stock.into(),
            price: product.price,

            created_at: product.created_at.into(),
            updated_at: product.updated_at.into(),
            deleted_at: product.deleted_at.map(Into::into),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IndexResponse {
    pub products: Vec<Product>,
}

pub async fn index(
    State(collection): State<ProductCollection>,
) -> Result<Json<IndexResponse>, Error> {
    let mut cursor = collection.find(None, None).await?;

    let mut products = vec![];

    while cursor.advance().await? {
        let product = cursor.deserialize_current()?;

        products.push(product.into());
    }

    Ok(Json(IndexResponse { products }))
}

pub async fn show(
    State(products): State<ProductCollection>,
    Path(product_id): Path<String>,
) -> Result<Json<Product>, Error> {
    let product_id = ObjectId::from_str(&product_id).map_err(|_| Error::NoResource)?;

    let product = products
        .find_one(
            bson::doc! {
                "_id": product_id,
            },
            None,
        )
        .await?
        .ok_or_else(|| Error::NoResource)?;

    Ok(Json(product.into()))
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CreateRequest {
    pub name: String,
    pub description: String,

    pub price: Decimal,
    pub stock: BigIntString,
}

#[tracing::instrument(
    skip_all,
    fields(
        user = ?user,
    )
)]
pub async fn create(
    State(products): State<ProductCollection>,
    user: UserAccess,
    Json(request): Json<CreateRequest>,
) -> Result<Json<Product>, Error> {
    match user.role {
        super::auth::UserRole::Courier => return Err(Error::Forbidden),
        super::auth::UserRole::Customer | super::auth::UserRole::Admin => {}
    }

    if request.price <= 0.into() || request.stock.0 <= 0.into() {
        return Err(Error::Forbidden);
    }

    let id = ObjectId::new();

    let model = ProductModel {
        id,
        user_id: user.id,
        name: request.name,
        description: request.description,
        stock: request.stock.into(),
        price: request.price,
        created_at: OffsetDateTime::now_utc().into(),
        updated_at: OffsetDateTime::now_utc().into(),
        deleted_at: None,
    };

    tracing::debug!("creating product {:#?}", model);
    products.insert_one(&model, None).await?;

    Ok(Json(model.into()))
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateRequest {
    pub name: String,
    pub description: String,

    pub stock: BigIntString,
    pub price: Decimal,
}

#[tracing::instrument(
    skip_all,
    fields(
        user = ?user,
    )
)]
pub async fn update(
    user: UserAccess,
    State(products): State<ProductCollection>,
    Path(product_id): Path<String>,
    Json(request): Json<UpdateRequest>,
) -> Result<Json<Product>, Error> {
    match user.role {
        crate::api::v1::auth::UserRole::Courier => return Err(Error::Forbidden),
        crate::api::v1::auth::UserRole::Customer | crate::api::v1::auth::UserRole::Admin => {}
    }

    if request.price < 0.into() || request.stock.0 < 0.into() {
        return Err(Error::Forbidden);
    }

    let product_id = ObjectId::from_str(&product_id).map_err(|_| Error::NoResource)?;

    let product = products
        .find_one(bson::doc! {"_id": product_id}, None)
        .await?
        .ok_or_else(|| Error::NoResource)?;

    match user.role {
        super::auth::UserRole::Customer => {
            if product.user_id != user.id {
                return Err(Error::Forbidden);
            }
        }
        super::auth::UserRole::Courier | super::auth::UserRole::Admin => {}
    }

    let product = ProductModel {
        name: request.name,
        description: request.description,
        stock: request.stock.into(),
        price: request.price,

        id: product.id,
        user_id: product.user_id,
        updated_at: OffsetDateTime::now_utc().into(),
        created_at: product.created_at,
        deleted_at: product.deleted_at,
    };

    tracing::debug!("updating product {:#?}", product);
    products
        .update_one(
            bson::doc! {
                "_id": product_id
            },
            bson::doc! {
                "$set": bson::to_document(&product)?
            },
            None,
        )
        .await?;

    Ok(Json(product.into()))
}

#[tracing::instrument(
    skip_all,
    fields(
        user = ?user,
        id = product_id,
    )
)]
pub async fn delete(
    State(products): State<ProductCollection>,
    user: UserAccess,
    Path(product_id): Path<String>,
) -> Result<(), Error> {
    match user.role {
        crate::api::v1::auth::UserRole::Courier => return Err(Error::Forbidden),
        crate::api::v1::auth::UserRole::Customer | crate::api::v1::auth::UserRole::Admin => {}
    }

    let product_id = ObjectId::from_str(&product_id).map_err(|_| Error::NoResource)?;

    let product = products
        .find_one(bson::doc! {"_id": product_id}, None)
        .await?
        .ok_or_else(|| Error::NoResource)?;

    match user.role {
        super::auth::UserRole::Customer => {
            if product.user_id != user.id {
                return Err(Error::Forbidden);
            }
        }
        super::auth::UserRole::Courier | super::auth::UserRole::Admin => {}
    };

    tracing::debug!("deleting product");
    products
        .delete_one(bson::doc! {"_id": product_id}, None)
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use axum::{extract::Path, Json};
    use num_bigint::BigInt;
    use rust_decimal::Decimal;

    use crate::api::v1::{auth::UserRole, tests::bootstrap};

    use super::{CreateRequest, UpdateRequest};

    #[tokio::test]
    pub async fn test_customer_can_insert() {
        let bootstrap = bootstrap()
            .await
            .derive("customer@email.com", "password", UserRole::Customer)
            .await;

        let Json(product) = super::create(
            bootstrap.product_collection(),
            bootstrap.user_access(),
            Json(CreateRequest {
                name: "test".to_string(),
                description: "".to_string(),
                price: Decimal::from(1),
                stock: BigInt::from(1).into(),
            }),
        )
        .await
        .unwrap();

        let model = bootstrap
            .app_state
            .product_collection
            .find_exists_one_by_id(product.id.into())
            .await
            .unwrap()
            .expect("product should exist after create");

        assert_eq!(product, model.into())
    }

    #[tokio::test]
    pub async fn test_courier_cannot_insert() {
        let bootstrap = bootstrap().await;

        let bootstrap = bootstrap
            .derive("courier@email.com", "password", UserRole::Courier)
            .await;

        let product = super::create(
            bootstrap.product_collection(),
            bootstrap.user_access(),
            Json(CreateRequest {
                name: "name".to_string(),
                description: "description".to_string(),
                price: Decimal::from(1),
                stock: BigInt::from(1).into(),
            }),
        )
        .await
        .expect_err("courier should not be able to create product");
    }

    #[tokio::test]
    pub async fn test_customer_can_update() {
        let bootstrap = bootstrap()
            .await
            .derive("customer@email.com", "password", UserRole::Customer)
            .await;

        let Json(product) = super::create(
            bootstrap.product_collection(),
            bootstrap.user_access(),
            Json(CreateRequest {
                name: "name".to_string(),
                description: "description".to_string(),
                price: Decimal::from(1),
                stock: BigInt::from(1).into(),
            }),
        )
        .await
        .unwrap();

        let Json(update) = super::update(
            bootstrap.user_access(),
            bootstrap.product_collection(),
            Path(product.id.to_string()),
            Json(UpdateRequest {
                name: "up-name".to_string(),
                description: "up-description".to_string(),
                price: Decimal::from(10),
                stock: BigInt::from(10).into(),
            }),
        )
        .await
        .unwrap();

        assert_eq!(update.name, "up-name");
        assert_eq!(update.description, "up-description");
        assert_eq!(update.price, Decimal::from(10));
        assert_eq!(update.stock, BigInt::from(10).into());
    }

    #[tokio::test]
    pub async fn test_customer_can_delete() {
        let bootstrap = bootstrap()
            .await
            .derive("customer@email.com", "password", UserRole::Customer)
            .await;

        let Json(product) = super::create(
            bootstrap.product_collection(),
            bootstrap.user_access(),
            Json(CreateRequest {
                name: "name".to_string(),
                description: "description".to_string(),
                price: Decimal::from(1),
                stock: BigInt::from(1).into(),
            }),
        )
        .await
        .unwrap();

        super::delete(
            bootstrap.product_collection(),
            bootstrap.user_access(),
            Path(product.id.to_string()),
        )
        .await
        .unwrap();

        super::show(bootstrap.product_collection(), Path(product.id.to_string()))
            .await
            .expect_err("product should be deleted");
    }

    #[tokio::test]
    pub async fn test_customer_can_view_all() {
        let bootstrap = bootstrap()
            .await
            .derive("customer@email.com", "password", UserRole::Customer)
            .await;

        let Json(product) = super::create(
            bootstrap.product_collection(),
            bootstrap.user_access(),
            Json(CreateRequest {
                name: "test".to_string(),
                description: "".to_string(),
                price: Decimal::from(1),
                stock: BigInt::from(1).into(),
            }),
        )
        .await
        .unwrap();

        assert_eq!(
            super::index(bootstrap.product_collection())
                .await
                .unwrap()
                .0
                .products
                .len(),
            1
        )
    }
}

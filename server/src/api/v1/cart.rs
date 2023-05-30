use axum::{extract::State, Json};
use bson::oid::ObjectId;
use mongodb::options::ReturnDocument;
use num_bigint::BigInt;
use serde::{Deserialize, Serialize};

use crate::{
    error::Error,
    mongo_ext::Collection,
    util::{BigIntString, ObjectIdString, PathObjectId},
};

use super::{auth::UserAccess, product::ProductCollection};

#[derive(Clone)]
pub struct CartCollection(pub Collection<CartModel>);

impl std::ops::Deref for CartCollection {
    type Target = Collection<CartModel>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CartModel {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub user_id: ObjectId,
    pub product_id: ObjectId,
    pub merchant_id: ObjectId,
    pub quantity: BigInt,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct CartResponse {
    pub id: ObjectIdString,
    pub user_id: ObjectIdString,
    pub product_id: ObjectIdString,
    pub merchant_id: ObjectIdString,
    pub quantity: BigIntString,
}

impl From<CartModel> for CartResponse {
    fn from(value: CartModel) -> Self {
        Self {
            id: value.id.into(),
            user_id: value.user_id.into(),
            product_id: value.product_id.into(),
            merchant_id: value.merchant_id.into(),
            quantity: value.quantity.into(),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct IndexResponse {
    carts: Vec<CartResponse>,
}

pub async fn index(
    user: UserAccess,
    State(carts): State<CartCollection>,
) -> Result<Json<IndexResponse>, Error> {
    let mut response = IndexResponse { carts: vec![] };

    let mut cursor = carts
        .find_exists(bson::doc! { "user_id": user.id }, None)
        .await?;

    while cursor.advance().await? {
        response.carts.push(cursor.deserialize_current()?.into());
    }

    Ok(Json(response))
}

pub async fn show(
    user: UserAccess,
    State(carts): State<CartCollection>,
    PathObjectId(id): PathObjectId,
) -> Result<Json<CartResponse>, Error> {
    let cart = carts
        .find_exists_one_by_id(id)
        .await?
        .ok_or(Error::Forbidden)
        .and_then(|it| {
            Some(it)
                .filter(|it| it.user_id == user.id)
                .ok_or(Error::Forbidden)
        })?;

    Ok(Json(cart.into()))
}

#[derive(Serialize, Deserialize)]
pub struct CreateRequest {
    pub product_id: ObjectIdString,
    pub quantity: BigIntString,
}

pub async fn create(
    State(carts): State<CartCollection>,
    State(products): State<ProductCollection>,
    user: UserAccess,
    Json(request): Json<CreateRequest>,
) -> Result<Json<CartResponse>, Error> {
    if request.quantity.0 <= 0.into() {
        return Err(Error::Forbidden);
    }

    let product = products
        .find_exists_one_by_id(request.product_id.into())
        .await?
        .ok_or(Error::Forbidden)?;

    println!("{:?} {:?}", product.stock, request.quantity.0);
    if product.stock < request.quantity.0 {
        return Err(Error::Forbidden);
    }

    let model = CartModel {
        id: ObjectId::new(),
        user_id: user.id,
        product_id: request.product_id.into(),
        merchant_id: product.user_id.into(),
        quantity: request.quantity.into(),
    };

    let doc = {
        let mut doc = bson::to_document(&model)?;
        doc.remove("_id");
        doc
    };

    let model = carts
        .find_one_and_update(
            bson::doc! {
                "user_id": model.user_id.clone(),
                "product_id": model.product_id.clone(),
                "merchant_id": model.merchant_id.clone(),
            },
            bson::doc! {"$set": doc},
            mongodb::options::FindOneAndUpdateOptions::builder()
                .upsert(true)
                .return_document(ReturnDocument::After)
                .build(),
        )
        .await?
        .unwrap();

    Ok(Json(model.into()))
}

pub async fn delete(
    State(carts): State<CartCollection>,
    user: UserAccess,
    PathObjectId(id): PathObjectId,
) -> Result<(), Error> {
    carts
        .find_exists_one_by_id(id)
        .await?
        .ok_or(Error::NoResource)
        .and_then(|it| {
            Some(it)
                .filter(|it| it.user_id == user.id)
                .ok_or(Error::Forbidden)
        })?;

    carts.delete_one(bson::doc! {"_id": id}, None).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use axum::Json;

    use crate::api::v1::{auth::UserRole, tests::bootstrap};

    #[tokio::test]
    pub async fn test_customer_can_insert() {
        let bootstrap = bootstrap().await;

        let product = bootstrap.create_product(1000, 1000).await;

        let customer = bootstrap
            .derive("customer@email.com", "password", UserRole::Customer)
            .await;

        let create = |quantity: i64| {
            let bootstrap = &bootstrap;
            let customer = &customer;
            let product = &product;
            async move {
                super::create(
                    bootstrap.cart_collection(),
                    bootstrap.product_collection(),
                    customer.user_access(),
                    Json(super::CreateRequest {
                        product_id: product.id,
                        quantity: crate::util::BigIntString(quantity.into()),
                    }),
                )
                .await
                .map(|it| it.0)
            }
        };

        let _first = create(10).await.unwrap();
        let second = create(1000).await.unwrap();

        let count = bootstrap
            .cart_collection()
            .0
            .count_documents(None, None)
            .await
            .unwrap();
        assert_eq!(count, 1);
        let actual = bootstrap
            .cart_collection()
            .0
            .find_exists_one_by_id(second.id.into())
            .await
            .unwrap()
            .unwrap();

        assert_eq!(second, actual.into());
    }

    #[tokio::test]
    pub async fn test_cannot_insert_when_quantity_more_than_stock() {
        let bootstrap = bootstrap().await;

        let product = bootstrap.create_product(1000, 1000).await;

        let customer = bootstrap
            .derive("customer@email.com", "password", UserRole::Customer)
            .await;

        let create = |quantity: i64| {
            let bootstrap = &bootstrap;
            let customer = &customer;
            let product = &product;
            async move {
                super::create(
                    bootstrap.cart_collection(),
                    bootstrap.product_collection(),
                    customer.user_access(),
                    Json(super::CreateRequest {
                        product_id: product.id,
                        quantity: crate::util::BigIntString(quantity.into()),
                    }),
                )
                .await
                .map(|it| it.0)
            }
        };

        let _second = create(1001).await.expect_err("Shoud error because quantity is more than stock");
        let _second = create(i64::MAX).await.expect_err("Shoud error because quantity is more than stock");

        let count = bootstrap
            .cart_collection()
            .0
            .count_documents(None, None)
            .await
            .unwrap();

        assert_eq!(count, 0);
    }
}

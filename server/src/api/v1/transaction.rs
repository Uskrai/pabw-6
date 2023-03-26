use std::collections::HashMap;

use axum::{extract::State, Json};
use bson::oid::ObjectId;
use num_bigint::BigInt;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::{
    error::Error,
    mongo_ext::Collection,
    util::{BigIntString, DecimalString, FormattedDateTime, ObjectIdString, PathObjectId},
};

use super::{
    auth::{UserAccess, UserCollection, UserModel},
    product::ProductCollection,
};

#[derive(Serialize, Deserialize)]
pub struct Transaction {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub user_id: ObjectId,
    pub merchant_id: ObjectId,
    pub price: Decimal,
    pub status: TransactionStatus,
    pub products: Vec<ProductTransaction>,

    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Serialize, Deserialize)]
pub struct ProductTransaction {
    pub id: ObjectId,
    pub quantity: BigInt,
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type", content = "content")]
pub enum TransactionStatus {
    Processing,
    Send,
}

#[derive(Serialize, Deserialize)]
pub struct TransactionModel {
    pub id: ObjectIdString,
    pub user_id: ObjectIdString,
    pub merchant_id: ObjectIdString,
    pub price: DecimalString,
    pub status: TransactionStatus,
    pub products: Vec<ProductTransactionModel>,

    pub created_at: FormattedDateTime,
    pub updated_at: FormattedDateTime,
}

#[derive(Serialize, Deserialize)]
pub struct ProductTransactionModel {
    pub id: ObjectIdString,
    pub quantity: BigIntString,
}

impl From<Transaction> for TransactionModel {
    fn from(value: Transaction) -> Self {
        Self {
            id: value.id.into(),
            user_id: value.user_id.into(),
            merchant_id: value.merchant_id.into(),
            price: value.price.into(),
            status: value.status,
            products: value.products.into_iter().map(|it| it.into()).collect(),

            created_at: value.created_at.into(),
            updated_at: value.updated_at.into(),
        }
    }
}

impl From<ProductTransaction> for ProductTransactionModel {
    fn from(value: ProductTransaction) -> Self {
        Self {
            id: value.id.into(),
            quantity: value.quantity.into(),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct OrderIndexResponse {
    orders: Vec<TransactionModel>,
}

#[derive(Clone)]
pub struct TransactionCollection(pub Collection<Transaction>);

impl std::ops::Deref for TransactionCollection {
    type Target = Collection<Transaction>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[derive(thiserror::Error, Debug)]
pub enum TransactionError {}

pub async fn index_order(
    State(collection): State<TransactionCollection>,
    user: UserAccess,
) -> Result<Json<OrderIndexResponse>, Error> {
    let mut cursor = collection
        .find_exists(bson::doc! {
            "user_id": user.id
        })
        .await?;

    let mut orders = vec![];

    while cursor.advance().await? {
        let order = cursor.deserialize_current()?;

        orders.push(order.into());
    }

    Ok(Json(OrderIndexResponse { orders }))
}

pub async fn show_order(
    user: UserAccess,
    State(collection): State<TransactionCollection>,
    PathObjectId(path): PathObjectId,
) -> Result<Json<TransactionModel>, Error> {
    let transaction = collection
        .find_exists_one_by_id(path)
        .await?
        .filter(|it| it.user_id == user.id)
        .ok_or(Error::Forbidden)?;

    Ok(Json(transaction.into()))
}

#[derive(Serialize, Deserialize, Validate)]
pub struct InsertOrderRequet {
    products: Vec<ProductOrderRequest>,
}

#[derive(Serialize, Deserialize)]
pub struct ProductOrderRequest {
    pub id: ObjectIdString,
    pub quantity: BigIntString,
}

pub async fn insert_order(
    State(collection): State<TransactionCollection>,
    State(products_collection): State<ProductCollection>,
    State(users): State<UserCollection>,
    State(mongo): State<mongodb::Client>,
    user: UserModel,
    Json(request): Json<InsertOrderRequet>,
) -> Result<Json<TransactionModel>, Error> {
    request.validate()?;

    let ids = request
        .products
        .iter()
        .map(|it| it.id.clone().into())
        .collect::<Vec<ObjectId>>();

    let mut ordered = products_collection
        .find(
            bson::doc! {
                "_id": {
                    "$in": ids
                }
            },
            None,
        )
        .await?;

    let mut merchant_id = None;

    let mut ordered_map = HashMap::new();

    while ordered.advance().await? {
        let model = ordered.deserialize_current()?;

        if let Some(it) = merchant_id {
            if model.user_id != it {
                return Err(Error::MismatchMerchant);
            }
        } else {
            merchant_id = Some(model.user_id);
        }

        ordered_map.insert(model.id, model);
    }

    let merchant_id = match merchant_id {
        Some(it) => it,
        None => {
            return Err(Error::NoResource);
        }
    };

    // forbidden to order product you own
    if merchant_id == user.id {
        return Err(Error::Forbidden);
    }

    let mut products = vec![];
    let mut price = Decimal::from(0);

    for order in request.products.iter() {
        if let Some(product) = ordered_map.get(&order.id) {
            products.push(ProductTransaction {
                id: *order.id,
                quantity: order.quantity.clone().into(),
            });

            price +=
                Decimal::from_str_exact(&order.quantity.0.to_string()).unwrap() * product.price;
        } else {
            return Err(Error::NoResource);
        }
    }

    if user.balance < price {
        return Err(Error::InsufficientFund);
    }

    let mut session = mongo.start_session(None).await?;

    let transaction_options = mongodb::options::TransactionOptions::builder()
        .read_concern(mongodb::options::ReadConcern::snapshot())
        .write_concern(
            mongodb::options::WriteConcern::builder()
                .w(mongodb::options::Acknowledgment::Majority)
                .build(),
        )
        .selection_criteria(mongodb::options::SelectionCriteria::ReadPreference(
            mongodb::options::ReadPreference::Primary,
        ))
        .build();

    let _transaction = session.start_transaction(transaction_options).await?;

    let quantity = products
        .iter()
        .map(|it| it.quantity.clone())
        .sum::<BigInt>();

    if quantity == BigInt::from(0) {
        // TODO
        return Err(Error::Forbidden);
    }

    let transaction = Transaction {
        id: ObjectId::new(),
        user_id: user.id,
        price,
        merchant_id,
        products,
        status: TransactionStatus::Processing,

        created_at: time::OffsetDateTime::now_utc().into(),
        updated_at: time::OffsetDateTime::now_utc().into(),
    };

    collection
        .insert_one_with_session(&transaction, None, &mut session)
        .await?;

    users
        .update_exists_one_by_id_with_session(
            user.id,
            bson::doc! {
                "$set": {
                    "balance": bson::to_bson(&(user.balance - price))?
                }
            },
            None,
            &mut session,
        )
        .await?;

    for it in transaction.products.iter() {
        let stock = &ordered_map[&it.id].stock - &it.quantity.clone();

        if &stock < &BigInt::from(0) {
            // TODO
            return Err(Error::Forbidden);
        }
        products_collection
            .update_exists_one_by_id_with_session(
                it.id,
                bson::doc! {
                    "$set": {
                        "stock": bson::to_bson(&stock)?
                    }
                },
                None,
                &mut session,
            )
            .await?;
    }

    session.commit_transaction().await?;

    Ok(Json(transaction.into()))
}

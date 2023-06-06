use std::collections::HashMap;

use axum::{extract::State, http::StatusCode, Json};
use bson::oid::ObjectId;
use num_bigint::BigInt;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
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
    pub courier_id: Option<ObjectId>,
    pub price: Decimal,
    pub status: Vec<TransactionStatus>,
    pub products: Vec<ProductTransaction>,

    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Serialize, Deserialize)]
pub struct ProductTransaction {
    pub id: ObjectId,
    pub quantity: BigInt,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", content = "content")]
pub enum TransactionStatusType {
    WaitingForMerchantConfirmation,
    ProcessingInMerchant,
    WaitingForCourier,
    PickedUpByCourier,
    SendBackToMerchant,
    ArrivedInMerchant,
    ArrivedInDestination,
    ArrivedInDestinationConfirmed,
}

#[derive(Serialize, Deserialize)]
pub struct TransactionStatus {
    r#type: TransactionStatusType,
    date: bson::DateTime,
}

impl TransactionStatus {
    pub fn new(r#type: TransactionStatusType) -> Self {
        Self {
            r#type,
            date: OffsetDateTime::now_utc().into(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TransactionModel {
    pub id: ObjectIdString,
    pub user_id: ObjectIdString,
    pub merchant_id: ObjectIdString,
    pub price: DecimalString,
    pub status: Vec<TransactionStatusModel>,
    pub products: Vec<ProductTransactionModel>,

    pub created_at: FormattedDateTime,
    pub updated_at: FormattedDateTime,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TransactionStatusModel {
    pub r#type: TransactionStatusType,
    date: FormattedDateTime,
}

impl From<TransactionStatus> for TransactionStatusModel {
    fn from(value: TransactionStatus) -> Self {
        Self {
            r#type: value.r#type,
            date: value.date.into(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
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
            status: value.status.into_iter().map(|it| it.into()).collect(),
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
        .find_exists(
            bson::doc! {
                "user_id": user.id
            },
            None,
        )
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
pub struct InsertOrderRequest {
    pub products: Vec<ProductOrderRequest>,
}

#[derive(Serialize, Deserialize)]
pub struct ProductOrderRequest {
    pub product_id: ObjectIdString,
    pub quantity: BigIntString,
}

pub async fn insert_order(
    State(collection): State<TransactionCollection>,
    State(products_collection): State<ProductCollection>,
    State(users): State<UserCollection>,
    State(mongo): State<mongodb::Client>,
    user: UserModel,
    Json(request): Json<InsertOrderRequest>,
) -> Result<Json<TransactionModel>, Error> {
    request.validate()?;

    let ids = request
        .products
        .iter()
        .map(|it| it.product_id.clone().into())
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
        return Err(Error::CustomStr(
            StatusCode::FORBIDDEN,
            "You cannot buy product that you own",
        ));
    }

    let mut products = vec![];
    let mut price = Decimal::from(0);

    for order in request.products.iter() {
        if let Some(product) = ordered_map.get(&order.product_id) {
            products.push(ProductTransaction {
                id: *order.product_id,
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
        .find(|it| it <= &BigInt::from(0));

    if quantity.is_some() {
        return Err(Error::CustomStr(
            StatusCode::FORBIDDEN,
            "Quantity must be more than 0",
        ));
    }

    let transaction = Transaction {
        id: ObjectId::new(),
        user_id: user.id,
        price,
        merchant_id,
        courier_id: None,
        products,
        status: vec![TransactionStatus::new(
            TransactionStatusType::ProcessingInMerchant,
        )],

        created_at: time::OffsetDateTime::now_utc().into(),
        updated_at: time::OffsetDateTime::now_utc().into(),
    };

    collection
        .insert_one_with_session(&transaction, None, &mut session)
        .await?;

    println!("{}-{} = {}", user.balance, price, user.balance - price);
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
            return Err(Error::CustomStr(
                StatusCode::FORBIDDEN,
                "quantity must be less than stock",
            ));
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

#[derive(Serialize, Deserialize)]
pub struct TransactionIndexResponse {
    transactions: Vec<TransactionModel>,
}

pub async fn index(
    State(transactions): State<TransactionCollection>,
    user: UserAccess,
) -> Result<Json<TransactionIndexResponse>, Error> {
    let mut cursor = transactions
        .find_exists(bson::doc! { "merchant_id": user.id }, None)
        .await?;

    let mut result = vec![];

    while cursor.advance().await? {
        let val = cursor.deserialize_current()?;
        result.push(val.into());
    }

    Ok(Json(TransactionIndexResponse {
        transactions: result,
    }))
}

pub async fn show(
    State(transactions): State<TransactionCollection>,
    user: UserAccess,
    PathObjectId(path): PathObjectId,
) -> Result<Json<TransactionModel>, Error> {
    let transaction = transactions
        .find_exists_one_by_id(path)
        .await?
        .filter(|it| it.merchant_id == user.id)
        .ok_or(Error::Forbidden)?;

    Ok(Json(transaction.into()))
}

pub async fn confirm_processing(
    State(transactions): State<TransactionCollection>,
    user: UserAccess,
    PathObjectId(path): PathObjectId,
) -> Result<Json<TransactionModel>, Error> {
    let mut transaction = transactions
        .find_exists_one_by_id(path)
        .await?
        .filter(|it| it.merchant_id == user.id)
        .filter(|it| {
            it.status
                .last()
                // only allow if the last transaction status is processing
                .filter(|it| matches!(it.r#type, TransactionStatusType::ProcessingInMerchant))
                .is_some()
        })
        .ok_or(Error::Forbidden)?;

    transaction.status.push(TransactionStatus::new(
        TransactionStatusType::WaitingForCourier,
    ));

    transactions
        .update_exists_one_by_id(
            path,
            bson::doc! {
                "$set": {
                    "status": bson::to_bson(&transaction.status)?,
                }
            },
        )
        .await?;

    Ok(Json(transaction.into()))
}

#[derive(Serialize, Deserialize)]
pub struct DeliveryResponse {
    pub id: ObjectIdString,
    pub user_id: ObjectIdString,
    pub merchant_id: ObjectIdString,
    pub courier_id: Option<ObjectIdString>,
    pub status: Vec<TransactionStatusModel>,
    // pub products: Vec<ProductTransactionModel>,
    pub created_at: FormattedDateTime,
    pub updated_at: FormattedDateTime,
}
impl From<Transaction> for DeliveryResponse {
    fn from(value: Transaction) -> Self {
        Self {
            id: value.id.into(),
            user_id: value.user_id.into(),
            merchant_id: value.merchant_id.into(),
            courier_id: value.courier_id.map(Into::into),
            status: value.status.into_iter().map(|it| it.into()).collect(),

            created_at: value.created_at.into(),
            updated_at: value.updated_at.into(),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct DeliveryIndexResponse {
    deliveries: Vec<DeliveryResponse>,
}

pub async fn index_delivery(
    State(transactions): State<TransactionCollection>,
    user: UserAccess,
) -> Result<Json<DeliveryIndexResponse>, Error> {
    match user.role {
        super::auth::UserRole::Customer => return Err(Error::Forbidden),
        super::auth::UserRole::Courier | super::auth::UserRole::Admin => {}
    }
    let mut cursor = transactions
        .find_exists(
            bson::doc! {
                "$expr": {
                    "$eq": [
                        bson::to_bson(&TransactionStatusType::WaitingForCourier)?,
                        {
                            "$getField": {
                                "input": { "$last": "$status" },
                                "field": "type"
                            },
                        }
                    ]
                },
                // "status.type":
            },
            None,
        )
        .await?;

    let mut result = vec![];

    while cursor.advance().await? {
        let val = cursor.deserialize_current()?;
        result.push(val.into());
    }

    let mut cursor = transactions
        .find_exists(
            bson::doc! {
                "courier_id": user.id
            },
            None,
        )
        .await?;

    while cursor.advance().await? {
        result.push(cursor.deserialize_current()?.into());
    }

    Ok(Json(DeliveryIndexResponse { deliveries: result }))
}

pub async fn show_delivery(
    State(transaction): State<TransactionCollection>,
    user: UserAccess,
    PathObjectId(path): PathObjectId,
) -> Result<Json<DeliveryResponse>, Error> {
    match user.role {
        super::auth::UserRole::Customer => return Err(Error::Forbidden),
        super::auth::UserRole::Courier | super::auth::UserRole::Admin => {}
    }

    let transaction = transaction
        .find_exists_one_by_id(path)
        .await?
        .filter(|it| {
            it.status
                .last()
                .filter(|it| matches!(it.r#type, TransactionStatusType::WaitingForCourier))
                .is_some()
                || it.courier_id == Some(user.id)
        })
        .ok_or(Error::Forbidden)?;

    Ok(Json(transaction.into()))
}

#[derive(Serialize, Deserialize)]
pub struct ChangeDeliveryRequest {
    r#type: TransactionStatusType,
}

pub async fn change_delivery(
    State(transactions): State<TransactionCollection>,
    State(users): State<UserCollection>,
    user: UserAccess,
    PathObjectId(path): PathObjectId,
    Json(request): Json<ChangeDeliveryRequest>,
) -> Result<(), Error> {
    match user.role {
        super::auth::UserRole::Customer => return Err(Error::Forbidden),
        super::auth::UserRole::Courier | super::auth::UserRole::Admin => {}
    }

    let mut item = transactions
        .find_exists_one_by_id(path)
        .await?
        .filter(|it| it.courier_id == Some(user.id))
        .filter(|it| {
            it.status
                .last()
                .filter(|it| match it.r#type {
                    TransactionStatusType::WaitingForCourier
                    | TransactionStatusType::ProcessingInMerchant
                    | TransactionStatusType::ArrivedInDestination
                    | TransactionStatusType::ArrivedInDestinationConfirmed
                    | TransactionStatusType::WaitingForMerchantConfirmation
                    | TransactionStatusType::ArrivedInMerchant => false,
                    TransactionStatusType::PickedUpByCourier => match request.r#type {
                        TransactionStatusType::ArrivedInDestination
                        | TransactionStatusType::SendBackToMerchant => true,
                        _ => false,
                    },
                    TransactionStatusType::SendBackToMerchant => match request.r#type {
                        TransactionStatusType::ArrivedInMerchant => true,
                        _ => false,
                    },
                })
                .is_some()
        })
        .ok_or(Error::Forbidden)?;

    item.status
        .push(TransactionStatus::new(request.r#type.clone()));

    let mut courier_id = Some(user.id);

    match &request.r#type {
        TransactionStatusType::ArrivedInMerchant => {
            item.status.push(TransactionStatus::new(
                TransactionStatusType::ProcessingInMerchant,
            ));

            courier_id = None;
        }
        TransactionStatusType::ArrivedInDestination => {
            courier_id = None;

            let merchant = users.find_exists_one_by_id(item.merchant_id).await?;

            if let Some(merchant) = merchant {
                users
                    .update_one(
                        bson::doc! {
                            "_id": item.merchant_id,
                        },
                        bson::doc! {
                            "$set": {
                                "balance": bson::to_bson(&(merchant.balance + item.price)).unwrap()
                            }
                        },
                        None,
                    )
                    .await?;
            }
        }
        _ => {}
    }

    let update = bson::doc! {
        "$set": {
            "courier_id": courier_id,
            "status": bson::to_bson(&item.status)?,
        }
    };

    transactions.update_exists_one_by_id(path, update).await?;

    Ok(())
}

pub async fn pickup(
    State(transaction): State<TransactionCollection>,
    user: UserAccess,
    PathObjectId(path): PathObjectId,
) -> Result<(), Error> {
    match user.role {
        super::auth::UserRole::Customer => return Err(Error::Forbidden),
        super::auth::UserRole::Courier | super::auth::UserRole::Admin => {}
    }

    let mut item = transaction
        .find_exists_one_by_id(path)
        .await?
        .filter(|it| {
            it.status
                .last()
                .filter(|it| matches!(it.r#type, TransactionStatusType::WaitingForCourier))
                .is_some()
        })
        .filter(|it| it.courier_id.is_none())
        .ok_or(Error::Forbidden)?;

    item.status.push(TransactionStatus::new(
        TransactionStatusType::PickedUpByCourier,
    ));

    transaction
        .update_exists_one_by_id(
            path,
            bson::doc! {
                "$set": {
                    "courier_id": user.id,
                    "status": bson::to_bson(&item.status)?,
                }
            },
        )
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use assert_matches::assert_matches;
    use axum::Json;
    use num_bigint::BigInt;
    use rust_decimal::Decimal;

    use crate::{api::v1::auth::UserRole, error::Error};

    use super::super::tests::bootstrap;

    #[tokio::test]
    pub async fn test_can_order() {
        let bootstrap = bootstrap().await;

        let first_product = bootstrap.create_product(1000, 1).await;
        let second_product = bootstrap.create_product(1000, 1).await;

        let customer = bootstrap
            .derive("customer@mail.com", "password", UserRole::Customer)
            .await
            .with_balance(Decimal::from(2_000))
            .await;

        let _ = super::insert_order(
            bootstrap.transaction_collection(),
            bootstrap.product_collection(),
            bootstrap.user_collection(),
            bootstrap.mongo_client(),
            customer.user_model.clone(),
            Json(super::InsertOrderRequest {
                products: vec![
                    super::ProductOrderRequest {
                        product_id: first_product.id,
                        quantity: BigInt::from(1).into(),
                    },
                    super::ProductOrderRequest {
                        product_id: second_product.id,
                        quantity: BigInt::from(1).into(),
                    },
                ],
            }),
        )
        .await
        .unwrap();

        let customer = customer.reload().await;
        assert_eq!(customer.user_model.balance, Decimal::from(0));
    }

    #[tokio::test]
    pub async fn test_cannot_order_same_user() {
        let bootstrap = bootstrap().await;

        let first_product = bootstrap.create_product(1000, 1000).await;

        let err = super::insert_order(
            bootstrap.transaction_collection(),
            bootstrap.product_collection(),
            bootstrap.user_collection(),
            bootstrap.mongo_client(),
            bootstrap.user_model.clone(),
            Json(super::InsertOrderRequest {
                products: vec![super::ProductOrderRequest {
                    product_id: first_product.id,
                    quantity: BigInt::from(1).into(),
                }],
            }),
        )
        .await
        .expect_err("cannot buy from same user");
        assert_matches!(
            err,
            Error::CustomStr(_, "You cannot buy product that you own")
        );
    }

    #[tokio::test]
    pub async fn test_cannot_order_when_balance_insufficient() {
        let bootstrap = bootstrap().await;

        let first_product = bootstrap.create_product(1000, 1000).await;
        let second_product = bootstrap.create_product(1000, 1000).await;

        let customer = bootstrap
            .derive("customer@mail.com", "password", UserRole::Customer)
            .await
            .with_balance(Decimal::from(1_000))
            .await;

        let error = super::insert_order(
            bootstrap.transaction_collection(),
            bootstrap.product_collection(),
            bootstrap.user_collection(),
            bootstrap.mongo_client(),
            customer.user_model.clone(),
            Json(super::InsertOrderRequest {
                products: vec![
                    super::ProductOrderRequest {
                        product_id: first_product.id,
                        quantity: BigInt::from(1).into(),
                    },
                    super::ProductOrderRequest {
                        product_id: second_product.id,
                        quantity: BigInt::from(1).into(),
                    },
                ],
            }),
        )
        .await
        .expect_err("Insufficient balance");
        assert_matches!(error, Error::InsufficientFund);
    }

    #[tokio::test]
    pub async fn test_cannot_order_from_multiple_user() {
        let bootstrap = bootstrap().await;
        let merchant = bootstrap
            .derive("mer@mail.com", "password", UserRole::Customer)
            .await;

        let customer = bootstrap
            .derive("cus@mail.com", "password", UserRole::Customer)
            .await
            .with_balance(Decimal::from(2_000))
            .await;

        let first_product = bootstrap.create_product(1000, 1000).await;
        let second_product = merchant.create_product(1000, 1000).await;

        let err = super::insert_order(
            bootstrap.transaction_collection(),
            bootstrap.product_collection(),
            bootstrap.user_collection(),
            bootstrap.mongo_client(),
            customer.user_model.clone(),
            Json(super::InsertOrderRequest {
                products: vec![
                    super::ProductOrderRequest {
                        product_id: first_product.id,
                        quantity: BigInt::from(1).into(),
                    },
                    super::ProductOrderRequest {
                        product_id: second_product.id,
                        quantity: BigInt::from(1).into(),
                    },
                ],
            }),
        )
        .await
        .expect_err("cannot buy from multiple user");
        assert_matches!(err, Error::MismatchMerchant);
    }

    #[tokio::test]
    pub async fn test_cannot_order_when_stock_less_than_quantity() {
        let bootstrap = bootstrap().await;

        let customer = bootstrap
            .derive("cus@mail.com", "password", UserRole::Customer)
            .await
            .with_balance(Decimal::from(20_000))
            .await;

        let first_product = bootstrap.create_product(1000, 1).await;
        let second_product = bootstrap.create_product(1000, 1).await;

        let err = super::insert_order(
            bootstrap.transaction_collection(),
            bootstrap.product_collection(),
            bootstrap.user_collection(),
            bootstrap.mongo_client(),
            customer.user_model.clone(),
            Json(super::InsertOrderRequest {
                products: vec![
                    super::ProductOrderRequest {
                        product_id: first_product.id,
                        quantity: BigInt::from(1).into(),
                    },
                    super::ProductOrderRequest {
                        product_id: second_product.id,
                        quantity: BigInt::from(2).into(),
                    },
                ],
            }),
        )
        .await
        .expect_err("stock less than quantity");
        assert_matches!(err, Error::CustomStr(_, "quantity must be less than stock"));
    }
}

pub mod account;
pub mod auth;
pub mod cart;
pub mod product;
pub mod token;
pub mod transaction;
pub mod user;

#[cfg(test)]
pub mod tests {
    use std::{
        collections::HashSet,
        sync::{Arc, Mutex},
    };

    use axum::{extract::State, Json};
    use bson::oid::ObjectId;
    use mongodb::Client;
    use num_bigint::BigInt;
    use rust_decimal::Decimal;

    use crate::{app::AppState, util::BigIntString};

    use super::{
        auth::{UserAccess, UserCollection, UserRole},
        cart::CartCollection,
        product::ProductCollection,
        token::{JwtState, RefreshTokenCollection},
        transaction::TransactionCollection,
    };

    lazy_static::lazy_static! {
        pub static ref BOOTSTRAP_LOCK: Mutex<HashSet<String>> = Mutex::new(HashSet::new());
    }

    #[allow(dead_code)]
    pub struct Bootstrap {
        pub user_model: crate::api::v1::auth::UserModel,
        user_password: String,
        session: crate::api::v1::auth::RefreshClaim,
        pub app_state: AppState,

        track_cleanup: Arc<Cleanup>,
    }

    pub struct Cleanup {
        database_name: String,
        app_state: AppState,
    }

    impl Drop for Cleanup {
        fn drop(&mut self) {
            BOOTSTRAP_LOCK.lock().unwrap().remove(&self.database_name);
            // let handle = tokio::runtime::Handle::current();
            //
            // let app_state = self.app_state.clone();
            // let database_name = self.database_name.clone();
            // std::thread::spawn(move || {
            //     let rt = tokio::runtime::Builder::new_current_thread()
            //         .enable_io()
            //         .build()
            //         .unwrap();
            //     rt.block_on(async {
            //         println!("dropping database");
            //         app_state
            //             .mongo_client
            //             .database(&database_name)
            //             .drop(None)
            //             .await
            //             .unwrap();
            //         println!("database dropped");
            //     });
            // })
            // .join()
            // .unwrap();
        }
    }

    impl Bootstrap {
        pub fn db(&self) -> State<Client> {
            State(self.connection().clone())
        }

        pub fn user_access(&self) -> UserAccess {
            UserAccess::from_token(&self.app_state.jwt_state, &self.user_token()).unwrap()
        }

        pub fn user_token(&self) -> String {
            let model =
                super::token::generate_access_token(&self.app_state.jwt_state, &self.user_model)
                    .unwrap();

            model.token
        }

        pub async fn user_refresh_token(&self) -> String {
            super::token::create_refresh_token(
                &self.app_state.jwt_state,
                &self.app_state.argon,
                self.refresh_token_collection().0,
                &self.user_model,
            )
            .await
            .unwrap()
        }

        pub fn user_id(&self) -> ObjectId {
            self.user_model.id
        }

        pub async fn reload(mut self) -> Self {
            self.user_model =
                super::auth::UserModel::from_id(self.user_id(), &self.app_state.user_collection)
                    .await
                    .unwrap();

            self
        }

        // pub async fn user_model(&self) -> crate::entity::user::Model {
        //     self.user_model.clone()
        // }

        pub fn user_email(&self) -> String {
            self.user_model.email.clone()
        }

        pub fn user_password(&self) -> String {
            self.user_password.clone()
        }

        pub async fn derive(&self, email: &str, password: &str, user_role: UserRole) -> Bootstrap {
            let (user, session) = create_user(&self.app_state, email, password, user_role).await;

            Bootstrap {
                user_model: user,
                user_password: password.to_string(),
                session,
                app_state: self.app_state.clone(),

                track_cleanup: self.track_cleanup.clone(),
            }
        }

        pub async fn with_balance(mut self, balance: Decimal) -> Self {
            self.app_state
                .user_collection
                .update_one(
                    bson::doc! {
                        "_id": self.user_id()
                    },
                    bson::doc! {
                        "$set": {
                            "balance": bson::to_bson(&balance).unwrap()
                        }
                    },
                    None,
                )
                .await
                .unwrap();

            self.user_model.balance = balance;

            self
        }

        pub fn connection(&self) -> &Client {
            &self.app_state.mongo_client
        }

        pub fn product_collection(&self) -> State<ProductCollection> {
            State(self.app_state.product_collection.clone())
        }

        pub fn transaction_collection(&self) -> State<TransactionCollection> {
            State(self.app_state.transaction_collection.clone())
        }

        pub fn cart_collection(&self) -> State<CartCollection> {
            State(self.app_state.cart_collection.clone())
        }

        pub fn user_collection(&self) -> State<UserCollection> {
            State(self.app_state.user_collection.clone())
        }

        pub fn refresh_token_collection(&self) -> State<RefreshTokenCollection> {
            State(self.app_state.token_collection.clone())
        }

        pub fn argon(&self) -> State<argon2::Argon2<'static>> {
            State(self.app_state.argon.clone())
        }

        pub fn jwt_state(&self) -> State<JwtState> {
            State(self.app_state.jwt_state.clone())
        }

        pub fn mongo_client(&self) -> State<mongodb::Client> {
            State(self.app_state.mongo_client.clone())
        }

        pub async fn create_product(&self, price: i64, stock: i64) -> super::product::Product {
            use super::product::*;

            let Json(product) = super::product::create(
                self.product_collection(),
                self.user_access(),
                Json(CreateRequest {
                    name: "test".to_string(),
                    description: "".to_string(),
                    price: Decimal::from(price),
                    stock: BigInt::from(stock).into(),
                }),
            )
            .await
            .unwrap();

            product
        }

        pub async fn create_transaction(
            &self,
            from: &Self,
            product: i64,
        ) -> super::transaction::TransactionModel {
            assert!(
                self.user_model.balance >= Decimal::from(product * 1_000),
                "make sure to set balance first before calling create_transaction"
            );
            let mut products = vec![];

            for it in 0..product {
                let p = from.create_product(1_000, 1).await;
                products.push(super::transaction::ProductOrderRequest {
                    product_id: p.id,
                    quantity: BigIntString(1.into()),
                });
            }

            let Json(transaction) = super::transaction::insert_order(
                self.transaction_collection(),
                self.product_collection(),
                self.user_collection(),
                self.mongo_client(),
                self.user_model.clone(),
                Json(super::transaction::InsertOrderRequest { products }),
            )
            .await
            .unwrap();

            transaction
        }
    }

    pub async fn create_user(
        app: &AppState,
        email: &str,
        password: &str,
        role: UserRole,
    ) -> (
        crate::api::v1::auth::UserModel,
        crate::api::v1::auth::RefreshClaim,
    ) {
        let user = super::auth::create_user(
            app.user_collection.clone(),
            app.argon.clone(),
            super::auth::CreateUserRequest {
                name: email.to_string(),
                email: email.to_string(),
                password: password.to_string(),
                confirm_password: password.to_string(),
                role,
                balance: Decimal::from(0),
            },
        )
        .await
        .unwrap();

        let (_, token) =
            super::token::generate_refresh_token_model(&app.jwt_state, &app.argon, &user).unwrap();

        (
            user,
            super::auth::RefreshClaim::from_token(&app.jwt_state, token).unwrap(),
        )
    }

    pub async fn bootstrap() -> Bootstrap {
        dotenvy::dotenv().unwrap();
        let mongodb_url = &std::env::var("MONGODB_URI")
            .expect("Cannot retreive JWT_SECRET_KEY from environment variable.");

        let database_name = format!("ecommerce-test-{}", ObjectId::new().to_string());
        {
            let mut vec = BOOTSTRAP_LOCK.lock().unwrap();
            vec.insert(database_name.clone());
        }

        let argon = argon2::Argon2::new(
            Default::default(),
            Default::default(),
            argon2::ParamsBuilder::new()
                // .m_cost(1)
                .p_cost(1)
                .t_cost(1)
                .build()
                .unwrap(),
        );
        let jwt_state = JwtState::new_from_env();
        let app_state = AppState::new(argon, jwt_state, mongodb_url, &database_name)
            .await
            .unwrap();
        let password = "password";
        let (user, session) =
            create_user(&app_state, "example@example.com", password, UserRole::Admin).await;

        // let track =
        let track_cleanup = Arc::new(Cleanup {
            database_name,
            app_state: app_state.clone(),
        });

        Bootstrap {
            app_state,
            user_model: user,
            user_password: password.to_string(),
            session,

            track_cleanup,
        }
    }

    pub async fn wait_bootstrap() {
        //
    }
}

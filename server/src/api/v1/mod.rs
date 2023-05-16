pub mod account;
pub mod auth;
pub mod product;
pub mod token;
pub mod transaction;
pub mod user;

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use axum::{extract::State, Json};
    use bson::oid::ObjectId;
    use mongodb::Client;
    use num_bigint::BigInt;
    use rust_decimal::Decimal;

    use crate::app::AppState;

    use super::{
        auth::{UserAccess, UserRole},
        product::ProductCollection,
    };

    #[allow(dead_code)]
    pub struct Bootstrap {
        user_model: crate::api::v1::auth::UserModel,
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
            // let token = &self.session.1
            //

            let model =
                super::token::generate_access_token(&self.app_state.jwt_state, &self.user_model)
                    .unwrap();

            UserAccess::from_token(&self.app_state.jwt_state, &model.token).unwrap()
        }

        pub fn user_id(&self) -> ObjectId {
            self.user_model.id
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

        pub fn connection(&self) -> &Client {
            &self.app_state.mongo_client
        }

        pub fn product_collection(&self) -> State<ProductCollection> {
            State(self.app_state.product_collection.clone())
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
            super::auth::RegisterRequest {
                email: email.to_string(),
                password: password.to_string(),
                confirm_password: password.to_string(),
            },
            role,
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
        let app_state = AppState::new(mongodb_url, &database_name).await.unwrap();
        let password = "password";
        let (user, session) =
            create_user(&app_state, "example@example.com", password, UserRole::Admin).await;

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
}

use axum::extract::FromRef;

use crate::api::v1::{
    auth::UserCollection,
    product::ProductCollection,
    token::{JwtState, RefreshTokenCollection},
    transaction::TransactionCollection,
};

#[derive(FromRef, Clone)]
pub struct AppState {
    pub argon: argon2::Argon2<'static>,
    pub jwt_state: JwtState,

    pub mongo_client: mongodb::Client,
    pub token_collection: RefreshTokenCollection,
    pub user_collection: UserCollection,
    pub product_collection: ProductCollection,
    pub transaction_collection: TransactionCollection,
}

impl AppState {
    pub async fn new(
        mongo_url: &str,
        database_name: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let argon = argon2::Argon2::default();
        let jwt_state = JwtState::new_from_env();

        let mongo_client_opt = mongodb::options::ClientOptions::parse(mongo_url).await?;
        let mongo_client = mongodb::Client::with_options(mongo_client_opt)?;

        let db = mongo_client.database(database_name);
        Ok(Self {
            argon,
            jwt_state,

            mongo_client,
            token_collection: RefreshTokenCollection(db.collection("refresh_tokens")),
            user_collection: UserCollection(db.collection("users").into()),
            product_collection: ProductCollection(db.collection("products").into()),
            transaction_collection: TransactionCollection(db.collection("transactions").into()),
        })
    }

    pub async fn new_from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let mongodb_url = &std::env::var("MONGODB_URI")
            .expect("Cannot retreive JWT_SECRET_KEY from environment variable.");

        Self::new(mongodb_url, "ecommerce").await
    }
}

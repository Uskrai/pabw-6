use axum::extract::FromRef;

use crate::{
    api::v1::{
        auth::UserCollection,
        cart::CartCollection,
        product::ProductCollection,
        token::{JwtState, RefreshTokenCollection},
        transaction::TransactionCollection,
    },
    migrate::MigrationCollection,
};

#[derive(FromRef, Clone)]
pub struct AppState {
    pub argon: argon2::Argon2<'static>,
    pub jwt_state: JwtState,

    pub migrate_collection: MigrationCollection,
    pub mongo_client: mongodb::Client,
    pub token_collection: RefreshTokenCollection,
    pub user_collection: UserCollection,
    pub product_collection: ProductCollection,
    pub transaction_collection: TransactionCollection,
    pub cart_collection: CartCollection,
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

        let this = Self {
            argon,
            jwt_state,

            mongo_client,
            migrate_collection: MigrationCollection(db.collection("migrations").into()),
            token_collection: RefreshTokenCollection(db.collection("refresh_tokens")),
            user_collection: UserCollection(db.collection("users").into()),
            product_collection: ProductCollection(db.collection("products").into()),
            transaction_collection: TransactionCollection(db.collection("transactions").into()),
            cart_collection: CartCollection(db.collection("carts").into()),
        };

        this.run_migration().await?;

        Ok(this)
    }

    pub async fn migrate(&self) -> Result<(), Box<dyn std::error::Error>> {
        Ok(())
    }

    pub async fn new_from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let mongodb_url = &std::env::var("MONGODB_URI")
            .expect("Cannot retreive JWT_SECRET_KEY from environment variable.");

        Self::new(mongodb_url, "ecommerce").await
    }
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn delete_database() {
        let mongodb_url = &std::env::var("MONGODB_URI")
            .expect("Cannot retreive JWT_SECRET_KEY from environment variable.");

        let mongo_client_opt = mongodb::options::ClientOptions::parse(mongodb_url)
            .await
            .unwrap();
        let mongo_client = mongodb::Client::with_options(mongo_client_opt).unwrap();

        let databases = mongo_client.list_database_names(None, None).await.unwrap();
        for it in databases {
            if it.starts_with("ecommerce-test") {
                mongo_client.database(&it).drop(None).await.unwrap();
            }
        }
    }
}

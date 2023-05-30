use std::collections::HashSet;

use bson::oid::ObjectId;
use mongodb::{options::IndexOptions, ClientSession, IndexModel};
use serde::{Deserialize, Serialize};

use crate::{app::AppState, mongo_ext::Collection};

#[derive(Serialize, Deserialize)]
pub struct MigrateModel {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub version: i64,
}

#[derive(Clone)]
pub struct MigrationCollection(pub Collection<MigrateModel>);

impl std::ops::Deref for MigrationCollection {
    type Target = Collection<MigrateModel>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl MigrationCollection {
    pub async fn insert_version_with_session(
        &self,
        version: i64,
        session: &mut ClientSession,
    ) -> Result<(), mongodb::error::Error> {
        self.insert_one_with_session(
            MigrateModel {
                id: ObjectId::new(),
                version,
            },
            None,
            session,
        )
        .await
        .map(|_| ())
    }
}

impl AppState {
    async fn v1_migrate(&self, session: &mut ClientSession) -> Result<(), mongodb::error::Error> {
        self.migrate_collection
            .create_index_with_session(
                IndexModel::builder()
                    .keys(bson::doc! {"version": 1})
                    .options(IndexOptions::builder().unique(true).build())
                    .build(),
                None,
                session,
            )
            .await?;

        self.cart_collection
            .create_index_with_session(
                IndexModel::builder()
                    .keys(bson::doc! {
                        "user_id": 1,
                        "product_id": 1,
                        "merchant_id": 1,
                    })
                    .options(IndexOptions::builder().unique(true).build())
                    .build(),
                None,
                session,
            )
            .await?;

        Ok(())
    }

    async fn get_all_migration(&self) -> Result<Vec<MigrateModel>, mongodb::error::Error> {
        let mut cursor = self.migrate_collection.find(None, None).await?;

        let mut vec = vec![];

        while cursor.advance().await? {
            vec.push(cursor.deserialize_current()?);
        }

        Ok(vec)
    }

    pub async fn run_migration(&self) -> Result<(), mongodb::error::Error> {
        let migration: HashSet<i64> = self
            .get_all_migration()
            .await?
            .into_iter()
            .map(|it| it.version)
            .collect();

        let mut session = self.mongo_client.start_session(None).await?;
        session.start_transaction(None).await?;

        macro_rules! migrate {
            ($version:expr, $fun:ident) => {
                if let None = migration.get($version) {
                    tracing::debug!("running migration version {}", $version);
                    self.$fun(&mut session).await?;
                    self.migrate_collection
                        .insert_version_with_session(1, &mut session)
                        .await?;
                }
            };
        }

        migrate!(&1, v1_migrate);

        session.commit_transaction().await
    }
}

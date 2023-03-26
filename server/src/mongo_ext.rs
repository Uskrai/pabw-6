use std::ops::{Deref, DerefMut};

use bson::oid::ObjectId;
use serde::de::DeserializeOwned;

use crate::error::Error;

pub struct Collection<T>(pub mongodb::Collection<T>);

impl<T> Clone for Collection<T> {
    fn clone(&self) -> Self {
        Self(self.0.clone())
    }
}

impl<T> Deref for Collection<T> {
    type Target = mongodb::Collection<T>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<T> DerefMut for Collection<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl<T> From<mongodb::Collection<T>> for Collection<T> {
    fn from(value: mongodb::Collection<T>) -> Self {
        Self(value)
    }
}

impl<T> Collection<T>
where
    T: DeserializeOwned + Send + Sync + Unpin,
{
    /// Finds the documents in the collection matching `filter` with null deleted_at .
    pub async fn find_exists(
        &self,
        filter: impl Into<Option<bson::Document>>,
    ) -> Result<mongodb::Cursor<T>, mongodb::error::Error> {
        let doc = filter.into();

        let mut filter = bson::doc! {
            "deleted_at": null
        };
        if let Some(it) = doc {
            filter.extend(it);
        }

        self.find(filter, None).await
    }

    /// Finds a single document in the collection with matchi id and null deleted_at.
    pub async fn find_exists_one_by_id(&self, id: ObjectId) -> Result<Option<T>, Error> {
        self
            .find_one(
                bson::doc! {
                    "_id": id,
                    "deleted_at": null
                },
                None,
            )
            .await
            .map_err(Into::into)
    }

    pub async fn update_exists_one_by_id(
        &self,
        id: ObjectId,
        update: impl Into<mongodb::options::UpdateModifications>,
    ) -> Result<mongodb::results::UpdateResult, Error> {
        self
            .update_one(
                bson::doc! {
                    "_id": id,
                    "deleted_at": null,
                },
                update,
                None,
            )
            .await
            .map_err(Into::into)
    }

    pub async fn soft_delete_one_by_id(&self, id: ObjectId) -> Result<(), Error> {
        self
            .update_one(
                bson::doc! {
                    "_id": id,
                },
                bson::doc! {
                    "deleted_at": bson::DateTime::from(time::OffsetDateTime::now_utc()),
                },
                None,
            )
            .await
            .map(|_| ())
            .map_err(Into::into)
    }
}

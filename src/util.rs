use std::str::FromStr;

use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use crate::error::Error;

#[derive(Serialize, Deserialize, Debug, Clone, Copy)]
pub struct ObjectIdString(#[serde(with = "object_id_string")] pub ObjectId);

impl From<ObjectId> for ObjectIdString {
    fn from(value: ObjectId) -> Self {
        Self(value)
    }
}

impl std::ops::Deref for ObjectIdString {
    type Target = ObjectId;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl std::ops::DerefMut for ObjectIdString {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl std::cmp::PartialEq for ObjectIdString {
    fn eq(&self, other: &Self) -> bool {
        self.0 == other.0
    }
}
impl std::cmp::Eq for ObjectIdString {}

impl std::cmp::PartialEq<ObjectId> for ObjectIdString {
    fn eq(&self, other: &ObjectId) -> bool {
        self.0 == *other
    }
}

impl From<ObjectIdString> for bson::Bson {
    fn from(value: ObjectIdString) -> Self {
        value.0.into()
    }
}

mod object_id_string {
    use bson::oid::ObjectId;
    use serde::{self, Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(id: &ObjectId, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&id.to_string())
    }

    // The signature of a deserialize_with function must follow the pattern:
    //
    //    fn deserialize<'de, D>(D) -> Result<T, D::Error>
    //    where
    //        D: Deserializer<'de>
    //
    // although it may also be generic over the output types T.
    pub fn deserialize<'de, D>(deserializer: D) -> Result<ObjectId, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        s.parse().map_err(serde::de::Error::custom)
    }
}

pub fn verify_password(argon: &Argon2, password: &str, hashed: &str) -> bool {
    let hashed = match PasswordHash::new(hashed) {
        Ok(hashed) => hashed,
        Err(_) => return false,
    };

    argon.verify_password(password.as_bytes(), &hashed).is_ok()
}

pub fn hash_password(argon: &Argon2, password: &str) -> Result<String, Error> {
    let salt = password_hash::SaltString::generate(&mut password_hash::rand_core::OsRng);

    argon
        .hash_password(password.as_bytes(), &salt)
        .map(|it| it.to_string())
        .map_err(Into::into)
}


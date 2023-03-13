use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use crate::error::Error;
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


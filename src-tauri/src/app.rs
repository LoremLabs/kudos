// #[path = "app.rs"] mod app;

extern crate keyring;
extern crate whoami;
extern crate bcrypt;

use bcrypt::{hash, verify};
use tracing::{info, warn};

const DEFAULT_COST: u32 = 12; // default is 12, but may be increased in the future we need it to be known ahead of time (TODO: is this true?)

pub fn store_password(app_name: &str, password: &str) -> bool {
    // given a password, encrypt it with bcrypt and store it in the keyring
    let service = app_name;

    let username: String = whoami::username();

    // create entry name from username : "pass"
    let entry_name = format!("{}:{}", username, "pass");
    let entry = keyring::Entry::new(&service, &entry_name);

    let hashed = hash(&password, DEFAULT_COST);
    // get the hashed password as a string
    let hashed_password = hashed.unwrap();

    // TODO: should it be posible to start up without writing to keyring?
    let set_result = entry.set_password(&hashed_password);
    if set_result.is_err() {
        warn!("Error setting hashed password: {}", set_result.unwrap_err());
        // refuse to start, exit
        std::process::exit(1);
    }

    return true;
}

pub fn validate_password(app_name: &str, password: &str) -> bool {
    let service = app_name;
    // let username = "salt";
    let username: String = whoami::username();

    // create entry name from username : "pass"
    let entry_name = format!("{}:{}", username, "pass");

    let entry = keyring::Entry::new(&service, &entry_name);
    match entry.get_password() {
        Ok(stored_passhash) => {
            info!("Stored pass found in keyring");

            let valid = verify(&password, &stored_passhash).unwrap();
        
            return valid;
        }
        Err(keyring::Error::NoEntry) => {
            return false;
        }
        Err(err) => {
            info!("Error getting password: {:?}", err);
            // refuse to start, exit
            std::process::exit(1);
        }
    };    
}

pub fn get_salt(app_name: &str) -> Result<String, keyring::Error> {
    let env_salt = std::env::var("SETLER_SALT");
    if env_salt.is_ok() {
        info!("Salt from env");
        return Ok(env_salt.unwrap());
    }

    // setup keyring secrets
    // TODO: this on the mac is asking for the password everytime. Not sure if this is a dev thing or not.
    let service = app_name;
    // let username = "salt";
    let username: String = whoami::username();

    let entry = keyring::Entry::new(&service, &username);
    match entry.get_password() {
        Ok(wallet_salt) => {
            info!("Salt found in keyring");
            return Ok(wallet_salt);
        }
        Err(keyring::Error::NoEntry) => {
            info!("Generating new salt");

            // generate new random salt and store in keyring
            let random_salt = rand::random::<[u8; 32]>();

            // convert bytes to string
            let random_salt_hex = hex::encode(random_salt);
            let set_result = entry.set_password(&random_salt_hex);
            if set_result.is_err() {
                warn!("Error setting password: {}", set_result.unwrap_err());
                // refuse to start, exit
                std::process::exit(1);
            }

            return Ok(random_salt_hex);
        }
        Err(err) => {
            info!("Error getting password: {:?}", err);
            // refuse to start, exit
            std::process::exit(1);
        }
    };
}

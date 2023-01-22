// #[path = "app.rs"] mod app;

extern crate keyring;
extern crate whoami;

use tracing::{info, warn};

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

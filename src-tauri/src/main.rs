#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello there, {}!", name)
}

extern crate keyring;

use tauri::{AboutMetadata, CustomMenuItem, Menu, MenuItem, Submenu};
use dotenv::dotenv;

fn get_app_salt(app_name: &str) -> Result<String, keyring::Error> {
    // check from environment variable
    dotenv().ok();
    let env_salt = std::env::var("SETLER_SALT");
    if env_salt.is_ok() {
        return Ok(env_salt.unwrap());
    }

    // setup keyring secrets
    let service = app_name;
    let username = "salt";

    let entry = keyring::Entry::new(&service, &username);
    match entry.get_password() {
        Ok(wallet_salt) => {
            return Ok(wallet_salt);
        }
        Err(keyring::Error::NoEntry) => {
            println!("Generating new salt");

            // generate new random salt and store in keyring
            let random_salt = rand::random::<[u8; 32]>();
            
            // convert bytes to string
            let random_salt_hex = hex::encode(random_salt);
            let set_result = entry.set_password(&random_salt_hex);
            if set_result.is_err() {
                println!("Error setting password: {}", set_result.unwrap_err());
                // refuse to start, exit
                std::process::exit(1);
            }
    
            return Ok(random_salt_hex);
        }
        Err(err) => {
            println!("Error getting password: {:?}", err);
            // refuse to start, exit
            std::process::exit(1);
        }
    };
}

fn main() {
    let context = tauri::generate_context!();
    let app_name = &context.package_info().name;
    println!("Starting {}", app_name);

    let app_salt = get_app_salt(app_name);
    // println!("appSalt: {}", app_salt.as_ref().unwrap());

    tauri::Builder::default()
        .plugin(tauri_plugin_sqlite::init())
        .plugin(
            tauri_plugin_stronghold::Builder::new(move |password| {
                let config = argon2::Config {
                    lanes: 8,
                    mem_cost: 16 * 1024,
                    time_cost: 32,
                    thread_mode: argon2::ThreadMode::from_threads(2),
                    variant: argon2::Variant::Argon2id,
                    ..Default::default()
                };

                let app_salt_hex = hex::decode(app_salt.as_ref().unwrap())
                    .unwrap_or_else(|_| {
                        // check for error
                        println!("Error decoding app salt");
                        std::process::exit(1);
                    }
                    );

                let key =
                    argon2::hash_raw(password.as_ref(), &app_salt_hex, &config)
                        .expect("failed to hash password");

                key.to_vec()
            })
            .build(),
        )
        .menu(build_menu(app_name))
        .on_menu_event(|event| match event.menu_item_id() {
            "preferences" => {
                let window = event.window();
                window.emit("show-preferences", "").unwrap();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(context)
        .expect("error while running tauri application")
}

fn build_menu(app_name: &str) -> Menu {
    let edit_menu = Submenu::new(
        "Edit",
        Menu::new()
            .add_native_item(MenuItem::Undo)
            .add_native_item(MenuItem::Redo)
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Cut)
            .add_native_item(MenuItem::Copy)
            .add_native_item(MenuItem::Paste)
            .add_native_item(MenuItem::SelectAll),
    );

    let view_menu = Submenu::new(
        "View",
        Menu::new().add_native_item(MenuItem::EnterFullScreen),
    );

    let window_menu = Submenu::new(
        "Window",
        Menu::new()
            .add_native_item(MenuItem::Minimize)
            .add_native_item(MenuItem::Zoom),
    );

    let help_menu = Submenu::new(
        "Help",
        Menu::new().add_item(CustomMenuItem::new("Learn More", "Learn More")),
    );
    let mut menu = Menu::new();
    menu = menu.add_submenu(Submenu::new(
        app_name,
        Menu::new()
            .add_native_item(MenuItem::About(
                app_name.to_string(),
                AboutMetadata::default(),
            ))
            .add_native_item(MenuItem::Separator)
            .add_item(
                CustomMenuItem::new("preferences", "Preferences...")
                    .accelerator("CmdOrCtrl+,")
                    .into(),
            )
            .add_item(CustomMenuItem::new("thing", "Thing").into())
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Hide)
            .add_native_item(MenuItem::HideOthers)
            .add_native_item(MenuItem::ShowAll)
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Quit),
    ));
    menu = menu.add_submenu(edit_menu);
    menu = menu.add_submenu(view_menu);
    menu = menu.add_submenu(window_menu);
    menu = menu.add_submenu(help_menu);
    menu
}

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello there, {}!", name)
}

// fn get_environment_variable (name: &str) -> String {
//   std::env::var(name).unwrap_or_else(|_| "".to_string())
// }

#[path = "app.rs"]
mod app;

use dotenv::dotenv;
use std::collections::HashMap;
use std::env;
use std::sync::Mutex;
use tauri::State;
use tauri::{AboutMetadata, CustomMenuItem, Menu, MenuItem, Submenu};
use tracing::{debug, info, warn};
use tracing_subscriber;

//struct Shared(Mutex<HashMap<String,String>>);
#[derive(Default)]
struct Shared(Mutex<HashMap<String, String>>);

fn main() {
    // check from environment variable
    dotenv().ok();

    // enable logging
    tracing_subscriber::fmt().json().init();

    let context = tauri::generate_context!();
    let app_name = &context.package_info().name;
    info!("Starting {}", app_name);

    let mut shared = HashMap::new();
    shared.insert("app_name".to_string(), app_name.to_string());

    #[tauri::command]
    fn validate_password(shared: State<Shared>, password: &str) -> bool {
        let binding = shared.0.lock().unwrap();

        let app_name = binding.get("app_name").unwrap();
        // if no app_name, exit
        if app_name.is_empty() {
            warn!("App name not found");
            std::process::exit(1);
        }

        let valid = app::validate_password(app_name, password);
        return valid;
    }

    #[tauri::command]
    fn store_password(shared: State<Shared>, password: &str) -> bool {
        let binding = shared.0.lock().unwrap();

        let app_name = binding.get("app_name").unwrap();
        // if no app_name, exit
        if app_name.is_empty() {
            warn!("App name not found");
            std::process::exit(1);
        }

        info!("Storing password {} for {}", password, app_name);

        let valid = app::store_password(app_name, password);
        return valid;
    }

    #[tauri::command]
    fn get_config(shared: State<Shared>) -> String {
        let binding = shared.0.lock().unwrap();

        match binding.get("config") {
            Some(config_json) => {
                info!("config found {}", config_json);
                return config_json.to_string();
            }
            None => {
                info!("Config not found");
                return "{}".to_string();
            }
        }
    }

    #[tauri::command]
    fn set_config(config_json: &str, shared: State<Shared>) -> bool {
        let mut binding = shared.0.lock().unwrap();

        match binding.insert("config".to_string(), config_json.to_string()) {
            Some(config_json) => {
                info!("set config found {}", config_json);
                return true;
            }
            None => {
                info!("set Config not found");
                return false;
            }
        }
    }

    #[tauri::command]
    fn get_salt(shared: State<Shared>) -> String {
        let mut binding = shared.0.lock().unwrap();

        let app_name = binding.get("app_name").unwrap();
        // if no app_name, exit
        if app_name.is_empty() {
            warn!("App name not found");
            std::process::exit(1);
        }

        // let binding = map.unwrap();
        if !binding.contains_key("salt") {
            debug!("Salt not found?");

            let app_salt = app::get_salt(app_name);
            if app_salt.is_err() {
                info!("Error getting salt: {}", app_salt.unwrap_err());
                std::process::exit(1);
            }
            let app_salt = app_salt.unwrap();
            binding.insert("salt".to_string(), app_salt);
        } else {
            debug!("Salt found");
        }
        // let salt = binding.get("salt");
        // if salt.is_none() {
        //     info!("Salt not found");
        //     return "abc".to_string();
        // }
        // info!("Salt Found");
        // return salt.unwrap().to_string();
        match binding.get("salt") {
            Some(salt) => {
                info!("Salt found {}", salt);
                return salt.to_string();
            }
            None => {
                info!("Salt not found");
                return "".to_string();
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_sqlite::init())
        // .plugin(
        //     tauri_plugin_stronghold::Builder::new(move |password| {
        //         let config = argon2::Config {
        //             lanes: 8,
        //             mem_cost: 16 * 1024,
        //             time_cost: 32,
        //             thread_mode: argon2::ThreadMode::from_threads(2),
        //             variant: argon2::Variant::Argon2id,
        //             ..Default::default()
        //         };
        //         let app_salt_hex = hex::decode(app_salt.as_ref().unwrap())
        //             .unwrap_or_else(|_| {
        //                 // check for error
        //                 info!("Error decoding app salt");
        //                 std::process::exit(1);
        //             }
        //             );
        //         let key =
        //             argon2::hash_raw(password.as_ref(), &app_salt_hex, &config)
        //                 .expect("failed to hash password");
        //         key.to_vec()
        //     })
        //     .build(),
        // )
        .menu(build_menu(app_name))
        .on_menu_event(|event| match event.menu_item_id() {
            // "preferences" => {
            //     let window = event.window();
            //     window.emit("show-preferences", "").unwrap();
            // },
            "Product Homepage" => {
                let window = event.window();
                window.emit("goto-homepage", "").unwrap();
            }
            _ => {}
        })
        //        .manage(Shared(Mutex::new(app_salt.as_ref().unwrap().to_string(),),"hi".to_string()))
        .manage(Shared(shared.into()))
        .invoke_handler(tauri::generate_handler![
            greet, get_salt, get_config, set_config, validate_password, store_password
        ])
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
        Menu::new().add_item(CustomMenuItem::new("Product Homepage", "Product Homepage")),
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
            // .add_item(
            //     CustomMenuItem::new("preferences", "Preferences...")
            //         .accelerator("CmdOrCtrl+,")
            //         .into(),
            // )
            // .add_item(CustomMenuItem::new("thing", "Thing").into())
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

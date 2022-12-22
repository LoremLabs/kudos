#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello there, {}!", name)
}

use tauri::{AboutMetadata, CustomMenuItem, Menu, MenuItem, Submenu};

fn main() {
    let context = tauri::generate_context!();
    let app_name = &context.package_info().name;
    println!("Starting {}", app_name);
    tauri::Builder::default()
    .plugin(tauri_plugin_sqlite::init())
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
        .expect("error while running tauri application");
}
  
fn build_menu(app_name: &str) -> Menu {
  let edit_menu = Submenu::new("Edit", Menu::new()
  .add_native_item(MenuItem::Undo)
  .add_native_item(MenuItem::Redo)
  .add_native_item(MenuItem::Separator)
  .add_native_item(MenuItem::Cut)
  .add_native_item(MenuItem::Copy)
  .add_native_item(MenuItem::Paste)
  .add_native_item(MenuItem::SelectAll));

  let view_menu = Submenu::new("View", Menu::new()
  .add_native_item(MenuItem::EnterFullScreen));

let window_menu = Submenu::new("Window", Menu::new()
  .add_native_item(MenuItem::Minimize)
  .add_native_item(MenuItem::Zoom));

let help_menu = Submenu::new("Help", Menu::new()
  .add_item(CustomMenuItem::new("Learn More", "Learn More")));
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

mod commands;
mod db;
mod events;
mod pty;
mod socket;
pub mod terminal_config;

use pty::manager::SessionManager;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

pub struct AppState {
    pub session_manager: Arc<SessionManager>,
    pub bootstrapped: AtomicBool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        session_manager: Arc::new(SessionManager::new()),
        bootstrapped: AtomicBool::new(false),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .manage(socket::SocketState {
            pending_requests: Arc::new(dashmap::DashMap::new()),
            next_id: std::sync::atomic::AtomicUsize::new(1),
        })
        .invoke_handler(tauri::generate_handler![
            commands::terminal::create_session,
            commands::terminal::write_to_session,
            commands::terminal::resize_session,
            commands::terminal::kill_session,
            commands::terminal::get_terminal_config,
            commands::terminal::get_all_cwds,
            commands::workspace::load_persistent_data,
            commands::workspace::save_workspaces,
            commands::workspace::save_settings,
            commands::window::claim_leader,
            commands::window::get_window_count,
            socket::socket_response,
            commands::browser::browser_create,
            commands::browser::browser_destroy,
            commands::browser::browser_set_bounds,
            commands::browser::browser_navigate,
            commands::browser::browser_eval,
            commands::browser::browser_status,
            commands::browser::browser_snapshot,
        ])
        .setup(|#[allow(unused)] app| {
            use tauri::Manager;

            let app_handle = app.handle().clone();
            let state = app.state::<AppState>();
            pty::monitor::start_monitor(app_handle.clone(), state.session_manager.clone());

            socket::start_socket_listener(app_handle.clone());

            // Initialize browser manager with GTK Fixed container on Linux.
            // We use gtk::Overlay so the Fixed floats on top of the Tauri webview
            // without pushing it down (pack_start would add it below as a sibling).
            #[cfg(target_os = "linux")]
            {
                use gtk::prelude::*;
                let webview_window = app.get_webview_window("main").unwrap();
                let gtk_window = webview_window.gtk_window().unwrap();
                let vbox = webview_window.default_vbox().unwrap();

                // Restructure: ApplicationWindow → Overlay → vbox
                //                                          ↘ Fixed (floats on top)
                gtk_window.remove(&vbox);
                let overlay = gtk::Overlay::new();
                overlay.add(&vbox);
                let fixed = gtk::Fixed::new();
                fixed.set_can_focus(false);
                overlay.add_overlay(&fixed);
                overlay.set_overlay_pass_through(&fixed, true);
                overlay.show_all();
                gtk_window.add(&overlay);

                app.manage(commands::browser::BrowserManager::new(fixed));
            }
            #[cfg(not(target_os = "linux"))]
            {
                app.manage(commands::browser::BrowserManager::new());
            }

            #[cfg(debug_assertions)]
            {
                let webview = app.get_webview_window("main").unwrap();
                webview.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

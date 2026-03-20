use std::sync::atomic::Ordering;
use tauri::{AppHandle, Manager, State};

use crate::AppState;

#[tauri::command]
pub fn claim_leader(state: State<'_, AppState>) -> bool {
    state
        .bootstrapped
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_ok()
}

#[tauri::command]
pub fn get_window_count(app: AppHandle) -> usize {
    app.webview_windows().len()
}

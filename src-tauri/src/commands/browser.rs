//! Tauri commands for browser pane management.
//!
//! These commands provide the frontend interface to the platform-specific
//! browser implementations in the `browser` module.

use crate::browser::{
    BrowserBackend, BrowserStatus, EvalResult, PlatformBrowserManager, SnapshotResult,
};

// ─── Tauri Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn browser_create(
    session_id: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    state: tauri::State<'_, PlatformBrowserManager>,
) -> Result<(), String> {
    state.create(&session_id, x, y, w, h)
}

#[tauri::command]
pub fn browser_destroy(
    session_id: String,
    state: tauri::State<'_, PlatformBrowserManager>,
) -> Result<(), String> {
    state.destroy(&session_id)
}

#[tauri::command]
pub fn browser_set_bounds(
    session_id: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    state: tauri::State<'_, PlatformBrowserManager>,
) -> Result<(), String> {
    state.set_bounds(&session_id, x, y, w, h)
}

#[tauri::command]
pub fn browser_navigate(
    session_id: String,
    url: String,
    state: tauri::State<'_, PlatformBrowserManager>,
) -> Result<(), String> {
    state.navigate(&session_id, &url)
}

#[tauri::command]
pub fn browser_eval(
    session_id: String,
    script: String,
    state: tauri::State<'_, PlatformBrowserManager>,
) -> Result<EvalResult, String> {
    state.eval(&session_id, &script)
}

#[tauri::command]
pub fn browser_status(
    session_id: String,
    state: tauri::State<'_, PlatformBrowserManager>,
) -> Result<BrowserStatus, String> {
    state.status(&session_id)
}

#[tauri::command]
pub fn browser_snapshot(
    session_id: String,
    state: tauri::State<'_, PlatformBrowserManager>,
) -> Result<SnapshotResult, String> {
    state.snapshot(&session_id)
}

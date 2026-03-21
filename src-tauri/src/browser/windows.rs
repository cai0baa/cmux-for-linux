//! Windows browser pane implementation using WebView2 via wry.
//!
//! This module embeds WebViews as child windows using the Win32 API.
//! Currently a stub implementation — full implementation requires:
//! - windows crate for HWND manipulation
//! - raw-window-handle for getting the parent HWND from Tauri

use super::{BrowserBackend, BrowserStatus, EvalResult, SnapshotResult};

// ─── Windows Browser Manager ─────────────────────────────────────────────────

/// Browser manager for Windows using WebView2.
///
/// TODO: Implement using:
/// - `wry::WebViewBuilder::build_as_child(&hwnd)` to create WebViews
/// - `windows` crate for Win32 window management
/// - `raw-window-handle` to get parent HWND from Tauri window
pub struct WindowsBrowserManager {
    // Will contain: DashMap<String, WebView>, parent HWND
}

impl WindowsBrowserManager {
    /// Create a new browser manager for Windows.
    ///
    /// TODO: Accept parent HWND from Tauri window setup.
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for WindowsBrowserManager {
    fn default() -> Self {
        Self::new()
    }
}

impl BrowserBackend for WindowsBrowserManager {
    fn create(&self, _session_id: &str, _x: f64, _y: f64, _w: f64, _h: f64) -> Result<(), String> {
        Err("Browser pane not yet implemented on Windows. Use system browser as fallback.".into())
    }

    fn destroy(&self, _session_id: &str) -> Result<(), String> {
        Err("Browser pane not yet implemented on Windows".into())
    }

    fn set_bounds(
        &self,
        _session_id: &str,
        _x: f64,
        _y: f64,
        _w: f64,
        _h: f64,
    ) -> Result<(), String> {
        Err("Browser pane not yet implemented on Windows".into())
    }

    fn navigate(&self, _session_id: &str, _url: &str) -> Result<(), String> {
        Err("Browser pane not yet implemented on Windows".into())
    }

    fn eval(&self, _session_id: &str, _script: &str) -> Result<EvalResult, String> {
        Err("Browser pane not yet implemented on Windows".into())
    }

    fn status(&self, _session_id: &str) -> Result<BrowserStatus, String> {
        Err("Browser pane not yet implemented on Windows".into())
    }

    fn snapshot(&self, _session_id: &str) -> Result<SnapshotResult, String> {
        Err("Browser pane not yet implemented on Windows".into())
    }
}

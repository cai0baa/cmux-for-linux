//! macOS browser pane implementation using WKWebView via wry.
//!
//! This module embeds WebViews into an NSView hierarchy on macOS.
//! Currently a stub implementation — full implementation requires:
//! - objc2 crate for NSView manipulation
//! - raw-window-handle for getting the parent NSView from Tauri

use super::{BrowserBackend, BrowserStatus, EvalResult, SnapshotResult};

// ─── macOS Browser Manager ───────────────────────────────────────────────────

/// Browser manager for macOS using WKWebView.
///
/// TODO: Implement using:
/// - `wry::WebViewBuilder::build_ns_view()` to create WebViews
/// - `objc2-app-kit` for NSView hierarchy manipulation
/// - `raw-window-handle` to get parent view from Tauri window
pub struct MacOSBrowserManager {
    // Will contain: DashMap<String, WebView>, parent NSView reference
}

impl MacOSBrowserManager {
    /// Create a new browser manager for macOS.
    ///
    /// TODO: Accept parent NSView pointer from Tauri window setup.
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for MacOSBrowserManager {
    fn default() -> Self {
        Self::new()
    }
}

impl BrowserBackend for MacOSBrowserManager {
    fn create(&self, _session_id: &str, _x: f64, _y: f64, _w: f64, _h: f64) -> Result<(), String> {
        Err("Browser pane not yet implemented on macOS. Use system browser as fallback.".into())
    }

    fn destroy(&self, _session_id: &str) -> Result<(), String> {
        Err("Browser pane not yet implemented on macOS".into())
    }

    fn set_bounds(
        &self,
        _session_id: &str,
        _x: f64,
        _y: f64,
        _w: f64,
        _h: f64,
    ) -> Result<(), String> {
        Err("Browser pane not yet implemented on macOS".into())
    }

    fn navigate(&self, _session_id: &str, _url: &str) -> Result<(), String> {
        Err("Browser pane not yet implemented on macOS".into())
    }

    fn eval(&self, _session_id: &str, _script: &str) -> Result<EvalResult, String> {
        Err("Browser pane not yet implemented on macOS".into())
    }

    fn status(&self, _session_id: &str) -> Result<BrowserStatus, String> {
        Err("Browser pane not yet implemented on macOS".into())
    }

    fn snapshot(&self, _session_id: &str) -> Result<SnapshotResult, String> {
        Err("Browser pane not yet implemented on macOS".into())
    }
}

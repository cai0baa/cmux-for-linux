//! Linux browser pane implementation using GTK and webkit2gtk via wry.
//!
//! This module embeds WebViews into a GTK Overlay on top of the main Tauri window,
//! allowing browser panes to float above the React frontend.

use dashmap::DashMap;
use std::sync::mpsc;
use std::time::Duration;
use wry::{
    dpi::{LogicalPosition, LogicalSize},
    Rect, WebView, WebViewBuilder, WebViewBuilderExtUnix,
};

use super::{BrowserBackend, BrowserStatus, EvalResult, SnapshotResult, SNAPSHOT_SCRIPT};

// ─── Browser Pane ────────────────────────────────────────────────────────────

struct BrowserPane {
    webview: WebView,
}

// ─── Linux Browser Manager ───────────────────────────────────────────────────

/// GTK / wry objects are not Send + Sync per Rust's type system,
/// but GTK *is* safe to use from the main thread. Tauri commands
/// called by invoke() run on background threads but must access
/// GTK state. We guard all GTK access properly at runtime.
///
/// Safety: All GTK/wry calls are coordinated via the main GTK thread;
/// we only hold handles here.
pub struct LinuxBrowserManager {
    panes: DashMap<String, BrowserPane>,
    fixed: gtk::Fixed,
}

unsafe impl Send for LinuxBrowserManager {}
unsafe impl Sync for LinuxBrowserManager {}

impl LinuxBrowserManager {
    /// Create a new browser manager with a GTK Fixed container.
    ///
    /// The Fixed container should be added as an overlay on top of the
    /// main Tauri window's vbox during app setup.
    pub fn new(fixed: gtk::Fixed) -> Self {
        Self {
            panes: DashMap::new(),
            fixed,
        }
    }

    /// Initialize GTK and create the overlay structure for browser panes.
    ///
    /// This should be called during Tauri app setup. It restructures the
    /// window hierarchy to:
    /// ```text
    /// ApplicationWindow → Overlay → vbox (Tauri content)
    ///                            ↘ Fixed (browser panes float on top)
    /// ```
    pub fn init_gtk_overlay(webview_window: &tauri::WebviewWindow) -> Result<gtk::Fixed, String> {
        use gtk::prelude::*;

        let gtk_window = webview_window
            .gtk_window()
            .map_err(|e| format!("Failed to get GTK window: {}", e))?;
        let vbox = webview_window
            .default_vbox()
            .map_err(|e| format!("Failed to get default vbox: {}", e))?;

        // Restructure: remove vbox, create overlay, add both
        gtk_window.remove(&vbox);

        let overlay = gtk::Overlay::new();
        overlay.add(&vbox);

        let fixed = gtk::Fixed::new();
        fixed.set_can_focus(false);
        overlay.add_overlay(&fixed);
        overlay.set_overlay_pass_through(&fixed, true);
        overlay.show_all();

        gtk_window.add(&overlay);

        Ok(fixed)
    }
}

impl BrowserBackend for LinuxBrowserManager {
    fn create(&self, session_id: &str, x: f64, y: f64, w: f64, h: f64) -> Result<(), String> {
        // Skip if already exists
        if self.panes.contains_key(session_id) {
            return Ok(());
        }

        let webview = WebViewBuilder::new()
            .with_bounds(Rect {
                position: LogicalPosition::new(x, y).into(),
                size: LogicalSize::new(w, h).into(),
            })
            .with_url("about:blank")
            .build_gtk(&self.fixed)
            .map_err(|e| e.to_string())?;

        webview.set_visible(true).map_err(|e| e.to_string())?;

        self.panes
            .insert(session_id.to_string(), BrowserPane { webview });
        Ok(())
    }

    fn destroy(&self, session_id: &str) -> Result<(), String> {
        self.panes.remove(session_id);
        Ok(())
    }

    fn set_bounds(&self, session_id: &str, x: f64, y: f64, w: f64, h: f64) -> Result<(), String> {
        if let Some(pane) = self.panes.get(session_id) {
            pane.webview
                .set_bounds(Rect {
                    position: LogicalPosition::new(x, y).into(),
                    size: LogicalSize::new(w, h).into(),
                })
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    fn navigate(&self, session_id: &str, url: &str) -> Result<(), String> {
        let pane = self
            .panes
            .get(session_id)
            .ok_or_else(|| format!("No browser pane for session: {}", session_id))?;
        pane.webview.load_url(url).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn eval(&self, session_id: &str, script: &str) -> Result<EvalResult, String> {
        let pane = self
            .panes
            .get(session_id)
            .ok_or_else(|| format!("No browser pane for session: {}", session_id))?;

        let (tx, rx) = mpsc::channel::<String>();
        pane.webview
            .evaluate_script_with_callback(script, move |result| {
                let _ = tx.send(result);
            })
            .map_err(|e| e.to_string())?;

        // Must drop the pane ref before blocking on channel
        drop(pane);

        let raw = rx
            .recv_timeout(Duration::from_secs(10))
            .map_err(|e| e.to_string())?;

        let parsed: serde_json::Value =
            serde_json::from_str(&raw).unwrap_or(serde_json::Value::String(raw));

        Ok(EvalResult { result: parsed })
    }

    fn status(&self, session_id: &str) -> Result<BrowserStatus, String> {
        let script = r#"JSON.stringify({ url: location.href, title: document.title, loading: document.readyState !== 'complete' })"#;
        let eval_result = self.eval(session_id, script)?;

        let url = eval_result
            .result
            .get("url")
            .and_then(|v| v.as_str())
            .unwrap_or("about:blank")
            .to_string();
        let title = eval_result
            .result
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let loading = eval_result
            .result
            .get("loading")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        Ok(BrowserStatus {
            url,
            title,
            loading,
        })
    }

    fn snapshot(&self, session_id: &str) -> Result<SnapshotResult, String> {
        let eval_result = self.eval(session_id, SNAPSHOT_SCRIPT)?;

        let snapshot = eval_result
            .result
            .get("snapshot")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let refs = eval_result
            .result
            .get("refs")
            .cloned()
            .unwrap_or(serde_json::Value::Object(serde_json::Map::new()));
        let url = eval_result
            .result
            .get("url")
            .and_then(|v| v.as_str())
            .unwrap_or("about:blank")
            .to_string();
        let title = eval_result
            .result
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let ready_state = eval_result
            .result
            .get("ready_state")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        Ok(SnapshotResult {
            snapshot,
            refs,
            url,
            title,
            ready_state,
        })
    }
}

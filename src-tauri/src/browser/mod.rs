//! Cross-platform browser pane abstraction.
//!
//! This module provides a unified interface for embedding native WebViews
//! on Linux (webkit2gtk), macOS (WKWebView), and Windows (WebView2).
//!
//! Each platform has its own implementation module that handles the
//! platform-specific WebView creation and management.

use serde::Serialize;

#[cfg(target_os = "linux")]
pub mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

// Re-export the platform-specific manager
#[cfg(target_os = "linux")]
pub use linux::LinuxBrowserManager as PlatformBrowserManager;

#[cfg(target_os = "macos")]
pub use macos::MacOSBrowserManager as PlatformBrowserManager;

#[cfg(target_os = "windows")]
pub use windows::WindowsBrowserManager as PlatformBrowserManager;

// ─── Common Types ────────────────────────────────────────────────────────────

/// Result of evaluating JavaScript in a browser pane.
#[derive(Serialize)]
pub struct EvalResult {
    pub result: serde_json::Value,
}

/// Status information for a browser pane.
#[derive(Serialize)]
pub struct BrowserStatus {
    pub url: String,
    pub title: String,
    pub loading: bool,
}

/// Accessibility snapshot of a page.
#[derive(Serialize)]
pub struct SnapshotResult {
    pub snapshot: String,
    pub refs: serde_json::Value,
    pub url: String,
    pub title: String,
    pub ready_state: String,
}

// ─── Browser Backend Trait ───────────────────────────────────────────────────

/// Platform-agnostic interface for browser pane management.
///
/// Each platform implements this trait with its native WebView technology:
/// - Linux: GTK Overlay + webkit2gtk via wry
/// - macOS: NSView + WKWebView via wry
/// - Windows: HWND + WebView2 via wry
pub trait BrowserBackend: Send + Sync {
    /// Create a new browser pane at the specified position and size.
    fn create(&self, session_id: &str, x: f64, y: f64, w: f64, h: f64) -> Result<(), String>;

    /// Destroy a browser pane and release its resources.
    fn destroy(&self, session_id: &str) -> Result<(), String>;

    /// Update the position and size of a browser pane.
    fn set_bounds(&self, session_id: &str, x: f64, y: f64, w: f64, h: f64) -> Result<(), String>;

    /// Navigate a browser pane to a URL.
    fn navigate(&self, session_id: &str, url: &str) -> Result<(), String>;

    /// Execute JavaScript in a browser pane and return the result.
    fn eval(&self, session_id: &str, script: &str) -> Result<EvalResult, String>;

    /// Get the current status of a browser pane (URL, title, loading state).
    fn status(&self, session_id: &str) -> Result<BrowserStatus, String>;

    /// Get an accessibility snapshot of the page content.
    fn snapshot(&self, session_id: &str) -> Result<SnapshotResult, String>;
}

// ─── Snapshot Script ─────────────────────────────────────────────────────────

/// JavaScript for generating an accessibility tree snapshot.
/// Used by all platform implementations.
pub const SNAPSHOT_SCRIPT: &str = r#"
(function() {
  var counter = 0;
  var refs = {};

  function role(el) {
    var tag = el.tagName ? el.tagName.toLowerCase() : '';
    var type = el.type ? el.type.toLowerCase() : '';
    if (el.getAttribute && el.getAttribute('role')) return el.getAttribute('role');
    var m = {
      'a': 'link', 'button': 'button',
      'input': (type === 'checkbox' ? 'checkbox' : type === 'radio' ? 'radio' : 'textbox'),
      'textarea': 'textbox', 'select': 'combobox', 'img': 'img',
      'h1': 'heading', 'h2': 'heading', 'h3': 'heading',
      'h4': 'heading', 'h5': 'heading', 'h6': 'heading',
      'ul': 'list', 'ol': 'list', 'li': 'listitem',
      'table': 'table', 'form': 'form', 'nav': 'navigation',
      'main': 'main', 'header': 'banner', 'footer': 'contentinfo', 'aside': 'complementary'
    };
    return m[tag] || tag;
  }

  function label(el) {
    if (el.getAttribute && el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    if (el.innerText && el.innerText.trim()) return el.innerText.trim().substring(0, 80);
    if (el.placeholder) return el.placeholder;
    if (el.alt) return el.alt;
    if (el.title) return el.title;
    if (el.value && typeof el.value === 'string') return el.value.substring(0, 80);
    return '';
  }

  function selector(el) {
    if (el.id) return '#' + el.id;
    var path = [];
    var cur = el;
    while (cur && cur.nodeType === 1) {
      var seg = cur.tagName.toLowerCase();
      if (cur.id) { seg = '#' + cur.id; path.unshift(seg); break; }
      var sib = cur.parentNode ? Array.from(cur.parentNode.children).filter(function(c) { return c.tagName === cur.tagName; }) : [];
      if (sib.length > 1) seg += ':nth-of-type(' + (sib.indexOf(cur) + 1) + ')';
      path.unshift(seg);
      cur = cur.parentNode;
    }
    return path.join(' > ');
  }

  function isVisible(el) {
    if (!el.getBoundingClientRect) return true;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  var INTERACTIVE = ['a', 'button', 'input', 'textarea', 'select', 'details', 'summary'];
  var STRUCTURAL = ['main', 'nav', 'header', 'footer', 'aside', 'section', 'article', 'form'];

  function walk(el, depth) {
    if (!el || el.nodeType !== 1) return '';
    if (!isVisible(el)) return '';
    var tag = el.tagName ? el.tagName.toLowerCase() : '';
    if (['script','style','svg','noscript','meta','head'].indexOf(tag) >= 0) return '';

    var indent = '';
    for (var i = 0; i < depth * 2; i++) indent += ' ';
    var r = role(el);
    var n = label(el);
    var interactive = INTERACTIVE.indexOf(tag) >= 0;
    var structural = STRUCTURAL.indexOf(tag) >= 0;
    var relevant = interactive || structural;

    var out = '';
    if (relevant && n) {
      counter++;
      var ref = 'e' + counter;
      refs[ref] = { role: r, name: n, selector: selector(el) };
      out += indent + '[' + ref + '] ' + r + ' "' + n.replace(/\n/g, ' ') + '"\n';
    }

    var children = Array.from(el.children || []);
    for (var i = 0; i < children.length; i++) {
      out += walk(children[i], depth + (relevant ? 1 : 0));
    }
    return out;
  }

  var snapshot = walk(document.body, 0);
  return JSON.stringify({
    snapshot: snapshot,
    refs: refs,
    url: location.href,
    title: document.title,
    ready_state: document.readyState
  });
})()
"#;

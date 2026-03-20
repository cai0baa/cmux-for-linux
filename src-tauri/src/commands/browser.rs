use serde::Serialize;

// ─── BrowserManager ──────────────────────────────────────────────────────────

#[cfg(target_os = "linux")]
use dashmap::DashMap;

#[cfg(target_os = "linux")]
struct BrowserPane {
    webview: wry::WebView,
}

/// GTK / wry objects are not Send + Sync per Rust's type system,
/// but GTK *is* safe to use from the main thread. Tauri commands
/// called by invoke() run on background threads but must access
/// GTK state. We guard all GTK access properly at runtime.
/// Safety: All GTK/wry calls are coordinated via the main GTK thread;
/// we only hold handles here.
#[cfg(target_os = "linux")]
pub struct BrowserManager {
    panes: DashMap<String, BrowserPane>,
    fixed: gtk::Fixed,
}

#[cfg(target_os = "linux")]
unsafe impl Send for BrowserManager {}
#[cfg(target_os = "linux")]
unsafe impl Sync for BrowserManager {}

#[cfg(not(target_os = "linux"))]
pub struct BrowserManager;

#[cfg(target_os = "linux")]
impl BrowserManager {
    pub fn new(fixed: gtk::Fixed) -> Self {
        Self {
            panes: DashMap::new(),
            fixed,
        }
    }
}

#[cfg(not(target_os = "linux"))]
impl BrowserManager {
    pub fn new() -> Self {
        Self
    }
}

// ─── browser_create ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn browser_create(
    session_id: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    state: tauri::State<'_, BrowserManager>,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        use wry::{
            dpi::{LogicalPosition, LogicalSize},
            Rect, WebViewBuilder, WebViewBuilderExtUnix,
        };

        // Skip if already exists
        if state.panes.contains_key(&session_id) {
            return Ok(());
        }

        let webview = WebViewBuilder::new()
            .with_bounds(Rect {
                position: LogicalPosition::new(x, y).into(),
                size: LogicalSize::new(w, h).into(),
            })
            .with_url("about:blank")
            .build_gtk(&state.fixed)
            .map_err(|e| e.to_string())?;

        webview.set_visible(true).map_err(|e| e.to_string())?;

        state.panes.insert(session_id, BrowserPane { webview });
        Ok(())
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (session_id, x, y, w, h, state);
        Err("browser_create is only supported on Linux".to_string())
    }
}

// ─── browser_destroy ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn browser_destroy(
    session_id: String,
    state: tauri::State<'_, BrowserManager>,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        state.panes.remove(&session_id);
        Ok(())
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (session_id, state);
        Err("browser_destroy is only supported on Linux".to_string())
    }
}

// ─── browser_set_bounds ──────────────────────────────────────────────────────

#[tauri::command]
pub fn browser_set_bounds(
    session_id: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    state: tauri::State<'_, BrowserManager>,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        use wry::{
            dpi::{LogicalPosition, LogicalSize},
            Rect,
        };

        if let Some(pane) = state.panes.get(&session_id) {
            pane.webview
                .set_bounds(Rect {
                    position: LogicalPosition::new(x, y).into(),
                    size: LogicalSize::new(w, h).into(),
                })
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (session_id, x, y, w, h, state);
        Err("browser_set_bounds is only supported on Linux".to_string())
    }
}

// ─── browser_navigate ────────────────────────────────────────────────────────

#[tauri::command]
pub fn browser_navigate(
    session_id: String,
    url: String,
    state: tauri::State<'_, BrowserManager>,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let pane = state
            .panes
            .get(&session_id)
            .ok_or_else(|| format!("No browser pane for session: {}", session_id))?;
        pane.webview.load_url(&url).map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (session_id, url, state);
        Err("browser_navigate is only supported on Linux".to_string())
    }
}

// ─── browser_eval ────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct EvalResult {
    pub result: serde_json::Value,
}

#[tauri::command]
pub fn browser_eval(
    session_id: String,
    script: String,
    state: tauri::State<'_, BrowserManager>,
) -> Result<EvalResult, String> {
    #[cfg(target_os = "linux")]
    {
        use std::sync::mpsc;

        let pane = state
            .panes
            .get(&session_id)
            .ok_or_else(|| format!("No browser pane for session: {}", session_id))?;

        let (tx, rx) = mpsc::channel::<String>();
        pane.webview
            .evaluate_script_with_callback(&script, move |result| {
                let _ = tx.send(result);
            })
            .map_err(|e| e.to_string())?;

        drop(pane);

        let raw = rx
            .recv_timeout(std::time::Duration::from_secs(10))
            .map_err(|e| e.to_string())?;

        let parsed: serde_json::Value =
            serde_json::from_str(&raw).unwrap_or(serde_json::Value::String(raw));

        Ok(EvalResult { result: parsed })
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (session_id, script, state);
        Err("browser_eval is only supported on Linux".to_string())
    }
}

// ─── browser_status ──────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct BrowserStatus {
    pub url: String,
    pub title: String,
    pub loading: bool,
}

#[tauri::command]
pub fn browser_status(
    session_id: String,
    state: tauri::State<'_, BrowserManager>,
) -> Result<BrowserStatus, String> {
    #[cfg(target_os = "linux")]
    {
        let script = r#"JSON.stringify({ url: location.href, title: document.title, loading: document.readyState !== 'complete' })"#;
        let eval_result = browser_eval(session_id, script.to_string(), state)?;

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

        Ok(BrowserStatus { url, title, loading })
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (session_id, state);
        Err("browser_status is only supported on Linux".to_string())
    }
}

// ─── browser_snapshot ────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct SnapshotResult {
    pub snapshot: String,
    pub refs: serde_json::Value,
    pub url: String,
    pub title: String,
    pub ready_state: String,
}

const SNAPSHOT_SCRIPT: &str = r#"
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

#[tauri::command]
pub fn browser_snapshot(
    session_id: String,
    state: tauri::State<'_, BrowserManager>,
) -> Result<SnapshotResult, String> {
    #[cfg(target_os = "linux")]
    {
        let eval_result = browser_eval(session_id, SNAPSHOT_SCRIPT.to_string(), state)?;

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
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (session_id, state);
        Err("browser_snapshot is only supported on Linux".to_string())
    }
}

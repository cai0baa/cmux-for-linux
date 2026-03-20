use std::sync::{atomic::{AtomicUsize, Ordering}, Arc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{UnixListener, UnixStream};
use tokio::sync::oneshot;

pub struct SocketState {
    pub pending_requests: Arc<DashMap<usize, oneshot::Sender<SocketResponse>>>,
    pub next_id: AtomicUsize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocketRequest {
    pub id: usize,
    pub cmd: String,
    pub args: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocketResponse {
    pub id: usize,
    pub result: Option<Value>,
    pub error: Option<String>,
}

#[tauri::command]
pub fn socket_response(
    state: tauri::State<'_, SocketState>,
    id: usize,
    result: Option<Value>,
    error: Option<String>,
) -> Result<(), String> {
    if let Some((_, sender)) = state.pending_requests.remove(&id) {
        let _ = sender.send(SocketResponse { id, result, error });
    }
    Ok(())
}

async fn handle_connection(
    mut stream: UnixStream,
    app: AppHandle,
) {
    let state = app.state::<SocketState>();
    let mut buf = vec![0u8; 8192];
    loop {
        match stream.read(&mut buf).await {
            Ok(0) => break, // Connection closed
            Ok(n) => {
                let data = &buf[..n];
                // Try to parse JSON. Assuming one JSON object per message for simplicity.
                // In a real production environment, you'd buffer and split by newlines or use framing.
                if let Ok(mut parsed) = serde_json::from_slice::<Value>(data) {
                    if let Some(obj) = parsed.as_object_mut() {
                        let cmd = obj.get("cmd").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        let args = obj.remove("args").unwrap_or(Value::Null);
                        
                        let id = state.next_id.fetch_add(1, Ordering::SeqCst);
                        let (tx, rx) = oneshot::channel();
                        
                        state.pending_requests.insert(id, tx);
                        
                        let req = SocketRequest { id, cmd, args };
                        if app.emit("socket-request", &req).is_ok() {
                            // Wait for frontend response
                            if let Ok(resp) = rx.await {
                                let resp_json = serde_json::to_string(&resp).unwrap_or_default();
                                let _ = stream.write_all(resp_json.as_bytes()).await;
                                let _ = stream.write_all(b"\n").await;
                            }
                        } else {
                            state.pending_requests.remove(&id);
                            let err_resp = SocketResponse {
                                id,
                                result: None,
                                error: Some("Frontend not ready".to_string()),
                            };
                            let resp_json = serde_json::to_string(&err_resp).unwrap_or_default();
                            let _ = stream.write_all(resp_json.as_bytes()).await;
                            let _ = stream.write_all(b"\n").await;
                        }
                    }
                }
            }
            Err(_) => break,
        }
    }
}

pub fn start_socket_listener(app: AppHandle) {
    // Create socket path
    let mut socket_path = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("/tmp"));
    socket_path.push(".ptrterminal");
    std::fs::create_dir_all(&socket_path).ok();
    socket_path.push("ptr.sock");
    
    let _ = std::fs::remove_file(&socket_path); // Remove if exists
    
    tauri::async_runtime::spawn(async move {
        match UnixListener::bind(&socket_path) {
            Ok(listener) => {
                println!("Socket listening on {:?}", socket_path);
                loop {
                    if let Ok((stream, _)) = listener.accept().await {
                        let app_clone = app.clone();
                        tauri::async_runtime::spawn(async move {
                            handle_connection(stream, app_clone).await;
                        });
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to bind socket: {}", e);
            }
        }
    });
}

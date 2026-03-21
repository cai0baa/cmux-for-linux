use std::sync::{atomic::{AtomicUsize, Ordering}, Arc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
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
    stream: TcpStream,
    app: AppHandle,
) {
    let state = app.state::<SocketState>();
    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);
    let mut line = String::new();
    
    loop {
        line.clear();
        match reader.read_line(&mut line).await {
            Ok(0) => break, // Connection closed
            Ok(_) => {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                
                if let Ok(mut parsed) = serde_json::from_str::<Value>(trimmed) {
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
                                let _ = writer.write_all(resp_json.as_bytes()).await;
                                let _ = writer.write_all(b"\n").await;
                                let _ = writer.flush().await;
                            }
                        } else {
                            state.pending_requests.remove(&id);
                            let err_resp = SocketResponse {
                                id,
                                result: None,
                                error: Some("Frontend not ready".to_string()),
                            };
                            let resp_json = serde_json::to_string(&err_resp).unwrap_or_default();
                            let _ = writer.write_all(resp_json.as_bytes()).await;
                            let _ = writer.write_all(b"\n").await;
                            let _ = writer.flush().await;
                        }
                    }
                }
            }
            Err(_) => break,
        }
    }
}

/// Get the path to the port file for socket discovery
fn get_port_file_path() -> std::path::PathBuf {
    let mut path = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("/tmp"));
    path.push(".ptrterminal");
    std::fs::create_dir_all(&path).ok();
    path.push("ptr.port");
    path
}

/// Clean up old Unix socket file if it exists (for migration from old versions)
fn cleanup_legacy_socket() {
    let mut socket_path = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("/tmp"));
    socket_path.push(".ptrterminal");
    socket_path.push("ptr.sock");
    let _ = std::fs::remove_file(&socket_path);
}

pub fn start_socket_listener(app: AppHandle) {
    // Clean up legacy Unix socket if migrating
    cleanup_legacy_socket();
    
    let port_file = get_port_file_path();
    
    tauri::async_runtime::spawn(async move {
        // Bind to localhost with port 0 to get a random available port
        match TcpListener::bind("127.0.0.1:0").await {
            Ok(listener) => {
                let addr = listener.local_addr().expect("Failed to get local address");
                let port = addr.port();
                
                // Write port to file for CLI tools to discover
                if let Err(e) = std::fs::write(&port_file, port.to_string()) {
                    eprintln!("Failed to write port file: {}", e);
                    return;
                }
                
                println!("Socket listening on 127.0.0.1:{}", port);
                println!("Port file: {:?}", port_file);
                
                loop {
                    if let Ok((stream, peer_addr)) = listener.accept().await {
                        // Only accept connections from localhost for security
                        if !peer_addr.ip().is_loopback() {
                            eprintln!("Rejected non-localhost connection from {}", peer_addr);
                            continue;
                        }
                        
                        let app_clone = app.clone();
                        tauri::async_runtime::spawn(async move {
                            handle_connection(stream, app_clone).await;
                        });
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to bind TCP socket: {}", e);
            }
        }
    });
}

/// Read the port from the port file (for use by CLI tools)
#[allow(dead_code)]
pub fn read_socket_port() -> Option<u16> {
    let port_file = get_port_file_path();
    std::fs::read_to_string(&port_file)
        .ok()
        .and_then(|s| s.trim().parse().ok())
}

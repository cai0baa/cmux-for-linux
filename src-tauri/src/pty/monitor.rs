use std::collections::HashMap;
use std::fs;
use std::process::Command;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use super::manager::SessionManager;

#[derive(Clone, serde::Serialize)]
pub struct PtyMetadata {
    pub session_id: String,
    pub cwd: String,
    pub git_branch: Option<String>,
    pub process_name: Option<String>,
}

pub fn start_monitor(app_handle: AppHandle, manager: Arc<SessionManager>) {
    thread::spawn(move || {
        let mut last_metadata: HashMap<String, PtyMetadata> = HashMap::new();

        loop {
            thread::sleep(Duration::from_secs(2));

            let pids = manager.iter_pids();

            for (session_id, pid_opt) in pids {
                if let Some(pid) = pid_opt {
                    #[cfg(target_os = "linux")]
                    let proc_path = format!("/proc/{pid}/cwd");

                    #[cfg(not(target_os = "linux"))]
                    let proc_path = String::new(); // Not implemented for non-linux yet

                    if let Ok(cwd_path) = fs::read_link(&proc_path) {
                        let cwd = cwd_path.to_string_lossy().to_string();

                        // Check if CWD changed to avoid spamming git commands
                        let needs_git_check = match last_metadata.get(&session_id) {
                            Some(meta) => meta.cwd != cwd,
                            None => true,
                        };

                        let git_branch = if needs_git_check {
                            // Run git rev-parse
                            if let Ok(output) = Command::new("git")
                                .args(["rev-parse", "--abbrev-ref", "HEAD"])
                                .current_dir(&cwd)
                                .output()
                            {
                                if output.status.success() {
                                    Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
                                } else {
                                    None
                                }
                            } else {
                                None
                            }
                        } else {
                            // Keep previous git branch
                            last_metadata
                                .get(&session_id)
                                .and_then(|m| m.git_branch.clone())
                        };

                        // Capture foreground process name
                        #[cfg(target_os = "linux")]
                        let process_name = {
                            // Find child processes of the PTY shell
                            let children_path = format!("/proc/{pid}/task/{pid}/children");
                            if let Ok(children) = fs::read_to_string(&children_path) {
                                // Get the last child (foreground process)
                                children.split_whitespace().last()
                                    .and_then(|child_pid| {
                                        fs::read_to_string(format!("/proc/{child_pid}/comm")).ok()
                                    })
                                    .map(|name| name.trim().to_string())
                            } else {
                                // Fall back to the shell process itself
                                fs::read_to_string(format!("/proc/{pid}/comm"))
                                    .ok()
                                    .map(|name| name.trim().to_string())
                            }
                        };

                        #[cfg(not(target_os = "linux"))]
                        let process_name: Option<String> = None;

                        let metadata = PtyMetadata {
                            session_id: session_id.clone(),
                            cwd: cwd.clone(),
                            git_branch: git_branch.clone(),
                            process_name: process_name.clone(),
                        };

                        let changed = match last_metadata.get(&session_id) {
                            Some(old) => old.cwd != cwd || old.git_branch != git_branch || old.process_name != process_name,
                            None => true,
                        };

                        if changed {
                            last_metadata.insert(session_id.clone(), metadata.clone());
                            let _ = app_handle.emit("pty_metadata", metadata);
                        }
                    }
                }
            }

            // Cleanup dead sessions
            let active_keys: std::collections::HashSet<String> =
                manager.iter_pids().into_iter().map(|(k, _)| k).collect();
            last_metadata.retain(|k, _| active_keys.contains(k));
        }
    });
}

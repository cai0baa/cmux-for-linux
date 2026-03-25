use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::sync::Mutex;
use std::thread;
use std::time::Instant;
use tauri::ipc::Channel;
use tauri::{AppHandle, Emitter};

use crate::events;

pub struct PtySession {
    child: Mutex<Box<dyn Child + Send + Sync>>,
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
}

// Safety: All fields are behind Mutex, access is serialized.
unsafe impl Sync for PtySession {}

impl PtySession {
    pub fn spawn(
        session_id: String,
        command: &str,
        args: &[String],
        cols: u16,
        rows: u16,
        data_channel: Channel<Vec<u8>>,
        app_handle: AppHandle,
        cwd: Option<String>,
    ) -> Result<Self, String> {
        let pty_system = native_pty_system();

        let size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let pair = pty_system
            .openpty(size)
            .map_err(|e| format!("Failed to open PTY: {e}"))?;

        let mut cmd = {
            #[cfg(target_os = "windows")]
            {
                let mut cmd = CommandBuilder::new("powershell");
                if !command.is_empty() {
                    cmd.arg("-NoProfile");
                    cmd.arg("-Command");
                    cmd.arg(command);
                }
                cmd
            }

            #[cfg(not(target_os = "windows"))]
            {
                if command.is_empty() { CommandBuilder::new("/bin/bash") }
                else { CommandBuilder::new(command) }
            }
        };

        cmd.args(args);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("TERM_PROGRAM", "ptrterminal");
        cmd.env("TERM_PROGRAM_VERSION", env!("CARGO_PKG_VERSION"));

        if let Some(dir) = cwd {
            cmd.cwd(dir);
        }

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn command: {e}"))?;

        // Drop slave — we only need master
        drop(pair.slave);

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get PTY writer: {e}"))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to get PTY reader: {e}"))?;

        // Spawn reader thread — blocking I/O, not tokio
        let sid = session_id.clone();
        let handle = app_handle.clone();
        thread::spawn(move || {
            let mut buf = [0u8; 4096]; // 4KB — matches OS page size
            loop {
                let read_start = Instant::now();
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let read_micros = read_start.elapsed().as_micros();

                        let send_start = Instant::now();
                        // Send raw bytes through Channel — arrives as ArrayBuffer in JS
                        let _ = data_channel.send(buf[..n].to_vec());
                        let send_micros = send_start.elapsed().as_micros();

                        // Log every 100th read to avoid spam
                        if read_micros > 1000 || send_micros > 1000 {
                            println!(
                                "[PERF] PTY read: {}μs, channel send: {}μs, bytes: {}",
                                read_micros, send_micros, n
                            );
                        }
                    }
                    Err(_) => break,
                }
            }
            let exit_event = events::pty_exit_event(&sid);
            let _ = handle.emit(&exit_event, ());
        });

        Ok(Self {
            child: Mutex::new(child),
            master: Mutex::new(pair.master),
            writer: Mutex::new(writer),
        })
    }

    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        let start = Instant::now();
        let mut writer = self
            .writer
            .lock()
            .map_err(|e| format!("Lock failed: {e}"))?;

        let lock_micros = start.elapsed().as_micros();
        let write_start = Instant::now();

        writer
            .write_all(data)
            .map_err(|e| format!("Write failed: {e}"))?;
        writer.flush().map_err(|e| format!("Flush failed: {e}"))?;

        let write_micros = write_start.elapsed().as_micros();
        let total_micros = start.elapsed().as_micros();

        // Log slow writes (>1ms total)
        if total_micros > 1000 {
            println!(
                "[PERF] PTY write: lock={}μs, write+flush={}μs, total={}μs, bytes={}",
                lock_micros,
                write_micros,
                total_micros,
                data.len()
            );
        }

        Ok(())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        let master = self
            .master
            .lock()
            .map_err(|e| format!("Lock failed: {e}"))?;
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Resize failed: {e}"))
    }

    pub fn kill(&self) -> Result<(), String> {
        let mut child = self.child.lock().map_err(|e| format!("Lock failed: {e}"))?;
        child.kill().map_err(|e| format!("Kill failed: {e}"))
    }

    pub fn process_id(&self) -> Option<u32> {
        if let Ok(child) = self.child.lock() {
            child.process_id()
        } else {
            None
        }
    }
}

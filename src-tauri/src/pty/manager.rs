use dashmap::DashMap;
use tauri::ipc::Channel;
use tauri::AppHandle;

use super::session::PtySession;

pub struct SessionManager {
    sessions: DashMap<String, PtySession>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: DashMap::new(),
        }
    }

    pub fn create(
        &self,
        session_id: String,
        command: &str,
        args: &[String],
        cols: u16,
        rows: u16,
        data_channel: Channel<Vec<u8>>,
        app_handle: AppHandle,
        cwd: Option<String>,
    ) -> Result<(), String> {
        let session = PtySession::spawn(
            session_id.clone(),
            command,
            args,
            cols,
            rows,
            data_channel,
            app_handle,
            cwd,
        )?;
        self.sessions.insert(session_id, session);
        Ok(())
    }

    pub fn write(&self, session_id: &str, data: &[u8]) -> Result<(), String> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| format!("Session not found: {session_id}"))?;
        session.write(data)
    }

    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| format!("Session not found: {session_id}"))?;
        session.resize(cols, rows)
    }

    pub fn kill(&self, session_id: &str) -> Result<(), String> {
        if let Some((_, session)) = self.sessions.remove(session_id) {
            session.kill()?;
        }
        Ok(())
    }

    pub fn kill_all_for_workspace(&self, workspace_id: &str) {
        let prefix = format!("{workspace_id}-");
        let keys: Vec<String> = self
            .sessions
            .iter()
            .filter(|entry| entry.key().starts_with(&prefix))
            .map(|entry| entry.key().clone())
            .collect();

        for key in keys {
            if let Some((_, session)) = self.sessions.remove(&key) {
                let _ = session.kill();
            }
        }
    }

    pub fn iter_pids(&self) -> Vec<(String, Option<u32>)> {
        self.sessions
            .iter()
            .map(|entry| (entry.key().clone(), entry.value().process_id()))
            .collect()
    }
}

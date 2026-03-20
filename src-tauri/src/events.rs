/// Event emitted when a PTY process exits.
/// Format: "pty-exit-{session_id}"
pub fn pty_exit_event(session_id: &str) -> String {
    format!("pty-exit-{session_id}")
}

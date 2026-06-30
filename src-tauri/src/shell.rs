/// Returns the default shell used for new terminal sessions.
///
/// On Unix-like systems, prefer `$SHELL` when it is set to a usable value.
/// If `$SHELL` is missing, empty, or points at a non-existent absolute path
/// such as `/bin/bash` on NixOS, fall back to `bash` and let `PATH` resolve it.
#[cfg(not(target_os = "windows"))]
pub fn default_shell() -> String {
    default_shell_from_env(std::env::var("SHELL").ok())
}

#[cfg(not(target_os = "windows"))]
fn default_shell_from_env(shell: Option<String>) -> String {
    let Some(shell) = shell
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
    else {
        return "bash".to_string();
    };

    let path = std::path::Path::new(&shell);
    if path.is_absolute() && !path.exists() {
        return "bash".to_string();
    }

    shell
}

#[cfg(target_os = "windows")]
pub fn default_shell() -> String {
    "powershell".to_string()
}

#[cfg(test)]
#[cfg(not(target_os = "windows"))]
mod tests {
    use super::default_shell_from_env;

    #[test]
    fn falls_back_to_path_lookup_when_shell_is_missing() {
        assert_eq!(default_shell_from_env(None), "bash");
    }

    #[test]
    fn falls_back_to_path_lookup_when_shell_is_empty() {
        assert_eq!(default_shell_from_env(Some("  ".to_string())), "bash");
    }

    #[test]
    fn falls_back_to_path_lookup_when_absolute_shell_does_not_exist() {
        assert_eq!(
            default_shell_from_env(Some("/definitely/not/a/shell".to_string())),
            "bash"
        );
    }

    #[test]
    fn keeps_non_absolute_shell_for_path_lookup() {
        assert_eq!(default_shell_from_env(Some("zsh".to_string())), "zsh");
    }
}

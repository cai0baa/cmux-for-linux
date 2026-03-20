use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaneConfig {
    pub agent_id: String,
    pub label: Option<String>,
    pub cwd: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub id: String,
    pub name: String,
    pub grid_template_id: String,
    pub panes: Vec<PaneConfig>,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub font_size: u16,
    pub theme_id: String,
    #[serde(default)]
    pub keybindings: HashMap<String, String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            font_size: 14,
            theme_id: "catppuccin-mocha".to_string(),
            keybindings: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistentData {
    pub workspaces: Vec<WorkspaceConfig>,
    pub settings: AppSettings,
}

impl Default for PersistentData {
    fn default() -> Self {
        Self {
            workspaces: Vec::new(),
            settings: AppSettings::default(),
        }
    }
}

fn data_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {e}"))?;
    Ok(dir.join("data.json"))
}

pub fn load(app_handle: &tauri::AppHandle) -> Result<PersistentData, String> {
    let path = data_path(app_handle)?;
    if !path.exists() {
        return Ok(PersistentData::default());
    }
    let contents =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read data file: {e}"))?;
    serde_json::from_str(&contents).map_err(|e| format!("Failed to parse data file: {e}"))
}

pub fn save(app_handle: &tauri::AppHandle, data: &PersistentData) -> Result<(), String> {
    let path = data_path(app_handle)?;
    let json =
        serde_json::to_string_pretty(data).map_err(|e| format!("Failed to serialize data: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write data file: {e}"))
}

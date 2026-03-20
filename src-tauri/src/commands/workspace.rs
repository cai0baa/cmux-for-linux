use tauri::AppHandle;

use crate::db::storage::{self, AppSettings, PersistentData, WorkspaceConfig};

#[tauri::command]
pub fn load_persistent_data(app_handle: AppHandle) -> Result<PersistentData, String> {
    storage::load(&app_handle)
}

#[tauri::command]
pub fn save_workspaces(
    app_handle: AppHandle,
    workspaces: Vec<WorkspaceConfig>,
) -> Result<(), String> {
    let mut data = storage::load(&app_handle).unwrap_or_default();
    data.workspaces = workspaces;
    storage::save(&app_handle, &data)
}

#[tauri::command]
pub fn save_settings(app_handle: AppHandle, settings: AppSettings) -> Result<(), String> {
    let mut data = storage::load(&app_handle).unwrap_or_default();
    data.settings = settings;
    storage::save(&app_handle, &data)
}

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // The DMABUF workaround disables hardware acceleration WebGL, making the terminal slow.
    // Instead of disabling DMABUF, we disable NVIDIA explicit sync to fix the Wayland crash
    // while keeping hardware-accelerated WebGL at 60+ FPS.
    #[cfg(target_os = "linux")]
    std::env::set_var("__NV_DISABLE_EXPLICIT_SYNC", "1");

    ptrterminal_lib::run()
}

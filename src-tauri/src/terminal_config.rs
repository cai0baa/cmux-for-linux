/// Reads the user's terminal configuration (font, colors) so PTRTerminal
/// can match the look of their native terminal.
///
/// Detection order: ghostty → alacritty → kitty → system defaults.
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct TerminalUserConfig {
    pub font_family: String,
    pub font_size: f32,
    pub colors: UserColors,
}

#[derive(Debug, Clone)]
pub struct UserColors {
    pub background: [u8; 3],
    pub foreground: [u8; 3],
    pub ansi: [[u8; 3]; 16],
}

impl Default for TerminalUserConfig {
    fn default() -> Self {
        Self {
            font_family: system_monospace_font(),
            font_size: 15.0,
            colors: UserColors::default(),
        }
    }
}

impl Default for UserColors {
    fn default() -> Self {
        // One Dark-ish defaults.
        Self {
            background: [0x1e, 0x22, 0x27],
            foreground: [0xab, 0xb2, 0xbf],
            ansi: [
                [0x28, 0x2c, 0x34], // black
                [0xe0, 0x6c, 0x75], // red
                [0x98, 0xc3, 0x79], // green
                [0xe5, 0xc0, 0x7b], // yellow
                [0x61, 0xaf, 0xef], // blue
                [0xc6, 0x78, 0xdd], // magenta
                [0x56, 0xb6, 0xc2], // cyan
                [0xab, 0xb2, 0xbf], // white
                [0x5c, 0x63, 0x70], // bright black
                [0xe0, 0x6c, 0x75], // bright red
                [0x98, 0xc3, 0x79], // bright green
                [0xe5, 0xc0, 0x7b], // bright yellow
                [0x61, 0xaf, 0xef], // bright blue
                [0xc6, 0x78, 0xdd], // bright magenta
                [0x56, 0xb6, 0xc2], // bright cyan
                [0xff, 0xff, 0xff], // bright white
            ],
        }
    }
}

/// Get the user's home directory in a cross-platform way
fn get_home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| {
        // Fallback for edge cases
        #[cfg(windows)]
        {
            PathBuf::from(
                std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Default".to_string()),
            )
        }
        #[cfg(not(windows))]
        {
            PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| "/root".to_string()))
        }
    })
}

/// Get the config directory in a cross-platform way
/// - Linux/macOS: ~/.config
/// - Windows: %APPDATA% (e.g., C:\Users\<user>\AppData\Roaming)
fn get_config_dir() -> PathBuf {
    dirs::config_dir().unwrap_or_else(|| get_home_dir().join(".config"))
}

/// Detect and load the user's terminal config.
/// Merges: font/size from ghostty (if present), colors from the best available source.
pub fn load() -> TerminalUserConfig {
    let home = get_home_dir();
    let config_dir = get_config_dir();

    // Each loader returns Option<(font_family, font_size, Option<UserColors>)>
    let ghostty = load_ghostty(&home, &config_dir);
    let alacritty = load_alacritty(&home, &config_dir);
    let kitty = load_kitty(&config_dir);

    // Windows Terminal (Windows only)
    #[cfg(windows)]
    let windows_terminal = load_windows_terminal(&home);
    #[cfg(not(windows))]
    let windows_terminal: Option<(String, f32, Option<UserColors>)> = None;

    // Prefer ghostty for font settings, then alacritty, then kitty, then Windows Terminal
    let font_family = ghostty
        .as_ref()
        .map(|(f, _, _)| f.clone())
        .or_else(|| alacritty.as_ref().map(|(f, _, _)| f.clone()))
        .or_else(|| kitty.as_ref().map(|(f, _, _)| f.clone()))
        .or_else(|| windows_terminal.as_ref().map(|(f, _, _)| f.clone()))
        .unwrap_or_else(system_monospace_font);

    let font_size = ghostty
        .as_ref()
        .map(|(_, s, _)| *s)
        .or_else(|| alacritty.as_ref().map(|(_, s, _)| *s))
        .or_else(|| kitty.as_ref().map(|(_, s, _)| *s))
        .or_else(|| windows_terminal.as_ref().map(|(_, s, _)| *s))
        .unwrap_or(14.0);

    // For colors: prefer whichever source has explicit palette entries
    let colors = ghostty
        .and_then(|(_, _, c)| c)
        .or_else(|| alacritty.and_then(|(_, _, c)| c))
        .or_else(|| kitty.and_then(|(_, _, c)| c))
        .or_else(|| windows_terminal.and_then(|(_, _, c)| c))
        .unwrap_or_default();

    TerminalUserConfig {
        font_family,
        font_size,
        colors,
    }
}

// ─── Ghostty ──────────────────────────────────────────────────────────────────

fn load_ghostty(home: &PathBuf, config_dir: &PathBuf) -> Option<(String, f32, Option<UserColors>)> {
    // Ghostty config locations:
    // - Linux: ~/.config/ghostty/config
    // - macOS: ~/Library/Application Support/com.mitchellh.ghostty/config or ~/.config/ghostty/config
    // - Windows: %APPDATA%\ghostty\config (if it ever supports Windows)

    let possible_paths = [
        config_dir.join("ghostty/config"),
        #[cfg(target_os = "macos")]
        home.join("Library/Application Support/com.mitchellh.ghostty/config"),
    ];

    let content = possible_paths
        .iter()
        .find_map(|p| std::fs::read_to_string(p).ok())?;

    let mut font_family = system_monospace_font();
    let mut font_size = 14.0f32;
    let mut included_theme_content: Option<String> = None;

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        if let Some(val) = strip_key(line, "font-family") {
            font_family = val.trim_matches('"').to_string();
        }
        if let Some(val) = strip_key(line, "font-size") {
            if let Ok(n) = val.parse::<f32>() {
                font_size = n;
            }
        }
        // config-file includes (e.g. theme file).
        if let Some(val) = strip_key(line, "config-file") {
            let include_path = val.trim_matches('"').replace('~', &home.to_string_lossy());
            // Strip leading `?` (optional include marker).
            let include_path = include_path.trim_start_matches('?');
            if let Ok(extra) = std::fs::read_to_string(include_path) {
                included_theme_content = Some(extra);
            }
        }
    }

    // Parse colors from included theme file or main config — None if no explicit palette found.
    let color_source = included_theme_content.as_deref().unwrap_or(&content);
    let colors = parse_ghostty_colors(color_source);

    Some((font_family, font_size, colors))
}

fn parse_ghostty_colors(content: &str) -> Option<UserColors> {
    let mut colors = UserColors::default();
    let mut found_any = false;

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        // ghostty color format: `palette = N=#rrggbb` or `background = #rrggbb`
        if let Some(val) = strip_key(line, "background") {
            if let Some(rgb) = parse_hex_color(val) {
                colors.background = rgb;
                found_any = true;
            }
        }
        if let Some(val) = strip_key(line, "foreground") {
            if let Some(rgb) = parse_hex_color(val) {
                colors.foreground = rgb;
                found_any = true;
            }
        }
        if let Some(val) = strip_key(line, "palette") {
            // "N=#rrggbb"
            if let Some((idx_str, color_str)) = val.split_once('=') {
                if let (Ok(idx), Some(rgb)) = (
                    idx_str.trim().parse::<usize>(),
                    parse_hex_color(color_str.trim()),
                ) {
                    if idx < 16 {
                        colors.ansi[idx] = rgb;
                        found_any = true;
                    }
                }
            }
        }
    }

    if found_any {
        Some(colors)
    } else {
        None
    }
}

// ─── Alacritty ────────────────────────────────────────────────────────────────

fn load_alacritty(
    home: &PathBuf,
    config_dir: &PathBuf,
) -> Option<(String, f32, Option<UserColors>)> {
    // Alacritty config locations:
    // - Linux: ~/.config/alacritty/alacritty.toml
    // - macOS: ~/.config/alacritty/alacritty.toml or ~/Library/Application Support/alacritty/alacritty.toml
    // - Windows: %APPDATA%\alacritty\alacritty.toml

    // Check omarchy theme first (Linux-specific, it's the active one on this machine).
    #[cfg(target_os = "linux")]
    let omarchy_theme = Some(home.join(".config/omarchy/current/theme/alacritty.toml"));
    #[cfg(not(target_os = "linux"))]
    let omarchy_theme: Option<PathBuf> = None;

    let main_config_paths = [
        config_dir.join("alacritty/alacritty.toml"),
        #[cfg(target_os = "macos")]
        home.join("Library/Application Support/alacritty/alacritty.toml"),
    ];

    let theme_content = omarchy_theme.and_then(|p| std::fs::read_to_string(&p).ok());
    let main_content = main_config_paths
        .iter()
        .find_map(|p| std::fs::read_to_string(p).ok());

    // Need at least one of the two files
    if theme_content.is_none() && main_content.is_none() {
        return None;
    }

    let mut font_family = system_monospace_font();
    let mut font_size = 14.0f32;

    // Parse font from main config.
    if let Some(ref mc) = main_content {
        let mut in_font_normal = false;
        for line in mc.lines() {
            let line = line.trim();
            if line == "[font.normal]" {
                in_font_normal = true;
                continue;
            }
            if line.starts_with('[') {
                in_font_normal = false;
            }
            if in_font_normal {
                if let Some(val) = strip_key(line, "family") {
                    font_family = val.trim_matches('"').to_string();
                }
            }
            if let Some(val) = strip_key(line, "size") {
                if let Ok(n) = val.parse::<f32>() {
                    font_size = n;
                }
            }
        }
    }

    // Parse colors: prefer omarchy theme file, fall back to main config
    let color_source = theme_content
        .as_deref()
        .or_else(|| main_content.as_deref())
        .unwrap();
    let colors = parse_alacritty_colors(color_source);

    Some((font_family, font_size, colors))
}

fn parse_alacritty_colors(content: &str) -> Option<UserColors> {
    let mut colors = UserColors::default();
    let mut found_any = false;

    // State machine for TOML sections.
    let mut section = String::new();

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        if line.starts_with('[') {
            section = line.trim_matches(|c| c == '[' || c == ']').to_string();
            continue;
        }

        let (bg, fg) = (
            parse_color_line(line, "background"),
            parse_color_line(line, "foreground"),
        );

        match section.as_str() {
            "colors.primary" => {
                if let Some(rgb) = bg {
                    colors.background = rgb;
                    found_any = true;
                }
                if let Some(rgb) = fg {
                    colors.foreground = rgb;
                    found_any = true;
                }
            }
            "colors.normal" => {
                set_ansi(&mut colors.ansi, 0..8, line, &mut found_any);
            }
            "colors.bright" => {
                set_ansi(&mut colors.ansi, 8..16, line, &mut found_any);
            }
            _ => {}
        }
    }

    if found_any {
        Some(colors)
    } else {
        None
    }
}

fn set_ansi(ansi: &mut [[u8; 3]; 16], range: std::ops::Range<usize>, line: &str, found: &mut bool) {
    let names = [
        "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
    ];
    for (i, name) in names.iter().enumerate() {
        if let Some(rgb) = parse_color_line(line, name) {
            ansi[range.start + i] = rgb;
            *found = true;
        }
    }
}

// ─── Kitty ────────────────────────────────────────────────────────────────────

fn load_kitty(config_dir: &PathBuf) -> Option<(String, f32, Option<UserColors>)> {
    // Kitty config location: ~/.config/kitty/kitty.conf (same on Linux/macOS)
    let config_path = config_dir.join("kitty/kitty.conf");
    let content = std::fs::read_to_string(&config_path).ok()?;

    let mut font_family = system_monospace_font();
    let mut font_size = 14.0f32;
    let mut colors = UserColors::default();
    let mut found_any = false;

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        if let Some(val) = strip_key(line, "font_family") {
            font_family = val.to_string();
        }
        if let Some(val) = strip_key(line, "font_size") {
            if let Ok(n) = val.parse::<f32>() {
                font_size = n;
            }
        }
        if let Some(val) = strip_key(line, "background") {
            if let Some(rgb) = parse_hex_color(val) {
                colors.background = rgb;
                found_any = true;
            }
        }
        if let Some(val) = strip_key(line, "foreground") {
            if let Some(rgb) = parse_hex_color(val) {
                colors.foreground = rgb;
                found_any = true;
            }
        }
        // kitty: color0 … color15
        for i in 0..16usize {
            let key = format!("color{i}");
            if let Some(val) = strip_key(line, &key) {
                if let Some(rgb) = parse_hex_color(val) {
                    colors.ansi[i] = rgb;
                    found_any = true;
                }
            }
        }
    }

    Some((
        font_family,
        font_size,
        if found_any { Some(colors) } else { None },
    ))
}

// ─── Windows Terminal ─────────────────────────────────────────────────────────

#[cfg(windows)]
fn load_windows_terminal(home: &PathBuf) -> Option<(String, f32, Option<UserColors>)> {
    // Windows Terminal settings location:
    // %LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json
    // or for Windows Terminal Preview:
    // %LOCALAPPDATA%\Packages\Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe\LocalState\settings.json

    let local_app_data = std::env::var("LOCALAPPDATA").ok()?;
    let local_app_data = PathBuf::from(local_app_data);

    let settings_paths = [
        local_app_data
            .join("Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json"),
        local_app_data.join(
            "Packages/Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe/LocalState/settings.json",
        ),
    ];

    let content = settings_paths
        .iter()
        .find_map(|p| std::fs::read_to_string(p).ok())?;

    // Parse JSON settings
    let settings: serde_json::Value = serde_json::from_str(&content).ok()?;

    let mut font_family = system_monospace_font();
    let mut font_size = 14.0f32;

    // Get default profile settings
    if let Some(profiles) = settings.get("profiles") {
        if let Some(defaults) = profiles.get("defaults") {
            if let Some(face) = defaults
                .get("font")
                .and_then(|f| f.get("face"))
                .and_then(|f| f.as_str())
            {
                font_family = face.to_string();
            }
            if let Some(size) = defaults
                .get("font")
                .and_then(|f| f.get("size"))
                .and_then(|s| s.as_f64())
            {
                font_size = size as f32;
            }
            // Legacy font settings
            if let Some(face) = defaults.get("fontFace").and_then(|f| f.as_str()) {
                font_family = face.to_string();
            }
            if let Some(size) = defaults.get("fontSize").and_then(|s| s.as_f64()) {
                font_size = size as f32;
            }
        }
    }

    // Parse color scheme
    let colors = parse_windows_terminal_colors(&settings);

    Some((font_family, font_size, colors))
}

#[cfg(windows)]
fn parse_windows_terminal_colors(settings: &serde_json::Value) -> Option<UserColors> {
    // Find the active color scheme name
    let scheme_name = settings
        .get("profiles")
        .and_then(|p| p.get("defaults"))
        .and_then(|d| d.get("colorScheme"))
        .and_then(|s| s.as_str())
        .unwrap_or("Campbell");

    // Find the scheme in the schemes array
    let schemes = settings.get("schemes")?.as_array()?;
    let scheme = schemes
        .iter()
        .find(|s| s.get("name").and_then(|n| n.as_str()) == Some(scheme_name))?;

    let mut colors = UserColors::default();
    let mut found_any = false;

    if let Some(bg) = scheme
        .get("background")
        .and_then(|v| v.as_str())
        .and_then(parse_hex_color)
    {
        colors.background = bg;
        found_any = true;
    }
    if let Some(fg) = scheme
        .get("foreground")
        .and_then(|v| v.as_str())
        .and_then(parse_hex_color)
    {
        colors.foreground = fg;
        found_any = true;
    }

    // ANSI colors mapping
    let color_keys = [
        "black",
        "red",
        "green",
        "yellow",
        "blue",
        "purple",
        "cyan",
        "white",
        "brightBlack",
        "brightRed",
        "brightGreen",
        "brightYellow",
        "brightBlue",
        "brightPurple",
        "brightCyan",
        "brightWhite",
    ];

    for (i, key) in color_keys.iter().enumerate() {
        if let Some(rgb) = scheme
            .get(*key)
            .and_then(|v| v.as_str())
            .and_then(parse_hex_color)
        {
            colors.ansi[i] = rgb;
            found_any = true;
        }
    }

    if found_any {
        Some(colors)
    } else {
        None
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn strip_key<'a>(line: &'a str, key: &str) -> Option<&'a str> {
    let line = line.trim();
    // Support both `key = value` and `key=value`.
    let rest = if line.starts_with(key) {
        let rest = line[key.len()..].trim_start();
        rest.strip_prefix('=')?
    } else {
        return None;
    };
    Some(rest.trim())
}

fn parse_color_line(line: &str, key: &str) -> Option<[u8; 3]> {
    let val = strip_key(line, key)?;
    parse_hex_color(val)
}

fn parse_hex_color(s: &str) -> Option<[u8; 3]> {
    let s = s.trim().trim_matches('"').trim_start_matches('#');
    if s.len() == 6 {
        let r = u8::from_str_radix(&s[0..2], 16).ok()?;
        let g = u8::from_str_radix(&s[2..4], 16).ok()?;
        let b = u8::from_str_radix(&s[4..6], 16).ok()?;
        Some([r, g, b])
    } else {
        None
    }
}

/// Get the system monospace font in a cross-platform way
fn system_monospace_font() -> String {
    #[cfg(target_os = "linux")]
    {
        // Try fc-match (fontconfig) on Linux
        if let Ok(out) = std::process::Command::new("fc-match")
            .args(["monospace", "--format=%{family}"])
            .output()
        {
            let name = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !name.is_empty() {
                return name;
            }
        }
        "monospace".to_string()
    }

    #[cfg(target_os = "macos")]
    {
        // macOS default monospace font
        "Menlo".to_string()
    }

    #[cfg(target_os = "windows")]
    {
        // Windows default monospace font (Cascadia Mono is modern, Consolas is fallback)
        "Cascadia Mono".to_string()
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        "monospace".to_string()
    }
}

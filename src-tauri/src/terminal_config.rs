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

/// Detect and load the user's terminal config.
/// Merges: font/size from ghostty (if present), colors from the best available source.
pub fn load() -> TerminalUserConfig {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/root".to_string());
    let home = PathBuf::from(home);

    // Each loader returns Option<(font_family, font_size, Option<UserColors>)>
    let ghostty = load_ghostty(&home);
    let alacritty = load_alacritty(&home);
    let kitty = load_kitty(&home);

    // Prefer ghostty for font settings, then alacritty, then kitty
    let font_family = ghostty
        .as_ref()
        .map(|(f, _, _)| f.clone())
        .or_else(|| alacritty.as_ref().map(|(f, _, _)| f.clone()))
        .or_else(|| kitty.as_ref().map(|(f, _, _)| f.clone()))
        .unwrap_or_else(system_monospace_font);

    let font_size = ghostty
        .as_ref()
        .map(|(_, s, _)| *s)
        .or_else(|| alacritty.as_ref().map(|(_, s, _)| *s))
        .or_else(|| kitty.as_ref().map(|(_, s, _)| *s))
        .unwrap_or(14.0);

    // For colors: prefer whichever source has explicit palette entries
    let colors = ghostty
        .and_then(|(_, _, c)| c)
        .or_else(|| alacritty.and_then(|(_, _, c)| c))
        .or_else(|| kitty.and_then(|(_, _, c)| c))
        .unwrap_or_default();

    TerminalUserConfig {
        font_family,
        font_size,
        colors,
    }
}

// ─── Ghostty ──────────────────────────────────────────────────────────────────

fn load_ghostty(home: &PathBuf) -> Option<(String, f32, Option<UserColors>)> {
    let config_path = home.join(".config/ghostty/config");
    let content = std::fs::read_to_string(&config_path).ok()?;

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

fn load_alacritty(home: &PathBuf) -> Option<(String, f32, Option<UserColors>)> {
    // Check omarchy theme first (it's the active one on this machine).
    let omarchy_theme = home.join(".config/omarchy/current/theme/alacritty.toml");
    let main_config = home.join(".config/alacritty/alacritty.toml");

    let theme_content = std::fs::read_to_string(&omarchy_theme).ok();
    // Main config is optional — if only theme exists, still proceed
    let main_content = std::fs::read_to_string(&main_config).ok();

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

fn load_kitty(home: &PathBuf) -> Option<(String, f32, Option<UserColors>)> {
    let config_path = home.join(".config/kitty/kitty.conf");
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

/// Ask fontconfig for the system monospace font name.
fn system_monospace_font() -> String {
    // Try fc-match first.
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

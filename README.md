# ptrcode

A cross-platform AI agent terminal workspace. Built with Tauri v2, React, and xterm.js. Inspired by [cmux](https://github.com/manaflow-ai/cmux) (macOS).

## Why I built this

My first idea was to just add Linux support for cmux directly, but after reading the PRs from their repo, I realized that if they really want to add support, they will eventually.

And that's where this project comes to life! I wanted to create something inspired by cmux that runs on Linux, macOS, and Windows. I know Linux has tmux which is actually great, however the UI/UX from cmux has me fallen in love.

This project is open source. I have plans and more features for the future — especially multi-agent coordination workflows.

ptrcode is built to bring a fast, keyboard-first terminal workspace experience to all platforms with a native desktop app feel. The goal is to make multi-pane, multi-workspace development smooth without forcing users into a browser-only workflow or heavy IDE.

## Project direction

- **Near term**: stable cross-platform releases with easy install paths
- **Product quality**: stronger polish in interaction, performance, and accessibility
- **Power features**: multi-agent swarm coordination (ptrcode's key differentiator)
- **Distribution**: broader packaging options after core release flow is stable

## Features

- **Workspaces**: Organize terminals into separate workspaces with quick switching
- **Flexible Pane Layouts**: Split panes horizontally and vertically with resizable dividers
- **Position-Based Navigation**: Navigate between panes using arrow keys based on actual screen position
- **Command Palette**: Quick access to all commands via fuzzy search
- **Customizable Keybindings**: Remap any shortcut to your preference
- **Persistent State**: Workspaces and layouts are saved across sessions
- **Cross-platform**: Linux, macOS, and Windows

## Installation

### Quick Install (Recommended)

Download artifacts from the latest release:

<https://github.com/cai0baa/ptrcode/releases/latest>

#### AppImage (Linux, works on most distros)

```bash
gh release download --repo cai0baa/ptrcode --pattern "*.AppImage"
chmod +x ./*.AppImage
./*.AppImage
```

#### Debian/Ubuntu (.deb)

```bash
gh release download --repo cai0baa/ptrcode --pattern "*.deb"
sudo apt install ./*.deb
```

#### macOS (.dmg)

```bash
gh release download --repo cai0baa/ptrcode --pattern "*.dmg"
```

Open the `.dmg` and drag ptrcode to Applications.

> **macOS Security Warning**: Because ptrcode is not yet notarized with Apple, macOS will show an "unverified developer" warning on first open. To bypass: right-click the app → **Open** → Open. Or from Terminal: `xattr -d com.apple.quarantine /Applications/ptrcode.app`

#### Windows (.zip portable or NSIS installer)

```bash
gh release download --repo cai0baa/ptrcode --pattern "*.zip"
```

Extract and run `ptrcode.exe`.

> **Windows Security Warning**: Because ptrcode is not yet code-signed with an Authenticode certificate, Windows SmartScreen will warn "Windows protected your PC". Click **More info** → **Run anyway** to proceed.

### Build from Source

#### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)
- System dependencies:

  ```bash
  # Debian/Ubuntu
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev

  # Fedora
  sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel

  # Arch
  sudo pacman -S webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg

  # macOS — install Xcode Command Line Tools
  xcode-select --install

  # Windows — install Visual Studio Build Tools with C++ workload
  ```

```bash
git clone https://github.com/cai0baa/ptrcode.git
cd ptrcode
npm install
npm run tauri dev       # development
npm run tauri build     # production build
```

## Keyboard Shortcuts

All shortcuts use Ctrl-based modifiers.

### Global

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+P` | Open command palette |
| `Ctrl+,` | Open keyboard shortcuts |

### Workspace

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+N` | New workspace |
| `Ctrl+Tab` | Next workspace |
| `Ctrl+Shift+Tab` | Previous workspace |
| `Ctrl+Shift+W` | Close workspace |
| `Ctrl+1` - `Ctrl+8` | Jump to workspace 1-8 |
| `Ctrl+9` | Jump to last workspace |

### Pane

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+D` | Split pane right |
| `Ctrl+Alt+Shift+D` | Split pane down |
| `Ctrl+Alt+W` | Close active pane |
| `Ctrl+Alt+Arrow` | Focus pane in direction |
| `Ctrl+Shift+Enter` | Toggle pane zoom |
| `Ctrl+Shift+H` | Flash focused pane |

### Terminal

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+F` | Find in terminal |

## Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Tauri v2 (Rust)
- **Terminal**: xterm.js with WebGL renderer
- **State Management**: Zustand with Immer
- **Layout**: Allotment (split panes)

## License

GPL v3 - See [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by [cmux](https://github.com/manaflow-ai/cmux) from ManaFlow
- Built with [Tauri](https://tauri.app/), [xterm.js](https://xtermjs.org/), and [React](https://react.dev/)

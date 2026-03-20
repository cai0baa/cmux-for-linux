# Build & Development

## Commands

| Command | What it does |
|---------|-------------|
| `npm run tauri dev` | Start Vite dev server + Tauri native window with hot reload |
| `npm run tauri build` | Production build: `tsc && vite build` then `cargo build --release` |
| `npm run dev` | Vite only (no Tauri window) — used by Tauri's `beforeDevCommand` |
| `npm run build` | `tsc && vite build` — used by Tauri's `beforeBuildCommand` |

## Vite Config (`vite.config.ts`)

```typescript
{
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || false,
    hmr: { protocol: "ws", host: TAURI_DEV_HOST, port: 1421 },
    watch: { ignored: ["**/src-tauri/**"] },
  },
}
```

- Port `1420` is fixed (Tauri expects it)
- HMR port `1421` for remote dev hosts
- `src-tauri/` is ignored by file watcher (Cargo handles Rust rebuilds)

## Tauri Config (`tauri.conf.json`)

```json
{
  "productName": "ptrterminal",
  "identifier": "com.ptrterminal.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420"
  },
  "app": {
    "windows": [{
      "title": "ptrterminal",
      "width": 1200,
      "height": 800,
      "decorations": false
    }],
    "security": { "csp": null }
  }
}
```

Key decisions:
- **`decorations: false`**: Custom title bar (TitleBar.tsx) replaces OS chrome
- **`csp: null`**: No Content Security Policy (allows iframe loading)
- **Default window**: 1200×800, resizable, not fullscreen

## Environment Variables

| Variable | Purpose | Set by |
|----------|---------|--------|
| `TAURI_DEV_HOST` | Remote dev host for HMR | User (optional) |
| `SHELL` | User's default shell (used in terminal config) | OS |
| `HOME` | Home directory for config detection | OS |
| `CARGO_PKG_VERSION` | Passed as `TERM_PROGRAM_VERSION` to PTY | Cargo build |

## Build Artifacts

```
dist/                    — Vite output (JS/CSS/HTML)
src-tauri/target/
  debug/ptrterminal      — Dev build binary
  release/ptrterminal    — Release binary
  release/bundle/        — Platform-specific bundles (.deb, .AppImage, etc.)
```

## Dev Workflow

1. `npm run tauri dev` — starts both Vite and Tauri
2. Frontend changes → Vite HMR (instant)
3. Rust changes → Cargo rebuilds, Tauri restarts native process
4. DevTools auto-open in debug builds (`#[cfg(debug_assertions)]`)

## Cargo Build Config

```toml
[lib]
name = "ptrterminal_lib"
crate-type = ["lib", "cdylib", "staticlib"]
```

- `cdylib` + `staticlib`: Required by Tauri for platform linking
- Build deps: `tauri-build = "2"`

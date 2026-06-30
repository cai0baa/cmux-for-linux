# Linux AppImage troubleshooting

## Blank white window on Wayland

On some Wayland Linux desktops, the AppImage can launch but show only a blank white window. In affected environments, stderr may include an EGL/WebKitGTK error similar to:

```text
Could not create default EGL display: EGL_BAD_PARAMETER. Aborting...
```

This appears to be related to the WebKitGTK/EGL stack bundled in the AppImage and may vary by distribution, graphics driver, and compositor.

### Things to try

First, try running the AppImage with common WebKitGTK rendering workarounds:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./CMux_0.1.3_amd64.AppImage
```

If that does not help, try forcing software rendering:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 \
WEBKIT_DISABLE_COMPOSITING_MODE=1 \
LIBGL_ALWAYS_SOFTWARE=1 \
./CMux_0.1.3_amd64.AppImage
```

On Wayland systems, it may also be worth trying X11/XWayland:

```bash
GDK_BACKEND=x11 \
WEBKIT_DISABLE_DMABUF_RENDERER=1 \
./CMux_0.1.3_amd64.AppImage
```

### Build from source as a workaround

If the AppImage still opens to a blank white window, building from source may work because it links against your system's WebKitGTK stack instead of the one bundled in the AppImage.

See the main README's "Build from Source" section for the required dependencies and commands.

### NixOS note

On NixOS, AppImages often need `appimage-run`:

```bash
nix run nixpkgs#appimage-run -- ./CMux_0.1.3_amd64.AppImage
```

If the AppImage still shows a blank window after using `appimage-run`, prefer building from source so the app uses WebKitGTK from Nixpkgs.

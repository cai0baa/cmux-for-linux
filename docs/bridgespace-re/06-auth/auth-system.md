# Authentication System — BridgeSpace

## Auth Type

**OAuth2** with device flow (most likely) or authorization code + PKCE flow.

Desktop apps typically use one of:
- **Device Authorization Grant** (no redirect, user visits URL and enters code)
- **Authorization Code + PKCE** (with deep link callback — likely for BridgeSpace given `deep-link` plugin)

Given `tauri-plugin-deep-link` is confirmed present, BridgeSpace uses the redirect flow:
1. App opens browser to `https://app.bridgemind.ai/oauth/authorize?...`
2. User logs in on the web
3. Browser redirects to `bridgespace://oauth/callback?code=...`
4. System routes the custom URL scheme back to the Tauri app
5. App exchanges code for tokens via `https://api.bridgemind.ai`

## Credential Storage

| Detail | Value |
|--------|-------|
| Encryption salt | `bridgespace-auth-salt` (found in all 3 platform binaries) |
| Storage | Encrypted at rest — likely OS keychain (macOS Keychain, Windows Credential Manager, Linux libsecret) |
| Token type | OAuth access + refresh tokens |

The salt being identical across platforms means the encryption scheme is platform-independent,
with the OS keychain providing the platform-specific secure storage layer.

## Device Fingerprinting

Binary string analysis revealed device fingerprinting is present. Used for:
- Associating sessions with specific machines
- Detecting account sharing violations
- Analytics / telemetry

Likely collects: OS version, hardware UUID, screen resolution, language settings.

## Backend Endpoints

| Endpoint | Purpose |
|----------|---------|
| `https://api.bridgemind.ai` | Token exchange, user profile, subscription status |
| `https://app.bridgemind.ai` | OAuth authorization page, account management UI |

## Deep Link Registration

- Custom URL scheme: `bridgespace://`
- Registered via `tauri-plugin-deep-link` at install time
- OAuth callback: `bridgespace://oauth/callback`
- Possibly also used for: sharing workspaces, opening files from external apps

## Single Instance Enforcement

`tauri-plugin-single-instance` is present — if you try to open a second BridgeSpace window,
the existing instance is brought to foreground. This is also important for deep link handling:
when the OS routes `bridgespace://` back to the app, the single-instance plugin ensures
the correct running instance receives the OAuth callback.

## Content Security Policy (Auth Perspective)

```
https://api.bridgemind.ai    ← allowed for API calls from WebView
https://app.bridgemind.ai    ← allowed for auth pages embedded in WebView
```
All other `https://` origins are blocked — the app cannot make arbitrary web requests
from the frontend.

## Implications for ptrcode

ptrcode is **open source** and will not have a commercial auth backend. However:
- If ptrcode ever adds cloud sync or team features, same OAuth2 + deep-link approach applies
- For local-only use: no auth needed (current ptrterminal model)
- For commercial version: replicate this exact flow with `tauri-plugin-deep-link` + custom backend

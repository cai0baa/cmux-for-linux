# Network Layer — BridgeSpace

## Rust HTTP Stack

All library versions confirmed from binary string extraction across all three platforms.

| Library | Version | Role |
|---------|---------|------|
| `hyper` | 1.8.1 | HTTP/1.1 server + client core |
| `reqwest` | 0.12 / 0.13 | High-level HTTP client (dual version present in binary) |
| `h2` | 0.4.13 | HTTP/2 support (used for `api.bridgemind.ai` connections) |
| `rustls` | (latest) | TLS implementation — no OpenSSL |
| `tokio` | 1.49.0 | Async runtime underpinning everything |

The dual `reqwest` versions (0.12 and 0.13) suggest a dependency tree where different
crates pulled different versions, and Cargo included both (common in large Rust projects).

## Local Coordination Service (Port 7242)

The most important network component for ptrcode replication.

### Binding

```
127.0.0.1:7242    ← bound to loopback only, not 0.0.0.0
```
Not accessible from outside the machine. The Tauri backend starts this service on app launch.

### HTTP REST API (inferred from binary patterns + UI behavior)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/agents` | List active agent sessions with status |
| `POST` | `/agents/:id/message` | Send message to specific agent (via bs-mail) |
| `GET` | `/tasks` | Current task queue |
| `POST` | `/tasks` | Add task to queue |
| `GET` | `/board` | Get SWARM_BOARD.md content |
| `PUT` | `/board` | Update SWARM_BOARD.md |
| `GET` | `/status` | Health check / service status |

### WebSocket

```
ws://127.0.0.1:7242/events
```

Real-time event stream. Events emitted:
- Agent status changes (`working → waiting → done`)
- New messages in agent inboxes
- Task queue updates
- Board content changes

The frontend subscribes to this WebSocket for the swarm dashboard live view.
The `bs-mail watch` command also subscribes to this for CLI real-time monitoring.

## External Network

| Endpoint | Protocol | Purpose |
|----------|----------|---------|
| `https://api.bridgemind.ai` | HTTPS (HTTP/2 via h2) | Auth token exchange, user profile, subscription check |
| `https://app.bridgemind.ai` | HTTPS | OAuth authorization page, account portal |

Connections to `api.bridgemind.ai` happen:
- On startup (subscription/license check)
- After OAuth callback (token exchange)
- Periodically for refresh token renewal

## TLS Implementation

BridgeSpace uses **rustls** instead of OpenSSL:
- No system OpenSSL dependency (avoids version conflicts on Linux)
- Statically linked TLS — consistent behavior across distros
- Same stack on all three platforms

## No WebSocket to External Services

Binary analysis found no external WebSocket endpoints — all WebSocket usage is the local
`127.0.0.1:7242` service. External API calls are standard HTTPS request/response.

## ptrcode Network Plan

For ptrcode's `ptrd` daemon (equivalent to port 7242 service):

```toml
# Cargo.toml additions
axum = "0.8"          # HTTP + WebSocket server (replaces raw hyper)
tokio = { version = "1", features = ["full"] }
tower = "0.5"         # Middleware for axum
serde_json = "1"      # JSON serialization for events
```

Axum is preferred over raw hyper for the local daemon because:
- Cleaner routing API
- Built-in WebSocket upgrade support
- Type-safe request/response handling
- Actively maintained with good Tauri community adoption

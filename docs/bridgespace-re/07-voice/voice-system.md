# Voice System — BridgeVoice

## Overview

BridgeVoice is a separate product in the BridgeSpace ecosystem, but it integrates directly
with BridgeSpace for voice-to-text input into terminal sessions.

## Technology

| Component | Details |
|-----------|---------|
| Engine | **Whisper.cpp** — C++ port of OpenAI's Whisper model |
| Model format | **ggml** — optimized binary format for local inference |
| Model variants | tiny, base, small, medium (standard Whisper.cpp sizes) |
| Runtime | Local, on-device — no cloud API, no internet required |
| Compute | CPU inference (ggml); GPU acceleration if available |

## Integration with BridgeSpace

**Inferred flow**:
1. User activates voice input (hotkey or button in BridgeSpace UI)
2. BridgeVoice captures microphone audio
3. Whisper.cpp transcribes speech to text
4. Transcribed text is injected into the active PTY session (typed as keyboard input)

This means voice works with any CLI tool — Claude Code, bash, Python REPL — because it
just types text into the terminal.

## Why Whisper.cpp

- **No API key required** — fully local, no cost per transcription
- **Privacy** — audio never leaves the machine
- **Offline capable** — works without internet
- **Fast enough** — ggml tiny/base models run in real-time on modern CPUs
- **Cross-platform** — whisper.cpp compiles on Linux, macOS, Windows

## ggml Model Variants

| Model | Size | Speed | Accuracy | Use case |
|-------|------|-------|----------|----------|
| tiny | ~75MB | Very fast | Acceptable | Quick commands |
| base | ~142MB | Fast | Good | General use |
| small | ~466MB | Moderate | Very good | Preferred |
| medium | ~1.5GB | Slow | Excellent | High accuracy |

BridgeSpace likely ships with tiny or base and offers model selection in settings.

## Ecosystem Context

BridgeVoice appears to be sold/distributed separately from BridgeSpace (different product page,
separate download). This suggests:
- BridgeSpace works without BridgeVoice installed
- BridgeVoice is either a plugin/extension or a companion app
- Integration is likely via a local IPC channel (possibly port 7242 service extension or
  a separate socket)

## ptrcode Equivalent

**`ptr-voice`** — future feature, not in initial scope.

Implementation path when ready:
1. Bundle whisper.cpp as a Rust crate (`whisper-rs`) or call the binary directly
2. Add a voice input button to the terminal tab bar
3. Capture audio via `cpal` (cross-platform audio crate)
4. Transcribe with whisper-rs
5. Inject text into active PTY session via existing `write_to_pty` command

Estimated effort: 2-3 days for basic implementation with a pre-downloaded ggml model.

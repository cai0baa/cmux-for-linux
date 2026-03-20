# Performance Baseline Report

**Date:** [To be filled]  
**System:** [OS, CPU, RAM]  
**Build:** Development / Release  

---

## Executive Summary

This document captures baseline performance metrics for ptrterminal before optimization work begins. All measurements will be compared against BridgeSpace (commercial Linux terminal using identical stack).

**Target Improvements:**
- 30-50% reduction in React re-renders
- 62% faster workspace switching (based on store splitting)
- Sub-5ms state update latency
- <16ms terminal render budget (60fps)

---

## 1. State Management Performance

### Workspace Store Operations

| Operation | Average (ms) | P95 (ms) | P99 (ms) | Notes |
|-----------|-------------|----------|----------|-------|
| `setActiveWorkspace` | | | | Measured via console |
| `createWorkspace` | | | | Measured via console |
| `addTabToPane` | | | | Measured via console |
| `setMetadata` | | | | Measured via console |
| `incrementNotification` | | | | Measured via console |

### Re-render Cascade Analysis

**Test Scenario:** Switch between 2 workspaces with 4 panes each

| Component | Render Count | Notes |
|-----------|--------------|-------|
| `WorkspaceView` | | Use React DevTools Profiler |
| `TerminalPane` | | Should be 0-1, not 4-8 |
| `TabItem` | | Should be 0-1, not 16-32 |
| `XTermWrapper` | | Should NEVER re-render |

**Expected Issue:** Every workspace switch triggers full re-render of all components due to monolithic store.

---

## 2. Terminal Lifecycle Performance

### XTermWrapper Component

| Metric | Average (ms) | P95 (ms) | Notes |
|--------|-------------|----------|-------|
| Component mount | | | Time from mount to `init()` start |
| Terminal creation | | | Time from `new Terminal()` to `term.open()` |
| Session creation | | | Time for `createSession()` IPC + PTY spawn |
| Total mount-to-ready | | | End-to-end time until terminal is usable |
| Component unmount | | | Cleanup time |

**Measurement:** Check console for `[PERF] XTermWrapper` logs

---

## 3. PTY & IPC Performance

### Backend Metrics (Rust)

| Metric | Average (μs) | P95 (μs) | P99 (μs) | Notes |
|--------|-------------|----------|----------|-------|
| PTY read latency | | | | From `read_pty` to channel send |
| PTY write latency | | | | From IPC receive to `write_all` |
| Channel send time | | | | Tauri Channel overhead |
| Buffer copy time | | | | `Vec<u8>` allocation + copy |

**To be added:** Instrumentation in `src-tauri/src/pty/session.rs`

### Frontend IPC

| Operation | Average (ms) | Notes |
|-----------|-------------|-------|
| `createSession` call | | Round-trip to Rust + PTY spawn |
| `writeToSession` call | | Single keystroke latency |
| `resizeSession` call | | Window resize handling |

---

## 4. Browser Rendering Performance

### Chrome DevTools Timeline Analysis

**Test Scenario:** Run `cat large-file.txt` with 10,000 lines

| Metric | Value | Target | Notes |
|--------|-------|--------|-------|
| Frame time (average) | | <16ms | 60fps budget |
| Frame time (P99) | | <32ms | Allow occasional drops |
| Scripting time | | <8ms | JS execution |
| Rendering time | | <4ms | Layout + paint |
| Idle time per frame | | >4ms | Headroom for input |

### Memory Usage

| Metric | Value | Notes |
|--------|-------|-------|
| Heap size (4 panes) | | Check Chrome Task Manager |
| Heap size (16 panes) | | Stress test |
| xterm.js scrollback | | 5000 lines × 4 terminals |
| Zustand store size | | Check Redux DevTools |

---

## 5. React Component Profiling

### Profiler Session Results

**Test:** Create workspace → add 4 terminals → switch workspaces → close workspace

Record React DevTools Profiler flamegraph and note:
- Total render time
- Number of re-renders per component
- Slowest components
- Unnecessary re-renders (components that rendered with same props)

**Attach flamegraph screenshot here**

---

## 6. Comparison vs BridgeSpace

### Observed Differences

| Aspect | ptrterminal (baseline) | BridgeSpace | Gap |
|--------|----------------------|-------------|-----|
| Workspace switch feel | | Instant | |
| Terminal spawn time | | <100ms | |
| Input latency | | Imperceptible | |
| Memory usage | | Unknown | |

**Subjective Notes:**
- Does BridgeSpace feel snappier?
- Where specifically does ptrterminal lag?
- Any visible jank or frame drops?

---

## 7. Bottleneck Hypothesis

Based on measurements above, rank bottlenecks by impact:

1. **[Primary]** Zustand state re-render cascade
   - Evidence: [to be filled based on profiler]
   - Expected fix: Split stores → 50% render reduction
   
2. **[Secondary]** React component reconciliation
   - Evidence: [to be filled]
   - Expected fix: React.memo + selectors → 30% render reduction
   
3. **[Tertiary]** PTY/IPC latency
   - Evidence: [to be filled]
   - Expected fix: Buffer tuning → 10-20% I/O improvement

---

## 8. Action Items

After completing baseline measurements:

- [ ] Proceed to Phase 2: Split `workspaceStore.ts` into 4 focused stores
- [ ] Add React.memo to hot-path components
- [ ] Optimize PTY buffer sizes if latency >1ms
- [ ] Consider terminal pooling if spawn time >100ms

---

## Appendix: Measurement Commands

### Running the App
```bash
npm run tauri dev
```

### React DevTools Profiler
1. Open app in browser DevTools
2. Navigate to "Profiler" tab
3. Click "Record"
4. Perform test scenario
5. Click "Stop"
6. Export flamegraph

### Console Performance Logs
```bash
# Filter console for PERF markers
# In DevTools Console: Filter by "[PERF]"
```

### Chrome Timeline
1. DevTools → Performance tab
2. Record 6 seconds
3. Switch workspaces, type commands
4. Stop recording
5. Analyze frame timings

---

## Notes

- All measurements should be taken in **development mode first** (easier debugging)
- Once fixed, re-measure in **release mode** for production metrics
- Compare each phase's improvements against this baseline
- Document any unexpected findings or anomalies

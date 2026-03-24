# CalAI Project Notes

## Critical Architecture & Fixes

### 1. Grid Layout Stability (Day/Week Views)
- **Issue**: Grid calculations for `gridRow` were prone to `NaN` if event durations or start times were malformed.
- **Fix**: Implemented `Math.max(1, (val || 0))` wrappers for all grid position variables.
- **Persistence**: Any new view that uses CSS Grid for time-based layout should follow this pattern to prevent white-screen crashes on edge-case event data.

### 2. Sidebar Navigation Context
- **Issue**: `isArchiveMode` from context was "sticky" across view switches.
- **Fix**: Explicitly set `setIsArchiveMode(false)` when clicking the main `viewMode` buttons (Upcoming, Focus, etc.).

### 3. Cal Procedural Animation
- **System**: Uses `ProceduralAnimationController.js` for weighted gesture selection.
- **New Emotions**: Added `confused` (with `huh`, `what`, `puzzled` sub-gestures) and `sleepy`.
- **Mini-Cal**: The header character now uses the `happy` emotion by default for a more welcoming "Home" feel.

### 4. UI Polish
- **Upcoming Sidebar**: Event time and location are now visible by default (via `opacity: 0.6`) so users don't have to hover for basic context.
- **Open Chat**: The sparkles button now has a visible text label "Open Chat" for better accessibility/discoverability.

## Future Recommendations
- Consider normalizing event dates in `EventsContext.jsx` immediately upon fetch to ensure `new Date(event.start)` never fails.
- The `YearView` could benefit from a similar "expand on hover" detailed view if event density increases.

### 5. Jarvis-UI Phase (v2)
- **Holographic HUD**: `CalCharacter.css` now has `::before` and `::after` pseudo-elements creating rotating orbital rings with `hud-rotate` animation.
- **Scan-Line**: A `.hud-scan-line` div sweeps vertically across Cal's visor every 4s.
- **Data Pulse**: `.data-pulse` class activates on `thinking`/`scanning` emotions, intensifying the ring glow.
- **24-Hour Views**: `useHourScale` now uses `fitToViewport: false` + `minPixels: 60-64` to guarantee full day rendering.
- **Year Dual-Mode**: `YearView.jsx` now has a `viewMode` state (`'grid'` | `'graph'`) toggled via `LayoutGrid`/`GitBranch` icons.
- **Contribution Graph**: Git-style horizontal week-column layout with 7-row day grid, month labels, and shared intensity levels.

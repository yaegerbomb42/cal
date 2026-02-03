# Cal App Backlog & Sprint Plan

## Backlog (Epics → Stories)

- **Epic 1: Dark-only Glass Theme** [COMPLETED]
  - [x] Remove multi-theme switching; keep a single dark glass token set.
  - [x] Harmonize hover/active/focus states to avoid color inversion.
  - [x] Ensure legibility for quick duration chips and event cells.

- **Epic 2: Header + Input Bar Optimization** [COMPLETED]
  - [x] Reduce header height and reclaim vertical space.
  - [x] Move “Ask/Add with Cal” into the same row as view tabs.
  - [x] Add image input to the quick chat bar and update AI label to “Cal AI”.
  - [x] Show full date under the top title and avoid redundant day labeling.

- **Epic 3: Upcoming Events Pagination**
  - Render 5 events per page with accessible Prev/Next controls.
  - Avoid rendering all items for performance.

- **Epic 4: Edit Event 3-Panel Layout**
  - Show Details, Schedule, and Preferences side-by-side on desktop.
  - Fix start time defaults (no “0” times).
  - Improve quick duration legibility for dark theme.

- **Epic 5: View Overhaul (Day/Week/Month/Year)** [PARTIAL]
  - **Day:** Replace grid with list, dynamic sizing up to 30, hover focus expand.
  - **Week:** Align time ruler, compact events, improve overlap layout.
  - **Month:** [x] Show 2–3 event previews + “+X more”, include past events.
  - **Year:** [x] Toggle between Type color segments and Frequency heatmap.

- **Epic 6: Settings Improvements** [PARTIAL]
  - [x] Clean storage UI: labels, counts, last updated, clear + export.
  - Local model test chat: custom message, timestamps, live indicator.

- **Epic 7: View Tab Labeling**
  - Include formatted date + view name in each tab label.

## Sprint Breakdown

### Sprint 1 — Theme + Header Foundation

- Single dark glass theme tokens and background updates.
- Header height reduction, Cal AI label, date subtitle.
- Quick chat bar relocation + image input.

### Sprint 2 — Core Layouts + Pagination

- Upcoming events pagination (5/page).
- Event modal 3-panel layout + time default fix.
- Day view list + dynamic sizing.

### Sprint 3 — View Overhauls

- Week alignment + overlap layout.
- Month previews.
- Year dual-mode toggle.
- View tab labeling updates.

### Sprint 4 — Settings + Tests

- Storage UI improvements.
- Local model test chat enhancements.
- Unit/component/E2E-style checks and verification.

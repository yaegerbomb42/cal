---
name: events
description: "Skill for the Events area of cal. 11 symbols across 3 files."
---

# Events

11 symbols | 3 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how padTime, toLocalInputValue, ensureValidStartTime work
- Modifying events-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/Events/EventModal.jsx` | padTime, toLocalInputValue, ensureValidStartTime, EventModal, updateDateTime (+2) |
| `src/components/Events/ScheduleSuggestionPanel.jsx` | ScheduleSuggestionPanel, handleSelect |
| `src/components/Events/CustomRecurrenceEditor.jsx` | CustomRecurrenceEditor, toggleDay |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `padTime` | Function | `src/components/Events/EventModal.jsx` | 21 |
| `toLocalInputValue` | Function | `src/components/Events/EventModal.jsx` | 23 |
| `ensureValidStartTime` | Function | `src/components/Events/EventModal.jsx` | 29 |
| `EventModal` | Function | `src/components/Events/EventModal.jsx` | 95 |
| `updateDateTime` | Function | `src/components/Events/EventModal.jsx` | 196 |
| `handleChange` | Function | `src/components/Events/EventModal.jsx` | 236 |
| `handleDurationChange` | Function | `src/components/Events/EventModal.jsx` | 240 |
| `ScheduleSuggestionPanel` | Function | `src/components/Events/ScheduleSuggestionPanel.jsx` | 7 |
| `handleSelect` | Function | `src/components/Events/ScheduleSuggestionPanel.jsx` | 35 |
| `CustomRecurrenceEditor` | Function | `src/components/Events/CustomRecurrenceEditor.jsx` | 11 |
| `toggleDay` | Function | `src/components/Events/CustomRecurrenceEditor.jsx` | 36 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `EventModal → PadTime` | intra_community | 4 |
| `EventModal → EnsureValidStartTime` | intra_community | 3 |
| `EventModal → HandleChange` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "padTime"})` — see callers and callees
2. `gitnexus_query({query: "events"})` — find related execution flows
3. Read key files listed above for implementation details

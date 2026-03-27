---
name: toast
description: "Skill for the Toast area of cal. 7 symbols across 2 files."
---

# Toast

7 symbols | 2 files | Cohesion: 80%

## When to Use

- Working with code in `src/`
- Understanding how subscribe, notify, error work
- Modifying toast-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/utils/toast.js` | subscribe, notify, error, info, remove |
| `src/components/Toast/Toast.jsx` | Toast, getIcon |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `Toast` | Function | `src/components/Toast/Toast.jsx` | 6 |
| `getIcon` | Function | `src/components/Toast/Toast.jsx` | 15 |
| `subscribe` | Method | `src/utils/toast.js` | 7 |
| `notify` | Method | `src/utils/toast.js` | 14 |
| `error` | Method | `src/utils/toast.js` | 38 |
| `info` | Method | `src/utils/toast.js` | 46 |
| `remove` | Method | `src/utils/toast.js` | 50 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DayView → Now` | cross_community | 6 |
| `DayView → Remove` | cross_community | 6 |
| `DayView → Now` | cross_community | 6 |
| `DayView → Remove` | cross_community | 6 |
| `UpcomingSidebar → Now` | cross_community | 6 |
| `UpcomingSidebar → Remove` | cross_community | 6 |
| `EventsProvider → Now` | cross_community | 5 |
| `EventsProvider → Remove` | cross_community | 5 |
| `HandleSaveApiKey → Now` | cross_community | 5 |
| `HandleSaveApiKey → Remove` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Calendar | 1 calls |

## How to Explore

1. `gitnexus_context({name: "subscribe"})` — see callers and callees
2. `gitnexus_query({query: "toast"})` — find related execution flows
3. Read key files listed above for implementation details

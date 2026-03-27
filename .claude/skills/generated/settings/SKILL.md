---
name: settings
description: "Skill for the Settings area of cal. 36 symbols across 9 files."
---

# Settings

36 symbols | 9 files | Cohesion: 72%

## When to Use

- Working with code in `src/`
- Understanding how handleOnline, archiveEvent, unarchiveEvent work
- Modifying settings-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/Settings/Settings.jsx` | handleInitLocalBrain, handleSaveApiKey, handleImportSelectedEvents, handleExportData, handleExportICS (+12) |
| `src/contexts/EventsContext.jsx` | handleOnline, archiveEvent, unarchiveEvent, clearArchivedEvents, deleteEventsByFilter (+1) |
| `src/services/firebaseService.js` | deleteAccount, saveApiKey, saveUserData, getUserData |
| `src/components/Sidebar/UpcomingSidebar.jsx` | handleAutoPlan, handleFilterChange, handleBulkDelete |
| `src/components/Auth/Login.jsx` | handleSubmit, handleGoogleLogin |
| `src/utils/toast.js` | success |
| `src/services/googleCalendarService.js` | addEvent |
| `src/components/Calendar/WeekView.jsx` | handleEventClick |
| `src/services/localBrainService.js` | setPreferLocal |

## Entry Points

Start here when exploring this area:

- **`handleOnline`** (Function) — `src/contexts/EventsContext.jsx:181`
- **`archiveEvent`** (Function) — `src/contexts/EventsContext.jsx:307`
- **`unarchiveEvent`** (Function) — `src/contexts/EventsContext.jsx:323`
- **`clearArchivedEvents`** (Function) — `src/contexts/EventsContext.jsx:330`
- **`deleteEventsByFilter`** (Function) — `src/contexts/EventsContext.jsx:354`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `handleOnline` | Function | `src/contexts/EventsContext.jsx` | 181 |
| `archiveEvent` | Function | `src/contexts/EventsContext.jsx` | 307 |
| `unarchiveEvent` | Function | `src/contexts/EventsContext.jsx` | 323 |
| `clearArchivedEvents` | Function | `src/contexts/EventsContext.jsx` | 330 |
| `deleteEventsByFilter` | Function | `src/contexts/EventsContext.jsx` | 354 |
| `deleteEventsByName` | Function | `src/contexts/EventsContext.jsx` | 433 |
| `setPreferLocal` | Method | `src/services/localBrainService.js` | 121 |
| `handleAutoPlan` | Function | `src/components/Sidebar/UpcomingSidebar.jsx` | 238 |
| `handleInitLocalBrain` | Function | `src/components/Settings/Settings.jsx` | 234 |
| `handleSaveApiKey` | Function | `src/components/Settings/Settings.jsx` | 273 |
| `handleImportSelectedEvents` | Function | `src/components/Settings/Settings.jsx` | 430 |
| `handleExportData` | Function | `src/components/Settings/Settings.jsx` | 448 |
| `handleExportICS` | Function | `src/components/Settings/Settings.jsx` | 462 |
| `handleDeleteAccount` | Function | `src/components/Settings/Settings.jsx` | 471 |
| `handleSubmit` | Function | `src/components/Auth/Login.jsx` | 19 |
| `handleGoogleLogin` | Function | `src/components/Auth/Login.jsx` | 38 |
| `handleEventClick` | Function | `src/components/Calendar/WeekView.jsx` | 75 |
| `handleFilterChange` | Function | `src/components/Sidebar/UpcomingSidebar.jsx` | 141 |
| `handleBulkDelete` | Function | `src/components/Sidebar/UpcomingSidebar.jsx` | 285 |
| `savePriorityPrefs` | Function | `src/components/Settings/Settings.jsx` | 132 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `EventsProvider → Now` | cross_community | 5 |
| `EventsProvider → Remove` | cross_community | 5 |
| `HandleSaveApiKey → AIServiceError` | cross_community | 5 |
| `HandleSaveApiKey → Now` | cross_community | 5 |
| `HandleSaveApiKey → Remove` | cross_community | 5 |
| `HandleToggleGeneralPack → SaveReminders` | cross_community | 5 |
| `HandleToggleGeneralPack → Now` | cross_community | 5 |
| `HandleToggleGeneralPack → Remove` | cross_community | 5 |
| `HandleGoogleCalendarSync → Now` | cross_community | 4 |
| `HandleGoogleCalendarSync → Remove` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 4 calls |
| Calendar | 2 calls |
| Toast | 1 calls |

## How to Explore

1. `gitnexus_context({name: "handleOnline"})` — see callers and callees
2. `gitnexus_query({query: "settings"})` — find related execution flows
3. Read key files listed above for implementation details

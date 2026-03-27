---
name: sidebar
description: "Skill for the Sidebar area of cal. 8 symbols across 1 files."
---

# Sidebar

8 symbols | 1 files | Cohesion: 79%

## When to Use

- Working with code in `src/`
- Understanding how UpcomingSidebar, loadFilters, getTimeLabel work
- Modifying sidebar-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/Sidebar/UpcomingSidebar.jsx` | UpcomingSidebar, loadFilters, getTimeLabel, handleToggleComplete, handleDeleteClick (+3) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `UpcomingSidebar` | Function | `src/components/Sidebar/UpcomingSidebar.jsx` | 95 |
| `loadFilters` | Function | `src/components/Sidebar/UpcomingSidebar.jsx` | 130 |
| `getTimeLabel` | Function | `src/components/Sidebar/UpcomingSidebar.jsx` | 155 |
| `handleToggleComplete` | Function | `src/components/Sidebar/UpcomingSidebar.jsx` | 224 |
| `handleDeleteClick` | Function | `src/components/Sidebar/UpcomingSidebar.jsx` | 279 |
| `CustomMultiSelect` | Function | `src/components/Sidebar/UpcomingSidebar.jsx` | 13 |
| `toggleOption` | Function | `src/components/Sidebar/UpcomingSidebar.jsx` | 27 |
| `getDisplayLabel` | Function | `src/components/Sidebar/UpcomingSidebar.jsx` | 45 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `UpcomingSidebar → SendPhoneNotification` | cross_community | 8 |
| `UpcomingSidebar → SaveReminders` | cross_community | 7 |
| `UpcomingSidebar → Now` | cross_community | 6 |
| `UpcomingSidebar → Remove` | cross_community | 6 |
| `UpcomingSidebar → GetUserData` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Settings | 2 calls |
| Calendar | 2 calls |

## How to Explore

1. `gitnexus_context({name: "UpcomingSidebar"})` — see callers and callees
2. `gitnexus_query({query: "sidebar"})` — find related execution flows
3. Read key files listed above for implementation details

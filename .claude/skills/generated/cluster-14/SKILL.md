---
name: cluster-14
description: "Skill for the Cluster_14 area of cal. 4 symbols across 1 files."
---

# Cluster_14

4 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how buildAllDayEvent, getNthWeekdayOfMonth, getLastWeekdayOfMonth work
- Modifying cluster_14-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/utils/generalEvents.js` | buildAllDayEvent, getNthWeekdayOfMonth, getLastWeekdayOfMonth, buildHolidayEventsForYear |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `buildAllDayEvent` | Function | `src/utils/generalEvents.js` | 2 |
| `getNthWeekdayOfMonth` | Function | `src/utils/generalEvents.js` | 19 |
| `getLastWeekdayOfMonth` | Function | `src/utils/generalEvents.js` | 26 |
| `buildHolidayEventsForYear` | Function | `src/utils/generalEvents.js` | 32 |

## How to Explore

1. `gitnexus_context({name: "buildAllDayEvent"})` — see callers and callees
2. `gitnexus_query({query: "cluster_14"})` — find related execution flows
3. Read key files listed above for implementation details

---
name: cluster-1
description: "Skill for the Cluster_1 area of cal. 5 symbols across 1 files."
---

# Cluster_1

5 symbols | 1 files | Cohesion: 62%

## When to Use

- Understanding how buildEventSnippet, DayView, updateTime work
- Modifying cluster_1-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `before_dayview.jsx` | buildEventSnippet, DayView, updateTime, handleDragStart, handleDropOnCell |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `buildEventSnippet` | Function | `before_dayview.jsx` | 16 |
| `DayView` | Function | `before_dayview.jsx` | 31 |
| `updateTime` | Function | `before_dayview.jsx` | 49 |
| `handleDragStart` | Function | `before_dayview.jsx` | 55 |
| `handleDropOnCell` | Function | `before_dayview.jsx` | 66 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DayView → SendPhoneNotification` | cross_community | 8 |
| `DayView → SaveReminders` | cross_community | 7 |
| `DayView → Now` | cross_community | 6 |
| `DayView → Remove` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Calendar | 5 calls |

## How to Explore

1. `gitnexus_context({name: "buildEventSnippet"})` — see callers and callees
2. `gitnexus_query({query: "cluster_1"})` — find related execution flows
3. Read key files listed above for implementation details

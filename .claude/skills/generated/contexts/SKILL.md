---
name: contexts
description: "Skill for the Contexts area of cal. 4 symbols across 2 files."
---

# Contexts

4 symbols | 2 files | Cohesion: 86%

## When to Use

- Working with code in `src/`
- Understanding how searchEvents, filterEvents work
- Modifying contexts-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/contexts/EventsContext.jsx` | searchEvents, filterEvents |
| `src/components/Search/SearchBar.jsx` | SearchBar, handleResultClick |

## Entry Points

Start here when exploring this area:

- **`searchEvents`** (Function) — `src/contexts/EventsContext.jsx:377`
- **`filterEvents`** (Function) — `src/contexts/EventsContext.jsx:388`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `searchEvents` | Function | `src/contexts/EventsContext.jsx` | 377 |
| `filterEvents` | Function | `src/contexts/EventsContext.jsx` | 388 |
| `SearchBar` | Function | `src/components/Search/SearchBar.jsx` | 6 |
| `handleResultClick` | Function | `src/components/Search/SearchBar.jsx` | 22 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Calendar | 1 calls |

## How to Explore

1. `gitnexus_context({name: "searchEvents"})` — see callers and callees
2. `gitnexus_query({query: "contexts"})` — find related execution flows
3. Read key files listed above for implementation details

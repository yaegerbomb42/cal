---
name: pages
description: "Skill for the Pages area of cal. 4 symbols across 1 files."
---

# Pages

4 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how AdSlot, pushAd, handleLoad work
- Modifying pages-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/pages/PolicyLayout.jsx` | ensureAdsenseScript, AdSlot, pushAd, handleLoad |

## Entry Points

Start here when exploring this area:

- **`AdSlot`** (Function) — `src/pages/PolicyLayout.jsx:23`
- **`pushAd`** (Function) — `src/pages/PolicyLayout.jsx:29`
- **`handleLoad`** (Function) — `src/pages/PolicyLayout.jsx:46`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `AdSlot` | Function | `src/pages/PolicyLayout.jsx` | 23 |
| `pushAd` | Function | `src/pages/PolicyLayout.jsx` | 29 |
| `handleLoad` | Function | `src/pages/PolicyLayout.jsx` | 46 |
| `ensureAdsenseScript` | Function | `src/pages/PolicyLayout.jsx` | 10 |

## How to Explore

1. `gitnexus_context({name: "AdSlot"})` — see callers and callees
2. `gitnexus_query({query: "pages"})` — find related execution flows
3. Read key files listed above for implementation details

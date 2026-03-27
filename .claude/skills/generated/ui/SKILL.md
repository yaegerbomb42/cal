---
name: ui
description: "Skill for the UI area of cal. 4 symbols across 2 files."
---

# UI

4 symbols | 2 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how NavigationDropdown, handleSelect, AIChatInput work
- Modifying ui-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/UI/NavigationDropdown.jsx` | NavigationDropdown, handleSelect |
| `src/components/UI/AIChatInput.jsx` | AIChatInput, removeFile |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `NavigationDropdown` | Function | `src/components/UI/NavigationDropdown.jsx` | 5 |
| `handleSelect` | Function | `src/components/UI/NavigationDropdown.jsx` | 33 |
| `AIChatInput` | Function | `src/components/UI/AIChatInput.jsx` | 6 |
| `removeFile` | Function | `src/components/UI/AIChatInput.jsx` | 33 |

## How to Explore

1. `gitnexus_context({name: "NavigationDropdown"})` — see callers and callees
2. `gitnexus_query({query: "ui"})` — find related execution flows
3. Read key files listed above for implementation details

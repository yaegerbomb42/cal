---
name: tests
description: "Skill for the Tests area of cal. 3 symbols across 1 files."
---

# Tests

3 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `tests/`
- Understanding how withFrozenTime, readSource, run work
- Modifying tests-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `tests/runTests.js` | withFrozenTime, readSource, run |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `withFrozenTime` | Function | `tests/runTests.js` | 11 |
| `readSource` | Function | `tests/runTests.js` | 32 |
| `run` | Function | `tests/runTests.js` | 36 |

## How to Explore

1. `gitnexus_context({name: "withFrozenTime"})` — see callers and callees
2. `gitnexus_query({query: "tests"})` — find related execution flows
3. Read key files listed above for implementation details

---
name: cluster-20
description: "Skill for the Cluster_20 area of cal. 11 symbols across 1 files."
---

# Cluster_20

11 symbols | 1 files | Cohesion: 88%

## When to Use

- Working with code in `src/`
- Understanding how constructor, getDefaultState, selectWeightedGesture work
- Modifying cluster_20-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/utils/ProceduralAnimationController.js` | constructor, getDefaultState, selectWeightedGesture, selectGestureGroup, applyGesture (+6) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `animate` | Function | `src/utils/ProceduralAnimationController.js` | 303 |
| `constructor` | Method | `src/utils/ProceduralAnimationController.js` | 129 |
| `getDefaultState` | Method | `src/utils/ProceduralAnimationController.js` | 141 |
| `selectWeightedGesture` | Method | `src/utils/ProceduralAnimationController.js` | 157 |
| `selectGestureGroup` | Method | `src/utils/ProceduralAnimationController.js` | 180 |
| `applyGesture` | Method | `src/utils/ProceduralAnimationController.js` | 195 |
| `lerp` | Method | `src/utils/ProceduralAnimationController.js` | 247 |
| `updateState` | Method | `src/utils/ProceduralAnimationController.js` | 252 |
| `updateTalkingMouth` | Method | `src/utils/ProceduralAnimationController.js` | 272 |
| `setEmotion` | Method | `src/utils/ProceduralAnimationController.js` | 344 |
| `getParticleColor` | Method | `src/utils/ProceduralAnimationController.js` | 401 |

## Connected Areas

| Area | Connections |
|------|-------------|
| AI | 1 calls |
| Calendar | 1 calls |

## How to Explore

1. `gitnexus_context({name: "constructor"})` — see callers and callees
2. `gitnexus_query({query: "cluster_20"})` — find related execution flows
3. Read key files listed above for implementation details

---
name: ai-2
description: "Skill for the AI area of cal. 17 symbols across 6 files."
---

# AI

17 symbols | 6 files | Cohesion: 70%

## When to Use

- Working with code in `src/`
- Understanding how addEvent, closeEventModal work
- Modifying ai-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/utils/ProceduralAnimationController.js` | ProceduralAnimationController, startTalking, stopTalking, start, getRandomDelay (+2) |
| `src/components/AI/AIChat.jsx` | setStatus, handleConfirmEvent, handleConfirmImageEvent, handleConfirmAllImageEvents |
| `src/components/AI/CalCharacter.jsx` | CalCharacter, updateParticles |
| `src/components/Events/EventModal.jsx` | handleSubmit, handleDelete |
| `src/contexts/EventsContext.jsx` | addEvent |
| `src/contexts/CalendarContext.jsx` | closeEventModal |

## Entry Points

Start here when exploring this area:

- **`addEvent`** (Function) — `src/contexts/EventsContext.jsx:191`
- **`closeEventModal`** (Function) — `src/contexts/CalendarContext.jsx:53`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `addEvent` | Function | `src/contexts/EventsContext.jsx` | 191 |
| `closeEventModal` | Function | `src/contexts/CalendarContext.jsx` | 53 |
| `ProceduralAnimationController` | Class | `src/utils/ProceduralAnimationController.js` | 128 |
| `ContinuousParticleSystem` | Class | `src/utils/ProceduralAnimationController.js` | 380 |
| `CalCharacter` | Function | `src/components/AI/CalCharacter.jsx` | 14 |
| `updateParticles` | Function | `src/components/AI/CalCharacter.jsx` | 54 |
| `handleSubmit` | Function | `src/components/Events/EventModal.jsx` | 250 |
| `handleDelete` | Function | `src/components/Events/EventModal.jsx` | 273 |
| `setStatus` | Function | `src/components/AI/AIChat.jsx` | 114 |
| `handleConfirmEvent` | Function | `src/components/AI/AIChat.jsx` | 399 |
| `handleConfirmImageEvent` | Function | `src/components/AI/AIChat.jsx` | 417 |
| `handleConfirmAllImageEvents` | Function | `src/components/AI/AIChat.jsx` | 433 |
| `startTalking` | Method | `src/utils/ProceduralAnimationController.js` | 284 |
| `stopTalking` | Method | `src/utils/ProceduralAnimationController.js` | 290 |
| `start` | Method | `src/utils/ProceduralAnimationController.js` | 296 |
| `getRandomDelay` | Method | `src/utils/ProceduralAnimationController.js` | 333 |
| `getPositions` | Method | `src/utils/ProceduralAnimationController.js` | 407 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleSubmit → Now` | cross_community | 5 |
| `HandleSubmit → Remove` | cross_community | 5 |
| `HandleSubmit → SaveReminders` | cross_community | 5 |
| `HandleConfirmEvent → Now` | cross_community | 5 |
| `HandleConfirmEvent → Remove` | cross_community | 5 |
| `MainLayout → Now` | cross_community | 5 |
| `MainLayout → Remove` | cross_community | 5 |
| `CalCharacter → Now` | cross_community | 4 |
| `CalCharacter → GetRandomDelay` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 4 calls |
| Calendar | 3 calls |
| Settings | 1 calls |
| Cluster_20 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "addEvent"})` — see callers and callees
2. `gitnexus_query({query: "ai"})` — find related execution flows
3. Read key files listed above for implementation details

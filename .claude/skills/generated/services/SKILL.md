---
name: services
description: "Skill for the Services area of cal. 117 symbols across 25 files."
---

# Services

117 symbols | 25 files | Cohesion: 83%

## When to Use

- Working with code in `src/`
- Understanding how validateEventOrThrow, deleteEvent, deleteEventsByCategory work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/services/geminiService.js` | getPersonalitySystemPrompt, _generate, testConnection, parseEventFromText, parseEventsFromImages (+10) |
| `src/services/voiceAIService.js` | initWakeWord, startListening, stopListening, speak, speakAsCal (+9) |
| `src/services/firebaseService.js` | constructor, initialize, loginWithGoogle, loginWithEmail, signupWithEmail (+5) |
| `src/services/localBrainService.js` | getPreferLocal, getTemporalContext, getGroundingPrompt, getPersonalitySystemPrompt, chat (+3) |
| `src/services/reminderService.js` | constructor, loadReminders, saveReminders, scheduleReminder, cancelReminder (+3) |
| `src/services/memoryService.js` | getMemoryContext, saveMemory, addFact, setNamedLocation, clearMemory (+2) |
| `src/components/Settings/Settings.jsx` | testGeminiConnection, handleTestChatSubmit, loadApiKey, handleGoogleCalendarSync, handleUnloadBrain |
| `src/components/AI/AIChat.jsx` | AIChat, scrollToBottom, handleEditImageEvent, handleDiscardImageEvent, handleSubmit |
| `src/contexts/EventsContext.jsx` | deleteEvent, deleteEventsByCategory, EventsProvider, initializeData, syncGoogleEvents |
| `src/services/locationService.js` | resolveLocation, _resolveWithGemini, _isFullAddress, _generateMapsUrl, getMapLink |

## Entry Points

Start here when exploring this area:

- **`validateEventOrThrow`** (Function) — `src/utils/eventValidator.js:17`
- **`deleteEvent`** (Function) — `src/contexts/EventsContext.jsx:285`
- **`deleteEventsByCategory`** (Function) — `src/contexts/EventsContext.jsx:340`
- **`parseEventDraft`** (Function) — `src/services/aiEventService.js:78`
- **`AuthProvider`** (Function) — `src/contexts/AuthContext.jsx:4`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `CalError` | Class | `src/utils/errors.js` | 4 |
| `ValidationError` | Class | `src/utils/errors.js` | 16 |
| `AIServiceError` | Class | `src/utils/errors.js` | 29 |
| `AIParseError` | Class | `src/utils/errors.js` | 40 |
| `validateEventOrThrow` | Function | `src/utils/eventValidator.js` | 17 |
| `deleteEvent` | Function | `src/contexts/EventsContext.jsx` | 285 |
| `deleteEventsByCategory` | Function | `src/contexts/EventsContext.jsx` | 340 |
| `parseEventDraft` | Function | `src/services/aiEventService.js` | 78 |
| `AuthProvider` | Function | `src/contexts/AuthContext.jsx` | 4 |
| `parseJsonResponse` | Function | `src/services/localBrainService.js` | 236 |
| `EventsProvider` | Function | `src/contexts/EventsContext.jsx` | 63 |
| `initializeData` | Function | `src/contexts/EventsContext.jsx` | 121 |
| `checkOllamaConnection` | Function | `src/services/ollamaService.js` | 23 |
| `generateOllamaCompletion` | Function | `src/services/ollamaService.js` | 34 |
| `chatOllama` | Function | `src/services/ollamaService.js` | 67 |
| `syncGoogleEvents` | Function | `src/contexts/EventsContext.jsx` | 71 |
| `getPreferLocal` | Method | `src/services/localBrainService.js` | 131 |
| `getPersonalitySystemPrompt` | Method | `src/services/geminiService.js` | 27 |
| `_generate` | Method | `src/services/geminiService.js` | 67 |
| `testConnection` | Method | `src/services/geminiService.js` | 80 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DayView → SendPhoneNotification` | cross_community | 8 |
| `DayView → SendPhoneNotification` | cross_community | 8 |
| `UpcomingSidebar → SendPhoneNotification` | cross_community | 8 |
| `DayView → SaveReminders` | cross_community | 7 |
| `DayView → SaveReminders` | cross_community | 7 |
| `UpcomingSidebar → SaveReminders` | cross_community | 7 |
| `ProcessEventInput → GetTemporalContext` | cross_community | 6 |
| `DayView → Now` | cross_community | 6 |
| `DayView → Remove` | cross_community | 6 |
| `DayView → Now` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Settings | 5 calls |
| AI | 4 calls |
| Calendar | 4 calls |
| Toast | 1 calls |

## How to Explore

1. `gitnexus_context({name: "validateEventOrThrow"})` — see callers and callees
2. `gitnexus_query({query: "services"})` — find related execution flows
3. Read key files listed above for implementation details

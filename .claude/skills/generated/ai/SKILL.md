---
name: ai
description: "Skill for the Ai area of cal. 30 symbols across 4 files."
---

# Ai

30 symbols | 4 files | Cohesion: 85%

## When to Use

- Working with code in `src/`
- Understanding how getCached, listClarificationFields, processEventInput work
- Modifying ai-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/ai/AiProcessor.js` | extractLocation, hasExplicitTime, hasExplicitDate, hasLocationHint, hasMeetingHint (+15) |
| `src/ai/WebLLMEvaluator.js` | getCached, nowMs, titleMatches, timeMatches, dateMatches (+1) |
| `src/ai/OutputSanitizer.js` | isMathExpression, evaluateMathExpression, sanitizeAIOutput |
| `src/ai/aiEventEmitter.js` | emit |

## Entry Points

Start here when exploring this area:

- **`getCached`** (Function) — `src/ai/WebLLMEvaluator.js:84`
- **`listClarificationFields`** (Function) — `src/ai/AiProcessor.js:252`
- **`processEventInput`** (Function) — `src/ai/AiProcessor.js:319`
- **`applyClarificationAnswer`** (Function) — `src/ai/AiProcessor.js:272`
- **`evaluate`** (Function) — `src/ai/WebLLMEvaluator.js:41`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getCached` | Function | `src/ai/WebLLMEvaluator.js` | 84 |
| `listClarificationFields` | Function | `src/ai/AiProcessor.js` | 252 |
| `processEventInput` | Function | `src/ai/AiProcessor.js` | 319 |
| `applyClarificationAnswer` | Function | `src/ai/AiProcessor.js` | 272 |
| `evaluate` | Function | `src/ai/WebLLMEvaluator.js` | 41 |
| `sanitizeAIOutput` | Function | `src/ai/OutputSanitizer.js` | 31 |
| `emit` | Method | `src/ai/aiEventEmitter.js` | 8 |
| `extractLocation` | Function | `src/ai/AiProcessor.js` | 146 |
| `hasExplicitTime` | Function | `src/ai/AiProcessor.js` | 212 |
| `hasExplicitDate` | Function | `src/ai/AiProcessor.js` | 214 |
| `hasLocationHint` | Function | `src/ai/AiProcessor.js` | 223 |
| `hasMeetingHint` | Function | `src/ai/AiProcessor.js` | 224 |
| `hasAmbiguityHint` | Function | `src/ai/AiProcessor.js` | 225 |
| `scoreDraftConfidence` | Function | `src/ai/AiProcessor.js` | 227 |
| `determineClarificationFields` | Function | `src/ai/AiProcessor.js` | 240 |
| `dayNameToIndex` | Function | `src/ai/AiProcessor.js` | 25 |
| `stripNoise` | Function | `src/ai/AiProcessor.js` | 38 |
| `extractExplicitDate` | Function | `src/ai/AiProcessor.js` | 40 |
| `extractTimeRange` | Function | `src/ai/AiProcessor.js` | 69 |
| `extractTime` | Function | `src/ai/AiProcessor.js` | 79 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ProcessEventInput → GetTemporalContext` | cross_community | 6 |
| `ProcessEventInput → GetPersonalitySystemPrompt` | cross_community | 5 |
| `ProcessEventInput → DayNameToIndex` | cross_community | 4 |
| `ProcessEventInput → To24Hour` | cross_community | 4 |
| `ProcessEventInput → Now` | cross_community | 4 |
| `ProcessEventInput → ParseJsonResponse` | cross_community | 4 |
| `ListClarificationFields → ExtractLocation` | intra_community | 4 |
| `ProcessEventInput → ExtractLocation` | cross_community | 3 |
| `ProcessEventInput → TitleMatches` | cross_community | 3 |
| `ProcessEventInput → TimeMatches` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 4 calls |
| Calendar | 1 calls |

## How to Explore

1. `gitnexus_context({name: "getCached"})` — see callers and callees
2. `gitnexus_query({query: "ai"})` — find related execution flows
3. Read key files listed above for implementation details

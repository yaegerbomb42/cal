---
name: calendar
description: "Skill for the Calendar area of cal. 35 symbols across 14 files."
---

# Calendar

35 symbols | 14 files | Cohesion: 62%

## When to Use

- Working with code in `src/`
- Understanding how getEventsForDate, goToToday, openEventModal work
- Modifying calendar-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/Calendar/WeekView.jsx` | handleContextMenu, handleDuplicateEvent, handleDropOnCell, WeekView, updateTime (+2) |
| `src/components/Calendar/DayView.jsx` | handleSlotClick, DayView, updateTime, handleDragStart, handleDropOnCell (+1) |
| `src/components/Calendar/YearView.jsx` | MiniMonth, handleDayClick, ContributionGraph, handleClick |
| `src/contexts/EventsContext.jsx` | getEventsForDate, normalizeEvent, updateEvent |
| `src/components/Calendar/MonthView.jsx` | MonthView, handleEventClick, handleAddEventClick |
| `src/contexts/CalendarContext.jsx` | goToToday, openEventModal |
| `src/components/VoiceAI/JarvisParticles.jsx` | JarvisParticles, resizeCanvas |
| `src/components/Calendar/Calendar.jsx` | Calendar, renderView |
| `before_dayview.jsx` | handleSlotClick |
| `src/components/Header/Header.jsx` | Header |

## Entry Points

Start here when exploring this area:

- **`getEventsForDate`** (Function) — `src/contexts/EventsContext.jsx:410`
- **`goToToday`** (Function) — `src/contexts/CalendarContext.jsx:44`
- **`openEventModal`** (Function) — `src/contexts/CalendarContext.jsx:48`
- **`generateId`** (Function) — `src/utils/helpers.js:6`
- **`updateEvent`** (Function) — `src/contexts/EventsContext.jsx:254`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getEventsForDate` | Function | `src/contexts/EventsContext.jsx` | 410 |
| `goToToday` | Function | `src/contexts/CalendarContext.jsx` | 44 |
| `openEventModal` | Function | `src/contexts/CalendarContext.jsx` | 48 |
| `generateId` | Function | `src/utils/helpers.js` | 6 |
| `updateEvent` | Function | `src/contexts/EventsContext.jsx` | 254 |
| `handleSlotClick` | Function | `before_dayview.jsx` | 114 |
| `Header` | Function | `src/components/Header/Header.jsx` | 12 |
| `MiniMonth` | Function | `src/components/Calendar/YearView.jsx` | 11 |
| `handleDayClick` | Function | `src/components/Calendar/YearView.jsx` | 33 |
| `ContributionGraph` | Function | `src/components/Calendar/YearView.jsx` | 63 |
| `handleClick` | Function | `src/components/Calendar/YearView.jsx` | 120 |
| `handleContextMenu` | Function | `src/components/Calendar/WeekView.jsx` | 24 |
| `handleDuplicateEvent` | Function | `src/components/Calendar/WeekView.jsx` | 37 |
| `MonthView` | Function | `src/components/Calendar/MonthView.jsx` | 14 |
| `handleEventClick` | Function | `src/components/Calendar/MonthView.jsx` | 26 |
| `handleAddEventClick` | Function | `src/components/Calendar/MonthView.jsx` | 31 |
| `handleSlotClick` | Function | `src/components/Calendar/DayView.jsx` | 148 |
| `handleEditDraft` | Function | `src/components/AI/AIChat.jsx` | 462 |
| `JarvisParticles` | Function | `src/components/VoiceAI/JarvisParticles.jsx` | 14 |
| `resizeCanvas` | Function | `src/components/VoiceAI/JarvisParticles.jsx` | 187 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DayView → SendPhoneNotification` | cross_community | 8 |
| `DayView → SendPhoneNotification` | cross_community | 8 |
| `UpcomingSidebar → SendPhoneNotification` | cross_community | 8 |
| `DayView → SaveReminders` | cross_community | 7 |
| `DayView → SaveReminders` | cross_community | 7 |
| `UpcomingSidebar → SaveReminders` | cross_community | 7 |
| `DayView → Now` | cross_community | 6 |
| `DayView → Remove` | cross_community | 6 |
| `DayView → Now` | cross_community | 6 |
| `DayView → Remove` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Settings | 3 calls |
| Services | 2 calls |

## How to Explore

1. `gitnexus_context({name: "getEventsForDate"})` — see callers and callees
2. `gitnexus_query({query: "calendar"})` — find related execution flows
3. Read key files listed above for implementation details

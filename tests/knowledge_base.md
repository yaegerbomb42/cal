# CalAI Testing Knowledge Base

## Test Environment Setup

This file contains test credentials and data for QA testing of the CalAI application.

---

## Test Credentials

> ⚠️ **Note**: These are FAKE credentials for testing purposes only.

### Firebase Test Account

- **Email**: `testuser@calai-testing.com`
- **Password**: `CalAI_Test_2024!`
- **Display Name**: Test User

### Gemini API Key (Test)

- **Key**: `AIzaSyTest_FAKE_KEY_For_Testing_Only_12345`
- **Status**: Not a real key - use your own for actual testing

---

## Test Calendar Data

### Sample Events for Testing

```json
[
  {
    "title": "Morning Standup",
    "start": "2026-01-27T09:00:00",
    "end": "2026-01-27T09:30:00",
    "category": "work",
    "location": "Google Meet",
    "description": "Daily team sync"
  },
  {
    "title": "Lunch with Sarah",
    "start": "2026-01-27T12:00:00",
    "end": "2026-01-27T13:00:00",
    "category": "personal",
    "location": "Corner Bistro, 123 Main St",
    "description": "Catch up"
  },
  {
    "title": "Project Review",
    "start": "2026-01-27T14:00:00",
    "end": "2026-01-27T15:00:00",
    "category": "work",
    "description": "Q1 milestone review"
  },
  {
    "title": "Gym Session",
    "start": "2026-01-27T18:00:00",
    "end": "2026-01-27T19:00:00",
    "category": "hobby",
    "location": "Planet Fitness",
    "description": "Leg day"
  },
  {
    "title": "Overlapping Meeting A",
    "start": "2026-01-28T10:00:00",
    "end": "2026-01-28T11:00:00",
    "category": "work"
  },
  {
    "title": "Overlapping Meeting B",
    "start": "2026-01-28T10:30:00",
    "end": "2026-01-28T11:30:00",
    "category": "work"
  }
]
```

---

## Feature Test Checklist

### Views

- [ ] Day View: 12h time labels (1am, 2am)
- [ ] Day View: Current time bar visible
- [ ] Day View: Add event button works
- [ ] Week View: 12h time labels
- [ ] Week View: "Week of [Date]" header
- [ ] Week View: Add event button works
- [ ] Month View: Calendar grid renders
- [ ] Year View: GitHub-style contribution graph

### Events

- [ ] Create event via modal
- [ ] Edit existing event
- [ ] Delete event
- [ ] Event overlap handling
- [ ] Google Maps link for locations

### AI Features

- [ ] Gemini connection status (green/red)
- [ ] Chat with Cal input works
- [ ] Image upload (Gemini mode)
- [ ] Image upload hidden (Local mode)

### Settings

- [ ] Theme toggle (dark/light)
- [ ] API key save
- [ ] Export JSON
- [ ] Export ICS
- [ ] About page displays version

---

## Browser Testing Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

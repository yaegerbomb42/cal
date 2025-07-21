# Firebase Integration Guide

## Overview

The CalAI application now includes Firebase integration for persistent storage of:
- Gemini API keys
- Calendar events
- User data

## Firebase Configuration

The Firebase configuration is set up with the following services:
- **Firestore Database**: For storing user data, API keys, and events
- **Firebase Analytics**: For usage tracking (optional)

### Configuration Details

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBx6flUzCCOgrsWPLXhYBwSXqFr3wRqzLE",
  authDomain: "call-277ce.firebaseapp.com",
  projectId: "call-277ce",
  storageBucket: "call-277ce.firebasestorage.app",
  messagingSenderId: "488319878601",
  appId: "1:488319878601:web:b08b2d00090c62cc3c1418",
  measurementId: "G-MD6KWZML8Z"
};
```

## Features

### 1. API Key Persistence
- API keys are saved to Firebase Firestore under `users/{userId}/`
- Local storage is used as a fallback and backup
- Settings component automatically syncs between Firebase and localStorage

### 2. Event Persistence
- Calendar events are automatically saved to Firebase
- Events sync between Firebase and localStorage
- Real-time updates when events are created, modified, or deleted

### 3. User Management
- Simple user ID generation for demo purposes
- Each user gets a unique document in Firestore
- No authentication required (demo mode)

## Architecture

### Firebase Service (`src/services/firebaseService.js`)
Handles all Firebase operations:
- Initialize Firebase app and Firestore
- Save/load API keys
- Save/load events
- Save/load user data

### Events Context Integration
The EventsContext has been updated to:
- Initialize Firebase on startup
- Load events from Firebase first, fallback to localStorage
- Save events to both Firebase and localStorage
- Handle Firebase connection failures gracefully

### Settings Component Integration
The Settings component now:
- Loads API keys from Firebase first, fallback to localStorage
- Saves API keys to both Firebase and localStorage
- Handles Firebase errors gracefully

## Error Handling

The integration includes robust error handling:
- Firebase initialization failures fall back to localStorage
- Network connectivity issues don't break functionality
- All Firebase operations have try-catch blocks
- Console logging for debugging

## Benefits

1. **Cloud Persistence**: Data is stored in the cloud and accessible across devices
2. **Reliability**: localStorage fallback ensures app works offline
3. **Scalability**: Firebase can handle multiple users and large datasets
4. **No Authentication**: Simple setup for demo purposes
5. **Real-time Sync**: Future capability for real-time updates across devices

## Usage

The Firebase integration is transparent to users:
1. Enter API key in Settings - automatically saved to Firebase
2. Create events - automatically saved to Firebase
3. Data persists across browser sessions and devices
4. Works offline with localStorage fallback

## Development Notes

- Firebase rules should be configured for production use
- Consider adding authentication for real production deployment
- The current setup uses anonymous user IDs for demo purposes
- Firestore collections: `users/{userId}` with fields for `apiKey` and `events`
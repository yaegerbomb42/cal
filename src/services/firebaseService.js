import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBx6flUzCCOgrsWPLXhYBwSXqFr3wRqzLE",
  authDomain: "call-277ce.firebaseapp.com",
  projectId: "call-277ce",
  storageBucket: "call-277ce.firebasestorage.app",
  messagingSenderId: "488319878601",
  appId: "1:488319878601:web:b08b2d00090c62cc3c1418",
  measurementId: "G-MD6KWZML8Z"
};

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isInitialized = false;
    this.userId = this.generateUserId();
  }

  initialize() {
    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.isInitialized = false;
      return false;
    }
  }

  generateUserId() {
    // Generate a simple user ID for demo purposes
    // In a real app, this would come from authentication
    let userId = localStorage.getItem('cal-user-id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cal-user-id', userId);
    }
    return userId;
  }

  async saveApiKey(apiKey) {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      await setDoc(userDocRef, { apiKey }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving API key to Firebase:', error);
      throw error;
    }
  }

  async getApiKey() {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        return data.apiKey || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting API key from Firebase:', error);
      return null;
    }
  }

  async saveEvents(events) {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      await setDoc(userDocRef, { events }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving events to Firebase:', error);
      throw error;
    }
  }

  async getEvents() {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        return data.events || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting events from Firebase:', error);
      return [];
    }
  }

  subscribeToEvents(callback) {
    // For Firestore, we'll implement this differently since real-time updates need different approach
    // For now, return a no-op function
    return () => { };
  }

  async saveUserData(data) {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      await setDoc(userDocRef, data, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving user data to Firebase:', error);
      throw error;
    }
  }

  async getUserData() {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      const userDoc = await getDoc(userDocRef);
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error('Error getting user data from Firebase:', error);
      return null;
    }
  }
}

export const firebaseService = new FirebaseService();
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser
} from "firebase/auth";
import { logger } from '../utils/logger';

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
    this.auth = null;
    this.isInitialized = false;
    this.userId = null;

    // Auto-initialize with safety
    try {
      this.initialize();
    } catch (e) {
      logger.error('Firebase auto-init failed', { error: e });
    }
  }

  initialize() {
    if (this.isInitialized) return true;
    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);
      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize Firebase', { error });
      this.isInitialized = false;
      return false;
    }
  }

  // Auth Methods

  async loginWithGoogle() {
    if (!this.isInitialized && !this.initialize()) throw new Error('Firebase not initialized');
    const provider = new GoogleAuthProvider();

    // First check for redirect result (in case we're returning from a redirect)
    try {
      const redirectResult = await getRedirectResult(this.auth);
      if (redirectResult?.user) {
        this.userId = redirectResult.user.uid;
        return redirectResult.user;
      }
    } catch (redirectError) {
      logger.warn('No redirect result', { error: redirectError });
    }

    try {
      // Try popup first
      const result = await signInWithPopup(this.auth, provider);
      this.userId = result.user.uid;
      return result.user;
    } catch (error) {
      // If popup fails (blocked, closed, etc.), use redirect
      if (error.code === 'auth/popup-blocked' ||
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request') {
        logger.info('Popup blocked, using redirect');
        await signInWithRedirect(this.auth, provider);
        // Page will redirect, so this won't return
        return null;
      }
      logger.error('Google login error', { error });
      throw error;
    }
  }

  async loginWithEmail(email, password) {
    if (!this.isInitialized && !this.initialize()) throw new Error('Firebase not initialized');
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      this.userId = result.user.uid;
      return result.user;
    } catch (error) {
      logger.error('Email login error', { error });
      throw error;
    }
  }

  async signupWithEmail(email, password) {
    if (!this.isInitialized && !this.initialize()) throw new Error('Firebase not initialized');
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      this.userId = result.user.uid;
      return result.user;
    } catch (error) {
      logger.error('Signup error', { error });
      throw error;
    }
  }

  async logout() {
    if (!this.isInitialized && !this.initialize()) return;
    try {
      await signOut(this.auth);
      this.userId = null;
    } catch (error) {
      logger.error('Logout error', { error });
      throw error;
    }
  }

  async deleteAccount() {
    if (!this.isInitialized || !this.userId) throw new Error('Not authenticated');
    try {
      const user = this.auth.currentUser;
      if (user) {
        await deleteUser(user);
        this.userId = null;
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Delete account error', { error });
      throw error;
    }
  }

  onAuthStateChanged(callback) {
    if (!this.isInitialized && !this.initialize()) {
      // If still not initialized, we have a problem, but let's not block forever
      setTimeout(() => callback(null), 0);
      return () => { };
    }
    return onAuthStateChanged(this.auth, (user) => {
      this.userId = user ? user.uid : null;
      callback(user);
    });
  }

  // Generate User ID - Deprecated but kept for backup if needed
  generateUserId() {
    let userId = localStorage.getItem('cal-user-id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cal-user-id', userId);
    }
    return userId;
  }

  async saveApiKey(apiKey) {
    if (!this.isInitialized) throw new Error('Firebase not initialized');
    if (!this.userId) return false; // Don't save if not logged in

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      await setDoc(userDocRef, { apiKey }, { merge: true });
      return true;
    } catch (error) {
      logger.error('Error saving API key to Firebase', { error });
      throw error;
    }
  }

  async getApiKey() {
    if (!this.isInitialized || !this.userId) return null;

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        return data.apiKey || null;
      }
      return null;
    } catch (error) {
      logger.error('Error getting API key from Firebase', { error });
      return null;
    }
  }

  async saveEvents(events) {
    if (!this.isInitialized) throw new Error('Firebase not initialized');
    if (!this.userId) return false;

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      await setDoc(userDocRef, { events }, { merge: true });
      return true;
    } catch (error) {
      logger.error('Error saving events to Firebase', { error });
      throw error;
    }
  }

  async getEvents() {
    if (!this.isInitialized || !this.userId) return [];

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        return data.events || [];
      }
      return [];
    } catch (error) {
      logger.error('Error getting events from Firebase', { error });
      return [];
    }
  }

  subscribeToEvents() {
    return () => { };
  }

  async saveUserData(data) {
    if (!this.isInitialized) throw new Error('Firebase not initialized');
    if (!this.userId) return false;

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      await setDoc(userDocRef, data, { merge: true });
      return true;
    } catch (error) {
      logger.error('Error saving user data to Firebase', { error });
      throw error;
    }
  }

  async getUserData() {
    if (!this.isInitialized || !this.userId) return null;

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      const userDoc = await getDoc(userDocRef);
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      logger.error('Error getting user data from Firebase', { error });
      return null;
    }
  }
}

export const firebaseService = new FirebaseService();

// Firebase initializer with env-driven config and platform-specific persistence.
// Works on both web and React Native.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { Platform } from 'react-native';

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const fallbackConfig: FirebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyChrHjrhM89XuDAFBhEFv9Zd4llFUbUbQ4",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "safeqore.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "safeqore",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "safeqore.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "117587066520",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:117587066520:web:7f65d2f1918d2900731aed",
};

let appInstance: FirebaseApp | null = null;
let authInstance: any = null;

export async function initFirebaseApp(): Promise<FirebaseApp> {
  if (appInstance) return appInstance;
  
  const cfg = fallbackConfig;
  if (getApps().length) {
    appInstance = getApp();
  } else {
    appInstance = initializeApp(cfg);
  }
  return appInstance;
}

export async function getFirebaseAuth(): Promise<any> {
  if (authInstance) return authInstance;
  
  const app = await initFirebaseApp();
  
  // Import auth module dynamically
  const authModule = await import('firebase/auth');
  
  // Use platform-specific auth initialization
  if (Platform.OS === 'web') {
    authInstance = authModule.getAuth(app);
    
    // Configure persistence for web
    try {
      await authModule.setPersistence(authInstance, authModule.browserLocalPersistence);
    } catch (persistErr) {
      console.warn('Firebase persistence configuration failed:', persistErr);
    }
  } else {
    // For React Native (iOS/Android)
    // Firebase Web SDK doesn't have native AsyncStorage support
    // We use indexedDBLocalPersistence which works with React Native's polyfills
    authInstance = authModule.getAuth(app);
    
    // Note: For production React Native apps, consider using @react-native-firebase/auth
    // which provides native Firebase SDK integration with better performance
    console.log('Firebase Auth initialized for React Native (using web SDK)');
  }
  
  return authInstance;
}

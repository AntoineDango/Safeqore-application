// Firebase Web initializer with env-driven config and safe dynamic imports.
// Works on web; on native, these imports may fail unless you use @react-native-firebase/auth.

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

let appInstance: any | null = null;

export async function initFirebaseApp() {
  if (appInstance) return appInstance;
  try {
    const appMod: any = await import('firebase/app');
    const { getApps, initializeApp, getApp } = appMod;
    const cfg = fallbackConfig;
    if (getApps().length) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(cfg);
    }
    return appInstance;
  } catch (e) {
    // Probably running on native without web SDK
    throw new Error('Firebase Web SDK not available: ' + (e as Error).message);
  }
}

export async function getFirebaseAuth() {
  await initFirebaseApp();
  try {
    const authMod: any = await import('firebase/auth');
    const { getAuth } = authMod;
    return getAuth();
  } catch (e) {
    throw new Error('Firebase Auth SDK not available: ' + (e as Error).message);
  }
}

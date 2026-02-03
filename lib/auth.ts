// Lightweight auth helper to provide Authorization header with Firebase ID token if available.
// This works even if Firebase SDK is not installed (fails gracefully).

let customTokenProvider: (() => Promise<string | null>) | null = null;
let cachedToken: string | null = null;
let tokenExpiry: number = 0;
import { initFirebaseApp, getFirebaseAuth } from "./firebase";

/**
 * Optionally register a custom token provider (e.g., your login flow can set this).
 */
export function setCustomTokenProvider(fn: () => Promise<string | null>) {
  customTokenProvider = fn;
}

/**
 * Try to fetch an ID token from Firebase SDKs when present.
 */
async function tryGetFirebaseToken(): Promise<string | null> {
  // Check cache first (tokens are valid for 1 hour)
  const now = Date.now();
  if (cachedToken && tokenExpiry > now) {
    console.log('[Auth] Using cached token');
    return cachedToken;
  }

  console.log('[Auth] Fetching fresh token from Firebase...');

  // Try @react-native-firebase/auth first (common in RN apps)
  try {
    // @ts-ignore - optional dependency
    const rnAuth = await import('@react-native-firebase/auth');
    const current = rnAuth.default().currentUser;
    if (current) {
      const token = await current.getIdToken();
      if (token) {
        cachedToken = token;
        tokenExpiry = now + 55 * 60 * 1000; // Cache for 55 minutes
        console.log('[Auth] Token from RN Firebase');
        return token;
      }
    }
  } catch {}

  // Fallback to Web SDK if used in Expo Web
  try {
    // Ensure the Firebase app/auth are initialized via our shared initializer
    await initFirebaseApp();
    const auth = await getFirebaseAuth();
    const firebaseAuth: any = await import('firebase/auth');
    let current = auth.currentUser;
    
    console.log('[Auth] Firebase currentUser:', current ? 'exists' : 'null');
    
    // currentUser peut être null au démarrage; attendre l'état d'auth
    if (!current) {
      console.log('[Auth] Waiting for auth state...');
      current = await new Promise<any>((resolve) => {
        const unsub = firebaseAuth.onAuthStateChanged(auth, (u: any) => {
          console.log('[Auth] Auth state resolved:', u ? 'user found' : 'no user');
          try { unsub(); } catch {}
          resolve(u);
        });
        // Augmenter le timeout pour laisser le temps à Firebase de se synchroniser
        setTimeout(() => {
          console.log('[Auth] Auth state timeout');
          try { unsub(); } catch {}
          resolve(null);
        }, 3000);
      });
    }
    
    if (current) {
      console.log('[Auth] Getting token from current user...');
      const token = await firebaseAuth.getIdToken(current);
      if (token) {
        cachedToken = token;
        tokenExpiry = now + 55 * 60 * 1000; // Cache for 55 minutes
        console.log('[Auth] Token retrieved successfully');
        return token;
      }
    }
  } catch (e) {
    console.error('[Auth] Error getting Firebase token:', e);
  }

  console.warn('[Auth] No token available');
  return null;
}

export async function getIdToken(): Promise<string | null> {
  if (customTokenProvider) {
    try {
      const t = await customTokenProvider();
      if (t) return t;
    } catch {}
  }
  return await tryGetFirebaseToken();
}

export async function getAuthHeader(): Promise<Record<string, string>> {
  console.log('[Auth] getAuthHeader called');
  const token = await getIdToken();
  console.log('[Auth] Token result:', token ? `${token.length} chars` : 'null');
  if (!token) {
    console.warn('[Auth] No token available for Authorization header');
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

/**
 * Clear the token cache (useful after logout or when token is invalid)
 */
export function clearTokenCache() {
  cachedToken = null;
  tokenExpiry = 0;
}

/**
 * Force refresh the token from Firebase (bypasses cache)
 */
export async function refreshToken(): Promise<string | null> {
  clearTokenCache();
  return await tryGetFirebaseToken();
}

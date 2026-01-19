// Lightweight auth helper to provide Authorization header with Firebase ID token if available.
// This works even if Firebase SDK is not installed (fails gracefully).

let customTokenProvider: (() => Promise<string | null>) | null = null;

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
  // Try @react-native-firebase/auth first (common in RN apps)
  try {
    // @ts-ignore - optional dependency
    const rnAuth = await import('@react-native-firebase/auth');
    const current = rnAuth.default().currentUser;
    if (current) {
      return await current.getIdToken();
    }
  } catch {}

  // Fallback to Web SDK if used in Expo Web
  try {
    // @ts-ignore - optional dependency
    const firebaseAuth = await import('firebase/auth');
    // @ts-ignore - optional dependency
    const firebaseApp = await import('firebase/app');
    // If app is initialized elsewhere, use default
    // @ts-ignore
    const auth = firebaseAuth.getAuth();
    const current = auth.currentUser;
    if (current) {
      return await firebaseAuth.getIdToken(current);
    }
  } catch {}

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
  const token = await getIdToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

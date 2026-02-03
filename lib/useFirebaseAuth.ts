import { useEffect, useState } from "react";
import { getFirebaseAuth, initFirebaseApp } from "./firebase";
import { clearTokenCache } from "./auth";

/**
 * Hook to listen to Firebase auth state changes and keep token cache in sync
 */
export function useFirebaseAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        // Initialize Firebase
        await initFirebaseApp();
        const auth = await getFirebaseAuth();
        const firebaseAuth: any = await import("firebase/auth");

        // Listen to auth state changes
        unsubscribe = firebaseAuth.onAuthStateChanged(auth, async (currentUser: any) => {
          setUser(currentUser);
          setLoading(false);

          if (!currentUser) {
            // User is signed out, clear the cache
            clearTokenCache();
          }
        });
      } catch (err) {
        setLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch {}
      }
    };
  }, []);

  return { user, loading };
}

import { useEffect, useState } from "react";
import { router } from "expo-router";
import { getIdToken } from "./auth";

/**
 * Redirects to /login if no Firebase ID token is available.
 * Call at the top of protected screens.
 * Returns { loading: boolean, authenticated: boolean }
 */
export function useAuthGuard(redirectTo: string = "/login") {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getIdToken();
        
        if (!mounted) return;
        
        if (!token) {
          router.replace(redirectTo as any);
          setAuthenticated(false);
        } else {
          setAuthenticated(true);
        }
      } catch (e) {
        if (mounted) {
          router.replace(redirectTo as any);
          setAuthenticated(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [redirectTo]);

  return { loading, authenticated };
}

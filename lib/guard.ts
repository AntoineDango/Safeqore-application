import { useEffect } from "react";
import { router } from "expo-router";
import { getIdToken } from "./auth";

/**
 * Redirects to /login if no Firebase ID token is available.
 * Call at the top of protected screens.
 */
export function useAuthGuard(redirectTo: string = "/login") {
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getIdToken();
        if (mounted && !token) {
          router.replace(redirectTo as any);
        }
      } catch {
        if (mounted) router.replace(redirectTo as any);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [redirectTo]);
}

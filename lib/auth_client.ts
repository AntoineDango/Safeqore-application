// Cross-platform auth client helpers using dynamic imports.
// Supports React Native Firebase and Firebase Web SDK.

import { initFirebaseApp, getFirebaseAuth } from "./firebase";

export async function signInWithEmail(email: string, password: string): Promise<void> {
  // Try React Native Firebase first
  try {
    // @ts-ignore optional dependency
    const rnAuth = await import("@react-native-firebase/auth");
    await rnAuth.default().signInWithEmailAndPassword(email, password);
    return;
  } catch {}

  // Fallback to Web SDK
  await initFirebaseApp();
  const authMod: any = await import("firebase/auth");
  const auth = await getFirebaseAuth();
  await authMod.signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  // Try React Native Firebase first
  try {
    // @ts-ignore optional dependency
    const rnAuth = await import("@react-native-firebase/auth");
    await rnAuth.default().createUserWithEmailAndPassword(email, password);
    return;
  } catch {}

  // Fallback to Web SDK
  await initFirebaseApp();
  const authMod: any = await import("firebase/auth");
  const auth = await getFirebaseAuth();
  await authMod.createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut(): Promise<void> {
  try {
    // @ts-ignore optional dependency
    const rnAuth = await import("@react-native-firebase/auth");
    await rnAuth.default().signOut();
    return;
  } catch {}

  await initFirebaseApp();
  const authMod: any = await import("firebase/auth");
  const auth = await getFirebaseAuth();
  await authMod.signOut(auth);
}

export async function signInWithGoogle(): Promise<void> {
  // Try Web SDK popup first (works in Expo Web)
  try {
    await initFirebaseApp();
    const authMod: any = await import("firebase/auth");
    const auth = await getFirebaseAuth();
    const provider = new authMod.GoogleAuthProvider();
    await authMod.signInWithPopup(auth, provider);
    return;
  } catch (e) {
    // fallthrough to RN path
  }

  // React Native path requires Google Sign-In configuration (not set up here)
  try {
    // @ts-ignore optional dependency
    const rnAuth = await import("@react-native-firebase/auth");
    // NOTE: In a real native setup, you must integrate Google Sign-In to obtain idToken
    // then create a credential via GoogleAuthProvider.credential(idToken)
    // and finally: rnAuth.default().signInWithCredential(credential)
    throw new Error("Google Sign-In natif non configuré");
  } catch (err: any) {
    throw new Error(err?.message || "Connexion Google indisponible sur cette plateforme");
  }
}

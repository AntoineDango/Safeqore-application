// Cross-platform auth client helpers using dynamic imports.
// Supports React Native Firebase and Firebase Web SDK.

import { initFirebaseApp, getFirebaseAuth } from "./firebase";
import { clearTokenCache } from "./auth";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider
} from 'firebase/auth';
import { Platform } from 'react-native';

export async function signInWithEmail(email: string, password: string): Promise<void> {
  // Clear any cached token before signing in
  clearTokenCache();
  
  // Try React Native Firebase first
  try {
    // @ts-ignore optional dependency
    const rnAuth = await import("@react-native-firebase/auth");
    try {
      const userCredential = await rnAuth.default().signInWithEmailAndPassword(email, password);
      
      // Check if email is verified
      if (userCredential.user && !userCredential.user.emailVerified) {
        // Sign out the user immediately
        await rnAuth.default().signOut();
        throw new Error('Veuillez vérifier votre email avant de vous connecter. Consultez votre boîte de réception.');
      }
      
      // Wait a bit for Firebase to persist the auth state
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    } catch (error: any) {
      throw translateFirebaseError(error);
    }
  } catch (importError) {
    // Module not available, continue to Web SDK
  }

  // Fallback to Web SDK
  try {
    await initFirebaseApp();
    const auth = await getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Check if email is verified
    if (userCredential.user && !userCredential.user.emailVerified) {
      // Sign out the user immediately
      await auth.signOut();
      throw new Error('Veuillez vérifier votre email avant de vous connecter. Consultez votre boîte de réception.');
    }
    
    // Wait for Firebase to persist the auth state and get the token
    if (userCredential.user) {
      await userCredential.user.getIdToken(true); // Force refresh to ensure token is fresh
      // Give Firebase a moment to persist the state
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  } catch (error: any) {
    throw translateFirebaseError(error);
  }
}

/**
 * Translate Firebase error codes to user-friendly French messages
 */
function translateFirebaseError(error: any): Error {
  const code = error?.code || '';
  
  switch (code) {
    case 'auth/invalid-email':
      return new Error('Format d\'email invalide. Veuillez vérifier votre adresse email.');
    
    case 'auth/user-disabled':
      return new Error('Ce compte a été désactivé. Contactez le support.');
    
    case 'auth/user-not-found':
      return new Error('Aucun compte n\'existe avec cet email. Veuillez créer un compte.');
    
    case 'auth/wrong-password':
      return new Error('Mot de passe incorrect. Veuillez réessayer.');
    
    case 'auth/invalid-credential':
      return new Error('Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.');
    
    case 'auth/too-many-requests':
      return new Error('Trop de tentatives de connexion. Veuillez réessayer plus tard.');
    
    case 'auth/network-request-failed':
      return new Error('Erreur de connexion réseau. Vérifiez votre connexion internet.');
    
    case 'auth/email-already-in-use':
      return new Error('Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.');
    
    case 'auth/weak-password':
      return new Error('Mot de passe trop faible. Utilisez au moins 6 caractères.');
    
    case 'auth/operation-not-allowed':
      return new Error('Opération non autorisée. Contactez le support.');
    
    case 'auth/missing-email':
      return new Error('L\'email est obligatoire.');
    
    case 'auth/missing-password':
      return new Error('Le mot de passe est obligatoire.');
    
    default:
      return new Error(error?.message || 'Erreur de connexion. Veuillez réessayer.');
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  // Clear any cached token before signing up
  clearTokenCache();
  
  // Try React Native Firebase first
  try {
    // @ts-ignore optional dependency
    const rnAuth = await import("@react-native-firebase/auth");
    try {
      const userCredential = await rnAuth.default().createUserWithEmailAndPassword(email, password);
      
      // Send email verification
      if (userCredential.user) {
        try {
          await userCredential.user.sendEmailVerification();
          console.log("[Auth] Email verification sent to:", email);
        } catch (emailError) {
          console.error("[Auth] Failed to send verification email:", emailError);
          // Don't throw - account is created, just email failed
        }
      }
      
      // Wait a bit for Firebase to persist the auth state
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    } catch (error: any) {
      throw translateFirebaseError(error);
    }
  } catch (importError) {
    // Module not available, continue to Web SDK
  }

  // Fallback to Web SDK
  try {
    await initFirebaseApp();
    const auth = await getFirebaseAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Send email verification with custom redirect URL
    if (userCredential.user) {
      try {
        const { sendEmailVerification } = await import("firebase/auth");
        
        // Configuration de l'URL de redirection après validation
        // Utiliser une URL fixe pour éviter les problèmes avec window sur mobile
        const baseUrl = Platform.OS === 'web' 
          ? (typeof window !== 'undefined' ? window.location.origin : 'https://safeqore.firebaseapp.com')
          : 'https://safeqore.firebaseapp.com';
        
        const actionCodeSettings = {
          url: `${baseUrl}/email-verified`,
          handleCodeInApp: true,
        };
        
        await sendEmailVerification(userCredential.user, actionCodeSettings);
        console.log("[Auth] Email verification sent to:", email, "with redirect to", actionCodeSettings.url);
      } catch (emailError) {
        console.error("[Auth] Failed to send verification email:", emailError);
        // Don't throw - account is created, just email failed
      }
    }
    
    // Wait for Firebase to persist the auth state and get the token
    if (userCredential.user) {
      await userCredential.user.getIdToken(true); // Force refresh to ensure token is fresh
      // Give Firebase a moment to persist the state
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  } catch (error: any) {
    throw translateFirebaseError(error);
  }
}

// Throttling pour éviter l'erreur "too-many-requests"
let lastEmailSentTime = 0;
const EMAIL_COOLDOWN_MS = 60000; // 60 secondes entre chaque envoi

export async function resendVerificationEmail(): Promise<void> {
  // Vérifier le throttling
  const now = Date.now();
  const timeSinceLastEmail = now - lastEmailSentTime;
  
  if (timeSinceLastEmail < EMAIL_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((EMAIL_COOLDOWN_MS - timeSinceLastEmail) / 1000);
    throw new Error(`Veuillez attendre ${remainingSeconds} secondes avant de renvoyer l'email.`);
  }
  
  // Try React Native Firebase first
  try {
    // @ts-ignore optional dependency
    const rnAuth = await import("@react-native-firebase/auth");
    const user = rnAuth.default().currentUser;
    if (!user) {
      throw new Error("Aucun utilisateur connecté");
    }
    if (user.emailVerified) {
      throw new Error("Email déjà vérifié");
    }
    await user.sendEmailVerification();
    lastEmailSentTime = Date.now(); // Mettre à jour le timestamp
    console.log("[Auth] Verification email resent to:", user.email);
    return;
  } catch (importError) {
    // Module not available, continue to Web SDK
  }

  // Fallback to Web SDK
  await initFirebaseApp();
  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error("Aucun utilisateur connecté");
  }
  
  if (user.emailVerified) {
    throw new Error("Email déjà vérifié");
  }
  
  const { sendEmailVerification } = await import("firebase/auth");
  
  // Configuration de l'URL de redirection après validation
  // Utiliser une URL fixe pour éviter les problèmes avec window sur mobile
  const baseUrl = Platform.OS === 'web' 
    ? (typeof window !== 'undefined' ? window.location.origin : 'https://safeqore.firebaseapp.com')
    : 'https://safeqore.firebaseapp.com';
  
  const actionCodeSettings = {
    url: `${baseUrl}/email-verified`,
    handleCodeInApp: true,
  };
  
  await sendEmailVerification(user, actionCodeSettings);
  lastEmailSentTime = Date.now(); // Mettre à jour le timestamp
  console.log("[Auth] Verification email resent to:", user.email, "with redirect to", actionCodeSettings.url);
}

export async function signOut(): Promise<void> {
  // Clear the token cache on sign out
  clearTokenCache();
  
  try {
    // @ts-ignore optional dependency
    const rnAuth = await import("@react-native-firebase/auth");
    await rnAuth.default().signOut();
    return;
  } catch {}

  await initFirebaseApp();
  const auth = await getFirebaseAuth();
  await firebaseSignOut(auth);
}

export async function signInWithGoogle(): Promise<void> {
  // Clear any cached token before signing in
  clearTokenCache();
  
  // Check if running on web
  if (Platform.OS === 'web') {
    // Web platform: use signInWithPopup
    try {
      await initFirebaseApp();
      const auth = await getFirebaseAuth();
      
      // Dynamic import for web-only method
      const { signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      
      // Add scopes for better user info
      provider.addScope('profile');
      provider.addScope('email');
      
      const userCredential = await signInWithPopup(auth, provider);
      
      // Wait for Firebase to persist the auth state and get the token
      if (userCredential.user) {
        await userCredential.user.getIdToken(true);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      return;
    } catch (e: any) {
      console.error("[Google Sign-In Web] Error:", e);
      
      // Handle specific Google Sign-In errors
      if (e?.code === 'auth/popup-closed-by-user') {
        throw new Error("Connexion annulée. Veuillez réessayer.");
      }
      
      if (e?.code === 'auth/popup-blocked') {
        throw new Error("Popup bloquée par le navigateur. Autorisez les popups pour ce site.");
      }
      
      if (e?.code === 'auth/cancelled-popup-request') {
        throw new Error("Connexion annulée. Veuillez réessayer.");
      }
      
      if (e?.code === 'auth/unauthorized-domain') {
        throw new Error("Domaine non autorisé. Contactez le support.");
      }
      
      // If it's a network error or other Firebase error, translate it
      if (e?.code?.startsWith('auth/')) {
        throw translateFirebaseError(e);
      }
      
      throw new Error(e?.message || "Connexion Google indisponible. Veuillez utiliser l'email/mot de passe.");
    }
  } else {
    // React Native: Use @react-native-google-signin/google-signin
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      
      // Configure Google Sign-In
      GoogleSignin.configure({
        webClientId: '117587066520-ch1g6ds270h358dpelepun9gmgv6vkks.apps.googleusercontent.com', // From google-services.json with SHA-1
        offlineAccess: false,
      });
      
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      // Get Firebase auth and sign in with Google credential
      await initFirebaseApp();
      const auth = await getFirebaseAuth();
      
      // Import Firebase auth methods
      const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
      
      // Create credential with the ID token
      const idToken = (userInfo as any).data?.idToken || (userInfo as any).idToken;
      if (!idToken) {
        throw new Error("Impossible d'obtenir le token Google.");
      }
      const googleCredential = GoogleAuthProvider.credential(idToken);
      
      // Sign in to Firebase with the Google credential
      const userCredential = await signInWithCredential(auth, googleCredential);
      
      // Wait for Firebase to persist the auth state
      if (userCredential.user) {
        await userCredential.user.getIdToken(true);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log("[Google Sign-In Mobile] Success:", userCredential.user.email);
      return;
    } catch (error: any) {
      console.error("[Google Sign-In Mobile] Error:", error);
      
      // Handle specific Google Sign-In errors
      if (error.code === 'SIGN_IN_CANCELLED') {
        throw new Error("Connexion annulée.");
      }
      
      if (error.code === 'IN_PROGRESS') {
        throw new Error("Connexion en cours...");
      }
      
      if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        throw new Error("Google Play Services non disponible. Veuillez utiliser l'email/mot de passe.");
      }
      
      throw new Error(error?.message || "Erreur de connexion Google. Veuillez réessayer.");
    }
  }
}

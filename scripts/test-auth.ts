/**
 * Script de test pour vérifier l'authentification Firebase
 * 
 * Usage: Ouvrir la console du navigateur et copier-coller ce code
 */

async function testFirebaseAuth() {
  console.log('=== Test Firebase Auth ===');
  
  try {
    // 1. Importer Firebase
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence } = await import('firebase/auth');
    
    console.log('✓ Firebase modules imported');
    
    // 2. Initialiser Firebase
    const config = {
      apiKey: "AIzaSyChrHjrhM89XuDAFBhEFv9Zd4llFUbUbQ4",
      authDomain: "safeqore.firebaseapp.com",
      projectId: "safeqore",
      storageBucket: "safeqore.firebasestorage.app",
      messagingSenderId: "117587066520",
      appId: "1:117587066520:web:7f65d2f1918d2900731aed",
    };
    
    const app = getApps().length ? getApp() : initializeApp(config);
    console.log('✓ Firebase app initialized');
    
    // 3. Obtenir Auth
    const auth = getAuth(app);
    console.log('✓ Firebase Auth obtained');
    
    // 4. Configurer la persistance
    await setPersistence(auth, browserLocalPersistence);
    console.log('✓ Persistence configured');
    
    // 5. Vérifier l'utilisateur actuel
    console.log('Current user:', auth.currentUser);
    
    if (auth.currentUser) {
      // 6. Obtenir le token
      const token = await auth.currentUser.getIdToken();
      console.log('✓ Token obtained, length:', token.length);
      console.log('Token preview:', token.substring(0, 50) + '...');
      
      // 7. Tester l'appel API
      const response = await fetch('http://localhost:8000/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✓ Profile data:', data);
      } else {
        const text = await response.text();
        console.error('✗ API Error:', text);
      }
    } else {
      console.log('⚠ No user signed in');
      console.log('To sign in, run:');
      console.log('await signInWithEmailAndPassword(auth, "your@email.com", "password")');
    }
    
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

// Exécuter le test
testFirebaseAuth();

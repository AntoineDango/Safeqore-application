import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { getIdToken, clearTokenCache, refreshToken } from '../lib/auth';
import { getFirebaseAuth, initFirebaseApp } from '../lib/firebase';

/**
 * Composant de debug pour afficher l'état d'authentification
 * À utiliser temporairement pour diagnostiquer les problèmes
 */
export function AuthDebug() {
  const [info, setInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const checkAuth = async () => {
    setLoading(true);
    const result: any = {};
    
    try {
      // 1. Vérifier le token
      const token = await getIdToken();
      result.hasToken = !!token;
      result.tokenLength = token?.length || 0;
      result.tokenPreview = token ? token.substring(0, 30) + '...' : 'N/A';
      
      // 2. Vérifier Firebase Auth
      try {
        await initFirebaseApp();
        const auth = await getFirebaseAuth();
        result.firebaseInitialized = true;
        result.currentUser = auth.currentUser ? {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          emailVerified: auth.currentUser.emailVerified
        } : null;
      } catch (e: any) {
        result.firebaseInitialized = false;
        result.firebaseError = e.message;
      }
      
      // 3. Tester l'appel API
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch('http://localhost:8000/profile', { headers });
        result.apiStatus = response.status;
        result.apiOk = response.ok;
        
        if (response.ok) {
          const data = await response.json();
          result.apiData = data;
        } else {
          result.apiError = await response.text();
        }
      } catch (e: any) {
        result.apiError = e.message;
      }
      
    } catch (e: any) {
      result.error = e.message;
    }
    
    result.timestamp = new Date().toISOString();
    setInfo(result);
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <View style={{ padding: 16, backgroundColor: '#f3f4f6', borderRadius: 8, margin: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>🔍 Auth Debug</Text>
      
      <ScrollView style={{ maxHeight: 400 }}>
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {JSON.stringify(info, null, 2)}
        </Text>
      </ScrollView>
      
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <Pressable
          onPress={checkAuth}
          disabled={loading}
          style={{
            padding: 10,
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            borderRadius: 6
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>
            {loading ? 'Chargement...' : 'Rafraîchir'}
          </Text>
        </Pressable>
        
        <Pressable
          onPress={async () => {
            clearTokenCache();
            await checkAuth();
          }}
          style={{
            padding: 10,
            backgroundColor: '#ef4444',
            borderRadius: 6
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Vider le cache</Text>
        </Pressable>
        
        <Pressable
          onPress={async () => {
            await refreshToken();
            await checkAuth();
          }}
          style={{
            padding: 10,
            backgroundColor: '#10b981',
            borderRadius: 6
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Forcer refresh</Text>
        </Pressable>
      </View>
    </View>
  );
}

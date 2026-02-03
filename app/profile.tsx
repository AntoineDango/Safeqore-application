import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Image, ScrollView } from "react-native";
import { router } from "expo-router";
import { getProfile, getExtendedProfile, type ProfileResponse, type ExtendedProfileResponse } from "../lib/api";
import { signOut } from "../lib/auth_client";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileResponse["profile"] | null>(null);
  const [extendedProfile, setExtendedProfile] = useState<ExtendedProfileResponse["profile"] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getProfile();
        setProfile(res.profile);
        
        // Essayer de récupérer le profil étendu
        try {
          const extended = await getExtendedProfile();
          setExtendedProfile(extended.profile);
        } catch {
          // Profil étendu non disponible, continuer avec le profil basique
        }
      } catch (e: any) {
        const msg = String(e?.message || "");
        // Si le backend répond 401, rediriger vers /login directement
        if (msg.startsWith("401 ") || msg.includes("401 Unauthorized")) {
          router.replace("/login" as any);
          return;
        }
        setError(msg || "Impossible de charger le profil (êtes-vous connecté ?)");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/login" as any);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>
        <Text style={{ color: "#b91c1c", textAlign: "center" }}>{error}</Text>
        <Pressable onPress={() => router.replace("/login" as any)} style={{ alignItems: "center" }}>
          <Text style={{ color: "#2563eb" }}>Se connecter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* En-tête avec avatar */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          {profile?.picture ? (
            <Image 
              source={{ uri: profile.picture }} 
              style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 16, borderWidth: 4, borderColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }} 
            />
          ) : (
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center", marginBottom: 16, borderWidth: 4, borderColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
              <Ionicons name="person" size={60} color="#fff" />
            </View>
          )}
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 }}>
            {extendedProfile?.prenom && extendedProfile?.nom 
              ? `${extendedProfile.prenom} ${extendedProfile.nom}`
              : profile?.name || "Utilisateur"}
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280" }}>
            {extendedProfile?.fonction || "Membre"}
          </Text>
        </View>

        {/* Carte d'informations */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 16 }}>
            Informations personnelles
          </Text>

          {/* Nom */}
          {extendedProfile?.nom && (
            <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Ionicons name="person-outline" size={18} color="#7C3AED" />
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Nom
                </Text>
              </View>
              <Text selectable style={{ fontSize: 16, color: "#111827", fontWeight: "500" }}>
                {extendedProfile.nom}
              </Text>
            </View>
          )}

          {/* Prénom */}
          {extendedProfile?.prenom && (
            <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Ionicons name="person-outline" size={18} color="#7C3AED" />
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Prénom
                </Text>
              </View>
              <Text selectable style={{ fontSize: 16, color: "#111827", fontWeight: "500" }}>
                {extendedProfile.prenom}
              </Text>
            </View>
          )}

          {/* Email */}
          {profile?.email && (
            <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Ionicons name="mail-outline" size={18} color="#7C3AED" />
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Adresse email
                </Text>
              </View>
              <Text selectable style={{ fontSize: 16, color: "#111827", fontWeight: "500" }}>
                {profile.email}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                <Ionicons 
                  name={profile.email_verified ? "checkmark-circle" : "alert-circle"} 
                  size={16} 
                  color={profile.email_verified ? "#10b981" : "#f59e0b"} 
                />
                <Text style={{ fontSize: 12, color: profile.email_verified ? "#10b981" : "#f59e0b", fontWeight: "600" }}>
                  {profile.email_verified ? "Vérifié" : "Non vérifié"}
                </Text>
              </View>
            </View>
          )}

          {/* Fonction */}
          {extendedProfile?.fonction && (
            <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Ionicons name="briefcase-outline" size={18} color="#7C3AED" />
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Fonction
                </Text>
              </View>
              <Text selectable style={{ fontSize: 16, color: "#111827", fontWeight: "500" }}>
                {extendedProfile.fonction}
              </Text>
            </View>
          )}

          {/* Entreprise */}
          {extendedProfile?.entreprise && (
            <View style={{ marginBottom: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Ionicons name="business-outline" size={18} color="#7C3AED" />
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Entreprise
                </Text>
              </View>
              <Text selectable style={{ fontSize: 16, color: "#111827", fontWeight: "500" }}>
                {extendedProfile.entreprise}
              </Text>
            </View>
          )}
        </View>

        {/* Bouton de déconnexion */}
        <Pressable
          onPress={onSignOut}
          style={{ borderRadius: 12, overflow: "hidden", marginTop: 8 }}
        >
          <LinearGradient
            colors={["#ef4444", "#dc2626"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
              Se déconnecter
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Image, ScrollView, Platform } from "react-native";
import { router } from "expo-router";
import { getProfile, type ProfileResponse } from "../../lib/api";
import { signOut } from "../../lib/auth_client";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileTabScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileResponse["profile"] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getProfile();
        setProfile(res.profile);
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.startsWith("401 ") || msg.includes("401 Unauthorized")) {
          router.replace("/login" as any);
          return;
        }
        setError(msg || "Impossible de charger le profil");
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
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ marginTop: 16, color: "#6b7280" }}>Chargement du profil...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", padding: 16, justifyContent: "center" }}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={{ color: "#b91c1c", textAlign: "center", fontSize: 16 }}>{error}</Text>
          <Pressable onPress={() => router.replace("/login" as any)} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "#7C3AED" }}>
            <Text style={{ color: "white", fontWeight: "600" }}>Se connecter</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827" }}>Mon profil</Text>
          <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>Gérez vos informations personnelles</Text>
        </View>

        {/* Photo de profil */}
        {profile?.picture ? (
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Image source={{ uri: profile.picture }} style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: "#7C3AED" }} />
          </View>
        ) : (
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="person" size={48} color="#7C3AED" />
            </View>
          </View>
        )}

        {/* Informations */}
        <View style={{ gap: 16 }}>
          {profile?.name && (
            <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Nom</Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>{profile.name}</Text>
            </View>
          )}

          {profile?.email && (
            <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Email</Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>{profile.email}</Text>
              {profile.email_verified && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={{ fontSize: 12, color: "#10b981", fontWeight: "600" }}>Vérifié</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Identifiant utilisateur</Text>
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#6b7280", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }}>{profile?.uid}</Text>
          </View>
        </View>

        {/* Bouton de déconnexion */}
        <Pressable
          onPress={onSignOut}
          style={{ marginTop: 32, borderRadius: 12, overflow: "hidden" }}
        >
          <LinearGradient
            colors={["#ef4444", "#dc2626"]}
            start={{x:0, y:0}}
            end={{x:1, y:1}}
            style={{ paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Se déconnecter</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

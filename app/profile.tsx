import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Image, ScrollView } from "react-native";
import { router } from "expo-router";
import { getProfile, type ProfileResponse } from "../lib/api";
import { signOut } from "../lib/auth_client";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileResponse["profile"] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getProfile();
        setProfile(res.profile);
      } catch (e: any) {
        setError(e?.message || "Impossible de charger le profil (êtes-vous connecté ?)");
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
    <SafeAreaView style={{ flex:1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Mon profil</Text>

      {profile?.picture ? (
        <Image source={{ uri: profile.picture }} style={{ width: 96, height: 96, borderRadius: 48 }} />
      ) : null}

      <View style={{ gap: 4 }}>
        <Text style={{ fontWeight: "600" }}>UID</Text>
        <Text selectable>{profile?.uid}</Text>
      </View>

      {profile?.email ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontWeight: "600" }}>Email</Text>
          <Text selectable>{profile?.email}</Text>
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        <Text style={{ fontWeight: "600" }}>Email vérifié</Text>
        <Text>{profile?.email_verified ? "Oui" : "Non"}</Text>
      </View>

      {profile?.name ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontWeight: "600" }}>Nom</Text>
          <Text selectable>{profile?.name}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={onSignOut}
        style={{ marginTop: 16, padding: 14, borderRadius: 8, backgroundColor: "#ef4444", alignItems: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Se déconnecter</Text>
      </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

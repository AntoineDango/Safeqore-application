import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EmailVerifiedScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={["#7C3AED", "#2563EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 440,
            backgroundColor: "#fff",
            borderRadius: 24,
            padding: 32,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 8,
          }}
        >
          {/* Icône de succès */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: "#d1fae5",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: "800", color: "#111827", textAlign: "center", marginBottom: 8 }}>
              Votre adresse e-mail a bien été validée
            </Text>
            <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22 }}>
              Vous pouvez maintenant vous connecter avec votre nouveau compte
            </Text>
          </View>

          {/* Bouton de connexion */}
          <Pressable
            onPress={() => router.replace("/login" as any)}
            style={{ borderRadius: 12, overflow: "hidden" }}
          >
            <LinearGradient
              colors={["#7C3AED", "#2563EB"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 16, letterSpacing: 0.5 }}>
                Aller à la connexion
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

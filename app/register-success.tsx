import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { resendVerificationEmail } from "../lib/auth_client";

export default function RegisterSuccessScreen() {
  const params = useLocalSearchParams();
  const email = typeof params?.email === "string" ? params.email : "";
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResendEmail = async () => {
    setResending(true);
    setResendError(null);
    setResendSuccess(false);
    
    try {
      await resendVerificationEmail();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error: any) {
      setResendError(error?.message || "Erreur lors de l'envoi");
    } finally {
      setResending(false);
    }
  };

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
              Compte créé avec succès !
            </Text>
            <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22 }}>
              Votre compte a été créé. Un email de confirmation a été envoyé à :
            </Text>
          </View>

          {/* Email */}
          <View
            style={{
              backgroundColor: "#f3f4f6",
              padding: 16,
              borderRadius: 12,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons name="mail" size={24} color="#7C3AED" />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827", flex: 1 }}>
                {email}
              </Text>
            </View>
          </View>

          {/* Instructions */}
          <View
            style={{
              backgroundColor: "#dbeafe",
              borderLeftWidth: 4,
              borderLeftColor: "#3b82f6",
              padding: 16,
              borderRadius: 12,
              marginBottom: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <Ionicons name="information-circle" size={24} color="#1e40af" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e40af", marginBottom: 8 }}>
                  Prochaines étapes :
                </Text>
                <Text style={{ fontSize: 14, color: "#1e3a8a", lineHeight: 22 }}>
                  1. Consultez votre boîte de réception{"\n"}
                  2. Cliquez sur le lien de vérification{"\n"}
                  3. Connectez-vous à votre compte
                </Text>
              </View>
            </View>
          </View>

          {/* Note */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 12, color: "#6b7280", textAlign: "center", lineHeight: 18 }}>
              Si vous ne recevez pas l'email dans quelques minutes, vérifiez votre dossier spam ou courrier indésirable.
            </Text>
          </View>

          {/* Message de succès renvoi */}
          {resendSuccess && (
            <View
              style={{
                backgroundColor: "#d1fae5",
                borderLeftWidth: 4,
                borderLeftColor: "#10b981",
                padding: 12,
                borderRadius: 12,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={{ color: "#065f46", fontSize: 13, flex: 1 }}>Email renvoyé avec succès !</Text>
            </View>
          )}

          {/* Message d'erreur renvoi */}
          {resendError && (
            <View
              style={{
                backgroundColor: "#fee2e2",
                borderLeftWidth: 4,
                borderLeftColor: "#ef4444",
                padding: 12,
                borderRadius: 12,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="alert-circle" size={20} color="#dc2626" />
              <Text style={{ color: "#991b1b", fontSize: 13, flex: 1 }}>{resendError}</Text>
            </View>
          )}

          {/* Bouton renvoyer l'email */}
          <Pressable
            onPress={handleResendEmail}
            disabled={resending}
            style={{
              borderRadius: 12,
              borderWidth: 2,
              borderColor: "#7C3AED",
              paddingVertical: 14,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              backgroundColor: "#fff",
            }}
          >
            {resending ? (
              <ActivityIndicator size="small" color="#7C3AED" />
            ) : (
              <>
                <Ionicons name="mail-outline" size={20} color="#7C3AED" />
                <Text style={{ color: "#7C3AED", fontWeight: "700", fontSize: 15 }}>
                  Renvoyer l'email
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

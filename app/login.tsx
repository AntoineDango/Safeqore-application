import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { signInWithEmail, signInWithGoogle } from "../lib/auth_client";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      router.replace("/start");
    } catch (e: any) {
      setError(e?.message || "Échec de connexion");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!email && !!password && !loading;

  return (
    <SafeAreaView style={{ flex:1 }}>
      <LinearGradient colors={["#7C3AED", "#2563EB"]} start={{x:0, y:0}} end={{x:1, y:1}} style={{ flex:1, padding: 16, justifyContent: "center" }}>
      <View style={{ alignSelf: "center", width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 16, padding: 18, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 }}>
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: "800" }}>Login</Text>
        </View>

      {!!error && (
        <Text style={{ color: "#b91c1c", textAlign: "center" }}>{error}</Text>
      )}

      <View style={{ gap: 8 }}>
        <Text>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@exemple.com"
          style={{ borderWidth: 1, borderColor: "#d1d5db", padding: 12, borderRadius: 8, backgroundColor: "#fff" }}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text>Mot de passe</Text>
        <View style={{ position: "relative", justifyContent: "center" }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            style={{ borderWidth: 1, borderColor: "#d1d5db", padding: 12, borderRadius: 8, backgroundColor: "#fff", paddingRight: 44 }}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} style={{ position: "absolute", right: 8, height: "100%", justifyContent: "center", paddingHorizontal: 6 }}>
            {showPassword ? (
              <Ionicons name="eye-off" size={22} color="#374151" />
            ) : (
              <Ionicons name="eye" size={22} color="#374151" />)
            }
          </Pressable>
        </View>
      </View>

      <Pressable disabled={!canSubmit} onPress={onSubmit} style={{ marginTop: 12, borderRadius: 999, overflow: "hidden" }}>
        <LinearGradient
          colors={canSubmit ? ["#FF4D95", "#7C3AED", "#2563EB"] : ["#9ca3af", "#9ca3af"]}
          start={{x:0, y:0}}
          end={{x:1, y:1}}
          style={{ paddingVertical: 14, alignItems: "center" }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "white", fontWeight: "800", letterSpacing: 0.5 }}>LOGIN</Text>
          )}
        </LinearGradient>
      </Pressable>

      <View style={{ alignItems: "center", marginTop: 8 }}>
        <Text style={{ color: "#6b7280" }}>ou</Text>
      </View>

      <Pressable
        onPress={async () => {
          setError(null);
          setLoading(true);
          try {
            await signInWithGoogle();
            router.replace("/start");
          } catch (e: any) {
            setError(e?.message || "Connexion Google indisponible");
          } finally {
            setLoading(false);
          }
        }}
        style={{
          marginTop: 4,
          paddingVertical: 12,
          borderRadius: 999,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#d1d5db",
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <FontAwesome name="google" size={18} color="#DB4437" />
        <Text style={{ fontWeight: "700" }}>Continuer avec Google</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/register" as any)}
        style={{ marginTop: 12, alignItems: "center" }}
      >
        <Text style={{ color: "#2563eb" }}>Créer un compte</Text>
      </Pressable>
      </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

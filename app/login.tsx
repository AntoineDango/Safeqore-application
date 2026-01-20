import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { signInWithEmail, signInWithGoogle } from "../lib/auth_client";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SafeAreaView } from "react-native-safe-area-context";
import { getIdToken } from "../lib/auth";

export default function LoginScreen() {
  const params = useLocalSearchParams() as any;
  const prefillEmail = typeof params?.email === "string" ? params.email : "";
  const created = typeof params?.created === "string" ? params.created : undefined;
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = await getIdToken();
        if (mounted && t) router.replace("/dashboard");
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Échec de connexion");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!email && !!password && !loading;

  return (
    <SafeAreaView style={{ flex:1 }}>
      <LinearGradient 
        colors={["#7C3AED", "#2563EB"]} 
        start={{x:0, y:0}} 
        end={{x:1, y:1}} 
        style={{ flex:1 }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex:1 }}
        >
          <ScrollView 
            contentContainerStyle={{ 
              flexGrow:1, 
              justifyContent:"center", 
              padding:20 
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ 
              alignSelf:"center", 
              width:"100%", 
              maxWidth:440, 
              backgroundColor:"#fff", 
              borderRadius:24, 
              padding:32, 
              shadowColor:"#000", 
              shadowOffset:{width:0, height:8}, 
              shadowOpacity:0.15, 
              shadowRadius:24, 
              elevation:8 
            }}>
              {/* En-tête avec icône */}
              <View style={{ alignItems:"center", marginBottom:32 }}>
                <View style={{ 
                  width:72, 
                  height:72, 
                  borderRadius:36, 
                  backgroundColor:"#f3f4f6", 
                  alignItems:"center", 
                  justifyContent:"center",
                  marginBottom:16
                }}>
                  <Ionicons name="shield-checkmark" size={36} color="#7C3AED" />
                </View>
                <Text style={{ fontSize:28, fontWeight:"800", color:"#111827", marginBottom:4 }}>
                  Bienvenue sur SafeQore
                </Text>
                <Text style={{ fontSize:14, color:"#6b7280", textAlign:"center" }}>
                  Connectez-vous pour continuer
                </Text>
              </View>

              {/* Message de succès création compte */}
              {created === "1" && (
                <View style={{ 
                  backgroundColor:"#d1fae5", 
                  borderLeftWidth:4, 
                  borderLeftColor:"#10b981", 
                  padding:16, 
                  borderRadius:12, 
                  marginBottom:20,
                  flexDirection:"row",
                  alignItems:"center",
                  gap:12
                }}>
                  <Ionicons name="checkmark-circle" size={24} color="#059669" />
                  <Text style={{ color:"#065f46", flex:1, lineHeight:20 }}>
                    Compte créé avec succès ! Connectez-vous pour commencer.
                  </Text>
                </View>
              )}

              {/* Message d'erreur */}
              {!!error && (
                <View style={{ 
                  backgroundColor:"#fee2e2", 
                  borderLeftWidth:4, 
                  borderLeftColor:"#ef4444", 
                  padding:16, 
                  borderRadius:12, 
                  marginBottom:20,
                  flexDirection:"row",
                  alignItems:"center",
                  gap:12
                }}>
                  <Ionicons name="alert-circle" size={24} color="#dc2626" />
                  <Text style={{ color:"#991b1b", flex:1, lineHeight:20 }}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Formulaire */}
              <View style={{ gap:20 }}>
                {/* Email */}
                <View style={{ gap:8 }}>
                  <Text style={{ fontSize:14, fontWeight:"600", color:"#374151" }}>
                    Adresse email
                  </Text>
                  <View style={{ position:"relative" }}>
                    <Ionicons 
                      name="mail-outline" 
                      size={20} 
                      color="#9ca3af" 
                      style={{ position:"absolute", left:16, top:16, zIndex:1 }}
                    />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="vous@exemple.com"
                      placeholderTextColor="#9ca3af"
                      style={{ 
                        borderWidth:2, 
                        borderColor:"#e5e7eb", 
                        paddingVertical:14,
                        paddingLeft:48,
                        paddingRight:16,
                        borderRadius:12, 
                        backgroundColor:"#f9fafb",
                        fontSize:15,
                        color:"#111827"
                      }}
                    />
                  </View>
                </View>

                {/* Mot de passe */}
                <View style={{ gap:8 }}>
                  <Text style={{ fontSize:14, fontWeight:"600", color:"#374151" }}>
                    Mot de passe
                  </Text>
                  <View style={{ position:"relative" }}>
                    <Ionicons 
                      name="lock-closed-outline" 
                      size={20} 
                      color="#9ca3af" 
                      style={{ position:"absolute", left:16, top:16, zIndex:1 }}
                    />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#9ca3af"
                      style={{ 
                        borderWidth:2, 
                        borderColor:"#e5e7eb", 
                        paddingVertical:14,
                        paddingLeft:48,
                        paddingRight:48,
                        borderRadius:12, 
                        backgroundColor:"#f9fafb",
                        fontSize:15,
                        color:"#111827"
                      }}
                    />
                    <Pressable 
                      onPress={() => setShowPassword((v) => !v)} 
                      style={{ 
                        position:"absolute", 
                        right:12, 
                        height:"100%", 
                        justifyContent:"center", 
                        paddingHorizontal:8 
                      }}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={22} 
                        color="#6b7280" 
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Bouton de connexion */}
                <Pressable 
                  disabled={!canSubmit} 
                  onPress={onSubmit} 
                  style={{ marginTop:8, borderRadius:12, overflow:"hidden" }}
                >
                  <LinearGradient
                    colors={canSubmit ? ["#7C3AED", "#2563EB"] : ["#d1d5db", "#9ca3af"]}
                    start={{x:0, y:0}}
                    end={{x:1, y:0}}
                    style={{ 
                      paddingVertical:16, 
                      alignItems:"center",
                      flexDirection:"row",
                      justifyContent:"center",
                      gap:8
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={{ 
                          color:"white", 
                          fontWeight:"700", 
                          fontSize:16,
                          letterSpacing:0.5 
                        }}>
                          Se connecter
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Divider */}
              <View style={{ 
                flexDirection:"row", 
                alignItems:"center", 
                marginVertical:24 
              }}>
                <View style={{ flex:1, height:1, backgroundColor:"#e5e7eb" }} />
                <Text style={{ 
                  marginHorizontal:16, 
                  color:"#9ca3af", 
                  fontSize:13,
                  fontWeight:"500" 
                }}>
                  OU
                </Text>
                <View style={{ flex:1, height:1, backgroundColor:"#e5e7eb" }} />
              </View>

              {/* Bouton Google */}
              <Pressable
                onPress={async () => {
                  setError(null);
                  setLoading(true);
                  try {
                    await signInWithGoogle();
                    router.replace("/dashboard");
                  } catch (e: any) {
                    setError(e?.message || "Connexion Google indisponible");
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{
                  paddingVertical:14,
                  borderRadius:12,
                  backgroundColor:"#fff",
                  borderWidth:2,
                  borderColor:"#e5e7eb",
                  alignItems:"center",
                  flexDirection:"row",
                  justifyContent:"center",
                  gap:12,
                }}
              >
                <FontAwesome name="google" size={20} color="#DB4437" />
                <Text style={{ fontWeight:"600", fontSize:15, color:"#374151" }}>
                  Continuer avec Google
                </Text>
              </Pressable>

              {/* Lien vers inscription */}
              <View style={{ 
                marginTop:24, 
                alignItems:"center",
                flexDirection:"row",
                justifyContent:"center",
                gap:4
              }}>
                <Text style={{ color:"#6b7280", fontSize:14 }}>
                  Pas encore de compte ?
                </Text>
                <Pressable onPress={() => router.push("/register" as any)}>
                  <Text style={{ 
                    color:"#7C3AED", 
                    fontWeight:"700",
                    fontSize:14
                  }}>
                    Créer un compte
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}
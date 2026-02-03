import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { signUpWithEmail, signInWithGoogle } from "../lib/auth_client";
import { completeProfile } from "../lib/api";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SafeAreaView } from "react-native-safe-area-context";
import { getIdToken } from "../lib/auth";

export default function RegisterScreen() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [fonction, setFonction] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = await getIdToken();
        if (mounted && t) {
          const isMobile = Platform.OS === "ios" || Platform.OS === "android";
          router.replace(isMobile ? "/(tabs)" : "/dashboard");
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const onSubmit = async () => {
    setError(null);
    
    // Validation côté client
    if (!nom.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    
    if (!prenom.trim()) {
      setError("Le prénom est obligatoire.");
      return;
    }
    
    if (!fonction.trim()) {
      setError("La fonction est obligatoire.");
      return;
    }
    
    if (!entreprise.trim()) {
      setError("L'entreprise/entité est obligatoire.");
      return;
    }
    
    if (!email.trim()) {
      setError("L'email est obligatoire.");
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setError("Format d'email invalide. Veuillez vérifier votre adresse email.");
      return;
    }
    
    if (!password) {
      setError("Le mot de passe est obligatoire.");
      return;
    }
    
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    
    setLoading(true);
    try {
      // Créer le compte Firebase
      await signUpWithEmail(email.trim(), password);
      
      // Attendre un peu pour que le token soit disponible
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Envoyer les informations supplémentaires au backend
      try {
        await completeProfile({
          nom: nom.trim(),
          prenom: prenom.trim(),
          fonction: fonction.trim(),
          entreprise: entreprise.trim()
        });
        console.log("[Register] Profile completed successfully");
      } catch (profileError: any) {
        console.error("[Register] Failed to complete profile:", profileError);
        // Ne pas bloquer l'inscription si l'API échoue
        // L'utilisateur pourra compléter son profil plus tard
      }
      
      // Rediriger vers la page de confirmation
      router.replace({ 
        pathname: "/register-success", 
        params: { email } 
      } as any);
    } catch (e: any) {
      setError(e?.message || "Échec de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!nom && !!prenom && !!fonction && !!entreprise && !!email && !!password && password.length >= 6 && password === confirm && !loading;
  const passwordStrength = password.length >= 8 ? "forte" : password.length >= 6 ? "moyenne" : "faible";
  const strengthColor = passwordStrength === "forte" ? "#10b981" : passwordStrength === "moyenne" ? "#f59e0b" : "#ef4444";

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
                  <Ionicons name="person-add" size={36} color="#7C3AED" />
                </View>
                <Text style={{ fontSize:28, fontWeight:"800", color:"#111827", marginBottom:4 }}>
                  Créer un compte
                </Text>
                <Text style={{ fontSize:14, color:"#6b7280", textAlign:"center" }}>
                  Rejoignez SafeQore et commencez vos analyses
                </Text>
              </View>

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
                {/* Nom */}
                <View style={{ gap:8 }}>
                  <Text style={{ fontSize:14, fontWeight:"600", color:"#374151" }}>
                    Nom <Text style={{ color:"#ef4444" }}>*</Text>
                  </Text>
                  <View style={{ position:"relative" }}>
                    <Ionicons 
                      name="person-outline" 
                      size={20} 
                      color="#9ca3af" 
                      style={{ position:"absolute", left:16, top:16, zIndex:1 }}
                    />
                    <TextInput
                      value={nom}
                      onChangeText={setNom}
                      placeholder="Votre nom"
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

                {/* Prénom */}
                <View style={{ gap:8 }}>
                  <Text style={{ fontSize:14, fontWeight:"600", color:"#374151" }}>
                    Prénom <Text style={{ color:"#ef4444" }}>*</Text>
                  </Text>
                  <View style={{ position:"relative" }}>
                    <Ionicons 
                      name="person-outline" 
                      size={20} 
                      color="#9ca3af" 
                      style={{ position:"absolute", left:16, top:16, zIndex:1 }}
                    />
                    <TextInput
                      value={prenom}
                      onChangeText={setPrenom}
                      placeholder="Votre prénom"
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

                {/* Fonction */}
                <View style={{ gap:8 }}>
                  <Text style={{ fontSize:14, fontWeight:"600", color:"#374151" }}>
                    Fonction <Text style={{ color:"#ef4444" }}>*</Text>
                  </Text>
                  <View style={{ position:"relative" }}>
                    <Ionicons 
                      name="briefcase-outline" 
                      size={20} 
                      color="#9ca3af" 
                      style={{ position:"absolute", left:16, top:16, zIndex:1 }}
                    />
                    <TextInput
                      value={fonction}
                      onChangeText={setFonction}
                      placeholder="Ex: Responsable Qualité"
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

                {/* Entreprise */}
                <View style={{ gap:8 }}>
                  <Text style={{ fontSize:14, fontWeight:"600", color:"#374151" }}>
                    Entreprise / Entité <Text style={{ color:"#ef4444" }}>*</Text>
                  </Text>
                  <View style={{ position:"relative" }}>
                    <Ionicons 
                      name="business-outline" 
                      size={20} 
                      color="#9ca3af" 
                      style={{ position:"absolute", left:16, top:16, zIndex:1 }}
                    />
                    <TextInput
                      value={entreprise}
                      onChangeText={setEntreprise}
                      placeholder="Nom de votre entreprise"
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

                {/* Email */}
                <View style={{ gap:8 }}>
                  <Text style={{ fontSize:14, fontWeight:"600", color:"#374151" }}>
                    Adresse email <Text style={{ color:"#ef4444" }}>*</Text>
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
                      placeholder="Minimum 6 caractères"
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
                  
                  {/* Indicateur de force du mot de passe */}
                  {password.length > 0 && (
                    <View style={{ gap:6 }}>
                      <View style={{ flexDirection:"row", gap:4 }}>
                        <View style={{ 
                          flex:1, 
                          height:4, 
                          borderRadius:2, 
                          backgroundColor: password.length >= 1 ? strengthColor : "#e5e7eb" 
                        }} />
                        <View style={{ 
                          flex:1, 
                          height:4, 
                          borderRadius:2, 
                          backgroundColor: password.length >= 6 ? strengthColor : "#e5e7eb" 
                        }} />
                        <View style={{ 
                          flex:1, 
                          height:4, 
                          borderRadius:2, 
                          backgroundColor: password.length >= 8 ? strengthColor : "#e5e7eb" 
                        }} />
                      </View>
                      <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
                        <Ionicons 
                          name={password.length >= 6 ? "checkmark-circle" : "alert-circle"} 
                          size={16} 
                          color={password.length >= 6 ? "#10b981" : "#f59e0b"} 
                        />
                        <Text style={{ fontSize:12, color:"#6b7280" }}>
                          Force: <Text style={{ fontWeight:"600", color:strengthColor }}>{passwordStrength}</Text>
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Confirmation mot de passe */}
                <View style={{ gap:8 }}>
                  <Text style={{ fontSize:14, fontWeight:"600", color:"#374151" }}>
                    Confirmer le mot de passe
                  </Text>
                  <View style={{ position:"relative" }}>
                    <Ionicons 
                      name="lock-closed-outline" 
                      size={20} 
                      color="#9ca3af" 
                      style={{ position:"absolute", left:16, top:16, zIndex:1 }}
                    />
                    <TextInput
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry={!showConfirm}
                      placeholder="Confirmez votre mot de passe"
                      placeholderTextColor="#9ca3af"
                      style={{ 
                        borderWidth:2, 
                        borderColor: confirm && confirm !== password ? "#fca5a5" : "#e5e7eb", 
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
                      onPress={() => setShowConfirm((v) => !v)} 
                      style={{ 
                        position:"absolute", 
                        right:12, 
                        height:"100%", 
                        justifyContent:"center", 
                        paddingHorizontal:8 
                      }}
                    >
                      <Ionicons 
                        name={showConfirm ? "eye-off-outline" : "eye-outline"} 
                        size={22} 
                        color="#6b7280" 
                      />
                    </Pressable>
                  </View>
                  {confirm && confirm !== password && (
                    <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
                      <Ionicons name="close-circle" size={16} color="#ef4444" />
                      <Text style={{ fontSize:12, color:"#ef4444" }}>
                        Les mots de passe ne correspondent pas
                      </Text>
                    </View>
                  )}
                  {confirm && confirm === password && password.length >= 6 && (
                    <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={{ fontSize:12, color:"#10b981" }}>
                        Les mots de passe correspondent
                      </Text>
                    </View>
                  )}
                </View>

                {/* Bouton d'inscription */}
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
                          Créer mon compte
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
                    const isMobile = Platform.OS === "ios" || Platform.OS === "android";
                    router.replace(isMobile ? "/(tabs)" : "/dashboard");
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
                  S'inscrire avec Google
                </Text>
              </Pressable>

              {/* Lien vers connexion */}
              <View style={{ 
                marginTop:24, 
                alignItems:"center",
                flexDirection:"row",
                justifyContent:"center",
                gap:4
              }}>
                <Text style={{ color:"#6b7280", fontSize:14 }}>
                  Déjà un compte ?
                </Text>
                <Pressable onPress={() => router.push("/login" as any)}>
                  <Text style={{ 
                    color:"#7C3AED", 
                    fontWeight:"700",
                    fontSize:14
                  }}>
                    Se connecter
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
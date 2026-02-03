import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView, Linking, Alert, Modal, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { getUserAnalysis, getReportUrl, deleteUserAnalysis } from "../lib/api";
import type { QuestionnaireAnalyzeResponse } from "../lib/types";
import { useAuthGuard } from "../lib/guard";

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={{ alignSelf:"flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ color, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function ScorePill({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ flex: 1, height: 12, backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: 12, backgroundColor: pct >= 70 ? "#f59e0b" : pct >= 40 ? "#3b82f6" : "#10b981" }} />
      </View>
      <Text style={{ fontWeight: "700", color: "#111827", fontSize: 18 }}>{pct}/100</Text>
    </View>
  );
}

export default function AnalysisDetailsScreen() {
  const { loading: authLoading, authenticated } = useAuthGuard();
  const params = useLocalSearchParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<QuestionnaireAnalyzeResponse | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authenticated || !id) return;
    
    (async () => {
      try {
        const data = await getUserAnalysis(id);
        setAnalysis(data);
      } catch (e: any) {
        setError(e?.message || "Impossible de charger l'analyse");
      } finally {
        setLoading(false);
      }
    })();
  }, [authenticated, id]);

  const classBadge = (cls?: string) => {
    const s = (cls || "").toLowerCase();
    if (s.includes("élev") || s.includes("eleve")) return { bg: "#fef3c7", color: "#92400e", label: "Élevé" };
    if (s.includes("mod")) return { bg: "#dbeafe", color: "#1e40af", label: "Modéré" };
    return { bg: "#d1fae5", color: "#065f46", label: "Faible" };
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setDeleting(true);
    try {
      await deleteUserAnalysis(id);
      setShowDeleteModal(false);
      // Retour au dashboard après suppression
      const isMobile = Platform.OS === "ios" || Platform.OS === "android";
      router.replace(isMobile ? "/(tabs)" : "/dashboard");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de supprimer l'analyse");
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ marginTop: 16, color: "#6b7280" }}>Chargement de l'analyse...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", padding: 16 }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Erreur</Text>
          <Text style={{ color: "#6b7280", textAlign: "center" }}>{error}</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "#7C3AED" }}>
            <Text style={{ color: "white", fontWeight: "600" }}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!analysis) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", padding: 16 }}>
        <Text style={{ color: "#6b7280" }}>Analyse introuvable</Text>
      </SafeAreaView>
    );
  }

  const badge = classBadge(analysis.classification);
  const scoreNormalized = (analysis as any).normalized_score_100 ?? Math.round((analysis.score / 125) * 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827" }}>Détails de l'analyse</Text>
            <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{new Date(analysis.timestamp).toLocaleString()}</Text>
          </View>
        </View>

        {/* Classification Card */}
        <LinearGradient 
          colors={badge.label === "Élevé" ? ["#f59e0b", "#ef4444"] : badge.label === "Modéré" ? ["#3b82f6", "#60a5fa"] : ["#10b981", "#34d399"]} 
          start={{x:0, y:0}} 
          end={{x:1, y:1}} 
          style={{ padding: 20, borderRadius: 16, marginBottom: 16 }}
        >
          <Text style={{ color: "#e5e7eb", fontSize: 14, marginBottom: 4 }}>Classification</Text>
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800" }}>{badge.label}</Text>
          <View style={{ marginTop: 12, backgroundColor: "rgba(255,255,255,0.2)", height: 1 }} />
          <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: "#e5e7eb", fontSize: 12 }}>Gravité</Text>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>{analysis.G}</Text>
            </View>
            <View>
              <Text style={{ color: "#e5e7eb", fontSize: 12 }}>Fréquence</Text>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>{analysis.F}</Text>
            </View>
            <View>
              <Text style={{ color: "#e5e7eb", fontSize: 12 }}>Probabilité</Text>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>{analysis.P}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Score Card */}
        <View style={{ padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 }}>Score de risque</Text>
          <ScorePill score={scoreNormalized} />
        </View>

        {/* Description */}
        <View style={{ padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Description</Text>
          <Text style={{ color: "#374151", lineHeight: 22 }}>{analysis.description}</Text>
        </View>

        {/* Metadata */}
        <View style={{ padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 }}>Informations</Text>
          
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#6b7280" }}>Catégorie</Text>
              <Badge label={analysis.category} bg="#eef2ff" color="#3730a3" />
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#6b7280" }}>Type</Text>
              <Badge label={analysis.type} bg="#f3f4f6" color="#374151" />
            </View>
            
            {analysis.sector && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#6b7280" }}>Secteur</Text>
                <Text style={{ color: "#111827", fontWeight: "600" }}>{analysis.sector}</Text>
              </View>
            )}
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#6b7280" }}>ID</Text>
              <Text style={{ color: "#111827", fontWeight: "600", fontSize: 12 }}>{analysis.id}</Text>
            </View>
          </View>
        </View>

        {/* Justification */}
        {analysis.justification && (
          <View style={{ padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Justification</Text>
            <Text style={{ color: "#374151", lineHeight: 22 }}>{analysis.justification}</Text>
          </View>
        )}

        {/* Causes */}
        {analysis.causes && analysis.causes.length > 0 && (
          <View style={{ padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Causes identifiées</Text>
            {analysis.causes.map((cause, idx) => (
              <View key={idx} style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <Text style={{ color: "#7C3AED", fontWeight: "700" }}>•</Text>
                <Text style={{ flex: 1, color: "#374151", lineHeight: 22 }}>{cause}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <View style={{ padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Recommandations</Text>
            {analysis.recommendations.map((rec, idx) => (
              <View key={idx} style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <Text style={{ color: "#10b981", fontWeight: "700" }}>✓</Text>
                <Text style={{ flex: 1, color: "#374151", lineHeight: 22 }}>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={{ gap: 12, marginBottom: 20 }}>
          <Pressable
            onPress={() => Linking.openURL(getReportUrl(analysis.id))}
            style={{ borderRadius: 12, overflow: "hidden" }}
          >
            <LinearGradient colors={["#7C3AED", "#2563EB"]} start={{x:0, y:0}} end={{x:1, y:1}} style={{ paddingVertical: 14, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Ionicons name="download" size={20} color="#fff" />
              <Text style={{ color: "white", fontWeight: "700" }}>Télécharger le rapport Word</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.push("/compare")}
            style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "#fff", borderWidth: 2, borderColor: "#7C3AED", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="git-compare" size={20} color="#7C3AED" />
            <Text style={{ color: "#7C3AED", fontWeight: "700" }}>Comparer avec l'IA</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              const isMobile = Platform.OS === "ios" || Platform.OS === "android";
              router.push(isMobile ? "/(tabs)" : "/dashboard");
            }}
            style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "#f3f4f6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="home" size={20} color="#374151" />
            <Text style={{ color: "#374151", fontWeight: "600" }}>Retour au dashboard</Text>
          </Pressable>

          {/* Bouton de suppression */}
          <Pressable
            onPress={() => setShowDeleteModal(true)}
            style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fecaca", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="trash" size={20} color="#dc2626" />
            <Text style={{ color: "#dc2626", fontWeight: "700" }}>Supprimer cette analyse</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal de confirmation de suppression */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 }}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Ionicons name="warning" size={32} color="#dc2626" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", textAlign: "center" }}>Supprimer cette analyse ?</Text>
            </View>

            <Text style={{ color: "#6b7280", textAlign: "center", marginBottom: 24, lineHeight: 22 }}>
              Cette action est irréversible. Toutes les données de cette analyse seront définitivement supprimées.
            </Text>

            <View style={{ gap: 12 }}>
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: "#dc2626", alignItems: "center" }}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Oui, supprimer</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center" }}
              >
                <Text style={{ color: "#374151", fontWeight: "600", fontSize: 16 }}>Annuler</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

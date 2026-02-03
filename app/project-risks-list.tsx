import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useAnalysis } from "../context/AnalysisContext";
import { useAuthGuard } from "../lib/guard";

export default function ProjectRisksListScreen() {
  useAuthGuard();
  const { state, setCurrentRiskIndex } = useAnalysis();

  // Redirection si données manquantes
  useEffect(() => {
    if (!state.analysisTitle) {
      router.replace("/start");
    }
  }, [state.analysisTitle]);

  if (!state.analysisTitle) {
    return null;
  }

  const handleAddRisk = () => {
    setCurrentRiskIndex(state.risks.length);
    router.push("/risk");
  };

  const handleEditRisk = (index: number) => {
    setCurrentRiskIndex(index);
    router.push("/risk");
  };

  const handleContinue = () => {
    if (state.risks.length < 4) {
      Alert.alert("Attention", "Vous devez ajouter au moins 4 risques avant de continuer.");
      return;
    }

    // Vérifier que tous les risques ont été évalués (ont un résultat)
    const incompleteRisk = state.risks.find(r => !r.userResult);
    if (incompleteRisk) {
      Alert.alert("Attention", "Tous les risques doivent être évalués avant de continuer.");
      return;
    }

    // Passer à l'écran des mesures
    router.push("/project-measures");
  };

  const getRiskLevelColor = (level?: string) => {
    if (level === "Élevé") return { bg: "#fef3c7", color: "#92400e" };
    if (level === "Modéré" || level === "Moyen") return { bg: "#dbeafe", color: "#1e40af" };
    return { bg: "#d1fae5", color: "#065f46" };
  };

  const canContinue = state.risks.length >= 4 && state.risks.every(r => r.userResult);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#fff" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8, borderRadius: 12, backgroundColor: "#f3f4f6" }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>{state.analysisTitle}</Text>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>Étape 2/3 : Identification des risques</Text>
          </View>
        </View>

        {/* Progression */}
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>
              {state.risks.length} / 4 risques minimum
            </Text>
            <Text style={{ fontSize: 12, color: state.risks.length >= 4 ? "#10b981" : "#f59e0b" }}>
              {state.risks.length >= 4 ? "✓ Prêt" : "En cours"}
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
            <View
              style={{
                width: `${Math.min(100, (state.risks.length / 4) * 100)}%`,
                height: 8,
                backgroundColor: state.risks.length >= 4 ? "#10b981" : "#f59e0b",
              }}
            />
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Info box */}
        <View style={{ marginBottom: 16, padding: 16, borderRadius: 12, backgroundColor: "#eff6ff", borderLeftWidth: 4, borderLeftColor: "#3b82f6" }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Ionicons name="information-circle" size={24} color="#3b82f6" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: "#1e40af", marginBottom: 4 }}>
                Identification des risques
              </Text>
              <Text style={{ color: "#1e3a8a", lineHeight: 20 }}>
                Décrivez au moins 4 risques liés à votre projet.
              </Text>
            </View>
          </View>
        </View>

        {/* Liste des risques */}
        {state.risks.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 12 }}>
              Risques identifiés ({state.risks.length})
            </Text>
            <View style={{ gap: 12 }}>
              {state.risks.map((risk, idx) => {
                const hasResult = !!risk.userResult;
                const levelColors = hasResult ? getRiskLevelColor(risk.userResult?.classification as string) : { bg: "#f3f4f6", color: "#6b7280" };

                return (
                  <Pressable
                    key={risk.id}
                    onPress={() => handleEditRisk(idx)}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      backgroundColor: "#fff",
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827", marginBottom: 4 }}>
                          Risque #{idx + 1}
                        </Text>
                        <Text style={{ color: "#374151", lineHeight: 20 }}>{risk.description}</Text>
                      </View>
                      {hasResult && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
                    </View>

                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#eef2ff" }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#3730a3" }}>{risk.category}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#f3f4f6" }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>{risk.type}</Text>
                      </View>
                      {hasResult && (
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: levelColors.bg }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: levelColors.color }}>
                            {risk.userResult?.classification}
                          </Text>
                        </View>
                      )}
                    </View>

                    {hasResult && (
                      <View style={{ marginTop: 12, flexDirection: "row", gap: 16 }}>
                        <View>
                          <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Gravité</Text>
                          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>{risk.userResult?.G}/5</Text>
                        </View>
                        <View>
                          <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Fréquence</Text>
                          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>{risk.userResult?.F}/5</Text>
                        </View>
                        <View>
                          <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Probabilité</Text>
                          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>{risk.userResult?.P}/5</Text>
                        </View>
                        <View>
                          <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Score</Text>
                          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
                            {(risk.userResult?.G || 0) * (risk.userResult?.F || 0) * (risk.userResult?.P || 0)}/125
                          </Text>
                        </View>
                      </View>
                    )}

                    {!hasResult && (
                      <View style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: "#fef3c7" }}>
                        <Text style={{ fontSize: 12, color: "#92400e", fontWeight: "600" }}>
                          ⚠️ Évaluation en attente - Cliquez pour évaluer
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Bouton d'ajout */}
        <Pressable
          onPress={handleAddRisk}
          style={{
            padding: 16,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: "#7C3AED",
            borderStyle: "dashed",
            backgroundColor: "#faf5ff",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="add-circle" size={32} color="#7C3AED" />
          <Text style={{ marginTop: 8, fontWeight: "700", color: "#7C3AED" }}>Ajouter un risque</Text>
        </Pressable>

        {/* Bouton continuer */}
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={{ borderRadius: 12, overflow: "hidden", marginBottom: 20 }}
        >
          <LinearGradient
            colors={canContinue ? ["#7C3AED", "#2563EB"] : ["#9ca3af", "#6b7280"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
              Continuer vers les mesures
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

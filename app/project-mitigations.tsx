import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthGuard } from "../lib/guard";
import { getProject, updateRiskMitigation } from "../lib/api";
import type { AnalysisProject, RiskItem } from "../lib/types";

export default function ProjectMitigationsScreen() {
  const { loading: authLoading, authenticated } = useAuthGuard();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<AnalysisProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentRiskIndex, setCurrentRiskIndex] = useState(0);
  const [mitigationMeasure, setMitigationMeasure] = useState("");
  const [residualG, setResidualG] = useState<number>(2);
  const [residualF, setResidualF] = useState<number>(2);
  const [residualP, setResidualP] = useState<number>(2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authenticated || !projectId) return;

    loadProject();
  }, [authenticated, projectId]);

  const loadProject = async () => {
    try {
      const proj = await getProject(projectId);
      setProject(proj);

      // Trouver le premier risque sans mesure
      const firstIncomplete = proj.risks.findIndex((r) => !r.residual_evaluation);
      if (firstIncomplete !== -1) {
        setCurrentRiskIndex(firstIncomplete);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMitigation = async () => {
    if (!project || !mitigationMeasure.trim()) return;

    const currentRisk = project.risks[currentRiskIndex];
    if (!currentRisk) return;

    setSaving(true);
    setError(null);

    try {
      await updateRiskMitigation({
        project_id: projectId,
        risk_id: currentRisk.id,
        mitigation_measure: mitigationMeasure.trim(),
        residual_G: residualG,
        residual_F: residualF,
        residual_P: residualP,
      });

      // Recharger le projet
      await loadProject();

      // Passer au risque suivant ou terminer
      const nextIncomplete = project.risks.findIndex((r, idx) => idx > currentRiskIndex && !r.residual_evaluation);
      if (nextIncomplete !== -1) {
        setCurrentRiskIndex(nextIncomplete);
        setMitigationMeasure("");
        setResidualG(2);
        setResidualF(2);
        setResidualP(2);
      } else {
        // Tous les risques sont complétés
        Alert.alert(
          "Projet complété !",
          "Toutes les mesures ont été enregistrées. Vous pouvez maintenant consulter le projet depuis le dashboard.",
          [
            {
              text: "Retour au dashboard",
              onPress: () => router.replace("/(tabs)"),
            },
          ]
        );
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (!project) return;

    const nextIncomplete = project.risks.findIndex((r, idx) => idx > currentRiskIndex && !r.residual_evaluation);
    if (nextIncomplete !== -1) {
      setCurrentRiskIndex(nextIncomplete);
      setMitigationMeasure("");
      setResidualG(2);
      setResidualF(2);
      setResidualP(2);
    } else {
      Alert.alert("Information", "Tous les autres risques ont déjà été traités.");
    }
  };

  const getRiskLevelColor = (level: string) => {
    if (level === "Élevé") return { bg: "#fef3c7", color: "#92400e" };
    if (level === "Moyen") return { bg: "#dbeafe", color: "#1e40af" };
    return { bg: "#d1fae5", color: "#065f46" };
  };

  const calculateResidualLevel = (score: number): string => {
    if (score <= 25) return "Faible";
    if (score <= 50) return "Moyen";
    return "Élevé";
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ marginTop: 16, color: "#6b7280" }}>Chargement du projet...</Text>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", padding: 16 }}>
        <Text style={{ color: "#ef4444" }}>Projet introuvable</Text>
      </SafeAreaView>
    );
  }

  const currentRisk = project.risks[currentRiskIndex];
  if (!currentRisk) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", padding: 16 }}>
        <Text style={{ color: "#6b7280" }}>Aucun risque à traiter</Text>
      </SafeAreaView>
    );
  }

  const completedCount = project.risks.filter((r) => r.residual_evaluation !== null).length;
  const totalCount = project.risks.length;
  const residualScore = residualG * residualF * residualP;
  const residualLevel = calculateResidualLevel(residualScore);
  const residualColors = getRiskLevelColor(residualLevel);
  const initialColors = getRiskLevelColor(currentRisk.initial_evaluation.level);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#fff" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8, borderRadius: 12, backgroundColor: "#f3f4f6" }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>{project.analysis_title}</Text>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>Étape 3/3 : Mesures et risques résiduels</Text>
          </View>
        </View>

        {/* Progression */}
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>
              {completedCount} / {totalCount} risques traités
            </Text>
            <Text style={{ fontSize: 12, color: completedCount === totalCount ? "#10b981" : "#f59e0b" }}>
              {completedCount === totalCount ? "✓ Terminé" : "En cours"}
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
            <View
              style={{
                width: `${(completedCount / totalCount) * 100}%`,
                height: 8,
                backgroundColor: completedCount === totalCount ? "#10b981" : "#f59e0b",
              }}
            />
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Risque actuel */}
        <View style={{ marginBottom: 16, padding: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
              Risque #{currentRiskIndex + 1} / {totalCount}
            </Text>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: initialColors.bg }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: initialColors.color }}>
                {currentRisk.initial_evaluation.level}
              </Text>
            </View>
          </View>

          <Text style={{ color: "#374151", lineHeight: 22, marginBottom: 12 }}>{currentRisk.description}</Text>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#eef2ff" }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#3730a3" }}>{currentRisk.category}</Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#f3f4f6" }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>{currentRisk.type}</Text>
            </View>
          </View>

          <View style={{ padding: 12, borderRadius: 8, backgroundColor: "#f9fafb" }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#6b7280", marginBottom: 8 }}>Évaluation initiale</Text>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View>
                <Text style={{ fontSize: 10, color: "#6b7280" }}>G</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{currentRisk.initial_evaluation.G}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: "#6b7280" }}>F</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{currentRisk.initial_evaluation.F}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: "#6b7280" }}>P</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{currentRisk.initial_evaluation.P}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: "#6b7280" }}>Score</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{currentRisk.initial_evaluation.score}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Mesure de contournement */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
            Solution de contournement / Mesure <Text style={{ color: "#ef4444" }}>*</Text>
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
            Proposez une mesure pour réduire ou éliminer ce risque
          </Text>
          <TextInput
            value={mitigationMeasure}
            onChangeText={setMitigationMeasure}
            placeholder="Ex: Mise en place d'un système de sauvegarde automatique..."
            multiline
            numberOfLines={4}
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 12,
              padding: 12,
              backgroundColor: "#fff",
              minHeight: 100,
              textAlignVertical: "top",
            }}
          />
          <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            {mitigationMeasure.length}/500 caractères (min. 10)
          </Text>
        </View>

        {/* Évaluation résiduelle */}
        <View style={{ marginBottom: 16, padding: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
            Évaluation après mesure (risque résiduel)
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
            Réévaluez le risque après application de la mesure
          </Text>

          {/* Gravité résiduelle */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Gravité (G): {residualG}/5</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((val) => (
                <Pressable
                  key={val}
                  onPress={() => setResidualG(val)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: residualG === val ? "#10b981" : "#d1d5db",
                    backgroundColor: residualG === val ? "#d1fae5" : "#fff",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: residualG === val ? "#065f46" : "#374151" }}>{val}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Fréquence résiduelle */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Fréquence (F): {residualF}/5</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((val) => (
                <Pressable
                  key={val}
                  onPress={() => setResidualF(val)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: residualF === val ? "#10b981" : "#d1d5db",
                    backgroundColor: residualF === val ? "#d1fae5" : "#fff",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: residualF === val ? "#065f46" : "#374151" }}>{val}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Probabilité résiduelle */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Probabilité (P): {residualP}/5</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((val) => (
                <Pressable
                  key={val}
                  onPress={() => setResidualP(val)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: residualP === val ? "#10b981" : "#d1d5db",
                    backgroundColor: residualP === val ? "#d1fae5" : "#fff",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: residualP === val ? "#065f46" : "#374151" }}>{val}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Score résiduel calculé */}
          <View style={{ padding: 12, borderRadius: 8, backgroundColor: residualColors.bg }}>
            <Text style={{ fontSize: 12, color: residualColors.color, marginBottom: 4 }}>Score résiduel (G × F × P)</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: residualColors.color }}>{residualScore}/125</Text>
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.5)" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: residualColors.color }}>{residualLevel}</Text>
              </View>
            </View>
          </View>

          {/* Comparaison */}
          {residualScore < currentRisk.initial_evaluation.score && (
            <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: "#d1fae5", flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={{ flex: 1, color: "#065f46", fontWeight: "600" }}>
                Réduction du risque : {currentRisk.initial_evaluation.score - residualScore} points
              </Text>
            </View>
          )}
        </View>

        {/* Erreur */}
        {error && (
          <View style={{ marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: "#fee2e2", borderLeftWidth: 4, borderLeftColor: "#ef4444" }}>
            <Text style={{ color: "#991b1b", fontWeight: "600" }}>{error}</Text>
          </View>
        )}

        {/* Boutons */}
        <View style={{ gap: 12, marginBottom: 20 }}>
          <Pressable
            onPress={handleSaveMitigation}
            disabled={mitigationMeasure.trim().length < 10 || saving}
            style={{ borderRadius: 12, overflow: "hidden" }}
          >
            <LinearGradient
              colors={mitigationMeasure.trim().length >= 10 && !saving ? ["#10b981", "#059669"] : ["#9ca3af", "#6b7280"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                    Enregistrer et continuer
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={handleSkip}
            disabled={saving}
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: "#f3f4f6",
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "600", color: "#374151" }}>Passer au suivant</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

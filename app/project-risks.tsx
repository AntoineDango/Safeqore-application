import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, Modal } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthGuard } from "../lib/guard";
import { getProject, addRiskToProject, deleteRiskFromProject, getConstants } from "../lib/api";
import type { AnalysisProject, Category, RiskType, RiskItem } from "../lib/types";

export default function ProjectRisksScreen() {
  const { loading: authLoading, authenticated } = useAuthGuard();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<AnalysisProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<RiskType[]>([]);

  // Formulaire d'ajout de risque
  const [showAddForm, setShowAddForm] = useState(false);
  const [riskDescription, setRiskDescription] = useState("");
  const [riskCategory, setRiskCategory] = useState<Category | undefined>(undefined);
  const [riskType, setRiskType] = useState<RiskType | undefined>(undefined);
  const [G, setG] = useState<number>(3);
  const [F, setF] = useState<number>(3);
  const [P, setP] = useState<number>(3);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!authenticated || !projectId) return;

    (async () => {
      try {
        const [proj, constants] = await Promise.all([
          getProject(projectId),
          getConstants(),
        ]);
        setProject(proj);
        setCategories(constants.categories as Category[]);
        setTypes(constants.types as RiskType[]);
      } catch (e: any) {
        setError(e?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [authenticated, projectId]);

  const loadProject = async () => {
    try {
      const proj = await getProject(projectId);
      setProject(proj);
    } catch (e: any) {
      setError(e?.message || "Erreur de rechargement");
    }
  };

  const handleAddRisk = async () => {
    if (!riskDescription.trim() || !riskCategory || !riskType) return;

    setAdding(true);
    setError(null);

    try {
      await addRiskToProject({
        project_id: projectId,
        description: riskDescription.trim(),
        category: riskCategory,
        type: riskType,
        G,
        F,
        P,
      });

      // Recharger le projet
      await loadProject();

      // Réinitialiser le formulaire
      setRiskDescription("");
      setRiskCategory(undefined);
      setRiskType(undefined);
      setG(3);
      setF(3);
      setP(3);
      setShowAddForm(false);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'ajout du risque");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    Alert.alert(
      "Supprimer ce risque ?",
      "Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRiskFromProject(projectId, riskId);
              await loadProject();
            } catch (e: any) {
              Alert.alert("Erreur", e?.message || "Impossible de supprimer le risque");
            }
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (!project || project.risks.length < 4) {
      Alert.alert("Attention", "Vous devez ajouter au moins 4 risques avant de continuer.");
      return;
    }

    // Naviguer vers l'écran des mesures
    router.push({
      pathname: "/project-mitigations",
      params: { projectId: project.id },
    } as any);
  };

  const getRiskLevelColor = (level: string) => {
    if (level === "Élevé") return { bg: "#fef3c7", color: "#92400e" };
    if (level === "Moyen") return { bg: "#dbeafe", color: "#1e40af" };
    return { bg: "#d1fae5", color: "#065f46" };
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

  const canContinue = project.risks.length >= 4;

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
            <Text style={{ fontSize: 12, color: "#6b7280" }}>Étape 2/3 : Identification des risques</Text>
          </View>
        </View>

        {/* Progression */}
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>
              {project.risks.length} / 4 risques minimum
            </Text>
            <Text style={{ fontSize: 12, color: project.risks.length >= 4 ? "#10b981" : "#f59e0b" }}>
              {project.risks.length >= 4 ? "✓ Prêt" : "En cours"}
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
            <View
              style={{
                width: `${Math.min(100, (project.risks.length / 4) * 100)}%`,
                height: 8,
                backgroundColor: project.risks.length >= 4 ? "#10b981" : "#f59e0b",
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
                Décrivez au moins 4 risques liés à votre projet. Pour chaque risque, choisissez une catégorie, un type, et évaluez sa gravité (G), fréquence (F) et probabilité (P).
              </Text>
            </View>
          </View>
        </View>

        {/* Liste des risques */}
        {project.risks.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 12 }}>
              Risques identifiés ({project.risks.length})
            </Text>
            <View style={{ gap: 12 }}>
              {project.risks.map((risk, idx) => {
                const levelColors = getRiskLevelColor(risk.initial_evaluation.level);
                return (
                  <View
                    key={risk.id}
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
                      <Pressable onPress={() => handleDeleteRisk(risk.id)} style={{ padding: 8 }}>
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#eef2ff" }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#3730a3" }}>{risk.category}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#f3f4f6" }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>{risk.type}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: levelColors.bg }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: levelColors.color }}>{risk.initial_evaluation.level}</Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 12, flexDirection: "row", gap: 16 }}>
                      <View>
                        <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Gravité</Text>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>{risk.initial_evaluation.G}/5</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Fréquence</Text>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>{risk.initial_evaluation.F}/5</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Probabilité</Text>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>{risk.initial_evaluation.P}/5</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Score</Text>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>{risk.initial_evaluation.score}/125</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Bouton d'ajout */}
        {!showAddForm && (
          <Pressable
            onPress={() => setShowAddForm(true)}
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
        )}

        {/* Formulaire d'ajout */}
        {showAddForm && (
          <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 16 }}>
              Nouveau risque
            </Text>

            {/* Description */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 8 }}>
                Description du risque <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <TextInput
                value={riskDescription}
                onChangeText={setRiskDescription}
                placeholder="Décrivez le risque en détail..."
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#fff",
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {/* Catégorie */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 8 }}>
                Catégorie <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <View style={{ gap: 8 }}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setRiskCategory(cat)}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: riskCategory === cat ? "#7C3AED" : "#d1d5db",
                      backgroundColor: riskCategory === cat ? "#f5f3ff" : "#fff",
                    }}
                  >
                    <Text style={{ fontWeight: riskCategory === cat ? "700" : "400", color: riskCategory === cat ? "#7C3AED" : "#374151" }}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Type */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 8 }}>
                Type <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <View style={{ gap: 8 }}>
                {types.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setRiskType(type)}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: riskType === type ? "#7C3AED" : "#d1d5db",
                      backgroundColor: riskType === type ? "#f5f3ff" : "#fff",
                    }}
                  >
                    <Text style={{ fontWeight: riskType === type ? "700" : "400", color: riskType === type ? "#7C3AED" : "#374151" }}>
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Évaluation G, F, P */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 12 }}>
                Évaluation initiale
              </Text>

              {/* Gravité */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Gravité (G): {G}/5</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => setG(val)}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: G === val ? "#7C3AED" : "#d1d5db",
                        backgroundColor: G === val ? "#f5f3ff" : "#fff",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontWeight: "700", color: G === val ? "#7C3AED" : "#374151" }}>{val}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Fréquence */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Fréquence (F): {F}/5</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => setF(val)}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: F === val ? "#7C3AED" : "#d1d5db",
                        backgroundColor: F === val ? "#f5f3ff" : "#fff",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontWeight: "700", color: F === val ? "#7C3AED" : "#374151" }}>{val}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Probabilité */}
              <View>
                <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Probabilité (P): {P}/5</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => setP(val)}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: P === val ? "#7C3AED" : "#d1d5db",
                        backgroundColor: P === val ? "#f5f3ff" : "#fff",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontWeight: "700", color: P === val ? "#7C3AED" : "#374151" }}>{val}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Score calculé */}
              <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: "#f9fafb" }}>
                <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Score calculé (G × F × P)</Text>
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827" }}>{G * F * P}/125</Text>
              </View>
            </View>

            {/* Boutons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setShowAddForm(false)}
                disabled={adding}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: "#f3f4f6",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "600", color: "#374151" }}>Annuler</Text>
              </Pressable>

              <Pressable
                onPress={handleAddRisk}
                disabled={!riskDescription.trim() || !riskCategory || !riskType || adding}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: riskDescription.trim() && riskCategory && riskType && !adding ? "#7C3AED" : "#9ca3af",
                  alignItems: "center",
                }}
              >
                {adding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontWeight: "700", color: "#fff" }}>Ajouter</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Erreur */}
        {error && (
          <View style={{ marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: "#fee2e2", borderLeftWidth: 4, borderLeftColor: "#ef4444" }}>
            <Text style={{ color: "#991b1b", fontWeight: "600" }}>{error}</Text>
          </View>
        )}

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

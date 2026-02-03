import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthGuard } from "../lib/guard";
import { getProject, deleteProject } from "../lib/api";
import type { AnalysisProject } from "../lib/types";

export default function ProjectDetailsScreen() {
  const { loading: authLoading, authenticated } = useAuthGuard();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<AnalysisProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authenticated || !projectId) return;

    loadProject();
  }, [authenticated, projectId]);

  const loadProject = async () => {
    try {
      const proj = await getProject(projectId);
      setProject(proj);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer ce projet ?",
      "Cette action est irréversible. Tous les risques et mesures seront supprimés.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteProject(projectId);
              router.replace("/(tabs)");
            } catch (e: any) {
              Alert.alert("Erreur", e?.message || "Impossible de supprimer le projet");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (!project) return;

    // Si le projet n'a pas assez de risques, aller à l'ajout de risques
    if (project.risks.length < 4) {
      router.push({
        pathname: "/project-risks",
        params: { projectId: project.id },
      } as any);
      return;
    }

    // Si des risques n'ont pas de mesures, aller aux mesures
    const incompleteRisk = project.risks.find((r) => !r.residual_evaluation);
    if (incompleteRisk) {
      router.push({
        pathname: "/project-mitigations",
        params: { projectId: project.id },
      } as any);
      return;
    }

    // Sinon, le projet est complet
    Alert.alert("Projet complété", "Ce projet d'analyse est déjà complété.");
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

  if (error || !project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", padding: 16 }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Erreur</Text>
          <Text style={{ color: "#6b7280", textAlign: "center" }}>{error || "Projet introuvable"}</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "#7C3AED" }}>
            <Text style={{ color: "white", fontWeight: "600" }}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const completedRisks = project.risks.filter((r) => r.residual_evaluation !== null).length;
  const isComplete = project.status === "completed";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#fff" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, borderRadius: 12, backgroundColor: "#f3f4f6" }}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>Détails du projet</Text>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>{new Date(project.created_at).toLocaleDateString()}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Statut */}
        <View style={{ marginBottom: 16, padding: 16, borderRadius: 12, backgroundColor: isComplete ? "#d1fae5" : "#fef3c7", borderLeftWidth: 4, borderLeftColor: isComplete ? "#10b981" : "#f59e0b" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name={isComplete ? "checkmark-circle" : "time"} size={24} color={isComplete ? "#059669" : "#d97706"} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: isComplete ? "#065f46" : "#92400e" }}>
              {isComplete ? "Projet complété" : "Projet en cours"}
            </Text>
          </View>
          <Text style={{ marginTop: 4, color: isComplete ? "#065f46" : "#92400e" }}>
            {completedRisks} / {project.risks.length} risques traités
          </Text>
        </View>

        {/* Titre */}
        <View style={{ marginBottom: 16, padding: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Titre du projet</Text>
          <Text style={{ fontSize: 18, color: "#374151" }}>{project.analysis_title}</Text>
        </View>

        {/* Informations générales */}
        <View style={{ marginBottom: 16, padding: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 }}>Informations</Text>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Type</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name={project.project_type === "project" ? "briefcase" : "business"} size={18} color="#7C3AED" />
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                  {project.project_type === "project" ? "Projet/Programme" : "Entité"}
                </Text>
              </View>
            </View>

            {project.entity_type && (
              <View>
                <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Type d'entité</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>{project.entity_type}</Text>
              </View>
            )}

            {project.sector && (
              <View>
                <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Secteur</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>{project.sector}</Text>
              </View>
            )}

            <View>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Description</Text>
              <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20 }}>{project.project_description}</Text>
            </View>

            {project.entity_services && (
              <View>
                <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Services et produits</Text>
                <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20 }}>{project.entity_services}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Risques */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 12 }}>
            Risques identifiés ({project.risks.length})
          </Text>

          {project.risks.length === 0 ? (
            <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#f9fafb", alignItems: "center" }}>
              <Text style={{ color: "#6b7280" }}>Aucun risque ajouté</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {project.risks.map((risk, idx) => {
                const initialColors = getRiskLevelColor(risk.initial_evaluation.level);
                const hasResidual = risk.residual_evaluation !== null;
                const residualColors = hasResidual ? getRiskLevelColor(risk.residual_evaluation!.level) : null;

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
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>Risque #{idx + 1}</Text>
                      {hasResidual && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
                    </View>

                    <Text style={{ color: "#374151", lineHeight: 20, marginBottom: 8 }}>{risk.description}</Text>

                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#eef2ff" }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#3730a3" }}>{risk.category}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#f3f4f6" }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>{risk.type}</Text>
                      </View>
                    </View>

                    {/* Évaluation initiale */}
                    <View style={{ padding: 12, borderRadius: 8, backgroundColor: "#f9fafb", marginBottom: hasResidual ? 8 : 0 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#6b7280" }}>Évaluation initiale</Text>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: initialColors.bg }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: initialColors.color }}>{risk.initial_evaluation.level}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <Text style={{ fontSize: 12, color: "#374151" }}>G: {risk.initial_evaluation.G}</Text>
                        <Text style={{ fontSize: 12, color: "#374151" }}>F: {risk.initial_evaluation.F}</Text>
                        <Text style={{ fontSize: 12, color: "#374151" }}>P: {risk.initial_evaluation.P}</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#111827" }}>Score: {risk.initial_evaluation.score}</Text>
                      </View>
                    </View>

                    {/* Mesure et évaluation résiduelle */}
                    {hasResidual && (
                      <>
                        <View style={{ padding: 12, borderRadius: 8, backgroundColor: "#f0fdf4", marginBottom: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#065f46", marginBottom: 4 }}>Mesure appliquée</Text>
                          <Text style={{ fontSize: 12, color: "#166534", lineHeight: 18 }}>{risk.mitigation_measure}</Text>
                        </View>

                        <View style={{ padding: 12, borderRadius: 8, backgroundColor: residualColors!.bg }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: residualColors!.color }}>Évaluation résiduelle</Text>
                            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.5)" }}>
                              <Text style={{ fontSize: 10, fontWeight: "700", color: residualColors!.color }}>{risk.residual_evaluation!.level}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: "row", gap: 12 }}>
                            <Text style={{ fontSize: 12, color: residualColors!.color }}>G: {risk.residual_evaluation!.G}</Text>
                            <Text style={{ fontSize: 12, color: residualColors!.color }}>F: {risk.residual_evaluation!.F}</Text>
                            <Text style={{ fontSize: 12, color: residualColors!.color }}>P: {risk.residual_evaluation!.P}</Text>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: residualColors!.color }}>Score: {risk.residual_evaluation!.score}</Text>
                          </View>
                        </View>

                        {risk.residual_evaluation!.score < risk.initial_evaluation.score && (
                          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="trending-down" size={16} color="#10b981" />
                            <Text style={{ fontSize: 12, color: "#10b981", fontWeight: "600" }}>
                              Réduction : -{risk.initial_evaluation.score - risk.residual_evaluation!.score} points
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={{ gap: 12, marginBottom: 20 }}>
          {!isComplete && (
            <Pressable onPress={handleContinue} style={{ borderRadius: 12, overflow: "hidden" }}>
              <LinearGradient
                colors={["#7C3AED", "#2563EB"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              >
                <Ionicons name="arrow-forward" size={20} color="#fff" />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Continuer le projet</Text>
              </LinearGradient>
            </Pressable>
          )}

          <Pressable
            onPress={() => router.push("/(tabs)")}
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: "#f3f4f6",
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "600", color: "#374151" }}>Retour au dashboard</Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            disabled={deleting}
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: "#fee2e2",
              borderWidth: 1,
              borderColor: "#fecaca",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {deleting ? (
              <ActivityIndicator color="#dc2626" />
            ) : (
              <>
                <Ionicons name="trash" size={20} color="#dc2626" />
                <Text style={{ fontWeight: "700", color: "#dc2626" }}>Supprimer ce projet</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

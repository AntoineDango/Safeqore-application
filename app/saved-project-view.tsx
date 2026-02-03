import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, TextInput, Modal } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthGuard } from "../lib/guard";
import { getProject, deleteProject, duplicateProject, updateProject, analyzeProjectWithIA } from "../lib/api";
import { generateProjectExcel, generateComparativeExcel } from "../lib/excelExport";
import type { AnalysisProject, CompareResponse } from "../lib/types";

export default function SavedProjectViewScreen() {
  const { loading: authLoading, authenticated } = useAuthGuard();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<AnalysisProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analyzingIA, setAnalyzingIA] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [iaAnalysisResults, setIAAnalysisResults] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

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
              Alert.alert("Succès", "Projet supprimé", [
                { text: "OK", onPress: () => router.replace("/(tabs)") }
              ]);
            } catch (e: any) {
              Alert.alert("Erreur", e?.message || "Impossible de supprimer le projet");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleExportExcel = async () => {
    if (!project) return;
    setExporting(true);
    try {
      await generateProjectExcel(project);
      Alert.alert("Succès", "Le rapport Excel a été généré avec succès");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d'exporter le rapport");
    } finally {
      setExporting(false);
    }
  };

  const handleAnalyzeWithIA = async () => {
    console.log("[SavedProjectView] handleAnalyzeWithIA called");
    if (!project) {
      console.log("[SavedProjectView] No project found");
      return;
    }
    
    console.log("[SavedProjectView] Project:", project.id, "Risks:", project.risks.length);
    
    // Validation : tous les risques doivent avoir une mesure et une évaluation résiduelle
    const incompleteRisks = project.risks.filter(r => !r.residual_evaluation || !r.mitigation_measure);
    console.log("[SavedProjectView] Incomplete risks:", incompleteRisks.length);
    
    if (incompleteRisks.length > 0) {
      Alert.alert(
        "Analyse incomplète",
        `${incompleteRisks.length} risque(s) n'ont pas de mesure de contournement et d'évaluation résiduelle. Complétez d'abord tous les risques.`,
        [{ text: "OK" }]
      );
      return;
    }

    setAnalyzingIA(true);
    try {
      console.log("[SavedProjectView] Calling analyzeProjectWithIA API...");
      const result = await analyzeProjectWithIA(projectId);
      console.log("[SavedProjectView] API result:", result);
      
      // Stocker les résultats pour affichage
      setIAAnalysisResults(result);
      
      Alert.alert(
        "Analyse IA terminée",
        `${result.comparisons.length} risque(s) ont été analysés par l'IA. Consultez les résultats ci-dessous.`,
        [{ text: "OK" }]
      );
    } catch (e: any) {
      console.error("[SavedProjectView] Error:", e);
      Alert.alert("Erreur", e?.message || "Impossible de lancer l'analyse IA");
    } finally {
      setAnalyzingIA(false);
    }
  };

  // Détecte si le projet est déjà une copie éditable
  const isEditableCopy = (title: string): boolean => {
    return /_v\d+$/.test(title); // Vérifie si le titre se termine par _v2, _v3, etc.
  };

  const handleModifyProject = async () => {
    if (!project) return;
    
    // Si c'est déjà une copie éditable → ouvrir le modal de modification
    if (isEditableCopy(project.analysis_title)) {
      setEditTitle(project.analysis_title);
      setEditDescription(project.project_description);
      setShowEditModal(true);
      return;
    }
    
    // Si c'est un projet original → dupliquer d'abord
    setDuplicating(true);
    try {
      const newTitle = `${project.analysis_title}_v2`;
      const duplicated = await duplicateProject(projectId, newTitle);
      
      Alert.alert(
        "Projet dupliqué pour modification",
        `Un nouveau projet "${duplicated.analysis_title}" a été créé. Vous pouvez maintenant le modifier.`,
        [
          { text: "Rester ici", style: "cancel" },
          { 
            text: "Ouvrir le nouveau projet", 
            onPress: () => router.replace({ pathname: "/saved-project-view", params: { projectId: duplicated.id } })
          }
        ]
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de dupliquer le projet");
    } finally {
      setDuplicating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editDescription.trim()) {
      Alert.alert("Attention", "Le titre et la description sont obligatoires");
      return;
    }
    
    try {
      const updated = await updateProject(projectId, {
        analysis_title: editTitle,
        project_description: editDescription,
      });
      setProject(updated);
      setShowEditModal(false);
      Alert.alert("Succès", "Projet mis à jour");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de mettre à jour le projet");
    }
  };

  const getRiskLevelColor = (level: string) => {
    if (level === "Élevé") return { bg: "#fef3c7", color: "#92400e" };
    if (level === "Moyen" || level === "Modéré") return { bg: "#dbeafe", color: "#1e40af" };
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

  const completedRisks = project.risks.filter((r) => r.residual_evaluation !== null && r.mitigation_measure).length;
  const isComplete = project.status === "completed";
  const allRisksComplete = completedRisks >= project.risks.length;
  
  console.log("[SavedProjectView] Completed risks:", completedRisks, "/", project.risks.length);
  console.log("[SavedProjectView] All complete:", allRisksComplete);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#fff" }}>
        <Pressable onPress={() => router.replace("/(tabs)")} style={{ padding: 8, borderRadius: 12, backgroundColor: "#f3f4f6" }}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>Projet d'analyse</Text>
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>Titre du projet</Text>
          </View>
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

        {/* Résultats de l'analyse IA */}
        {iaAnalysisResults && (
          <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>🤖 Analyse IA Comparative</Text>
              <Pressable onPress={() => setIAAnalysisResults(null)}>
                <Ionicons name="close-circle" size={24} color="#6b7280" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
              {iaAnalysisResults.comparisons.length} risque(s) analysé(s) par l'IA
            </Text>

            {iaAnalysisResults.comparisons.map((comp: any, idx: number) => {
              const risk = project.risks.find((r) => r.id === comp.risk_id);
              if (!risk) return null;

              const agreement = comp.comparison.agreement_level;
              const agreementColor = 
                agreement === "Élevé" ? "#10b981" :
                agreement === "Moyen" ? "#f59e0b" : "#ef4444";

              return (
                <Pressable
                  key={comp.risk_id}
                  onPress={() => {
                    // Naviguer vers une page de détail avec les données de comparaison
                    router.push({
                      pathname: "/risk-ia-detail",
                      params: {
                        riskId: comp.risk_id,
                        projectId: projectId,
                        comparisonData: JSON.stringify(comp)
                      }
                    });
                  }}
                  style={{ marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb" }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", flex: 1 }}>
                      Risque #{idx + 1}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
                  </View>

                  <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                    {risk.description.substring(0, 80)}...
                  </Text>

                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 4 }}>Votre analyse</Text>
                      <Text style={{ fontSize: 12, color: "#374151" }}>Score: {comp.human_analysis.score}</Text>
                      <Text style={{ fontSize: 12, color: "#374151" }}>Classe: {comp.human_analysis.classification}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 4 }}>Analyse IA</Text>
                      <Text style={{ fontSize: 12, color: "#374151" }}>Score: {comp.ia_analysis.score}</Text>
                      <Text style={{ fontSize: 12, color: "#374151" }}>Classe: {comp.ia_analysis.classification}</Text>
                    </View>
                  </View>

                  <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: agreementColor + "20", alignSelf: "flex-start" }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: agreementColor }}>
                      Concordance : {agreement}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 11, color: "#7C3AED", marginTop: 8, fontWeight: "600" }}>
                    Appuyer pour voir les détails →
                  </Text>
                </Pressable>
              );
            })}

            {/* Bouton pour télécharger l'Excel comparatif */}
            <Pressable
              onPress={async () => {
                try {
                  const iaComparisons = iaAnalysisResults.comparisons.map((comp: any) => {
                    const risk = project.risks.find((r) => r.id === comp.risk_id);
                    if (!risk) throw new Error("Risque introuvable");
                    
                    const comparison: CompareResponse = {
                      human_analysis: comp.human_analysis,
                      ia_analysis: comp.ia_analysis,
                      comparison: comp.comparison
                    };
                    
                    return { risk, comparison };
                  });
                  
                  await generateComparativeExcel(project, iaComparisons);
                  Alert.alert("Succès", "Le rapport Excel comparatif a été téléchargé");
                } catch (e: any) {
                  Alert.alert("Erreur", "Impossible de générer le rapport Excel");
                }
              }}
              style={{ borderRadius: 12, overflow: "hidden", marginTop: 8 }}
            >
              <LinearGradient
                colors={["#7C3AED", "#2563EB"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              >
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>Télécharger rapport Excel comparatif</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View style={{ gap: 12, marginBottom: 20 }}>
          {/* Exporter en Excel */}
          <Pressable
            onPress={handleExportExcel}
            disabled={exporting}
            style={{ borderRadius: 12, overflow: "hidden" }}
          >
            <LinearGradient
              colors={["#10b981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
            >
              {exporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="document-text" size={20} color="#fff" />
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Exporter en Excel</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Lancer analyse IA */}
          <Pressable
            onPress={handleAnalyzeWithIA}
            disabled={analyzingIA || !allRisksComplete}
            style={{ borderRadius: 12, overflow: "hidden" }}
          >
            <LinearGradient
              colors={!allRisksComplete ? ["#9ca3af", "#6b7280"] : ["#7C3AED", "#2563EB"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
            >
              {analyzingIA ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Lancer analyse IA</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {!allRisksComplete && (
            <Text style={{ fontSize: 12, color: "#f59e0b", textAlign: "center" }}>
              ⚠️ Tous les risques doivent avoir une mesure de contournement et une évaluation résiduelle pour lancer l'analyse IA
            </Text>
          )}

          {/* Modifier le projet (logique intelligente) */}
          <Pressable
            onPress={handleModifyProject}
            disabled={duplicating}
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#d1d5db",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {duplicating ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <>
                <Ionicons name="create-outline" size={20} color="#374151" />
                <Text style={{ fontWeight: "700", color: "#374151" }}>
                  {isEditableCopy(project.analysis_title) ? "Modifier le projet" : "Modifier le projet"}
                </Text>
              </>
            )}
          </Pressable>

          {/* Retour au dashboard */}
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: "#f3f4f6",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="home" size={20} color="#374151" />
            <Text style={{ fontWeight: "700", color: "#374151" }}>Retour au dashboard</Text>
          </Pressable>

          {/* Supprimer */}
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

      {/* Modal de modification */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>Modifier le projet</Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 8 }}>Titre du projet</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Titre du projet"
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 12,
                  padding: 12,
                  backgroundColor: "#fff",
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 8 }}>Description</Text>
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description du projet"
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
                  marginBottom: 20,
                }}
              />

              <Pressable
                onPress={handleSaveEdit}
                style={{ borderRadius: 12, overflow: "hidden" }}
              >
                <LinearGradient
                  colors={["#7C3AED", "#2563EB"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: 16, alignItems: "center" }}
                >
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Enregistrer les modifications</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

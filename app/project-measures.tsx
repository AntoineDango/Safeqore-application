import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useAnalysis } from "../context/AnalysisContext";
import { useAuthGuard } from "../lib/guard";
import { analyzeQuestionnaire, getQuestions, createProject, addRiskToProject, updateRiskMitigation } from "../lib/api";
import type { Question } from "../lib/types";

export default function ProjectMeasuresScreen() {
  useAuthGuard();
  const { state, updateRisk, resetProject } = useAnalysis();
  
  const [currentRiskIndex, setCurrentRiskIndex] = useState(0);
  const [mitigation, setMitigation] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Array<{question_id: string, option_id: string}>>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirection si données manquantes
  useEffect(() => {
    if (!state.analysisTitle || state.risks.length < 4) {
      router.replace("/start");
    }
  }, [state.analysisTitle, state.risks.length]);

  if (!state.analysisTitle || state.risks.length < 4) {
    return null;
  }

  const currentRisk = state.risks[currentRiskIndex];
  const completedCount = state.risks.filter(r => r.residualResult).length;

  const saveProject = async () => {
    setEvaluating(true);
    try {
      // 1. Créer le projet
      const projectData = {
        project_type: state.projectType!,
        project_description: state.projectDescription!,
        entity_type: state.entityType,
        entity_services: state.entityServices,
        analysis_title: state.analysisTitle!,
        sector: state.sector,
      };

      const createdProject = await createProject(projectData);
      console.log("[ProjectMeasures] Project created:", createdProject.id);

      // 2. Ajouter tous les risques avec leurs évaluations
      for (const risk of state.risks) {
        if (!risk.userResult) continue;

        // Ajouter le risque avec évaluation initiale
        const addedRisk = await addRiskToProject({
          project_id: createdProject.id,
          description: risk.description,
          category: risk.category,
          type: risk.type,
          G: risk.userResult.G,
          F: risk.userResult.F,
          P: risk.userResult.P,
        });

        console.log("[ProjectMeasures] Risk added:", addedRisk.id);

        // 3. Ajouter la mesure et l'évaluation résiduelle si disponibles
        if (risk.mitigation && risk.residualResult) {
          await updateRiskMitigation({
            project_id: createdProject.id,
            risk_id: addedRisk.id,
            mitigation_measure: risk.mitigation,
            residual_G: risk.residualResult.G,
            residual_F: risk.residualResult.F,
            residual_P: risk.residualResult.P,
          });

          console.log("[ProjectMeasures] Mitigation updated for risk:", addedRisk.id);
        }
      }

      // 4. Succès - rediriger vers le dashboard approprié selon la plateforme
      console.log("[ProjectMeasures] Project saved successfully:", createdProject.id);
      const isMobile = Platform.OS === "ios" || Platform.OS === "android";
      router.replace(isMobile ? "/(tabs)" : "/dashboard");
    } catch (e: any) {
      console.error("[ProjectMeasures] Save error:", e);
      Alert.alert(
        "Erreur de sauvegarde",
        e?.message || "Impossible de sauvegarder le projet. Vérifiez votre connexion.",
        [
          {
            text: "Réessayer",
            onPress: () => saveProject(),
          },
          {
            text: "Annuler",
            style: "cancel",
          },
        ]
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleStartEvaluation = async () => {
    if (mitigation.trim().length < 10) {
      Alert.alert("Attention", "La mesure doit contenir au moins 10 caractères.");
      return;
    }

    // Charger les questions pour la réévaluation
    setLoading(true);
    try {
      const resp = await getQuestions(state.sector!);
      setQuestions(resp.questions || []);
      setAnswers([]);
      setQuestionIndex(0);
      setShowQuestionnaire(true);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de charger les questions");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerQuestion = (option_id: string) => {
    const currentQuestion = questions[questionIndex];
    const newAnswers = [
      ...answers.filter(a => a.question_id !== currentQuestion.id),
      { question_id: currentQuestion.id, option_id }
    ];
    setAnswers(newAnswers);

    if (questionIndex + 1 < questions.length) {
      setQuestionIndex(questionIndex + 1);
    } else {
      // Toutes les questions répondues, évaluer
      evaluateResidual(newAnswers);
    }
  };

  const evaluateResidual = async (finalAnswers: Array<{question_id: string, option_id: string}>) => {
    setEvaluating(true);
    try {
      const res = await analyzeQuestionnaire({
        description: currentRisk.description + " (après mesure: " + mitigation.trim() + ")",
        category: currentRisk.category,
        type: currentRisk.type,
        sector: state.sector!,
        answers: finalAnswers,
      });

      // Stocker la mesure et le résultat résiduel
      updateRisk(currentRiskIndex, {
        mitigation: mitigation.trim(),
        residualResult: res,
      });

      // Réinitialiser pour le prochain risque
      setMitigation("");
      setShowQuestionnaire(false);
      setAnswers([]);
      setQuestionIndex(0);

      // Passer au risque suivant (ne plus sauvegarder automatiquement)
      const nextIncomplete = state.risks.findIndex((r, idx) => idx > currentRiskIndex && !r.residualResult);
      if (nextIncomplete !== -1) {
        setCurrentRiskIndex(nextIncomplete);
      }
      // Ne plus rediriger automatiquement - laisser l'utilisateur cliquer sur "Enregistrer"
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Erreur lors de l'évaluation");
    } finally {
      setEvaluating(false);
    }
  };

  const handleSkip = () => {
    const nextIncomplete = state.risks.findIndex((r, idx) => idx > currentRiskIndex && !r.residualResult);
    if (nextIncomplete !== -1) {
      setCurrentRiskIndex(nextIncomplete);
      setMitigation("");
      setShowQuestionnaire(false);
    } else {
      Alert.alert("Information", "Tous les autres risques ont déjà été traités.");
    }
  };

  const getRiskLevelColor = (level?: string) => {
    if (level === "Élevé") return { bg: "#fef3c7", color: "#92400e" };
    if (level === "Modéré" || level === "Moyen") return { bg: "#dbeafe", color: "#1e40af" };
    return { bg: "#d1fae5", color: "#065f46" };
  };

  const initialColors = getRiskLevelColor(currentRisk?.userResult?.classification as string);

  if (showQuestionnaire && questions.length > 0) {
    const currentQuestion = questions[questionIndex];
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 12, color: "#7C3AED", fontWeight: "700", marginBottom: 4 }}>
            Réévaluation - Risque #{currentRiskIndex + 1}
          </Text>
          <Text style={{ fontSize: 16, color: "#6b7280" }}>
            Étape {questionIndex + 1} / {questions.length} — Dimension {currentQuestion.dimension}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 18, fontWeight: "600" }}>{currentQuestion.texte_question}</Text>
        </View>
        <ScrollView style={{ padding: 16 }}>
          <View style={{ gap: 10 }}>
            {currentQuestion.reponses_possibles.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => handleAnswerQuestion(opt.id)}
                style={{ padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff" }}
              >
                <Text style={{ fontSize: 16 }}>{opt.label}</Text>
                {opt.niveau && <Text style={{ color: "#6b7280", marginTop: 4 }}>Niveau: {opt.niveau}</Text>}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            <Text style={{ fontSize: 12, color: "#6b7280" }}>Étape 3/3 : Mesures et risques résiduels</Text>
          </View>
        </View>

        {/* Progression */}
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>
              {completedCount} / {state.risks.length} risques traités
            </Text>
            <Text style={{ fontSize: 12, color: completedCount === state.risks.length ? "#10b981" : "#f59e0b" }}>
              {completedCount === state.risks.length ? "✓ Terminé" : "En cours"}
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
            <View
              style={{
                width: `${(completedCount / state.risks.length) * 100}%`,
                height: 8,
                backgroundColor: completedCount === state.risks.length ? "#10b981" : "#f59e0b",
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
              Risque #{currentRiskIndex + 1} / {state.risks.length}
            </Text>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: initialColors.bg }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: initialColors.color }}>
                {currentRisk.userResult?.classification}
              </Text>
            </View>
          </View>

          <Text style={{ color: "#374151", lineHeight: 22, marginBottom: 12 }}>{currentRisk.description}</Text>

          <View style={{ padding: 12, borderRadius: 8, backgroundColor: "#f9fafb" }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#6b7280", marginBottom: 8 }}>Évaluation initiale</Text>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View>
                <Text style={{ fontSize: 10, color: "#6b7280" }}>G</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{currentRisk.userResult?.G}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: "#6b7280" }}>F</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{currentRisk.userResult?.F}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: "#6b7280" }}>P</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{currentRisk.userResult?.P}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: "#6b7280" }}>Score (R)</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>
                  {(currentRisk.userResult?.G || 0) * (currentRisk.userResult?.F || 0) * (currentRisk.userResult?.P || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Recommandations selon le score */}
          {(() => {
            const score = (currentRisk.userResult?.G || 0) * (currentRisk.userResult?.F || 0) * (currentRisk.userResult?.P || 0);
            let level = "";
            let recommendation = "";
            let recColor = "#10b981";
            let recBg = "#d1fae5";
            let recIcon: "time-outline" | "warning-outline" | "alert-circle" = "time-outline";

            if (score <= 25) {
              level = "Faible";
              recommendation = `${level} (R = ${score}) : mesure à prendre à long terme`;
              recColor = "#10b981";
              recBg = "#d1fae5";
              recIcon = "time-outline";
            } else if (score <= 50) {
              level = "Moyen";
              recommendation = `${level} (R = ${score}) : attention requise, prendre des mesures à court et moyen terme`;
              recColor = "#f59e0b";
              recBg = "#fef3c7";
              recIcon = "warning-outline";
            } else {
              level = "Élevé";
              recommendation = `${level} (R = ${score}) : prendre des mesures immédiates`;
              recColor = "#ef4444";
              recBg = "#fee2e2";
              recIcon = "alert-circle";
            }

            return (
              <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: recBg, borderLeftWidth: 4, borderLeftColor: recColor }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name={recIcon} size={20} color={recColor} />
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: "600", color: recColor, lineHeight: 18 }}>
                    {recommendation}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Afficher la réévaluation si disponible */}
          {currentRisk.residualResult && (
            <>
              <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#86efac" }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#065f46", marginBottom: 8 }}>Évaluation résiduelle (après mesure)</Text>
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <View>
                    <Text style={{ fontSize: 10, color: "#166534" }}>G</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "#065f46" }}>{currentRisk.residualResult.G}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, color: "#166534" }}>F</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "#065f46" }}>{currentRisk.residualResult.F}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, color: "#166534" }}>P</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "#065f46" }}>{currentRisk.residualResult.P}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, color: "#166534" }}>Score (R)</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "#065f46" }}>
                      {(currentRisk.residualResult.G || 0) * (currentRisk.residualResult.F || 0) * (currentRisk.residualResult.P || 0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Visualisation de la réduction */}
              {(() => {
                const initialScore = (currentRisk.userResult?.G || 0) * (currentRisk.userResult?.F || 0) * (currentRisk.userResult?.P || 0);
                const residualScore = (currentRisk.residualResult.G || 0) * (currentRisk.residualResult.F || 0) * (currentRisk.residualResult.P || 0);
                const reduction = initialScore - residualScore;
                const reductionPercent = initialScore > 0 ? Math.round((reduction / initialScore) * 100) : 0;

                return (
                  <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: "#eff6ff", borderLeftWidth: 4, borderLeftColor: "#3b82f6" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="trending-down" size={24} color="#3b82f6" />
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1e40af" }}>Réduction du risque</Text>
                          <Text style={{ fontSize: 12, color: "#3b82f6" }}>
                            {reduction > 0 ? `- ${reduction} points (${reductionPercent}%)` : reduction === 0 ? "Aucune réduction" : `+ ${Math.abs(reduction)} points`}
                          </Text>
                        </View>
                      </View>
                      {reduction > 0 && (
                        <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#10b981" }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "white" }}>✓ Amélioré</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}
            </>
          )}
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
            value={mitigation}
            onChangeText={setMitigation}
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
            {mitigation.length}/500 caractères (min. 10)
          </Text>
        </View>

        {/* Boutons */}
        <View style={{ gap: 12, marginBottom: 20 }}>
          {/* Bouton Réévaluer (si pas encore fait) */}
          {!currentRisk.residualResult && (
            <Pressable
              onPress={handleStartEvaluation}
              disabled={mitigation.trim().length < 10 || loading || evaluating}
              style={{ borderRadius: 12, overflow: "hidden" }}
            >
              <LinearGradient
                colors={mitigation.trim().length >= 10 && !loading && !evaluating ? ["#10b981", "#059669"] : ["#9ca3af", "#6b7280"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              >
                {(loading || evaluating) ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                      Réévaluer le risque
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}

          {/* Afficher le bouton Enregistrer dès que 4 mesures sont complétées */}
          {completedCount >= 4 && (
            <Pressable
              onPress={saveProject}
              disabled={evaluating}
              style={{ borderRadius: 12, overflow: "hidden" }}
            >
              <LinearGradient
                colors={["#7C3AED", "#2563EB"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              >
                {evaluating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="#fff" />
                    <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                      Enregistrer et analyser
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}

    
          {/* Bouton Retour au dashboard (visible uniquement si au moins 4 mesures) */}
          {completedCount >= 4 && (
            <Pressable
              onPress={() => {
                console.log("[ProjectMeasures] Retour au dashboard clicked");
                const isMobile = Platform.OS === "ios" || Platform.OS === "android";
                router.replace(isMobile ? "/(tabs)" : "/dashboard");
              }}
              disabled={loading || evaluating}
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#e5e7eb",
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Ionicons name="home-outline" size={20} color="#374151" />
              <Text style={{ fontWeight: "600", color: "#374151" }}>
                Retour au dashboard
              </Text>
            </Pressable>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

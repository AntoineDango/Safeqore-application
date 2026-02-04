import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView, Linking, Platform } from "react-native";
import { useAnalysis } from "../context/AnalysisContext";
import RiskMatrix from "../components/RiskMatrix";
import { analyzeQuestionnaire, getReportUrl } from "../lib/api";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { emit } from "../lib/events";
import { useAuthGuard } from "../lib/guard";

export default function ResultScreen() {
  const { loading: authLoading, authenticated } = useAuthGuard();
  const { state, setUserResult, updateRisk } = useAnalysis();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mode projet multi-risques
  const isProjectMode = !!state.analysisTitle;
  const currentRisk = isProjectMode && state.currentRiskIndex !== undefined 
    ? state.risks[state.currentRiskIndex] 
    : null;

  useEffect(() => {
    if (!authenticated) return;
    
    (async () => {
      try {
        if (isProjectMode && currentRisk) {
          // Mode projet: évaluer le risque actuel
          if (!currentRisk.description || !currentRisk.category || !currentRisk.type || !state.sector || currentRisk.answers.length === 0) {
            router.replace("/start");
            return;
          }
          const res = await analyzeQuestionnaire({
            description: currentRisk.description,
            category: currentRisk.category,
            type: currentRisk.type,
            sector: state.sector,
            answers: currentRisk.answers,
          });
          // Stocker le résultat dans le risque
          updateRisk(state.currentRiskIndex!, { userResult: res });
        } else {
          // Mode ancien flux
          if (!state.description || !state.category || !state.type || !state.sector || state.answers.length === 0) {
            router.replace("/start");
            return;
          }
          const res = await analyzeQuestionnaire({
            description: state.description,
            category: state.category,
            type: state.type,
            sector: state.sector,
            answers: state.answers,
          });
          setUserResult(res);
          emit("analysis:created", res);
        }
      } catch (e: any) {
        setError(e?.message || "Erreur lors du calcul");
      } finally {
        setLoading(false);
      }
    })();
  }, [authenticated]);

  if (loading) return <View style={{ flex:1, justifyContent: "center", alignItems: "center"}}><ActivityIndicator /></View>;
  if (error) return <View style={{ padding: 16 }}><Text style={{ color: "red" }}>{error}</Text></View>;
  
  // Récupérer le résultat selon le mode
  const result = isProjectMode && currentRisk ? currentRisk.userResult : state.userResult;
  if (!result) return <View style={{ padding: 16 }}><Text>Pas de résultat</Text></View>;

  const r = result;
  const to100 = (raw: number) => Math.round((raw / 125) * 100);
  const labelMap: Record<string, "Faible" | "Modéré" | "Élevé"> = {
    Faible: "Faible",
    Modéré: "Modéré",
    Moyen: "Modéré",
    Élevé: "Élevé",
  };
  const cls = labelMap[(r.classification as unknown as string)] || "Modéré";
  const color = cls === "Élevé" ? "#ef4444" : cls === "Modéré" ? "#f59e0b" : "#10b981";
  const R = r.G * r.F * r.P;
  const R100 = to100(R);

  const handleContinue = () => {
    if (isProjectMode) {
      // Retourner à la liste des risques
      router.replace("/project-risks-list");
    } else {
      // Mode ancien flux
      const isMobile = Platform.OS === "ios" || Platform.OS === "android";
      router.replace(isMobile ? "/(tabs)" : "/dashboard");
    }
  };

  return (
    <SafeAreaView style={{ flex:1 }}>
      <ScrollView style={{ flex:1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>
        {isProjectMode ? `Résultat - Risque #${(state.currentRiskIndex ?? 0) + 1}` : "Résultat de votre analyse"}
      </Text>
      
      {isProjectMode && currentRisk && (
        <View style={{ marginTop: 8, padding: 12, borderRadius: 8, backgroundColor: "#f5f3ff", borderLeftWidth: 4, borderLeftColor: "#7C3AED" }}>
          <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Description du risque</Text>
          <Text style={{ color: "#374151", lineHeight: 20 }}>{currentRisk.description}</Text>
        </View>
      )}

      <View style={{ marginTop: 12, padding: 16, borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
        <Text style={{ fontSize: 16, color: "#6b7280" }}>Niveau de risque</Text>
        <Text style={{ fontSize: 28, fontWeight: "800", color }}>{cls}</Text>
        <Text style={{ marginTop: 6 }}>Justification</Text>
        <Text style={{ color: "#374151" }}>{r.justification || ""}</Text>
      </View>

      <View style={{ marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: "#f9fafb" }}>
        <Text>G: {r.G}   F: {r.F}   P: {r.P}   Score estimé: {R100}/100</Text>
      </View>

      {!isProjectMode && (
        <>
          <Pressable
            onPress={() => Linking.openURL(getReportUrl(r.id))}
            style={{ marginTop: 12, padding: 14, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Télécharger le rapport (.docx)</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/compare")}
            style={{ marginTop: 24, padding: 14, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Comparer Humain / IA</Text>
          </Pressable>

          {r.classification !== "Faible" && (
            <Pressable
              onPress={() => router.push("/measures")}
              style={{ marginTop: 12, padding: 14, borderRadius: 8, backgroundColor: "#10b981", alignItems: "center" }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Ajouter des mesures</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => router.push("/history")}
            style={{ marginTop: 12, padding: 14, borderRadius: 8, backgroundColor: "#e5e7eb", alignItems: "center" }}
          >
            <Text style={{ fontWeight: "600" }}>Voir l'historique</Text>
          </Pressable>
        </>
      )}

      {/* Bouton pour continuer */}
      <Pressable
        onPress={handleContinue}
        style={{ marginTop: 24, padding: 14, borderRadius: 8, backgroundColor: "#7C3AED", alignItems: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>
          {isProjectMode ? "Retour à la liste des risques" : "Aller au dashboard"}
        </Text>
      </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

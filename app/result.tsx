import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView, Linking } from "react-native";
import { useAnalysis } from "../context/AnalysisContext";
import RiskMatrix from "../components/RiskMatrix";
import { analyzeQuestionnaire, getReportUrl } from "../lib/api";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResultScreen() {
  const { state, setUserResult } = useAnalysis();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
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
      } catch (e: any) {
        setError(e?.message || "Erreur lors du calcul");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <View style={{ flex:1, justifyContent: "center", alignItems: "center"}}><ActivityIndicator /></View>;
  if (error) return <View style={{ padding: 16 }}><Text style={{ color: "red" }}>{error}</Text></View>;
  if (!state.userResult) return <View style={{ padding: 16 }}><Text>Pas de résultat</Text></View>;

  const r = state.userResult;
  const labelMap: Record<string, "Faible" | "Modéré" | "Élevé"> = {
    Faible: "Faible",
    Modéré: "Modéré",
    Moyen: "Modéré",
    Élevé: "Élevé",
  };
  const cls = labelMap[(r.classification as unknown as string)] || "Modéré";
  const color = cls === "Élevé" ? "#ef4444" : cls === "Modéré" ? "#f59e0b" : "#10b981";
  const R = r.G * r.F * r.P;

  return (
    <SafeAreaView style={{ flex:1 }}>
      <ScrollView style={{ flex:1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Résultat de votre analyse</Text>
      <View style={{ marginTop: 12, padding: 16, borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
        <Text style={{ fontSize: 16, color: "#6b7280" }}>Niveau de risque</Text>
        <Text style={{ fontSize: 28, fontWeight: "800", color }}>{cls}</Text>
        <Text style={{ marginTop: 6 }}>Justification</Text>
        <Text style={{ color: "#374151" }}>{r.justification || ""}</Text>
      </View>

      <View style={{ marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: "#f9fafb" }}>
        <Text>G: {r.G}   F: {r.F}   P: {r.P}   Score estime: {R}</Text>
      </View>

      <RiskMatrix G={r.G} P={r.P} />

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
        <Text style={{ color: "white", fontWeight: "600" }}>Voir l'analyse IA & comparaison</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

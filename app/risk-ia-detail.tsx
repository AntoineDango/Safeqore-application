import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { getProject } from "../lib/api";
import type { AnalysisProject } from "../lib/types";
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

export default function RiskIADetailScreen() {
  const { loading: authLoading, authenticated } = useAuthGuard();
  const params = useLocalSearchParams();
  const riskId = params.riskId as string;
  const projectId = params.projectId as string;
  const comparisonData = JSON.parse(params.comparisonData as string);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [risk, setRisk] = useState<any>(null);

  useEffect(() => {
    if (!authenticated || !projectId || !riskId) return;

    (async () => {
      try {
        const project: AnalysisProject = await getProject(projectId);
        const foundRisk = project.risks.find((r) => r.id === riskId);
        if (!foundRisk) {
          setError("Risque introuvable");
        } else {
          setRisk(foundRisk);
        }
      } catch (e: any) {
        setError(e?.message || "Impossible de charger le risque");
      } finally {
        setLoading(false);
      }
    })();
  }, [authenticated, projectId, riskId]);

  const classBadge = (cls?: string) => {
    const s = (cls || "").toLowerCase();
    if (s.includes("élev") || s.includes("eleve")) return { bg: "#fef3c7", color: "#92400e", label: "Élevé" };
    if (s.includes("mod") || s.includes("moyen")) return { bg: "#dbeafe", color: "#1e40af", label: "Modéré" };
    return { bg: "#d1fae5", color: "#065f46", label: "Faible" };
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (error || !risk) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View style={{ padding: 20, backgroundColor: "#fee2e2", borderRadius: 12, borderWidth: 1, borderColor: "#fecaca" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Erreur</Text>
          <Text style={{ color: "#6b7280", textAlign: "center" }}>{error || "Risque introuvable"}</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "#7C3AED" }}>
            <Text style={{ color: "white", fontWeight: "600" }}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const humanAnalysis = comparisonData.human_analysis;
  const iaAnalysis = comparisonData.ia_analysis;
  const comparison = comparisonData.comparison;

  const agreementColor = 
    comparison.agreement_level === "Élevé" ? "#10b981" :
    comparison.agreement_level === "Moyen" ? "#f59e0b" : "#ef4444";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#fff" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, borderRadius: 12, backgroundColor: "#f3f4f6" }}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>Analyse IA Comparative</Text>
          <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Détails de la comparaison</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Description du risque */}
        <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Description du risque</Text>
          <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22 }}>{risk.description}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Badge label={risk.category} bg="#f3f4f6" color="#374151" />
            <Badge label={risk.type} bg="#f3f4f6" color="#374151" />
          </View>
        </View>

        {/* Niveau de concordance */}
        <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 }}>Niveau de concordance</Text>
          <View style={{ alignItems: "center" }}>
            <View style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, backgroundColor: agreementColor + "20" }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: agreementColor }}>
                {comparison.agreement_level}
              </Text>
            </View>
            {comparison.analysis && (
              <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 12, textAlign: "center" }}>
                {comparison.analysis}
              </Text>
            )}
          </View>
        </View>

        {/* Comparaison des scores */}
        <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 16 }}>Comparaison des évaluations</Text>
          
          {/* Votre analyse */}
          <View style={{ marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: "#f9fafb" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Votre analyse</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>Gravité</Text>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>{humanAnalysis.G}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>Fréquence</Text>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>{humanAnalysis.F}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>Probabilité</Text>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>{humanAnalysis.P}</Text>
              </View>
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Score global</Text>
              <ScorePill score={humanAnalysis.score} />
            </View>
            <View style={{ marginTop: 8 }}>
              <Badge label={humanAnalysis.classification} {...classBadge(humanAnalysis.classification)} />
            </View>
          </View>

          {/* Analyse IA */}
          <View style={{ padding: 12, borderRadius: 8, backgroundColor: "#f0f9ff", borderWidth: 1, borderColor: "#7C3AED" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Analyse IA</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>Gravité</Text>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>{iaAnalysis.G}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>Fréquence</Text>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>{iaAnalysis.F}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>Probabilité</Text>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>{iaAnalysis.P}</Text>
              </View>
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Score global</Text>
              <ScorePill score={iaAnalysis.score} />
            </View>
            <View style={{ marginTop: 8 }}>
              <Badge label={iaAnalysis.classification} {...classBadge(iaAnalysis.classification)} />
            </View>
          </View>
        </View>

        {/* Justification de l'IA */}
        {iaAnalysis.justification && (
          <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>💡 Justification de l'IA</Text>
            <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22 }}>{iaAnalysis.justification}</Text>
          </View>
        )}

        {/* Causes identifiées par l'IA */}
        {iaAnalysis.causes && iaAnalysis.causes.length > 0 && (
          <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>🔍 Causes identifiées</Text>
            {iaAnalysis.causes.map((cause: string, idx: number) => (
              <View key={idx} style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <Text style={{ color: "#7C3AED", fontWeight: "700" }}>•</Text>
                <Text style={{ flex: 1, color: "#374151", lineHeight: 22 }}>{cause}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommandations de l'IA */}
        {iaAnalysis.recommendations && iaAnalysis.recommendations.length > 0 && (
          <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>✅ Recommandations</Text>
            {iaAnalysis.recommendations.map((rec: string, idx: number) => (
              <View key={idx} style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <Text style={{ color: "#10b981", fontWeight: "700" }}>✓</Text>
                <Text style={{ flex: 1, color: "#374151", lineHeight: 22 }}>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Mesure de contournement appliquée */}
        {risk.mitigation_measure && (
          <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>🛡️ Mesure de contournement appliquée</Text>
            <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22 }}>{risk.mitigation_measure}</Text>
            {risk.residual_evaluation && (
              <View style={{ marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: "#f9fafb" }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 4 }}>Évaluation résiduelle</Text>
                <Text style={{ fontSize: 13, color: "#374151" }}>
                  G: {risk.residual_evaluation.G}, F: {risk.residual_evaluation.F}, P: {risk.residual_evaluation.P} → Score: {risk.residual_evaluation.score}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

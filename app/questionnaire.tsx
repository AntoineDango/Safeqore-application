import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { useAnalysis } from "../context/AnalysisContext";
import { getQuestions } from "../lib/api";
import type { Question } from "../lib/types";
import { router } from "expo-router";
import { useAuthGuard } from "../lib/guard";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QuestionnaireScreen() {
  useAuthGuard();
  const { state, addAnswer, updateRisk } = useAnalysis();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  
  // Mode projet multi-risques
  const isProjectMode = !!state.analysisTitle;
  const currentRisk = isProjectMode && state.currentRiskIndex !== undefined 
    ? state.risks[state.currentRiskIndex] 
    : null;

  const sector = state.sector;
  const description = isProjectMode ? currentRisk?.description : state.description;
  const category = isProjectMode ? currentRisk?.category : state.category;
  const type = isProjectMode ? currentRisk?.type : state.type;

  useEffect(() => {
    if (!sector || !description || !category || !type) {
      router.replace("/start");
      return;
    }
    (async () => {
      try {
        const resp = await getQuestions(sector);
        setQuestions(resp.questions || []);
      } catch (e: any) {
        setError(e?.message || "Erreur de chargement des questions");
      } finally {
        setLoading(false);
      }
    })();
  }, [sector, description, category, type]);

  const current = useMemo(() => questions[idx], [questions, idx]);
  const total = questions.length;

  const onChoose = (option_id: string) => {
    if (!current) return;
    
    if (isProjectMode && currentRisk && state.currentRiskIndex !== undefined) {
      // Mode projet: stocker la réponse dans le risque actuel
      const updatedAnswers = [
        ...currentRisk.answers.filter(a => a.question_id !== current.id),
        { question_id: current.id, option_id }
      ];
      updateRisk(state.currentRiskIndex, { answers: updatedAnswers });
    } else {
      // Mode ancien flux
      addAnswer({ question_id: current.id, option_id });
    }
    
    // Si c'est la dernière question, aller au résultat
    if (idx + 1 < total) {
      setIdx((i) => i + 1);
    } else {
      router.replace("/result");
    }
  };

  if (loading) return <View style={{ flex:1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator /></View>;
  if (error) return <View style={{ padding: 16 }}><Text style={{ color:"red" }}>{error}</Text></View>;
  if (!current) return <View style={{ padding: 16 }}><Text>Aucune question disponible</Text></View>;

  return (
    <SafeAreaView style={{ flex:1 }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderColor: "#e5e7eb" }}>
        {isProjectMode && (
          <Text style={{ fontSize: 12, color: "#7C3AED", fontWeight: "700", marginBottom: 4 }}>
            Risque #{(state.currentRiskIndex ?? 0) + 1} - {category} / {type}
          </Text>
        )}
        <Text style={{ fontSize: 16, color: "#6b7280" }}>Étape {idx + 1} / {total} — Dimension {current!.dimension}</Text>
        <Text style={{ marginTop: 8, fontSize: 18, fontWeight: "600" }}>{current!.texte_question}</Text>
      </View>
      <ScrollView style={{ padding: 16 }}>
        <View style={{ gap: 10 }}>
          {current!.reponses_possibles.map((opt) => (
            <Pressable key={opt.id} onPress={() => onChoose(opt.id)}
              style={{ padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff" }}>
              <Text style={{ fontSize: 16 }}>{opt.label}</Text>
              {opt.niveau && <Text style={{ color: "#6b7280", marginTop: 4 }}>Niveau: {opt.niveau}</Text>}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

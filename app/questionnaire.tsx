import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { useAnalysis } from "../context/AnalysisContext";
import { getQuestions } from "../lib/api";
import type { Question } from "../lib/types";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QuestionnaireScreen() {
  const { state, addAnswer } = useAnalysis();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  

  const sector = state.sector;
  const description = state.description;
  const category = state.category;
  const type = state.type;

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
    addAnswer({ question_id: current.id, option_id });
    // Si c'est la dernière question, aller directement au résultat
    if (idx + 1 < total) {
      setIdx((i) => i + 1);
    } else {
      router.replace("/result");
    }
  };

  // Aucun aperçu: le calcul et l'affichage se font uniquement dans l'écran résultat

  if (loading) return <View style={{ flex:1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator /></View>;
  if (error) return <View style={{ padding: 16 }}><Text style={{ color:"red" }}>{error}</Text></View>;
  if (!current) return <View style={{ padding: 16 }}><Text>Aucune question disponible</Text></View>;

  return (
    <SafeAreaView style={{ flex:1 }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderColor: "#e5e7eb" }}>
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

        {/* Pas d'aperçu ici */}
      </ScrollView>
      {/* Plus de boutons Retour/Terminer: la dernière réponse déclenche la navigation */}
    </SafeAreaView>
  );
}

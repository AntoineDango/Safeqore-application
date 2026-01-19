import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useAnalysis } from "../context/AnalysisContext";
import { getConstants } from "../lib/api";
import type { Category, RiskType } from "../lib/types";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RiskScreen() {
  const { state, setRiskInfo } = useAnalysis();
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<RiskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState(state.description || "");
  const [category, setCategory] = useState<Category | undefined>(state.category);
  const [riskType, setRiskType] = useState<RiskType | undefined>(state.type);

  useEffect(() => {
    (async () => {
      try {
        const c = await getConstants();
        setCategories((c.categories || []) as Category[]);
        setTypes((c.types || []) as RiskType[]);
      } catch (e: any) {
        setError(e?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canContinue = description.trim().length > 3 && !!category && !!riskType;

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Décrivez le risque</Text>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={{ color: "red" }}>{error}</Text>
      ) : (
        <>
          <Text>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Décrivez le risque avec vos mots"
            style={{ borderWidth: 1, borderColor: "#d1d5db", padding: 10, borderRadius: 8, minHeight: 80 }}
          />

          <Text style={{ marginTop: 8 }}>Catégorie</Text>
          <View style={{ gap: 8 }}>
            {categories.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: category === c ? "#2563eb" : "#d1d5db", backgroundColor: category === c ? "#dbeafe" : "#fff" }}
              >
                <Text>{c}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ marginTop: 8 }}>Type</Text>
          <View style={{ gap: 8 }}>
            {types.map((t) => (
              <Pressable
                key={t}
                onPress={() => setRiskType(t)}
                style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: riskType === t ? "#2563eb" : "#d1d5db", backgroundColor: riskType === t ? "#dbeafe" : "#fff" }}
              >
                <Text>{t}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Pressable
        disabled={!canContinue}
        onPress={() => {
          if (!category || !riskType) return;
          setRiskInfo(description, category, riskType);
          router.push("/questionnaire");
        }}
        style={{ marginTop: 24, padding: 14, borderRadius: 8, backgroundColor: canContinue ? "#2563eb" : "#9ca3af", alignItems: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Continuer</Text>
      </Pressable>

      <Text style={{ marginTop: 12, color: "#6b7280" }}>Des exemples de risques courants seront affichés par secteur lors du questionnaire.</Text>
    </SafeAreaView>
  );
}

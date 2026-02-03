import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useAnalysis } from "../context/AnalysisContext";
import { getConstants } from "../lib/api";
import type { Category, RiskType } from "../lib/types";
import { router } from "expo-router";
import { useAuthGuard } from "../lib/guard";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { RiskInProgress } from "../context/AnalysisContext";

export default function RiskScreen() {
  const { state, setRiskInfo, addRisk, updateRisk } = useAnalysis();
  useAuthGuard();
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<RiskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vérifier si on édite un risque existant ou on en crée un nouveau
  const isEditing = state.currentRiskIndex !== undefined && state.currentRiskIndex < state.risks.length;
  const currentRisk = isEditing ? state.risks[state.currentRiskIndex!] : null;

  const [description, setDescription] = useState(currentRisk?.description || state.description || "");
  const [category, setCategory] = useState<Category | undefined>(currentRisk?.category || state.category);
  const [riskType, setRiskType] = useState<RiskType | undefined>(currentRisk?.type || state.type);

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

  const handleContinue = () => {
    if (!category || !riskType) return;

    // Mode projet multi-risques
    if (state.analysisTitle) {
      if (isEditing) {
        // Mise à jour d'un risque existant
        updateRisk(state.currentRiskIndex!, {
          description: description.trim(),
          category,
          type: riskType,
        });
      } else {
        // Ajout d'un nouveau risque
        const newRisk: RiskInProgress = {
          id: `risk_${Date.now()}`,
          description: description.trim(),
          category,
          type: riskType,
          answers: [],
        };
        addRisk(newRisk);
      }
      // Aller au questionnaire pour évaluer ce risque
      router.push("/questionnaire");
    } else {
      // Mode ancien flux (compatibilité)
      setRiskInfo(description, category, riskType);
      router.push("/questionnaire");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>
            {isEditing ? "Modifier le risque" : "Nouveau risque"}
          </Text>
          {state.analysisTitle && (
            <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Risque #{(state.currentRiskIndex ?? state.risks.length) + 1}
            </Text>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#7C3AED" />
        ) : error ? (
          <Text style={{ color: "#ef4444" }}>{error}</Text>
        ) : (
          <>
            {/* Description */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                Description du risque <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Décrivez le risque avec vos mots..."
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
           
            </View>

            {/* Catégorie */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                Catégorie <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <View style={{ gap: 8 }}>
                {categories.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: category === c ? "#7C3AED" : "#d1d5db",
                      backgroundColor: category === c ? "#f5f3ff" : "#fff",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontWeight: category === c ? "700" : "400", color: category === c ? "#7C3AED" : "#374151" }}>
                      {c}
                    </Text>
                    {category === c && <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Type */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                Type de risque <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <View style={{ gap: 8 }}>
                {types.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setRiskType(t)}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: riskType === t ? "#7C3AED" : "#d1d5db",
                      backgroundColor: riskType === t ? "#f5f3ff" : "#fff",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontWeight: riskType === t ? "700" : "400", color: riskType === t ? "#7C3AED" : "#374151" }}>
                      {t}
                    </Text>
                    {riskType === t && <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Bouton continuer */}
            <Pressable
              disabled={!canContinue}
              onPress={handleContinue}
              style={{
                marginTop: 8,
                padding: 16,
                borderRadius: 12,
                backgroundColor: canContinue ? "#7C3AED" : "#9ca3af",
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                Continuer vers l'évaluation
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

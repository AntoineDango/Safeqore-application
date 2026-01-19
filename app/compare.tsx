import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useAnalysis } from "../context/AnalysisContext";
import { compareAnalyses } from "../lib/api";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CompareScreen() {
  const { state, setCompareResult } = useAnalysis();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isWide = width >= 720; // side-by-side threshold
  const [showExplain, setShowExplain] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!state.userResult || !state.description || !state.category || !state.type) {
          setError("Analyse utilisateur introuvable");
          return;
        }
        const r = state.userResult;
        const resp = await compareAnalyses({
          description: state.description,
          category: state.category,
          type: state.type,
          sector: state.sector,
          user_G: r.G,
          user_F: r.F,
          user_P: r.P,
          user_classification: r.classification,
        });
        setCompareResult(resp);
      } catch (e: any) {
        setError(e?.message || "Analyse IA indisponible");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <View style={{ flex:1, justifyContent:"center", alignItems:"center"}}><ActivityIndicator /></View>;
  if (error) return <View style={{ padding:16 }}><Text style={{ color:"#ef4444" }}>{error}</Text></View>;
  if (!state.compareResult || !state.userResult) return <View style={{ padding:16 }}><Text>Données manquantes</Text></View>;

  const human = state.compareResult.human_analysis;
  const ia = state.compareResult.ia_analysis;

  const same = {
    G: human.G === ia.G,
    F: human.F === ia.F,
    P: human.P === ia.P,
    score: human.score === ia.score,
    classification: String(human.classification) === String(ia.classification),
  };

  const normClass = (v: string): "faible" | "modéré" | "élevé" => {
    const s = (v || "").toLowerCase();
    if (s.includes("eleve") || s.includes("élev")) return "élevé";
    if (s.includes("moyen") || s.includes("mod")) return "modéré";
    return "faible";
  };

  const classStyles = (v: string) => {
    switch (normClass(v)) {
      case "élevé":
        return { bg: "#fee2e2", color: "#b91c1c" };
      case "modéré":
        return { bg: "#ffedd5", color: "#9a3412" };
      default:
        return { bg: "#dcfce7", color: "#166534" };
    }
  };

  return (
    <SafeAreaView style={{ flex:1 }}>
      <ScrollView style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:"700" }}>Comparaison avec l'IA</Text>
      {/* Deux cartes synchronisées: Utilisateur | IA */}
      <View style={{ marginTop:12, flexDirection: isWide ? "row" : "column", gap: 12 }}>
        {/* Carte Utilisateur */}
        <View style={{ flex:1, padding:12, borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, backgroundColor:"#fff" }}>
          <Text style={{ fontWeight:"700", marginBottom:8 }}>Utilisateur</Text>
          {/* Chiffres d'abord */}
          <View style={{ padding:10, borderRadius:8, backgroundColor:"#f9fafb" }}>
            <Text style={{ fontSize:12, color:"#6b7280" }}>Score</Text>
            <Text style={{ fontSize:28, fontWeight:"800", color: same.score ? "#111827" : "#ef4444" }}>{human.score}</Text>
            <View style={{ marginTop:8, alignSelf:"flex-start", paddingHorizontal:10, paddingVertical:4, borderRadius:999, backgroundColor: classStyles(String(human.classification)).bg }}>
              <Text style={{ fontWeight:"700", color: classStyles(String(human.classification)).color }}>{String(human.classification)}</Text>
            </View>
          </View>
          {/* Repères G/F/P */}
          <View style={{ marginTop:10, gap:8 }}>
            <View style={{ flexDirection:"row", justifyContent:"space-between", padding:10, borderRadius:6, backgroundColor: same.G ? "#ffffff" : "#fef2f2", borderWidth:1, borderColor:"#e5e7eb" }}>
              <Text style={{ fontWeight:"600" }}>G</Text>
              <Text style={{ fontWeight:"600", color: same.G ? "#111827" : "#ef4444" }}>{human.G}</Text>
            </View>
            <View style={{ flexDirection:"row", justifyContent:"space-between", padding:10, borderRadius:6, backgroundColor: same.F ? "#ffffff" : "#fef2f2", borderWidth:1, borderColor:"#e5e7eb" }}>
              <Text style={{ fontWeight:"600" }}>F</Text>
              <Text style={{ fontWeight:"600", color: same.F ? "#111827" : "#ef4444" }}>{human.F}</Text>
            </View>
            <View style={{ flexDirection:"row", justifyContent:"space-between", padding:10, borderRadius:6, backgroundColor: same.P ? "#ffffff" : "#fef2f2", borderWidth:1, borderColor:"#e5e7eb" }}>
              <Text style={{ fontWeight:"600" }}>P</Text>
              <Text style={{ fontWeight:"600", color: same.P ? "#111827" : "#ef4444" }}>{human.P}</Text>
            </View>
          </View>
        </View>

        {/* Carte IA */}
        <View style={{ flex:1, padding:12, borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, backgroundColor:"#fff" }}>
          <Text style={{ fontWeight:"700", marginBottom:8 }}>IA (assistance)</Text>
          {/* Chiffres d'abord */}
          <View style={{ padding:10, borderRadius:8, backgroundColor:"#f9fafb" }}>
            <Text style={{ fontSize:12, color:"#6b7280" }}>Score</Text>
            <Text style={{ fontSize:28, fontWeight:"800", color: same.score ? "#111827" : "#ef4444" }}>{ia.score}</Text>
            <View style={{ marginTop:8, alignSelf:"flex-start", paddingHorizontal:10, paddingVertical:4, borderRadius:999, backgroundColor: classStyles(String(ia.classification)).bg }}>
              <Text style={{ fontWeight:"700", color: classStyles(String(ia.classification)).color }}>{String(ia.classification)}</Text>
            </View>
          </View>
          {/* Repères G/F/P */}
          <View style={{ marginTop:10, gap:8 }}>
            <View style={{ flexDirection:"row", justifyContent:"space-between", padding:10, borderRadius:6, backgroundColor: same.G ? "#ffffff" : "#fef2f2", borderWidth:1, borderColor:"#e5e7eb" }}>
              <Text style={{ fontWeight:"600" }}>G</Text>
              <Text style={{ fontWeight:"600", color: same.G ? "#111827" : "#ef4444" }}>{ia.G}</Text>
            </View>
            <View style={{ flexDirection:"row", justifyContent:"space-between", padding:10, borderRadius:6, backgroundColor: same.F ? "#ffffff" : "#fef2f2", borderWidth:1, borderColor:"#e5e7eb" }}>
              <Text style={{ fontWeight:"600" }}>F</Text>
              <Text style={{ fontWeight:"600", color: same.F ? "#111827" : "#ef4444" }}>{ia.F}</Text>
            </View>
            <View style={{ flexDirection:"row", justifyContent:"space-between", padding:10, borderRadius:6, backgroundColor: same.P ? "#ffffff" : "#fef2f2", borderWidth:1, borderColor:"#e5e7eb" }}>
              <Text style={{ fontWeight:"600" }}>P</Text>
              <Text style={{ fontWeight:"600", color: same.P ? "#111827" : "#ef4444" }}>{ia.P}</Text>
            </View>
          </View>

          {/* Explications ensuite (accordéon) */}
          <View style={{ marginTop:12 }}>
            <Pressable onPress={() => setShowExplain((v) => !v)} style={{ paddingVertical:8 }}>
              <Text style={{ fontWeight:"700" }}>Explications {showExplain ? "▾" : "▸"}</Text>
            </Pressable>
            {showExplain && ia.justification ? (
              <Text style={{ color:"#374151" }}>{ia.justification}</Text>
            ) : null}
          </View>

          {/* Détails en dernier (accordéon) */}
          <View style={{ marginTop:8 }}>
            <Pressable onPress={() => setShowDetails((v) => !v)} style={{ paddingVertical:8 }}>
              <Text style={{ fontWeight:"700" }}>Détails {showDetails ? "▾" : "▸"}</Text>
            </Pressable>
            {showDetails && (
              <View style={{ gap:8 }}>
                {Array.isArray(ia.causes) && ia.causes.length > 0 && (
                  <View>
                    <Text style={{ fontWeight:"600" }}>Causes</Text>
                    {ia.causes.map((c: string, i: number) => (<Text key={i}>• {c}</Text>))}
                  </View>
                )}
                {Array.isArray(ia.recommendations) && ia.recommendations.length > 0 && (
                  <View>
                    <Text style={{ fontWeight:"600" }}>Recommandations</Text>
                    {ia.recommendations.map((c: string, i: number) => (<Text key={i}>• {c}</Text>))}
                  </View>
                )}
                {!Array.isArray(ia.causes) && !Array.isArray(ia.recommendations) && (
                  <Text style={{ color:"#6b7280" }}>Aucun détail disponible</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>

     

      
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useAnalysis } from "../context/AnalysisContext";
import { compareAnalyses } from "../lib/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthGuard } from "../lib/guard";

export default function CompareScreen() {
  useAuthGuard();
  const { state, setCompareResult } = useAnalysis();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isWide = width >= 720;
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

  if (loading) return <View style={{ flex:1, justifyContent:"center", alignItems:"center", backgroundColor:"#f9fafb"}}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  if (error) return <View style={{ flex:1, justifyContent:"center", alignItems:"center", padding:16, backgroundColor:"#f9fafb" }}><View style={{ padding:20, backgroundColor:"#fee2e2", borderRadius:12, borderWidth:1, borderColor:"#fecaca" }}><Text style={{ color:"#b91c1c", fontSize:16, textAlign:"center" }}>{error}</Text></View></View>;
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
        return { bg: "#fef3c7", color: "#92400e", badge:"#f59e0b" };
      case "modéré":
        return { bg: "#dbeafe", color: "#1e40af", badge:"#3b82f6" };
      default:
        return { bg: "#d1fae5", color: "#065f46", badge:"#10b981" };
    }
  };

  // Graphique barres comparatives G/F/P
  const BarChart = ({ label, userVal, iaVal, isSame }: { label: string; userVal: number; iaVal: number; isSame: boolean }) => {
    const maxVal = 5;
    const userPercent = (userVal / maxVal) * 100;
    const iaPercent = (iaVal / maxVal) * 100;
    
    return (
      <View style={{ marginBottom:16 }}>
        <Text style={{ fontWeight:"600", fontSize:14, marginBottom:6, color:"#374151" }}>{label}</Text>
        <View style={{ gap:6 }}>
          {/* Barre Utilisateur */}
          <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
            <Text style={{ width:70, fontSize:12, color:"#6b7280" }}>Vous</Text>
            <View style={{ flex:1, height:24, backgroundColor:"#e5e7eb", borderRadius:6, overflow:"hidden" }}>
              <View style={{ 
                height:"100%", 
                width:`${userPercent}%`, 
                backgroundColor: isSame ? "#60a5fa" : "#fbbf24",
                justifyContent:"center",
                paddingLeft:8
              }}>
                <Text style={{ color:"#fff", fontWeight:"700", fontSize:12 }}>{userVal}</Text>
              </View>
            </View>
          </View>
          {/* Barre IA */}
          <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
            <Text style={{ width:70, fontSize:12, color:"#6b7280" }}>IA</Text>
            <View style={{ flex:1, height:24, backgroundColor:"#e5e7eb", borderRadius:6, overflow:"hidden" }}>
              <View style={{ 
                height:"100%", 
                width:`${iaPercent}%`, 
                backgroundColor: isSame ? "#34d399" : "#a78bfa",
                justifyContent:"center",
                paddingLeft:8
              }}>
                <Text style={{ color:"#fff", fontWeight:"700", fontSize:12 }}>{iaVal}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Graphique circulaire pour le score
  const ScoreCircle = ({ score, max, color }: { score: number; max: number; color: string }) => {
    const percentage = (score / max) * 100;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View style={{ alignItems:"center", justifyContent:"center", width:120, height:120 }}>
        <View style={{ position:"absolute", width:120, height:120, borderRadius:60, backgroundColor:"#f3f4f6" }} />
        <View style={{ position:"absolute", width:100, height:100, borderRadius:50, backgroundColor:"#fff", borderWidth:8, borderColor:color, alignItems:"center", justifyContent:"center" }}>
          <Text style={{ fontSize:32, fontWeight:"800", color:"#111827" }}>{score}</Text>
          <Text style={{ fontSize:10, color:"#6b7280" }}>/{max}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:"#f9fafb" }}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16 }}>
        {/* En-tête */}
        <View style={{ marginBottom:20 }}>
          <Text style={{ fontSize:26, fontWeight:"800", color:"#111827", marginBottom:4 }}>Comparaison avec l'IA</Text>
          <Text style={{ fontSize:14, color:"#6b7280" }}>Analyse de cohérence entre votre évaluation et l'assistance IA</Text>
        </View>

        {/* Graphique de comparaison G/F/P */}
        <View style={{ padding:20, backgroundColor:"#fff", borderRadius:12, marginBottom:16, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.05, shadowRadius:8, elevation:2 }}>
          <Text style={{ fontSize:18, fontWeight:"700", color:"#111827", marginBottom:16 }}>Comparaison détaillée</Text>
          <BarChart label="Gravité (G)" userVal={human.G} iaVal={ia.G} isSame={same.G} />
          <BarChart label="Fréquence (F)" userVal={human.F} iaVal={ia.F} isSame={same.F} />
          <BarChart label="Probabilité (P)" userVal={human.P} iaVal={ia.P} isSame={same.P} />
        </View>

        {/* Scores et classifications côte à côte */}
        <View style={{ flexDirection: isWide ? "row" : "column", gap: 16, marginBottom:16 }}>
          {/* Carte Utilisateur */}
          <View style={{ flex:1, padding:20, backgroundColor:"#fff", borderRadius:12, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.05, shadowRadius:8, elevation:2, alignItems:"center" }}>
            <Text style={{ fontSize:16, fontWeight:"700", color:"#374151", marginBottom:16 }}>Votre évaluation</Text>
            <ScoreCircle score={human.score} max={100} color={same.score ? "#60a5fa" : "#fbbf24"} />
            <View style={{ marginTop:16, paddingHorizontal:16, paddingVertical:8, borderRadius:999, backgroundColor: classStyles(String(human.classification)).bg }}>
              <Text style={{ fontWeight:"700", fontSize:14, color: classStyles(String(human.classification)).color }}>
                {String(human.classification).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Carte IA */}
          <View style={{ flex:1, padding:20, backgroundColor:"#fff", borderRadius:12, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.05, shadowRadius:8, elevation:2, alignItems:"center" }}>
            <Text style={{ fontSize:16, fontWeight:"700", color:"#374151", marginBottom:16 }}>Évaluation IA</Text>
            <ScoreCircle score={ia.score} max={100} color={same.score ? "#34d399" : "#a78bfa"} />
            <View style={{ marginTop:16, paddingHorizontal:16, paddingVertical:8, borderRadius:999, backgroundColor: classStyles(String(ia.classification)).bg }}>
              <Text style={{ fontWeight:"700", fontSize:14, color: classStyles(String(ia.classification)).color }}>
                {String(ia.classification).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Explications (accordéon) */}
        <View style={{ padding:20, backgroundColor:"#fff", borderRadius:12, marginBottom:16, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.05, shadowRadius:8, elevation:2 }}>
          <Pressable onPress={() => setShowExplain((v) => !v)} style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center" }}>
            <Text style={{ fontSize:16, fontWeight:"700", color:"#111827" }}>💡 Explications de l'IA</Text>
            <Text style={{ fontSize:20, color:"#3b82f6" }}>{showExplain ? "▾" : "▸"}</Text>
          </Pressable>
          {showExplain && ia.justification ? (
            <Text style={{ marginTop:12, color:"#374151", lineHeight:20 }}>{ia.justification}</Text>
          ) : null}
        </View>

        {/* Détails (accordéon) */}
        <View style={{ padding:20, backgroundColor:"#fff", borderRadius:12, marginBottom:32, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.05, shadowRadius:8, elevation:2 }}>
          <Pressable onPress={() => setShowDetails((v) => !v)} style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center" }}>
            <Text style={{ fontSize:16, fontWeight:"700", color:"#111827" }}>📋 Détails complets</Text>
            <Text style={{ fontSize:20, color:"#3b82f6" }}>{showDetails ? "▾" : "▸"}</Text>
          </Pressable>
          {showDetails && (
            <View style={{ marginTop:16, gap:16 }}>
              {Array.isArray(ia.causes) && ia.causes.length > 0 && (
                <View>
                  <Text style={{ fontWeight:"700", fontSize:14, color:"#111827", marginBottom:8 }}>🔍 Causes identifiées</Text>
                  {ia.causes.map((c: string, i: number) => (
                    <Text key={i} style={{ color:"#374151", marginBottom:4, lineHeight:20 }}>• {c}</Text>
                  ))}
                </View>
              )}
              {Array.isArray(ia.recommendations) && ia.recommendations.length > 0 && (
                <View>
                  <Text style={{ fontWeight:"700", fontSize:14, color:"#111827", marginBottom:8 }}>✅ Recommandations</Text>
                  {ia.recommendations.map((c: string, i: number) => (
                    <Text key={i} style={{ color:"#374151", marginBottom:4, lineHeight:20 }}>• {c}</Text>
                  ))}
                </View>
              )}
              {!Array.isArray(ia.causes) && !Array.isArray(ia.recommendations) && (
                <Text style={{ color:"#9ca3af", fontStyle:"italic" }}>Aucun détail supplémentaire disponible</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
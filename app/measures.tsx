import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { useAnalysis } from "../context/AnalysisContext";
import { createResidualAnalysis, getQuestions } from "../lib/api";
import type { ResidualRequest, AnswerItem, Question } from "../lib/types";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

type Dim = "G" | "F" | "P";

export default function MeasuresScreen() {
  const { state, setMeasures } = useAnalysis();
  const [input, setInput] = useState("");
  const [items, setItems] = useState<string[]>(state.measures || []);
  // answers_by_dim: for each measure index, store answers per dim
  const [dimAnswers, setDimAnswers] = useState<Array<{ G?: AnswerItem[]; F?: AnswerItem[]; P?: AnswerItem[] }>>([]);
  const [impacted, setImpacted] = useState<Array<{ G: boolean; F: boolean; P: boolean }>>([]);
  const [dimConfirmed, setDimConfirmed] = useState<Array<{ G: boolean; F: boolean; P: boolean }>>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const needsMeasure = useMemo(() => {
    const cls = state.userResult?.classification;
    return cls === "Modéré" || cls === "Élevé";
  }, [state.userResult?.classification]);

  // Si le risque est Faible, l'ajout de mesures n'est pas autorisé
  useEffect(() => {
    if (state.userResult?.classification === "Faible") {
      Alert.alert("Non requis", "Le risque est Faible : aucune mesure à ajouter.");
      router.replace("/result");
    }
  }, [state.userResult?.classification]);

  // Rediriger si l'utilisateur arrive ici sans résultat calculé
  useEffect(() => {
    if (!state.userResult) {
      router.replace("/result");
    }
  }, [state.userResult]);

  // Garder les tableaux synchronisés avec la liste des mesures
  useEffect(() => {
    setDimAnswers((prev) => {
      const next = [...prev];
      if (next.length < items.length) {
        return next.concat(Array(items.length - next.length).fill({}));
      }
      if (next.length > items.length) {
        return next.slice(0, items.length);
      }
      return next;
    });
  }, [items.length]);

  // Synchroniser confirmations par facteur
  useEffect(() => {
    setDimConfirmed((prev) => {
      const next = [...prev];
      if (next.length < items.length) {
        return next.concat(Array(items.length - next.length).fill({ G:false, F:false, P:false }));
      }
      if (next.length > items.length) {
        return next.slice(0, items.length);
      }
      return next;
    });
  }, [items.length]);

  // Synchroniser les facteurs impactés avec la liste des mesures
  useEffect(() => {
    setImpacted((prev) => {
      const next = [...prev];
      if (next.length < items.length) {
        return next.concat(Array(items.length - next.length).fill({ G: false, F: false, P: false }));
      }
      if (next.length > items.length) {
        return next.slice(0, items.length);
      }
      return next;
    });
  }, [items.length]);

  // Charger la banque de questions
  useEffect(() => {
    (async () => {
      try {
        if (!state.sector) return;
        const resp = await getQuestions(state.sector);
        setQuestions(resp.questions || []);
      } catch (_) {}
    })();
  }, [state.sector]);

  // Normalize raw score (G*F*P, max 125) to 0..100
  const to100 = (raw: number) => Math.round((raw / 125) * 100);
  // Thresholds mapped to 0..100: 25/125=20, 50/125=40
  const classify = (score100: number): "Faible" | "Modéré" | "Élevé" =>
    score100 <= 20 ? "Faible" : score100 <= 40 ? "Modéré" : "Élevé";

  const orig = useMemo(() => ({
    G: state.userResult?.G || 1,
    F: state.userResult?.F || 1,
    P: state.userResult?.P || 1,
  }), [state.userResult?.G, state.userResult?.F, state.userResult?.P]);

  const toggleImpact = (ix: number, dim: Dim) => {
    setImpacted((prev) => {
      const arr = [...prev];
      const cur = arr[ix] || { G: false, F: false, P: false };
      arr[ix] = { ...cur, [dim]: !cur[dim] };
      return arr;
    });
    setDimConfirmed((prev) => {
      const arr = [...prev];
      const cur = arr[ix] || { G:false, F:false, P:false };
      arr[ix] = { ...cur, [dim]: false };
      return arr;
    });
  };

  const qByDim = useMemo(() => ({
    G: questions.filter(q => q.dimension === "G"),
    F: questions.filter(q => q.dimension === "F"),
    P: questions.filter(q => q.dimension === "P"),
  }), [questions]);

  const setDimAnswer = (ix: number, dim: Dim, question_id: string, option_id: string) => {
    setDimAnswers((prev) => {
      const arr = [...prev];
      const cur = arr[ix] || {};
      const list = (cur[dim] || []) as AnswerItem[];
      const idxQ = list.findIndex(a => a.question_id === question_id);
      const nextList = [...list];
      if (idxQ >= 0) nextList[idxQ] = { question_id, option_id };
      else nextList.push({ question_id, option_id });
      arr[ix] = { ...cur, [dim]: nextList };
      return arr;
    });
    setDimConfirmed((prev) => {
      const arr = [...prev];
      const cur = arr[ix] || { G:false, F:false, P:false };
      arr[ix] = { ...cur, [dim]: false };
      return arr;
    });
  };

  const computeDimValue = (dim: Dim, answers: AnswerItem[] | undefined): number | null => {
    if (!answers || answers.length === 0) return null;
    const bank = qByDim[dim];
    const rel = Object.fromEntries(bank.map(q => [q.id, q]));
    let sums = 0, weights = 0;
    for (const a of answers) {
      const q = rel[a.question_id]; if (!q) continue;
      const o = q.reponses_possibles.find(op => op.id === a.option_id); if (!o) continue;
      const w = Number(q.poids || 1);
      sums += o.contribution * w;
      weights += w;
    }
    if (weights <= 0) return null;
    const v = Math.round(sums / weights);
    return Math.max(1, Math.min(5, v));
  };

  const measureResult = (ix: number) => {
    const imp = impacted[ix] || { G: false, F: false, P: false };
    const ans = dimAnswers[ix] || {};
    const gVal = imp.G ? computeDimValue("G", ans.G) : orig.G;
    const fVal = imp.F ? computeDimValue("F", ans.F) : orig.F;
    const pVal = imp.P ? computeDimValue("P", ans.P) : orig.P;
    if ((imp.G && !gVal) || (imp.F && !fVal) || (imp.P && !pVal)) return null;
    const G = gVal as number; const F = fVal as number; const P = pVal as number;
    const scoreRaw = G * F * P;
    const score = to100(scoreRaw);
    return { G, F, P, score, classification: classify(score) };
  };

  const finalResult = useMemo(() => {
    for (let i = items.length - 1; i >= 0; i--) {
      const res = measureResult(i);
      if (res) return res;
    }
    return null;
  }, [items.length, dimAnswers, impacted, orig.G, orig.F, orig.P]);

  const addItem = () => {
    const v = input.trim();
    if (!v) return;
    setItems((prev) => [...prev, v]);
    setInput("");
  };

  const removeItem = (ix: number) => {
    setItems((prev) => prev.filter((_, i) => i !== ix));
  };

  const [submitting, setSubmitting] = useState(false);

  const onFinish = async () => {
    if (needsMeasure) {
      if (items.length === 0) {
        Alert.alert("Action requise", "Veuillez ajouter au moins une mesure si le risque est Modéré/Élevé");
        return;
      }
      for (let i = 0; i < items.length; i++) {
        const imp = impacted[i] || { G: false, F: false, P: false };
        if (!imp.G && !imp.F && !imp.P) {
          Alert.alert("Facteurs requis", "Sélectionnez au moins un facteur impacté (G/F/P) pour chaque mesure");
          return;
        }
        const ans = dimAnswers[i] || {};
        if ((imp.G && (!ans.G || ans.G.length === 0)) ||
            (imp.F && (!ans.F || ans.F.length === 0)) ||
            (imp.P && (!ans.P || ans.P.length === 0))) {
          Alert.alert("Questionnaire requis", "Répondez aux questions pour chaque facteur impacté");
          return;
        }
        const conf = dimConfirmed[i] || { G:false, F:false, P:false };
        if ((imp.G && !conf.G) || (imp.F && !conf.F) || (imp.P && !conf.P)) {
          Alert.alert("Validation requise", "Confirmez la nouvelle note pour chaque facteur impacté");
          return;
        }
      }
    }
    // Persist residuals to backend if we have a parent analysis id
    try {
      setSubmitting(true);
      if (state.userResult?.id) {
        const payload: ResidualRequest = {
          parent_id: state.userResult.id,
          measures: items.map((text, i) => {
            const imp = impacted[i] || { G: false, F: false, P: false };
            const ans = dimAnswers[i] || {};
            const answers_by_dim: Partial<Record<Dim, AnswerItem[]>> = {};
            if (imp.G && ans.G) answers_by_dim.G = ans.G;
            if (imp.F && ans.F) answers_by_dim.F = ans.F;
            if (imp.P && ans.P) answers_by_dim.P = ans.P;
            return {
              text,
              impacted: imp,
              new_values: {},
              answers_by_dim: answers_by_dim as any,
            };
          }),
        };
        await createResidualAnalysis(payload);
      }
    } catch (e: any) {
      Alert.alert("Sauvegarde échouée", e?.message || "Impossible d'enregistrer la ré-estimation");
    } finally {
      setSubmitting(false);
    }

    setMeasures(items);
    router.push("/history");
  };

  return (
    <SafeAreaView style={{ flex:1 }}>
      <ScrollView style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:"700" }}>Mesures de réduction</Text>
      <Text style={{ marginTop:6, color: "#6b7280" }}>
        Proposez des actions pour réduire le risque. Vous pourrez comparer avant/après ensuite.
      </Text>

      <View style={{ marginTop:16 }}>
        <Text>Nouvelle mesure</Text>
        <View style={{ flexDirection:"row", gap:8, marginTop:6 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ex: Mettre en place une redondance"
            style={{ flex:1, borderWidth:1, borderColor:"#d1d5db", padding:10, borderRadius:8 }}
          />
          <Pressable onPress={addItem} style={{ paddingHorizontal:14, justifyContent:"center", borderRadius:8, backgroundColor:"#e5e7eb" }}>
            <Text>Ajouter</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop:16, gap:8 }}>
        {items.map((m, i) => {
          const res = measureResult(i);
          return (
            <View key={`${m}-${i}`} style={{ padding:12, borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, backgroundColor:"#fff" }}>
              <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center" }}>
                <Text style={{ flex:1, marginRight:8 }}>• {m}</Text>
                <Pressable onPress={() => removeItem(i)} style={{ paddingHorizontal:8, paddingVertical:4, borderRadius:6, backgroundColor:"#fee2e2" }}>
                  <Text style={{ color:"#b91c1c" }}>Supprimer</Text>
                </Pressable>
              </View>

              <View style={{ marginTop:10 }}>
                <Text style={{ marginBottom:6, color:"#374151" }}>Facteurs impactés</Text>
                <View style={{ flexDirection:"row", marginBottom:8 }}>
                  {["G","F","P"].map((dim) => {
                    const active = (impacted[i] || { G:false, F:false, P:false })[dim as Dim];
                    return (
                      <Pressable key={dim}
                        onPress={() => toggleImpact(i, dim as Dim)}
                        style={{ marginRight:8, paddingHorizontal:10, paddingVertical:6, borderRadius:6, borderWidth:1, borderColor: active ? "#16a34a" : "#d1d5db", backgroundColor: active ? "#dcfce7" : "#fff" }}
                      >
                        <Text>{dim}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={{ marginBottom:6, color:"#374151" }}>Ré-estimez les facteurs cochés (mini-questionnaire)</Text>

                {["G","F","P"].map((dim) => {
                  const D = dim as Dim;
                  const impSel = impacted[i] || { G:false, F:false, P:false };
                  const isOn = impSel[D];
                  if (!isOn) {
                    const keep = orig[D];
                    return (
                      <View key={dim} style={{ flexDirection:"row", alignItems:"center", marginBottom:6 }}>
                        <Text style={{ width:18, fontWeight:"700" }}>{dim}</Text>
                        <Text style={{ marginLeft:8, color:"#6b7280" }}>Conserve: {keep}</Text>
                      </View>
                    );
                  }
                  // Mini-questionnaire: afficher les questions de la dimension
                  const qlist = qByDim[D];
                  const answers = (dimAnswers[i]?.[D] || []) as AnswerItem[];
                  const setA = (qid: string, oid: string) => setDimAnswer(i, D, qid, oid);
                  const v = computeDimValue(D, answers);
                  const confirmed = dimConfirmed[i]?.[D] || false;
                  return (
                    <View key={dim} style={{ marginBottom:6 }}>
                      <Text style={{ width:18, fontWeight:"700" }}>{dim}</Text>
                      <View style={{ marginTop:6, gap:8 }}>
                        {qlist.map(q => (
                          <View key={q.id} style={{ padding:8, borderWidth:1, borderColor:"#e5e7eb", borderRadius:6 }}>
                            <Text style={{ fontWeight:"600" }}>{q.texte_question}</Text>
                            <View style={{ flexDirection:"row", flexWrap:"wrap", marginTop:6 }}>
                              {q.reponses_possibles.map(opt => {
                                const active = !!answers.find(a => a.question_id === q.id && a.option_id === opt.id);
                                return (
                                  <Pressable key={opt.id}
                                    onPress={() => setA(q.id, opt.id)}
                                    style={{ marginRight:8, marginBottom:8, paddingHorizontal:10, paddingVertical:6, borderRadius:6, borderWidth:1, borderColor: active ? "#2563eb" : "#d1d5db", backgroundColor: active ? "#dbeafe" : "#fff" }}
                                  >
                                    <Text>{opt.label}</Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        ))}
                      </View>
                      {v && (
                        <View style={{ marginTop:8 }}>
                          <Text>Nouvelle valeur calculée: {v}</Text>
                        </View>
                      )}
                      <Pressable
                        onPress={() => setDimConfirmed(prev => { const arr=[...prev]; const cur=arr[i]||{G:false,F:false,P:false}; arr[i] = { ...cur, [D]: !confirmed }; return arr; })}
                        style={{ marginTop:8, paddingHorizontal:10, paddingVertical:6, borderRadius:6, borderWidth:1, borderColor: confirmed ? "#16a34a" : "#d1d5db", backgroundColor: confirmed ? "#dcfce7" : "#fff" }}
                      >
                        <Text>{confirmed ? "✓ Je confirme la nouvelle note" : "Je confirme la nouvelle note"}</Text>
                      </Pressable>
                    </View>
                  );
                })}

                {res && (
                  <View style={{ marginTop:8 }}>
                    <Text style={{ color:"#374151" }}>
                      Avant: G{orig.G} F{orig.F} P{orig.P} — Score {to100(orig.G * orig.F * orig.P)}/100
                    </Text>
                    <Text style={{ color:"#374151" }}>
                      Après: G{res.G} F{res.F} P{res.P} — Score {res.score}/100 → {res.classification}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
        {items.length === 0 && (
          <Text style={{ color:"#6b7280" }}>Aucune mesure pour l'instant</Text>
        )}
      </View>

      <Pressable disabled={submitting} onPress={onFinish} style={{ marginTop:24, padding:14, borderRadius:8, backgroundColor: submitting ? "#9ca3af" : "#2563eb", alignItems:"center" }}>
        <Text style={{ color:"white", fontWeight:"600" }}>{submitting ? "Enregistrement..." : "Continuer"}</Text>
      </Pressable>

      {needsMeasure && (
        <Text style={{ marginTop:10, color:"#ef4444" }}>Au moins une mesure est requise car le niveau est {state.userResult?.classification}.</Text>
      )}

      {finalResult && (
        <View style={{ marginTop:16, padding:12, borderRadius:8, backgroundColor:"#f9fafb", borderWidth:1, borderColor:"#e5e7eb" }}>
          <Text style={{ fontWeight:"700" }}>Nouvelle estimation (après mesures)</Text>
          <Text style={{ marginTop:4 }}>G: {finalResult.G}   F: {finalResult.F}   P: {finalResult.P}   Score: {finalResult.score}/100</Text>
          <Text style={{ marginTop:2 }}>Classification: {finalResult.classification}</Text>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

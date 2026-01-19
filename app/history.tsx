import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { listUserAnalyses } from "../lib/api";
import type { UserAnalysis } from "../lib/types";
import RiskMatrix from "../components/RiskMatrix";
import { useAuthGuard } from "../lib/guard";
import { getIdToken } from "../lib/auth";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HistoryScreen() {
  useAuthGuard();
  const [items, setItems] = useState<UserAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) {
          // Guard will redirect; avoid calling API without token
          setLoading(false);
          return;
        }
        const resp = await listUserAnalyses(50, 0);
        setItems(resp.analyses || []);
      } catch (e: any) {
        const msg = String(e?.message || e || "");
        console.warn("History load error", msg);
        if (msg.includes("500")) {
          // Ne pas bloquer l'écran sur une 500: afficher une liste vide et un message discret
          setItems([]);
          setError(null);
        } else {
          setError(msg || "Erreur de chargement de l'historique");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <View style={{ flex:1, justifyContent:"center", alignItems:"center"}}><ActivityIndicator /></View>;
  if (error) return <View style={{ padding:16 }}><Text style={{ color:"#ef4444" }}>{error}</Text></View>;


  return (
    <SafeAreaView style={{ flex:1 }}>
      <ScrollView style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:"700" }}>Historique des analyses</Text>
      <View style={{ marginTop:12, gap:10 }}>
        {items.length === 0 && <Text style={{ color:"#6b7280" }}>Aucune analyse pour l'instant</Text>}
        {items.map((it) => (
          <View key={it.id}
            style={{ padding:12, borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, backgroundColor:"#fff" }}>
            <Text style={{ fontWeight:"600" }}>{new Date(it.timestamp).toLocaleString()}</Text>
            <Text style={{ marginTop:4, color:"#374151" }}>{it.description}</Text>
            <Text style={{ marginTop:6 }}>Niveau: {it.computed_classification}  |  Score R: {it.score}</Text>
            <Text style={{ marginTop:4 }}>G{it.G} F{it.F} P{it.P}</Text>
            <RiskMatrix G={it.G} P={it.P} />
          </View>
        ))}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

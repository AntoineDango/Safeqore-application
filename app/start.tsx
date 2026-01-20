import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, TextInput, Platform } from "react-native";
 
import { useAnalysis } from "../context/AnalysisContext";
import { getConstants } from "../lib/api";
import { useAuthGuard } from "../lib/guard";

import { SafeAreaView } from "react-native-safe-area-context";
export default function StartScreen() {
  useAuthGuard();
  const { state, setSector, setProjectName } = useAnalysis();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectors, setSectors] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | undefined>(state.sector);
  const [project, setProject] = useState<string>(state.projectName || "");

  useEffect(() => {
    (async () => {
      try {
        const c = await getConstants();
        setSectors(c.sectors || []);
      } catch (e: any) {
        setError(e?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canContinue = !!selected;

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Démarrer une analyse</Text>
      
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={{ color: "red" }}>{error}</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {sectors.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSelected(s)}
              style={{
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: selected === s ? "#2563eb" : "#d1d5db",
                backgroundColor: selected === s ? "#dbeafe" : "#fff",
              }}
            >
              <Text>{s}</Text>
            </Pressable>
          ))}
       
    </View>
      )}

      <View style={{ marginTop: 16 }}>
        <Text>Nom du projet (optionnel)</Text>
        <TextInput
          value={project}
          onChangeText={setProject}
          placeholder="Mon projet"
          style={{ borderWidth: 1, borderColor: "#d1d5db", padding: 10, borderRadius: 8 }}
        />
      </View>

      <Pressable
        disabled={!canContinue}
        onPress={() => {
          if (!selected) return;
          setSector(selected);
          setProjectName(project || undefined);
          // navigate to risk screen
          // Use dynamic import to avoid heavy coupling
          import("expo-router").then(({ router }) => router.push("/risk"));
        }}
        style={{
          marginTop: 24,
          padding: 14,
          borderRadius: 8,
          backgroundColor: canContinue ? "#2563eb" : "#9ca3af",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Commencer l'analyse</Text>
      </Pressable>
    </SafeAreaView>
  );
}

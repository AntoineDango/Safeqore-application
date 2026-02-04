import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { getProject, updateProject } from "../lib/api";
import type { AnalysisProject } from "../lib/types";

export default function ProjectFullEditScreen() {
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<AnalysisProject | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProject(projectId);
        setProject(p);
        setTitle(p.analysis_title || "");
        setDescription(p.project_description || "");
      } catch (e: any) {
        setError(e?.message || "Impossible de charger le projet");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const handleSave = async () => {
    if (!project) return;
    if (!title.trim() || !description.trim()) {
      Alert.alert("Attention", "Le titre et la description sont obligatoires");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProject(project.id, { analysis_title: title.trim(), project_description: description.trim() });
      setProject(updated);
      Alert.alert("Succès", "Projet mis à jour", [{ text: "OK", onPress: () => router.replace({ pathname: "/saved-project-view", params: { projectId: updated.id } }) }]);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex:1, justifyContent:"center", alignItems:"center", backgroundColor: "#f9fafb" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (error || !project) {
    return (
      <SafeAreaView style={{ flex:1, justifyContent:"center", alignItems:"center", backgroundColor: "#f9fafb", padding: 16 }}>
        <View style={{ padding: 20, backgroundColor: "#fee2e2", borderRadius: 12, borderWidth: 1, borderColor: "#fecaca" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Erreur</Text>
          <Text style={{ color: "#6b7280", textAlign: "center" }}>{error || "Projet introuvable"}</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "#7C3AED" }}>
            <Text style={{ color: "white", fontWeight: "600" }}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#fff" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, borderRadius: 12, backgroundColor: "#f3f4f6" }}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>Modifier le projet</Text>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>{new Date(project.created_at).toLocaleDateString()}</Text>
        </View>
      </View>

      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Infos générales */}
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Titre</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre du projet"
            style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 12, backgroundColor: "#fff", marginBottom: 12 }}
          />

          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description du projet"
            multiline
            numberOfLines={4}
            style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 12, backgroundColor: "#fff", minHeight: 100, textAlignVertical: "top" }}
          />
        </View>

        {/* Liste des risques (lecture seule pour le moment) */}
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 12 }}>Risques</Text>
          {project.risks.map((r, idx) => (
            <View key={r.id || idx} style={{ padding: 12, borderRadius: 8, backgroundColor: "#f9fafb", marginBottom: 8, borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Text style={{ fontWeight: "700", color: "#111827" }}>#{idx + 1} {r.category} · {r.type}</Text>
              <Text style={{ color: "#374151", marginTop: 4 }}>{r.description}</Text>
              <Text style={{ color: "#6b7280", marginTop: 6, fontSize: 12 }}>G: {r.initial_evaluation.G}  F: {r.initial_evaluation.F}  P: {r.initial_evaluation.P}</Text>
            </View>
          ))}
          <Text style={{ color: "#9ca3af", fontSize: 12 }}>Édition des risques détaillée à venir.</Text>
        </View>

        {/* Actions */}
        <Pressable onPress={handleSave} disabled={saving} style={{ borderRadius: 12, overflow: "hidden" }}>
          <LinearGradient colors={["#7C3AED", "#2563EB"]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ paddingVertical: 16, alignItems: "center" }}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Enregistrer</Text>}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}


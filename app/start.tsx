import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, TextInput, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useAnalysis } from "../context/AnalysisContext";
import { getConstants } from "../lib/api";
import { useAuthGuard } from "../lib/guard";
import { SafeAreaView } from "react-native-safe-area-context";
import type { EntityType } from "../lib/types";

const ENTITY_TYPES: EntityType[] = [
  "Startup",
  "TPE",
  "PME",
  "ETI",
  "Grands groupes",
  "Indépendant/auto-entrepreneur",
];

export default function StartScreen() {
  useAuthGuard();
  const { state, setProjectInfo } = useAnalysis();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectors, setSectors] = useState<string[]>([]);
  
  // Nouveaux états pour le projet
  const [projectType, setProjectType] = useState<"project" | "entity">(state.projectType || "project");
  const [projectDescription, setProjectDescription] = useState(state.projectDescription || "");
  const [entityType, setEntityType] = useState<EntityType | undefined>(state.entityType);
  const [entityServices, setEntityServices] = useState(state.entityServices || "");
  const [analysisTitle, setAnalysisTitle] = useState(state.analysisTitle || "");
  const [selectedSector, setSelectedSector] = useState<string | undefined>(state.sector);

  const isMobile = Platform.OS === "ios" || Platform.OS === "android";

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

  const canContinue = 
    projectDescription.trim().length >= 10 &&
    analysisTitle.trim().length >= 5 &&
    (projectType === "project" || (entityType && entityServices.trim().length >= 10));

  const handleBack = () => {
    if (isMobile) {
      router.replace("/(tabs)");
    } else {
      router.back();
    }
  };

  const handleContinue = () => {
    if (!canContinue) return;
    
    setProjectInfo(
      projectType,
      projectDescription.trim(),
      analysisTitle.trim(),
      selectedSector,
      entityType,
      projectType === "entity" ? entityServices.trim() : undefined
    );
    
    router.push("/project-risks-list");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
        <Pressable onPress={handleBack} style={{ padding: 8, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827" }}>Nouveau projet d'analyse</Text>
          <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Initialisation</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#7C3AED" />
        ) : error ? (
          <Text style={{ color: "#ef4444" }}>{error}</Text>
        ) : (
          <>
            {/* Type de projet/entité */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                Type d'analyse
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable
                  onPress={() => setProjectType("project")}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: projectType === "project" ? "#7C3AED" : "#e5e7eb",
                    backgroundColor: projectType === "project" ? "#f5f3ff" : "#fff",
                  }}
                >
                  <Ionicons name="briefcase" size={24} color={projectType === "project" ? "#7C3AED" : "#6b7280"} />
                  <Text style={{ marginTop: 8, fontWeight: "700", color: projectType === "project" ? "#7C3AED" : "#374151" }}>
                    Projet/Programme
                  </Text>
                </Pressable>
                
                <Pressable
                  onPress={() => setProjectType("entity")}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: projectType === "entity" ? "#7C3AED" : "#e5e7eb",
                    backgroundColor: projectType === "entity" ? "#f5f3ff" : "#fff",
                  }}
                >
                  <Ionicons name="business" size={24} color={projectType === "entity" ? "#7C3AED" : "#6b7280"} />
                  <Text style={{ marginTop: 8, fontWeight: "700", color: projectType === "entity" ? "#7C3AED" : "#374151" }}>
                    Entité
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Description */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                {projectType === "project" ? "Description du projet" : "Description de l'entité"}
              </Text>
              <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                {projectType === "project" 
                  ? "Décrivez le projet ou le programme en quelques mots"
                  : "Décrivez l'entité, ses missions, ses services et produits"}
              </Text>
              <TextInput
                value={projectDescription}
                onChangeText={setProjectDescription}
                placeholder={projectType === "project" ? "Ex: Développement d'une nouvelle application mobile..." : "Ex: Entreprise de services informatiques spécialisée dans..."}
                multiline
                numberOfLines={4}
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

            {/* Type d'entité */}
            {projectType === "entity" && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                  Type d'entité
                </Text>
                <View style={{ gap: 8 }}>
                  {ENTITY_TYPES.map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setEntityType(type)}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: entityType === type ? "#7C3AED" : "#d1d5db",
                        backgroundColor: entityType === type ? "#f5f3ff" : "#fff",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={{ fontWeight: entityType === type ? "700" : "400", color: entityType === type ? "#7C3AED" : "#374151" }}>
                        {type}
                      </Text>
                      {entityType === type && <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Services et produits */}
            {projectType === "entity" && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                  Services et produits
                </Text>
                <TextInput
                  value={entityServices}
                  onChangeText={setEntityServices}
                  placeholder="Décrivez les services et produits de l'entité..."
                  multiline
                  numberOfLines={3}
                  style={{
                    borderWidth: 1,
                    borderColor: "#d1d5db",
                    borderRadius: 12,
                    padding: 12,
                    backgroundColor: "#fff",
                    minHeight: 80,
                    textAlignVertical: "top",
                  }}
                />
               
              </View>
            )}

            {/* Titre du projet d'analyse */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                Titre du projet d'analyse <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <TextInput
                value={analysisTitle}
                onChangeText={setAnalysisTitle}
                placeholder="Ex: Analyse des risques cyber 2026"
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 12,
                  padding: 12,
                  backgroundColor: "#fff",
                }}
              />
              
            </View>

            {/* Secteur d'activité */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                Secteur d'activité (optionnel)
              </Text>
              <View style={{ gap: 8 }}>
                {sectors.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSelectedSector(selectedSector === s ? undefined : s)}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selectedSector === s ? "#7C3AED" : "#d1d5db",
                      backgroundColor: selectedSector === s ? "#f5f3ff" : "#fff",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontWeight: selectedSector === s ? "700" : "400", color: selectedSector === s ? "#7C3AED" : "#374151" }}>
                      {s}
                    </Text>
                    {selectedSector === s && <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Bouton continuer */}
            <Pressable
              onPress={handleContinue}
              disabled={!canContinue}
              style={{ borderRadius: 12, overflow: "hidden", marginBottom: 20 }}
            >
              <LinearGradient
                colors={canContinue ? ["#7C3AED", "#2563EB"] : ["#9ca3af", "#6b7280"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              >
                <Ionicons name="arrow-forward" size={20} color="#fff" />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                  Continuer vers les risques
                </Text>
              </LinearGradient>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

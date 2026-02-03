import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Platform } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthGuard } from "../lib/guard";
import { getConstants, createProject } from "../lib/api";
import type { EntityType } from "../lib/types";

const ENTITY_TYPES: EntityType[] = [
  "Startup",
  "TPE",
  "PME",
  "ETI",
  "Grands groupes",
  "Indépendant/auto-entrepreneur",
];

export default function ProjectInitScreen() {
  const { loading: authLoading, authenticated } = useAuthGuard();
  
  const [projectType, setProjectType] = useState<"project" | "entity">("project");
  const [projectDescription, setProjectDescription] = useState("");
  const [entityType, setEntityType] = useState<EntityType | undefined>(undefined);
  const [entityServices, setEntityServices] = useState("");
  const [analysisTitle, setAnalysisTitle] = useState("");
  const [sector, setSector] = useState<string | undefined>(undefined);
  
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMobile = Platform.OS === "ios" || Platform.OS === "android";

  useEffect(() => {
    if (!authenticated) return;
    
    (async () => {
      try {
        const constants = await getConstants();
        setSectors(constants.sectors || []);
      } catch (e: any) {
        setError(e?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [authenticated]);

  const canContinue = 
    projectDescription.trim().length >= 10 &&
    analysisTitle.trim().length >= 5 &&
    (projectType === "project" || (entityType && entityServices.trim().length >= 10));

  const handleCreate = async () => {
    if (!canContinue) return;
    
    setCreating(true);
    setError(null);
    
    try {
      const project = await createProject({
        project_type: projectType,
        project_description: projectDescription.trim(),
        entity_type: projectType === "entity" ? entityType : undefined,
        entity_services: projectType === "entity" ? entityServices.trim() : undefined,
        analysis_title: analysisTitle.trim(),
        sector: sector,
      });
      
      // Naviguer vers l'écran de gestion des risques
      router.push({
        pathname: "/project-risks",
        params: { projectId: project.id },
      } as any);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la création du projet");
      setCreating(false);
    }
  };

  const handleBack = () => {
    if (isMobile) {
      router.replace("/(tabs)");
    } else {
      router.back();
    }
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ marginTop: 16, color: "#6b7280" }}>Chargement...</Text>
      </SafeAreaView>
    );
  }

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

        {/* Description du projet/entité */}
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
          <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            {projectDescription.length}/500 caractères (min. 10)
          </Text>
        </View>

        {/* Type d'entité (si entité sélectionnée) */}
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

        {/* Services et produits (si entité) */}
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
            <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
              {entityServices.length}/300 caractères (min. 10)
            </Text>
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
          <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            {analysisTitle.length}/100 caractères (min. 5)
          </Text>
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
                onPress={() => setSector(sector === s ? undefined : s)}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: sector === s ? "#7C3AED" : "#d1d5db",
                  backgroundColor: sector === s ? "#f5f3ff" : "#fff",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontWeight: sector === s ? "700" : "400", color: sector === s ? "#7C3AED" : "#374151" }}>
                  {s}
                </Text>
                {sector === s && <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Erreur */}
        {error && (
          <View style={{ marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: "#fee2e2", borderLeftWidth: 4, borderLeftColor: "#ef4444" }}>
            <Text style={{ color: "#991b1b", fontWeight: "600" }}>{error}</Text>
          </View>
        )}

        {/* Bouton de création */}
        <Pressable
          onPress={handleCreate}
          disabled={!canContinue || creating}
          style={{ borderRadius: 12, overflow: "hidden", marginBottom: 20 }}
        >
          <LinearGradient
            colors={canContinue && !creating ? ["#7C3AED", "#2563EB"] : ["#9ca3af", "#6b7280"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                  Créer le projet et ajouter les risques
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

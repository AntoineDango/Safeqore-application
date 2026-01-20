import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView, RefreshControl, TextInput, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthGuard } from "../lib/guard";
import { getProfile, listUserAnalyses } from "../lib/api";
import type { UserAnalysis, QuestionnaireAnalyzeResponse } from "../lib/types";
import { emit, on, last } from "../lib/events";
import { router } from "expo-router";
import { signOut } from "../lib/auth_client";
import { useFocusEffect } from "@react-navigation/native";

function SkeletonCard() {
  return (
    <View style={{ height: 100, borderRadius: 16, backgroundColor: "#f3f4f6", overflow: "hidden" }} />
  );
}

function StatCard({ title, value, icon, colors }: { title: string; value: string | number; icon: React.ReactNode; colors: readonly [string, string] | readonly [string, string, ...string[]]; }) {
  return (
    <LinearGradient colors={colors} start={{x:0, y:0}} end={{x:1, y:1}} style={{ padding: 16, borderRadius: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ color: "#e5e7eb", fontSize: 12 }}>{title}</Text>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>{value}</Text>
        </View>
        <View style={{ backgroundColor: "rgba(255,255,255,0.15)", width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          {icon}
        </View>
      </View>
    </LinearGradient>
  );
}

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={{ alignSelf:"flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ color, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function ScorePill({ score }: { score: number }) {
  // display as small progress pill 0..100
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 100, height: 10, backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: 10, backgroundColor: pct >= 70 ? "#f59e0b" : pct >= 40 ? "#3b82f6" : "#10b981" }} />
      </View>
      <Text style={{ fontWeight: "700", color: "#111827" }}>{pct}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  useAuthGuard();
  const [profileName, setProfileName] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<UserAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"today"|"week"|"month"|"all">("all");
  const [q, setQ] = useState("");
  const [showToast, setShowToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const p = await getProfile();
      setProfileName(p?.profile?.name || p?.profile?.email || undefined);
      const resp = await listUserAnalyses(100, 0);
      setItems(resp.analyses || []);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement du dashboard");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload on screen focus to keep dashboard dynamic after navigation
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
    // Consume any pending created-analysis event (e.g., user just came from Result screen)
    try {
      const pending = last("analysis:created", true) as QuestionnaireAnalyzeResponse | undefined;
      if (pending && pending.id) {
        const optimistic: UserAnalysis = {
          id: pending.id,
          timestamp: pending.timestamp,
          description: pending.description,
          category: pending.category,
          type: pending.type,
          G: pending.G,
          F: pending.F,
          P: pending.P,
          score: (pending as any).normalized_score_100 ?? pending.score,
          computed_classification: pending.classification,
          sector: pending.sector,
        };
        setItems((prev) => {
          if (prev.find((x) => x.id === optimistic.id)) return prev;
          return [optimistic, ...prev];
        });
        setShowToast("Analyse enregistrée avec succès ✓");
        setTimeout(() => setShowToast(null), 2000);
      }
    } catch {}
    const off = on("analysis:created", (payload?: any) => {
      try {
        // Map payload (QuestionnaireAnalyzeResponse) to UserAnalysis for optimistic update
        const p = payload as QuestionnaireAnalyzeResponse | undefined;
        if (p && p.id) {
          const optimistic: UserAnalysis = {
            id: p.id,
            timestamp: p.timestamp,
            description: p.description,
            category: p.category,
            type: p.type,
            G: p.G,
            F: p.F,
            P: p.P,
            score: (p as any).normalized_score_100 ?? p.score,
            computed_classification: p.classification,
            sector: p.sector,
          };
          setItems((prev) => {
            if (prev.find((x) => x.id === optimistic.id)) return prev;
            return [optimistic, ...prev];
          });
        }
      } catch {}
      setShowToast("Analyse enregistrée avec succès ✓");
      setTimeout(() => setShowToast(null), 2500);
      // delayed refresh to sync with backend persistence
      setTimeout(() => load(), 1200);
    });
    return () => { off(); };
  }, [load]);

  const now = useMemo(() => new Date(), []);

  // derive stats
  const filtered = useMemo(() => {
    const base = items.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
    const byPeriod = base.filter((it) => {
      const d = new Date(it.timestamp);
      const diffDays = (now.getTime() - d.getTime()) / (1000*60*60*24);
      if (filter === "today") return diffDays < 1;
      if (filter === "week") return diffDays < 7;
      if (filter === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      return true;
    });
    const byQuery = q.trim() ? byPeriod.filter((it) => it.description?.toLowerCase().includes(q.trim().toLowerCase())) : byPeriod;
    return byQuery;
  }, [items, filter, q, now]);

  const totalAnalyses = items.length;
  const monthAnalyses = items.filter((it) => {
    const d = new Date(it.timestamp);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const avgScore = items.length ? Math.round(items.reduce((a, b) => a + (b.score || 0), 0) / items.length) : 0;
  const highRiskCount = items.filter((it) => (it.computed_classification || "").toLowerCase().includes("élev")).length;

  const recent = filtered.slice(0, 10);

  const classBadge = (cls?: string) => {
    const s = (cls || "").toLowerCase();
    if (s.includes("élev") || s.includes("eleve")) return { bg: "#fef3c7", color: "#92400e", label: "Élevé" };
    if (s.includes("mod")) return { bg: "#dbeafe", color: "#1e40af", label: "Modéré" };
    return { bg: "#d1fae5", color: "#065f46", label: "Faible" };
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: "#f9fafb" }}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 14, color: "#6b7280" }}>Bonjour{profileName ? `, ${profileName}` : ""}</Text>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827" }}>Votre tableau de bord</Text>
            <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{now.toLocaleString()}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => router.push("/profile" as any)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="settings-outline" size={18} color="#374151" />
              <Text style={{ color: "#374151", fontWeight: "600" }}>Profil</Text>
            </Pressable>
            <Pressable onPress={async () => { await signOut(); router.replace("/login"); }} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fecaca", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="log-out-outline" size={18} color="#b91c1c" />
              <Text style={{ color: "#b91c1c", fontWeight: "700" }}>Déconnexion</Text>
            </Pressable>
          </View>
        </View>

        {showToast && (
          <View style={{ marginBottom: 12, backgroundColor: "#d1fae5", borderLeftWidth: 4, borderLeftColor: "#10b981", padding: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={{ color: "#065f46", fontWeight: "600" }}>{showToast}</Text>
          </View>
        )}

        {/* Filters + Search */}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <Pressable onPress={() => setFilter("all")} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: filter === "all" ? "#dbeafe" : "#fff", borderWidth: 1, borderColor: filter === "all" ? "#60a5fa" : "#e5e7eb" }}>
            <Text style={{ color: filter === "all" ? "#1e40af" : "#374151", fontWeight: "600" }}>Tout</Text>
          </Pressable>

          <View style={{ flex: 1, minWidth: 180, position: "relative" }}>
            <Ionicons name="search" size={18} color="#9ca3af" style={{ position: "absolute", left: 10, top: 10 }} />
            <TextInput value={q} onChangeText={setQ} placeholder="Rechercher une analyse" placeholderTextColor="#9ca3af" style={{ paddingLeft: 34, paddingRight: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }} />
          </View>
        </View>

        {/* Stats grid */}
        {loading ? (
          <View style={{ gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: Platform.OS === "web" ? "row" : "column", flexWrap: "wrap", gap: 12 }}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <StatCard title="Total des analyses" value={totalAnalyses} icon={<Ionicons name="bar-chart" size={20} color="#fff" />} colors={["#7C3AED", "#2563EB"] as const} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <StatCard title="Analyses ce mois" value={monthAnalyses} icon={<Ionicons name="calendar" size={20} color="#fff" />} colors={["#2563EB", "#60a5fa"] as const} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <StatCard title="Score moyen" value={`${avgScore}/100`} icon={<Ionicons name="speedometer" size={20} color="#fff" />} colors={["#3b82f6", "#10b981"] as const} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <StatCard title="Risque élevé" value={highRiskCount} icon={<Ionicons name="warning" size={20} color="#fff" />} colors={["#f59e0b", "#ef4444"] as const} />
              </View>
            </View>
          </View>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <View style={{ marginTop: 16, padding: 24, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="analytics" size={36} color="#7C3AED" />
            </View>
            <Text style={{ marginTop: 12, fontSize: 18, fontWeight: "800", color: "#111827" }}>Commencez votre première analyse de risque</Text>
            <Text style={{ marginTop: 4, color: "#6b7280", textAlign: "center" }}>Identifiez et évaluez les risques professionnels en quelques minutes</Text>
            <Pressable onPress={() => router.push("/start")} style={{ marginTop: 16, borderRadius: 12, overflow: "hidden" }}>
              <LinearGradient colors={["#7C3AED", "#2563EB"]} start={{x:0, y:0}} end={{x:1, y:1}} style={{ paddingVertical: 14, paddingHorizontal: 20 }}>
                <Text style={{ color: "white", fontWeight: "800" }}>Nouvelle analyse</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Recent list */}
        {recent.length > 0 && (
          <View style={{ marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>Analyses récentes</Text>
              <Pressable onPress={() => router.push("/history")}>
                <Text style={{ color: "#2563eb", fontWeight: "700" }}>Voir plus</Text>
              </Pressable>
            </View>
            <View style={{ gap: 10 }}>
              {recent.map((it) => {
                const b = classBadge(it.computed_classification);
                const desc = it.description?.length > 90 ? it.description.slice(0, 90) + "…" : it.description;
                return (
                  <View key={it.id} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#6b7280", fontSize: 12 }}>{new Date(it.timestamp).toLocaleString()}</Text>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 2 }}>{desc}</Text>
                        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <Badge label={it.category} bg="#eef2ff" color="#3730a3" />
                          <Badge label={(b.label)} bg={b.bg} color={b.color} />
                          <ScorePill score={it.score} />
                        </View>
                      </View>
                      <View style={{ gap: 8 }}>
                        <Pressable onPress={() => router.push({ pathname: "/result", params: { id: it.id } } as any)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f3f4f6" }}>
                          <Text style={{ color: "#374151", fontWeight: "600" }}>Voir détails</Text>
                        </Pressable>
                        <Pressable onPress={() => router.push("/compare")} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#e0e7ff" }}>
                          <Text style={{ color: "#3730a3", fontWeight: "700" }}>Comparer avec IA</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
              {filtered.length === 0 && (
                <Text style={{ color: "#6b7280" }}>Aucune analyse récente</Text>
              )}
            </View>
          </View>
        )}

        {/* Charts placeholders (lightweight) */}
        {items.length > 0 && (
          <View style={{ marginTop: 16, gap: 12 }}>
            {/* Bar chart: classification distribution */}
            <View style={{ padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Text style={{ fontWeight: "800", color: "#111827", marginBottom: 8 }}>Répartition par classification</Text>
              {(() => {
                const groups = { faible: 0, modere: 0, eleve: 0 } as Record<string, number>;
                items.forEach((it) => {
                  const s = it.computed_classification.toLowerCase();
                  if (s.includes("élev") || s.includes("eleve")) groups.eleve++;
                  else if (s.includes("mod")) groups.modere++;
                  else groups.faible++;
                });
                const max = Math.max(1, groups.faible, groups.modere, groups.eleve);
                const Bar = ({ label, n, color }: { label: string; n: number; color: string }) => (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <Text style={{ width: 90, color: "#374151" }}>{label}</Text>
                    <View style={{ flex: 1, backgroundColor: "#f3f4f6", height: 12, borderRadius: 999, overflow: "hidden" }}>
                      <View style={{ width: `${Math.round((n / max) * 100)}%`, backgroundColor: color, height: 12 }} />
                    </View>
                    <Text style={{ width: 30, textAlign: "right", color: "#111827", fontWeight: "700" }}>{n}</Text>
                  </View>
                );
                return (
                  <View>
                    <Bar label="Faible" n={groups.faible} color="#10b981" />
                    <Bar label="Modéré" n={groups.modere} color="#3b82f6" />
                    <Bar label="Élevé" n={groups.eleve} color="#f59e0b" />
                  </View>
                );
              })()}
            </View>

            {/* Line chart: avg scores by month (simple) */}
            <View style={{ padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Text style={{ fontWeight: "800", color: "#111827", marginBottom: 8 }}>Évolution des scores moyens</Text>
              {(() => {
                // group by YYYY-MM
                const map = new Map<string, number[]>();
                items.forEach((it) => {
                  const d = new Date(it.timestamp);
                  const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                  map.set(k, [...(map.get(k) || []), it.score || 0]);
                });
                const pairs = Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b)).slice(-6);
                if (pairs.length === 0) return <Text style={{ color: "#6b7280" }}>Aucune donnée</Text>;
                const max = Math.max(1, ...pairs.map(([k, arr]) => Math.round(arr.reduce((x, y) => x + y, 0) / arr.length)));
                return (
                  <View style={{ gap: 6 }}>
                    {pairs.map(([k, arr]) => {
                      const avg = Math.round(arr.reduce((x, y) => x + y, 0) / arr.length);
                      return (
                        <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ width: 70, color: "#374151" }}>{k}</Text>
                          <View style={{ flex: 1, backgroundColor: "#f3f4f6", height: 10, borderRadius: 999, overflow: "hidden" }}>
                            <View style={{ width: `${Math.round((avg / max) * 100)}%`, height: 10, backgroundColor: "#7C3AED" }} />
                          </View>
                          <Text style={{ width: 36, textAlign: "right", color: "#111827", fontWeight: "700" }}>{avg}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>

            {/* Donut-like distribution by category (approximation) */}
            <View style={{ padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Text style={{ fontWeight: "800", color: "#111827", marginBottom: 8 }}>Répartition par catégorie</Text>
              {(() => {
                const counts = new Map<string, number>();
                items.forEach((it) => counts.set(it.category, (counts.get(it.category) || 0) + 1));
                const total = Array.from(counts.values()).reduce((a, b) => a + b, 0) || 1;
                const entries = Array.from(counts.entries()).sort((a,b) => b[1] - a[1]);
                if (entries.length === 0) return <Text style={{ color: "#6b7280" }}>Aucune donnée</Text>;
                return (
                  <View style={{ gap: 6 }}>
                    {entries.map(([cat, n]) => (
                      <View key={cat} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ width: 120, color: "#374151" }}>{cat}</Text>
                        <View style={{ flex: 1, backgroundColor: "#f3f4f6", height: 10, borderRadius: 999, overflow: "hidden" }}>
                          <View style={{ width: `${Math.round((n / total) * 100)}%`, height: 10, backgroundColor: "#2563EB" }} />
                        </View>
                        <Text style={{ width: 40, textAlign: "right", color: "#111827", fontWeight: "700" }}>{n}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Floating Action Button */}
      <Pressable onPress={() => router.push("/start")} style={{ position: "absolute", right: 20, bottom: 20, borderRadius: 999, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 }}>
        <LinearGradient colors={["#7C3AED", "#2563EB"]} start={{x:0, y:0}} end={{x:1, y:1}} style={{ padding: 16 }}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView, RefreshControl, TextInput, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthGuard } from "../../lib/guard";
import { getProfile, listUserAnalyses } from "../../lib/api";
import type { UserAnalysis, QuestionnaireAnalyzeResponse } from "../../lib/types";
import { emit, on, last } from "../../lib/events";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import DashboardScreen from "../dashboard";

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

export default function HomeScreen() {
  // Afficher exactement le même dashboard que la page "/dashboard"
  return <DashboardScreen />;
}

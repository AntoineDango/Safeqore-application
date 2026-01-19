import React from "react";
import { View, Text } from "react-native";

// Simple 5x5 Risk Matrix
// X axis: P (1..5) left->right, Y axis: G (1..5) bottom->top
// Cell colors by G*P thresholds: <=25 green, <=50 yellow, >50 red

function cellColor(g: number, p: number) {
  const score = g * p;
  if (score <= 25) return "#d1fae5"; // green-100
  if (score <= 50) return "#fef9c3"; // yellow-100
  return "#fee2e2"; // red-100
}

export default function RiskMatrix({ G, P }: { G: number; P: number }) {
  const rows = [5,4,3,2,1];
  const cols = [1,2,3,4,5];

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontWeight: "700", marginBottom: 8 }}>Matrice de risques</Text>
      <View style={{ flexDirection: "row" }}>
        {/* Y axis label */}
        <View style={{ width: 20, alignItems: "center", justifyContent: "center", marginRight: 6 }}>
          <Text>G</Text>
        </View>
        {/* Grid */}
        <View>
          {rows.map((g) => (
            <View key={g} style={{ flexDirection: "row" }}>
              {cols.map((p) => {
                const isPoint = G === g && P === p;
                return (
                  <View key={`${g}-${p}`} style={{
                    width: 28, height: 28, borderWidth: 1, borderColor: "#e5e7eb",
                    backgroundColor: cellColor(g, p), alignItems: "center", justifyContent: "center"
                  }}>
                    {isPoint ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#111827" }} /> : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      {/* X axis label */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 6 }}>
        <Text>P</Text>
      </View>
    </View>
  );
}

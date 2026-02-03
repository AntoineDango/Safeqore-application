import { useEffect } from "react";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAnalysis } from "../../context/AnalysisContext";

export default function AddScreen() {
  const { state, setCurrentRiskIndex } = useAnalysis();
  
  // Utiliser useFocusEffect pour rediriger à chaque fois que le tab est sélectionné
  useFocusEffect(
    useCallback(() => {
      // Si un projet est en cours, ajouter un risque
      if (state.analysisTitle) {
        setCurrentRiskIndex(state.risks.length);
        router.push("/risk");
      } else {
        // Sinon, créer un nouveau projet
        router.push("/start");
      }
    }, [state.analysisTitle, state.risks.length])
  );

  // Afficher un loader pendant la redirection
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#7C3AED" />
    </SafeAreaView>
  );
}

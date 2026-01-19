import { Stack } from "expo-router";
import { AnalysisProvider } from "../context/AnalysisContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AnalysisProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AnalysisProvider>
    </SafeAreaProvider>
  );
}

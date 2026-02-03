import { Stack } from "expo-router";
import { AnalysisProvider } from "../context/AnalysisContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFirebaseAuth } from "../lib/useFirebaseAuth";
import { Platform } from "react-native";

function RootLayoutContent() {
  // Initialize Firebase auth listener to keep token cache in sync
  useFirebaseAuth();
  
  const isMobile = Platform.OS === "ios" || Platform.OS === "android";
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isMobile ? (
        // Sur mobile, utiliser les tabs comme écran principal
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      ) : (
        // Sur web, utiliser le dashboard classique
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AnalysisProvider>
        <RootLayoutContent />
      </AnalysisProvider>
    </SafeAreaProvider>
  );
}

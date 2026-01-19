import { Platform } from "react-native";
import Constants from "expo-constants";

function resolveApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_BASE_URL;
  let base = env && env.trim() ? env : "http://localhost:4000";

  try {
    const m = base.match(/^https?:\/\/([^/:]+)(?::(\d+))?/);
    const host = m?.[1] || "";
    const port = m?.[2] || "4000";

    if (Platform.OS !== "web" && (host === "localhost" || host === "127.0.0.1")) {
      const hostUri: string | undefined =
        (Constants?.expoConfig?.hostUri as string | undefined) ||
        (Constants as any)?.manifest?.debuggerHost;
      const lan = typeof hostUri === "string" ? hostUri.split(":")[0] : undefined;
      if (lan && /^\d+\.\d+\.\d+\.\d+$/.test(lan)) {
        return `http://${lan}:${port}`;
      }
      if (Platform.OS === "android") {
        return `http://10.0.2.2:${port}`;
      }
    }
  } catch {}

  return base;
}

export const API_BASE_URL = resolveApiBase();

interface RuntimeConfig {
  apiBaseUrl: string;
}

let config: RuntimeConfig | null = null;
let configPromise: Promise<void> | null = null;

// Try to get config from Vite env vars first, then fallback to config.json
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function loadConfig(): Promise<void> {
  // If we have Vite env var, use it directly
  if (VITE_API_BASE_URL) {
    config = { apiBaseUrl: VITE_API_BASE_URL };
    console.log("[Config] Using VITE_API_BASE_URL:", config.apiBaseUrl);
    return;
  }

  if (config) return;
  if (configPromise) return configPromise;

  // Fallback to config.json
  configPromise = fetch("/config.json")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load config.json");
      return res.json();
    })
    .then((data) => {
      if (!data.apiBaseUrl) {
        throw new Error("config.json missing apiBaseUrl");
      }
      config = data as RuntimeConfig;
      console.log("[Config] Loaded from config.json:", config.apiBaseUrl);
    })
    .catch((err) => {
      console.error("[Config] Error loading config:", err);
      // Final fallback to hardcoded URL
      config = { apiBaseUrl: "https://api.invunion.com" };
      console.log("[Config] Using fallback URL:", config.apiBaseUrl);
    });

  return configPromise;
}

export function getApiBaseUrl(): string | null {
  // Direct check for Vite env var (sync)
  if (VITE_API_BASE_URL) {
    return VITE_API_BASE_URL;
  }
  return config?.apiBaseUrl ?? null;
}

export function isConfigLoaded(): boolean {
  return config !== null || !!VITE_API_BASE_URL;
}

import { LLMSettings } from "./types";

const STORAGE_KEY = "chess3d_llm_settings";

export class LLMSettingsStore {
  static save(settings: LLMSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  static load(): LLMSettings | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static getDefaults(): LLMSettings {
    return {
      enabled: false,
      config: {
        provider: "openai",
        apiKey: "",
        model: "gpt-4o",
      },
      playStyle: "balanced",
    };
  }
}

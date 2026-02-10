import { LLMConfig, AIPersonality } from "./types";
import { createProvider } from "./providers";

const CHILL_PROMPT = "You're a friendly chess AI about to play a game. Give yourself a fun, creative name (2-3 words max). Just reply with the name, nothing else.";
const SAVAGE_PROMPT = "You're a ruthless, intimidating chess AI about to destroy your opponent. Give yourself a threatening, menacing name (2-3 words max). Just reply with the name, nothing else.";

const FALLBACK_NAMES: Record<AIPersonality, string> = {
  chill: "Chill Bot",
  savage: "The Savage",
};

export class NameGenerator {
  static async generateName(
    config: LLMConfig,
    personality: AIPersonality
  ): Promise<string> {
    try {
      const provider = createProvider(config);
      const prompt = personality === "savage" ? SAVAGE_PROMPT : CHILL_PROMPT;
      let name = "";
      await provider.complete(
        "You are a chess AI naming yourself. Reply with ONLY the name, nothing else.",
        prompt,
        (chunk) => {
          if (!chunk.done) name += chunk.text;
        }
      );
      name = name.trim().replace(/["'.]/g, "").slice(0, 30);
      return name || FALLBACK_NAMES[personality];
    } catch {
      return FALLBACK_NAMES[personality];
    }
  }
}

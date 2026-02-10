const MODEL_TOKEN_LIMITS: Record<string, number> = {
  // OpenAI
  "gpt-4o": 128000,
  "gpt-4o-mini": 128000,
  "gpt-4-turbo": 128000,
  "o1-mini": 128000,
  // Anthropic
  "claude-sonnet-4-20250514": 200000,
  "claude-3-5-haiku-20241022": 200000,
  // Gemini
  "gemini-2.0-flash": 1000000,
  "gemini-1.5-pro": 2000000,
  // Groq
  "llama-3.3-70b-versatile": 128000,
  "mixtral-8x7b-32768": 32768,
  "llama-3.1-8b-instant": 131072,
};

const DEFAULT_LIMIT = 32000;
const RESPONSE_RESERVE = 600;
const SYSTEM_PROMPT_RESERVE = 600;

export class TokenEstimator {
  static estimate(text: string): number {
    return Math.ceil(text.length / 4);
  }

  static getModelLimit(model: string): number {
    return MODEL_TOKEN_LIMITS[model] || DEFAULT_LIMIT;
  }

  static getAvailableBudget(model: string): number {
    const limit = this.getModelLimit(model);
    return limit - RESPONSE_RESERVE - SYSTEM_PROMPT_RESERVE;
  }

  static getBudgetInfo(
    model: string,
    usedTokens: number
  ): { used: number; budget: number; remaining: number } {
    const budget = this.getAvailableBudget(model);
    return {
      used: usedTokens,
      budget,
      remaining: Math.max(0, budget - usedTokens),
    };
  }
}

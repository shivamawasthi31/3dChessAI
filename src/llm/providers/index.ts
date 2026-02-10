import { LLMProvider } from "../LLMProvider";
import { LLMConfig, ProviderInfo } from "../types";
import { OpenAIProvider } from "./OpenAIProvider";
import { AnthropicProvider } from "./AnthropicProvider";
import { GeminiProvider } from "./GeminiProvider";
import { GroqProvider } from "./GroqProvider";

export function createProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    case "gemini":
      return new GeminiProvider(config);
    case "groq":
      return new GroqProvider(config);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

export function getAllProviderInfos(): ProviderInfo[] {
  const dummyConfig = { provider: "openai" as const, apiKey: "", model: "" };
  return [
    new OpenAIProvider(dummyConfig).getProviderInfo(),
    new AnthropicProvider({ ...dummyConfig, provider: "anthropic" }).getProviderInfo(),
    new GeminiProvider({ ...dummyConfig, provider: "gemini" }).getProviderInfo(),
    new GroqProvider({ ...dummyConfig, provider: "groq" }).getProviderInfo(),
  ];
}

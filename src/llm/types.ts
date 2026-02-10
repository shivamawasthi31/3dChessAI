export type LLMProviderType = "openai" | "anthropic" | "gemini" | "groq";

export type PlayStyle = "aggressive" | "defensive" | "balanced";

export interface LLMConfig {
  provider: LLMProviderType;
  apiKey: string;
  model: string;
  proxyUrl?: string;
}

export interface LLMSettings {
  enabled: boolean;
  config: LLMConfig;
  playStyle: PlayStyle;
}

export interface LLMRequest {
  fen: string;
  pgn: string;
  moveHistory: string[];
  legalMoves: string[];
  playStyle: PlayStyle;
  aiColor: "white" | "black";
  memorySummary?: string;
}

export interface LLMStreamChunk {
  text: string;
  done: boolean;
}

export interface ProviderModelInfo {
  id: string;
  name: string;
}

export interface ProviderInfo {
  type: LLMProviderType;
  name: string;
  models: ProviderModelInfo[];
  supportsBrowserCORS: boolean;
  defaultModel: string;
}

export interface ThinkingUpdate {
  text: string;
  done: boolean;
  reasoning?: string;
  chosenMove?: string;
}

export type OnThinkingUpdate = (update: ThinkingUpdate) => void;

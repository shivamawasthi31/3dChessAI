import { LLMProvider } from "../LLMProvider";
import { LLMStreamChunk, ProviderInfo } from "../types";

export class OpenAIProvider extends LLMProvider {
  getProviderInfo(): ProviderInfo {
    return {
      type: "openai",
      name: "OpenAI",
      models: [
        { id: "gpt-4o", name: "GPT-4o" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini" },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
        { id: "o1-mini", name: "o1-mini" },
      ],
      supportsBrowserCORS: true,
      defaultModel: "gpt-4o",
    };
  }

  protected getDirectEndpoint(): string {
    return "https://api.openai.com/v1/chat/completions";
  }

  async validateKey(): Promise<boolean> {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<string> {
    const response = await fetch(this.getEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    return this.parseSSEStream(response, onChunk, (parsed) => {
      return parsed.choices?.[0]?.delta?.content || null;
    });
  }
}

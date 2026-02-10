import { LLMProvider } from "../LLMProvider";
import { LLMStreamChunk, ProviderInfo } from "../types";

export class GeminiProvider extends LLMProvider {
  getProviderInfo(): ProviderInfo {
    return {
      type: "gemini",
      name: "Google Gemini",
      models: [
        { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      ],
      supportsBrowserCORS: true,
      defaultModel: "gemini-2.0-flash",
    };
  }

  protected getDirectEndpoint(): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}`;
  }

  async validateKey(): Promise<boolean> {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.apiKey}`
      );
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
    const endpoint = this.config.proxyUrl
      ? this.config.proxyUrl
      : `${this.getDirectEndpoint()}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    // Gemini streams SSE with JSON candidates
    return this.parseSSEStream(response, onChunk, (parsed) => {
      return parsed.candidates?.[0]?.content?.parts?.[0]?.text || null;
    });
  }
}

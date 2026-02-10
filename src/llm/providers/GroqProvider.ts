import { LLMProvider } from "../LLMProvider";
import { LLMStreamChunk, ProviderInfo } from "../types";

export class GroqProvider extends LLMProvider {
  getProviderInfo(): ProviderInfo {
    return {
      type: "groq",
      name: "Groq",
      models: [
        { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
        { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
        { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B" },
      ],
      supportsBrowserCORS: true,
      defaultModel: "llama-3.3-70b-versatile",
    };
  }

  protected getDirectEndpoint(): string {
    return "https://api.groq.com/openai/v1/chat/completions";
  }

  async validateKey(): Promise<boolean> {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
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
      throw new Error(`Groq API error: ${response.status}`);
    }

    // Groq uses OpenAI-compatible SSE format
    return this.parseSSEStream(response, onChunk, (parsed) => {
      return parsed.choices?.[0]?.delta?.content || null;
    });
  }
}

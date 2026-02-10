import { LLMProvider } from "../LLMProvider";
import { LLMStreamChunk, ProviderInfo } from "../types";

export class AnthropicProvider extends LLMProvider {
  getProviderInfo(): ProviderInfo {
    return {
      type: "anthropic",
      name: "Anthropic (Claude)",
      models: [
        { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
        { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
      ],
      supportsBrowserCORS: false,
      defaultModel: "claude-sonnet-4-20250514",
    };
  }

  protected getDirectEndpoint(): string {
    return "https://api.anthropic.com/v1/messages";
  }

  async validateKey(): Promise<boolean> {
    try {
      const res = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 10,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.config.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    };
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<string> {
    const response = await fetch(this.getEndpoint(), {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    // Anthropic SSE uses event types
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === "content_block_delta") {
            const text = parsed.delta?.text || "";
            if (text) {
              fullText += text;
              onChunk({ text, done: false });
            }
          } else if (parsed.type === "message_stop") {
            onChunk({ text: "", done: true });
            return fullText;
          }
        } catch {
          // skip
        }
      }
    }

    onChunk({ text: "", done: true });
    return fullText;
  }
}

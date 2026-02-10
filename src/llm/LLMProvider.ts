import { LLMConfig, LLMStreamChunk, ProviderInfo } from "./types";

export abstract class LLMProvider {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract getProviderInfo(): ProviderInfo;

  abstract complete(
    systemPrompt: string,
    userPrompt: string,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<string>;

  abstract validateKey(): Promise<boolean>;

  protected getEndpoint(): string {
    if (this.config.proxyUrl) {
      return this.config.proxyUrl;
    }
    return this.getDirectEndpoint();
  }

  protected abstract getDirectEndpoint(): string;

  protected async parseSSEStream(
    response: Response,
    onChunk: (chunk: LLMStreamChunk) => void,
    extractContent: (parsed: any) => string | null
  ): Promise<string> {
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
        if (data === "[DONE]") {
          onChunk({ text: "", done: true });
          return fullText;
        }

        try {
          const parsed = JSON.parse(data);
          const content = extractContent(parsed);
          if (content) {
            fullText += content;
            onChunk({ text: content, done: false });
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    onChunk({ text: "", done: true });
    return fullText;
  }
}

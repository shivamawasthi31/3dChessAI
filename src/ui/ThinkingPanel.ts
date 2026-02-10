import { ThinkingUpdate } from "llm/types";

export class ThinkingPanel {
  private panel: HTMLDivElement;
  private header: HTMLDivElement;
  private content: HTMLDivElement;
  private finalAnalysis: HTMLDivElement;

  constructor() {
    this.createPanel();
  }

  private createPanel(): void {
    this.panel = document.createElement("div");
    this.panel.className = "thinking-panel";

    this.header = document.createElement("div");
    this.header.className = "thinking-header";
    this.header.textContent = "AI Thinking";

    this.content = document.createElement("div");
    this.content.className = "thinking-content";

    this.finalAnalysis = document.createElement("div");
    this.finalAnalysis.className = "thinking-final";

    this.panel.appendChild(this.header);
    this.panel.appendChild(this.content);
    this.panel.appendChild(this.finalAnalysis);

    document.body.appendChild(this.panel);
  }

  handleUpdate(update: ThinkingUpdate): void {
    if (!update.done) {
      this.show();
      this.appendChunk(update.text);
      return;
    }

    if (update.reasoning && update.chosenMove) {
      this.showFinalAnalysis(update.reasoning, update.chosenMove);
    }
  }

  private appendChunk(text: string): void {
    this.finalAnalysis.style.display = "none";
    this.content.style.display = "block";
    this.header.textContent = "AI Thinking";

    const span = document.createElement("span");
    span.className = "thinking-chunk";
    span.textContent = text;
    this.content.appendChild(span);
    this.content.scrollTop = this.content.scrollHeight;
  }

  private showFinalAnalysis(reasoning: string, chosenMove: string): void {
    this.content.style.display = "none";
    this.finalAnalysis.style.display = "block";
    this.header.textContent = "AI Move";

    this.finalAnalysis.innerHTML = "";

    const moveEl = document.createElement("div");
    moveEl.className = "thinking-move";
    moveEl.textContent = chosenMove;
    this.finalAnalysis.appendChild(moveEl);

    const reasoningEl = document.createElement("div");
    reasoningEl.className = "thinking-reasoning";
    reasoningEl.textContent = reasoning;
    this.finalAnalysis.appendChild(reasoningEl);

    // Auto-hide after 5 seconds
    setTimeout(() => this.hide(), 5000);
  }

  show(): void {
    this.panel.classList.add("visible");
  }

  hide(): void {
    this.panel.classList.remove("visible");
  }

  clear(): void {
    this.content.innerHTML = "";
    this.finalAnalysis.innerHTML = "";
    this.finalAnalysis.style.display = "none";
    this.content.style.display = "block";
  }

  destroy(): void {
    this.panel.remove();
  }
}

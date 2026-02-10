import { ThinkingUpdate } from "llm/types";

export class ThinkingPanel {
  private popup: HTMLDivElement | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private streamBuffer = "";

  constructor() {}

  handleUpdate(update: ThinkingUpdate): void {
    if (!update.done) {
      // While streaming, show a small "thinking..." indicator
      this.streamBuffer += update.text;
      this.showThinkingIndicator();
      return;
    }

    // Done — show final move as popup
    this.dismissPopup();
    if (update.reasoning && update.chosenMove) {
      this.showMovePopup(update.chosenMove, update.reasoning);
    }
    this.streamBuffer = "";
  }

  private showThinkingIndicator(): void {
    if (this.popup && this.popup.classList.contains("thinking-indicator")) return;
    this.dismissPopup();

    this.popup = document.createElement("div");
    this.popup.className = "thinking-popup thinking-indicator";
    this.popup.innerHTML = `<span class="thinking-dots">AI thinking<span>...</span></span>`;
    document.body.appendChild(this.popup);

    requestAnimationFrame(() => this.popup?.classList.add("visible"));
  }

  private showMovePopup(move: string, reasoning: string): void {
    this.popup = document.createElement("div");
    this.popup.className = "thinking-popup";

    // Truncate reasoning to ~120 chars for brief display
    const shortReason = reasoning.length > 120 ? reasoning.slice(0, 117) + "..." : reasoning;

    this.popup.innerHTML = `
      <div class="thinking-popup-move">${move}</div>
      <div class="thinking-popup-reason">${shortReason}</div>
    `;
    document.body.appendChild(this.popup);

    requestAnimationFrame(() => this.popup?.classList.add("visible"));

    this.hideTimer = setTimeout(() => this.dismissPopup(), 4000);
  }

  private dismissPopup(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.popup) {
      this.popup.classList.remove("visible");
      const el = this.popup;
      setTimeout(() => el.remove(), 300);
      this.popup = null;
    }
  }

  show(): void {}
  hide(): void { this.dismissPopup(); }

  clear(): void {
    this.streamBuffer = "";
    this.dismissPopup();
  }

  destroy(): void {
    this.dismissPopup();
  }
}

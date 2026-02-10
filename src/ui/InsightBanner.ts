import { MoveInsight } from "llm/types";

export class InsightBanner {
  private banner: HTMLDivElement;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.banner = document.createElement("div");
    this.banner.className = "insight-banner";
    document.body.appendChild(this.banner);
  }

  show(insight: MoveInsight): void {
    if (insight.quality === "good" && !insight.betterMove) return;

    if (this.hideTimer) clearTimeout(this.hideTimer);

    this.banner.className = `insight-banner ${insight.quality}`;

    const qualityLabels: Record<string, string> = {
      brilliant: "Brilliant!",
      good: "Good",
      inaccuracy: "Inaccuracy",
      blunder: "Blunder",
      missed_win: "Missed Win",
    };

    this.banner.innerHTML = `
      <span class="insight-quality">${qualityLabels[insight.quality] || insight.quality}</span>
      <span class="insight-text">${insight.explanation || `You played ${insight.playerMove}`}</span>
      <button class="insight-close">&times;</button>
    `;

    const closeBtn = this.banner.querySelector(".insight-close") as HTMLButtonElement;
    closeBtn.onclick = () => this.hide();

    requestAnimationFrame(() => {
      this.banner.classList.add("visible");
    });

    this.hideTimer = setTimeout(() => this.hide(), 8000);
  }

  hide(): void {
    this.banner.classList.remove("visible");
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  destroy(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.banner.remove();
  }
}

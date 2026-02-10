import { PlayerGameStats } from "llm/memory/types";

export class EndGameStatsPanel {
  private container: HTMLDivElement | null = null;

  show(
    endMsg: string,
    resultType: "win" | "loss" | "draw",
    stats: PlayerGameStats | null,
    onRestart: () => void,
    onHistory: () => void
  ): void {
    this.destroy();

    this.container = document.createElement("div");
    this.container.className = "center-mid endgame-stats";

    const resultEl = document.createElement("div");
    resultEl.className = `endgame-result ${resultType}`;
    resultEl.textContent = endMsg;
    this.container.appendChild(resultEl);

    if (stats) {
      const grid = document.createElement("div");
      grid.className = "endgame-stats-grid";

      grid.appendChild(this.createStat("Accuracy", `${stats.accuracy}%`));
      grid.appendChild(this.createStat("Brilliant", String(stats.brilliantMoves)));
      grid.appendChild(this.createStat("Blunders", String(stats.blunders)));
      grid.appendChild(this.createStat("Best Streak", String(stats.longestGoodStreak)));

      this.container.appendChild(grid);
    }

    const btnRow = document.createElement("div");
    btnRow.className = "endgame-buttons";

    const restartBtn = document.createElement("button");
    restartBtn.className = "btn-small";
    restartBtn.textContent = "Restart Game";
    restartBtn.onclick = () => {
      this.destroy();
      onRestart();
    };

    const historyBtn = document.createElement("button");
    historyBtn.className = "btn-small";
    historyBtn.textContent = "View History";
    historyBtn.onclick = () => onHistory();

    btnRow.appendChild(restartBtn);
    btnRow.appendChild(historyBtn);
    this.container.appendChild(btnRow);

    // Ad
    const ad = document.createElement("div");
    ad.className = "endgame-ad";
    ad.innerHTML = `<a href="https://devloytech.in" target="_blank" rel="noopener">Devloy Technologies</a> · <a href="https://workflows.devloytech.in" target="_blank" rel="noopener">Workflows</a>`;
    this.container.appendChild(ad);

    document.body.appendChild(this.container);
  }

  private createStat(label: string, value: string): HTMLDivElement {
    const item = document.createElement("div");
    item.className = "stat-item";
    item.innerHTML = `
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    `;
    return item;
  }

  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}

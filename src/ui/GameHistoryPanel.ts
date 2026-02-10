import { GameHistoryStore } from "llm/memory/GameHistoryStore";
import { GameRecord } from "llm/memory/types";

export class GameHistoryPanel {
  private backdrop: HTMLDivElement;
  private panel: HTMLDivElement;

  constructor() {
    this.createPanel();
  }

  private createPanel(): void {
    this.backdrop = document.createElement("div");
    this.backdrop.className = "settings-backdrop";
    this.backdrop.onclick = () => this.hide();

    this.panel = document.createElement("div");
    this.panel.className = "history-panel";
    this.panel.onclick = (e) => e.stopPropagation();

    const title = document.createElement("h2");
    title.textContent = "Game History";
    title.className = "settings-title";
    this.panel.appendChild(title);

    const list = document.createElement("div");
    list.className = "history-list";
    list.id = "history-list";
    this.panel.appendChild(list);

    const btnRow = document.createElement("div");
    btnRow.className = "settings-buttons";

    const clearBtn = document.createElement("button");
    clearBtn.className = "settings-btn settings-btn-cancel";
    clearBtn.textContent = "Clear History";
    clearBtn.onclick = () => {
      GameHistoryStore.clearHistory();
      this.refreshList();
    };

    const closeBtn = document.createElement("button");
    closeBtn.className = "settings-btn settings-btn-save";
    closeBtn.textContent = "Close";
    closeBtn.onclick = () => this.hide();

    btnRow.appendChild(clearBtn);
    btnRow.appendChild(closeBtn);
    this.panel.appendChild(btnRow);

    this.backdrop.appendChild(this.panel);
    document.body.appendChild(this.backdrop);
    this.backdrop.style.display = "none";
  }

  private refreshList(): void {
    const list = document.getElementById("history-list")!;
    list.innerHTML = "";

    const history = GameHistoryStore.getHistory();

    if (history.length === 0) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "No games played yet.";
      list.appendChild(empty);
      return;
    }

    for (const game of history) {
      list.appendChild(this.createGameEntry(game));
    }
  }

  private createGameEntry(game: GameRecord): HTMLDivElement {
    const entry = document.createElement("div");
    entry.className = "history-entry";

    const resultClass =
      game.result === "draw"
        ? "history-draw"
        : game.result === game.playerColor
        ? "history-win"
        : "history-loss";

    const resultText =
      game.result === "draw"
        ? "Draw"
        : game.result === game.playerColor
        ? "Won"
        : "Lost";

    entry.innerHTML = `
      <div class="history-entry-header">
        <span class="history-date">${game.date}</span>
        <span class="history-result ${resultClass}">${resultText}</span>
      </div>
      <div class="history-entry-details">
        ${game.model} · ${game.moveCount} moves · You played ${game.playerColor}
      </div>
    `;

    // Click to expand PGN
    const pgnEl = document.createElement("div");
    pgnEl.className = "history-pgn";
    pgnEl.textContent = game.pgn;
    pgnEl.style.display = "none";
    entry.appendChild(pgnEl);

    entry.onclick = () => {
      pgnEl.style.display = pgnEl.style.display === "none" ? "block" : "none";
    };

    return entry;
  }

  show(): void {
    this.refreshList();
    this.backdrop.style.display = "flex";
  }

  hide(): void {
    this.backdrop.style.display = "none";
  }

  destroy(): void {
    this.backdrop.remove();
  }
}

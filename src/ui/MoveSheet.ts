import { MoveQuality } from "llm/types";

const QUALITY_BADGE: Record<string, string> = {
  brilliant: "!",
  good: "",
  inaccuracy: "?",
  blunder: "??",
  missed_win: "!!",
};

export class MoveSheet {
  private container: HTMLDivElement;
  private tbody: HTMLElement;
  private moveNumber = 1;
  private pendingWhite: { san: string; badge: string } | null = null;

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "move-sheet";

    const header = document.createElement("div");
    header.className = "move-sheet-header";
    header.textContent = "Moves";
    this.container.appendChild(header);

    const table = document.createElement("table");
    table.innerHTML = `<thead><tr><th>#</th><th>White</th><th>Black</th></tr></thead>`;
    this.tbody = document.createElement("tbody");
    table.appendChild(this.tbody);
    this.container.appendChild(table);
  }

  show(): void {
    if (!this.container.parentElement) {
      document.body.appendChild(this.container);
    }
  }

  addMove(color: "w" | "b", san: string, quality?: MoveQuality | null): void {
    const badge = quality ? (QUALITY_BADGE[quality] || "") : "";
    const display = badge ? `${san} ${badge}` : san;

    if (color === "w") {
      this.pendingWhite = { san: display, badge: quality || "" };
      const row = document.createElement("tr");
      row.innerHTML = `<td class="move-num">${this.moveNumber}.</td><td class="move-white">${display}</td><td class="move-black"></td>`;
      if (quality === "blunder" || quality === "missed_win") row.classList.add("move-bad");
      else if (quality === "brilliant") row.classList.add("move-brilliant");
      this.tbody.appendChild(row);
    } else {
      const lastRow = this.tbody.lastElementChild;
      if (lastRow) {
        const blackCell = lastRow.querySelector(".move-black");
        if (blackCell) blackCell.textContent = display;
        if (quality === "blunder" || quality === "missed_win") lastRow.classList.add("move-bad");
        else if (quality === "brilliant") lastRow.classList.add("move-brilliant");
      }
      this.moveNumber++;
    }

    // Auto-scroll
    this.container.scrollTop = this.container.scrollHeight;
  }

  clear(): void {
    this.tbody.innerHTML = "";
    this.moveNumber = 1;
    this.pendingWhite = null;
  }

  getElement(): HTMLDivElement {
    return this.container;
  }

  destroy(): void {
    this.container.remove();
  }
}

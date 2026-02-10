import { GameRecord } from "./types";

const STORAGE_KEY = "chess3d_game_history";
const MAX_GAMES = 50;

export class GameHistoryStore {
  static save(record: GameRecord): void {
    const history = this.getHistory();
    history.unshift(record);

    // FIFO eviction
    if (history.length > MAX_GAMES) {
      history.length = MAX_GAMES;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  static getHistory(): GameRecord[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static getGame(id: string): GameRecord | undefined {
    return this.getHistory().find((g) => g.id === id);
  }

  static getLastGameSummary(): string | null {
    const history = this.getHistory();
    if (history.length === 0) return null;

    const last = history[0];
    const resultText =
      last.result === "draw"
        ? "ended in a draw"
        : `${last.result} won`;

    return `Last game (${last.date}): ${last.moveCount} moves, ${resultText}. Model: ${last.model}.${last.summary ? ` ${last.summary}` : ""}`;
  }

  static clearHistory(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static generateId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

import { GameRecord, ExportableHistory, PlayerProfile } from "./types";

const STORAGE_KEY = "chess3d_game_history";
const MAX_GAMES = 50;

export class GameHistoryStore {
  static save(record: GameRecord): void {
    const history = this.getHistory();
    history.unshift(record);
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
    const resultText = last.result === "draw" ? "ended in a draw" : `${last.result} won`;
    return `Last game (${last.date}): ${last.moveCount} moves, ${resultText}. Model: ${last.model}.${last.summary ? ` ${last.summary}` : ""}`;
  }

  static clearHistory(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static generateId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  static exportAll(): string {
    const history = this.getHistory();
    const exportData: ExportableHistory = {
      version: 1,
      exportDate: new Date().toISOString(),
      games: history,
      playerProfile: this.buildPlayerProfile(history),
    };
    return JSON.stringify(exportData, null, 2);
  }

  static importFromJSON(json: string): { imported: number; skipped: number } {
    const data = JSON.parse(json) as ExportableHistory;
    if (data.version !== 1) throw new Error("Unsupported export version");

    const existing = this.getHistory();
    const existingIds = new Set(existing.map((g) => g.id));
    let imported = 0;
    let skipped = 0;

    for (const game of data.games) {
      if (existingIds.has(game.id)) {
        skipped++;
        continue;
      }
      existing.push(game);
      imported++;
    }

    existing.sort((a, b) => b.date.localeCompare(a.date));
    if (existing.length > MAX_GAMES) existing.length = MAX_GAMES;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return { imported, skipped };
  }

  static buildPlayerProfile(history: GameRecord[]): PlayerProfile {
    const wins = history.filter((g) => g.result !== "draw" && g.result === g.playerColor).length;
    const losses = history.filter((g) => g.result !== "draw" && g.result !== g.playerColor).length;
    const draws = history.filter((g) => g.result === "draw").length;

    const accuracies = history
      .filter((g) => g.playerStats?.accuracy != null)
      .map((g) => g.playerStats!.accuracy);
    const avgAccuracy = accuracies.length > 0
      ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
      : 0;

    return {
      totalGames: history.length,
      wins,
      losses,
      draws,
      averageAccuracy: avgAccuracy,
    };
  }

  static getBaselineSummary(): string | null {
    const history = this.getHistory();
    if (history.length < 2) return null;

    const profile = this.buildPlayerProfile(history);
    const winRate = profile.totalGames > 0
      ? Math.round((profile.wins / profile.totalGames) * 100)
      : 0;

    return `Player profile: ${profile.totalGames} games played, ${winRate}% win rate, avg accuracy ${profile.averageAccuracy}%.`;
  }
}

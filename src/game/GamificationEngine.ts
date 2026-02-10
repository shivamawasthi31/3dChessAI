import { MoveQuality } from "llm/types";
import { PlayerGameStats } from "llm/memory/types";
import { ToastSystem } from "ui/ToastSystem";

export class GamificationEngine {
  private currentStreak = 0;
  private bestStreak = 0;
  private moveQualities: MoveQuality[] = [];
  private toastSystem: ToastSystem;

  constructor(toastSystem: ToastSystem) {
    this.toastSystem = toastSystem;
  }

  recordMoveQuality(quality: MoveQuality): void {
    this.moveQualities.push(quality);

    if (quality === "brilliant" || quality === "good") {
      this.currentStreak++;
      if (this.currentStreak > this.bestStreak) {
        this.bestStreak = this.currentStreak;
      }
      if (this.currentStreak === 3) {
        this.toastSystem.show("3-move streak! Nice focus.", "achievement");
      } else if (this.currentStreak === 5) {
        this.toastSystem.show("5-move streak! On fire!", "achievement");
      } else if (this.currentStreak === 10) {
        this.toastSystem.show("10-move streak! Unstoppable!", "achievement");
      }
    } else {
      this.currentStreak = 0;
    }

    if (quality === "brilliant") {
      this.toastSystem.show("Brilliant move!", "achievement");
    } else if (quality === "blunder") {
      this.toastSystem.show("Blunder detected.", "info");
    } else if (quality === "missed_win") {
      this.toastSystem.show("You missed a winning move!", "info");
    }
  }

  getEndGameStats(): PlayerGameStats {
    return {
      brilliantMoves: this.moveQualities.filter((q) => q === "brilliant").length,
      blunders: this.moveQualities.filter((q) => q === "blunder").length,
      missedWins: this.moveQualities.filter((q) => q === "missed_win").length,
      longestGoodStreak: this.bestStreak,
      accuracy: this.calculateAccuracy(),
    };
  }

  private calculateAccuracy(): number {
    if (this.moveQualities.length === 0) return 0;
    const weights: Record<MoveQuality, number> = {
      brilliant: 100,
      good: 80,
      inaccuracy: 50,
      blunder: 10,
      missed_win: 20,
    };
    const total = this.moveQualities.reduce((sum, q) => sum + weights[q], 0);
    return Math.round(total / this.moveQualities.length);
  }

  reset(): void {
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.moveQualities = [];
  }
}

import { MoveMemory } from "../memory/types";

export class MemorySummarizer {
  static summarizeMoves(moves: MoveMemory[]): string {
    if (moves.length === 0) return "";

    const phases = this.getGamePhases(moves);
    const keyEvents = this.extractKeyEvents(moves);
    const parts: string[] = [];

    if (phases.opening.length > 0) {
      parts.push(`Opening (moves 1-${phases.opening.length}): ${this.describePhase(phases.opening)}`);
    }

    if (phases.middlegame.length > 0) {
      const start = phases.opening.length + 1;
      const end = start + phases.middlegame.length - 1;
      parts.push(`Middlegame (moves ${start}-${end}): ${this.describePhase(phases.middlegame)}`);
    }

    if (keyEvents.length > 0) {
      parts.push(`Key events: ${keyEvents.join("; ")}`);
    }

    return parts.join(". ");
  }

  static compressReasonings(moves: MoveMemory[], maxTokenBudget: number): string {
    // Keep last 3 reasonings in full, compress older ones
    const recent = moves.slice(-3);
    const older = moves.slice(0, -3);

    const recentText = recent
      .filter((m) => m.reasoning)
      .map((m) => `Move ${m.moveNumber} (${m.san}): ${m.reasoning}`)
      .join("\n");

    const recentTokens = Math.ceil(recentText.length / 4);
    if (recentTokens >= maxTokenBudget) {
      return recentText.slice(0, maxTokenBudget * 4);
    }

    const olderSummary = this.summarizeMoves(older);
    const combined = olderSummary ? `${olderSummary}\n\nRecent analysis:\n${recentText}` : recentText;

    if (Math.ceil(combined.length / 4) > maxTokenBudget) {
      return combined.slice(0, maxTokenBudget * 4);
    }

    return combined;
  }

  private static getGamePhases(moves: MoveMemory[]) {
    return {
      opening: moves.slice(0, Math.min(10, moves.length)),
      middlegame: moves.slice(10, Math.min(30, moves.length)),
      endgame: moves.slice(30),
    };
  }

  private static describePhase(moves: MoveMemory[]): string {
    const captures = moves.filter((m) => m.isCapture).length;
    const checks = moves.filter((m) => m.isCheck).length;
    const sans = moves.map((m) => m.san).join(" ");

    const parts: string[] = [sans];
    if (captures > 0) parts.push(`${captures} captures`);
    if (checks > 0) parts.push(`${checks} checks`);

    return parts.join(", ");
  }

  private static extractKeyEvents(moves: MoveMemory[]): string[] {
    const events: string[] = [];

    for (const m of moves) {
      if (m.isCapture) {
        events.push(`Move ${m.moveNumber}: ${m.san} (capture)`);
      }
      if (m.isCheck) {
        events.push(`Move ${m.moveNumber}: ${m.san} (check)`);
      }
      if (m.san.includes("O-O")) {
        events.push(`Move ${m.moveNumber}: ${m.san} (castle)`);
      }
    }

    // Limit to most recent 10 key events
    return events.slice(-10);
  }
}

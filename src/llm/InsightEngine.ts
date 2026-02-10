import { Chess } from "chess.js";
import { MoveInsight, MoveQuality } from "./types";

const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
};

const PIECE_NAMES: Record<string, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};

export class InsightEngine {
  analyzePlayerMove(fenBefore: string, playerMoveSan: string): MoveInsight {
    try {
      const board = new Chess(fenBefore);
      const legalMoves = board.moves({ verbose: true });

      const playerMove = legalMoves.find((m) => m.san === playerMoveSan);
      if (!playerMove) {
        return { playerMove: playerMoveSan, explanation: "", quality: "good" };
      }

      const scored = legalMoves.map((m) => ({
        move: m,
        score: this.scoreMove(m, board),
      }));
      scored.sort((a, b) => b.score - a.score);

      const playerScore = scored.find((s) => s.move.san === playerMoveSan)?.score ?? 0;
      const bestMove = scored[0];
      const scoreDiff = bestMove.score - playerScore;

      let quality: MoveQuality;
      let explanation = "";
      let betterMove: string | undefined;

      if (playerScore >= bestMove.score) {
        quality = playerScore >= 8 ? "brilliant" : "good";
      } else if (scoreDiff <= 2) {
        quality = "good";
      } else if (scoreDiff <= 5) {
        quality = "inaccuracy";
        betterMove = bestMove.move.san;
        explanation = this.buildExplanation(bestMove.move);
      } else if (bestMove.score >= 8 && scoreDiff > 5) {
        quality = "missed_win";
        betterMove = bestMove.move.san;
        explanation = this.buildExplanation(bestMove.move);
      } else {
        quality = "blunder";
        betterMove = bestMove.move.san;
        explanation = this.buildExplanation(bestMove.move);
      }

      // Check if player hung a piece (moved to attacked square)
      if (quality === "good" && this.isHangingPiece(playerMove, fenBefore)) {
        quality = "blunder";
        explanation = `Your ${PIECE_NAMES[playerMove.piece] || "piece"} on ${playerMove.to} might be captured.`;
      }

      return { playerMove: playerMoveSan, betterMove, explanation, quality };
    } catch {
      return { playerMove: playerMoveSan, explanation: "", quality: "good" };
    }
  }

  private scoreMove(move: any, board: any): number {
    let score = 0;

    // Captures: value of captured piece
    if (move.captured) {
      score += PIECE_VALUES[move.captured] * 2;
    }

    // Check bonus
    const testBoard = new Chess(board.fen());
    testBoard.move(move.san);
    if (testBoard.in_check()) {
      score += 3;
    }
    if (testBoard.in_checkmate()) {
      score += 100;
    }

    // Center control bonus for knights/bishops
    if ((move.piece === "n" || move.piece === "b") && ["d4", "d5", "e4", "e5"].includes(move.to)) {
      score += 1;
    }

    // Castling bonus
    if (move.flags.includes("k") || move.flags.includes("q")) {
      score += 2;
    }

    return score;
  }

  private buildExplanation(move: any): string {
    if (move.captured) {
      return `If you had played ${move.san}, you could have captured their ${PIECE_NAMES[move.captured] || "piece"}.`;
    }
    return `${move.san} was a stronger move in this position.`;
  }

  private isHangingPiece(move: any, fenBefore: string): boolean {
    try {
      const board = new Chess(fenBefore);
      board.move(move.san);
      // Check if opponent can capture on the square we moved to
      const opponentMoves = board.moves({ verbose: true });
      return opponentMoves.some((m) => m.to === move.to && m.captured);
    } catch {
      return false;
    }
  }
}

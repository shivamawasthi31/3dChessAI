import { Chess } from "chess.js";
import { MoveInsight, MoveQuality } from "./types";

const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
};

const PIECE_NAMES: Record<string, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};

const CENTER_SQUARES = ["d4", "d5", "e4", "e5"];
const EXTENDED_CENTER = ["c3", "c4", "c5", "c6", "d3", "d6", "e3", "e6", "f3", "f4", "f5", "f6"];

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
        explanation = this.buildExplanation(bestMove.move, board);
      } else if (bestMove.score >= 8 && scoreDiff > 5) {
        quality = "missed_win";
        betterMove = bestMove.move.san;
        explanation = this.buildExplanation(bestMove.move, board);
      } else {
        quality = "blunder";
        betterMove = bestMove.move.san;
        explanation = this.buildExplanation(bestMove.move, board);
      }

      // Check if player hung a piece (moved to attacked square with bad trade)
      if (quality === "good" || quality === "inaccuracy") {
        const hangResult = this.checkHanging(playerMove, fenBefore);
        if (hangResult) {
          quality = hangResult.severity;
          explanation = hangResult.explanation;
          if (bestMove.move.san !== playerMoveSan) betterMove = bestMove.move.san;
        }
      }

      // Check if player left a piece undefended elsewhere
      if (quality === "good") {
        const abandoned = this.checkAbandonedPiece(playerMove, fenBefore);
        if (abandoned) {
          quality = abandoned.severity;
          explanation = abandoned.explanation;
          if (bestMove.move.san !== playerMoveSan) betterMove = bestMove.move.san;
        }
      }

      return { playerMove: playerMoveSan, betterMove, explanation, quality };
    } catch {
      return { playerMove: playerMoveSan, explanation: "", quality: "good" };
    }
  }

  private scoreMove(move: any, board: any): number {
    let score = 0;
    const fen = board.fen();

    // 1. Captures — use SEE (static exchange evaluation lite)
    if (move.captured) {
      const capturedVal = PIECE_VALUES[move.captured] || 0;
      const attackerVal = PIECE_VALUES[move.piece] || 0;
      // Good trade: capturing higher or equal value piece
      if (capturedVal >= attackerVal) {
        score += capturedVal * 2 + 1;
      } else {
        // Bad trade? Check if square is defended
        const defended = this.isSquareDefended(move.to, fen, move.san);
        score += defended ? (capturedVal - attackerVal) : capturedVal * 2;
      }
    }

    // 2. Apply move and evaluate resulting position
    const testBoard = new Chess(fen);
    testBoard.move(move.san);

    // Checkmate (instant win)
    if (testBoard.in_checkmate()) {
      return 100;
    }

    // Check bonus (forces opponent response)
    if (testBoard.in_check()) {
      score += 3;
    }

    // 3. Threats created — can we attack undefended pieces?
    const threatsAfter = this.countThreats(testBoard);
    score += threatsAfter * 1.5;

    // 4. Fork detection — piece attacks 2+ higher-value pieces
    const forkBonus = this.detectFork(move, testBoard);
    score += forkBonus;

    // 5. Pin/skewer detection (simplified)
    if (this.createsPinOrSkewer(move, testBoard)) {
      score += 3;
    }

    // 6. Center control for minor pieces
    if (move.piece === "n" || move.piece === "b") {
      if (CENTER_SQUARES.includes(move.to)) score += 1.5;
      else if (EXTENDED_CENTER.includes(move.to)) score += 0.5;
    }

    // 7. Pawn advancement bonus (late game especially)
    if (move.piece === "p") {
      const rank = parseInt(move.to[1]);
      const advanceRank = move.color === "w" ? rank : 9 - rank;
      if (advanceRank >= 6) score += 2; // passed pawn threat
      if (advanceRank === 7) score += 4; // promotion threat
    }

    // 8. Castling bonus
    if (move.flags.includes("k") || move.flags.includes("q")) {
      score += 3;
    }

    // 9. Piece development (moving from back rank)
    if (move.piece !== "p" && move.piece !== "k") {
      const fromRank = parseInt(move.from[1]);
      const isBackRank = (move.color === "w" && fromRank === 1) || (move.color === "b" && fromRank === 8);
      if (isBackRank) score += 0.5;
    }

    // 10. Safety penalty — is the moved piece now hanging?
    if (this.isSquareAttacked(move.to, testBoard, move.color === "w" ? "b" : "w")) {
      if (!this.isSquareDefended(move.to, testBoard.fen(), null)) {
        score -= PIECE_VALUES[move.piece] * 0.8;
      }
    }

    return score;
  }

  private countThreats(board: any): number {
    // Count how many opponent pieces we now attack that are undefended or higher value
    const moves = board.moves({ verbose: true });
    let threats = 0;
    const seen = new Set<string>();
    for (const m of moves) {
      if (m.captured && !seen.has(m.to)) {
        seen.add(m.to);
        threats++;
      }
    }
    return threats;
  }

  private detectFork(move: any, boardAfter: any): number {
    // After this move, does the piece attack 2+ valuable pieces?
    const opponentMoves = boardAfter.moves({ verbose: true });
    // Actually we need OUR attacks from the moved piece's square
    // Check all our legal moves from move.to
    const allMoves = boardAfter.moves({ verbose: true });
    // boardAfter is opponent's turn, so we can't directly check our attacks
    // Instead, check if opponent has multiple pieces that can be captured from move.to in next turn
    // Simpler: count pieces adjacent to move.to that are opponent's and higher value
    const attackedSquares = this.getAttackedSquaresFrom(move.to, move.piece, move.color, boardAfter.fen());
    let valuableTargets = 0;
    for (const sq of attackedSquares) {
      const piece = boardAfter.get(sq);
      if (piece && piece.color !== move.color && PIECE_VALUES[piece.type] >= 3) {
        valuableTargets++;
      }
    }
    return valuableTargets >= 2 ? 4 : 0;
  }

  private getAttackedSquaresFrom(square: string, piece: string, color: string, fen: string): string[] {
    // Simple attack pattern for piece type
    const file = square.charCodeAt(0) - 97; // 0-7
    const rank = parseInt(square[1]) - 1; // 0-7
    const squares: string[] = [];

    const addSq = (f: number, r: number) => {
      if (f >= 0 && f < 8 && r >= 0 && r < 8) {
        squares.push(String.fromCharCode(97 + f) + (r + 1));
      }
    };

    if (piece === "n") {
      const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [df, dr] of knightOffsets) addSq(file + df, rank + dr);
    } else if (piece === "b") {
      for (const [df, dr] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        for (let i = 1; i < 8; i++) {
          const f = file + df * i, r = rank + dr * i;
          if (f < 0 || f > 7 || r < 0 || r > 7) break;
          addSq(f, r);
          // Stop if there's a piece (blocking)
          const sq = String.fromCharCode(97 + f) + (r + 1);
          try {
            const b = new Chess(fen);
            if (b.get(sq as any)) break;
          } catch { break; }
        }
      }
    } else if (piece === "r") {
      for (const [df, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        for (let i = 1; i < 8; i++) {
          const f = file + df * i, r = rank + dr * i;
          if (f < 0 || f > 7 || r < 0 || r > 7) break;
          addSq(f, r);
          const sq = String.fromCharCode(97 + f) + (r + 1);
          try {
            const b = new Chess(fen);
            if (b.get(sq as any)) break;
          } catch { break; }
        }
      }
    } else if (piece === "q") {
      // Queen = bishop + rook
      for (const [df, dr] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        for (let i = 1; i < 8; i++) {
          const f = file + df * i, r = rank + dr * i;
          if (f < 0 || f > 7 || r < 0 || r > 7) break;
          addSq(f, r);
          const sq = String.fromCharCode(97 + f) + (r + 1);
          try {
            const b = new Chess(fen);
            if (b.get(sq as any)) break;
          } catch { break; }
        }
      }
    } else if (piece === "p") {
      const dir = color === "w" ? 1 : -1;
      addSq(file - 1, rank + dir);
      addSq(file + 1, rank + dir);
    }

    return squares;
  }

  private createsPinOrSkewer(move: any, boardAfter: any): boolean {
    // Simplified: if a sliding piece (B/R/Q) moves and now has 2+ pieces
    // aligned on its attack axis, one might be pinned
    if (!["b", "r", "q"].includes(move.piece)) return false;

    const file = move.to.charCodeAt(0) - 97;
    const rank = parseInt(move.to[1]) - 1;
    const directions = move.piece === "r"
      ? [[1,0],[-1,0],[0,1],[0,-1]]
      : move.piece === "b"
        ? [[1,1],[1,-1],[-1,1],[-1,-1]]
        : [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

    for (const [df, dr] of directions) {
      let foundPieces = 0;
      let totalValue = 0;
      for (let i = 1; i < 8; i++) {
        const f = file + df * i, r = rank + dr * i;
        if (f < 0 || f > 7 || r < 0 || r > 7) break;
        const sq = String.fromCharCode(97 + f) + (r + 1);
        const piece = boardAfter.get(sq);
        if (piece) {
          if (piece.color !== move.color) {
            foundPieces++;
            totalValue += PIECE_VALUES[piece.type] || 0;
          } else break; // Our piece blocks
          if (foundPieces >= 2) return true; // Two enemy pieces aligned = pin/skewer
        }
      }
    }
    return false;
  }

  private isSquareAttacked(square: string, board: any, byColor: string): boolean {
    try {
      // Check if any opponent piece can move to this square
      const moves = board.moves({ verbose: true });
      // moves is from current turn — if byColor is the current turn, it works directly
      // Otherwise need to check differently
      return moves.some((m: any) => m.to === square);
    } catch {
      return false;
    }
  }

  private isSquareDefended(square: string, fen: string, moveToApply: string | null): boolean {
    try {
      const board = new Chess(fen);
      if (moveToApply) board.move(moveToApply);
      // Switch sides by making a null-ish check: see if same-color piece can recapture
      const moves = board.moves({ verbose: true });
      return moves.some((m: any) => m.to === square && m.captured);
    } catch {
      return false;
    }
  }

  private buildExplanation(move: any, board: any): string {
    // Try to give a tactical reason
    const testBoard = new Chess(board.fen());
    testBoard.move(move.san);

    if (testBoard.in_checkmate()) {
      return `${move.san} leads to checkmate!`;
    }

    if (testBoard.in_check()) {
      if (move.captured) {
        return `${move.san} captures the ${PIECE_NAMES[move.captured]} with check — a powerful double threat.`;
      }
      return `${move.san} delivers check, forcing your opponent to respond.`;
    }

    if (move.captured) {
      const capturedVal = PIECE_VALUES[move.captured] || 0;
      const attackerVal = PIECE_VALUES[move.piece] || 0;
      if (capturedVal > attackerVal) {
        return `${move.san} wins material — capturing a ${PIECE_NAMES[move.captured]} (${capturedVal}) with your ${PIECE_NAMES[move.piece]} (${attackerVal}).`;
      }
      return `Capturing with ${move.san} wins the ${PIECE_NAMES[move.captured]}.`;
    }

    // Fork detection
    const forkBonus = this.detectFork(move, testBoard);
    if (forkBonus > 0) {
      return `${move.san} creates a fork, attacking multiple pieces at once!`;
    }

    if (this.createsPinOrSkewer(move, testBoard)) {
      return `${move.san} creates a pin or skewer along the line, trapping an opponent piece.`;
    }

    // Pawn promotion threat
    if (move.piece === "p") {
      const rank = parseInt(move.to[1]);
      const advanceRank = move.color === "w" ? rank : 9 - rank;
      if (advanceRank >= 6) {
        return `${move.san} pushes the pawn closer to promotion — a dangerous threat.`;
      }
    }

    return `${move.san} was a stronger move in this position.`;
  }

  private checkHanging(move: any, fenBefore: string): { severity: MoveQuality; explanation: string } | null {
    try {
      const board = new Chess(fenBefore);
      board.move(move.san);
      // Check if opponent can capture on the square we moved to
      const opponentMoves = board.moves({ verbose: true });
      const capturers = opponentMoves.filter((m: any) => m.to === move.to && m.captured);
      if (capturers.length === 0) return null;

      const movedValue = PIECE_VALUES[move.piece] || 0;
      // Check if we're defended — if opponent captures, can we recapture?
      const cheapestAttacker = capturers.reduce((min: any, m: any) =>
        (PIECE_VALUES[m.piece] || 99) < (PIECE_VALUES[min.piece] || 99) ? m : min, capturers[0]);
      const attackerValue = PIECE_VALUES[cheapestAttacker.piece] || 0;

      // If opponent can capture with a cheaper piece, it's likely hanging
      if (attackerValue < movedValue) {
        const severity: MoveQuality = movedValue >= 5 ? "blunder" : "inaccuracy";
        return {
          severity,
          explanation: `Your ${PIECE_NAMES[move.piece]} on ${move.to} can be captured by their ${PIECE_NAMES[cheapestAttacker.piece]}, losing material.`,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private checkAbandonedPiece(move: any, fenBefore: string): { severity: MoveQuality; explanation: string } | null {
    try {
      const board = new Chess(fenBefore);
      const color = board.turn();
      board.move(move.san);

      // Check if opponent can now capture any of our pieces that were previously defended
      const opponentMoves = board.moves({ verbose: true });
      for (const om of opponentMoves) {
        if (!om.captured) continue;
        const capturedPiece = board.get(om.to);
        if (!capturedPiece || capturedPiece.color !== color) continue;

        const capturedVal = PIECE_VALUES[capturedPiece.type] || 0;
        const attackerVal = PIECE_VALUES[om.piece] || 0;

        // Only flag if losing significant material (rook or queen undefended)
        if (capturedVal >= 5 && attackerVal < capturedVal) {
          // Check if this piece was safe before the move
          const boardBefore = new Chess(fenBefore);
          const movesBefore = boardBefore.moves({ verbose: true });
          // Opponent didn't have this capture before? It means our move created the vulnerability
          const couldCaptureBefore = movesBefore.some((m: any) => m.to === om.to && m.captured);
          // Actually we need opponent's perspective before. Let's check differently.
          // If the piece we moved was defending the target square
          if (move.from === om.to || this.wasDefending(move.from, om.to, fenBefore, color)) {
            return {
              severity: "blunder",
              explanation: `Moving away left your ${PIECE_NAMES[capturedPiece.type]} on ${om.to} undefended!`,
            };
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private wasDefending(fromSquare: string, targetSquare: string, fen: string, color: string): boolean {
    // Was the piece on fromSquare defending targetSquare?
    try {
      const board = new Chess(fen);
      const piece = board.get(fromSquare as any);
      if (!piece || piece.color !== color) return false;
      // Check if moving this piece away allows opponent to capture targetSquare
      const attackedSquares = this.getAttackedSquaresFrom(fromSquare, piece.type, color, fen);
      return attackedSquares.includes(targetSquare);
    } catch {
      return false;
    }
  }
}

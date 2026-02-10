import { MoveMemory } from "./types";

export class GameMemory {
  private moves: MoveMemory[] = [];

  recordMove(
    moveNumber: number,
    fen: string,
    uci: string,
    san: string,
    reasoning: string,
    flags: string
  ): void {
    this.moves.push({
      moveNumber,
      fen,
      uci,
      san,
      reasoning,
      isCapture: flags.includes("c") || flags.includes("e"),
      isCheck: san.includes("+") || san.includes("#"),
      isPromotion: flags.includes("p"),
      isCastle: flags === "k" || flags === "q",
      timestamp: Date.now(),
    });
  }

  getMoves(): MoveMemory[] {
    return [...this.moves];
  }

  getLastMoves(count: number): MoveMemory[] {
    return this.moves.slice(-count);
  }

  getKeyMoments(): MoveMemory[] {
    return this.moves.filter(
      (m) => m.isCapture || m.isCheck || m.isPromotion || m.isCastle
    );
  }

  getMoveCount(): number {
    return this.moves.length;
  }

  clear(): void {
    this.moves = [];
  }
}

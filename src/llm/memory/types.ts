export interface MoveMemory {
  moveNumber: number;
  fen: string;
  uci: string;
  san: string;
  reasoning: string;
  isCapture: boolean;
  isCheck: boolean;
  isPromotion: boolean;
  isCastle: boolean;
  timestamp: number;
}

export interface GameRecord {
  id: string;
  date: string;
  result: "white" | "black" | "draw";
  pgn: string;
  provider: string;
  model: string;
  playerColor: "white" | "black";
  moveCount: number;
  summary?: string;
}

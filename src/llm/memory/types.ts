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
  personality?: "chill" | "savage";
  playerStats?: PlayerGameStats;
}

export interface PlayerGameStats {
  brilliantMoves: number;
  blunders: number;
  missedWins: number;
  longestGoodStreak: number;
  accuracy: number;
}

export interface ExportableHistory {
  version: 1;
  exportDate: string;
  games: GameRecord[];
  playerProfile?: PlayerProfile;
}

export interface PlayerProfile {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  averageAccuracy: number;
}

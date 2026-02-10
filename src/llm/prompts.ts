import { LLMRequest } from "./types";

export function buildSystemPrompt(): string {
  return `You are a chess engine playing a game. You will receive the board position in FEN notation, move history, legal moves in UCI format, and optionally a game memory summary.

You MUST respond with EXACTLY this JSON format and nothing else:
{"move": "<uci_move>", "reasoning": "<your brief analysis>"}

Rules:
- The move MUST be one of the legal moves provided. Never invent moves.
- UCI format: source_square + destination_square (e.g., "e2e4", "g1f3").
- For pawn promotion, append the piece letter (e.g., "e7e8q" for queen).
- Keep reasoning concise: 2-3 sentences max covering your key considerations.
- Do not wrap in markdown code blocks. Return raw JSON only.`;
}

const STYLE_INSTRUCTIONS: Record<string, string> = {
  aggressive:
    "Play aggressively. Prefer attacking moves, sacrifices, central control, and king-side attacks.",
  defensive:
    "Play defensively. Prefer solid positional play, piece safety, and careful development.",
  balanced:
    "Play the objectively strongest move. Balance tactics and positional considerations.",
};

export function buildUserPrompt(request: LLMRequest): string {
  const parts: string[] = [
    `Position (FEN): ${request.fen}`,
    `You are playing as: ${request.aiColor}`,
    `Legal moves (UCI): ${request.legalMoves.join(", ")}`,
  ];

  if (request.memorySummary) {
    parts.push(`Game context: ${request.memorySummary}`);
  }

  if (request.pgn) {
    parts.push(`Move history (PGN): ${request.pgn}`);
  }

  parts.push(`Style: ${STYLE_INSTRUCTIONS[request.playStyle]}`);
  parts.push("Respond with JSON only.");

  return parts.join("\n");
}

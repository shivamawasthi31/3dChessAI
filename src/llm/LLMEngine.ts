import { Chess, ChessInstance, Move } from "chess.js";
import { LLMProvider } from "./LLMProvider";
import { LLMRequest, LLMSettings, LLMStreamChunk, OnThinkingUpdate } from "./types";
import { ContextManager } from "./context/ContextManager";
import { GameMemory } from "./memory/GameMemory";
import { GameHistoryStore } from "./memory/GameHistoryStore";
import { GameRecord } from "./memory/types";
import { createProvider } from "./providers";

const MAX_RETRIES = 3;

export class LLMEngine {
  private provider: LLMProvider;
  private settings: LLMSettings;
  private chess: ChessInstance;
  private contextManager: ContextManager;
  private gameMemory: GameMemory;
  private onThinking: OnThinkingUpdate;
  private moveCount: number;
  private lastReasoning: string;

  constructor(settings: LLMSettings, onThinking: OnThinkingUpdate) {
    this.settings = settings;
    this.provider = createProvider(settings.config);
    this.chess = new Chess();
    this.contextManager = new ContextManager(settings.config.model);
    this.gameMemory = new GameMemory();
    this.onThinking = onThinking;
    this.moveCount = 0;
    this.lastReasoning = "";
  }

  init(fen: string): void {
    this.chess.load(fen);
    this.gameMemory.clear();
    this.moveCount = 0;
  }

  updateWithMove(move: Move): void {
    this.chess.move(`${move.from}${move.to}`, { sloppy: true });
    this.moveCount++;

    this.gameMemory.recordMove(
      this.moveCount,
      this.chess.fen(),
      `${move.from}${move.to}${move.promotion || ""}`,
      move.san,
      "",
      move.flags
    );
  }

  async calcMove(): Promise<Move | null> {
    const fen = this.chess.fen();
    const pgn = this.chess.pgn();
    const legalMoves = this.chess.moves({ verbose: true });
    const legalUCI = legalMoves.map(
      (m: Move) => m.from + m.to + (m.promotion || "")
    );

    const baseRequest: LLMRequest = {
      fen,
      pgn: "",
      moveHistory: [],
      legalMoves: legalUCI,
      playStyle: this.settings.playStyle,
      aiColor: this.chess.turn() === "w" ? "white" : "black",
    };

    const { systemPrompt, userPrompt, tokenInfo } =
      this.contextManager.buildPromptWithBudget(
        baseRequest,
        this.gameMemory.getMoves(),
        pgn
      );

    console.log(
      `[LLM] Token budget: ${tokenInfo.used}/${tokenInfo.budget} (${tokenInfo.remaining} remaining)`
    );

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        this.onThinking({ text: "", done: false });

        let streamedText = "";
        const fullResponse = await this.provider.complete(
          systemPrompt,
          userPrompt,
          (chunk: LLMStreamChunk) => {
            streamedText += chunk.text;
            this.onThinking({
              text: chunk.text,
              done: chunk.done,
            });
          }
        );

        const parsed = this.parseResponse(fullResponse);
        if (!parsed) {
          console.warn(`[LLM] Attempt ${attempt + 1}: Could not parse response`);
          continue;
        }

        // Validate the move is in the legal moves list
        if (!legalUCI.includes(parsed.move)) {
          console.warn(
            `[LLM] Attempt ${attempt + 1}: Move "${parsed.move}" not in legal moves`
          );
          continue;
        }

        const from = parsed.move.slice(0, 2);
        const to = parsed.move.slice(2, 4);
        const promotion = parsed.move.length > 4 ? parsed.move[4] : undefined;

        const chessMove = this.chess.move({
          from,
          to,
          promotion,
        } as any);

        if (!chessMove) {
          console.warn(`[LLM] Attempt ${attempt + 1}: chess.js rejected move`);
          continue;
        }

        this.moveCount++;
        this.lastReasoning = parsed.reasoning || "";

        this.gameMemory.recordMove(
          this.moveCount,
          this.chess.fen(),
          parsed.move,
          chessMove.san,
          this.lastReasoning,
          chessMove.flags
        );

        // Send final thinking update with reasoning
        this.onThinking({
          text: "",
          done: true,
          reasoning: this.lastReasoning,
          chosenMove: chessMove.san,
        });

        return chessMove;
      } catch (err) {
        console.error(`[LLM] Attempt ${attempt + 1} error:`, err);
      }
    }

    // All retries failed
    this.onThinking({
      text: "LLM failed, falling back to built-in AI...",
      done: true,
    });

    return null;
  }

  getGameMemory(): GameMemory {
    return this.gameMemory;
  }

  saveGameToHistory(
    result: "white" | "black" | "draw",
    playerColor: "white" | "black"
  ): void {
    const record: GameRecord = {
      id: GameHistoryStore.generateId(),
      date: new Date().toISOString().split("T")[0],
      result,
      pgn: this.chess.pgn(),
      provider: this.settings.config.provider,
      model: this.settings.config.model,
      playerColor,
      moveCount: this.moveCount,
    };

    GameHistoryStore.save(record);
  }

  private parseResponse(
    text: string
  ): { move: string; reasoning?: string } | null {
    // Try direct JSON parse
    try {
      const json = JSON.parse(text.trim());
      if (json.move && typeof json.move === "string") return json;
    } catch {
      // fall through
    }

    // Try extracting JSON from mixed text / markdown code blocks
    const jsonMatch = text.match(
      /\{[^}]*"move"\s*:\s*"([a-h][1-8][a-h][1-8][qrbn]?)"[^}]*\}/
    );
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // fall through
      }
    }

    // Last resort: find any UCI-like pattern
    const uciMatch = text.match(/\b([a-h][1-8][a-h][1-8][qrbn]?)\b/);
    if (uciMatch) {
      return { move: uciMatch[1], reasoning: text };
    }

    return null;
  }
}

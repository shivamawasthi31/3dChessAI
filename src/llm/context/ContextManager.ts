import { LLMRequest } from "../types";
import { MoveMemory } from "../memory/types";
import { TokenEstimator } from "./TokenEstimator";
import { MemorySummarizer } from "./MemorySummarizer";
import { buildSystemPrompt, buildUserPrompt } from "../prompts";

export class ContextManager {
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  buildPromptWithBudget(
    baseRequest: LLMRequest,
    moveMemories: MoveMemory[],
    pgn: string
  ): { systemPrompt: string; userPrompt: string; tokenInfo: { used: number; budget: number; remaining: number } } {
    const systemPrompt = buildSystemPrompt();
    const budget = TokenEstimator.getAvailableBudget(this.model);

    // Priority 1: FEN + legal moves + style (always included)
    const minimalRequest: LLMRequest = {
      ...baseRequest,
      pgn: "",
      memorySummary: undefined,
    };
    let currentPrompt = buildUserPrompt(minimalRequest);
    let usedTokens = TokenEstimator.estimate(currentPrompt);

    // Priority 2: Last 5 moves context from memory
    const memorySummaryBudget = Math.min(
      Math.floor((budget - usedTokens) * 0.4),
      800
    );

    if (moveMemories.length > 0 && memorySummaryBudget > 50) {
      const summary = MemorySummarizer.compressReasonings(
        moveMemories,
        memorySummaryBudget
      );
      if (summary) {
        minimalRequest.memorySummary = summary;
        currentPrompt = buildUserPrompt(minimalRequest);
        usedTokens = TokenEstimator.estimate(currentPrompt);
      }
    }

    // Priority 3: Full PGN if it fits
    const pgnTokens = TokenEstimator.estimate(pgn);
    if (usedTokens + pgnTokens < budget * 0.9) {
      minimalRequest.pgn = pgn;
      currentPrompt = buildUserPrompt(minimalRequest);
      usedTokens = TokenEstimator.estimate(currentPrompt);
    } else if (pgn) {
      // Truncate PGN to last 20 moves
      const moves = pgn.split(/\d+\.\s*/).filter(Boolean);
      const truncated = moves.slice(-20).join(" ");
      const truncatedPgn = `[...] ${truncated}`;
      const truncTokens = TokenEstimator.estimate(truncatedPgn);

      if (usedTokens + truncTokens < budget * 0.9) {
        minimalRequest.pgn = truncatedPgn;
        currentPrompt = buildUserPrompt(minimalRequest);
        usedTokens = TokenEstimator.estimate(currentPrompt);
      }
    }

    const tokenInfo = TokenEstimator.getBudgetInfo(this.model, usedTokens);

    return {
      systemPrompt,
      userPrompt: buildUserPrompt(minimalRequest),
      tokenInfo,
    };
  }
}

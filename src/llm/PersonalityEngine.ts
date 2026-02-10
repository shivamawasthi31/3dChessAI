import { LLMConfig, AIPersonality, TrashTalkUpdate } from "./types";
import { createProvider } from "./providers";
import { LLMProvider } from "./LLMProvider";
import { buildTrashTalkPrompt } from "./personality/prompts";

export class PersonalityEngine {
  private provider: LLMProvider;
  private personality: AIPersonality;
  private onTrashTalk: (update: TrashTalkUpdate) => void;

  constructor(
    config: LLMConfig,
    personality: AIPersonality,
    onTrashTalk: (update: TrashTalkUpdate) => void
  ) {
    this.provider = createProvider(config);
    this.personality = personality;
    this.onTrashTalk = onTrashTalk;
  }

  private async makeCall(trigger: TrashTalkUpdate["trigger"], lastMoveSan: string, boardSummary: string): Promise<void> {
    try {
      const { system, user } = buildTrashTalkPrompt(
        this.personality,
        trigger,
        lastMoveSan,
        boardSummary
      );
      let text = "";
      await this.provider.complete(system, user, (chunk) => {
        if (!chunk.done) text += chunk.text;
      });
      text = text.trim();
      if (text) {
        this.onTrashTalk({ text, trigger, personality: this.personality });
      }
    } catch (e) {
      console.warn("PersonalityEngine call failed:", e);
    }
  }

  reactToPlayerMove(moveSan: string, boardSummary: string): void {
    this.makeCall("player_move", moveSan, boardSummary);
  }

  celebrateAiMove(moveSan: string, boardSummary: string): void {
    this.makeCall("ai_move", moveSan, boardSummary);
  }

  reactToCapture(moveSan: string, boardSummary: string): void {
    this.makeCall("capture", moveSan, boardSummary);
  }

  reactToCheck(moveSan: string, boardSummary: string): void {
    this.makeCall("check", moveSan, boardSummary);
  }

  reactToOwnBadMove(moveSan: string, boardSummary: string): void {
    this.makeCall("ai_blunder", moveSan, boardSummary);
  }

  reactToGameEnd(boardSummary: string): void {
    this.makeCall("game_end", "Game Over", boardSummary);
  }
}

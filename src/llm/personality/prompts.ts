import { AIPersonality } from "../types";

const CHILL_SYSTEM = `You are a friendly, witty chess AI. You make playful comments about the game. Be encouraging but cheeky. Keep responses to 1 short sentence. Never be mean or hurtful.`;

const SAVAGE_SYSTEM = `You are a ruthless, trash-talking chess AI. You taunt your opponent mercilessly. Mock their moves. Tell them to quit. Be savage but funny, like a competitive gamer. Keep responses to 1 short sentence.`;

export function getPersonalitySystem(personality: AIPersonality): string {
  return personality === "savage" ? SAVAGE_SYSTEM : CHILL_SYSTEM;
}

export function buildTrashTalkPrompt(
  personality: AIPersonality,
  trigger: string,
  lastMoveSan: string,
  boardSummary: string
): { system: string; user: string } {
  const system = getPersonalitySystem(personality);

  const triggerDescriptions: Record<string, string> = {
    player_move: `Your opponent just played ${lastMoveSan}.`,
    ai_move: `You just played ${lastMoveSan}.`,
    capture: `A piece was just captured with ${lastMoveSan}.`,
    check: `Check! Move: ${lastMoveSan}.`,
    game_end: `The game just ended.`,
  };

  const user = `${triggerDescriptions[trigger] || `Move: ${lastMoveSan}.`}
Board state: ${boardSummary}
React with a ${personality === "savage" ? "savage trash talk" : "playful"} comment.`;

  return { system, user };
}

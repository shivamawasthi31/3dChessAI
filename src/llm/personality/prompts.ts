import { AIPersonality } from "../types";

const CHILL_SYSTEM = `You're a chess player chatting over a casual game. Sound like a real person — use contractions, casual phrasing, maybe a little slang. React naturally to what just happened on the board. One short sentence max. No emojis. Don't sound like an AI.`;

const SAVAGE_SYSTEM = `You're that one friend who talks mad trash during chess. Sound like a real person — street smart, competitive, funny. Use natural speech, slang, contractions. Roast their moves or hype your own. One short sentence max. No emojis. Don't sound like an AI.`;

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
    ai_blunder: `You just played ${lastMoveSan} and it was a terrible move — react to your own mistake.`,
  };

  const user = `${triggerDescriptions[trigger] || `Move: ${lastMoveSan}.`}
Board state: ${boardSummary}
React with a ${personality === "savage" ? "savage trash talk" : "playful"} comment.`;

  return { system, user };
}

import { AIPersonality } from "llm/types";
import { GameHistoryStore } from "llm/memory/GameHistoryStore";

export class PlayerHeader {
  private container: HTMLDivElement;
  private playerSide: HTMLDivElement;
  private aiSide: HTMLDivElement;
  private voiceBtn: HTMLButtonElement;
  private voiceEnabled = true;

  constructor(
    playerColor: string,
    aiName: string,
    personality: AIPersonality,
    onVoiceToggle?: () => boolean
  ) {
    this.container = document.createElement("div");
    this.container.className = "player-header";

    const history = GameHistoryStore.getHistory();
    const wins = history.filter((g) => g.result === g.playerColor).length;
    const losses = history.filter((g) => g.result !== "draw" && g.result !== g.playerColor).length;
    const draws = history.filter((g) => g.result === "draw").length;

    this.playerSide = document.createElement("div");
    this.playerSide.className = "player-side";
    this.playerSide.innerHTML = `
      <span class="player-name">You (${playerColor})</span>
      <span class="player-record">${wins}W ${losses}L ${draws}D</span>
    `;

    const vs = document.createElement("span");
    vs.className = "vs-label";
    vs.textContent = "VS";

    this.aiSide = document.createElement("div");
    this.aiSide.className = "player-side";
    const badgeClass = personality === "savage" ? "savage" : "chill";
    this.aiSide.innerHTML = `
      <span class="player-name">${aiName}</span>
      <span class="personality-badge ${badgeClass}">${personality}</span>
    `;

    // Voice toggle button
    this.voiceBtn = document.createElement("button");
    this.voiceBtn.className = "voice-toggle";
    this.voiceBtn.textContent = "Sound: ON";
    this.voiceBtn.onclick = () => {
      if (onVoiceToggle) {
        this.voiceEnabled = onVoiceToggle();
        this.voiceBtn.textContent = this.voiceEnabled ? "Sound: ON" : "Sound: OFF";
        this.voiceBtn.classList.toggle("muted", !this.voiceEnabled);
      }
    };

    this.container.appendChild(this.playerSide);
    this.container.appendChild(vs);
    this.container.appendChild(this.aiSide);
    this.container.appendChild(this.voiceBtn);

    document.body.appendChild(this.container);
  }

  setTurn(isPlayerTurn: boolean): void {
    this.playerSide.classList.toggle("active-turn", isPlayerTurn);
    this.aiSide.classList.toggle("active-turn", !isPlayerTurn);
  }

  destroy(): void {
    this.container.remove();
  }
}

import { ChessInstance, PieceColor } from "chess.js";
import { CustomLoadingManager } from "logic/LoadingManager/LoadingManager";
import { BasicScene } from "scenes/BasicScene/BasicScene";
import { ChessScene } from "scenes/ChessScene/ChessScene";
import { PCFSoftShadowMap, ReinhardToneMapping, sRGBEncoding, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GameOptions } from "./types";
import { LLMSettings } from "llm/types";
import { LLMSettingsStore } from "llm/LLMSettingsStore";
import { SettingsModal } from "ui/SettingsModal";
import { ThinkingPanel } from "ui/ThinkingPanel";
import { GameHistoryPanel } from "ui/GameHistoryPanel";
import { ToastSystem } from "ui/ToastSystem";
import { PlayerHeader } from "ui/PlayerHeader";
import { InsightBanner } from "ui/InsightBanner";
import { FooterAd } from "ui/FooterAd";
import { EndGameStatsPanel } from "ui/EndGameStatsPanel";
import { GamificationEngine } from "./GamificationEngine";
import { PersonalityEngine } from "llm/PersonalityEngine";
import { InsightEngine } from "llm/InsightEngine";
import { NameGenerator } from "llm/NameGenerator";
import { MoveSheet } from "ui/MoveSheet";
import { CreditBadge } from "ui/CreditBadge";
import { eventBus } from "events/EventBus";

export class Game {
  private width = window.innerWidth;
  private height = window.innerHeight;

  private loadingManager: CustomLoadingManager;
  private loader: GLTFLoader;
  private renderer: WebGLRenderer;
  private activeScene: BasicScene | null;

  private options: GameOptions;
  private resizeListener: () => void;

  private llmSettings: LLMSettings;
  private settingsModal: SettingsModal;
  private thinkingPanel: ThinkingPanel;
  private gameHistoryPanel: GameHistoryPanel;
  private toastSystem: ToastSystem;
  private footerAd: FooterAd;
  private insightBanner: InsightBanner;
  private endGameStatsPanel: EndGameStatsPanel;

  private playerHeader: PlayerHeader | null = null;
  private gamificationEngine: GamificationEngine | null = null;
  private personalityEngine: PersonalityEngine | null = null;
  private insightEngine: InsightEngine | null = null;
  private moveSheet: MoveSheet;
  private creditBadge: CreditBadge;
  private moveNumber = 1;
  private leftPanel: HTMLDivElement;
  private aiCommentary: HTMLDivElement;
  private commentaryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options?: GameOptions) {
    this.options = options || {};

    this.setupLoader();
    this.setupRenderer();
    this.addListenerOnResize(this.renderer);

    // Load settings before creating scene (pieceStyle affects model selection)
    this.llmSettings = LLMSettingsStore.load() || LLMSettingsStore.getDefaults();
    this.activeScene = this.createChessScene();
    this.thinkingPanel = new ThinkingPanel();
    this.toastSystem = new ToastSystem();
    this.insightBanner = new InsightBanner();
    this.footerAd = new FooterAd();
    this.endGameStatsPanel = new EndGameStatsPanel();
    this.moveSheet = new MoveSheet();
    this.creditBadge = new CreditBadge();

    // Build left panel: commentary above move sheet
    this.leftPanel = document.createElement("div");
    this.leftPanel.className = "left-panel";
    this.aiCommentary = document.createElement("div");
    this.aiCommentary.className = "ai-commentary";
    this.leftPanel.appendChild(this.aiCommentary);
    this.leftPanel.appendChild(this.moveSheet.getElement());
    document.body.appendChild(this.leftPanel);

    this.gameHistoryPanel = new GameHistoryPanel((count) => {
      this.toastSystem.show(`Imported ${count} games.`, "info");
    });
    this.settingsModal = new SettingsModal((settings: LLMSettings) => {
      this.llmSettings = settings;
      this.updateModeBadge();
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on("player:move", (data: unknown) => {
      const d = data as {
        move: { san: string; captured?: string; color?: string };
        boardSummary: string;
        isCapture: boolean;
        isCheck: boolean;
        insight: { playerMove: string; betterMove?: string; explanation: string; quality: string } | null;
      };

      this.clearCommentary();

      // Add to move sheet
      const quality = d.insight?.quality || null;
      this.moveSheet.addMove(
        d.move.color === "w" ? "w" : "b",
        d.move.san,
        quality as any
      );

      // Show insight in commentary panel
      if (d.insight && this.insightEngine) {
        const labels: Record<string, string> = {
          brilliant: "Brilliant!", good: "Good", inaccuracy: "Inaccuracy",
          blunder: "Blunder", missed_win: "Missed Win"
        };
        const label = labels[d.insight.quality] || d.insight.quality;
        this.showCommentary(
          `${label} — ${d.insight.explanation || `You played ${d.insight.playerMove}`}`,
          "insight", d.insight.quality
        );
        this.gamificationEngine?.recordMoveQuality(d.insight.quality as any);
      }

      // Trash talk on major errors or checks
      if (d.insight && (d.insight.quality === "blunder" || d.insight.quality === "missed_win")) {
        this.personalityEngine?.reactToPlayerMove(d.move.san, d.boardSummary);
      } else if (d.isCheck) {
        this.personalityEngine?.reactToCheck(d.move.san, d.boardSummary);
      }
    });

    eventBus.on("ai:move", (data: unknown) => {
      const d = data as {
        move: { san: string; captured?: string; color?: string };
        boardSummary: string;
        isCapture: boolean;
        isCheck: boolean;
        fenBefore?: string;
      };

      this.clearCommentary();

      // Add to move sheet
      this.moveSheet.addMove(d.move.color === "w" ? "w" : "b", d.move.san);

      // Check if AI made a bad move
      if (this.insightEngine && d.fenBefore) {
        const aiInsight = this.insightEngine.analyzePlayerMove(d.fenBefore, d.move.san);
        if (aiInsight.quality === "blunder" || aiInsight.quality === "missed_win") {
          this.personalityEngine?.reactToOwnBadMove(d.move.san, d.boardSummary);
          return;
        }
      }

      // Trash talk on all AI moves
      if (d.isCapture) {
        this.personalityEngine?.reactToCapture(d.move.san, d.boardSummary);
      } else if (d.isCheck) {
        this.personalityEngine?.reactToCheck(d.move.san, d.boardSummary);
      } else {
        this.personalityEngine?.celebrateAiMove(d.move.san, d.boardSummary);
      }
    });

    eventBus.on("turn:change", (data: unknown) => {
      const d = data as { isPlayerTurn: boolean };
      this.playerHeader?.setTurn(d.isPlayerTurn);
    });

    eventBus.on("game:end", (data: unknown) => {
      const d = data as { result: string; playerColor: string };
      this.personalityEngine?.reactToGameEnd(
        `Game over: ${d.result}. Player was ${d.playerColor}.`
      );
    });
  }

  private setupLoader(): void {
    this.loadingManager = new CustomLoadingManager();
    this.loader = new GLTFLoader(this.loadingManager);
  }

  private setupRenderer(): void {
    this.renderer = new WebGLRenderer({
      canvas: document.getElementById("app") as HTMLCanvasElement,
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = ReinhardToneMapping;
    this.renderer.toneMappingExposure = 2.5;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
  }

  private addListenerOnResize(renderer: WebGLRenderer): void {
    this.resizeListener = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", this.resizeListener, false);
  }

  private createChessScene(): ChessScene {
    const useGlass = false;
    return new ChessScene({
      renderer: this.renderer,
      loader: this.loader,
      options: {
        addGridHelper: this.options.addGridHelper,
        lightHelpers: this.options.lightHelpers,
        cannonDebugger: this.options.cannonDebugger,
      },
    }, useGlass);
  }

  private onEndGame(chessInstance: ChessInstance, playerColor: PieceColor): void {
    const endMsg = this.getEndGameMessage(chessInstance, playerColor);
    const isPlayerTurn = chessInstance.turn() === playerColor;

    let resultType: "win" | "loss" | "draw" = "draw";
    if (chessInstance.in_checkmate()) {
      resultType = isPlayerTurn ? "loss" : "win";
    }

    const stats = this.gamificationEngine?.getEndGameStats() || null;

    this.footerAd.show();
    this.endGameStatsPanel.show(
      endMsg,
      resultType,
      stats,
      () => this.restartGame(),
      () => this.gameHistoryPanel.show()
    );
  }

  private getEndGameMessage(chessInstance: ChessInstance, playerColor: PieceColor): string {
    const isPlayerColor = chessInstance.turn() === playerColor;

    if (chessInstance.in_checkmate()) {
      return isPlayerColor ? "You lost by checkmate" : "You won by checkmate!";
    }
    if (chessInstance.in_stalemate()) return "Draw by stalemate";
    if (chessInstance.in_threefold_repetition()) return "Draw by threefold repetition";
    if (chessInstance.in_draw()) return "Draw";
    return "Game over";
  }

  private restartGame(): void {
    this.activeScene.cleanup();
    this.thinkingPanel.clear();
    this.endGameStatsPanel.destroy();
    this.playerHeader?.destroy();
    this.playerHeader = null;
    this.gamificationEngine?.reset();
    this.moveSheet.clear();
    this.clearCommentary();
    this.activeScene = this.createChessScene();
    this.showLandingPage();
  }

  private async startActiveScene(): Promise<void> {
    this.thinkingPanel.clear();
    this.footerAd.hide();

    // Initialize engines if LLM enabled
    if (this.llmSettings?.enabled && this.llmSettings.config.apiKey) {
      this.insightEngine = this.llmSettings.insightsEnabled ? new InsightEngine() : null;
      this.gamificationEngine = new GamificationEngine(this.toastSystem);

      this.personalityEngine = new PersonalityEngine(
        this.llmSettings.config,
        this.llmSettings.personality || "chill",
        (update) => {
          this.showCommentary(update.text, "trash_talk");
          this.toastSystem.speak(update.text);
        }
      );

      // Generate AI name
      let aiName = this.llmSettings.personality === "savage" ? "The Savage" : "Chill Bot";
      try {
        aiName = await NameGenerator.generateName(
          this.llmSettings.config,
          this.llmSettings.personality || "chill"
        );
      } catch {
        // fallback name already set
      }

      // Register listener BEFORE scene.start() (it emits game:start synchronously)
      const voiceToggle = () => this.toastSystem.toggleVoice();
      const onGameStart = (data: unknown) => {
        const d = data as { playerColor: string };
        this.playerHeader = new PlayerHeader(
          d.playerColor,
          aiName,
          this.llmSettings.personality || "chill",
          voiceToggle
        );
        this.moveSheet.show();
        this.moveNumber = 1;
        eventBus.off("game:start", onGameStart);
      };
      eventBus.on("game:start", onGameStart);

      (this.activeScene as ChessScene).start(
        (chessInstance: ChessInstance, playerColor: PieceColor) => {
          this.onEndGame(chessInstance, playerColor);
        },
        this.llmSettings,
        (update) => this.thinkingPanel.handleUpdate(update),
        this.insightEngine
      );
    } else {
      // No LLM mode — local minimax (still get insights + gamification)
      this.insightEngine = new InsightEngine();
      this.personalityEngine = null;
      this.gamificationEngine = new GamificationEngine(this.toastSystem);

      const voiceToggle = () => this.toastSystem.toggleVoice();
      const onGameStart = (data: unknown) => {
        const d = data as { playerColor: string };
        this.playerHeader = new PlayerHeader(d.playerColor, "Minimax AI", "chill", voiceToggle);
        this.moveSheet.show();
        this.moveNumber = 1;
        eventBus.off("game:start", onGameStart);
      };
      eventBus.on("game:start", onGameStart);

      (this.activeScene as ChessScene).start(
        (chessInstance: ChessInstance, playerColor: PieceColor) => {
          this.onEndGame(chessInstance, playerColor);
        },
        undefined,
        undefined,
        this.insightEngine
      );
    }
  }

  private initGame(): void {
    this.wireLandingPage();
  }

  private updateModeBadge(): void {
    const badge = document.getElementById("landing-mode-badge");
    if (!badge) return;
    const isLLM = this.llmSettings?.enabled && this.llmSettings.config.apiKey;
    if (isLLM) {
      const providerName = this.llmSettings.config.provider.charAt(0).toUpperCase() + this.llmSettings.config.provider.slice(1);
      badge.innerHTML = `<span class="mode-dot llm"></span> ${providerName} LLM · ${this.llmSettings.personality === "savage" ? "Savage" : "Chill"} mode`;
    } else {
      badge.innerHTML = `<span class="mode-dot local"></span> Local Minimax AI · No API key needed`;
    }
  }

  private wireLandingPage(): void {
    this.updateModeBadge();

    document.getElementById("btn-start")!.onclick = () => {
      this.showGameView();
    };
    document.getElementById("btn-settings")!.onclick = () => {
      this.settingsModal.show();
    };
    document.getElementById("btn-history")!.onclick = () => {
      this.gameHistoryPanel.show();
    };
  }

  private showGameView(): void {
    document.body.classList.add("game-active");

    if (!this.activeScene) {
      throw new Error("There is no active scene at the moment");
    }

    this.activeScene.init();
    this.startActiveScene();
  }

  showLandingPage(): void {
    document.body.classList.remove("game-active");
    this.updateModeBadge();
  }

  private updateGame(): void {
    if (!this.activeScene) {
      throw new Error("There is no active scene at the moment");
    }

    this.activeScene.world.fixedStep();
    this.activeScene.cannonDebugger?.update();
    this.activeScene.update();
  }

  init(): void {
    try {
      this.initGame();
    } catch (e) {
      console.error(e?.message);
    }
  }

  update(): void {
    try {
      this.updateGame();
    } catch (e) {
      console.error(e?.message);
    }
  }

  private showCommentary(text: string, type: "trash_talk" | "insight", quality?: string): void {
    this.aiCommentary.className = "ai-commentary visible";
    if (type === "trash_talk") {
      this.aiCommentary.classList.add("type-trash_talk");
    } else if (quality) {
      this.aiCommentary.classList.add(`type-insight-${quality}`);
    }
    const label = type === "trash_talk" ? "AI" : "Analysis";
    this.aiCommentary.innerHTML = `<div class="ai-commentary-label">${label}</div><div>${text}</div>`;
    if (this.commentaryTimer) clearTimeout(this.commentaryTimer);
    this.commentaryTimer = setTimeout(() => {
      this.aiCommentary.className = "ai-commentary";
    }, type === "trash_talk" ? 6000 : 8000);
  }

  private clearCommentary(): void {
    this.aiCommentary.className = "ai-commentary";
    this.aiCommentary.innerHTML = "";
    if (this.commentaryTimer) {
      clearTimeout(this.commentaryTimer);
      this.commentaryTimer = null;
    }
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  cleanup(): void {
    window.removeEventListener("resize", this.resizeListener);
    this.settingsModal.destroy();
    this.thinkingPanel.destroy();
    this.gameHistoryPanel.destroy();
    this.toastSystem.destroy();
    this.insightBanner.destroy();
    this.footerAd.destroy();
    this.endGameStatsPanel.destroy();
    this.moveSheet.destroy();
    this.leftPanel.remove();
    this.playerHeader?.destroy();
    eventBus.clear();
  }
}

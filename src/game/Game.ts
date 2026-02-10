import { ChessInstance, PieceColor } from "chess.js";
import { CustomLoadingManager } from "logic/LoadingManager/LoadingManager";
import { BasicScene } from "scenes/BasicScene/BasicScene";
import { ChessScene } from "scenes/ChessScene/ChessScene";
import { ReinhardToneMapping, sRGBEncoding, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GameOptions } from "./types";
import { LLMSettings } from "llm/types";
import { LLMSettingsStore } from "llm/LLMSettingsStore";
import { SettingsModal } from "ui/SettingsModal";
import { ThinkingPanel } from "ui/ThinkingPanel";
import { GameHistoryPanel } from "ui/GameHistoryPanel";

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

  constructor(options?: GameOptions) {
    this.options = options || {};

    this.setupLoader();
    this.setupRenderer();

    this.addListenerOnResize(this.renderer);

    this.activeScene = this.createChessScene();

    // Initialize LLM UI components
    this.llmSettings = LLMSettingsStore.load() || LLMSettingsStore.getDefaults();
    this.thinkingPanel = new ThinkingPanel();
    this.gameHistoryPanel = new GameHistoryPanel();
    this.settingsModal = new SettingsModal((settings: LLMSettings) => {
      this.llmSettings = settings;
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

    this.renderer.toneMapping = ReinhardToneMapping;
    this.renderer.toneMappingExposure = 3;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
  }

  private addListenerOnResize(renderer: WebGLRenderer): void {
    this.resizeListener = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", this.resizeListener, false);
  }

  private createChessScene(): ChessScene {
    return new ChessScene({
      renderer: this.renderer,
      loader: this.loader,
      options: {
        addGridHelper: this.options.addGridHelper,
        lightHelpers: this.options.lightHelpers,
        cannonDebugger: this.options.cannonDebugger,
      },
    });
  }

  private createEndPopup(endMsg: string): void {
    const div = document.createElement("DIV");
    const btnDiv = document.createElement("DIV");
    const restartBtn = document.createElement("BUTTON");
    const span = document.createElement("SPAN");

    restartBtn.onclick = () => {
      this.restartGame();
      div.remove();
    };

    restartBtn.innerHTML = "Restart Game";
    span.innerHTML = endMsg;

    btnDiv.classList.add("end-popup-btn");
    restartBtn.classList.add("btn-small");

    div.classList.add("center-mid");
    div.classList.add("end-popup");

    div.appendChild(span);
    btnDiv.appendChild(restartBtn);
    div.appendChild(btnDiv);

    document.body.appendChild(div);
  }

  private restartGame(): void {
    this.activeScene.cleanup();
    this.thinkingPanel.clear();
    this.activeScene = this.createChessScene();
    this.activeScene.init();
    this.startActiveScene();
  }

  private startActiveScene(): void {
    this.thinkingPanel.clear();
    (this.activeScene as ChessScene).start(
      (chessInstance: ChessInstance, playerColor: PieceColor) => {
        this.onEndGame(chessInstance, playerColor);
      },
      this.llmSettings?.enabled ? this.llmSettings : undefined,
      this.llmSettings?.enabled
        ? (update) => this.thinkingPanel.handleUpdate(update)
        : undefined
    );
  }

  private onEndGame(chessInstance: ChessInstance, playerColor: PieceColor) {
    const endMsg = this.getEndGameMessage(chessInstance, playerColor);

    this.createEndPopup(endMsg);
  }

  private getEndGameMessage(
    chessInstance: ChessInstance,
    playerColor: PieceColor
  ): string {
    const isPlayerColor = chessInstance.turn() === playerColor;

    if (chessInstance.in_checkmate()) {
      return isPlayerColor
        ? "You lost the game by checkmate"
        : "You won the game by checkmate";
    }

    if (chessInstance.in_stalemate()) {
      return "The game ended with draw by stalemate";
    }

    if (chessInstance.in_threefold_repetition()) {
      return "The game ended with threefold repetition";
    }

    if (chessInstance.in_draw()) {
      return "The game ended with draw";
    }
  }

  private initGame(): void {
    if (!this.activeScene) {
      throw new Error("There is no active scene at the moment");
    }

    this.activeScene.init();

    this.addStartButton();
  }

  private addStartButton(): void {
    const div = document.createElement("DIV");
    div.classList.add("center-mid");
    div.classList.add("menu-buttons");

    // Start Game button
    const startBtn = document.createElement("BUTTON");
    startBtn.classList.add("btn");
    startBtn.innerHTML = "Start Game";
    startBtn.onclick = () => {
      this.startActiveScene();
      div.remove();
    };
    div.appendChild(startBtn);

    // AI Settings button
    const settingsBtn = document.createElement("BUTTON");
    settingsBtn.classList.add("btn-small");
    settingsBtn.innerHTML = "AI Settings";
    settingsBtn.onclick = () => {
      this.settingsModal.show();
    };
    div.appendChild(settingsBtn);

    // Game History button
    const historyBtn = document.createElement("BUTTON");
    historyBtn.classList.add("btn-small");
    historyBtn.innerHTML = "Game History";
    historyBtn.onclick = () => {
      this.gameHistoryPanel.show();
    };
    div.appendChild(historyBtn);

    document.body.appendChild(div);
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

  cleanup(): void {
    window.removeEventListener("resize", this.resizeListener);
    this.settingsModal.destroy();
    this.thinkingPanel.destroy();
    this.gameHistoryPanel.destroy();
  }
}

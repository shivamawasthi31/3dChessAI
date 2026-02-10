import { LLMSettings, LLMProviderType, PlayStyle, AIPersonality, ProviderInfo } from "llm/types";
import { LLMSettingsStore } from "llm/LLMSettingsStore";
import { getAllProviderInfos } from "llm/providers";

export class SettingsModal {
  private backdrop: HTMLDivElement;
  private modal: HTMLDivElement;
  private onSave: (settings: LLMSettings) => void;
  private providers: ProviderInfo[];
  private activeTab = "config";

  constructor(onSave: (settings: LLMSettings) => void) {
    this.onSave = onSave;
    this.providers = getAllProviderInfos();
    this.createModal();
  }

  private createModal(): void {
    this.backdrop = document.createElement("div");
    this.backdrop.className = "settings-backdrop";
    this.backdrop.onclick = () => this.hide();

    this.modal = document.createElement("div");
    this.modal.className = "settings-modal";
    this.modal.onclick = (e) => e.stopPropagation();

    const title = document.createElement("h2");
    title.textContent = "AI Settings";
    title.className = "settings-title";
    this.modal.appendChild(title);

    // Tabs
    const tabs = document.createElement("div");
    tabs.className = "settings-tabs";
    tabs.appendChild(this.createTab("AI Config", "config", true));
    tabs.appendChild(this.createTab("Gameplay", "gameplay", false));
    this.modal.appendChild(tabs);

    // Tab 1: AI Config
    const configContent = document.createElement("div");
    configContent.className = "settings-tab-content active";
    configContent.id = "tab-config";

    configContent.appendChild(this.createToggleRow("Enable LLM Opponent", "llm-enable"));
    configContent.appendChild(
      this.createSelectRow("Provider", "llm-provider",
        this.providers.map((p) => ({ value: p.type, label: p.name }))
      )
    );
    configContent.appendChild(this.createSelectRow("Model", "llm-model", []));
    configContent.appendChild(this.createInputRow("API Key", "llm-apikey", "password", "sk-..."));
    configContent.appendChild(this.createInputRow("Proxy URL (optional)", "llm-proxy", "text", "https://..."));

    const helpBox = document.createElement("div");
    helpBox.className = "settings-help";
    helpBox.id = "api-key-help";
    configContent.appendChild(helpBox);

    const warning = document.createElement("div");
    warning.className = "settings-warning";
    warning.textContent = "API keys are stored in your browser's localStorage.";
    configContent.appendChild(warning);
    this.modal.appendChild(configContent);

    // Tab 2: Gameplay
    const gameplayContent = document.createElement("div");
    gameplayContent.className = "settings-tab-content";
    gameplayContent.id = "tab-gameplay";

    gameplayContent.appendChild(
      this.createSelectRow("Play Style", "llm-style", [
        { value: "balanced", label: "Balanced" },
        { value: "aggressive", label: "Aggressive" },
        { value: "defensive", label: "Defensive" },
      ])
    );
    gameplayContent.appendChild(this.createPersonalityRow());
    gameplayContent.appendChild(this.createToggleRow("Enable Move Insights", "llm-insights"));
    this.modal.appendChild(gameplayContent);

    // Buttons
    const btnRow = document.createElement("div");
    btnRow.className = "settings-buttons";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "settings-btn settings-btn-cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => this.hide();

    const saveBtn = document.createElement("button");
    saveBtn.className = "settings-btn settings-btn-save";
    saveBtn.textContent = "Save";
    saveBtn.onclick = () => this.save();

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    this.modal.appendChild(btnRow);

    this.backdrop.appendChild(this.modal);
    document.body.appendChild(this.backdrop);

    const providerSelect = this.modal.querySelector("#llm-provider") as HTMLSelectElement;
    providerSelect.addEventListener("change", () => {
      this.updateModels();
      this.updateApiKeyHelp();
    });

    this.loadSettings();
    this.updateModels();
    this.updateApiKeyHelp();
  }

  private createTab(label: string, id: string, active: boolean): HTMLButtonElement {
    const tab = document.createElement("button");
    tab.className = `settings-tab${active ? " active" : ""}`;
    tab.textContent = label;
    tab.dataset.tab = id;
    tab.onclick = () => this.switchTab(id);
    return tab;
  }

  private switchTab(tabId: string): void {
    this.activeTab = tabId;
    this.modal.querySelectorAll(".settings-tab").forEach((t) => {
      (t as HTMLElement).classList.toggle("active", (t as HTMLElement).dataset.tab === tabId);
    });
    this.modal.querySelectorAll(".settings-tab-content").forEach((c) => {
      (c as HTMLElement).classList.toggle("active", (c as HTMLElement).id === `tab-${tabId}`);
    });
  }

  private createPersonalityRow(): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "settings-row";

    const lbl = document.createElement("label");
    lbl.textContent = "AI Personality";

    const toggle = document.createElement("div");
    toggle.className = "personality-toggle";
    toggle.id = "llm-personality";

    const chill = document.createElement("button");
    chill.className = "personality-option active";
    chill.textContent = "Chill";
    chill.dataset.value = "chill";

    const savage = document.createElement("button");
    savage.className = "personality-option";
    savage.textContent = "Savage";
    savage.dataset.value = "savage";

    chill.onclick = () => { chill.classList.add("active"); savage.classList.remove("active"); };
    savage.onclick = () => { savage.classList.add("active"); chill.classList.remove("active"); };

    toggle.appendChild(chill);
    toggle.appendChild(savage);

    row.appendChild(lbl);
    row.appendChild(toggle);
    return row;
  }

  private createToggleRow(label: string, id: string): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "settings-row";
    const lbl = document.createElement("label");
    lbl.textContent = label;
    lbl.htmlFor = id;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.className = "settings-toggle";
    row.appendChild(lbl);
    row.appendChild(input);
    return row;
  }

  private createSelectRow(label: string, id: string, options: { value: string; label: string }[]): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "settings-row";
    const lbl = document.createElement("label");
    lbl.textContent = label;
    lbl.htmlFor = id;
    const select = document.createElement("select");
    select.id = id;
    select.className = "settings-select";
    for (const opt of options) {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    }
    row.appendChild(lbl);
    row.appendChild(select);
    return row;
  }

  private createInputRow(label: string, id: string, type: string, placeholder: string): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "settings-row";
    const lbl = document.createElement("label");
    lbl.textContent = label;
    lbl.htmlFor = id;
    const input = document.createElement("input");
    input.type = type;
    input.id = id;
    input.className = "settings-input";
    input.placeholder = placeholder;
    row.appendChild(lbl);
    row.appendChild(input);
    return row;
  }

  private updateModels(): void {
    const providerSelect = this.modal.querySelector("#llm-provider") as HTMLSelectElement;
    const modelSelect = this.modal.querySelector("#llm-model") as HTMLSelectElement;
    const provider = this.providers.find((p) => p.type === providerSelect.value);
    modelSelect.innerHTML = "";
    if (provider) {
      for (const model of provider.models) {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.name;
        modelSelect.appendChild(option);
      }
      modelSelect.value = provider.defaultModel;
    }
  }

  private updateApiKeyHelp(): void {
    const helpBox = this.modal.querySelector("#api-key-help") as HTMLDivElement;
    if (!helpBox) return;
    const provider = (this.modal.querySelector("#llm-provider") as HTMLSelectElement).value;
    const helpMap: Record<string, string> = {
      openai: 'Get your API key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com/api-keys</a>. Create an account → API Keys → Create new secret key.',
      anthropic: 'Get your API key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>. Sign up → Settings → API Keys → Create Key.',
      gemini: 'Get your API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">aistudio.google.com/app/apikey</a>. Sign in with Google → Create API Key.',
      groq: 'Get your API key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a>. Create an account → API Keys → Create.',
    };
    helpBox.innerHTML = helpMap[provider] || "";
    helpBox.style.display = helpMap[provider] ? "block" : "none";
  }

  private loadSettings(): void {
    const settings = LLMSettingsStore.load() || LLMSettingsStore.getDefaults();
    (this.modal.querySelector("#llm-enable") as HTMLInputElement).checked = settings.enabled;
    (this.modal.querySelector("#llm-provider") as HTMLSelectElement).value = settings.config.provider;
    (this.modal.querySelector("#llm-apikey") as HTMLInputElement).value = settings.config.apiKey;
    (this.modal.querySelector("#llm-style") as HTMLSelectElement).value = settings.playStyle;
    (this.modal.querySelector("#llm-proxy") as HTMLInputElement).value = settings.config.proxyUrl || "";
    (this.modal.querySelector("#llm-insights") as HTMLInputElement).checked = settings.insightsEnabled !== false;

    const personalityEl = this.modal.querySelector("#llm-personality");
    if (personalityEl) {
      personalityEl.querySelectorAll(".personality-option").forEach((btn) => {
        (btn as HTMLElement).classList.toggle("active", (btn as HTMLElement).dataset.value === (settings.personality || "chill"));
      });
    }

    this.updateModels();
    if (settings.config.model) {
      (this.modal.querySelector("#llm-model") as HTMLSelectElement).value = settings.config.model;
    }
  }

  private save(): void {
    const personalityEl = this.modal.querySelector("#llm-personality .personality-option.active") as HTMLElement;

    const settings: LLMSettings = {
      enabled: (this.modal.querySelector("#llm-enable") as HTMLInputElement).checked,
      config: {
        provider: (this.modal.querySelector("#llm-provider") as HTMLSelectElement).value as LLMProviderType,
        apiKey: (this.modal.querySelector("#llm-apikey") as HTMLInputElement).value,
        model: (this.modal.querySelector("#llm-model") as HTMLSelectElement).value,
        proxyUrl: (this.modal.querySelector("#llm-proxy") as HTMLInputElement).value || undefined,
      },
      playStyle: (this.modal.querySelector("#llm-style") as HTMLSelectElement).value as PlayStyle,
      personality: (personalityEl?.dataset.value as AIPersonality) || "chill",
      insightsEnabled: (this.modal.querySelector("#llm-insights") as HTMLInputElement).checked,
    };

    LLMSettingsStore.save(settings);
    this.onSave(settings);
    this.hide();
  }

  show(): void {
    this.loadSettings();
    this.backdrop.style.display = "flex";
  }

  hide(): void {
    this.backdrop.style.display = "none";
  }

  destroy(): void {
    this.backdrop.remove();
  }
}

import { LLMSettings, LLMProviderType, PlayStyle, ProviderInfo } from "llm/types";
import { LLMSettingsStore } from "llm/LLMSettingsStore";
import { getAllProviderInfos } from "llm/providers";

export class SettingsModal {
  private backdrop: HTMLDivElement;
  private modal: HTMLDivElement;
  private onSave: (settings: LLMSettings) => void;
  private providers: ProviderInfo[];

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

    // LLM Enable toggle
    const enableRow = this.createToggleRow("Enable LLM Opponent", "llm-enable");
    this.modal.appendChild(enableRow);

    // Provider dropdown
    const providerRow = this.createSelectRow(
      "Provider",
      "llm-provider",
      this.providers.map((p) => ({ value: p.type, label: p.name }))
    );
    this.modal.appendChild(providerRow);

    // Model dropdown (populated dynamically)
    const modelRow = this.createSelectRow("Model", "llm-model", []);
    this.modal.appendChild(modelRow);

    // API Key
    const keyRow = this.createInputRow("API Key", "llm-apikey", "password", "sk-...");
    this.modal.appendChild(keyRow);

    // Play style
    const styleRow = this.createSelectRow("Play Style", "llm-style", [
      { value: "balanced", label: "Balanced" },
      { value: "aggressive", label: "Aggressive" },
      { value: "defensive", label: "Defensive" },
    ]);
    this.modal.appendChild(styleRow);

    // Proxy URL (optional)
    const proxyRow = this.createInputRow("Proxy URL (optional)", "llm-proxy", "text", "https://...");
    this.modal.appendChild(proxyRow);

    // Warning
    const warning = document.createElement("div");
    warning.className = "settings-warning";
    warning.textContent = "⚠ API keys are stored in your browser's localStorage. Use at your own risk.";
    this.modal.appendChild(warning);

    // Buttons
    const btnRow = document.createElement("div");
    btnRow.className = "settings-buttons";

    const saveBtn = document.createElement("button");
    saveBtn.className = "settings-btn settings-btn-save";
    saveBtn.textContent = "Save";
    saveBtn.onclick = () => this.save();

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "settings-btn settings-btn-cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => this.hide();

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    this.modal.appendChild(btnRow);

    this.backdrop.appendChild(this.modal);
    document.body.appendChild(this.backdrop);

    // Wire provider change to update models
    const providerSelect = this.modal.querySelector("#llm-provider") as HTMLSelectElement;
    providerSelect.addEventListener("change", () => this.updateModels());

    // Load saved settings
    this.loadSettings();
    this.updateModels();
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

  private createSelectRow(
    label: string,
    id: string,
    options: { value: string; label: string }[]
  ): HTMLDivElement {
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

  private createInputRow(
    label: string,
    id: string,
    type: string,
    placeholder: string
  ): HTMLDivElement {
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

  private loadSettings(): void {
    const settings = LLMSettingsStore.load() || LLMSettingsStore.getDefaults();

    (this.modal.querySelector("#llm-enable") as HTMLInputElement).checked = settings.enabled;
    (this.modal.querySelector("#llm-provider") as HTMLSelectElement).value = settings.config.provider;
    (this.modal.querySelector("#llm-apikey") as HTMLInputElement).value = settings.config.apiKey;
    (this.modal.querySelector("#llm-style") as HTMLSelectElement).value = settings.playStyle;
    (this.modal.querySelector("#llm-proxy") as HTMLInputElement).value = settings.config.proxyUrl || "";

    this.updateModels();
    if (settings.config.model) {
      (this.modal.querySelector("#llm-model") as HTMLSelectElement).value = settings.config.model;
    }
  }

  private save(): void {
    const settings: LLMSettings = {
      enabled: (this.modal.querySelector("#llm-enable") as HTMLInputElement).checked,
      config: {
        provider: (this.modal.querySelector("#llm-provider") as HTMLSelectElement).value as LLMProviderType,
        apiKey: (this.modal.querySelector("#llm-apikey") as HTMLInputElement).value,
        model: (this.modal.querySelector("#llm-model") as HTMLSelectElement).value,
        proxyUrl: (this.modal.querySelector("#llm-proxy") as HTMLInputElement).value || undefined,
      },
      playStyle: (this.modal.querySelector("#llm-style") as HTMLSelectElement).value as PlayStyle,
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

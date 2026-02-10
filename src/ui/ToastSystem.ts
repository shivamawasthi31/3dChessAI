export type ToastType = "trash_talk" | "insight" | "achievement" | "info";

export class ToastSystem {
  private container: HTMLDivElement;
  private maxVisible = 3;
  private voiceEnabled = true;

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "toast-container";
    document.body.appendChild(this.container);
  }

  show(message: string, type: ToastType, duration?: number): void {
    const durations: Record<ToastType, number> = {
      trash_talk: 4000,
      insight: 6000,
      achievement: 5000,
      info: 3000,
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.dataset.toastType = type;
    toast.textContent = message;

    // Enforce max visible
    while (this.container.children.length >= this.maxVisible) {
      this.container.removeChild(this.container.firstChild!);
    }

    this.container.appendChild(toast);

    // Voice TTS for trash talk
    if (type === "trash_talk" && this.voiceEnabled && typeof speechSynthesis !== "undefined") {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.1;
      utterance.pitch = 0.9;
      speechSynthesis.speak(utterance);
    }

    const ms = duration || durations[type];
    setTimeout(() => {
      toast.classList.add("toast-exit");
      setTimeout(() => toast.remove(), 300);
    }, ms);
  }

  clearType(type: ToastType): void {
    const toasts = this.container.querySelectorAll(`[data-toast-type="${type}"]`);
    toasts.forEach((t) => t.remove());

    // Cancel speech if clearing trash talk
    if (type === "trash_talk" && typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
    }
  }

  toggleVoice(): boolean {
    this.voiceEnabled = !this.voiceEnabled;
    if (!this.voiceEnabled && typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
    }
    return this.voiceEnabled;
  }

  isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  destroy(): void {
    this.container.remove();
  }
}

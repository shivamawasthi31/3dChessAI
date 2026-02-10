export type ToastType = "trash_talk" | "insight" | "achievement" | "info";

export class ToastSystem {
  private container: HTMLDivElement;
  private maxVisible = 3;

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
    toast.textContent = message;

    // Enforce max visible
    while (this.container.children.length >= this.maxVisible) {
      this.container.removeChild(this.container.firstChild!);
    }

    this.container.appendChild(toast);

    const ms = duration || durations[type];
    setTimeout(() => {
      toast.classList.add("toast-exit");
      setTimeout(() => toast.remove(), 300);
    }, ms);
  }

  destroy(): void {
    this.container.remove();
  }
}

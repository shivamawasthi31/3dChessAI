export class CreditBadge {
  private btn: HTMLButtonElement;
  private tooltip: HTMLDivElement;

  constructor() {
    this.btn = document.createElement("button");
    this.btn.className = "credit-badge";
    this.btn.textContent = "i";
    this.btn.title = "Model credits";

    this.tooltip = document.createElement("div");
    this.tooltip.className = "credit-tooltip";
    this.tooltip.innerHTML = `"Glass Chess Board" by <a href="https://sketchfab.com/3d-models/glass-chess-board-b9caf24c4a8e4252be60198e7f55dade" target="_blank" rel="noopener">K-</a> · CC BY 4.0`;

    this.btn.onmouseenter = () => {
      this.tooltip.style.display = "block";
    };
    this.btn.onmouseleave = () => {
      this.tooltip.style.display = "none";
    };

    this.btn.appendChild(this.tooltip);
    document.body.appendChild(this.btn);
  }

  destroy(): void {
    this.btn.remove();
  }
}

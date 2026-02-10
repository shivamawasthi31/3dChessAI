export class FooterAd {
  private el: HTMLDivElement;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "footer-ad";
    this.el.innerHTML = `Powered by <a href="https://workflows.devloytech.in" target="_blank" rel="noopener">DevloyTech Workflows</a>`;
    document.body.appendChild(this.el);
  }

  show(): void {
    this.el.style.opacity = "1";
    this.el.style.pointerEvents = "auto";
  }

  hide(): void {
    this.el.style.opacity = "0";
    this.el.style.pointerEvents = "none";
  }

  destroy(): void {
    this.el.remove();
  }
}

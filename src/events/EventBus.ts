type EventHandler = (data: unknown) => void;

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler): void {
    const list = this.handlers.get(event);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
  }

  emit(event: string, data?: unknown): void {
    const list = this.handlers.get(event);
    if (!list) return;
    for (const handler of list) {
      try {
        handler(data);
      } catch (e) {
        console.error(`EventBus error on "${event}":`, e);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();

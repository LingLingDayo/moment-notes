export type DomainEventType =
  | 'NOTE_CREATED'
  | 'NOTE_UPDATED'
  | 'NOTE_DELETED'
  | 'NOTE_RESTORED'
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'BACKUP_EXPORTED'
  | 'BACKUP_IMPORTED'
  | 'TOAST_REQUESTED';

export interface DomainEvent<T = any> {
  type: DomainEventType;
  payload: T;
  timestamp: number;
}

export interface ToastPayload {
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  position?: 'top' | 'bottom';
}

type EventHandler<T = any> = (event: DomainEvent<T>) => void;

class DomainEventBus {
  private handlers = new Map<DomainEventType, Set<EventHandler>>();

  public subscribe<T = any>(type: DomainEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    const set = this.handlers.get(type)!;
    set.add(handler as EventHandler);

    return () => {
      set.delete(handler as EventHandler);
    };
  }

  public emit<T = any>(type: DomainEventType, payload: T): void {
    const event: DomainEvent<T> = {
      type,
      payload,
      timestamp: Date.now()
    };
    const set = this.handlers.get(type);
    if (set) {
      set.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error handling event ${type}:`, error);
        }
      });
    }
  }

  public requestToast(message: string, type: ToastPayload['type'] = 'success', position: ToastPayload['position'] = 'top'): void {
    this.emit<ToastPayload>('TOAST_REQUESTED', { message, type, position });
  }

  public clearAll(): void {
    this.handlers.clear();
  }
}

export const eventBus = new DomainEventBus();

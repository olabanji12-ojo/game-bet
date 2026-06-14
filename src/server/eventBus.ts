import { SystemEvent } from '../types';

export type EventCallback = (payload: any) => void | Promise<void>;

class EventBus {
  private listeners: { [key: string]: EventCallback[] } = {};
  private eventHistory: SystemEvent[] = [];

  on(eventType: string, callback: EventCallback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);
  }

  emit(eventType: string, payload: any) {
    const event: SystemEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 11),
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    };
    
    this.eventHistory.push(event);
    if (this.eventHistory.length > 200) {
      this.eventHistory.shift();
    }

    const listeners = this.listeners[eventType] || [];
    listeners.forEach(callback => {
      try {
        const result = callback(payload);
        if (result instanceof Promise) {
          result.catch(err => {
            console.error(`[EventBus] Async listener hook error for ${eventType}:`, err);
          });
        }
      } catch (err) {
        console.error(`[EventBus] Listener error for ${eventType}:`, err);
      }
    });

    console.log(`[EventBus] (${event.timestamp}) EMIT [${eventType}]`, payload);
  }

  getHistory(): SystemEvent[] {
    return [...this.eventHistory];
  }
}

export const eventBus = new EventBus();

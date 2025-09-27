import { EventEmitter } from 'events';
import { Event } from '../../shared/types'
import { eventBus } from '../../shared/events/eventBus'
import { EventType } from '../../shared/events/eventTypes'

export interface AgentConfig {
  name: string;
  description: string;
  subscribeToEvents: EventType[];
  publishEvents: EventType[];
  enabled: boolean;
}

export abstract class Agent extends EventEmitter {
  protected config: AgentConfig;
  protected isRunning: boolean = false;
  protected processedEvents: Map<string, Date> = new Map();

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.config.enabled) {
      console.log(`[Agent] ${this.config.name} is disabled`);
      return;
    }

    this.config.subscribeToEvents.forEach(eventType => {
      eventBus.subscribe(eventType, this.handleEvent.bind(this));
    });

    console.log(`[Agent] ${this.config.name} initialized and listening to ${this.config.subscribeToEvents.length} event types`);
  }

  private async handleEvent(event: Event): Promise<void> {
    if (!this.config.enabled || !this.isRunning) {
      return;
    }

    try {
      // Prevent duplicate processing of the same event
      const eventKey = `${event.type}-${event.timestamp.getTime()}`;
      if (this.processedEvents.has(eventKey)) {
        return;
      }

      this.processedEvents.set(eventKey, new Date());
      
      // Clean up old processed events (keep only last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      for (const [key, timestamp] of this.processedEvents.entries()) {
        if (timestamp < oneHourAgo) {
          this.processedEvents.delete(key);
        }
      }

      console.log(`[Agent] ${this.config.name} processing event: ${event.type}`);
      await this.processEvent(event);
      
      this.emit('event-processed', { agent: this.config.name, event });
    } catch (error) {
      console.error(`[Agent] ${this.config.name} error processing event ${event.type}:`, error);
      this.emit('error', { agent: this.config.name, event, error });
      
      // Publish error event
      eventBus.publish('system.error', {
        agent: this.config.name,
        event: event.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, this.config.name);
    }
  }

  protected publishEvent(eventType: EventType, payload: any): void {
    if (!this.config.publishEvents.includes(eventType)) {
      console.warn(`[Agent] ${this.config.name} attempted to publish unauthorized event: ${eventType}`);
      return;
    }

    eventBus.publish(eventType, payload, this.config.name);
  }

  public start(): void {
    if (this.isRunning) {
      console.log(`[Agent] ${this.config.name} is already running`);
      return;
    }

    this.isRunning = true;
    console.log(`[Agent] ${this.config.name} started`);
    this.onStart();
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log(`[Agent] ${this.config.name} is already stopped`);
      return;
    }

    this.isRunning = false;
    console.log(`[Agent] ${this.config.name} stopped`);
    this.onStop();
  }

  public getStatus(): {
    name: string;
    description: string;
    isRunning: boolean;
    subscribeToEvents: EventType[];
    publishEvents: EventType[];
    processedEventsCount: number;
  } {
    return {
      name: this.config.name,
      description: this.config.description,
      isRunning: this.isRunning,
      subscribeToEvents: this.config.subscribeToEvents,
      publishEvents: this.config.publishEvents,
      processedEventsCount: this.processedEvents.size
    };
  }

  // Abstract methods to be implemented by concrete agents
  protected abstract processEvent(event: Event): Promise<void>;
  protected abstract onStart(): void;
  protected abstract onStop(): void;

  // Utility methods for common operations
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected validateEventPayload(event: Event, requiredFields: string[]): boolean {
    if (!event.payload) {
      return false;
    }

    return requiredFields.every(field => event.payload.hasOwnProperty(field));
  }

  protected logInfo(message: string, data?: any): void {
    console.log(`[Agent] ${this.config.name}: ${message}`, data || '');
  }

  protected logError(message: string, error?: any): void {
    console.error(`[Agent] ${this.config.name}: ${message}`, error || '');
  }
}

export default Agent;


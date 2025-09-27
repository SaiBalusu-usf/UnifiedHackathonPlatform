import { EventEmitter } from 'events';
import { Event } from '../../shared/types';
import { EventType } from '../../shared/events/eventBus';
export interface AgentConfig {
    name: string;
    description: string;
    subscribeToEvents: EventType[];
    publishEvents: EventType[];
    enabled: boolean;
}
export declare abstract class Agent extends EventEmitter {
    protected config: AgentConfig;
    protected isRunning: boolean;
    protected processedEvents: Map<string, Date>;
    constructor(config: AgentConfig);
    private setupEventListeners;
    private handleEvent;
    protected publishEvent(eventType: EventType, payload: any): void;
    start(): void;
    stop(): void;
    getStatus(): {
        name: string;
        description: string;
        isRunning: boolean;
        subscribeToEvents: EventType[];
        publishEvents: EventType[];
        processedEventsCount: number;
    };
    protected abstract processEvent(event: Event): Promise<void>;
    protected abstract onStart(): void;
    protected abstract onStop(): void;
    protected delay(ms: number): Promise<void>;
    protected validateEventPayload(event: Event, requiredFields: string[]): boolean;
    protected logInfo(message: string, data?: any): void;
    protected logError(message: string, error?: any): void;
}
export default Agent;
//# sourceMappingURL=Agent.d.ts.map
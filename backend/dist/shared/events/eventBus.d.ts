import { EventEmitter } from 'events';
import { EventType, PlatformEvent, EventHandler, EventPublisher, EventSubscriber } from './eventTypes';
export declare class EventBus extends EventEmitter implements EventPublisher, EventSubscriber {
    private static instance;
    private handlers;
    private eventStore;
    private maxStoredEvents;
    private constructor();
    static getInstance(): EventBus;
    publish(event: PlatformEvent): Promise<void>;
    publishBatch(events: PlatformEvent[]): Promise<void>;
    subscribe(eventType: EventType, handler: EventHandler): void;
    unsubscribe(eventType: EventType, handler: EventHandler): void;
    subscribeToAll(handler: EventHandler): void;
    publishLegacy(eventType: string, payload: any, source: string): void;
    getEventHistory(eventType?: EventType, limit?: number): PlatformEvent[];
    getEventsByCorrelation(correlationId: string): PlatformEvent[];
    getEventsByUser(userId: string): PlatformEvent[];
    getEventsByHackathon(hackathonId: string): PlatformEvent[];
    getEventsByTeam(teamId: string): PlatformEvent[];
    clearEventHistory(): void;
    getStatistics(): {
        totalEvents: number;
        eventsByType: Record<string, number>;
        recentEventRate: number;
        handlerCount: number;
    };
    getEventTypes(): string[];
    getListenerCount(eventType: EventType): number;
    private storeEvent;
    private safeHandleEvent;
}
export declare const eventBus: EventBus;
export declare abstract class BaseEventHandler<T extends PlatformEvent = PlatformEvent> implements EventHandler<T> {
    abstract handle(event: T): Promise<void>;
}
export declare function createUserEvent(type: EventType, userId: string, data: any, options?: Partial<PlatformEvent>): PlatformEvent;
export declare function createTeamEvent(type: EventType, teamId: string, data: any, options?: Partial<PlatformEvent>): PlatformEvent;
export declare function createAgentEvent(type: EventType, agentId: string, data: any, options?: Partial<PlatformEvent>): PlatformEvent;
export declare const EventTypes: {
    readonly USER_REGISTERED: EventType.USER_REGISTERED;
    readonly USER_UPDATED: EventType.USER_PROFILE_UPDATED;
    readonly TEAM_CREATED: EventType.TEAM_CREATED;
    readonly TEAM_MEMBER_ADDED: EventType.TEAM_MEMBER_ADDED;
    readonly RESUME_UPLOADED: EventType.RESUME_UPLOADED;
    readonly RESUME_PARSED: EventType.RESUME_PARSED;
    readonly AGENT_TASK_STARTED: EventType.AGENT_TASK_STARTED;
    readonly AGENT_TASK_COMPLETED: EventType.AGENT_TASK_COMPLETED;
    readonly SESSION_STARTED: EventType.SESSION_STARTED;
    readonly SESSION_ENDED: EventType.SESSION_ENDED;
    readonly SYSTEM_ERROR: EventType.SYSTEM_ERROR;
};
export declare const publishEvent: (eventType: string, payload: any, source: string) => void;
export declare const subscribeToEvent: (eventType: string, handler: (event: any) => void) => void;
export default eventBus;
//# sourceMappingURL=eventBus.d.ts.map
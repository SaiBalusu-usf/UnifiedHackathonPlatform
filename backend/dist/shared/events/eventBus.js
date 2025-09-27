"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeToEvent = exports.publishEvent = exports.EventTypes = exports.BaseEventHandler = exports.eventBus = exports.EventBus = void 0;
exports.createUserEvent = createUserEvent;
exports.createTeamEvent = createTeamEvent;
exports.createAgentEvent = createAgentEvent;
const events_1 = require("events");
const uuid_1 = require("uuid");
const eventTypes_1 = require("./eventTypes");
class EventBus extends events_1.EventEmitter {
    constructor() {
        super();
        this.handlers = new Map();
        this.eventStore = [];
        this.maxStoredEvents = 10000;
        this.setMaxListeners(100); // Increase max listeners for high-throughput scenarios
    }
    static getInstance() {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
    // Publish a single event
    async publish(event) {
        try {
            // Ensure event has required fields
            if (!event.id) {
                event.id = (0, uuid_1.v4)();
            }
            if (!event.timestamp) {
                event.timestamp = new Date();
            }
            if (!event.version) {
                event.version = '1.0';
            }
            // Store event for replay/debugging
            this.storeEvent(event);
            // Emit to EventEmitter listeners (for WebSocket broadcasting)
            this.emit('event', event);
            this.emit(event.type, event);
            // Call registered handlers
            const handlers = this.handlers.get(event.type);
            if (handlers) {
                const promises = Array.from(handlers).map(handler => this.safeHandleEvent(handler, event));
                await Promise.allSettled(promises);
            }
            console.log(`[EventBus] Event published: ${event.type}`, {
                id: event.id,
                timestamp: event.timestamp,
                source: event.source
            });
        }
        catch (error) {
            console.error('[EventBus] Error publishing event:', error);
            throw error;
        }
    }
    // Publish multiple events in batch
    async publishBatch(events) {
        const promises = events.map(event => this.publish(event));
        await Promise.allSettled(promises);
    }
    // Subscribe to specific event type
    subscribe(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }
        this.handlers.get(eventType).add(handler);
        console.log(`[EventBus] Handler subscribed to event type: ${eventType}`);
    }
    // Unsubscribe from specific event type
    unsubscribe(eventType, handler) {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.handlers.delete(eventType);
            }
        }
    }
    // Subscribe to all events
    subscribeToAll(handler) {
        this.on('event', async (event) => {
            await this.safeHandleEvent(handler, event);
        });
    }
    // Legacy method for backward compatibility
    publishLegacy(eventType, payload, source) {
        const event = {
            id: (0, uuid_1.v4)(),
            type: eventType,
            timestamp: new Date(),
            source,
            version: '1.0',
            data: payload
        };
        this.publish(event).catch(error => {
            console.error('[EventBus] Error in legacy publish:', error);
        });
    }
    // Get event history
    getEventHistory(eventType, limit = 100) {
        let events = this.eventStore;
        if (eventType) {
            events = events.filter(event => event.type === eventType);
        }
        return events
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
    // Get events by correlation ID
    getEventsByCorrelation(correlationId) {
        return this.eventStore.filter(event => event.correlationId === correlationId);
    }
    // Get events by user ID
    getEventsByUser(userId) {
        return this.eventStore.filter(event => event.userId === userId);
    }
    // Get events by hackathon ID
    getEventsByHackathon(hackathonId) {
        return this.eventStore.filter(event => event.hackathonId === hackathonId);
    }
    // Get events by team ID
    getEventsByTeam(teamId) {
        return this.eventStore.filter(event => event.teamId === teamId);
    }
    // Clear event history
    clearEventHistory() {
        this.eventStore = [];
    }
    // Get statistics
    getStatistics() {
        const eventsByType = {};
        this.eventStore.forEach(event => {
            eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
        });
        // Calculate events in last minute
        const oneMinuteAgo = new Date(Date.now() - 60000);
        const recentEvents = this.eventStore.filter(event => event.timestamp > oneMinuteAgo);
        // Count total handlers
        let handlerCount = 0;
        this.handlers.forEach(handlerSet => {
            handlerCount += handlerSet.size;
        });
        return {
            totalEvents: this.eventStore.length,
            eventsByType,
            recentEventRate: recentEvents.length,
            handlerCount
        };
    }
    // Get event types
    getEventTypes() {
        return Array.from(this.handlers.keys());
    }
    // Get listener count for specific event type
    getListenerCount(eventType) {
        const handlers = this.handlers.get(eventType);
        return handlers ? handlers.size : 0;
    }
    // Private methods
    storeEvent(event) {
        this.eventStore.push(event);
        // Trim old events if we exceed max storage
        if (this.eventStore.length > this.maxStoredEvents) {
            this.eventStore = this.eventStore.slice(-this.maxStoredEvents);
        }
    }
    async safeHandleEvent(handler, event) {
        try {
            await handler.handle(event);
        }
        catch (error) {
            console.error(`[EventBus] Error in event handler for ${event.type}:`, error);
            // Publish error event
            const errorEvent = {
                id: (0, uuid_1.v4)(),
                type: eventTypes_1.EventType.SYSTEM_ERROR,
                timestamp: new Date(),
                source: 'EventBus',
                version: '1.0',
                data: {
                    error: error.message,
                    originalEvent: event,
                    handlerName: handler.constructor.name
                }
            };
            // Avoid infinite recursion by not awaiting this publish
            this.publish(errorEvent).catch(err => {
                console.error('[EventBus] Failed to publish error event:', err);
            });
        }
    }
}
exports.EventBus = EventBus;
// Singleton instance
exports.eventBus = EventBus.getInstance();
// Event handler base class
class BaseEventHandler {
}
exports.BaseEventHandler = BaseEventHandler;
// Utility functions for creating events
function createUserEvent(type, userId, data, options = {}) {
    return {
        id: (0, uuid_1.v4)(),
        type,
        timestamp: new Date(),
        source: 'UserService',
        version: '1.0',
        userId,
        data,
        ...options
    };
}
function createTeamEvent(type, teamId, data, options = {}) {
    return {
        id: (0, uuid_1.v4)(),
        type,
        timestamp: new Date(),
        source: 'TeamService',
        version: '1.0',
        teamId,
        data,
        ...options
    };
}
function createAgentEvent(type, agentId, data, options = {}) {
    return {
        id: (0, uuid_1.v4)(),
        type,
        timestamp: new Date(),
        source: 'AgentManager',
        version: '1.0',
        data: { agentId, ...data },
        ...options
    };
}
// Legacy exports for backward compatibility
exports.EventTypes = {
    USER_REGISTERED: eventTypes_1.EventType.USER_REGISTERED,
    USER_UPDATED: eventTypes_1.EventType.USER_PROFILE_UPDATED,
    TEAM_CREATED: eventTypes_1.EventType.TEAM_CREATED,
    TEAM_MEMBER_ADDED: eventTypes_1.EventType.TEAM_MEMBER_ADDED,
    RESUME_UPLOADED: eventTypes_1.EventType.RESUME_UPLOADED,
    RESUME_PARSED: eventTypes_1.EventType.RESUME_PARSED,
    AGENT_TASK_STARTED: eventTypes_1.EventType.AGENT_TASK_STARTED,
    AGENT_TASK_COMPLETED: eventTypes_1.EventType.AGENT_TASK_COMPLETED,
    SESSION_STARTED: eventTypes_1.EventType.SESSION_STARTED,
    SESSION_ENDED: eventTypes_1.EventType.SESSION_ENDED,
    SYSTEM_ERROR: eventTypes_1.EventType.SYSTEM_ERROR
};
const publishEvent = (eventType, payload, source) => {
    exports.eventBus.publishLegacy(eventType, payload, source);
};
exports.publishEvent = publishEvent;
const subscribeToEvent = (eventType, handler) => {
    exports.eventBus.on(eventType, handler);
};
exports.subscribeToEvent = subscribeToEvent;
exports.default = exports.eventBus;
//# sourceMappingURL=eventBus.js.map
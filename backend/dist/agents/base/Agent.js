"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const events_1 = require("events");
const eventBus_1 = require("../../shared/events/eventBus");
class Agent extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.isRunning = false;
        this.processedEvents = new Map();
        this.config = config;
        this.setupEventListeners();
    }
    setupEventListeners() {
        if (!this.config.enabled) {
            console.log(`[Agent] ${this.config.name} is disabled`);
            return;
        }
        this.config.subscribeToEvents.forEach(eventType => {
            eventBus_1.eventBus.subscribe(eventType, this.handleEvent.bind(this));
        });
        console.log(`[Agent] ${this.config.name} initialized and listening to ${this.config.subscribeToEvents.length} event types`);
    }
    async handleEvent(event) {
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
        }
        catch (error) {
            console.error(`[Agent] ${this.config.name} error processing event ${event.type}:`, error);
            this.emit('error', { agent: this.config.name, event, error });
            // Publish error event
            eventBus_1.eventBus.publish('system.error', {
                agent: this.config.name,
                event: event.type,
                error: error instanceof Error ? error.message : 'Unknown error'
            }, this.config.name);
        }
    }
    publishEvent(eventType, payload) {
        if (!this.config.publishEvents.includes(eventType)) {
            console.warn(`[Agent] ${this.config.name} attempted to publish unauthorized event: ${eventType}`);
            return;
        }
        eventBus_1.eventBus.publish(eventType, payload, this.config.name);
    }
    start() {
        if (this.isRunning) {
            console.log(`[Agent] ${this.config.name} is already running`);
            return;
        }
        this.isRunning = true;
        console.log(`[Agent] ${this.config.name} started`);
        this.onStart();
    }
    stop() {
        if (!this.isRunning) {
            console.log(`[Agent] ${this.config.name} is already stopped`);
            return;
        }
        this.isRunning = false;
        console.log(`[Agent] ${this.config.name} stopped`);
        this.onStop();
    }
    getStatus() {
        return {
            name: this.config.name,
            description: this.config.description,
            isRunning: this.isRunning,
            subscribeToEvents: this.config.subscribeToEvents,
            publishEvents: this.config.publishEvents,
            processedEventsCount: this.processedEvents.size
        };
    }
    // Utility methods for common operations
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    validateEventPayload(event, requiredFields) {
        if (!event.payload) {
            return false;
        }
        return requiredFields.every(field => event.payload.hasOwnProperty(field));
    }
    logInfo(message, data) {
        console.log(`[Agent] ${this.config.name}: ${message}`, data || '');
    }
    logError(message, error) {
        console.error(`[Agent] ${this.config.name}: ${message}`, error || '');
    }
}
exports.Agent = Agent;
exports.default = Agent;
//# sourceMappingURL=Agent.js.map
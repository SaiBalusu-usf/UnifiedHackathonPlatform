import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { EventType, PlatformEvent, EventHandler, EventPublisher, EventSubscriber } from './eventTypes'

export class EventBus extends EventEmitter implements EventPublisher, EventSubscriber {
  private static instance: EventBus
  private handlers: Map<EventType, Set<EventHandler>> = new Map()
  private eventStore: PlatformEvent[] = []
  private maxStoredEvents = 10000

  private constructor() {
    super()
    this.setMaxListeners(100) // Increase max listeners for high-throughput scenarios
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  // Publish a single event
  async publish(event: PlatformEvent): Promise<void> {
    try {
      // Ensure event has required fields
      if (!event.id) {
        event.id = uuidv4()
      }
      if (!event.timestamp) {
        event.timestamp = new Date()
      }
      if (!event.version) {
        event.version = '1.0'
      }

      // Store event for replay/debugging
      this.storeEvent(event)

      // Emit to EventEmitter listeners (for WebSocket broadcasting)
      this.emit('event', event)
      this.emit(event.type, event)

      // Call registered handlers
      const handlers = this.handlers.get(event.type)
      if (handlers) {
        const promises = Array.from(handlers).map(handler => 
          this.safeHandleEvent(handler, event)
        )
        await Promise.allSettled(promises)
      }

      console.log(`[EventBus] Event published: ${event.type}`, {
        id: event.id,
        timestamp: event.timestamp,
        source: event.source
      })
    } catch (error) {
      console.error('[EventBus] Error publishing event:', error)
      throw error
    }
  }

  // Publish multiple events in batch
  async publishBatch(events: PlatformEvent[]): Promise<void> {
    const promises = events.map(event => this.publish(event))
    await Promise.allSettled(promises)
  }

  // Subscribe to specific event type
  subscribe(eventType: EventType, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)
    
    console.log(`[EventBus] Handler subscribed to event type: ${eventType}`)
  }

  // Unsubscribe from specific event type
  unsubscribe(eventType: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.handlers.delete(eventType)
      }
    }
  }

  // Subscribe to all events
  subscribeToAll(handler: EventHandler): void {
    this.on('event', async (event: PlatformEvent) => {
      await this.safeHandleEvent(handler, event)
    })
  }

  // Legacy method for backward compatibility
  public publishLegacy(eventType: string, payload: any, source: string): void {
    const event: PlatformEvent = {
      id: uuidv4(),
      type: eventType as EventType,
      timestamp: new Date(),
      source,
      version: '1.0',
      data: payload
    }
    
    this.publish(event).catch(error => {
      console.error('[EventBus] Error in legacy publish:', error)
    })
  }

  // Get event history
  getEventHistory(eventType?: EventType, limit: number = 100): PlatformEvent[] {
    let events = this.eventStore
    
    if (eventType) {
      events = events.filter(event => event.type === eventType)
    }
    
    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  // Get events by correlation ID
  getEventsByCorrelation(correlationId: string): PlatformEvent[] {
    return this.eventStore.filter(event => event.correlationId === correlationId)
  }

  // Get events by user ID
  getEventsByUser(userId: string): PlatformEvent[] {
    return this.eventStore.filter(event => event.userId === userId)
  }

  // Get events by hackathon ID
  getEventsByHackathon(hackathonId: string): PlatformEvent[] {
    return this.eventStore.filter(event => event.hackathonId === hackathonId)
  }

  // Get events by team ID
  getEventsByTeam(teamId: string): PlatformEvent[] {
    return this.eventStore.filter(event => event.teamId === teamId)
  }

  // Clear event history
  clearEventHistory(): void {
    this.eventStore = []
  }

  // Get statistics
  getStatistics(): {
    totalEvents: number
    eventsByType: Record<string, number>
    recentEventRate: number
    handlerCount: number
  } {
    const eventsByType: Record<string, number> = {}
    
    this.eventStore.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
    })

    // Calculate events in last minute
    const oneMinuteAgo = new Date(Date.now() - 60000)
    const recentEvents = this.eventStore.filter(event => event.timestamp > oneMinuteAgo)

    // Count total handlers
    let handlerCount = 0
    this.handlers.forEach(handlerSet => {
      handlerCount += handlerSet.size
    })

    return {
      totalEvents: this.eventStore.length,
      eventsByType,
      recentEventRate: recentEvents.length,
      handlerCount
    }
  }

  // Get event types
  getEventTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  // Get listener count for specific event type
  getListenerCount(eventType: EventType): number {
    const handlers = this.handlers.get(eventType)
    return handlers ? handlers.size : 0
  }

  // Private methods
  private storeEvent(event: PlatformEvent): void {
    this.eventStore.push(event)
    
    // Trim old events if we exceed max storage
    if (this.eventStore.length > this.maxStoredEvents) {
      this.eventStore = this.eventStore.slice(-this.maxStoredEvents)
    }
  }

  private async safeHandleEvent(handler: EventHandler, event: PlatformEvent): Promise<void> {
    try {
      await handler.handle(event)
    } catch (error) {
      console.error(`[EventBus] Error in event handler for ${event.type}:`, error)
      
      // Publish error event
      const errorEvent: PlatformEvent = {
        id: uuidv4(),
        type: EventType.SYSTEM_ERROR,
        timestamp: new Date(),
        source: 'EventBus',
        version: '1.0',
        data: {
          error: error.message,
          originalEvent: event,
          handlerName: handler.constructor.name
        }
      }
      
      // Avoid infinite recursion by not awaiting this publish
      this.publish(errorEvent).catch(err => {
        console.error('[EventBus] Failed to publish error event:', err)
      })
    }
  }
}

// Singleton instance
export const eventBus = EventBus.getInstance()

// Event handler base class
export abstract class BaseEventHandler<T extends PlatformEvent = PlatformEvent> implements EventHandler<T> {
  abstract handle(event: T): Promise<void>
}

// Utility functions for creating events
export function createUserEvent(
  type: EventType,
  userId: string,
  data: any,
  options: Partial<PlatformEvent> = {}
): PlatformEvent {
  return {
    id: uuidv4(),
    type,
    timestamp: new Date(),
    source: 'UserService',
    version: '1.0',
    userId,
    data,
    ...options
  } as PlatformEvent
}

export function createTeamEvent(
  type: EventType,
  teamId: string,
  data: any,
  options: Partial<PlatformEvent> = {}
): PlatformEvent {
  return {
    id: uuidv4(),
    type,
    timestamp: new Date(),
    source: 'TeamService',
    version: '1.0',
    teamId,
    data,
    ...options
  } as PlatformEvent
}

export function createAgentEvent(
  type: EventType,
  agentId: string,
  data: any,
  options: Partial<PlatformEvent> = {}
): PlatformEvent {
  return {
    id: uuidv4(),
    type,
    timestamp: new Date(),
    source: 'AgentManager',
    version: '1.0',
    data: { agentId, ...data },
    ...options
  } as PlatformEvent
}

// Legacy exports for backward compatibility
export const EventTypes = {
  USER_REGISTERED: EventType.USER_REGISTERED,
  USER_UPDATED: EventType.USER_PROFILE_UPDATED,
  TEAM_CREATED: EventType.TEAM_CREATED,
  TEAM_MEMBER_ADDED: EventType.TEAM_MEMBER_ADDED,
  RESUME_UPLOADED: EventType.RESUME_UPLOADED,
  RESUME_PARSED: EventType.RESUME_PARSED,
  AGENT_TASK_STARTED: EventType.AGENT_TASK_STARTED,
  AGENT_TASK_COMPLETED: EventType.AGENT_TASK_COMPLETED,
  SESSION_STARTED: EventType.SESSION_STARTED,
  SESSION_ENDED: EventType.SESSION_ENDED,
  SYSTEM_ERROR: EventType.SYSTEM_ERROR
} as const

export const publishEvent = (eventType: string, payload: any, source: string): void => {
  eventBus.publishLegacy(eventType, payload, source)
}

export const subscribeToEvent = (eventType: string, handler: (event: any) => void): void => {
  eventBus.on(eventType, handler)
}

export default eventBus


// Event types for the hackathon platform
export enum EventType {
  // User events
  USER_REGISTERED = 'user_registered',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_PROFILE_UPDATED = 'user_profile_updated',
  USER_LOCATION_UPDATED = 'user_location_updated',
  USER_STATUS_CHANGED = 'user_status_changed',

  // Team events
  TEAM_CREATED = 'team_created',
  TEAM_UPDATED = 'team_updated',
  TEAM_DELETED = 'team_deleted',
  TEAM_MEMBER_ADDED = 'team_member_added',
  TEAM_MEMBER_REMOVED = 'team_member_removed',
  TEAM_MEMBER_ROLE_CHANGED = 'team_member_role_changed',
  TEAM_INVITATION_SENT = 'team_invitation_sent',
  TEAM_INVITATION_ACCEPTED = 'team_invitation_accepted',
  TEAM_INVITATION_DECLINED = 'team_invitation_declined',

  // Hackathon events
  HACKATHON_CREATED = 'hackathon_created',
  HACKATHON_UPDATED = 'hackathon_updated',
  HACKATHON_STARTED = 'hackathon_started',
  HACKATHON_ENDED = 'hackathon_ended',
  HACKATHON_REGISTRATION_OPENED = 'hackathon_registration_opened',
  HACKATHON_REGISTRATION_CLOSED = 'hackathon_registration_closed',
  USER_REGISTERED_FOR_HACKATHON = 'user_registered_for_hackathon',
  USER_UNREGISTERED_FROM_HACKATHON = 'user_unregistered_from_hackathon',

  // Resume and AI events
  RESUME_UPLOADED = 'resume_uploaded',
  RESUME_PARSED = 'resume_parsed',
  RESUME_PARSING_FAILED = 'resume_parsing_failed',
  RESUME_ANALYSIS_COMPLETED = 'resume_analysis_completed',
  SKILL_MATCH_FOUND = 'skill_match_found',
  TEAM_SUGGESTION_GENERATED = 'team_suggestion_generated',
  TEAM_SUGGESTION_REQUESTED = 'team_suggestion_requested',
  TEAM_SUGGESTIONS_GENERATED = 'team_suggestions_generated',

  // Agent events
  AGENT_STARTED = 'agent_started',
  AGENT_STOPPED = 'agent_stopped',
  AGENT_ERROR = 'agent_error',
  AGENT_TASK_STARTED = 'agent_task_started',
  AGENT_TASK_COMPLETED = 'agent_task_completed',
  AGENT_TASK_FAILED = 'agent_task_failed',
  AGENT_HEALTH_CHECK = 'agent_health_check',

  // Tracking events
  SESSION_STARTED = 'session_started',
  SESSION_PAUSED = 'session_paused',
  SESSION_RESUMED = 'session_resumed',
  SESSION_ENDED = 'session_ended',
  LOCATION_SHARED = 'location_shared',
  LOCATION_STOPPED = 'location_stopped',
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',

  // Communication events
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  NOTIFICATION_SENT = 'notification_sent',
  TYPING_STARTED = 'typing_started',
  TYPING_STOPPED = 'typing_stopped',

  // System events
  SYSTEM_MAINTENANCE_START = 'system_maintenance_start',
  SYSTEM_MAINTENANCE_END = 'system_maintenance_end',
  SYSTEM_ERROR = 'system_error',
  SYSTEM_HEALTH_CHECK = 'system_health_check'
}

// Base event interface
export interface BaseEvent {
  id: string
  type: EventType
  timestamp: Date
  source: string
  version: string
  correlationId?: string
  userId?: string
  hackathonId?: string
  teamId?: string
}

// User events
export interface UserRegisteredEvent extends BaseEvent {
  type: EventType.USER_REGISTERED
  data: {
    userId: string
    email: string
    firstName: string
    lastName: string
    username: string
  }
}

export interface UserLocationUpdatedEvent extends BaseEvent {
  type: EventType.USER_LOCATION_UPDATED
  data: {
    userId: string
    hackathonId: string
    location: {
      latitude: number
      longitude: number
      accuracy?: number
      timestamp: string
    }
  }
}

// Team events
export interface TeamCreatedEvent extends BaseEvent {
  type: EventType.TEAM_CREATED
  data: {
    teamId: string
    name: string
    description: string
    hackathonId: string
    leaderId: string
    maxMembers: number
  }
}

export interface TeamMemberAddedEvent extends BaseEvent {
  type: EventType.TEAM_MEMBER_ADDED
  data: {
    teamId: string
    userId: string
    role: string
    addedBy: string
  }
}

// Resume events
export interface ResumeUploadedEvent extends BaseEvent {
  type: EventType.RESUME_UPLOADED
  data: {
    resumeId: string
    userId: string
    filename: string
    fileSize: number
    mimeType: string
  }
}

export interface ResumeParsedEvent extends BaseEvent {
  type: EventType.RESUME_PARSED
  data: {
    resumeId: string
    userId: string
    extractedData: {
      skills: string[]
      experience: any[]
      education: any[]
      projects: any[]
      summary: string
    }
    confidence: number
  }
}

// Agent events
export interface AgentTaskStartedEvent extends BaseEvent {
  type: EventType.AGENT_TASK_STARTED
  data: {
    agentId: string
    agentType: string
    taskId: string
    taskType: string
    parameters: any
  }
}

export interface AgentTaskCompletedEvent extends BaseEvent {
  type: EventType.AGENT_TASK_COMPLETED
  data: {
    agentId: string
    agentType: string
    taskId: string
    taskType: string
    result: any
    processingTime: number
  }
}

// Session events
export interface SessionStartedEvent extends BaseEvent {
  type: EventType.SESSION_STARTED
  data: {
    sessionId: string
    userId: string
    hackathonId?: string
    teamId?: string
    startTime: string
  }
}

export interface SessionEndedEvent extends BaseEvent {
  type: EventType.SESSION_ENDED
  data: {
    sessionId: string
    userId: string
    duration: number
    productivity: number
    goalsCompleted: number
  }
}

// Notification events
export interface NotificationSentEvent extends BaseEvent {
  type: EventType.NOTIFICATION_SENT
  data: {
    notificationId: string
    recipientId: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    channel: 'websocket' | 'email' | 'push'
  }
}

// Union type for all events
export type PlatformEvent = 
  | UserRegisteredEvent
  | UserLocationUpdatedEvent
  | TeamCreatedEvent
  | TeamMemberAddedEvent
  | ResumeUploadedEvent
  | ResumeParsedEvent
  | AgentTaskStartedEvent
  | AgentTaskCompletedEvent
  | SessionStartedEvent
  | SessionEndedEvent
  | NotificationSentEvent
  | BaseEvent

// Event handler interface
export interface EventHandler<T extends BaseEvent = BaseEvent> {
  handle(event: T): Promise<void>
}

// Event publisher interface
export interface EventPublisher {
  publish(event: PlatformEvent): Promise<void>
  publishBatch(events: PlatformEvent[]): Promise<void>
}

// Event subscriber interface
export interface EventSubscriber {
  subscribe(eventType: EventType, handler: EventHandler): void
  unsubscribe(eventType: EventType, handler: EventHandler): void
}

// Event store interface
export interface EventStore {
  save(event: PlatformEvent): Promise<void>
  getEvents(aggregateId: string, fromVersion?: number): Promise<PlatformEvent[]>
  getEventsByType(eventType: EventType, limit?: number): Promise<PlatformEvent[]>
}


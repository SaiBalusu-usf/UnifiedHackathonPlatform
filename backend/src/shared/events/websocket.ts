import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { eventBus } from './eventBus'
import { EventType, PlatformEvent } from './eventTypes'

interface AuthenticatedSocket extends Socket {
  userId?: string
  user?: any
}

interface UserLocation {
  userId: string
  hackathonId: string
  location: {
    latitude: number
    longitude: number
    accuracy?: number
    timestamp: string
  }
  lastUpdate: Date
}

interface UserSession {
  userId: string
  socketId: string
  hackathonId?: string
  teamId?: string
  joinedAt: Date
  lastActivity: Date
  status: 'online' | 'away' | 'busy'
}

export class WebSocketServer {
  private io: SocketIOServer
  private userSessions: Map<string, UserSession> = new Map()
  private userLocations: Map<string, UserLocation> = new Map()
  private hackathonRooms: Map<string, Set<string>> = new Map()
  private teamRooms: Map<string, Set<string>> = new Map()

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    })

    this.setupMiddleware()
    this.setupEventHandlers()
    this.setupEventBusIntegration()
    this.startCleanupInterval()

    console.log('[WebSocket] Server initialized')
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]
        if (!token) {
          return next(new Error('Authentication token required'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
        socket.userId = decoded.userId
        socket.user = decoded

        console.log(`[WebSocket] User ${decoded.userId} authenticated`)
        next()
      } catch (error) {
        console.error('[WebSocket] Authentication failed:', error)
        next(new Error('Authentication failed'))
      }
    })
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`[WebSocket] User ${socket.userId} connected with socket ${socket.id}`)

      // Create user session
      const session: UserSession = {
        userId: socket.userId!,
        socketId: socket.id,
        joinedAt: new Date(),
        lastActivity: new Date(),
        status: 'online'
      }
      this.userSessions.set(socket.userId!, session)

      // Join user-specific room
      socket.join(`user:${socket.userId}`)

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to Unified Hackathon Platform real-time server',
        userId: socket.userId,
        timestamp: new Date()
      })

      // Handle hackathon room joining
      socket.on('join-hackathon', (hackathonId: string) => {
        this.joinHackathonRoom(socket, hackathonId)
      })

      socket.on('leave-hackathon', (hackathonId: string) => {
        this.leaveHackathonRoom(socket, hackathonId)
      })

      // Handle team room joining
      socket.on('join-team', (teamId: string) => {
        this.joinTeamRoom(socket, teamId)
      })

      socket.on('leave-team', (teamId: string) => {
        this.leaveTeamRoom(socket, teamId)
      })

      // Handle location updates
      socket.on('location-update', (data: { hackathonId: string, location: any }) => {
        this.handleLocationUpdate(socket, data)
      })

      // Handle typing indicators
      socket.on('typing-start', (teamId: string) => {
        socket.to(`team:${teamId}`).emit('user-typing', {
          userId: socket.userId,
          teamId,
          typing: true
        })
      })

      socket.on('typing-stop', (teamId: string) => {
        socket.to(`team:${teamId}`).emit('user-typing', {
          userId: socket.userId,
          teamId,
          typing: false
        })
      })

      // Handle status changes
      socket.on('status-change', (status: 'online' | 'away' | 'busy') => {
        this.updateUserStatus(socket, status)
      })

      // Handle messages
      socket.on('send-message', (data: { teamId: string, message: string }) => {
        this.handleMessage(socket, data)
      })

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`[WebSocket] User ${socket.userId} disconnected: ${reason}`)
        this.handleDisconnection(socket)
      })

      // Update last activity on any event
      socket.onAny(() => {
        this.updateLastActivity(socket.userId!)
      })
    })
  }

  private setupEventBusIntegration(): void {
    // Subscribe to all events and broadcast relevant ones
    eventBus.subscribeToAll({
      handle: async (event: PlatformEvent) => {
        await this.handleEventBroadcast(event)
      }
    })

    console.log('[WebSocket] Event bus integration setup complete')
  }

  private async handleEventBroadcast(event: PlatformEvent): Promise<void> {
    try {
      switch (event.type) {
        case EventType.TEAM_CREATED:
        case EventType.TEAM_UPDATED:
        case EventType.TEAM_DELETED:
          if (event.hackathonId) {
            this.io.to(`hackathon:${event.hackathonId}`).emit('team-event', event)
          }
          break

        case EventType.TEAM_MEMBER_ADDED:
        case EventType.TEAM_MEMBER_REMOVED:
          if (event.teamId) {
            this.io.to(`team:${event.teamId}`).emit('team-member-event', event)
          }
          break

        case EventType.USER_LOCATION_UPDATED:
          if (event.hackathonId) {
            this.io.to(`hackathon:${event.hackathonId}`).emit('location-update', event)
          }
          break

        case EventType.RESUME_PARSED:
          if (event.userId) {
            const userSocket = this.getUserSocket(event.userId)
            if (userSocket) {
              userSocket.emit('resume-parsed', event)
            }
          }
          break

        case EventType.SKILL_MATCH_FOUND:
          if (event.userId) {
            const userSocket = this.getUserSocket(event.userId)
            if (userSocket) {
              userSocket.emit('skill-match', event)
            }
          }
          break

        case EventType.HACKATHON_STARTED:
        case EventType.HACKATHON_ENDED:
          if (event.hackathonId) {
            this.io.to(`hackathon:${event.hackathonId}`).emit('hackathon-event', event)
          }
          break

        case EventType.NOTIFICATION_SENT:
          if (event.data?.recipientId) {
            const userSocket = this.getUserSocket(event.data.recipientId)
            if (userSocket) {
              userSocket.emit('notification', event)
            }
          }
          break

        case EventType.AGENT_TASK_COMPLETED:
        case EventType.AGENT_ERROR:
          // Broadcast agent events to admin users or relevant users
          this.io.emit('agent-event', event)
          break
      }
    } catch (error) {
      console.error('[WebSocket] Error broadcasting event:', error)
    }
  }

  private joinHackathonRoom(socket: AuthenticatedSocket, hackathonId: string): void {
    socket.join(`hackathon:${hackathonId}`)
    
    // Update user session
    const session = this.userSessions.get(socket.userId!)
    if (session) {
      session.hackathonId = hackathonId
    }

    // Track hackathon room membership
    if (!this.hackathonRooms.has(hackathonId)) {
      this.hackathonRooms.set(hackathonId, new Set())
    }
    this.hackathonRooms.get(hackathonId)!.add(socket.userId!)

    console.log(`[WebSocket] User ${socket.userId} joined hackathon ${hackathonId}`)
    
    // Notify others in the hackathon
    socket.to(`hackathon:${hackathonId}`).emit('user-joined-hackathon', {
      userId: socket.userId,
      hackathonId,
      timestamp: new Date()
    })
  }

  private leaveHackathonRoom(socket: AuthenticatedSocket, hackathonId: string): void {
    socket.leave(`hackathon:${hackathonId}`)
    
    // Update user session
    const session = this.userSessions.get(socket.userId!)
    if (session && session.hackathonId === hackathonId) {
      session.hackathonId = undefined
    }

    // Remove from hackathon room tracking
    const room = this.hackathonRooms.get(hackathonId)
    if (room) {
      room.delete(socket.userId!)
      if (room.size === 0) {
        this.hackathonRooms.delete(hackathonId)
      }
    }

    console.log(`[WebSocket] User ${socket.userId} left hackathon ${hackathonId}`)
  }

  private joinTeamRoom(socket: AuthenticatedSocket, teamId: string): void {
    socket.join(`team:${teamId}`)
    
    // Update user session
    const session = this.userSessions.get(socket.userId!)
    if (session) {
      session.teamId = teamId
    }

    // Track team room membership
    if (!this.teamRooms.has(teamId)) {
      this.teamRooms.set(teamId, new Set())
    }
    this.teamRooms.get(teamId)!.add(socket.userId!)

    console.log(`[WebSocket] User ${socket.userId} joined team ${teamId}`)
    
    // Notify team members
    socket.to(`team:${teamId}`).emit('user-joined-team', {
      userId: socket.userId,
      teamId,
      timestamp: new Date()
    })
  }

  private leaveTeamRoom(socket: AuthenticatedSocket, teamId: string): void {
    socket.leave(`team:${teamId}`)
    
    // Update user session
    const session = this.userSessions.get(socket.userId!)
    if (session && session.teamId === teamId) {
      session.teamId = undefined
    }

    // Remove from team room tracking
    const room = this.teamRooms.get(teamId)
    if (room) {
      room.delete(socket.userId!)
      if (room.size === 0) {
        this.teamRooms.delete(teamId)
      }
    }

    console.log(`[WebSocket] User ${socket.userId} left team ${teamId}`)
  }

  private handleLocationUpdate(socket: AuthenticatedSocket, data: { hackathonId: string, location: any }): void {
    const locationData: UserLocation = {
      userId: socket.userId!,
      hackathonId: data.hackathonId,
      location: data.location,
      lastUpdate: new Date()
    }

    this.userLocations.set(socket.userId!, locationData)

    // Publish location update event
    eventBus.publish({
      id: uuidv4(),
      type: EventType.USER_LOCATION_UPDATED,
      timestamp: new Date(),
      source: 'WebSocketServer',
      version: '1.0',
      userId: socket.userId,
      hackathonId: data.hackathonId,
      data: locationData
    })

    console.log(`[WebSocket] Location updated for user ${socket.userId}`)
  }

  private updateUserStatus(socket: AuthenticatedSocket, status: 'online' | 'away' | 'busy'): void {
    const session = this.userSessions.get(socket.userId!)
    if (session) {
      session.status = status
      session.lastActivity = new Date()

      // Broadcast status change to relevant rooms
      if (session.hackathonId) {
        socket.to(`hackathon:${session.hackathonId}`).emit('user-status-change', {
          userId: socket.userId,
          status,
          timestamp: new Date()
        })
      }
    }
  }

  private handleMessage(socket: AuthenticatedSocket, data: { teamId: string, message: string }): void {
    const messageData = {
      id: uuidv4(),
      userId: socket.userId,
      teamId: data.teamId,
      message: data.message,
      timestamp: new Date()
    }

    // Broadcast to team members
    this.io.to(`team:${data.teamId}`).emit('message', messageData)

    // Publish message event
    eventBus.publish({
      id: uuidv4(),
      type: EventType.MESSAGE_SENT,
      timestamp: new Date(),
      source: 'WebSocketServer',
      version: '1.0',
      userId: socket.userId,
      teamId: data.teamId,
      data: messageData
    })
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    // Remove user session
    this.userSessions.delete(socket.userId!)
    
    // Remove from location tracking
    this.userLocations.delete(socket.userId!)
    
    // Remove from room tracking
    this.hackathonRooms.forEach((users, hackathonId) => {
      users.delete(socket.userId!)
      if (users.size === 0) {
        this.hackathonRooms.delete(hackathonId)
      }
    })
    
    this.teamRooms.forEach((users, teamId) => {
      users.delete(socket.userId!)
      if (users.size === 0) {
        this.teamRooms.delete(teamId)
      }
    })
  }

  private updateLastActivity(userId: string): void {
    const session = this.userSessions.get(userId)
    if (session) {
      session.lastActivity = new Date()
    }
  }

  private getUserSocket(userId: string): AuthenticatedSocket | null {
    const session = this.userSessions.get(userId)
    if (session) {
      return this.io.sockets.sockets.get(session.socketId) as AuthenticatedSocket || null
    }
    return null
  }

  private startCleanupInterval(): void {
    // Clean up inactive sessions every 5 minutes
    setInterval(() => {
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

      this.userSessions.forEach((session, userId) => {
        if (session.lastActivity < fiveMinutesAgo) {
          console.log(`[WebSocket] Cleaning up inactive session for user ${userId}`)
          this.userSessions.delete(userId)
          this.userLocations.delete(userId)
        }
      })
    }, 5 * 60 * 1000)
  }

  // Public methods for external access
  public getConnectedUsers(): string[] {
    return Array.from(this.userSessions.keys())
  }

  public getUsersInHackathon(hackathonId: string): string[] {
    return Array.from(this.hackathonRooms.get(hackathonId) || [])
  }

  public getUsersInTeam(teamId: string): string[] {
    return Array.from(this.teamRooms.get(teamId) || [])
  }

  public getUserLocations(hackathonId?: string): UserLocation[] {
    const locations = Array.from(this.userLocations.values())
    return hackathonId 
      ? locations.filter(loc => loc.hackathonId === hackathonId)
      : locations
  }

  public getStatistics(): {
    connectedUsers: number
    activeHackathons: number
    activeTeams: number
    totalLocations: number
  } {
    return {
      connectedUsers: this.userSessions.size,
      activeHackathons: this.hackathonRooms.size,
      activeTeams: this.teamRooms.size,
      totalLocations: this.userLocations.size
    }
  }

  public sendNotificationToUser(userId: string, notification: any): void {
    const userSocket = this.getUserSocket(userId)
    if (userSocket) {
      userSocket.emit('notification', notification)
    }
  }

  public broadcastToHackathon(hackathonId: string, event: string, data: any): void {
    this.io.to(`hackathon:${hackathonId}`).emit(event, data)
  }

  public broadcastToTeam(teamId: string, event: string, data: any): void {
    this.io.to(`team:${teamId}`).emit(event, data)
  }

  // Legacy methods for backward compatibility
  public sendToUser(userId: string, event: string, data: any): void {
    this.sendNotificationToUser(userId, { event, data })
  }

  public sendToTeam(teamId: string, event: string, data: any): void {
    this.broadcastToTeam(teamId, event, data)
  }

  public sendToHackathon(hackathonId: string, event: string, data: any): void {
    this.broadcastToHackathon(hackathonId, event, data)
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data)
  }

  public isUserConnected(userId: string): boolean {
    return this.userSessions.has(userId)
  }

  public getConnectedUserCount(): number {
    return this.userSessions.size
  }
}

export default WebSocketServer


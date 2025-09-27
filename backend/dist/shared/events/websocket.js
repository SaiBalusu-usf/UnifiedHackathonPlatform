"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const eventBus_1 = require("./eventBus");
const eventTypes_1 = require("./eventTypes");
class WebSocketServer {
    constructor(httpServer) {
        this.userSessions = new Map();
        this.userLocations = new Map();
        this.hackathonRooms = new Map();
        this.teamRooms = new Map();
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            transports: ['websocket', 'polling']
        });
        this.setupMiddleware();
        this.setupEventHandlers();
        this.setupEventBusIntegration();
        this.startCleanupInterval();
        console.log('[WebSocket] Server initialized');
    }
    setupMiddleware() {
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
                if (!token) {
                    return next(new Error('Authentication token required'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                socket.userId = decoded.userId;
                socket.user = decoded;
                console.log(`[WebSocket] User ${decoded.userId} authenticated`);
                next();
            }
            catch (error) {
                console.error('[WebSocket] Authentication failed:', error);
                next(new Error('Authentication failed'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`[WebSocket] User ${socket.userId} connected with socket ${socket.id}`);
            // Create user session
            const session = {
                userId: socket.userId,
                socketId: socket.id,
                joinedAt: new Date(),
                lastActivity: new Date(),
                status: 'online'
            };
            this.userSessions.set(socket.userId, session);
            // Join user-specific room
            socket.join(`user:${socket.userId}`);
            // Send welcome message
            socket.emit('connected', {
                message: 'Connected to HackMatch real-time server',
                userId: socket.userId,
                timestamp: new Date()
            });
            // Handle hackathon room joining
            socket.on('join-hackathon', (hackathonId) => {
                this.joinHackathonRoom(socket, hackathonId);
            });
            socket.on('leave-hackathon', (hackathonId) => {
                this.leaveHackathonRoom(socket, hackathonId);
            });
            // Handle team room joining
            socket.on('join-team', (teamId) => {
                this.joinTeamRoom(socket, teamId);
            });
            socket.on('leave-team', (teamId) => {
                this.leaveTeamRoom(socket, teamId);
            });
            // Handle location updates
            socket.on('location-update', (data) => {
                this.handleLocationUpdate(socket, data);
            });
            // Handle typing indicators
            socket.on('typing-start', (teamId) => {
                socket.to(`team:${teamId}`).emit('user-typing', {
                    userId: socket.userId,
                    teamId,
                    typing: true
                });
            });
            socket.on('typing-stop', (teamId) => {
                socket.to(`team:${teamId}`).emit('user-typing', {
                    userId: socket.userId,
                    teamId,
                    typing: false
                });
            });
            // Handle status changes
            socket.on('status-change', (status) => {
                this.updateUserStatus(socket, status);
            });
            // Handle messages
            socket.on('send-message', (data) => {
                this.handleMessage(socket, data);
            });
            // Handle disconnection
            socket.on('disconnect', (reason) => {
                console.log(`[WebSocket] User ${socket.userId} disconnected: ${reason}`);
                this.handleDisconnection(socket);
            });
            // Update last activity on any event
            socket.onAny(() => {
                this.updateLastActivity(socket.userId);
            });
        });
    }
    setupEventBusIntegration() {
        // Subscribe to all events and broadcast relevant ones
        eventBus_1.eventBus.subscribeToAll({
            handle: async (event) => {
                await this.handleEventBroadcast(event);
            }
        });
        console.log('[WebSocket] Event bus integration setup complete');
    }
    async handleEventBroadcast(event) {
        try {
            switch (event.type) {
                case eventTypes_1.EventType.TEAM_CREATED:
                case eventTypes_1.EventType.TEAM_UPDATED:
                case eventTypes_1.EventType.TEAM_DELETED:
                    if (event.hackathonId) {
                        this.io.to(`hackathon:${event.hackathonId}`).emit('team-event', event);
                    }
                    break;
                case eventTypes_1.EventType.TEAM_MEMBER_ADDED:
                case eventTypes_1.EventType.TEAM_MEMBER_REMOVED:
                    if (event.teamId) {
                        this.io.to(`team:${event.teamId}`).emit('team-member-event', event);
                    }
                    break;
                case eventTypes_1.EventType.USER_LOCATION_UPDATED:
                    if (event.hackathonId) {
                        this.io.to(`hackathon:${event.hackathonId}`).emit('location-update', event);
                    }
                    break;
                case eventTypes_1.EventType.RESUME_PARSED:
                    if (event.userId) {
                        const userSocket = this.getUserSocket(event.userId);
                        if (userSocket) {
                            userSocket.emit('resume-parsed', event);
                        }
                    }
                    break;
                case eventTypes_1.EventType.SKILL_MATCH_FOUND:
                    if (event.userId) {
                        const userSocket = this.getUserSocket(event.userId);
                        if (userSocket) {
                            userSocket.emit('skill-match', event);
                        }
                    }
                    break;
                case eventTypes_1.EventType.HACKATHON_STARTED:
                case eventTypes_1.EventType.HACKATHON_ENDED:
                    if (event.hackathonId) {
                        this.io.to(`hackathon:${event.hackathonId}`).emit('hackathon-event', event);
                    }
                    break;
                case eventTypes_1.EventType.NOTIFICATION_SENT:
                    if (event.data?.recipientId) {
                        const userSocket = this.getUserSocket(event.data.recipientId);
                        if (userSocket) {
                            userSocket.emit('notification', event);
                        }
                    }
                    break;
                case eventTypes_1.EventType.AGENT_TASK_COMPLETED:
                case eventTypes_1.EventType.AGENT_ERROR:
                    // Broadcast agent events to admin users or relevant users
                    this.io.emit('agent-event', event);
                    break;
            }
        }
        catch (error) {
            console.error('[WebSocket] Error broadcasting event:', error);
        }
    }
    joinHackathonRoom(socket, hackathonId) {
        socket.join(`hackathon:${hackathonId}`);
        // Update user session
        const session = this.userSessions.get(socket.userId);
        if (session) {
            session.hackathonId = hackathonId;
        }
        // Track hackathon room membership
        if (!this.hackathonRooms.has(hackathonId)) {
            this.hackathonRooms.set(hackathonId, new Set());
        }
        this.hackathonRooms.get(hackathonId).add(socket.userId);
        console.log(`[WebSocket] User ${socket.userId} joined hackathon ${hackathonId}`);
        // Notify others in the hackathon
        socket.to(`hackathon:${hackathonId}`).emit('user-joined-hackathon', {
            userId: socket.userId,
            hackathonId,
            timestamp: new Date()
        });
    }
    leaveHackathonRoom(socket, hackathonId) {
        socket.leave(`hackathon:${hackathonId}`);
        // Update user session
        const session = this.userSessions.get(socket.userId);
        if (session && session.hackathonId === hackathonId) {
            session.hackathonId = undefined;
        }
        // Remove from hackathon room tracking
        const room = this.hackathonRooms.get(hackathonId);
        if (room) {
            room.delete(socket.userId);
            if (room.size === 0) {
                this.hackathonRooms.delete(hackathonId);
            }
        }
        console.log(`[WebSocket] User ${socket.userId} left hackathon ${hackathonId}`);
    }
    joinTeamRoom(socket, teamId) {
        socket.join(`team:${teamId}`);
        // Update user session
        const session = this.userSessions.get(socket.userId);
        if (session) {
            session.teamId = teamId;
        }
        // Track team room membership
        if (!this.teamRooms.has(teamId)) {
            this.teamRooms.set(teamId, new Set());
        }
        this.teamRooms.get(teamId).add(socket.userId);
        console.log(`[WebSocket] User ${socket.userId} joined team ${teamId}`);
        // Notify team members
        socket.to(`team:${teamId}`).emit('user-joined-team', {
            userId: socket.userId,
            teamId,
            timestamp: new Date()
        });
    }
    leaveTeamRoom(socket, teamId) {
        socket.leave(`team:${teamId}`);
        // Update user session
        const session = this.userSessions.get(socket.userId);
        if (session && session.teamId === teamId) {
            session.teamId = undefined;
        }
        // Remove from team room tracking
        const room = this.teamRooms.get(teamId);
        if (room) {
            room.delete(socket.userId);
            if (room.size === 0) {
                this.teamRooms.delete(teamId);
            }
        }
        console.log(`[WebSocket] User ${socket.userId} left team ${teamId}`);
    }
    handleLocationUpdate(socket, data) {
        const locationData = {
            userId: socket.userId,
            hackathonId: data.hackathonId,
            location: data.location,
            lastUpdate: new Date()
        };
        this.userLocations.set(socket.userId, locationData);
        // Publish location update event
        eventBus_1.eventBus.publish({
            id: (0, uuid_1.v4)(),
            type: eventTypes_1.EventType.USER_LOCATION_UPDATED,
            timestamp: new Date(),
            source: 'WebSocketServer',
            version: '1.0',
            userId: socket.userId,
            hackathonId: data.hackathonId,
            data: locationData
        });
        console.log(`[WebSocket] Location updated for user ${socket.userId}`);
    }
    updateUserStatus(socket, status) {
        const session = this.userSessions.get(socket.userId);
        if (session) {
            session.status = status;
            session.lastActivity = new Date();
            // Broadcast status change to relevant rooms
            if (session.hackathonId) {
                socket.to(`hackathon:${session.hackathonId}`).emit('user-status-change', {
                    userId: socket.userId,
                    status,
                    timestamp: new Date()
                });
            }
        }
    }
    handleMessage(socket, data) {
        const messageData = {
            id: (0, uuid_1.v4)(),
            userId: socket.userId,
            teamId: data.teamId,
            message: data.message,
            timestamp: new Date()
        };
        // Broadcast to team members
        this.io.to(`team:${data.teamId}`).emit('message', messageData);
        // Publish message event
        eventBus_1.eventBus.publish({
            id: (0, uuid_1.v4)(),
            type: eventTypes_1.EventType.MESSAGE_SENT,
            timestamp: new Date(),
            source: 'WebSocketServer',
            version: '1.0',
            userId: socket.userId,
            teamId: data.teamId,
            data: messageData
        });
    }
    handleDisconnection(socket) {
        // Remove user session
        this.userSessions.delete(socket.userId);
        // Remove from location tracking
        this.userLocations.delete(socket.userId);
        // Remove from room tracking
        this.hackathonRooms.forEach((users, hackathonId) => {
            users.delete(socket.userId);
            if (users.size === 0) {
                this.hackathonRooms.delete(hackathonId);
            }
        });
        this.teamRooms.forEach((users, teamId) => {
            users.delete(socket.userId);
            if (users.size === 0) {
                this.teamRooms.delete(teamId);
            }
        });
    }
    updateLastActivity(userId) {
        const session = this.userSessions.get(userId);
        if (session) {
            session.lastActivity = new Date();
        }
    }
    getUserSocket(userId) {
        const session = this.userSessions.get(userId);
        if (session) {
            return this.io.sockets.sockets.get(session.socketId) || null;
        }
        return null;
    }
    startCleanupInterval() {
        // Clean up inactive sessions every 5 minutes
        setInterval(() => {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            this.userSessions.forEach((session, userId) => {
                if (session.lastActivity < fiveMinutesAgo) {
                    console.log(`[WebSocket] Cleaning up inactive session for user ${userId}`);
                    this.userSessions.delete(userId);
                    this.userLocations.delete(userId);
                }
            });
        }, 5 * 60 * 1000);
    }
    // Public methods for external access
    getConnectedUsers() {
        return Array.from(this.userSessions.keys());
    }
    getUsersInHackathon(hackathonId) {
        return Array.from(this.hackathonRooms.get(hackathonId) || []);
    }
    getUsersInTeam(teamId) {
        return Array.from(this.teamRooms.get(teamId) || []);
    }
    getUserLocations(hackathonId) {
        const locations = Array.from(this.userLocations.values());
        return hackathonId
            ? locations.filter(loc => loc.hackathonId === hackathonId)
            : locations;
    }
    getStatistics() {
        return {
            connectedUsers: this.userSessions.size,
            activeHackathons: this.hackathonRooms.size,
            activeTeams: this.teamRooms.size,
            totalLocations: this.userLocations.size
        };
    }
    sendNotificationToUser(userId, notification) {
        const userSocket = this.getUserSocket(userId);
        if (userSocket) {
            userSocket.emit('notification', notification);
        }
    }
    broadcastToHackathon(hackathonId, event, data) {
        this.io.to(`hackathon:${hackathonId}`).emit(event, data);
    }
    broadcastToTeam(teamId, event, data) {
        this.io.to(`team:${teamId}`).emit(event, data);
    }
    // Legacy methods for backward compatibility
    sendToUser(userId, event, data) {
        this.sendNotificationToUser(userId, { event, data });
    }
    sendToTeam(teamId, event, data) {
        this.broadcastToTeam(teamId, event, data);
    }
    sendToHackathon(hackathonId, event, data) {
        this.broadcastToHackathon(hackathonId, event, data);
    }
    broadcastToAll(event, data) {
        this.io.emit(event, data);
    }
    isUserConnected(userId) {
        return this.userSessions.has(userId);
    }
    getConnectedUserCount() {
        return this.userSessions.size;
    }
}
exports.WebSocketServer = WebSocketServer;
exports.default = WebSocketServer;
//# sourceMappingURL=websocket.js.map
import { Server as HttpServer } from 'http';
interface UserLocation {
    userId: string;
    hackathonId: string;
    location: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        timestamp: string;
    };
    lastUpdate: Date;
}
export declare class WebSocketServer {
    private io;
    private userSessions;
    private userLocations;
    private hackathonRooms;
    private teamRooms;
    constructor(httpServer: HttpServer);
    private setupMiddleware;
    private setupEventHandlers;
    private setupEventBusIntegration;
    private handleEventBroadcast;
    private joinHackathonRoom;
    private leaveHackathonRoom;
    private joinTeamRoom;
    private leaveTeamRoom;
    private handleLocationUpdate;
    private updateUserStatus;
    private handleMessage;
    private handleDisconnection;
    private updateLastActivity;
    private getUserSocket;
    private startCleanupInterval;
    getConnectedUsers(): string[];
    getUsersInHackathon(hackathonId: string): string[];
    getUsersInTeam(teamId: string): string[];
    getUserLocations(hackathonId?: string): UserLocation[];
    getStatistics(): {
        connectedUsers: number;
        activeHackathons: number;
        activeTeams: number;
        totalLocations: number;
    };
    sendNotificationToUser(userId: string, notification: any): void;
    broadcastToHackathon(hackathonId: string, event: string, data: any): void;
    broadcastToTeam(teamId: string, event: string, data: any): void;
    sendToUser(userId: string, event: string, data: any): void;
    sendToTeam(teamId: string, event: string, data: any): void;
    sendToHackathon(hackathonId: string, event: string, data: any): void;
    broadcastToAll(event: string, data: any): void;
    isUserConnected(userId: string): boolean;
    getConnectedUserCount(): number;
}
export default WebSocketServer;
//# sourceMappingURL=websocket.d.ts.map
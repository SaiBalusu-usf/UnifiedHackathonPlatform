import { EventEmitter } from 'events';
export interface AgentStatus {
    name: string;
    description: string;
    isRunning: boolean;
    subscribeToEvents: string[];
    publishEvents: string[];
    processedEventsCount: number;
    uptime: number;
    lastActivity: Date | null;
}
export declare class AgentManager extends EventEmitter {
    private agents;
    private startTimes;
    private lastActivity;
    private isInitialized;
    constructor();
    private initializeAgents;
    private registerAgent;
    private setupEventListeners;
    startAllAgents(): void;
    stopAllAgents(): void;
    startAgent(agentName: string): boolean;
    stopAgent(agentName: string): boolean;
    restartAgent(agentName: string): boolean;
    getAgentStatus(agentName: string): AgentStatus | null;
    getAllAgentStatuses(): AgentStatus[];
    getRunningAgents(): string[];
    getStoppedAgents(): string[];
    getAgentCount(): {
        total: number;
        running: number;
        stopped: number;
    };
    getSystemHealth(): {
        healthy: boolean;
        agentCount: {
            total: number;
            running: number;
            stopped: number;
        };
        issues: string[];
    };
    triggerTestEvent(agentName?: string): void;
    getAgentNames(): string[];
    hasAgent(agentName: string): boolean;
    isInitialized_(): boolean;
    cleanup(): void;
}
export declare const agentManager: AgentManager;
export default agentManager;
//# sourceMappingURL=AgentManager.d.ts.map
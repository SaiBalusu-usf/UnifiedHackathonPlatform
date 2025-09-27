import { EventEmitter } from 'events';
import Agent from './base/Agent';
import ProfileParsingAgent from './ProfileParsingAgent';
import SkillMatchingAgent from './SkillMatchingAgent';
import TeamFormingAgent from './TeamFormingAgent';
import { eventBus } from '../shared/events/eventBus';

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

export class AgentManager extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private startTimes: Map<string, Date> = new Map();
  private lastActivity: Map<string, Date> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.initializeAgents();
  }

  private initializeAgents(): void {
    // Create agent instances
    const agents = [
      new ProfileParsingAgent(),
      new SkillMatchingAgent(),
      new TeamFormingAgent()
    ];

    // Register agents
    agents.forEach(agent => {
      this.registerAgent(agent);
    });

    this.setupEventListeners();
    this.isInitialized = true;

    console.log(`[AgentManager] Initialized with ${this.agents.size} agents`);
  }

  private registerAgent(agent: Agent): void {
    const agentName = agent.getStatus().name;
    this.agents.set(agentName, agent);

    // Listen to agent events
    agent.on('event-processed', (data) => {
      this.lastActivity.set(agentName, new Date());
      this.emit('agent-activity', { agent: agentName, ...data });
    });

    agent.on('error', (data) => {
      this.emit('agent-error', { agent: agentName, ...data });
      console.error(`[AgentManager] Agent ${agentName} error:`, data.error);
    });

    console.log(`[AgentManager] Registered agent: ${agentName}`);
  }

  private setupEventListeners(): void {
    // Listen to system events for agent management
    eventBus.subscribe(EventType.SYSTEM_HEALTH_CHECK, (event: any) => {
      if (event.payload.message === 'Hackathon Platform Gateway started successfully') {
        this.startAllAgents();
      }
    });

    eventBus.subscribe(EventType.SYSTEM_ERROR, (event: any) => {
      console.error('[AgentManager] System error detected:', event.payload);
    });
  }

  public startAllAgents(): void {
    console.log('[AgentManager] Starting all agents...');
    
    this.agents.forEach((agent, name) => {
      try {
        agent.start();
        this.startTimes.set(name, new Date());
        console.log(`[AgentManager] Started agent: ${name}`);
      } catch (error) {
        console.error(`[AgentManager] Failed to start agent ${name}:`, error);
      }
    });

    this.emit('all-agents-started', { count: this.agents.size });
  }

  public stopAllAgents(): void {
    console.log('[AgentManager] Stopping all agents...');
    
    this.agents.forEach((agent, name) => {
      try {
        agent.stop();
        this.startTimes.delete(name);
        this.lastActivity.delete(name);
        console.log(`[AgentManager] Stopped agent: ${name}`);
      } catch (error) {
        console.error(`[AgentManager] Failed to stop agent ${name}:`, error);
      }
    });

    this.emit('all-agents-stopped', { count: this.agents.size });
  }

  public startAgent(agentName: string): boolean {
    const agent = this.agents.get(agentName);
    if (!agent) {
      console.error(`[AgentManager] Agent not found: ${agentName}`);
      return false;
    }

    try {
      agent.start();
      this.startTimes.set(agentName, new Date());
      console.log(`[AgentManager] Started agent: ${agentName}`);
      this.emit('agent-started', { agent: agentName });
      return true;
    } catch (error) {
      console.error(`[AgentManager] Failed to start agent ${agentName}:`, error);
      return false;
    }
  }

  public stopAgent(agentName: string): boolean {
    const agent = this.agents.get(agentName);
    if (!agent) {
      console.error(`[AgentManager] Agent not found: ${agentName}`);
      return false;
    }

    try {
      agent.stop();
      this.startTimes.delete(agentName);
      this.lastActivity.delete(agentName);
      console.log(`[AgentManager] Stopped agent: ${agentName}`);
      this.emit('agent-stopped', { agent: agentName });
      return true;
    } catch (error) {
      console.error(`[AgentManager] Failed to stop agent ${agentName}:`, error);
      return false;
    }
  }

  public restartAgent(agentName: string): boolean {
    console.log(`[AgentManager] Restarting agent: ${agentName}`);
    
    if (this.stopAgent(agentName)) {
      // Wait a moment before restarting
      setTimeout(() => {
        this.startAgent(agentName);
      }, 1000);
      return true;
    }
    return false;
  }

  public getAgentStatus(agentName: string): AgentStatus | null {
    const agent = this.agents.get(agentName);
    if (!agent) {
      return null;
    }

    const status = agent.getStatus();
    const startTime = this.startTimes.get(agentName);
    const lastActivity = this.lastActivity.get(agentName);

    return {
      ...status,
      uptime: startTime ? Date.now() - startTime.getTime() : 0,
      lastActivity: lastActivity || null
    };
  }

  public getAllAgentStatuses(): AgentStatus[] {
    const statuses: AgentStatus[] = [];
    
    this.agents.forEach((agent, name) => {
      const status = this.getAgentStatus(name);
      if (status) {
        statuses.push(status);
      }
    });

    return statuses.sort((a, b) => a.name.localeCompare(b.name));
  }

  public getRunningAgents(): string[] {
    return this.getAllAgentStatuses()
      .filter(status => status.isRunning)
      .map(status => status.name);
  }

  public getStoppedAgents(): string[] {
    return this.getAllAgentStatuses()
      .filter(status => !status.isRunning)
      .map(status => status.name);
  }

  public getAgentCount(): { total: number; running: number; stopped: number } {
    const statuses = this.getAllAgentStatuses();
    const running = statuses.filter(s => s.isRunning).length;
    const stopped = statuses.filter(s => !s.isRunning).length;

    return {
      total: statuses.length,
      running,
      stopped
    };
  }

  public getSystemHealth(): {
    healthy: boolean;
    agentCount: { total: number; running: number; stopped: number };
    issues: string[];
  } {
    const agentCount = this.getAgentCount();
    const issues: string[] = [];
    
    // Check if all agents are running
    if (agentCount.stopped > 0) {
      issues.push(`${agentCount.stopped} agent(s) are stopped`);
    }

    // Check for agents with no recent activity (if they've been running for more than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    this.agents.forEach((agent, name) => {
      const startTime = this.startTimes.get(name);
      const lastActivity = this.lastActivity.get(name);
      
      if (startTime && startTime < fiveMinutesAgo && (!lastActivity || lastActivity < fiveMinutesAgo)) {
        if (agent.getStatus().isRunning) {
          issues.push(`Agent ${name} has no recent activity`);
        }
      }
    });

    return {
      healthy: issues.length === 0,
      agentCount,
      issues
    };
  }

  public triggerTestEvent(agentName?: string): void {
    console.log(`[AgentManager] Triggering test event${agentName ? ` for agent ${agentName}` : ' for all agents'}`);
    
    // Publish a test event
    eventBus.publish({
      id: `test-${Date.now()}`,
      type: EventType.SYSTEM_HEALTH_CHECK,
      timestamp: new Date(),
      source: 'AgentManager',
      version: '1.0.0',
      data: {
        message: 'Test event from AgentManager',
        targetAgent: agentName
      }
    });
  }

  public getAgentNames(): string[] {
    return Array.from(this.agents.keys());
  }

  public hasAgent(agentName: string): boolean {
    return this.agents.has(agentName);
  }

  public isInitialized_(): boolean {
    return this.isInitialized;
  }

  // Cleanup method
  public cleanup(): void {
    console.log('[AgentManager] Cleaning up...');
    this.stopAllAgents();
    this.removeAllListeners();
    this.agents.clear();
    this.startTimes.clear();
    this.lastActivity.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const agentManager = new AgentManager();
export default agentManager;


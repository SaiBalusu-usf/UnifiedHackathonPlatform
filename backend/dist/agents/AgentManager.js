"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentManager = exports.AgentManager = void 0;
const events_1 = require("events");
const ProfileParsingAgent_1 = __importDefault(require("./ProfileParsingAgent"));
const SkillMatchingAgent_1 = __importDefault(require("./SkillMatchingAgent"));
const TeamFormingAgent_1 = __importDefault(require("./TeamFormingAgent"));
const eventBus_1 = require("../shared/events/eventBus");
class AgentManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.agents = new Map();
        this.startTimes = new Map();
        this.lastActivity = new Map();
        this.isInitialized = false;
        this.initializeAgents();
    }
    initializeAgents() {
        // Create agent instances
        const agents = [
            new ProfileParsingAgent_1.default(),
            new SkillMatchingAgent_1.default(),
            new TeamFormingAgent_1.default()
        ];
        // Register agents
        agents.forEach(agent => {
            this.registerAgent(agent);
        });
        this.setupEventListeners();
        this.isInitialized = true;
        console.log(`[AgentManager] Initialized with ${this.agents.size} agents`);
    }
    registerAgent(agent) {
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
    setupEventListeners() {
        // Listen to system events for agent management
        eventBus_1.eventBus.subscribe(EventType.SYSTEM_HEALTH_CHECK, (event) => {
            if (event.payload.message === 'Hackathon Platform Gateway started successfully') {
                this.startAllAgents();
            }
        });
        eventBus_1.eventBus.subscribe(EventType.SYSTEM_ERROR, (event) => {
            console.error('[AgentManager] System error detected:', event.payload);
        });
    }
    startAllAgents() {
        console.log('[AgentManager] Starting all agents...');
        this.agents.forEach((agent, name) => {
            try {
                agent.start();
                this.startTimes.set(name, new Date());
                console.log(`[AgentManager] Started agent: ${name}`);
            }
            catch (error) {
                console.error(`[AgentManager] Failed to start agent ${name}:`, error);
            }
        });
        this.emit('all-agents-started', { count: this.agents.size });
    }
    stopAllAgents() {
        console.log('[AgentManager] Stopping all agents...');
        this.agents.forEach((agent, name) => {
            try {
                agent.stop();
                this.startTimes.delete(name);
                this.lastActivity.delete(name);
                console.log(`[AgentManager] Stopped agent: ${name}`);
            }
            catch (error) {
                console.error(`[AgentManager] Failed to stop agent ${name}:`, error);
            }
        });
        this.emit('all-agents-stopped', { count: this.agents.size });
    }
    startAgent(agentName) {
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
        }
        catch (error) {
            console.error(`[AgentManager] Failed to start agent ${agentName}:`, error);
            return false;
        }
    }
    stopAgent(agentName) {
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
        }
        catch (error) {
            console.error(`[AgentManager] Failed to stop agent ${agentName}:`, error);
            return false;
        }
    }
    restartAgent(agentName) {
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
    getAgentStatus(agentName) {
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
    getAllAgentStatuses() {
        const statuses = [];
        this.agents.forEach((agent, name) => {
            const status = this.getAgentStatus(name);
            if (status) {
                statuses.push(status);
            }
        });
        return statuses.sort((a, b) => a.name.localeCompare(b.name));
    }
    getRunningAgents() {
        return this.getAllAgentStatuses()
            .filter(status => status.isRunning)
            .map(status => status.name);
    }
    getStoppedAgents() {
        return this.getAllAgentStatuses()
            .filter(status => !status.isRunning)
            .map(status => status.name);
    }
    getAgentCount() {
        const statuses = this.getAllAgentStatuses();
        const running = statuses.filter(s => s.isRunning).length;
        const stopped = statuses.filter(s => !s.isRunning).length;
        return {
            total: statuses.length,
            running,
            stopped
        };
    }
    getSystemHealth() {
        const agentCount = this.getAgentCount();
        const issues = [];
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
    triggerTestEvent(agentName) {
        console.log(`[AgentManager] Triggering test event${agentName ? ` for agent ${agentName}` : ' for all agents'}`);
        // Publish a test event
        eventBus_1.eventBus.publish({
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
    getAgentNames() {
        return Array.from(this.agents.keys());
    }
    hasAgent(agentName) {
        return this.agents.has(agentName);
    }
    isInitialized_() {
        return this.isInitialized;
    }
    // Cleanup method
    cleanup() {
        console.log('[AgentManager] Cleaning up...');
        this.stopAllAgents();
        this.removeAllListeners();
        this.agents.clear();
        this.startTimes.clear();
        this.lastActivity.clear();
        this.isInitialized = false;
    }
}
exports.AgentManager = AgentManager;
// Export singleton instance
exports.agentManager = new AgentManager();
exports.default = exports.agentManager;
//# sourceMappingURL=AgentManager.js.map
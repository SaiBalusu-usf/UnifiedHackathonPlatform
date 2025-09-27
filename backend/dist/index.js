"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const database_1 = require("./config/database");
const websocket_1 = __importDefault(require("./shared/events/websocket"));
const eventBus_1 = require("./shared/events/eventBus");
const AgentManager_1 = require("./agents/AgentManager");
// Import service routes
const routes_1 = __importDefault(require("./services/user-management/routes"));
const routes_2 = __importDefault(require("./services/team-formation/routes"));
const routes_3 = __importDefault(require("./services/resume-analysis/routes"));
const routes_4 = __importDefault(require("./services/tracking/routes"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 3000;
// Initialize WebSocket server
const wsServer = new websocket_1.default(server);
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins for development
    credentials: true
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (req, res) => {
    const systemHealth = AgentManager_1.agentManager.getSystemHealth();
    res.json({
        service: 'hackathon-platform-gateway',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connectedWebSocketUsers: wsServer.getConnectedUserCount(),
        eventBusListeners: eventBus_1.eventBus.getEventTypes().length,
        agents: systemHealth
    });
});
// API Routes - Gateway pattern
app.use('/api/users', routes_1.default);
app.use('/api/teams', routes_2.default);
app.use('/api/resumes', routes_3.default);
app.use('/api/tracking', routes_4.default);
// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
    res.json({
        connectedUsers: wsServer.getConnectedUserCount(),
        connectedUserIds: wsServer.getConnectedUsers()
    });
});
// Event bus status endpoint
app.get('/api/events/status', (req, res) => {
    res.json({
        eventTypes: eventBus_1.eventBus.getEventTypes(),
        listenerCounts: eventBus_1.eventBus.getEventTypes().reduce((acc, eventType) => {
            acc[eventType] = eventBus_1.eventBus.getListenerCount(eventType);
            return acc;
        }, {})
    });
});
// Agent management endpoints
app.get('/api/agents/status', (req, res) => {
    res.json({
        agents: AgentManager_1.agentManager.getAllAgentStatuses(),
        systemHealth: AgentManager_1.agentManager.getSystemHealth()
    });
});
app.post('/api/agents/:agentName/start', (req, res) => {
    const { agentName } = req.params;
    const success = AgentManager_1.agentManager.startAgent(agentName);
    res.json({
        success,
        message: success ? `Agent ${agentName} started` : `Failed to start agent ${agentName}`
    });
});
app.post('/api/agents/:agentName/stop', (req, res) => {
    const { agentName } = req.params;
    const success = AgentManager_1.agentManager.stopAgent(agentName);
    res.json({
        success,
        message: success ? `Agent ${agentName} stopped` : `Failed to stop agent ${agentName}`
    });
});
app.post('/api/agents/:agentName/restart', (req, res) => {
    const { agentName } = req.params;
    const success = AgentManager_1.agentManager.restartAgent(agentName);
    res.json({
        success,
        message: success ? `Agent ${agentName} restarted` : `Failed to restart agent ${agentName}`
    });
});
app.post('/api/agents/test-event', (req, res) => {
    const { agentName } = req.body;
    AgentManager_1.agentManager.triggerTestEvent(agentName);
    res.json({
        success: true,
        message: `Test event triggered${agentName ? ` for agent ${agentName}` : ' for all agents'}`
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Publish system error event
    eventBus_1.eventBus.publish('system.error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    }, 'gateway');
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});
// Start server
const startServer = async () => {
    try {
        // Connect to databases
        await (0, database_1.connectPostgreSQL)();
        await (0, database_1.connectMongoDB)();
        // Start HTTP server with WebSocket support
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Hackathon Platform Gateway running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🔌 WebSocket server initialized`);
            console.log(`📡 Event bus initialized with ${eventBus_1.eventBus.getEventTypes().length} event types`);
            console.log(`🤖 Agent Manager initialized with ${AgentManager_1.agentManager.getAgentCount().total} agents`);
        });
        // Publish system startup event (this will trigger agents to start)
        eventBus_1.eventBus.publish('system.info', {
            message: 'Hackathon Platform Gateway started successfully',
            port: PORT,
            timestamp: new Date()
        }, 'gateway');
    }
    catch (error) {
        console.error('Failed to start Hackathon Platform Gateway:', error);
        // Publish system error event
        eventBus_1.eventBus.publish('system.error', {
            error: 'Failed to start gateway',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 'gateway');
        process.exit(1);
    }
};
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    // Publish system shutdown event
    eventBus_1.eventBus.publish('system.info', {
        message: 'Hackathon Platform Gateway shutting down',
        signal
    }, 'gateway');
    try {
        // Stop all agents
        AgentManager_1.agentManager.stopAllAgents();
        // Close database connections
        await (0, database_1.closeConnections)();
        // Close HTTP server
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
        // Force close after 10 seconds
        setTimeout(() => {
            console.log('Force closing server');
            process.exit(1);
        }, 10000);
    }
    catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};
// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    eventBus_1.eventBus.publish('system.error', {
        error: 'Uncaught exception',
        details: error.message,
        stack: error.stack
    }, 'gateway');
    process.exit(1);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    eventBus_1.eventBus.publish('system.error', {
        error: 'Unhandled promise rejection',
        details: reason
    }, 'gateway');
    process.exit(1);
});
startServer();
//# sourceMappingURL=index.js.map
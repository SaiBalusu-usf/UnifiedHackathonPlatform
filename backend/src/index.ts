import { configuredPort } from './shared/utils/runtimeConfig';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectPostgreSQL, connectMongoDB, closeConnections, pgPool } from './config/database';
import WebSocketServer from './shared/events/websocket';
import { eventBus } from './shared/events/eventBus';
import { agentManager } from './agents/AgentManager';

// Import service routes
import authRoutes from './services/auth/routes';
import { authenticateToken, authorizeRoles } from './shared/middleware/auth';
import { mongoSanitizeConfig, hppProtection, apiRateLimit, corsOptions } from './shared/middleware/security';
import userRoutes from './services/user-management/routes';
import teamRoutes from './services/team-formation/routes';
import resumeRoutes from './services/resume-analysis/routes';
import trackingRoutes from './services/tracking/routes';

const app = express();
const server = http.createServer(app);
const PORT = configuredPort("PORT", 3000);

// Initialize WebSocket server
const wsServer = new WebSocketServer(server);

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan(':method :status :res[content-length] - :response-time ms'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  const systemHealth = agentManager.getSystemHealth();
  res.json({
    service: 'hackathon-platform-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connectedWebSocketUsers: wsServer.getConnectedUserCount(),
    eventBusListeners: eventBus.getEventTypes().length,
    agents: systemHealth
  });
});

app.use(mongoSanitizeConfig, hppProtection);
app.use('/api', apiRateLimit);
app.use('/api/auth', authRoutes);
app.use(['/api/agents', '/api/events', '/api/websocket'], authenticateToken, authorizeRoles('admin', 'super_admin'));

// API Routes - Gateway pattern
app.get('/api/hackathons', authenticateToken, async (_req, res, next) => {
  try {
    const result = await pgPool.query('SELECT hackathon_id, name, description, start_date, end_date FROM hackathons ORDER BY start_date DESC LIMIT 100');
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
});
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/tracking', trackingRoutes);

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
    eventTypes: eventBus.getEventTypes(),
    listenerCounts: eventBus.getEventTypes().reduce((acc, eventType) => {
      acc[eventType] = eventBus.getListenerCount(eventType);
      return acc;
    }, {} as Record<string, number>)
  });
});

// Agent management endpoints
app.get('/api/agents/status', (req, res) => {
  res.json({
    agents: agentManager.getAllAgentStatuses(),
    systemHealth: agentManager.getSystemHealth()
  });
});

app.post('/api/agents/:agentName/start', (req, res) => {
  const { agentName } = req.params;
  const success = agentManager.startAgent(agentName);
  res.json({
    success,
    message: success ? `Agent ${agentName} started` : `Failed to start agent ${agentName}`
  });
});

app.post('/api/agents/:agentName/stop', (req, res) => {
  const { agentName } = req.params;
  const success = agentManager.stopAgent(agentName);
  res.json({
    success,
    message: success ? `Agent ${agentName} stopped` : `Failed to stop agent ${agentName}`
  });
});

app.post('/api/agents/:agentName/restart', (req, res) => {
  const { agentName } = req.params;
  const success = agentManager.restartAgent(agentName);
  res.json({
    success,
    message: success ? `Agent ${agentName} restarted` : `Failed to restart agent ${agentName}`
  });
});

app.post('/api/agents/test-event', (req, res) => {
  const { agentName } = req.body;
  agentManager.triggerTestEvent(agentName);
  res.json({
    success: true,
    message: `Test event triggered${agentName ? ` for agent ${agentName}` : ' for all agents'}`
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  
  // Publish system error event
  eventBus.publish('system.error', {
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
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectPostgreSQL();
    await connectMongoDB();
    
    // Start HTTP server with WebSocket support
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Hackathon Platform Gateway running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket server initialized`);
      console.log(`📡 Event bus initialized with ${eventBus.getEventTypes().length} event types`);
      console.log(`🤖 Agent Manager initialized with ${agentManager.getAgentCount().total} agents`);
    });

    // Publish system startup event (this will trigger agents to start)
    eventBus.publish('system.info', {
      message: 'Hackathon Platform Gateway started successfully',
      port: PORT,
      timestamp: new Date()
    }, 'gateway');

  } catch (error) {
    console.error('Failed to start Hackathon Platform Gateway:', error);
    
    // Publish system error event
    eventBus.publish('system.error', {
      error: 'Failed to start gateway',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 'gateway');
    
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  // Publish system shutdown event
  eventBus.publish('system.info', {
    message: 'Hackathon Platform Gateway shutting down',
    signal
  }, 'gateway');

  try {
    // Stop all agents
    agentManager.stopAllAgents();
    
    // Close database connections
    await closeConnections();
    
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

  } catch (error) {
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
  eventBus.publish('system.error', {
    error: 'Uncaught exception',
    details: error.message,
    stack: error.stack
  }, 'gateway');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  eventBus.publish('system.error', {
    error: 'Unhandled promise rejection',
    details: reason
  }, 'gateway');
  process.exit(1);
});

if (require.main === module) void startServer();


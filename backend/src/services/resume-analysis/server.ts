import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectMongoDB } from '../../config/database';
import resumeRoutes from './routes';

const app = express();
const PORT = process.env.RESUME_SERVICE_PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins for development
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'resume-analysis', status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/resumes', resumeRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
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
    await connectMongoDB();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Resume Analysis Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Resume Analysis Service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();


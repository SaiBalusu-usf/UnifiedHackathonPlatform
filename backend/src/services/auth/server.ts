import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import authRoutes from './routes'
import { corsOptions, helmetConfig, authRateLimit, securityHeaders, securityLogger } from '../../shared/middleware/security'
import { errorHandler } from '../../shared/middleware/errorHandler'

const app = express()
const httpServer = createServer(app)

// Security middleware
app.use(helmetConfig)
app.use(cors(corsOptions))
app.use(securityHeaders)
app.use(securityLogger)

// Rate limiting
app.use('/api/auth', authRateLimit)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Routes
app.use('/api/auth', authRoutes)

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested resource was not found'
  })
})

const PORT = process.env.AUTH_SERVICE_PORT || 3001

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[Auth Service] Server running on port ${PORT}`)
  console.log(`[Auth Service] Health check: http://localhost:${PORT}/health`)
})

export default app


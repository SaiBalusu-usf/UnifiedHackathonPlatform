import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { body, validationResult, ValidationChain } from 'express-validator'
import mongoSanitize from 'express-mongo-sanitize'
import { Request, Response, NextFunction } from 'express'

// Rate limiting configurations
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      })
    }
  })
}

// Different rate limits for different endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts. Please try again in 15 minutes.'
)

export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100 // 100 requests per 15 minutes
)

export const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads per hour
  'Too many file uploads. Please try again in an hour.'
)

export const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  20 // 20 requests per 15 minutes
)

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
})

// Input validation schemas
export const userValidation = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens')
  ],
  
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  
  updateProfile: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must not exceed 500 characters'),
    body('location')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Location must not exceed 100 characters'),
    body('skills')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Skills must be an array with maximum 20 items'),
    body('skills.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each skill must be between 1 and 50 characters')
  ]
}

export const teamValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Team name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('maxMembers')
      .isInt({ min: 2, max: 10 })
      .withMessage('Max members must be between 2 and 10'),
    body('requiredSkills')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Required skills must be an array with maximum 10 items'),
    body('hackathonId')
      .isUUID()
      .withMessage('Invalid hackathon ID')
  ],
  
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Team name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('maxMembers')
      .optional()
      .isInt({ min: 2, max: 10 })
      .withMessage('Max members must be between 2 and 10')
  ]
}

export const hackathonValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Hackathon name must be between 1 and 200 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters'),
    body('startDate')
      .isISO8601()
      .toDate()
      .withMessage('Start date must be a valid date'),
    body('endDate')
      .isISO8601()
      .toDate()
      .withMessage('End date must be a valid date'),
    body('location')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Location must be between 1 and 200 characters'),
    body('maxParticipants')
      .optional()
      .isInt({ min: 10, max: 10000 })
      .withMessage('Max participants must be between 10 and 10000'),
    body('registrationDeadline')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Registration deadline must be a valid date')
  ]
}

// Validation error handler middleware
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }))
    
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input and try again',
      details: formattedErrors
    })
  }
  
  next()
}

// MongoDB injection protection
export const mongoSanitizeConfig = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[Security] Potential NoSQL injection attempt detected: ${key}`)
  }
})

// XSS protection middleware (custom implementation since xss-clean is deprecated)
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potentially dangerous HTML tags and attributes
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/<\s*\w.*?>/gi, '')
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(sanitizeValue)
      } else {
        const sanitized: any = {}
        for (const key in value) {
          sanitized[key] = sanitizeValue(value[key])
        }
        return sanitized
      }
    }
    return value
  }

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeValue(req.body)
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeValue(req.query)
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeValue(req.params)
  }

  next()
}

// HTTP Parameter Pollution protection
export const hppProtection = (req: Request, res: Response, next: NextFunction) => {
  // Whitelist of parameters that can have multiple values
  const whitelist = ['skills', 'tags', 'categories']
  
  const sanitizeParams = (params: any) => {
    for (const key in params) {
      if (Array.isArray(params[key]) && !whitelist.includes(key)) {
        // Keep only the last value for non-whitelisted parameters
        params[key] = params[key][params[key].length - 1]
      }
    }
    return params
  }

  if (req.query) {
    req.query = sanitizeParams(req.query)
  }

  if (req.body) {
    req.body = sanitizeParams(req.body)
  }

  next()
}

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By')
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  next()
}

// CORS configuration
export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://your-domain.com'
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
}

// File upload security
export const fileUploadSecurity = {
  // Allowed MIME types for resume uploads
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],
  
  // Maximum file size (5MB)
  maxFileSize: 5 * 1024 * 1024,
  
  // File validation middleware
  validateFile: (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      })
    }

    // Check file size
    if (req.file.size > fileUploadSecurity.maxFileSize) {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must be less than 5MB'
      })
    }

    // Check MIME type
    if (!fileUploadSecurity.allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only PDF, DOC, DOCX, and TXT files are allowed'
      })
    }

    // Check file extension
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt']
    const fileExtension = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'))
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        error: 'Invalid file extension',
        message: 'Only PDF, DOC, DOCX, and TXT files are allowed'
      })
    }

    next()
  }
}

// Request logging middleware for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  
  // Log potentially suspicious requests
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /\$where/i,  // MongoDB injection
    /eval\(/i,  // Code injection
  ]
  
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  })
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestData))
  
  if (isSuspicious) {
    console.warn(`[Security] Suspicious request detected:`, {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      body: req.body,
      query: req.query,
      timestamp: new Date().toISOString()
    })
  }
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    
    // Log slow requests (potential DoS)
    if (duration > 5000) {
      console.warn(`[Security] Slow request detected:`, {
        ip: req.ip,
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode
      })
    }
  })
  
  next()
}

export default {
  authRateLimit,
  apiRateLimit,
  uploadRateLimit,
  strictRateLimit,
  helmetConfig,
  userValidation,
  teamValidation,
  hackathonValidation,
  handleValidationErrors,
  mongoSanitizeConfig,
  xssProtection,
  hppProtection,
  securityHeaders,
  corsOptions,
  fileUploadSecurity,
  securityLogger
}


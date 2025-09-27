import { Request, Response, NextFunction } from 'express'
import { ValidationError } from 'express-validator'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
  code?: string
}

// Custom error classes
export class BadRequestError extends Error {
  statusCode = 400
  isOperational = true
  
  constructor(message: string) {
    super(message)
    this.name = 'BadRequestError'
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401
  isOperational = true
  
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  statusCode = 403
  isOperational = true
  
  constructor(message: string = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  isOperational = true
  
  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  statusCode = 409
  isOperational = true
  
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class ValidationError extends Error {
  statusCode = 422
  isOperational = true
  errors: any[]
  
  constructor(message: string, errors: any[] = []) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

export class InternalServerError extends Error {
  statusCode = 500
  isOperational = false
  
  constructor(message: string = 'Internal server error') {
    super(message)
    this.name = 'InternalServerError'
  }
}

// Error handler middleware
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default error values
  let statusCode = error.statusCode || 500
  let message = error.message || 'Internal server error'
  let details: any = undefined

  // Log error
  if (statusCode >= 500) {
    console.error('[Error Handler] Server error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    })
  } else {
    console.warn('[Error Handler] Client error:', {
      error: error.message,
      statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    })
  }

  // Handle specific error types
  if (error.name === 'ValidationError' && 'errors' in error) {
    details = error.errors
  }

  // Handle MongoDB errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    if (error.code === 11000) {
      statusCode = 409
      message = 'Duplicate key error'
      details = { duplicateField: extractDuplicateField(error.message) }
    }
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError' && 'errors' in error) {
    statusCode = 400
    message = 'Validation failed'
    details = Object.values(error.errors as any).map((err: any) => ({
      field: err.path,
      message: err.message,
      value: err.value
    }))
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  // Handle multer errors (file upload)
  if (error.name === 'MulterError') {
    statusCode = 400
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large'
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files'
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field'
    }
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: getErrorType(statusCode),
    message,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  }

  // Add details for validation errors
  if (details) {
    errorResponse.details = details
  }

  // Add request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.requestId = req.headers['x-request-id']
  }

  // Don't expose stack trace in production
  if (process.env.NODE_ENV === 'development' && error.stack) {
    errorResponse.stack = error.stack
  }

  res.status(statusCode).json(errorResponse)
}

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Not found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`)
  next(error)
}

// Helper functions
const getErrorType = (statusCode: number): string => {
  switch (statusCode) {
    case 400: return 'Bad Request'
    case 401: return 'Unauthorized'
    case 403: return 'Forbidden'
    case 404: return 'Not Found'
    case 409: return 'Conflict'
    case 422: return 'Validation Error'
    case 429: return 'Too Many Requests'
    case 500: return 'Internal Server Error'
    case 502: return 'Bad Gateway'
    case 503: return 'Service Unavailable'
    default: return 'Error'
  }
}

const extractDuplicateField = (errorMessage: string): string => {
  const match = errorMessage.match(/index: (.+?)_/)
  return match ? match[1] : 'unknown'
}

// Global error handlers for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('[Global] Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[Global] Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

export default {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError
}


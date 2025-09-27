"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.InternalServerError = exports.ValidationError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = void 0;
const express_validator_1 = require("express-validator");
// Custom error classes
class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 400;
        this.isOperational = true;
        this.name = 'BadRequestError';
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.statusCode = 401;
        this.isOperational = true;
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends Error {
    constructor(message = 'Forbidden') {
        super(message);
        this.statusCode = 403;
        this.isOperational = true;
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.statusCode = 404;
        this.isOperational = true;
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 409;
        this.isOperational = true;
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class ValidationError extends Error {
    constructor(message, errors = []) {
        super(message);
        this.statusCode = 422;
        this.isOperational = true;
        this.name = 'ValidationError';
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
class InternalServerError extends Error {
    constructor(message = 'Internal server error') {
        super(message);
        this.statusCode = 500;
        this.isOperational = false;
        this.name = 'InternalServerError';
    }
}
exports.InternalServerError = InternalServerError;
// Error handler middleware
const errorHandler = (error, req, res, next) => {
    // Set default error values
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error';
    let details = undefined;
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
        });
    }
    else {
        console.warn('[Error Handler] Client error:', {
            error: error.message,
            statusCode,
            url: req.url,
            method: req.method,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
    }
    // Handle specific error types
    if (error.name === 'ValidationError' && 'errors' in error) {
        details = error.errors;
    }
    // Handle MongoDB errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        if (error.code === 11000) {
            statusCode = 409;
            message = 'Duplicate key error';
            details = { duplicateField: extractDuplicateField(error.message) };
        }
    }
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError' && 'errors' in error) {
        statusCode = 400;
        message = 'Validation failed';
        details = Object.values(error.errors).map((err) => ({
            field: err.path,
            message: err.message,
            value: err.value
        }));
    }
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    // Handle multer errors (file upload)
    if (error.name === 'MulterError') {
        statusCode = 400;
        if (error.code === 'LIMIT_FILE_SIZE') {
            message = 'File too large';
        }
        else if (error.code === 'LIMIT_FILE_COUNT') {
            message = 'Too many files';
        }
        else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Unexpected file field';
        }
    }
    // Prepare error response
    const errorResponse = {
        success: false,
        error: getErrorType(statusCode),
        message,
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method
    };
    // Add details for validation errors
    if (details) {
        errorResponse.details = details;
    }
    // Add request ID if available
    if (req.headers['x-request-id']) {
        errorResponse.requestId = req.headers['x-request-id'];
    }
    // Don't expose stack trace in production
    if (process.env.NODE_ENV === 'development' && error.stack) {
        errorResponse.stack = error.stack;
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Not found handler
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// Helper functions
const getErrorType = (statusCode) => {
    switch (statusCode) {
        case 400: return 'Bad Request';
        case 401: return 'Unauthorized';
        case 403: return 'Forbidden';
        case 404: return 'Not Found';
        case 409: return 'Conflict';
        case 422: return 'Validation Error';
        case 429: return 'Too Many Requests';
        case 500: return 'Internal Server Error';
        case 502: return 'Bad Gateway';
        case 503: return 'Service Unavailable';
        default: return 'Error';
    }
};
const extractDuplicateField = (errorMessage) => {
    const match = errorMessage.match(/index: (.+?)_/);
    return match ? match[1] : 'unknown';
};
// Global error handlers for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('[Global] Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Global] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
exports.default = {
    errorHandler: exports.errorHandler,
    asyncHandler: exports.asyncHandler,
    notFoundHandler: exports.notFoundHandler,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    ValidationError: express_validator_1.ValidationError,
    InternalServerError
};
//# sourceMappingURL=errorHandler.js.map
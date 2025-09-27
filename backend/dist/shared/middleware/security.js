"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityLogger = exports.fileUploadSecurity = exports.corsOptions = exports.securityHeaders = exports.hppProtection = exports.xssProtection = exports.mongoSanitizeConfig = exports.handleValidationErrors = exports.hackathonValidation = exports.teamValidation = exports.userValidation = exports.helmetConfig = exports.strictRateLimit = exports.uploadRateLimit = exports.apiRateLimit = exports.authRateLimit = exports.createRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const express_validator_1 = require("express-validator");
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: message || {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
};
exports.createRateLimit = createRateLimit;
// Different rate limits for different endpoints
exports.authRateLimit = (0, exports.createRateLimit)(15 * 60 * 1000, // 15 minutes
5, // 5 attempts
'Too many authentication attempts. Please try again in 15 minutes.');
exports.apiRateLimit = (0, exports.createRateLimit)(15 * 60 * 1000, // 15 minutes
100 // 100 requests per 15 minutes
);
exports.uploadRateLimit = (0, exports.createRateLimit)(60 * 60 * 1000, // 1 hour
10, // 10 uploads per hour
'Too many file uploads. Please try again in an hour.');
exports.strictRateLimit = (0, exports.createRateLimit)(15 * 60 * 1000, // 15 minutes
20 // 20 requests per 15 minutes
);
// Helmet configuration for security headers
exports.helmetConfig = (0, helmet_1.default)({
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
});
// Input validation schemas
exports.userValidation = {
    register: [
        (0, express_validator_1.body)('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        (0, express_validator_1.body)('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
        (0, express_validator_1.body)('firstName')
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage('First name must be between 1 and 50 characters'),
        (0, express_validator_1.body)('lastName')
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage('Last name must be between 1 and 50 characters'),
        (0, express_validator_1.body)('username')
            .trim()
            .isLength({ min: 3, max: 30 })
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens')
    ],
    login: [
        (0, express_validator_1.body)('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        (0, express_validator_1.body)('password')
            .notEmpty()
            .withMessage('Password is required')
    ],
    updateProfile: [
        (0, express_validator_1.body)('firstName')
            .optional()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage('First name must be between 1 and 50 characters'),
        (0, express_validator_1.body)('lastName')
            .optional()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage('Last name must be between 1 and 50 characters'),
        (0, express_validator_1.body)('bio')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Bio must not exceed 500 characters'),
        (0, express_validator_1.body)('location')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Location must not exceed 100 characters'),
        (0, express_validator_1.body)('skills')
            .optional()
            .isArray({ max: 20 })
            .withMessage('Skills must be an array with maximum 20 items'),
        (0, express_validator_1.body)('skills.*')
            .optional()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage('Each skill must be between 1 and 50 characters')
    ]
};
exports.teamValidation = {
    create: [
        (0, express_validator_1.body)('name')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Team name must be between 1 and 100 characters'),
        (0, express_validator_1.body)('description')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Description must not exceed 500 characters'),
        (0, express_validator_1.body)('maxMembers')
            .isInt({ min: 2, max: 10 })
            .withMessage('Max members must be between 2 and 10'),
        (0, express_validator_1.body)('requiredSkills')
            .optional()
            .isArray({ max: 10 })
            .withMessage('Required skills must be an array with maximum 10 items'),
        (0, express_validator_1.body)('hackathonId')
            .isUUID()
            .withMessage('Invalid hackathon ID')
    ],
    update: [
        (0, express_validator_1.body)('name')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Team name must be between 1 and 100 characters'),
        (0, express_validator_1.body)('description')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Description must not exceed 500 characters'),
        (0, express_validator_1.body)('maxMembers')
            .optional()
            .isInt({ min: 2, max: 10 })
            .withMessage('Max members must be between 2 and 10')
    ]
};
exports.hackathonValidation = {
    create: [
        (0, express_validator_1.body)('name')
            .trim()
            .isLength({ min: 1, max: 200 })
            .withMessage('Hackathon name must be between 1 and 200 characters'),
        (0, express_validator_1.body)('description')
            .trim()
            .isLength({ min: 10, max: 2000 })
            .withMessage('Description must be between 10 and 2000 characters'),
        (0, express_validator_1.body)('startDate')
            .isISO8601()
            .toDate()
            .withMessage('Start date must be a valid date'),
        (0, express_validator_1.body)('endDate')
            .isISO8601()
            .toDate()
            .withMessage('End date must be a valid date'),
        (0, express_validator_1.body)('location')
            .trim()
            .isLength({ min: 1, max: 200 })
            .withMessage('Location must be between 1 and 200 characters'),
        (0, express_validator_1.body)('maxParticipants')
            .optional()
            .isInt({ min: 10, max: 10000 })
            .withMessage('Max participants must be between 10 and 10000'),
        (0, express_validator_1.body)('registrationDeadline')
            .optional()
            .isISO8601()
            .toDate()
            .withMessage('Registration deadline must be a valid date')
    ]
};
// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.param,
            message: error.msg,
            value: error.value
        }));
        return res.status(400).json({
            error: 'Validation failed',
            message: 'Please check your input and try again',
            details: formattedErrors
        });
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
// MongoDB injection protection
exports.mongoSanitizeConfig = (0, express_mongo_sanitize_1.default)({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`[Security] Potential NoSQL injection attempt detected: ${key}`);
    }
});
// XSS protection middleware (custom implementation since xss-clean is deprecated)
const xssProtection = (req, res, next) => {
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
            // Remove potentially dangerous HTML tags and attributes
            return value
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .replace(/<\s*\w.*?>/gi, '');
        }
        else if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                return value.map(sanitizeValue);
            }
            else {
                const sanitized = {};
                for (const key in value) {
                    sanitized[key] = sanitizeValue(value[key]);
                }
                return sanitized;
            }
        }
        return value;
    };
    // Sanitize request body
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeValue(req.query);
    }
    // Sanitize URL parameters
    if (req.params) {
        req.params = sanitizeValue(req.params);
    }
    next();
};
exports.xssProtection = xssProtection;
// HTTP Parameter Pollution protection
const hppProtection = (req, res, next) => {
    // Whitelist of parameters that can have multiple values
    const whitelist = ['skills', 'tags', 'categories'];
    const sanitizeParams = (params) => {
        for (const key in params) {
            if (Array.isArray(params[key]) && !whitelist.includes(key)) {
                // Keep only the last value for non-whitelisted parameters
                params[key] = params[key][params[key].length - 1];
            }
        }
        return params;
    };
    if (req.query) {
        req.query = sanitizeParams(req.query);
    }
    if (req.body) {
        req.body = sanitizeParams(req.body);
    }
    next();
};
exports.hppProtection = hppProtection;
// Security headers middleware
const securityHeaders = (req, res, next) => {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
};
exports.securityHeaders = securityHeaders;
// CORS configuration
exports.corsOptions = {
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
};
// File upload security
exports.fileUploadSecurity = {
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
    validateFile: (req, res, next) => {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select a file to upload'
            });
        }
        // Check file size
        if (req.file.size > exports.fileUploadSecurity.maxFileSize) {
            return res.status(400).json({
                error: 'File too large',
                message: 'File size must be less than 5MB'
            });
        }
        // Check MIME type
        if (!exports.fileUploadSecurity.allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                error: 'Invalid file type',
                message: 'Only PDF, DOC, DOCX, and TXT files are allowed'
            });
        }
        // Check file extension
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
        const fileExtension = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
        if (!allowedExtensions.includes(fileExtension)) {
            return res.status(400).json({
                error: 'Invalid file extension',
                message: 'Only PDF, DOC, DOCX, and TXT files are allowed'
            });
        }
        next();
    }
};
// Request logging middleware for security monitoring
const securityLogger = (req, res, next) => {
    const startTime = Date.now();
    // Log potentially suspicious requests
    const suspiciousPatterns = [
        /\.\./, // Directory traversal
        /<script/i, // XSS attempts
        /union.*select/i, // SQL injection
        /\$where/i, // MongoDB injection
        /eval\(/i, // Code injection
    ];
    const requestData = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params
    });
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestData));
    if (isSuspicious) {
        console.warn(`[Security] Suspicious request detected:`, {
            ip: req.ip,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            body: req.body,
            query: req.query,
            timestamp: new Date().toISOString()
        });
    }
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        // Log slow requests (potential DoS)
        if (duration > 5000) {
            console.warn(`[Security] Slow request detected:`, {
                ip: req.ip,
                method: req.method,
                url: req.url,
                duration,
                statusCode: res.statusCode
            });
        }
    });
    next();
};
exports.securityLogger = securityLogger;
exports.default = {
    authRateLimit: exports.authRateLimit,
    apiRateLimit: exports.apiRateLimit,
    uploadRateLimit: exports.uploadRateLimit,
    strictRateLimit: exports.strictRateLimit,
    helmetConfig: exports.helmetConfig,
    userValidation: exports.userValidation,
    teamValidation: exports.teamValidation,
    hackathonValidation: exports.hackathonValidation,
    handleValidationErrors: exports.handleValidationErrors,
    mongoSanitizeConfig: exports.mongoSanitizeConfig,
    xssProtection: exports.xssProtection,
    hppProtection: exports.hppProtection,
    securityHeaders: exports.securityHeaders,
    corsOptions: exports.corsOptions,
    fileUploadSecurity: exports.fileUploadSecurity,
    securityLogger: exports.securityLogger
};
//# sourceMappingURL=security.js.map
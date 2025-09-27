"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const routes_1 = __importDefault(require("./routes"));
const security_1 = require("../../shared/middleware/security");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Security middleware
app.use(security_1.helmetConfig);
app.use((0, cors_1.default)(security_1.corsOptions));
app.use(security_1.securityHeaders);
app.use(security_1.securityLogger);
// Rate limiting
app.use('/api/auth', security_1.authRateLimit);
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// Routes
app.use('/api/auth', routes_1.default);
// Error handling
app.use(errorHandler_1.errorHandler);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'The requested resource was not found'
    });
});
const PORT = process.env.AUTH_SERVICE_PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Auth Service] Server running on port ${PORT}`);
    console.log(`[Auth Service] Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
//# sourceMappingURL=server.js.map
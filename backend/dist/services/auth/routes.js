"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const security_1 = require("../../shared/middleware/security");
const rbac_1 = require("../../shared/middleware/rbac");
const router = (0, express_1.Router)();
// Public routes (no authentication required)
router.post('/register', security_1.userValidation.register, security_1.handleValidationErrors, controller_1.register);
router.post('/login', security_1.userValidation.login, security_1.handleValidationErrors, controller_1.login);
router.post('/refresh-token', controller_1.refreshToken);
router.get('/verify-email/:token', controller_1.verifyEmail);
router.post('/forgot-password', security_1.strictRateLimit, controller_1.requestPasswordReset);
router.post('/reset-password', security_1.strictRateLimit, controller_1.resetPassword);
// OAuth routes
router.get('/google', controller_1.googleAuth);
router.get('/google/callback', controller_1.googleCallback);
router.get('/github', controller_1.githubAuth);
router.get('/github/callback', controller_1.githubCallback);
router.get('/linkedin', controller_1.linkedinAuth);
router.get('/linkedin/callback', controller_1.linkedinCallback);
// Protected routes (authentication required)
router.use(auth_1.authenticateToken);
router.post('/logout', controller_1.logout);
router.get('/profile', (0, rbac_1.requirePermission)(rbac_1.Permission.USER_READ, { checkOwnership: true, resourceType: 'user' }), controller_1.getProfile);
router.put('/profile', security_1.userValidation.updateProfile, security_1.handleValidationErrors, (0, rbac_1.requirePermission)(rbac_1.Permission.USER_WRITE, { checkOwnership: true, resourceType: 'user' }), controller_1.updateProfile);
router.put('/change-password', security_1.strictRateLimit, controller_1.changePassword);
// Two-factor authentication routes
router.post('/2fa/enable', security_1.strictRateLimit, controller_1.enable2FA);
router.post('/2fa/disable', security_1.strictRateLimit, controller_1.disable2FA);
router.post('/2fa/verify', security_1.authRateLimit, controller_1.verify2FA);
exports.default = router;
//# sourceMappingURL=routes.js.map
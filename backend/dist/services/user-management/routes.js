"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const validation_1 = require("../../shared/utils/validation");
const router = (0, express_1.Router)();
const userController = new controller_1.UserController();
// Public routes
router.post('/register', (0, validation_1.validateRequired)(['username', 'email', 'password', 'first_name', 'last_name']), validation_1.validateEmailField, validation_1.validatePasswordField, userController.register);
router.post('/login', (0, validation_1.validateRequired)(['email', 'password']), validation_1.validateEmailField, userController.login);
// Protected routes
router.get('/profile', auth_1.authenticateToken, userController.getProfile);
router.put('/profile', auth_1.authenticateToken, userController.updateProfile);
router.get('/:userId', auth_1.authenticateToken, userController.getUserById);
router.put('/:userId', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin', 'organizer'), userController.updateUser);
router.get('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin', 'organizer'), userController.getAllUsers);
router.delete('/:userId', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin'), userController.deleteUser);
exports.default = router;
//# sourceMappingURL=routes.js.map
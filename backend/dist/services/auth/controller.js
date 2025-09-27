"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkedinCallback = exports.linkedinAuth = exports.githubCallback = exports.githubAuth = exports.googleCallback = exports.googleAuth = exports.verify2FA = exports.disable2FA = exports.enable2FA = exports.changePassword = exports.updateProfile = exports.getProfile = exports.resetPassword = exports.requestPasswordReset = exports.verifyEmail = exports.refreshToken = exports.logout = exports.login = exports.register = void 0;
const uuid_1 = require("uuid");
const auth_1 = require("../../shared/middleware/auth");
const rbac_1 = require("../../shared/middleware/rbac");
const eventBus_1 = require("../../shared/events/eventBus");
const eventBus_2 = require("../../shared/events/eventBus");
// Mock database
const users = new Map();
// Helper function to find user by email
const findUserByEmail = (email) => {
    return Array.from(users.values()).find(user => user.email === email);
};
// Helper function to find user by username
const findUserByUsername = (username) => {
    return Array.from(users.values()).find(user => user.username === username);
};
// Register new user
const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, username } = req.body;
        // Check if user already exists
        if (findUserByEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'User already exists',
                message: 'A user with this email already exists'
            });
        }
        if (findUserByUsername(username)) {
            return res.status(400).json({
                success: false,
                error: 'Username taken',
                message: 'This username is already taken'
            });
        }
        // Hash password
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        // Create user
        const userId = (0, uuid_1.v4)();
        const user = {
            id: userId,
            email,
            username,
            firstName,
            lastName,
            password: hashedPassword,
            role: rbac_1.Role.PARTICIPANT,
            isEmailVerified: false,
            twoFactorEnabled: false,
            tokenVersion: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            oauthProviders: {}
        };
        users.set(userId, user);
        // Generate verification token
        const verificationToken = (0, auth_1.generateVerificationToken)(userId);
        // Publish user registered event
        await eventBus_1.eventBus.publish((0, eventBus_2.createUserEvent)(eventBus_1.EventType.USER_REGISTERED, userId, {
            email,
            firstName,
            lastName,
            username,
            verificationToken
        }));
        // Generate tokens
        const { accessToken, refreshToken } = (0, auth_1.generateTokens)({
            userId,
            email,
            role: user.role,
            tokenVersion: user.tokenVersion
        });
        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email for verification.',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified
                },
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });
    }
    catch (error) {
        console.error('[Auth] Registration failed:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Registration failed'
        });
    }
};
exports.register = register;
// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user
        const user = findUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Invalid email or password'
            });
        }
        // Verify password
        const isPasswordValid = await (0, auth_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Invalid email or password'
            });
        }
        // Update last login
        user.lastLoginAt = new Date();
        user.updatedAt = new Date();
        // Generate tokens
        const { accessToken, refreshToken } = (0, auth_1.generateTokens)({
            userId: user.id,
            email: user.email,
            role: user.role,
            tokenVersion: user.tokenVersion
        });
        // Publish login event
        await eventBus_1.eventBus.publish((0, eventBus_2.createUserEvent)(eventBus_1.EventType.USER_LOGIN, user.id, {
            email: user.email,
            loginTime: user.lastLoginAt
        }));
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    twoFactorEnabled: user.twoFactorEnabled
                },
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });
    }
    catch (error) {
        console.error('[Auth] Login failed:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Login failed'
        });
    }
};
exports.login = login;
// Logout user
const logout = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (userId) {
            // Increment token version to invalidate all existing tokens
            const user = users.get(userId);
            if (user) {
                user.tokenVersion += 1;
                user.updatedAt = new Date();
                // Publish logout event
                await eventBus_1.eventBus.publish((0, eventBus_2.createUserEvent)(eventBus_1.EventType.USER_LOGOUT, userId, {
                    logoutTime: new Date()
                }));
            }
        }
        res.json({
            success: true,
            message: 'Logout successful'
        });
    }
    catch (error) {
        console.error('[Auth] Logout failed:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Logout failed'
        });
    }
};
exports.logout = logout;
// Refresh access token
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token required',
                message: 'Please provide a refresh token'
            });
        }
        // Verify refresh token
        const decoded = await (0, auth_1.verifyRefreshToken)(refreshToken);
        const user = users.get(decoded.userId);
        if (!user || user.tokenVersion !== decoded.tokenVersion) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token',
                message: 'Refresh token is invalid or expired'
            });
        }
        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = (0, auth_1.generateTokens)({
            userId: user.id,
            email: user.email,
            role: user.role,
            tokenVersion: user.tokenVersion
        });
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                tokens: {
                    accessToken,
                    refreshToken: newRefreshToken
                }
            }
        });
    }
    catch (error) {
        console.error('[Auth] Token refresh failed:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid refresh token',
            message: 'Token refresh failed'
        });
    }
};
exports.refreshToken = refreshToken;
// Verify email
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = (0, auth_1.verifyEmailToken)(token);
        if (!decoded) {
            return res.status(400).json({
                success: false,
                error: 'Invalid token',
                message: 'Email verification token is invalid or expired'
            });
        }
        const user = users.get(decoded.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: 'User not found'
            });
        }
        // Mark email as verified
        user.isEmailVerified = true;
        user.updatedAt = new Date();
        res.json({
            success: true,
            message: 'Email verified successfully'
        });
    }
    catch (error) {
        console.error('[Auth] Email verification failed:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Email verification failed'
        });
    }
};
exports.verifyEmail = verifyEmail;
// Request password reset
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = findUserByEmail(email);
        if (!user) {
            // Don't reveal if email exists
            return res.json({
                success: true,
                message: 'If the email exists, a password reset link has been sent'
            });
        }
        const resetToken = (0, auth_1.generatePasswordResetToken)(user.id);
        // In production, send email with reset link
        console.log(`[Auth] Password reset token for ${email}: ${resetToken}`);
        res.json({
            success: true,
            message: 'If the email exists, a password reset link has been sent'
        });
    }
    catch (error) {
        console.error('[Auth] Password reset request failed:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Password reset request failed'
        });
    }
};
exports.requestPasswordReset = requestPasswordReset;
// Reset password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const decoded = (0, auth_1.verifyPasswordResetToken)(token);
        if (!decoded) {
            return res.status(400).json({
                success: false,
                error: 'Invalid token',
                message: 'Password reset token is invalid or expired'
            });
        }
        const user = users.get(decoded.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: 'User not found'
            });
        }
        // Hash new password
        const hashedPassword = await (0, auth_1.hashPassword)(newPassword);
        user.password = hashedPassword;
        user.tokenVersion += 1; // Invalidate all existing tokens
        user.updatedAt = new Date();
        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    }
    catch (error) {
        console.error('[Auth] Password reset failed:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Password reset failed'
        });
    }
};
exports.resetPassword = resetPassword;
// Get user profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = users.get(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    twoFactorEnabled: user.twoFactorEnabled,
                    createdAt: user.createdAt,
                    lastLoginAt: user.lastLoginAt,
                    oauthProviders: Object.keys(user.oauthProviders)
                }
            }
        });
    }
    catch (error) {
        console.error('[Auth] Get profile failed:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to get profile'
        });
    }
};
exports.getProfile = getProfile;
// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = users.get(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: 'User not found'
            });
        }
        const { firstName, lastName, username } = req.body;
        // Check if username is taken by another user
        if (username && username !== user.username) {
            const existingUser = findUserByUsername(username);
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({
                    success: false,
                    error: 'Username taken',
                    message: 'This username is already taken'
                });
            }
        }
        // Update user
        if (firstName !== undefined)
            user.firstName = firstName;
        if (lastName !== undefined)
            user.lastName = lastName;
        if (username !== undefined)
            user.username = username;
        user.updatedAt = new Date();
        // Publish profile updated event
        await eventBus_1.eventBus.publish((0, eventBus_2.createUserEvent)(eventBus_1.EventType.USER_PROFILE_UPDATED, userId, {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username
        }));
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                }
            }
        });
    }
    catch (error) {
        console.error('[Auth] Update profile failed:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to update profile'
        });
    }
};
exports.updateProfile = updateProfile;
// Change password
const changePassword = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { currentPassword, newPassword } = req.body;
        const user = users.get(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: 'User not found'
            });
        }
        // Verify current password
        const isCurrentPasswordValid = await (0, auth_1.comparePassword)(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid password',
                message: 'Current password is incorrect'
            });
        }
        // Hash new password
        const hashedPassword = await (0, auth_1.hashPassword)(newPassword);
        user.password = hashedPassword;
        user.tokenVersion += 1; // Invalidate all existing tokens
        user.updatedAt = new Date();
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('[Auth] Change password failed:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to change password'
        });
    }
};
exports.changePassword = changePassword;
// Placeholder implementations for 2FA and OAuth
const enable2FA = async (req, res) => {
    res.json({ success: true, message: '2FA feature coming soon' });
};
exports.enable2FA = enable2FA;
const disable2FA = async (req, res) => {
    res.json({ success: true, message: '2FA feature coming soon' });
};
exports.disable2FA = disable2FA;
const verify2FA = async (req, res) => {
    res.json({ success: true, message: '2FA feature coming soon' });
};
exports.verify2FA = verify2FA;
const googleAuth = async (req, res) => {
    const authUrl = (0, auth_1.getGoogleAuthUrl)();
    res.redirect(authUrl);
};
exports.googleAuth = googleAuth;
const googleCallback = async (req, res) => {
    res.json({ success: true, message: 'Google OAuth callback - implementation in progress' });
};
exports.googleCallback = googleCallback;
const githubAuth = async (req, res) => {
    const authUrl = (0, auth_1.getGitHubAuthUrl)();
    res.redirect(authUrl);
};
exports.githubAuth = githubAuth;
const githubCallback = async (req, res) => {
    res.json({ success: true, message: 'GitHub OAuth callback - implementation in progress' });
};
exports.githubCallback = githubCallback;
const linkedinAuth = async (req, res) => {
    const authUrl = (0, auth_1.getLinkedInAuthUrl)();
    res.redirect(authUrl);
};
exports.linkedinAuth = linkedinAuth;
const linkedinCallback = async (req, res) => {
    res.json({ success: true, message: 'LinkedIn OAuth callback - implementation in progress' });
};
exports.linkedinCallback = linkedinCallback;
//# sourceMappingURL=controller.js.map
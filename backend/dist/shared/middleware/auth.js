"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPasswordResetToken = exports.generatePasswordResetToken = exports.verifyEmailToken = exports.generateVerificationToken = exports.getGitHubUserInfo = exports.getGoogleUserInfo = exports.exchangeGitHubCode = exports.exchangeGoogleCode = exports.getLinkedInAuthUrl = exports.getGitHubAuthUrl = exports.getGoogleAuthUrl = exports.verifyOAuthState = exports.generateOAuthState = exports.verifyRefreshToken = exports.authorizeRoles = exports.optionalAuth = exports.authenticateToken = exports.comparePassword = exports.hashPassword = exports.generateTokens = exports.oauthProviders = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
// OAuth provider configurations
exports.oauthProviders = {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        scope: 'openid profile email'
    },
    github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: process.env.GITHUB_REDIRECT_URI,
        scope: 'user:email'
    },
    linkedin: {
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        redirectUri: process.env.LINKEDIN_REDIRECT_URI,
        scope: 'r_liteprofile r_emailaddress'
    }
};
// Token generation utilities
const generateTokens = (payload) => {
    const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'hackmatch-platform',
        audience: 'hackmatch-users'
    });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: payload.userId, tokenVersion: payload.tokenVersion || 0 }, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'hackmatch-platform',
        audience: 'hackmatch-users'
    });
    return { accessToken, refreshToken };
};
exports.generateTokens = generateTokens;
// Password utilities
const hashPassword = async (password) => {
    const saltRounds = 12;
    return bcrypt_1.default.hash(password, saltRounds);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hashedPassword) => {
    return bcrypt_1.default.compare(password, hashedPassword);
};
exports.comparePassword = comparePassword;
// JWT verification middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Access token required'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET, {
            issuer: 'hackmatch-platform',
            audience: 'hackmatch-users'
        });
        // In a real implementation, you might want to check if the user still exists
        // and if their token version is still valid
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                message: 'Access token has expired'
            });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'Access token is invalid'
            });
        }
        else {
            console.error('[Auth] Token verification failed:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Token verification failed'
            });
        }
    }
};
exports.authenticateToken = authenticateToken;
// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET, {
                issuer: 'hackmatch-platform',
                audience: 'hackmatch-users'
            });
            req.user = decoded;
        }
        next();
    }
    catch (error) {
        // Silently fail for optional auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Legacy role authorization (for backward compatibility)
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
            });
            return;
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
// Refresh token verification
const verifyRefreshToken = (refreshToken) => {
    return new Promise((resolve, reject) => {
        jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET, {
            issuer: 'hackmatch-platform',
            audience: 'hackmatch-users'
        }, (error, decoded) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(decoded);
            }
        });
    });
};
exports.verifyRefreshToken = verifyRefreshToken;
// OAuth state generation and verification
const generateOAuthState = () => {
    return jsonwebtoken_1.default.sign({ timestamp: Date.now() }, JWT_SECRET, { expiresIn: '10m' });
};
exports.generateOAuthState = generateOAuthState;
const verifyOAuthState = (state) => {
    try {
        jsonwebtoken_1.default.verify(state, JWT_SECRET);
        return true;
    }
    catch {
        return false;
    }
};
exports.verifyOAuthState = verifyOAuthState;
// Google OAuth helper
const getGoogleAuthUrl = () => {
    const { clientId, redirectUri, scope } = exports.oauthProviders.google;
    const state = (0, exports.generateOAuthState)();
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope,
        state,
        access_type: 'offline',
        prompt: 'consent'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};
exports.getGoogleAuthUrl = getGoogleAuthUrl;
// GitHub OAuth helper
const getGitHubAuthUrl = () => {
    const { clientId, redirectUri, scope } = exports.oauthProviders.github;
    const state = (0, exports.generateOAuthState)();
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        state
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
};
exports.getGitHubAuthUrl = getGitHubAuthUrl;
// LinkedIn OAuth helper
const getLinkedInAuthUrl = () => {
    const { clientId, redirectUri, scope } = exports.oauthProviders.linkedin;
    const state = (0, exports.generateOAuthState)();
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
};
exports.getLinkedInAuthUrl = getLinkedInAuthUrl;
// OAuth token exchange helpers
const exchangeGoogleCode = async (code) => {
    const { clientId, clientSecret, redirectUri } = exports.oauthProviders.google;
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
        })
    });
    if (!response.ok) {
        throw new Error('Failed to exchange Google OAuth code');
    }
    return response.json();
};
exports.exchangeGoogleCode = exchangeGoogleCode;
const exchangeGitHubCode = async (code) => {
    const { clientId, clientSecret } = exports.oauthProviders.github;
    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code
        })
    });
    if (!response.ok) {
        throw new Error('Failed to exchange GitHub OAuth code');
    }
    return response.json();
};
exports.exchangeGitHubCode = exchangeGitHubCode;
// OAuth user info fetchers
const getGoogleUserInfo = async (accessToken) => {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
    if (!response.ok) {
        throw new Error('Failed to fetch Google user info');
    }
    return response.json();
};
exports.getGoogleUserInfo = getGoogleUserInfo;
const getGitHubUserInfo = async (accessToken) => {
    const [userResponse, emailResponse] = await Promise.all([
        fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` }
        }),
        fetch('https://api.github.com/user/emails', {
            headers: { Authorization: `token ${accessToken}` }
        })
    ]);
    if (!userResponse.ok || !emailResponse.ok) {
        throw new Error('Failed to fetch GitHub user info');
    }
    const user = await userResponse.json();
    const emails = await emailResponse.json();
    const primaryEmail = emails.find((email) => email.primary);
    return {
        ...user,
        email: primaryEmail?.email || user.email
    };
};
exports.getGitHubUserInfo = getGitHubUserInfo;
// Account verification
const generateVerificationToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId, type: 'email_verification' }, JWT_SECRET, { expiresIn: '24h' });
};
exports.generateVerificationToken = generateVerificationToken;
const verifyEmailToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded.type === 'email_verification' ? decoded : null;
    }
    catch {
        return null;
    }
};
exports.verifyEmailToken = verifyEmailToken;
// Password reset
const generatePasswordResetToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
};
exports.generatePasswordResetToken = generatePasswordResetToken;
const verifyPasswordResetToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded.type === 'password_reset' ? decoded : null;
    }
    catch {
        return null;
    }
};
exports.verifyPasswordResetToken = verifyPasswordResetToken;
exports.default = {
    authenticateToken: exports.authenticateToken,
    optionalAuth: exports.optionalAuth,
    authorizeRoles: exports.authorizeRoles,
    generateTokens: exports.generateTokens,
    verifyRefreshToken: exports.verifyRefreshToken,
    hashPassword: exports.hashPassword,
    comparePassword: exports.comparePassword,
    generateOAuthState: exports.generateOAuthState,
    verifyOAuthState: exports.verifyOAuthState,
    getGoogleAuthUrl: exports.getGoogleAuthUrl,
    getGitHubAuthUrl: exports.getGitHubAuthUrl,
    getLinkedInAuthUrl: exports.getLinkedInAuthUrl,
    exchangeGoogleCode: exports.exchangeGoogleCode,
    exchangeGitHubCode: exports.exchangeGitHubCode,
    getGoogleUserInfo: exports.getGoogleUserInfo,
    getGitHubUserInfo: exports.getGitHubUserInfo,
    generateVerificationToken: exports.generateVerificationToken,
    verifyEmailToken: exports.verifyEmailToken,
    generatePasswordResetToken: exports.generatePasswordResetToken,
    verifyPasswordResetToken: exports.verifyPasswordResetToken
};
//# sourceMappingURL=auth.js.map
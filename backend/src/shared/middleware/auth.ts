import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { Request, Response, NextFunction } from 'express'
import { JwtPayload } from '../types'
import { Role } from './rbac'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { permissions?: string[] }
}

// OAuth provider configurations
export const oauthProviders = {
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
}

// Token generation utilities
export const generateTokens = (payload: JwtPayload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'unified-hackathon-platform',
    audience: 'unified-hackathon-users'
  })

  const refreshToken = jwt.sign(
    { userId: payload.userId, tokenVersion: payload.tokenVersion || 0 },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'unified-hackathon-platform',
      audience: 'unified-hackathon-users'
    }
  )

  return { accessToken, refreshToken }
}

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

// JWT verification middleware
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Access token required'
      })
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'unified-hackathon-platform',
      audience: 'unified-hackathon-users'
    }) as JwtPayload

    // In a real implementation, you might want to check if the user still exists
    // and if their token version is still valid
    req.user = decoded
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Access token has expired'
      })
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Access token is invalid'
      })
    } else {
      console.error('[Auth] Token verification failed:', error)
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Token verification failed'
      })
    }
  }
}

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'unified-hackathon-platform',
        audience: 'unified-hackathon-users'
      }) as JwtPayload
      req.user = decoded
    }
    
    next()
  } catch (error) {
    // Silently fail for optional auth
    next()
  }
}

// Legacy role authorization (for backward compatibility)
export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
      return
    }

    next()
  }
}

// Refresh token verification
export const verifyRefreshToken = (refreshToken: string): Promise<JwtPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
      issuer: 'unified-hackathon-platform',
      audience: 'unified-hackathon-users'
    }, (error, decoded) => {
      if (error) {
        reject(error)
      } else {
        resolve(decoded as JwtPayload)
      }
    })
  })
}

// OAuth state generation and verification
export const generateOAuthState = (): string => {
  return jwt.sign(
    { timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: '10m' }
  )
}

export const verifyOAuthState = (state: string): boolean => {
  try {
    jwt.verify(state, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

// Google OAuth helper
export const getGoogleAuthUrl = (): string => {
  const { clientId, redirectUri, scope } = oauthProviders.google
  const state = generateOAuthState()
  
  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri!,
    response_type: 'code',
    scope,
    state,
    access_type: 'offline',
    prompt: 'consent'
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// GitHub OAuth helper
export const getGitHubAuthUrl = (): string => {
  const { clientId, redirectUri, scope } = oauthProviders.github
  const state = generateOAuthState()
  
  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri!,
    scope,
    state
  })

  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

// LinkedIn OAuth helper
export const getLinkedInAuthUrl = (): string => {
  const { clientId, redirectUri, scope } = oauthProviders.linkedin
  const state = generateOAuthState()
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId!,
    redirect_uri: redirectUri!,
    state,
    scope
  })

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
}

// OAuth token exchange helpers
export const exchangeGoogleCode = async (code: string): Promise<any> => {
  const { clientId, clientSecret, redirectUri } = oauthProviders.google
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri!
    })
  })

  if (!response.ok) {
    throw new Error('Failed to exchange Google OAuth code')
  }

  return response.json()
}

export const exchangeGitHubCode = async (code: string): Promise<any> => {
  const { clientId, clientSecret } = oauthProviders.github
  
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
  })

  if (!response.ok) {
    throw new Error('Failed to exchange GitHub OAuth code')
  }

  return response.json()
}

// OAuth user info fetchers
export const getGoogleUserInfo = async (accessToken: string): Promise<any> => {
  const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch Google user info')
  }

  return response.json()
}

export const getGitHubUserInfo = async (accessToken: string): Promise<any> => {
  const [userResponse, emailResponse] = await Promise.all([
    fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` }
    }),
    fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `token ${accessToken}` }
    })
  ])

  if (!userResponse.ok || !emailResponse.ok) {
    throw new Error('Failed to fetch GitHub user info')
  }

  const user = await userResponse.json()
  const emails = await emailResponse.json()
  const primaryEmail = emails.find((email: any) => email.primary)

  return {
    ...user,
    email: primaryEmail?.email || user.email
  }
}

// Account verification
export const generateVerificationToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'email_verification' },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

export const verifyEmailToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return decoded.type === 'email_verification' ? decoded : null
  } catch {
    return null
  }
}

// Password reset
export const generatePasswordResetToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'password_reset' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

export const verifyPasswordResetToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return decoded.type === 'password_reset' ? decoded : null
  } catch {
    return null
  }
}

export default {
  authenticateToken,
  optionalAuth,
  authorizeRoles,
  generateTokens,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  generateOAuthState,
  verifyOAuthState,
  getGoogleAuthUrl,
  getGitHubAuthUrl,
  getLinkedInAuthUrl,
  exchangeGoogleCode,
  exchangeGitHubCode,
  getGoogleUserInfo,
  getGitHubUserInfo,
  generateVerificationToken,
  verifyEmailToken,
  generatePasswordResetToken,
  verifyPasswordResetToken
}


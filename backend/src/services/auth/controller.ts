import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { 
  generateTokens,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  generateVerificationToken,
  verifyEmailToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  getGoogleAuthUrl,
  getGitHubAuthUrl,
  getLinkedInAuthUrl,
  exchangeGoogleCode,
  exchangeGitHubCode,
  getGoogleUserInfo,
  getGitHubUserInfo,
  verifyOAuthState
} from '../../shared/middleware/auth'
import { AuthenticatedRequest } from '../../shared/middleware/auth'
import { Role } from '../../shared/middleware/rbac'
import { eventBus, EventType } from '../../shared/events/eventBus'
import { createUserEvent } from '../../shared/events/eventBus'

// Mock user database (in production, use PostgreSQL)
interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  password: string
  role: Role
  isEmailVerified: boolean
  twoFactorEnabled: boolean
  twoFactorSecret?: string
  tokenVersion: number
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
  oauthProviders: {
    google?: { id: string; email: string }
    github?: { id: string; username: string }
    linkedin?: { id: string; name: string }
  }
}

// Mock database
const users: Map<string, User> = new Map()

// Helper function to find user by email
const findUserByEmail = (email: string): User | undefined => {
  return Array.from(users.values()).find(user => user.email === email)
}

// Helper function to find user by username
const findUserByUsername = (username: string): User | undefined => {
  return Array.from(users.values()).find(user => user.username === username)
}

// Register new user
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, username } = req.body

    // Check if user already exists
    if (findUserByEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email already exists'
      })
    }

    if (findUserByUsername(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username taken',
        message: 'This username is already taken'
      })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const userId = uuidv4()
    const user: User = {
      id: userId,
      email,
      username,
      firstName,
      lastName,
      password: hashedPassword,
      role: Role.PARTICIPANT,
      isEmailVerified: false,
      twoFactorEnabled: false,
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      oauthProviders: {}
    }

    users.set(userId, user)

    // Generate verification token
    const verificationToken = generateVerificationToken(userId)

    // Publish user registered event
    await eventBus.publish(createUserEvent(
      EventType.USER_REGISTERED,
      userId,
      {
        email,
        firstName,
        lastName,
        username,
        verificationToken
      }
    ))

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId,
      email,
      role: user.role,
      tokenVersion: user.tokenVersion
    })

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
    })
  } catch (error) {
    console.error('[Auth] Registration failed:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Registration failed'
    })
  }
}

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = findUserByEmail(email)
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      })
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      })
    }

    // Update last login
    user.lastLoginAt = new Date()
    user.updatedAt = new Date()

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion
    })

    // Publish login event
    await eventBus.publish(createUserEvent(
      EventType.USER_LOGIN,
      user.id,
      {
        email: user.email,
        loginTime: user.lastLoginAt
      }
    ))

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
    })
  } catch (error) {
    console.error('[Auth] Login failed:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Login failed'
    })
  }
}

// Logout user
export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId

    if (userId) {
      // Increment token version to invalidate all existing tokens
      const user = users.get(userId)
      if (user) {
        user.tokenVersion += 1
        user.updatedAt = new Date()

        // Publish logout event
        await eventBus.publish(createUserEvent(
          EventType.USER_LOGOUT,
          userId,
          {
            logoutTime: new Date()
          }
        ))
      }
    }

    res.json({
      success: true,
      message: 'Logout successful'
    })
  } catch (error) {
    console.error('[Auth] Logout failed:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Logout failed'
    })
  }
}

// Refresh access token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required',
        message: 'Please provide a refresh token'
      })
    }

    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken)
    const user = users.get(decoded.userId)

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired'
      })
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion
    })

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      }
    })
  } catch (error) {
    console.error('[Auth] Token refresh failed:', error)
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
      message: 'Token refresh failed'
    })
  }
}

// Verify email
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params

    const decoded = verifyEmailToken(token)
    if (!decoded) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token',
        message: 'Email verification token is invalid or expired'
      })
    }

    const user = users.get(decoded.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      })
    }

    // Mark email as verified
    user.isEmailVerified = true
    user.updatedAt = new Date()

    res.json({
      success: true,
      message: 'Email verified successfully'
    })
  } catch (error) {
    console.error('[Auth] Email verification failed:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Email verification failed'
    })
  }
}

// Request password reset
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    const user = findUserByEmail(email)
    if (!user) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      })
    }

    const resetToken = generatePasswordResetToken(user.id)

    // In production, send email with reset link
    console.log(`[Auth] Password reset token for ${email}: ${resetToken}`)

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    })
  } catch (error) {
    console.error('[Auth] Password reset request failed:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Password reset request failed'
    })
  }
}

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body

    const decoded = verifyPasswordResetToken(token)
    if (!decoded) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token',
        message: 'Password reset token is invalid or expired'
      })
    }

    const user = users.get(decoded.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      })
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)
    user.password = hashedPassword
    user.tokenVersion += 1 // Invalidate all existing tokens
    user.updatedAt = new Date()

    res.json({
      success: true,
      message: 'Password reset successfully'
    })
  } catch (error) {
    console.error('[Auth] Password reset failed:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Password reset failed'
    })
  }
}

// Get user profile
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    const user = users.get(userId!)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      })
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
    })
  } catch (error) {
    console.error('[Auth] Get profile failed:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get profile'
    })
  }
}

// Update user profile
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    const user = users.get(userId!)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      })
    }

    const { firstName, lastName, username } = req.body

    // Check if username is taken by another user
    if (username && username !== user.username) {
      const existingUser = findUserByUsername(username)
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          error: 'Username taken',
          message: 'This username is already taken'
        })
      }
    }

    // Update user
    if (firstName !== undefined) user.firstName = firstName
    if (lastName !== undefined) user.lastName = lastName
    if (username !== undefined) user.username = username
    user.updatedAt = new Date()

    // Publish profile updated event
    await eventBus.publish(createUserEvent(
      EventType.USER_PROFILE_UPDATED,
      userId!,
      {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username
      }
    ))

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
    })
  } catch (error) {
    console.error('[Auth] Update profile failed:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update profile'
    })
  }
}

// Change password
export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    const { currentPassword, newPassword } = req.body
    const user = users.get(userId!)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      })
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password',
        message: 'Current password is incorrect'
      })
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)
    user.password = hashedPassword
    user.tokenVersion += 1 // Invalidate all existing tokens
    user.updatedAt = new Date()

    res.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('[Auth] Change password failed:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to change password'
    })
  }
}

// Placeholder implementations for 2FA and OAuth
export const enable2FA = async (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: '2FA feature coming soon' })
}

export const disable2FA = async (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: '2FA feature coming soon' })
}

export const verify2FA = async (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: '2FA feature coming soon' })
}

export const googleAuth = async (req: Request, res: Response) => {
  const authUrl = getGoogleAuthUrl()
  res.redirect(authUrl)
}

export const googleCallback = async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Google OAuth callback - implementation in progress' })
}

export const githubAuth = async (req: Request, res: Response) => {
  const authUrl = getGitHubAuthUrl()
  res.redirect(authUrl)
}

export const githubCallback = async (req: Request, res: Response) => {
  res.json({ success: true, message: 'GitHub OAuth callback - implementation in progress' })
}

export const linkedinAuth = async (req: Request, res: Response) => {
  const authUrl = getLinkedInAuthUrl()
  res.redirect(authUrl)
}

export const linkedinCallback = async (req: Request, res: Response) => {
  res.json({ success: true, message: 'LinkedIn OAuth callback - implementation in progress' })
}


import { Router } from 'express'
import { 
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  enable2FA,
  disable2FA,
  verify2FA,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
  linkedinAuth,
  linkedinCallback
} from './controller'
import { authenticateToken, optionalAuth } from '../../shared/middleware/auth'
import { userValidation, handleValidationErrors, authRateLimit, strictRateLimit } from '../../shared/middleware/security'
import { requirePermission, Permission } from '../../shared/middleware/rbac'

const router = Router()

// Public routes (no authentication required)
router.post('/register', 
  userValidation.register,
  handleValidationErrors,
  register
)

router.post('/login',
  userValidation.login,
  handleValidationErrors,
  login
)

router.post('/refresh-token', refreshToken)

router.get('/verify-email/:token', verifyEmail)

router.post('/forgot-password',
  strictRateLimit,
  requestPasswordReset
)

router.post('/reset-password',
  strictRateLimit,
  resetPassword
)

// OAuth routes
router.get('/google', googleAuth)
router.get('/google/callback', googleCallback)
router.get('/github', githubAuth)
router.get('/github/callback', githubCallback)
router.get('/linkedin', linkedinAuth)
router.get('/linkedin/callback', linkedinCallback)

// Protected routes (authentication required)
router.use(authenticateToken)

router.post('/logout', logout)

router.get('/profile', 
  requirePermission(Permission.USER_READ, { checkOwnership: true, resourceType: 'user' }),
  getProfile
)

router.put('/profile',
  userValidation.updateProfile,
  handleValidationErrors,
  requirePermission(Permission.USER_WRITE, { checkOwnership: true, resourceType: 'user' }),
  updateProfile
)

router.put('/change-password',
  strictRateLimit,
  changePassword
)

// Two-factor authentication routes
router.post('/2fa/enable',
  strictRateLimit,
  enable2FA
)

router.post('/2fa/disable',
  strictRateLimit,
  disable2FA
)

router.post('/2fa/verify',
  authRateLimit,
  verify2FA
)

export default router


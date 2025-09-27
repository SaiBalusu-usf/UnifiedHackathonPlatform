import { Request, Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../types'

// Define roles and permissions
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  ORGANIZER = 'organizer',
  MENTOR = 'mentor',
  PARTICIPANT = 'participant',
  GUEST = 'guest'
}

export enum Permission {
  // User permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  USER_ADMIN = 'user:admin',

  // Team permissions
  TEAM_READ = 'team:read',
  TEAM_WRITE = 'team:write',
  TEAM_DELETE = 'team:delete',
  TEAM_MANAGE_MEMBERS = 'team:manage_members',
  TEAM_ADMIN = 'team:admin',

  // Hackathon permissions
  HACKATHON_READ = 'hackathon:read',
  HACKATHON_WRITE = 'hackathon:write',
  HACKATHON_DELETE = 'hackathon:delete',
  HACKATHON_MANAGE = 'hackathon:manage',
  HACKATHON_ADMIN = 'hackathon:admin',

  // Resume permissions
  RESUME_READ = 'resume:read',
  RESUME_WRITE = 'resume:write',
  RESUME_DELETE = 'resume:delete',
  RESUME_ADMIN = 'resume:admin',

  // Tracking permissions
  TRACKING_READ = 'tracking:read',
  TRACKING_WRITE = 'tracking:write',
  TRACKING_ADMIN = 'tracking:admin',

  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_MONITOR = 'system:monitor',
  SYSTEM_LOGS = 'system:logs',

  // Agent permissions
  AGENT_READ = 'agent:read',
  AGENT_CONTROL = 'agent:control',
  AGENT_ADMIN = 'agent:admin'
}

// Role-permission mapping
const rolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    // All permissions
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_DELETE,
    Permission.USER_ADMIN,
    Permission.TEAM_READ,
    Permission.TEAM_WRITE,
    Permission.TEAM_DELETE,
    Permission.TEAM_MANAGE_MEMBERS,
    Permission.TEAM_ADMIN,
    Permission.HACKATHON_READ,
    Permission.HACKATHON_WRITE,
    Permission.HACKATHON_DELETE,
    Permission.HACKATHON_MANAGE,
    Permission.HACKATHON_ADMIN,
    Permission.RESUME_READ,
    Permission.RESUME_WRITE,
    Permission.RESUME_DELETE,
    Permission.RESUME_ADMIN,
    Permission.TRACKING_READ,
    Permission.TRACKING_WRITE,
    Permission.TRACKING_ADMIN,
    Permission.SYSTEM_ADMIN,
    Permission.SYSTEM_MONITOR,
    Permission.SYSTEM_LOGS,
    Permission.AGENT_READ,
    Permission.AGENT_CONTROL,
    Permission.AGENT_ADMIN
  ],

  [Role.ADMIN]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.TEAM_READ,
    Permission.TEAM_WRITE,
    Permission.TEAM_DELETE,
    Permission.TEAM_MANAGE_MEMBERS,
    Permission.HACKATHON_READ,
    Permission.HACKATHON_WRITE,
    Permission.HACKATHON_MANAGE,
    Permission.RESUME_READ,
    Permission.RESUME_ADMIN,
    Permission.TRACKING_READ,
    Permission.TRACKING_ADMIN,
    Permission.SYSTEM_MONITOR,
    Permission.AGENT_READ,
    Permission.AGENT_CONTROL
  ],

  [Role.ORGANIZER]: [
    Permission.USER_READ,
    Permission.TEAM_READ,
    Permission.TEAM_WRITE,
    Permission.HACKATHON_READ,
    Permission.HACKATHON_WRITE,
    Permission.HACKATHON_MANAGE,
    Permission.RESUME_READ,
    Permission.TRACKING_READ,
    Permission.TRACKING_WRITE,
    Permission.AGENT_READ
  ],

  [Role.MENTOR]: [
    Permission.USER_READ,
    Permission.TEAM_READ,
    Permission.HACKATHON_READ,
    Permission.RESUME_READ,
    Permission.TRACKING_READ
  ],

  [Role.PARTICIPANT]: [
    Permission.USER_READ,
    Permission.USER_WRITE, // Own profile only
    Permission.TEAM_READ,
    Permission.TEAM_WRITE, // Own teams only
    Permission.HACKATHON_READ,
    Permission.RESUME_READ, // Own resume only
    Permission.RESUME_WRITE, // Own resume only
    Permission.TRACKING_READ, // Own tracking only
    Permission.TRACKING_WRITE // Own tracking only
  ],

  [Role.GUEST]: [
    Permission.HACKATHON_READ
  ]
}

// Resource ownership interface
interface ResourceOwnership {
  userId?: string
  teamId?: string
  hackathonId?: string
  organizerId?: string
}

// RBAC middleware factory
export function requirePermission(permission: Permission, options: {
  checkOwnership?: boolean
  resourceType?: 'user' | 'team' | 'hackathon' | 'resume' | 'tracking'
  resourceIdParam?: string
} = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        })
      }

      const userRole = req.user.role as Role
      const userId = req.user.userId
      const userPermissions = rolePermissions[userRole] || []

      // Check if user has the required permission
      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        })
      }

      // Check resource ownership if required
      if (options.checkOwnership && options.resourceType) {
        const hasOwnership = await checkResourceOwnership(
          req,
          userId,
          options.resourceType,
          options.resourceIdParam || 'id'
        )

        if (!hasOwnership) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only access your own resources'
          })
        }
      }

      next()
    } catch (error) {
      console.error('[RBAC] Permission check failed:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Permission check failed'
      })
    }
  }
}

// Role requirement middleware
export function requireRole(roles: Role | Role[]) {
  const requiredRoles = Array.isArray(roles) ? roles : [roles]
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    const userRole = req.user.role as Role
    
    if (!requiredRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required role: ${requiredRoles.join(' or ')}`
      })
    }

    next()
  }
}

// Check if user owns or has access to a resource
async function checkResourceOwnership(
  req: AuthenticatedRequest,
  userId: string,
  resourceType: string,
  resourceIdParam: string
): Promise<boolean> {
  const resourceId = req.params[resourceIdParam]
  
  if (!resourceId) {
    return false
  }

  try {
    switch (resourceType) {
      case 'user':
        // User can access their own profile
        return resourceId === userId

      case 'team':
        // Check if user is a member of the team
        return await checkTeamMembership(userId, resourceId)

      case 'hackathon':
        // Check if user is registered for the hackathon or is an organizer
        return await checkHackathonAccess(userId, resourceId)

      case 'resume':
        // Check if the resume belongs to the user
        return await checkResumeOwnership(userId, resourceId)

      case 'tracking':
        // Check if the tracking data belongs to the user or their team
        return await checkTrackingAccess(userId, resourceId)

      default:
        return false
    }
  } catch (error) {
    console.error(`[RBAC] Error checking ownership for ${resourceType}:`, error)
    return false
  }
}

// Helper functions for ownership checks
async function checkTeamMembership(userId: string, teamId: string): Promise<boolean> {
  // In a real implementation, this would query the database
  // For now, we'll return true as a placeholder
  console.log(`[RBAC] Checking team membership: user ${userId}, team ${teamId}`)
  return true
}

async function checkHackathonAccess(userId: string, hackathonId: string): Promise<boolean> {
  // In a real implementation, this would check if user is registered or is an organizer
  console.log(`[RBAC] Checking hackathon access: user ${userId}, hackathon ${hackathonId}`)
  return true
}

async function checkResumeOwnership(userId: string, resumeId: string): Promise<boolean> {
  // In a real implementation, this would query the resume database
  console.log(`[RBAC] Checking resume ownership: user ${userId}, resume ${resumeId}`)
  return true
}

async function checkTrackingAccess(userId: string, trackingId: string): Promise<boolean> {
  // In a real implementation, this would check if tracking belongs to user or their team
  console.log(`[RBAC] Checking tracking access: user ${userId}, tracking ${trackingId}`)
  return true
}

// Team-specific permissions
export function requireTeamRole(teamRoles: string | string[]) {
  const requiredRoles = Array.isArray(teamRoles) ? teamRoles : [teamRoles]
  
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    const teamId = req.params.teamId || req.body.teamId
    if (!teamId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Team ID required'
      })
    }

    try {
      // In a real implementation, this would query the database for user's role in the team
      const userTeamRole = await getUserTeamRole(req.user.userId, teamId)
      
      if (!userTeamRole || !requiredRoles.includes(userTeamRole)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Required team role: ${requiredRoles.join(' or ')}`
        })
      }

      next()
    } catch (error) {
      console.error('[RBAC] Team role check failed:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Team role check failed'
      })
    }
  }
}

async function getUserTeamRole(userId: string, teamId: string): Promise<string | null> {
  // In a real implementation, this would query the database
  // For now, return 'member' as a placeholder
  console.log(`[RBAC] Getting team role: user ${userId}, team ${teamId}`)
  return 'member'
}

// Hackathon-specific permissions
export function requireHackathonRole(hackathonRoles: string | string[]) {
  const requiredRoles = Array.isArray(hackathonRoles) ? hackathonRoles : [hackathonRoles]
  
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    const hackathonId = req.params.hackathonId || req.body.hackathonId
    if (!hackathonId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Hackathon ID required'
      })
    }

    try {
      const userHackathonRole = await getUserHackathonRole(req.user.userId, hackathonId)
      
      if (!userHackathonRole || !requiredRoles.includes(userHackathonRole)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Required hackathon role: ${requiredRoles.join(' or ')}`
        })
      }

      next()
    } catch (error) {
      console.error('[RBAC] Hackathon role check failed:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Hackathon role check failed'
      })
    }
  }
}

async function getUserHackathonRole(userId: string, hackathonId: string): Promise<string | null> {
  // In a real implementation, this would query the database
  console.log(`[RBAC] Getting hackathon role: user ${userId}, hackathon ${hackathonId}`)
  return 'participant'
}

// Utility function to check if user has permission
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const permissions = rolePermissions[userRole] || []
  return permissions.includes(permission)
}

// Utility function to get all permissions for a role
export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role] || []
}

// Middleware to add user permissions to request
export function addUserPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user) {
    const userRole = req.user.role as Role
    req.user.permissions = getRolePermissions(userRole)
  }
  next()
}

export default {
  Role,
  Permission,
  requirePermission,
  requireRole,
  requireTeamRole,
  requireHackathonRole,
  hasPermission,
  getRolePermissions,
  addUserPermissions
}


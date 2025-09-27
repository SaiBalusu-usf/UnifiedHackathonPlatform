"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = exports.Role = void 0;
exports.requirePermission = requirePermission;
exports.requireRole = requireRole;
exports.requireTeamRole = requireTeamRole;
exports.requireHackathonRole = requireHackathonRole;
exports.hasPermission = hasPermission;
exports.getRolePermissions = getRolePermissions;
exports.addUserPermissions = addUserPermissions;
// Define roles and permissions
var Role;
(function (Role) {
    Role["SUPER_ADMIN"] = "super_admin";
    Role["ADMIN"] = "admin";
    Role["ORGANIZER"] = "organizer";
    Role["MENTOR"] = "mentor";
    Role["PARTICIPANT"] = "participant";
    Role["GUEST"] = "guest";
})(Role || (exports.Role = Role = {}));
var Permission;
(function (Permission) {
    // User permissions
    Permission["USER_READ"] = "user:read";
    Permission["USER_WRITE"] = "user:write";
    Permission["USER_DELETE"] = "user:delete";
    Permission["USER_ADMIN"] = "user:admin";
    // Team permissions
    Permission["TEAM_READ"] = "team:read";
    Permission["TEAM_WRITE"] = "team:write";
    Permission["TEAM_DELETE"] = "team:delete";
    Permission["TEAM_MANAGE_MEMBERS"] = "team:manage_members";
    Permission["TEAM_ADMIN"] = "team:admin";
    // Hackathon permissions
    Permission["HACKATHON_READ"] = "hackathon:read";
    Permission["HACKATHON_WRITE"] = "hackathon:write";
    Permission["HACKATHON_DELETE"] = "hackathon:delete";
    Permission["HACKATHON_MANAGE"] = "hackathon:manage";
    Permission["HACKATHON_ADMIN"] = "hackathon:admin";
    // Resume permissions
    Permission["RESUME_READ"] = "resume:read";
    Permission["RESUME_WRITE"] = "resume:write";
    Permission["RESUME_DELETE"] = "resume:delete";
    Permission["RESUME_ADMIN"] = "resume:admin";
    // Tracking permissions
    Permission["TRACKING_READ"] = "tracking:read";
    Permission["TRACKING_WRITE"] = "tracking:write";
    Permission["TRACKING_ADMIN"] = "tracking:admin";
    // System permissions
    Permission["SYSTEM_ADMIN"] = "system:admin";
    Permission["SYSTEM_MONITOR"] = "system:monitor";
    Permission["SYSTEM_LOGS"] = "system:logs";
    // Agent permissions
    Permission["AGENT_READ"] = "agent:read";
    Permission["AGENT_CONTROL"] = "agent:control";
    Permission["AGENT_ADMIN"] = "agent:admin";
})(Permission || (exports.Permission = Permission = {}));
// Role-permission mapping
const rolePermissions = {
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
};
// RBAC middleware factory
function requirePermission(permission, options = {}) {
    return async (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }
            const userRole = req.user.role;
            const userId = req.user.userId;
            const userPermissions = rolePermissions[userRole] || [];
            // Check if user has the required permission
            if (!userPermissions.includes(permission)) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Insufficient permissions'
                });
            }
            // Check resource ownership if required
            if (options.checkOwnership && options.resourceType) {
                const hasOwnership = await checkResourceOwnership(req, userId, options.resourceType, options.resourceIdParam || 'id');
                if (!hasOwnership) {
                    return res.status(403).json({
                        error: 'Forbidden',
                        message: 'You can only access your own resources'
                    });
                }
            }
            next();
        }
        catch (error) {
            console.error('[RBAC] Permission check failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Permission check failed'
            });
        }
    };
}
// Role requirement middleware
function requireRole(roles) {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }
        const userRole = req.user.role;
        if (!requiredRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Required role: ${requiredRoles.join(' or ')}`
            });
        }
        next();
    };
}
// Check if user owns or has access to a resource
async function checkResourceOwnership(req, userId, resourceType, resourceIdParam) {
    const resourceId = req.params[resourceIdParam];
    if (!resourceId) {
        return false;
    }
    try {
        switch (resourceType) {
            case 'user':
                // User can access their own profile
                return resourceId === userId;
            case 'team':
                // Check if user is a member of the team
                return await checkTeamMembership(userId, resourceId);
            case 'hackathon':
                // Check if user is registered for the hackathon or is an organizer
                return await checkHackathonAccess(userId, resourceId);
            case 'resume':
                // Check if the resume belongs to the user
                return await checkResumeOwnership(userId, resourceId);
            case 'tracking':
                // Check if the tracking data belongs to the user or their team
                return await checkTrackingAccess(userId, resourceId);
            default:
                return false;
        }
    }
    catch (error) {
        console.error(`[RBAC] Error checking ownership for ${resourceType}:`, error);
        return false;
    }
}
// Helper functions for ownership checks
async function checkTeamMembership(userId, teamId) {
    // In a real implementation, this would query the database
    // For now, we'll return true as a placeholder
    console.log(`[RBAC] Checking team membership: user ${userId}, team ${teamId}`);
    return true;
}
async function checkHackathonAccess(userId, hackathonId) {
    // In a real implementation, this would check if user is registered or is an organizer
    console.log(`[RBAC] Checking hackathon access: user ${userId}, hackathon ${hackathonId}`);
    return true;
}
async function checkResumeOwnership(userId, resumeId) {
    // In a real implementation, this would query the resume database
    console.log(`[RBAC] Checking resume ownership: user ${userId}, resume ${resumeId}`);
    return true;
}
async function checkTrackingAccess(userId, trackingId) {
    // In a real implementation, this would check if tracking belongs to user or their team
    console.log(`[RBAC] Checking tracking access: user ${userId}, tracking ${trackingId}`);
    return true;
}
// Team-specific permissions
function requireTeamRole(teamRoles) {
    const requiredRoles = Array.isArray(teamRoles) ? teamRoles : [teamRoles];
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }
        const teamId = req.params.teamId || req.body.teamId;
        if (!teamId) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'Team ID required'
            });
        }
        try {
            // In a real implementation, this would query the database for user's role in the team
            const userTeamRole = await getUserTeamRole(req.user.userId, teamId);
            if (!userTeamRole || !requiredRoles.includes(userTeamRole)) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `Required team role: ${requiredRoles.join(' or ')}`
                });
            }
            next();
        }
        catch (error) {
            console.error('[RBAC] Team role check failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Team role check failed'
            });
        }
    };
}
async function getUserTeamRole(userId, teamId) {
    // In a real implementation, this would query the database
    // For now, return 'member' as a placeholder
    console.log(`[RBAC] Getting team role: user ${userId}, team ${teamId}`);
    return 'member';
}
// Hackathon-specific permissions
function requireHackathonRole(hackathonRoles) {
    const requiredRoles = Array.isArray(hackathonRoles) ? hackathonRoles : [hackathonRoles];
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }
        const hackathonId = req.params.hackathonId || req.body.hackathonId;
        if (!hackathonId) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'Hackathon ID required'
            });
        }
        try {
            const userHackathonRole = await getUserHackathonRole(req.user.userId, hackathonId);
            if (!userHackathonRole || !requiredRoles.includes(userHackathonRole)) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `Required hackathon role: ${requiredRoles.join(' or ')}`
                });
            }
            next();
        }
        catch (error) {
            console.error('[RBAC] Hackathon role check failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Hackathon role check failed'
            });
        }
    };
}
async function getUserHackathonRole(userId, hackathonId) {
    // In a real implementation, this would query the database
    console.log(`[RBAC] Getting hackathon role: user ${userId}, hackathon ${hackathonId}`);
    return 'participant';
}
// Utility function to check if user has permission
function hasPermission(userRole, permission) {
    const permissions = rolePermissions[userRole] || [];
    return permissions.includes(permission);
}
// Utility function to get all permissions for a role
function getRolePermissions(role) {
    return rolePermissions[role] || [];
}
// Middleware to add user permissions to request
function addUserPermissions(req, res, next) {
    if (req.user) {
        const userRole = req.user.role;
        req.user.permissions = getRolePermissions(userRole);
    }
    next();
}
exports.default = {
    Role,
    Permission,
    requirePermission,
    requireRole,
    requireTeamRole,
    requireHackathonRole,
    hasPermission,
    getRolePermissions,
    addUserPermissions
};
//# sourceMappingURL=rbac.js.map
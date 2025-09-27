import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
export declare enum Role {
    SUPER_ADMIN = "super_admin",
    ADMIN = "admin",
    ORGANIZER = "organizer",
    MENTOR = "mentor",
    PARTICIPANT = "participant",
    GUEST = "guest"
}
export declare enum Permission {
    USER_READ = "user:read",
    USER_WRITE = "user:write",
    USER_DELETE = "user:delete",
    USER_ADMIN = "user:admin",
    TEAM_READ = "team:read",
    TEAM_WRITE = "team:write",
    TEAM_DELETE = "team:delete",
    TEAM_MANAGE_MEMBERS = "team:manage_members",
    TEAM_ADMIN = "team:admin",
    HACKATHON_READ = "hackathon:read",
    HACKATHON_WRITE = "hackathon:write",
    HACKATHON_DELETE = "hackathon:delete",
    HACKATHON_MANAGE = "hackathon:manage",
    HACKATHON_ADMIN = "hackathon:admin",
    RESUME_READ = "resume:read",
    RESUME_WRITE = "resume:write",
    RESUME_DELETE = "resume:delete",
    RESUME_ADMIN = "resume:admin",
    TRACKING_READ = "tracking:read",
    TRACKING_WRITE = "tracking:write",
    TRACKING_ADMIN = "tracking:admin",
    SYSTEM_ADMIN = "system:admin",
    SYSTEM_MONITOR = "system:monitor",
    SYSTEM_LOGS = "system:logs",
    AGENT_READ = "agent:read",
    AGENT_CONTROL = "agent:control",
    AGENT_ADMIN = "agent:admin"
}
export declare function requirePermission(permission: Permission, options?: {
    checkOwnership?: boolean;
    resourceType?: 'user' | 'team' | 'hackathon' | 'resume' | 'tracking';
    resourceIdParam?: string;
}): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare function requireRole(roles: Role | Role[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function requireTeamRole(teamRoles: string | string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare function requireHackathonRole(hackathonRoles: string | string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare function hasPermission(userRole: Role, permission: Permission): boolean;
export declare function getRolePermissions(role: Role): Permission[];
export declare function addUserPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
declare const _default: {
    Role: typeof Role;
    Permission: typeof Permission;
    requirePermission: typeof requirePermission;
    requireRole: typeof requireRole;
    requireTeamRole: typeof requireTeamRole;
    requireHackathonRole: typeof requireHackathonRole;
    hasPermission: typeof hasPermission;
    getRolePermissions: typeof getRolePermissions;
    addUserPermissions: typeof addUserPermissions;
};
export default _default;
//# sourceMappingURL=rbac.d.ts.map
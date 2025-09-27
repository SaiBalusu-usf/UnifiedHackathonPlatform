import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/auth';
export declare class TeamController {
    createTeam(req: AuthenticatedRequest, res: Response): Promise<void>;
    getTeamById(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateTeam(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteTeam(req: AuthenticatedRequest, res: Response): Promise<void>;
    addMember(req: AuthenticatedRequest, res: Response): Promise<void>;
    removeMember(req: AuthenticatedRequest, res: Response): Promise<void>;
    getTeamMembers(req: AuthenticatedRequest, res: Response): Promise<void>;
    getUserSuggestions(req: AuthenticatedRequest, res: Response): Promise<void>;
    getTeamSuggestions(req: AuthenticatedRequest, res: Response): Promise<void>;
    getTeamsByHackathon(req: AuthenticatedRequest, res: Response): Promise<void>;
    getUserTeams(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=controller.d.ts.map
import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/auth';
export declare class ResumeController {
    uploadResume(req: AuthenticatedRequest, res: Response): Promise<void>;
    getParsedResume(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateParsedResume(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteResume(req: AuthenticatedRequest, res: Response): Promise<void>;
    getAllResumes(req: AuthenticatedRequest, res: Response): Promise<void>;
    searchBySkills(req: AuthenticatedRequest, res: Response): Promise<void>;
    getResumeStats(req: AuthenticatedRequest, res: Response): Promise<void>;
    private parseResumeContent;
    private getFileExtension;
}
//# sourceMappingURL=controller.d.ts.map
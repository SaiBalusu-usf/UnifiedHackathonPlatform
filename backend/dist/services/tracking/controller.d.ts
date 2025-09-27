import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/auth';
export declare class TrackingController {
    checkIn(req: AuthenticatedRequest, res: Response): Promise<void>;
    getTrackingData(req: AuthenticatedRequest, res: Response): Promise<void>;
    getUserTrackingHistory(req: AuthenticatedRequest, res: Response): Promise<void>;
    getRealTimeData(req: AuthenticatedRequest, res: Response): Promise<void>;
    createSession(req: AuthenticatedRequest, res: Response): Promise<void>;
    getSessionsByHackathon(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateSession(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteSession(req: AuthenticatedRequest, res: Response): Promise<void>;
    getAttendanceAnalytics(req: AuthenticatedRequest, res: Response): Promise<void>;
    getLocationHeatmap(req: AuthenticatedRequest, res: Response): Promise<void>;
    getTimelineAnalytics(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=controller.d.ts.map
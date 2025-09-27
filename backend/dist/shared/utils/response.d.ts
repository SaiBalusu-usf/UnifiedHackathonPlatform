import { Response } from 'express';
export declare const sendSuccess: <T>(res: Response, message: string, data?: T, statusCode?: number) => void;
export declare const sendError: (res: Response, message: string, error?: string, statusCode?: number) => void;
export declare const sendPaginatedResponse: <T>(res: Response, message: string, data: T[], pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}, statusCode?: number) => void;
//# sourceMappingURL=response.d.ts.map
import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    code?: string;
}
export declare class BadRequestError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string);
}
export declare class UnauthorizedError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class ForbiddenError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class NotFoundError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class ConflictError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string);
}
export declare class ValidationError extends Error {
    statusCode: number;
    isOperational: boolean;
    errors: any[];
    constructor(message: string, errors?: any[]);
}
export declare class InternalServerError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message?: string);
}
export declare const errorHandler: (error: AppError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    errorHandler: (error: AppError, req: Request, res: Response, next: NextFunction) => void;
    asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
    notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
    BadRequestError: typeof BadRequestError;
    UnauthorizedError: typeof UnauthorizedError;
    ForbiddenError: typeof ForbiddenError;
    NotFoundError: typeof NotFoundError;
    ConflictError: typeof ConflictError;
    ValidationError: typeof ValidationError;
    InternalServerError: typeof InternalServerError;
};
export default _default;
//# sourceMappingURL=errorHandler.d.ts.map
import { ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
export declare const createRateLimit: (windowMs: number, max: number, message?: string) => import("express-rate-limit").RateLimitRequestHandler;
export declare const authRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const apiRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const uploadRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const strictRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const helmetConfig: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const userValidation: {
    register: ValidationChain[];
    login: ValidationChain[];
    updateProfile: ValidationChain[];
};
export declare const teamValidation: {
    create: ValidationChain[];
    update: ValidationChain[];
};
export declare const hackathonValidation: {
    create: ValidationChain[];
};
export declare const handleValidationErrors: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const mongoSanitizeConfig: import("express").Handler;
export declare const xssProtection: (req: Request, res: Response, next: NextFunction) => void;
export declare const hppProtection: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityHeaders: (req: Request, res: Response, next: NextFunction) => void;
export declare const corsOptions: {
    origin: string | boolean;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
};
export declare const fileUploadSecurity: {
    allowedMimeTypes: string[];
    maxFileSize: number;
    validateFile: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
};
export declare const securityLogger: (req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    authRateLimit: import("express-rate-limit").RateLimitRequestHandler;
    apiRateLimit: import("express-rate-limit").RateLimitRequestHandler;
    uploadRateLimit: import("express-rate-limit").RateLimitRequestHandler;
    strictRateLimit: import("express-rate-limit").RateLimitRequestHandler;
    helmetConfig: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
    userValidation: {
        register: ValidationChain[];
        login: ValidationChain[];
        updateProfile: ValidationChain[];
    };
    teamValidation: {
        create: ValidationChain[];
        update: ValidationChain[];
    };
    hackathonValidation: {
        create: ValidationChain[];
    };
    handleValidationErrors: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    mongoSanitizeConfig: import("express").Handler;
    xssProtection: (req: Request, res: Response, next: NextFunction) => void;
    hppProtection: (req: Request, res: Response, next: NextFunction) => void;
    securityHeaders: (req: Request, res: Response, next: NextFunction) => void;
    corsOptions: {
        origin: string | boolean;
        credentials: boolean;
        methods: string[];
        allowedHeaders: string[];
        exposedHeaders: string[];
        maxAge: number;
    };
    fileUploadSecurity: {
        allowedMimeTypes: string[];
        maxFileSize: number;
        validateFile: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    };
    securityLogger: (req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
//# sourceMappingURL=security.d.ts.map
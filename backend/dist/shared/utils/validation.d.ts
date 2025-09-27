import { Request, Response, NextFunction } from 'express';
export declare const validateEmail: (email: string) => boolean;
export declare const validatePassword: (password: string) => boolean;
export declare const validateUUID: (uuid: string) => boolean;
export declare const validateRequired: (fields: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateEmailField: (req: Request, res: Response, next: NextFunction) => void;
export declare const validatePasswordField: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map
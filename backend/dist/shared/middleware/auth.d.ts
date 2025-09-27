import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../types';
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload & {
        permissions?: string[];
    };
}
export declare const oauthProviders: {
    google: {
        clientId: string | undefined;
        clientSecret: string | undefined;
        redirectUri: string | undefined;
        scope: string;
    };
    github: {
        clientId: string | undefined;
        clientSecret: string | undefined;
        redirectUri: string | undefined;
        scope: string;
    };
    linkedin: {
        clientId: string | undefined;
        clientSecret: string | undefined;
        redirectUri: string | undefined;
        scope: string;
    };
};
export declare const generateTokens: (payload: JwtPayload) => {
    accessToken: never;
    refreshToken: never;
};
export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authorizeRoles: (...roles: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const verifyRefreshToken: (refreshToken: string) => Promise<JwtPayload>;
export declare const generateOAuthState: () => string;
export declare const verifyOAuthState: (state: string) => boolean;
export declare const getGoogleAuthUrl: () => string;
export declare const getGitHubAuthUrl: () => string;
export declare const getLinkedInAuthUrl: () => string;
export declare const exchangeGoogleCode: (code: string) => Promise<any>;
export declare const exchangeGitHubCode: (code: string) => Promise<any>;
export declare const getGoogleUserInfo: (accessToken: string) => Promise<any>;
export declare const getGitHubUserInfo: (accessToken: string) => Promise<any>;
export declare const generateVerificationToken: (userId: string) => string;
export declare const verifyEmailToken: (token: string) => JwtPayload | null;
export declare const generatePasswordResetToken: (userId: string) => string;
export declare const verifyPasswordResetToken: (token: string) => JwtPayload | null;
declare const _default: {
    authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    authorizeRoles: (...roles: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    generateTokens: (payload: JwtPayload) => {
        accessToken: never;
        refreshToken: never;
    };
    verifyRefreshToken: (refreshToken: string) => Promise<JwtPayload>;
    hashPassword: (password: string) => Promise<string>;
    comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
    generateOAuthState: () => string;
    verifyOAuthState: (state: string) => boolean;
    getGoogleAuthUrl: () => string;
    getGitHubAuthUrl: () => string;
    getLinkedInAuthUrl: () => string;
    exchangeGoogleCode: (code: string) => Promise<any>;
    exchangeGitHubCode: (code: string) => Promise<any>;
    getGoogleUserInfo: (accessToken: string) => Promise<any>;
    getGitHubUserInfo: (accessToken: string) => Promise<any>;
    generateVerificationToken: (userId: string) => string;
    verifyEmailToken: (token: string) => JwtPayload | null;
    generatePasswordResetToken: (userId: string) => string;
    verifyPasswordResetToken: (token: string) => JwtPayload | null;
};
export default _default;
//# sourceMappingURL=auth.d.ts.map
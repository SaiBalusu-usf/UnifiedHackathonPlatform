import { Request, Response, NextFunction } from 'express';
import { sendError } from './response';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const validateRequired = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];
    
    for (const field of fields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      sendError(res, `Missing required fields: ${missingFields.join(', ')}`, undefined, 400);
      return;
    }

    next();
  };
};

export const validateEmailField = (req: Request, res: Response, next: NextFunction): void => {
  const { email } = req.body;
  
  if (email && !validateEmail(email)) {
    sendError(res, 'Invalid email format', undefined, 400);
    return;
  }

  next();
};

export const validatePasswordField = (req: Request, res: Response, next: NextFunction): void => {
  const { password } = req.body;
  
  if (password && !validatePassword(password)) {
    sendError(res, 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number', undefined, 400);
    return;
  }

  next();
};


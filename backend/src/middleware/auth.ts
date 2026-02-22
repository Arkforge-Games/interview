import { Request, Response, NextFunction } from 'express';
import { verifyToken, DecodedToken } from '../utils/jwt';
import { Errors } from './errorHandler';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

// Extract token from Authorization header
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

// Required authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    throw Errors.unauthorized('No token provided');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    throw Errors.unauthorized('Invalid or expired token');
  }

  if (decoded.type !== 'access') {
    throw Errors.unauthorized('Invalid token type');
  }

  req.user = decoded;
  next();
}

// Optional authentication middleware (user may or may not be logged in)
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.type === 'access') {
      req.user = decoded;
    }
  }

  next();
}

// Require refresh token middleware
export function requireRefreshToken(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    throw Errors.unauthorized('No refresh token provided');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    throw Errors.unauthorized('Invalid or expired refresh token');
  }

  if (decoded.type !== 'refresh') {
    throw Errors.unauthorized('Invalid token type');
  }

  req.user = decoded;
  next();
}

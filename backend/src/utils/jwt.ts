import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { env } from '../config/environment';

export interface TokenPayload {
  sub: string; // user id
  email: string;
  name: string;
  type?: 'access' | 'refresh';
}

export interface DecodedToken extends JwtPayload {
  sub: string;
  email: string;
  name: string;
  type?: 'access' | 'refresh';
}

// Parse duration string (e.g., '30m', '7d') to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 1800; // default 30 minutes

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: return 1800;
  }
}

export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: parseDuration(env.JWT_ACCESS_EXPIRES),
    algorithm: 'HS256',
  };

  return jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_SECRET,
    options
  );
}

export function generateRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: parseDuration(env.JWT_REFRESH_EXPIRES),
    algorithm: 'HS256',
  };

  return jwt.sign(
    { ...payload, type: 'refresh' },
    env.JWT_SECRET,
    options
  );
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function generateTokenPair(payload: TokenPayload): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: parseDuration(env.JWT_ACCESS_EXPIRES),
  };
}

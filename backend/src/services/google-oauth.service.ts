import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { env } from '../config/environment';

const FRONTEND_URL = env.FRONTEND_URL;
const BACKEND_URL = env.isProduction
  ? env.FRONTEND_URL
  : `http://localhost:${env.PORT}`;

const client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${BACKEND_URL}/api/v1/auth/google/callback`
);

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

export const googleOAuthService = {
  // Generate OAuth URL for Google Sign-In
  getAuthUrl(): string {
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  },

  // Exchange authorization code for tokens and user info
  async getTokensAndUserInfo(code: string): Promise<GoogleUserInfo> {
    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Verify ID token and get user info
    if (!tokens.id_token) {
      throw new Error('No ID token received from Google');
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Failed to get user info from Google');
    }

    return {
      googleId: payload.sub,
      email: payload.email || '',
      name: payload.name || payload.email || 'User',
      avatar: payload.picture,
    };
  },

  // Verify ID token from frontend (for client-side Google Sign-In)
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Failed to verify Google ID token');
    }

    return {
      googleId: payload.sub,
      email: payload.email || '',
      name: payload.name || payload.email || 'User',
      avatar: payload.picture,
    };
  },

  // Get frontend callback URL
  getFrontendCallbackUrl(accessToken: string, refreshToken: string): string {
    return `${FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
  },

  // Get frontend error URL
  getFrontendErrorUrl(error: string): string {
    return `${FRONTEND_URL}/auth/error?error=${encodeURIComponent(error)}`;
  },
};

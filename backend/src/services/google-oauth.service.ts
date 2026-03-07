import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { env } from '../config/environment';

const FRONTEND_URL = env.FRONTEND_URL;

// Allowed origins for post-login redirect (prevent open redirect)
const ALLOWED_ORIGINS = [
  'https://slayjobs.com',
  'https://www.slayjobs.com',
  'https://hobbyland-interview.azurewebsites.net',
  'http://localhost:3000',
];

// Google OAuth callback must use the URI registered in Google Cloud Console.
// GOOGLE_REDIRECT_URI env var allows overriding; defaults to FRONTEND_URL.
const GOOGLE_CALLBACK_URI = process.env.GOOGLE_REDIRECT_URI
  || (env.isProduction ? `${env.FRONTEND_URL}/api/v1/auth/google/callback` : `http://localhost:${env.PORT}/api/v1/auth/google/callback`);

const client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URI
);

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

export const googleOAuthService = {
  // Generate OAuth URL for Google Sign-In
  // returnOrigin: the frontend origin to redirect back to after login
  getAuthUrl(returnOrigin?: string): string {
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    // Encode the return origin in OAuth state parameter
    const state = returnOrigin && ALLOWED_ORIGINS.includes(returnOrigin)
      ? returnOrigin
      : FRONTEND_URL;

    return client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state,
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

  // Get frontend callback URL (uses returnOrigin if provided and allowed)
  getFrontendCallbackUrl(accessToken: string, refreshToken: string, returnOrigin?: string): string {
    const base = returnOrigin && ALLOWED_ORIGINS.includes(returnOrigin) ? returnOrigin : FRONTEND_URL;
    return `${base}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
  },

  // Get frontend error URL (uses returnOrigin if provided and allowed)
  getFrontendErrorUrl(error: string, returnOrigin?: string): string {
    const base = returnOrigin && ALLOWED_ORIGINS.includes(returnOrigin) ? returnOrigin : FRONTEND_URL;
    return `${base}/auth/error?error=${encodeURIComponent(error)}`;
  },
};

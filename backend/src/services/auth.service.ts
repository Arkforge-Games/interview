import { User } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { googleOAuthService, GoogleUserInfo } from './google-oauth.service';
import { generateTokenPair, verifyToken, TokenPayload } from '../utils/jwt';
import { subscriptionService } from './subscription.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
}

export const authService = {
  // Get Google OAuth URL
  getGoogleAuthUrl(): string {
    return googleOAuthService.getAuthUrl();
  },

  // Handle Google OAuth callback
  async handleGoogleCallback(
    code: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthTokens> {
    // Get user info from Google
    const googleUser = await googleOAuthService.getTokensAndUserInfo(code);

    // Find or create user
    const user = await userRepository.findOrCreateByGoogle(
      googleUser.googleId,
      googleUser.email,
      googleUser.name,
      googleUser.avatar
    );

    // Ensure subscription record exists
    await subscriptionService.ensureSubscription(user.id);

    // Generate tokens
    return this.createAuthTokens(user, userAgent, ipAddress);
  },

  // Handle Google ID token verification (for frontend Google Sign-In button)
  async handleGoogleIdToken(
    idToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthTokens> {
    // Verify ID token
    const googleUser = await googleOAuthService.verifyIdToken(idToken);

    // Find or create user
    const user = await userRepository.findOrCreateByGoogle(
      googleUser.googleId,
      googleUser.email,
      googleUser.name,
      googleUser.avatar
    );

    // Ensure subscription record exists
    await subscriptionService.ensureSubscription(user.id);

    // Generate tokens
    return this.createAuthTokens(user, userAgent, ipAddress);
  },

  // Create auth tokens and session
  async createAuthTokens(
    user: User,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthTokens> {
    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const tokens = generateTokenPair(tokenPayload);

    // Calculate expiry date (7 days for refresh token)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store session
    await userRepository.createSession({
      userId: user.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
      userAgent,
      ipAddress,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar || undefined,
      },
    };
  },

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    // Find session by refresh token
    const session = await userRepository.findSessionByRefreshToken(refreshToken);
    if (!session) {
      throw new Error('Session not found');
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await userRepository.deleteSession(session.token);
      throw new Error('Session expired');
    }

    // Find user
    const user = await userRepository.findById(decoded.sub);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete old session
    await userRepository.deleteSession(session.token);

    // Create new tokens
    return this.createAuthTokens(user, session.userAgent || undefined, session.ipAddress || undefined);
  },

  // Logout (invalidate session)
  async logout(accessToken: string): Promise<void> {
    await userRepository.deleteSession(accessToken);
  },

  // Logout all sessions
  async logoutAll(userId: string): Promise<void> {
    await userRepository.deleteAllUserSessions(userId);
  },

  // Get current user
  async getCurrentUser(userId: string): Promise<User | null> {
    return userRepository.findById(userId);
  },
};

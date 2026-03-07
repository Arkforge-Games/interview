import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { googleOAuthService } from '../services/google-oauth.service';
import { subscriptionService } from '../services/subscription.service';
import { sendSuccess, sendError } from '../utils/response';
import { Errors } from '../middleware/errorHandler';

export const authController = {
  // GET /auth/google - Get Google OAuth URL
  async getGoogleAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Pass the frontend origin so we can redirect back to it after login
      const returnOrigin = req.query.origin as string | undefined;
      const url = authService.getGoogleAuthUrl(returnOrigin);
      sendSuccess(res, { url });
    } catch (error) {
      next(error);
    }
  },

  // GET /auth/google/callback - Handle Google OAuth callback
  async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state } = req.query;

      // state contains the return origin from the initial auth request
      const returnOrigin = typeof state === 'string' ? state : undefined;

      if (!code || typeof code !== 'string') {
        const errorUrl = googleOAuthService.getFrontendErrorUrl('No authorization code provided', returnOrigin);
        return res.redirect(errorUrl);
      }

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;

      const tokens = await authService.handleGoogleCallback(code, userAgent, ipAddress);

      // Redirect to the frontend origin that initiated the login
      const callbackUrl = googleOAuthService.getFrontendCallbackUrl(
        tokens.accessToken,
        tokens.refreshToken,
        returnOrigin
      );
      res.redirect(callbackUrl);
    } catch (error) {
      console.error('Google OAuth error:', error);
      const returnOrigin = typeof req.query.state === 'string' ? req.query.state : undefined;
      const errorUrl = googleOAuthService.getFrontendErrorUrl('Authentication failed', returnOrigin);
      res.redirect(errorUrl);
    }
  },

  // POST /auth/google/token - Verify Google ID token (for frontend Sign-In button)
  async verifyGoogleToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        throw Errors.badRequest('ID token is required');
      }

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;

      const tokens = await authService.handleGoogleIdToken(idToken, userAgent, ipAddress);

      sendSuccess(res, tokens);
    } catch (error) {
      next(error);
    }
  },

  // POST /auth/refresh - Refresh access token
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw Errors.badRequest('Refresh token is required');
      }

      const tokens = await authService.refreshAccessToken(refreshToken);
      sendSuccess(res, tokens);
    } catch (error) {
      next(error);
    }
  },

  // POST /auth/logout - Logout current session
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        await authService.logout(token);
      }

      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  // GET /auth/me - Get current user
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Not authenticated');
      }

      const user = await authService.getCurrentUser(req.user.sub);

      if (!user) {
        throw Errors.notFound('User not found');
      }

      const subscriptionInfo = await subscriptionService.getSubscriptionInfo(user.id);

      sendSuccess(res, {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
        subscription: subscriptionInfo,
      });
    } catch (error) {
      next(error);
    }
  },
};

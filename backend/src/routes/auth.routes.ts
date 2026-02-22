import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /auth/google - Get Google OAuth URL
router.get('/google', authController.getGoogleAuthUrl);

// GET /auth/google/callback - Handle Google OAuth callback
router.get('/google/callback', authController.googleCallback);

// POST /auth/google/token - Verify Google ID token (for frontend Sign-In button)
router.post('/google/token', authController.verifyGoogleToken);

// POST /auth/refresh - Refresh access token
router.post('/refresh', authController.refreshToken);

// POST /auth/logout - Logout current session
router.post('/logout', authController.logout);

// GET /auth/me - Get current user (protected)
router.get('/me', requireAuth, authController.me);

export default router;

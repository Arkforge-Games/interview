import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import subscriptionRoutes from './subscription.routes';
import stripeRoutes from './stripe.routes';

const router = Router();

// Health check routes
router.use('/health', healthRoutes);

// Auth routes
router.use('/auth', authRoutes);

// Subscription routes
router.use('/subscription', subscriptionRoutes);

// Stripe webhook routes
router.use('/stripe', stripeRoutes);

export default router;

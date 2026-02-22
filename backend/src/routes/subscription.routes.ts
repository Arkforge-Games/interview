import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /subscription/config - Public (returns Stripe publishable key + prices)
router.get('/config', subscriptionController.getConfig);

// GET /subscription/status - Get current subscription status
router.get('/status', requireAuth, subscriptionController.getStatus);

// POST /subscription/checkout - Create Stripe Checkout session
router.post('/checkout', requireAuth, subscriptionController.createCheckout);

// POST /subscription/portal - Create Stripe Customer Portal session
router.post('/portal', requireAuth, subscriptionController.createPortalSession);

export default router;

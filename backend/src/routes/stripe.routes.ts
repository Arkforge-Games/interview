import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';

const router = Router();

// POST /stripe/webhook - Stripe webhook handler (NO AUTH, raw body)
router.post('/webhook', subscriptionController.handleWebhook);

export default router;

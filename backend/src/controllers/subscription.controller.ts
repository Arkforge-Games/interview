import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.service';
import { stripeService } from '../services/stripe.service';
import { trialCodeService } from '../services/trialcode.service';
import { sendSuccess, sendError } from '../utils/response';
import { Errors } from '../middleware/errorHandler';
import { env } from '../config/environment';

export const subscriptionController = {
  // GET /subscription/config - Public
  async getConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, {
        publishableKey: env.STRIPE_PUBLISHABLE_KEY,
        monthlyPrice: 9.90,
        yearlyPrice: 59.90,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /subscription/status
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw Errors.unauthorized();
      const info = await subscriptionService.getSubscriptionInfo(req.user.sub);
      sendSuccess(res, info);
    } catch (error) {
      next(error);
    }
  },

  // POST /subscription/checkout
  async createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw Errors.unauthorized();
      const { planInterval } = req.body;

      if (!planInterval || !['monthly', 'yearly'].includes(planInterval)) {
        throw Errors.badRequest('planInterval must be "monthly" or "yearly"');
      }

      const url = await subscriptionService.createCheckout(req.user.sub, planInterval);
      sendSuccess(res, { url });
    } catch (error) {
      next(error);
    }
  },

  // POST /subscription/portal
  async createPortalSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw Errors.unauthorized();
      const url = await subscriptionService.createPortalSession(req.user.sub);
      sendSuccess(res, { url });
    } catch (error) {
      next(error);
    }
  },

  // POST /subscription/redeem-code
  async redeemCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw Errors.unauthorized();
      const { code } = req.body;

      if (!code || typeof code !== 'string') {
        throw Errors.badRequest('Trial code is required');
      }

      const result = await trialCodeService.redeemCode(req.user.sub, code);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  // POST /stripe/webhook - NO AUTH, raw body
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        sendError(res, 'Missing stripe-signature header', 400);
        return;
      }

      const event = stripeService.constructWebhookEvent(req.body, signature);
      await stripeService.handleWebhookEvent(event);

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('[Stripe Webhook] Error:', error.message);
      sendError(res, `Webhook error: ${error.message}`, 400);
    }
  },
};

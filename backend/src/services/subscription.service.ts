import { subscriptionRepository } from '../repositories/subscription.repository';
import { stripeService } from './stripe.service';
import { userRepository } from '../repositories/user.repository';
import { SubscriptionStatus } from '@prisma/client';
import { Errors } from '../middleware/errorHandler';
import { env } from '../config/environment';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  tier: 'free' | 'trial' | 'paid';
  planInterval: string | null;
  paidTrialEndsAt: string | null;
  currentPeriodEnd: string | null;
  canAccessFullFeatures: boolean;
  requiresUpgrade: boolean;
  upgradeReason: string | null;
}

export const subscriptionService = {
  async ensureSubscription(userId: string): Promise<void> {
    const existing = await subscriptionRepository.findByUserId(userId);
    if (existing) return;

    // New users start as EXPIRED — credit card required before any access
    await subscriptionRepository.create({
      userId,
      status: 'EXPIRED' as SubscriptionStatus,
    });
  },

  async getSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
    const sub = await subscriptionRepository.findByUserId(userId);

    if (!sub) {
      return {
        status: 'EXPIRED' as SubscriptionStatus,
        tier: 'free',
        planInterval: null,
        paidTrialEndsAt: null,
        currentPeriodEnd: null,
        canAccessFullFeatures: false,
        requiresUpgrade: true,
        upgradeReason: 'subscription_required',
      };
    }

    const now = new Date();
    let tier: 'free' | 'trial' | 'paid' = 'free';
    let canAccessFullFeatures = false;
    let requiresUpgrade = false;
    let upgradeReason: string | null = null;

    switch (sub.status) {
      case 'PAID_TRIAL':
        if (sub.paidTrialEndsAt && now > sub.paidTrialEndsAt) {
          tier = 'free';
          requiresUpgrade = true;
          upgradeReason = 'paid_trial_expired';
        } else {
          tier = 'trial';
          canAccessFullFeatures = true;
        }
        break;

      case 'ACTIVE':
        tier = 'paid';
        canAccessFullFeatures = true;
        break;

      case 'CANCELLED':
        canAccessFullFeatures = sub.currentPeriodEnd ? now < sub.currentPeriodEnd : false;
        if (canAccessFullFeatures) {
          tier = 'paid';
        } else {
          tier = 'free';
          requiresUpgrade = true;
          upgradeReason = 'subscription_ended';
        }
        break;

      case 'EXPIRED':
        tier = 'free';
        requiresUpgrade = true;
        upgradeReason = 'subscription_expired';
        break;

      case 'PAST_DUE':
        tier = 'free';
        requiresUpgrade = true;
        upgradeReason = 'payment_failed';
        break;
    }

    return {
      status: sub.status,
      tier,
      planInterval: sub.planInterval,
      paidTrialEndsAt: sub.paidTrialEndsAt?.toISOString() || null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
      canAccessFullFeatures,
      requiresUpgrade,
      upgradeReason,
    };
  },

  async createCheckout(userId: string, planInterval: 'monthly' | 'yearly'): Promise<string> {
    const user = await userRepository.findById(userId);
    if (!user) throw Errors.notFound('User not found');

    let sub = await subscriptionRepository.findByUserId(userId);
    if (!sub) throw Errors.badRequest('No subscription record found');

    // Create Stripe customer if not exists
    if (!sub.stripeCustomerId) {
      const customer = await stripeService.createCustomer(user.email, user.name, userId);
      sub = await subscriptionRepository.update(userId, {
        stripeCustomerId: customer.id,
        planInterval: planInterval === 'monthly' ? 'MONTHLY' : 'YEARLY',
      });
    }

    const priceId = stripeService.getPriceId(planInterval);
    const frontendUrl = env.FRONTEND_URL;

    const session = await stripeService.createCheckoutSession({
      userId,
      stripeCustomerId: sub.stripeCustomerId!,
      priceId,
      successUrl: `${frontendUrl}/?subscription=success`,
      cancelUrl: `${frontendUrl}/?subscription=cancelled`,
    });

    return session.url!;
  },

  async createPortalSession(userId: string): Promise<string> {
    const sub = await subscriptionRepository.findByUserId(userId);
    if (!sub || !sub.stripeCustomerId) {
      throw Errors.badRequest('No Stripe customer found');
    }

    const session = await stripeService.createPortalSession(
      sub.stripeCustomerId,
      env.FRONTEND_URL,
    );

    return session.url;
  },
};

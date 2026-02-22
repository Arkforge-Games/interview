import Stripe from 'stripe';
import { env } from '../config/environment';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { SubscriptionStatus } from '@prisma/client';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export const stripeService = {
  async createCustomer(email: string, name: string, userId: string): Promise<Stripe.Customer> {
    return getStripe().customers.create({
      email,
      name,
      metadata: { slayjobs_user_id: userId },
    });
  },

  async createCheckoutSession(params: {
    userId: string;
    stripeCustomerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    return getStripe().checkout.sessions.create({
      customer: params.stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: params.priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { slayjobs_user_id: params.userId },
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { slayjobs_user_id: params.userId },
    });
  },

  async createPortalSession(stripeCustomerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    return getStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
  },

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return getStripe().webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  },

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.slayjobs_user_id;
        if (!userId) break;

        await subscriptionRepository.update(userId, {
          status: 'PAID_TRIAL' as SubscriptionStatus,
          stripeSubscriptionId: session.subscription as string,
          paidTrialStartedAt: new Date(),
          paidTrialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = await subscriptionRepository.findByStripeSubscriptionId(subscription.id);
        if (!sub) break;

        // In Stripe SDK v17, current_period is on subscription items
        const item = subscription.items?.data?.[0] as any;
        const periodStart = item?.current_period_start;
        const periodEnd = item?.current_period_end;

        if (subscription.status === 'active' && !subscription.trial_end) {
          await subscriptionRepository.update(sub.userId, {
            status: 'ACTIVE' as SubscriptionStatus,
            ...(periodStart && { currentPeriodStart: new Date(periodStart * 1000) }),
            ...(periodEnd && { currentPeriodEnd: new Date(periodEnd * 1000) }),
          });
        } else if (subscription.status === 'active' && subscription.cancel_at_period_end) {
          await subscriptionRepository.update(sub.userId, {
            status: 'CANCELLED' as SubscriptionStatus,
            cancelledAt: new Date(),
            ...(periodEnd && { currentPeriodEnd: new Date(periodEnd * 1000) }),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = await subscriptionRepository.findByStripeSubscriptionId(subscription.id);
        if (!sub) break;

        await subscriptionRepository.update(sub.userId, {
          status: 'EXPIRED' as SubscriptionStatus,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const sub = await subscriptionRepository.findByStripeCustomerId(customerId);
        if (!sub) break;

        await subscriptionRepository.update(sub.userId, {
          status: 'PAST_DUE' as SubscriptionStatus,
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const sub = await subscriptionRepository.findByStripeCustomerId(customerId);
        if (!sub) break;

        if (sub.status === 'PAST_DUE') {
          await subscriptionRepository.update(sub.userId, {
            status: 'ACTIVE' as SubscriptionStatus,
          });
        }
        break;
      }
    }
  },

  getPriceId(interval: 'monthly' | 'yearly'): string {
    return interval === 'monthly'
      ? env.STRIPE_MONTHLY_PRICE_ID
      : env.STRIPE_YEARLY_PRICE_ID;
  },
};

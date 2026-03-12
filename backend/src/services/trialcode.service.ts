import { prisma } from '../config/database';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { SubscriptionStatus } from '@prisma/client';
import { Errors } from '../middleware/errorHandler';

export const trialCodeService = {
  async redeemCode(userId: string, code: string) {
    const trimmedCode = code.trim().toUpperCase();

    // Find the trial code
    const trialCode = await prisma.trialCode.findUnique({
      where: { code: trimmedCode },
    });

    if (!trialCode || !trialCode.active) {
      throw Errors.badRequest('Invalid or expired trial code');
    }

    // Check max uses (0 = unlimited)
    if (trialCode.maxUses > 0 && trialCode.usedCount >= trialCode.maxUses) {
      throw Errors.badRequest('This trial code has reached its maximum uses');
    }

    // Check if user already redeemed this code
    const existing = await prisma.trialCodeRedemption.findUnique({
      where: {
        trialCodeId_userId: {
          trialCodeId: trialCode.id,
          userId,
        },
      },
    });

    if (existing) {
      throw Errors.badRequest('You have already used this trial code');
    }

    // Check if user already has an active subscription
    const sub = await subscriptionRepository.findByUserId(userId);
    if (sub && (sub.status === 'ACTIVE' || sub.status === 'PAID_TRIAL')) {
      const now = new Date();
      const isTrialStillActive = sub.status === 'PAID_TRIAL' && sub.paidTrialEndsAt && now < sub.paidTrialEndsAt;
      if (sub.status === 'ACTIVE' || isTrialStillActive) {
        throw Errors.badRequest('You already have an active subscription');
      }
    }

    // Redeem: update subscription + increment used count + create redemption
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + trialCode.trialDays * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      // Update or create subscription
      prisma.subscription.upsert({
        where: { userId },
        update: {
          status: 'PAID_TRIAL' as SubscriptionStatus,
          paidTrialStartedAt: now,
          paidTrialEndsAt: trialEndsAt,
        },
        create: {
          userId,
          status: 'PAID_TRIAL' as SubscriptionStatus,
          paidTrialStartedAt: now,
          paidTrialEndsAt: trialEndsAt,
        },
      }),
      // Increment used count
      prisma.trialCode.update({
        where: { id: trialCode.id },
        data: { usedCount: { increment: 1 } },
      }),
      // Record redemption
      prisma.trialCodeRedemption.create({
        data: {
          trialCodeId: trialCode.id,
          userId,
        },
      }),
    ]);

    return {
      trialDays: trialCode.trialDays,
      trialEndsAt: trialEndsAt.toISOString(),
    };
  },
};

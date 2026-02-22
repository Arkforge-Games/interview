import { prisma } from '../config/database';
import { Subscription, SubscriptionStatus, PlanInterval } from '@prisma/client';

export interface CreateSubscriptionData {
  userId: string;
  status?: SubscriptionStatus;
}

export const subscriptionRepository = {
  async findByUserId(userId: string): Promise<Subscription | null> {
    return prisma.subscription.findUnique({ where: { userId } });
  },

  async findByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
    return prisma.subscription.findUnique({ where: { stripeCustomerId } });
  },

  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    return prisma.subscription.findUnique({ where: { stripeSubscriptionId } });
  },

  async create(data: CreateSubscriptionData): Promise<Subscription> {
    return prisma.subscription.create({ data });
  },

  async update(userId: string, data: Partial<Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Subscription> {
    return prisma.subscription.update({
      where: { userId },
      data,
    });
  },
};

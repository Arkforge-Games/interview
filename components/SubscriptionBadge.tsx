import React from 'react';
import { SubscriptionInfo } from '../types';

interface SubscriptionBadgeProps {
  subscriptionInfo: SubscriptionInfo | null;
  onClick?: () => void;
}

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ subscriptionInfo, onClick }) => {
  if (!subscriptionInfo) return null;

  const { tier, status, paidTrialEndsAt } = subscriptionInfo;

  if (tier === 'paid') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all"
      >
        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
        Pro
      </button>
    );
  }

  if (tier === 'trial') {
    const daysLeft = paidTrialEndsAt
      ? Math.max(0, Math.ceil((new Date(paidTrialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 7;

    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all"
      >
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
        Trial {daysLeft}d
      </button>
    );
  }

  // Free tier (EXPIRED, PAST_DUE)
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 hover:bg-amber-100 transition-all"
    >
      Free
    </button>
  );
};

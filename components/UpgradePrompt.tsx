import React from 'react';

interface UpgradePromptProps {
  reason: string;
  onUpgrade: () => void;
  onDismiss?: () => void;
}

const REASON_MESSAGES: Record<string, { title: string; message: string; icon: string }> = {
  paid_trial_expired: {
    title: 'Trial Ended',
    message: 'Your 7-day trial has expired. Upgrade to continue with full access to all interview features.',
    icon: '\u23F0',
  },
  subscription_ended: {
    title: 'Subscription Ended',
    message: 'Your subscription has ended. Resubscribe to regain full access to detailed reports and unlimited questions.',
    icon: '\uD83D\uDD04',
  },
  subscription_expired: {
    title: 'Subscription Expired',
    message: 'Your subscription has expired. Choose a plan to unlock full interview coaching.',
    icon: '\u231B',
  },
  payment_failed: {
    title: 'Payment Failed',
    message: 'We couldn\'t process your payment. Please update your billing info to restore access.',
    icon: '\uD83D\uDCB3',
  },
  subscription_required: {
    title: 'Start Your Free Trial',
    message: 'Add a payment method to start your 7-day free trial with full access to all features. You won\'t be charged until the trial ends.',
    icon: '\u2728',
  },
};

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  reason,
  onUpgrade,
  onDismiss,
}) => {
  const info = REASON_MESSAGES[reason] || REASON_MESSAGES.subscription_required;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-fade-in">
        <div className="p-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-inner border border-white">
            {info.icon}
          </div>

          <h3 className="text-2xl font-black mb-3">{info.title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">{info.message}</p>

          <button
            onClick={onUpgrade}
            className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
          >
            View Plans
          </button>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="w-full mt-3 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              Maybe Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

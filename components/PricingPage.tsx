import React, { useState } from 'react';
import { SubscriptionInfo } from '../types';
import { subscriptionApi } from '../services/api';

interface PricingPageProps {
  onBack: () => void;
  subscriptionInfo: SubscriptionInfo | null;
  lockMode?: boolean;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onBack, subscriptionInfo, lockMode }) => {
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (planInterval: 'monthly' | 'yearly') => {
    setLoading(planInterval);
    setError(null);
    try {
      const { url } = await subscriptionApi.createCheckout(planInterval);
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white animate-fade-in">
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          {!lockMode && (
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">Unlock Your Full Potential</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">SlayJobs Pro</h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Get unlimited interview questions, full AI performance reports, and executive-level coaching.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Monthly Plan */}
          <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 hover:border-indigo-200 transition-all hover:shadow-xl">
            <div className="mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Monthly</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">$9.90</span>
                <span className="text-sm text-slate-400 font-medium">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Unlimited interview questions',
                'Full AI performance report',
                'CEO-level answer coaching',
                'Strategic framework analysis',
                'Transcript & demo answers',
                'Cancel anytime',
              ].map(feature => (
                <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('monthly')}
              disabled={loading !== null}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'monthly' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </span>
              ) : (
                'Start 7-Day Free Trial'
              )}
            </button>
          </div>

          {/* Yearly Plan */}
          <div className="bg-white rounded-[2.5rem] p-8 border-2 border-indigo-600 shadow-xl shadow-indigo-100/50 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
              Save 50%
            </div>

            <div className="mb-6">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Yearly</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">$59.90</span>
                <span className="text-sm text-slate-400 font-medium">/year</span>
              </div>
              <p className="text-xs text-indigo-600 font-bold mt-1">Just $4.99/month</p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Unlimited interview questions',
                'Full AI performance report',
                'CEO-level answer coaching',
                'Strategic framework analysis',
                'Transcript & demo answers',
                'Cancel anytime',
                'Best value',
              ].map(feature => (
                <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('yearly')}
              disabled={loading !== null}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'yearly' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </span>
              ) : (
                'Start 7-Day Free Trial'
              )}
            </button>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            Your 7-day trial is free. You won't be charged until the trial ends. Cancel anytime from your account settings.
          </p>
        </div>
      </main>
    </div>
  );
};

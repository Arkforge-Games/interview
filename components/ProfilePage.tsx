import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, SubscriptionInfo } from '../types';
import { getUserProfile, saveUserProfile } from '../services/historyService';
import { logoutUser } from '../services/authService';
import { subscriptionApi } from '../services/api';
import { extractTextFromFile } from '../services/documentService';
import { GoogleSignIn } from './GoogleSignIn';
import {
  ArrowLeft, User, CreditCard, FileText, Upload,
  Trash2, LogOut, ExternalLink, Save, Loader2, Check, Paperclip
} from 'lucide-react';

interface ProfilePageProps {
  user: UserProfile | null;
  subscriptionInfo: SubscriptionInfo | null;
  onBack: () => void;
  onPricing: () => void;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user, subscriptionInfo, onBack, onPricing, onLogout
}) => {
  const isGuest = !user || user.isGuest;
  const [cvText, setCvText] = useState('');
  const [cvLoaded, setCvLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getUserProfile().then(({ cvText }) => {
      setCvText(cvText);
      setCvLoaded(true);
    });
  }, [user?.id]);

  const handleSaveCv = async () => {
    setSaving(true);
    try {
      await saveUserProfile(cvText);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save CV:', e);
    }
    setSaving(false);
  };

  const handleDeleteCv = async () => {
    setCvText('');
    setFileName('');
    setSaving(true);
    try {
      await saveUserProfile('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to delete CV:', e);
    }
    setSaving(false);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const text = await extractTextFromFile(file);
      setCvText(text);
      setFileName(file.name);
    } catch (e) {
      console.error('Failed to extract text:', e);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setPortalError('');
    try {
      const { url } = await subscriptionApi.createPortalSession();
      window.location.href = url;
    } catch (e: any) {
      setPortalError(e.message || 'Failed to open subscription portal');
      setPortalLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const tierLabel = subscriptionInfo?.tier === 'paid' ? 'Pro' : subscriptionInfo?.tier === 'trial' ? 'Trial' : 'Free';
  const tierColor = subscriptionInfo?.tier === 'paid' ? 'indigo' : subscriptionInfo?.tier === 'trial' ? 'emerald' : 'amber';

  return (
    <div className="min-h-screen bg-white animate-fade-in">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
          </button>
          <h1 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profile</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Section 1: User Identity */}
        <section className="bg-slate-50 rounded-3xl p-8">
          {isGuest ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto">
                <User size={28} className="text-slate-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Guest User</h2>
                <p className="text-sm text-slate-500 mt-1">Sign in to save your progress across devices</p>
              </div>
              <div className="max-w-xs mx-auto">
                <GoogleSignIn />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-5">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-16 h-16 rounded-full border-2 border-white shadow-md" />
              ) : (
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                  <span className="text-xl font-black text-indigo-600">{user?.name?.charAt(0) || '?'}</span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-black text-slate-900">{user?.name}</h2>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Subscription */}
        {!isGuest && (
          <section className="bg-slate-50 rounded-3xl p-8 space-y-5">
            <div className="flex items-center gap-3">
              <CreditCard size={18} className="text-slate-400" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subscription</h3>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-${tierColor}-50 text-${tierColor}-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-${tierColor}-100`}>
                    {tierColor === 'indigo' && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>}
                    {tierColor === 'emerald' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                    {tierLabel}
                  </span>
                  {subscriptionInfo?.planInterval && (
                    <span className="text-xs text-slate-400">{subscriptionInfo.planInterval === 'MONTHLY' ? 'Monthly' : 'Yearly'}</span>
                  )}
                </div>
                {subscriptionInfo?.tier === 'trial' && subscriptionInfo.paidTrialEndsAt && (
                  <p className="text-xs text-slate-500">Trial ends: {formatDate(subscriptionInfo.paidTrialEndsAt)}</p>
                )}
                {subscriptionInfo?.tier === 'paid' && subscriptionInfo.currentPeriodEnd && (
                  <p className="text-xs text-slate-500">Renews: {formatDate(subscriptionInfo.currentPeriodEnd)}</p>
                )}
                {subscriptionInfo?.tier === 'free' && (
                  <p className="text-xs text-slate-500">Upgrade to unlock all features</p>
                )}
              </div>
            </div>

            {portalError && (
              <p className="text-xs text-red-500">{portalError}</p>
            )}

            {(subscriptionInfo?.tier === 'paid' || subscriptionInfo?.tier === 'trial') ? (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-50"
              >
                {portalLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ExternalLink size={16} />
                )}
                {portalLoading ? 'Opening...' : 'Manage Subscription'}
              </button>
            ) : (
              <button
                onClick={onPricing}
                className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors"
              >
                Upgrade to Pro
              </button>
            )}
          </section>
        )}

        {/* Section 3: CV Management */}
        <section className="bg-slate-50 rounded-3xl p-8 space-y-5">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your CV</h3>
          </div>

          {!cvLoaded ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          ) : (
            <>
              <textarea
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Paste your CV text here, or upload a file below..."
                className="w-full h-40 p-4 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
              />

              <div className="flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-slate-300 transition-all"
                >
                  <Paperclip size={14} />
                  {fileName || 'Upload File'}
                </button>
                <span className="text-[10px] text-slate-400">PDF, DOCX, or TXT</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveCv}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save CV'}
                </button>
                {cvText && (
                  <button
                    onClick={handleDeleteCv}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl text-sm transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        {/* Section 4: Sign Out */}
        {!isGuest && (
          <section className="pb-8">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </section>
        )}

      </main>
    </div>
  );
};

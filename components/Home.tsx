
import React, { useEffect, useState } from 'react';
import { SessionMode, HistoryItem, UserProfile, SubscriptionInfo } from '../types';
import { getHistory } from '../services/historyService';
import { GoogleSignIn } from './GoogleSignIn';
import { SubscriptionBadge } from './SubscriptionBadge';
import {
  Play, Briefcase, Target, Award, Calendar, ChevronRight, BookOpen, Star, ShieldCheck, Zap, User
} from 'lucide-react';

interface Props {
  onStartSession: (mode?: SessionMode) => void;
  onViewHistory: () => void;
  onOpenSettings: () => void;
  onViewSession: (item: HistoryItem) => void;
  subscriptionInfo: SubscriptionInfo | null;
  onPricing: () => void;
  onProfile: () => void;
  onUserChanged: (user: UserProfile | null) => void;
  user: UserProfile | null;
}

const FRAMEWORKS = [
  { name: "STAR Method", desc: "Situation, Task, Action, Result for behavioral answers.", icon: Star, color: "text-amber-500 bg-amber-50" },
  { name: "PAR Technique", desc: "Problem, Action, Resolution for quick technical case studies.", icon: Zap, color: "text-indigo-500 bg-indigo-50" },
  { name: "The Rule of Three", desc: "List 3 points to stay structured and memorable.", icon: ShieldCheck, color: "text-emerald-500 bg-emerald-50" }
];

export const Home: React.FC<Props> = ({ onStartSession, onOpenSettings, onViewSession, subscriptionInfo, onPricing, onProfile, onUserChanged, user: userProp }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, avg: 0 });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(userProp);

  // Sync with parent user prop and load data when user changes
  useEffect(() => {
    if (userProp) {
      setCurrentUser(userProp);
      loadUserData(userProp);
    }
  }, [userProp?.id, userProp?.isGuest]);

  const loadUserData = async (user: UserProfile) => {
    if (!user.isGuest) {
      const items = await getHistory();
      setHistory(items as any);
      if (items.length > 0) {
        const sum = items.reduce((a, b) => a + (b.score || 0), 0);
        setStats({ total: items.length, avg: Math.round(sum / items.length) });
      }
    } else {
      setHistory([]);
      setStats({ total: 0, avg: 0 });
    }
  };

  // Loading state - show spinner while auto-guest login happens
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto p-6 md:p-10 space-y-10 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome, {currentUser.isGuest ? "Guest" : currentUser.name}</h1>
          <p className="text-slate-500 mt-2 text-lg">Personalized AI coaching tailored to your CV and JD.</p>
        </div>
        <div className="flex gap-3 items-center">
            {subscriptionInfo && (
              <SubscriptionBadge subscriptionInfo={subscriptionInfo} onClick={onPricing} />
            )}
            {currentUser.isGuest ? (
              <GoogleSignIn compact />
            ) : (
              <button
                onClick={onProfile}
                className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors"
                title="Profile"
              >
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <User size={20} className="text-slate-500" />
                )}
              </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 space-y-8">
              <div className="space-y-2">
                <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-[10px] font-black tracking-widest backdrop-blur-md border border-white/30">MOCK INTERVIEW MODE</span>
                <h2 className="text-4xl font-black leading-tight">Prepare for the <br/>career you deserve.</h2>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => onStartSession(SessionMode.MOCK_INTERVIEW)}
                  className="flex items-center justify-center gap-3 bg-white text-indigo-700 px-8 py-5 rounded-3xl font-black shadow-lg hover:scale-[1.02] transition-transform"
                >
                  <Play size={20} fill="currentColor" /> Start Prep
                </button>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Mastering Frameworks</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FRAMEWORKS.map((f, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all cursor-help group">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                     <f.icon size={20} />
                   </div>
                   <h4 className="font-black text-slate-900 text-sm mb-1">{f.name}</h4>
                   <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Recent Performance</h3>
            </div>
            <div className="space-y-4">
              {currentUser.isGuest ? (
                 <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center text-slate-400 flex flex-col items-center gap-4">
                    <User size={40} className="opacity-20" />
                    <p>Guest history is not saved.</p>
                    <GoogleSignIn compact />
                    <p className="text-xs">Sign in to track your progress.</p>
                 </div>
              ) : history.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center text-slate-400">
                  <BookOpen size={40} className="mx-auto mb-4 opacity-20" />
                  Your session records will appear here.
                </div>
              ) : (
                history.slice(0, 3).map(item => (
                  <div key={item.id} onClick={() => onViewSession(item)} className="p-6 bg-white border border-slate-200 rounded-[2.5rem] flex items-center justify-between hover:shadow-lg transition-all cursor-pointer group">
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                        <Briefcase className="text-slate-400 group-hover:text-indigo-600" size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{item.jobTitle}</h4>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-black uppercase tracking-widest"><Calendar size={12}/> {new Date(item.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                        <p className="text-2xl font-black text-indigo-600">{item.score}%</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-8 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Global Progress</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total</p>
                <p className="text-4xl font-black text-slate-900">{stats.total}</p>
              </div>
              <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">Average</p>
                <p className="text-4xl font-black text-indigo-700">{stats.avg || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 text-indigo-400">
                <Target size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Pro Tip</span>
              </div>
              <p className="text-lg font-bold leading-snug">"Interviewer stress? Reframe anxiety as excitement to perform your best."</p>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Award size={100} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

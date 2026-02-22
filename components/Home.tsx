
import React, { useEffect, useState } from 'react';
import { SessionMode, HistoryItem, UserProfile, SubscriptionInfo } from '../types';
import { getHistory, getUserProfile, saveUserProfile } from '../services/historyService';
import { getCurrentUser, loginAsGuest, logoutUser } from '../services/authService';
import { extractTextFromFile } from '../services/documentService';
import { GoogleSignIn } from './GoogleSignIn';
import { SubscriptionBadge } from './SubscriptionBadge';
import {
  Play, Briefcase, Target, Award, Calendar, ChevronRight, BookOpen, Star, ShieldCheck, Zap, User, X, FileText, Upload, LogOut
} from 'lucide-react';

interface Props {
  onStartSession: (mode?: SessionMode) => void;
  onViewHistory: () => void;
  onOpenSettings: () => void;
  onViewSession: (item: HistoryItem) => void;
  subscriptionInfo: SubscriptionInfo | null;
  onPricing: () => void;
  onUserChanged: (user: UserProfile | null) => void;
}

const FRAMEWORKS = [
  { name: "STAR Method", desc: "Situation, Task, Action, Result for behavioral answers.", icon: Star, color: "text-amber-500 bg-amber-50" },
  { name: "PAR Technique", desc: "Problem, Action, Resolution for quick technical case studies.", icon: Zap, color: "text-indigo-500 bg-indigo-50" },
  { name: "The Rule of Three", desc: "List 3 points to stay structured and memorable.", icon: ShieldCheck, color: "text-emerald-500 bg-emerald-50" }
];

export const Home: React.FC<Props> = ({ onStartSession, onOpenSettings, onViewSession, subscriptionInfo, onPricing, onUserChanged }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, avg: 0 });
  const [showProfile, setShowProfile] = useState(false);
  const [cvText, setCvText] = useState("");
  const [savedCv, setSavedCv] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    getCurrentUser().then(async (user) => {
      if (!user) {
        // Show login screen instead of auto-guest
        setCurrentUser(null);
        return;
      }
      setCurrentUser(user);
      onUserChanged(user);
      loadUserData(user);
    });
  }, []);

  const loadUserData = async (user: UserProfile) => {
    if (user.cvText) {
      setCvText(user.cvText);
      setSavedCv(true);
    }

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

  const handleGuest = async () => {
    const user = await loginAsGuest();
    setCurrentUser(user);
    onUserChanged(user);
    loadUserData(user);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    onUserChanged(null);
    setHistory([]);
    setStats({ total: 0, avg: 0 });
    setCvText("");
    setSavedCv(false);
  };

  const handleSaveProfile = async () => {
    await saveUserProfile(cvText);
    setSavedCv(true);
    setShowProfile(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const text = await extractTextFromFile(file);
        setCvText(text);
    } catch (e) {
        alert("Failed to read file. Please copy/paste text instead.");
    }
  };

  // Login screen - show when no user
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
         <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl space-y-8 text-center animate-fade-in">
            <div>
               <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">SlayJobs</h1>
               <p className="text-slate-500">AI Mock Interviews & Career Coaching</p>
            </div>

            <div className="space-y-4">
              <GoogleSignIn />
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-400">or</span></div>
              </div>
              <button onClick={handleGuest} className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors">
                Continue as Guest
              </button>
            </div>
            <p className="text-xs text-slate-400">Guest: limited to 3 questions, basic report only. Sign in for full access.</p>
         </div>
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
            <button
              onClick={() => setShowProfile(true)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all shadow-sm border ${savedCv ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              <User size={20} />
              {savedCv ? "Edit Profile" : "Upload CV"}
            </button>
            <button onClick={handleLogout} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-red-500 hover:bg-red-50 transition-colors">
               <LogOut size={20} />
            </button>
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
                 <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center text-slate-400">
                    <User size={40} className="mx-auto mb-4 opacity-20" />
                    Guest history is not saved. <br/> <button onClick={handleLogout} className="text-indigo-600 font-bold underline">Sign in with Google</button> to track your progress.
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

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl border border-slate-100 relative">
             <button onClick={() => setShowProfile(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400">
               <X size={24} />
             </button>

             <div className="space-y-6">
               <div className="space-y-2">
                 <h2 className="text-2xl font-black text-slate-900">Your Professional Profile</h2>
                 <p className="text-slate-500">Upload your CV to personalize all future interview sessions.</p>
               </div>

               <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors text-center group">
                  <input type="file" accept=".txt,.pdf,.docx,.doc" onChange={handleFileUpload} className="hidden" id="cv-upload" />
                  <label htmlFor="cv-upload" className="cursor-pointer block">
                    <div className="w-12 h-12 rounded-full bg-white text-indigo-600 mx-auto mb-3 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Upload size={20} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Click to upload or Drag & Drop</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT supported</p>
                  </label>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <FileText size={12} /> CV Content / Key Achievements
                 </label>
                 <textarea
                   value={cvText}
                   onChange={(e) => setCvText(e.target.value)}
                   placeholder="Paste your resume content here..."
                   className="w-full h-64 bg-white border border-slate-200 rounded-2xl p-4 text-sm leading-relaxed text-slate-600 focus:border-indigo-600 outline-none resize-none"
                 />
               </div>

               <button
                 onClick={handleSaveProfile}
                 className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
               >
                 Save Profile
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

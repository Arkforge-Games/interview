
import React, { useState, useEffect } from 'react';
import { SessionConfig, ExperienceLevel, SessionMode, InterviewQuestion } from '../types';
import { generateInterviewQuestions } from '../services/geminiService';
import { getUserProfile, saveUserProfile } from '../services/historyService';
import { 
  Briefcase, FileText, User, ChevronRight, ArrowLeft, Loader2, CheckCircle2, UserCircle, Target, X, Upload
} from 'lucide-react';

interface Props {
  onNext: (config: SessionConfig) => void;
  onHome: () => void;
  practiceContext?: {
    weaknesses: string;
    excludedQuestions: string[];
    jobTitle: string;
    jd: string;
    level: ExperienceLevel;
  };
}

export const SessionSetup: React.FC<Props> = ({ onNext, onHome, practiceContext }) => {
  const [step, setStep] = useState<'FIELDS' | 'REVIEW'>('FIELDS');
  const [loading, setLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [years, setYears] = useState("");
  const [jd, setJd] = useState("");
  const [cvText, setCvText] = useState("");
  const [level, setLevel] = useState<ExperienceLevel>(ExperienceLevel.FRESH_GRAD);
  const [allQuestions, setAllQuestions] = useState<InterviewQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // New States
  const [showCvModal, setShowCvModal] = useState(false);
  const [errors, setErrors] = useState({ title: false, jd: false });

  // Load profile or practice context
  useEffect(() => {
    getUserProfile().then(p => {
      if (p.cvText) setCvText(p.cvText);
    });

    if (practiceContext) {
      setJobTitle(practiceContext.jobTitle);
      setJd(practiceContext.jd);
      setLevel(practiceContext.level);
      // Auto-generate if it's a practice session
      handleGenerate(practiceContext);
    }
  }, []);

  const handleGenerate = async (ctx = practiceContext) => {
    const titleVal = jobTitle || ctx?.jobTitle || "";
    const jdVal = jd || ctx?.jd || "";
    
    setErrors({
        title: !titleVal.trim(),
        jd: !jdVal.trim()
    });

    if (!titleVal.trim() || !jdVal.trim()) {
        return; // Stop if invalid
    }

    setLoading(true);
    try {
      const qs = await generateInterviewQuestions(
        titleVal, 
        jdVal, 
        cvText, 
        level || ctx?.level, 
        years || "N/A", 
        "English",
        ctx?.weaknesses,
        ctx?.excludedQuestions
      );
      setAllQuestions(qs);
      // Safely select up to 5
      setSelectedIds(new Set(qs.slice(0, 5).map(q => q.id)));
      setStep('REVIEW');
    } catch (e) {
      alert("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      if (next.size > 1) next.delete(id);
    } else {
      if (next.size < 5) next.add(id);
    }
    setSelectedIds(next);
  };

  const startInterview = () => {
    const selected = allQuestions.filter(q => selectedIds.has(q.id));
    onNext({
      jobTitle,
      companyName: company,
      yearsOfExperience: years,
      jobDescription: jd,
      cvText,
      experienceLevel: level,
      language: "English",
      mode: SessionMode.MOCK_INTERVIEW,
      questions: selected
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCvText(event.target?.result as string);
      };
      reader.readAsText(file);
    } else {
      alert("For PDF or Word documents, please copy and paste the text content directly for best results.");
    }
  };

  const handleSaveCv = async () => {
    if (cvText) {
        await saveUserProfile(cvText);
    }
    setShowCvModal(false);
  };

  if (step === 'REVIEW') {
    return (
      <div className="min-h-screen max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <button onClick={() => setStep('FIELDS')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-semibold">
            <ArrowLeft size={20} /> Back to Setup
          </button>
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900">Recommended Questions</h2>
            <p className="text-sm text-slate-500">Pick 5 questions for your personalized session.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {allQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => toggleQuestion(q.id)}
              className={`text-left p-5 rounded-3xl border-2 transition-all flex items-start gap-4 ${
                selectedIds.has(q.id) 
                ? 'bg-indigo-50 border-indigo-600 shadow-sm' 
                : 'bg-white border-slate-100 opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`mt-1 ${selectedIds.has(q.id) ? 'text-indigo-600' : 'text-slate-300'}`}>
                {selectedIds.has(q.id) ? <CheckCircle2 size={24} /> : <div className="w-6 h-6 rounded-full border-2 border-slate-200" />}
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1 block">{q.category}</span>
                <p className="text-slate-900 font-bold leading-tight">{q.text}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-center">
            <button
              onClick={startInterview}
              disabled={selectedIds.size !== 5}
              className="bg-indigo-600 text-white px-12 py-4 rounded-full font-black shadow-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              Enter Mock Interview ({selectedIds.size}/5) <ChevronRight />
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-6xl mx-auto p-6 md:p-10 space-y-10 animate-fade-in relative">
      <div className="flex items-center justify-between border-b border-slate-100 pb-8">
        <button onClick={onHome} className="p-3 hover:bg-white rounded-full transition-colors text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Personalized Interview Setup</h1>
        <div className="w-10"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Job Details & CV */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* 1. Job Details Card */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Briefcase size={14}/> Target Role <span className="text-red-500">*</span></h3>
            <div className="space-y-4">
              <div>
                <input 
                    type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Job Title (Required)"
                    className={`w-full text-base font-bold border-b py-2 outline-none focus:border-indigo-600 transition-colors ${errors.title ? 'border-red-400 placeholder-red-300' : 'border-slate-100'}`}
                />
                {errors.title && <p className="text-[10px] text-red-500 mt-1 font-bold">Job Title is required.</p>}
              </div>
              <input 
                type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                placeholder="Company Name"
                className="w-full text-base font-bold border-b border-slate-100 py-2 outline-none focus:border-indigo-600"
              />
              <input 
                type="text" value={years} onChange={(e) => setYears(e.target.value)}
                placeholder="Years of Experience"
                className="w-full text-base font-bold border-b border-slate-100 py-2 outline-none focus:border-indigo-600"
              />
            </div>
          </div>
          
          {/* 2. Experience Level Card */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UserCircle size={14}/> Seniority</h3>
            <div className="flex flex-wrap gap-2">
              {Object.values(ExperienceLevel).map((lvl) => (
                <button 
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${level === lvl ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                >
                  {lvl.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* 3. CV Section (Button style) */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-4">
             <div className="flex justify-between items-start">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Your Profile</h3>
                 {cvText && <CheckCircle2 size={16} className="text-green-500" />}
             </div>
             <p className="text-xs text-slate-500 leading-relaxed">
                {cvText 
                    ? "CV loaded. The questions will be tailored to your specific background." 
                    : "Upload your CV to get questions that match your actual experience."}
             </p>
             <button 
                  onClick={() => setShowCvModal(true)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all shadow-sm border w-full text-sm ${cvText ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100' : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'}`}
              >
                  {cvText ? "Review / Edit CV" : "Upload CV"}
             </button>
          </div>
        </div>

        {/* Right Column: JD & Action */}
        <div className="lg:col-span-2 flex flex-col h-full gap-8">
            <div className={`bg-white border rounded-[2.5rem] p-8 shadow-sm flex flex-col flex-1 transition-colors ${errors.jd ? 'border-red-200 bg-red-50/10' : 'border-slate-200'}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 ${errors.jd ? 'text-red-400' : 'text-slate-400'}`}>
                  <Briefcase size={14}/> Job Post Content <span className="text-red-500">*</span>
              </h3>
              <textarea 
                value={jd} onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full Job Description here. This is crucial for generating relevant questions..."
                className="flex-1 w-full bg-slate-50 rounded-3xl p-6 text-sm text-slate-600 outline-none resize-none border border-slate-100 focus:border-indigo-600 focus:bg-white transition-all"
              />
              {errors.jd && <p className="text-xs text-red-500 font-bold mt-3 px-2">Job Description is required.</p>}
            </div>

            <button 
                onClick={() => handleGenerate()}
                disabled={loading}
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 transform active:scale-[0.99]"
            >
                {loading ? <Loader2 className="animate-spin" /> : <>Generate Personalized Interview <ChevronRight /></>}
            </button>
        </div>
      </div>

       {/* CV Modal (Similar to Home.tsx) */}
       {showCvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl border border-slate-100 relative">
             <button onClick={() => setShowCvModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400">
               <X size={24} />
             </button>
             
             <div className="space-y-6">
               <div className="space-y-2">
                 <h2 className="text-2xl font-black text-slate-900">Your CV Content</h2>
                 <p className="text-slate-500">Paste your resume text below to personalize the interview questions.</p>
               </div>

               <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors text-center group">
                  <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" id="cv-upload-modal" />
                  <label htmlFor="cv-upload-modal" className="cursor-pointer block">
                    <div className="w-12 h-12 rounded-full bg-white text-indigo-600 mx-auto mb-3 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Upload size={20} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Click to upload .txt file</p>
                    <p className="text-xs text-slate-400 mt-1">or paste text directly below</p>
                  </label>
               </div>

               <div className="space-y-2">
                 <textarea 
                   value={cvText}
                   onChange={(e) => setCvText(e.target.value)}
                   placeholder="Paste your resume content here..."
                   className="w-full h-64 bg-white border border-slate-200 rounded-2xl p-4 text-sm leading-relaxed text-slate-600 focus:border-indigo-600 outline-none resize-none"
                 />
               </div>

               <button 
                 onClick={handleSaveCv}
                 className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg"
               >
                 Save & Use for Session
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

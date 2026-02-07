import React, { useState, useEffect } from 'react';
import { SessionConfig, ExperienceLevel, SessionMode, InterviewQuestion } from '../types';
import { generateInterviewQuestions } from '../services/geminiService';
import { getUserProfile, saveUserProfile } from '../services/historyService';
import { extractTextFromFile } from '../services/documentService';
import { 
  Briefcase, FileText, UserCircle, Upload, CheckCircle2, AlertCircle, Sparkles, RefreshCcw, Layers, Loader2, ArrowLeft, Type, Paperclip, Globe, Sliders
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

const LANGUAGES = ['English', 'Mandarin', 'Cantonese', 'Spanish', 'French', 'German', 'Japanese', 'Korean'];

export const SessionSetup: React.FC<Props> = ({ onNext, onHome, practiceContext }) => {
  const [loading, setLoading] = useState(false);
  const [jd, setJd] = useState("");
  const [cvText, setCvText] = useState("");
  const [level, setLevel] = useState<ExperienceLevel>(ExperienceLevel.FRESH_GRAD);
  const [questionCount, setQuestionCount] = useState(5); 
  const [language, setLanguage] = useState("English");
  const [focusBalance, setFocusBalance] = useState(50); // 0-100 Slider
  const [cvInputMode, setCvInputMode] = useState<'TEXT' | 'FILE'>('TEXT'); // Default to Text
  
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState("");
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState({ jd: false });

  useEffect(() => {
    getUserProfile().then(p => {
      if (p.cvText) setCvText(p.cvText);
    });

    if (practiceContext) {
      setJd(practiceContext.jd);
      setLevel(practiceContext.level);
    }
  }, []);

  const handleGenerateAndStart = async () => {
    const jdVal = jd || practiceContext?.jd || "";
    setErrors({ jd: !jdVal.trim() });

    if (!jdVal.trim()) return; 

    setLoading(true);
    try {
      const rawQuestions = await generateInterviewQuestions(
        "The Role described in JD", 
        jdVal, 
        cvText, 
        level || practiceContext?.level, 
        "N/A", 
        language,
        focusBalance,
        practiceContext?.weaknesses,
        practiceContext?.excludedQuestions
      );

      const { selected, backup } = balanceQuestions(rawQuestions, questionCount);

      onNext({
        jobTitle: "Target Role", 
        companyName: "",
        yearsOfExperience: "",
        jobDescription: jdVal,
        cvText,
        experienceLevel: level,
        language: language,
        mode: SessionMode.MOCK_INTERVIEW,
        focusBalance: focusBalance,
        questions: selected,
        backupQuestions: backup
      });

    } catch (e) {
      alert("Failed to generate questions. Please try again.");
      console.error(e);
      setLoading(false);
    } 
  };

  const balanceQuestions = (all: InterviewQuestion[], count: number) => {
    if (all.length <= count) return { selected: all, backup: [] };
    
    // Simple slice is enough here because the generation logic in geminiService 
    // already handles the distribution based on focusBalance.
    const selected = all.slice(0, count);
    const backup = all.slice(count);

    return { selected, backup };
  };

  const handleFileProcess = async (file: File) => {
      setFileError("");
      try {
          const text = await extractTextFromFile(file);
          if (text.trim().length < 50) {
              setFileError("Could not extract enough text.");
          } else {
              setCvText(text);
              setFileName(file.name);
              saveUserProfile(text);
          }
      } catch (e) {
          console.error(e);
          setFileError("Error reading file.");
      }
  };

  const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
      else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileProcess(e.dataTransfer.files[0]);
      }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          handleFileProcess(e.target.files[0]);
      }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto p-6 md:p-10 space-y-10 animate-fade-in relative pb-24">
      <div className="flex items-center justify-between border-b border-slate-100 pb-8">
        <button onClick={onHome} className="p-3 hover:bg-white rounded-full transition-colors text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Personalized Interview Setup</h1>
        <div className="w-10"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (JD & CV) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
            {/* Job Description Section */}
            <div className={`bg-white border rounded-[2rem] p-8 shadow-sm transition-all duration-300 ${errors.jd ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50'}`}>
              <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${errors.jd ? 'text-red-500' : 'text-slate-400'}`}>
                      <Briefcase size={14}/> Job Post Content <span className="text-red-500">*</span>
                  </h3>
              </div>
              <textarea 
                value={jd} onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full Job Description here. SlayJobs will analyze this to generate tailored technical & scenario questions..."
                className="w-full h-64 bg-slate-50 rounded-xl p-5 text-sm text-slate-700 placeholder-slate-400 outline-none resize-none border border-transparent focus:bg-white focus:border-indigo-200 transition-colors leading-relaxed"
              />
              {errors.jd && <p className="text-xs text-red-500 font-bold mt-3 px-2 flex items-center gap-1"><AlertCircle size={12}/> Please paste a job description to proceed.</p>}
            </div>

            {/* CV / Profile Section (Moved to Left) */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm flex-1 flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Your Profile (CV)</h3>
                    {cvText && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><CheckCircle2 size={12}/> Loaded</span>}
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                  <button 
                    onClick={() => setCvInputMode('TEXT')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${cvInputMode === 'TEXT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Type size={14}/> Paste Text
                  </button>
                  <button 
                    onClick={() => setCvInputMode('FILE')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${cvInputMode === 'FILE' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Paperclip size={14}/> Upload File
                  </button>
                </div>

                {cvInputMode === 'TEXT' ? (
                   <div className="flex-1 flex flex-col">
                      <textarea 
                          value={cvText}
                          onChange={(e) => {
                            setCvText(e.target.value);
                            saveUserProfile(e.target.value);
                          }}
                          className="w-full flex-1 bg-slate-50 rounded-xl p-5 text-sm text-slate-700 placeholder-slate-400 outline-none resize-none border border-transparent focus:bg-white focus:border-indigo-200 transition-colors leading-relaxed"
                          placeholder="Paste your resume text here directly..."
                      />
                   </div>
                ) : (
                  <div 
                      className={`flex-1 rounded-2xl border-2 transition-all relative group overflow-hidden flex flex-col ${
                          dragActive 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : fileName 
                              ? 'border-emerald-200 bg-emerald-50/30'
                              : 'border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-slate-100'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                  >
                      <input type="file" id="cv-upload-drop" className="hidden" accept=".txt,.pdf,.docx,.doc" onChange={handleFileInput} />
                      
                      {!fileName ? (
                          <label htmlFor="cv-upload-drop" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-8 text-center">
                              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 group-hover:text-indigo-600 transition-all">
                                  <Upload size={24} />
                              </div>
                              <p className="font-bold text-slate-700 text-lg">Drop CV Here</p>
                              <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-[200px]">PDF, Word, or Text files supported.</p>
                          </label>
                      ) : (
                          <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center">
                              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center mb-4 text-emerald-500">
                                  <FileText size={32} />
                              </div>
                              <h4 className="font-bold text-slate-900 truncate max-w-[200px]">{fileName}</h4>
                              <p className="text-xs text-slate-500 mt-1 mb-6">File parsed successfully.</p>
                              
                              <div className="flex gap-3">
                                  <label htmlFor="cv-upload-drop" className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-2">
                                      <RefreshCcw size={12}/> Replace
                                  </label>
                                  <button onClick={() => { setCvText(""); setFileName(""); }} className="px-4 py-2 bg-red-50 border border-red-100 rounded-lg text-xs font-bold text-red-500 hover:bg-red-100 transition-colors">
                                      Remove
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
                )}
                
                {fileError && <p className="text-xs text-red-500 font-bold mt-4 flex items-center gap-1 bg-red-50 p-3 rounded-lg"><AlertCircle size={14}/> {fileError}</p>}
            </div>
        </div>

        {/* Right Column (Seniority, Settings, Action) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
            {/* Job Seniority (Moved to Right) */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6"><UserCircle size={14}/> Job Seniority</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.values(ExperienceLevel).map((lvl) => (
                    <button 
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all transform active:scale-95 ${
                        level === lvl 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' 
                        : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                    >
                    {lvl.replace('_', ' ')}
                    </button>
                ))}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Globe size={14}/> Interview Language
                    </h3>
                 </div>
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {LANGUAGES.map(lang => (
                        <button
                           key={lang}
                           onClick={() => setLanguage(lang)}
                           className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${language === lang ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-200'}`}
                        >
                           {lang}
                        </button>
                    ))}
                 </div>
            </div>

            {/* Slider Section: Difficulty/Focus */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Sliders size={14}/> Interview Difficulty & Focus
                    </h3>
                    <span className="text-indigo-600 font-black text-xs">
                        {focusBalance < 30 ? "Behavioral Focus" : focusBalance > 70 ? "Technical Focus" : "Balanced"}
                    </span>
                 </div>
                 <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="10" 
                    value={focusBalance} 
                    onChange={(e) => setFocusBalance(parseInt(e.target.value))}
                    className="w-full h-2 bg-gradient-to-r from-emerald-200 via-indigo-200 to-rose-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                 />
                 <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2">
                    <span>Non-Technical</span>
                    <span>Mixed</span>
                    <span>Technical</span>
                 </div>
                 <div className="mt-3 bg-slate-50 p-3 rounded-lg text-[10px] text-slate-500 leading-snug italic">
                    {focusBalance < 30 
                       ? "Questions will focus on culture fit, soft skills, and personality."
                       : focusBalance > 70 
                       ? "Heavy focus on hard skills, technical scenarios, and problem solving."
                       : "A standard interview mix of behavioral and technical questions."
                    }
                 </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Layers size={14}/> Interview Length
                    </h3>
                    <span className="text-indigo-600 font-black text-sm">{questionCount} Questions</span>
                 </div>
                 <input 
                    type="range" 
                    min="3" 
                    max="10" 
                    step="1" 
                    value={questionCount} 
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                 />
                 <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2">
                    <span>3 (Short)</span>
                    <span>10 (Full)</span>
                 </div>
            </div>

            <button 
                onClick={handleGenerateAndStart}
                disabled={loading}
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 transform active:scale-[0.99] group"
            >
                {loading ? <Loader2 className="animate-spin" /> : <>Start Mock Interview <Sparkles className="group-hover:text-yellow-300 transition-colors" /></>}
            </button>
        </div>
      </div>
    </div>
  );
};
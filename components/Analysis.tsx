
import React, { useState } from 'react';
import { HistoryItem, QuestionAnswer } from '../types';
import { 
  CheckCircle, Target, Award, MessageSquare, ChevronLeft, ChevronRight, ArrowRightCircle, Sparkles, Brain, ListChecks, Zap, RotateCw
} from 'lucide-react';

interface Props {
  result: any; // Using the aggregate score calculated in App
  historyItem?: HistoryItem;
  results: QuestionAnswer[];
  onHome: () => void;
  onPracticeWeakness: (weakAnswers: QuestionAnswer[]) => void;
}

export const Analysis: React.FC<Props> = ({ result, results, onHome, onPracticeWeakness }) => {
  const [activeTab, setActiveTab] = useState(0);
  const current = results[activeTab];
  
  // Guard against missing analysis or empty results
  if (!current || !current.analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-500">Analysis data is unavailable.</p>
          <button onClick={onHome} className="text-indigo-600 font-bold hover:underline">Return Home</button>
        </div>
      </div>
    );
  }
  const analysis = current.analysis;

  const ScoreBar = ({ label, score, color }: { label: string, score: number, color: string }) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-900">{score}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );

  const handleRetrain = () => {
    // Filter questions with scores below 70
    const weak = results.filter(r => (r.analysis?.overallScore || 0) < 70);
    // If no weak answers found (great performance), maybe just pick the lowest 2
    const target = weak.length > 0 ? weak : [...results].sort((a,b) => (a.analysis?.overallScore || 0) - (b.analysis?.overallScore || 0)).slice(0, 2);
    onPracticeWeakness(target);
  };

  return (
    <div className="min-h-screen w-full max-w-7xl mx-auto p-4 md:p-10 space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between border-b border-slate-100 pb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg">
            <Award size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Interview Report</h1>
            <p className="text-slate-500 font-medium">Aggregate Performance Score: {result.overallScore}%</p>
          </div>
        </div>
        <div className="flex gap-4">
            <button onClick={handleRetrain} className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-50 rounded-2xl font-bold transition-all flex items-center gap-2">
                <RotateCw size={18} /> Practice Weak Areas
            </button>
            <button onClick={onHome} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl">Close Report</button>
        </div>
      </div>

      {/* Question Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${
              activeTab === i 
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
              : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
            }`}
          >
            Question {i + 1}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Performance Metrics & Critique */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">
             <div className="flex items-center gap-2 text-indigo-600">
               <Zap size={20} />
               <h3 className="text-sm font-black uppercase tracking-widest">Performance Matrix</h3>
             </div>
             <div className="space-y-6">
                <ScoreBar label="Logic Consistency" score={analysis.logicScore || 0} color="bg-blue-500" />
                <ScoreBar label="Conciseness" score={analysis.concisenessScore || 0} color="bg-emerald-500" />
                <ScoreBar label="Precision" score={analysis.precisionScore || 0} color="bg-violet-500" />
             </div>
          </div>

          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl space-y-6">
             <div className="flex items-center gap-2 text-indigo-400">
               <Brain size={20} />
               <h3 className="text-sm font-black uppercase tracking-widest">Expert Perspective</h3>
             </div>
             <p className="text-slate-300 text-sm leading-relaxed italic">
               "{analysis.expertCritique}"
             </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
             <div className="flex items-center gap-2 text-indigo-600">
               <Sparkles size={20} />
               <h3 className="text-sm font-black uppercase tracking-widest">Vocabulary Lab</h3>
             </div>
             <div className="space-y-3">
               {analysis.vocabUpgrades && analysis.vocabUpgrades.length > 0 ? (
                 analysis.vocabUpgrades.map((v, i) => (
                   <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 line-through decoration-slate-300">{v.original}</p>
                       <p className="text-xs font-black text-indigo-600">{v.suggested}</p>
                     </div>
                     <ArrowRightCircle size={16} className="text-indigo-200" />
                   </div>
                 ))
               ) : (
                 <p className="text-xs text-slate-400 italic">No specific vocabulary upgrades suggested.</p>
               )}
             </div>
          </div>
        </div>

        {/* Right Side: Logic Roadmap & Demo Answer */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-indigo-600 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-8">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">The Question</span>
                <h2 className="text-2xl font-black leading-tight">"{current.questionText}"</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-200">
                  <ListChecks size={20} />
                  <h3 className="text-sm font-black uppercase tracking-widest">Ideal Logic Roadmap</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {analysis.demoLogicRoadmap && analysis.demoLogicRoadmap.length > 0 ? (
                    analysis.demoLogicRoadmap.map((step, i) => (
                      <React.Fragment key={i}>
                        <div className="bg-white/10 border border-white/20 px-5 py-2.5 rounded-2xl text-xs font-bold backdrop-blur-md">
                          {step}
                        </div>
                        {i < analysis.demoLogicRoadmap.length - 1 && <ChevronRight className="text-indigo-300" size={16} />}
                      </React.Fragment>
                    ))
                  ) : (
                    <p className="text-xs text-indigo-200 italic">No logic roadmap available.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          </div>

          <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm flex flex-col">
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles size={20} className="text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900">Personalized Demo Answer</h3>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference only</span>
            </div>
            <div className="p-10 space-y-6">
              <div 
                className="text-slate-700 leading-relaxed text-lg font-medium demo-answer-rich"
                dangerouslySetInnerHTML={{ __html: (analysis.demoAnswer || "").replace(/<u>/g, '<span class="bg-indigo-50 text-indigo-700 font-black px-1.5 rounded-md border-b-2 border-indigo-200">').replace(/<\/u>/g, '</span>') }}
              />
              <div className="pt-6 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Improvement Path</p>
                <ul className="space-y-3">
                  {analysis.logicUpgrades && analysis.logicUpgrades.length > 0 ? (
                    analysis.logicUpgrades.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0" />
                        {tip}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-400 italic">No specific logic upgrades available.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm">
            <div className="p-8 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-3">
              <MessageSquare size={20} className="text-slate-900" />
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Your Transcript</h3>
            </div>
            <div className="p-10 text-slate-500 font-medium italic leading-relaxed text-sm">
              {analysis.transcript || "No speech detected."}
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/80 backdrop-blur-md border border-slate-200 p-2 rounded-full shadow-2xl z-50">
        <button 
          disabled={activeTab === 0}
          onClick={() => setActiveTab(prev => prev - 1)}
          className="p-4 bg-slate-100 rounded-full hover:bg-slate-200 disabled:opacity-20 transition-all text-slate-900"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {activeTab + 1} / {results.length}
        </div>
        <button 
          disabled={activeTab === results.length - 1}
          onClick={() => setActiveTab(prev => prev + 1)}
          className="p-4 bg-slate-900 rounded-full hover:bg-slate-800 disabled:opacity-20 transition-all text-white"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

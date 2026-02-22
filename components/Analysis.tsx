
import React, { useState } from 'react';
import { HistoryItem, QuestionAnswer } from '../types';
import {
  CheckCircle, Target, Award, MessageSquare, ChevronLeft, ChevronRight, ArrowRightCircle, Sparkles, Brain, ListChecks, Zap, RotateCw, Layout, Compass, Crown, Lock
} from 'lucide-react';

interface Props {
  result: any; // Using the aggregate score calculated in App
  historyItem?: HistoryItem;
  results: QuestionAnswer[];
  onHome: () => void;
  onPracticeWeakness: (weakAnswers: QuestionAnswer[]) => void;
  tier?: 'free' | 'trial' | 'paid';
  onUpgrade?: () => void;
}

export const Analysis: React.FC<Props> = ({ result, results, onHome, onPracticeWeakness, tier = 'free', onUpgrade }) => {
  const isFree = tier === 'free';
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

  const LockedSection = ({ title, children }: { title?: string, children?: React.ReactNode }) => (
    <div className="relative rounded-[2rem] overflow-hidden">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6">
        <Lock size={24} className="text-slate-300 mb-3" />
        <p className="text-sm font-black text-slate-700 mb-1">{title || 'Pro Feature'}</p>
        <p className="text-xs text-slate-400 mb-4">Unlock full report with a free trial</p>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
          >
            Unlock Full Report
          </button>
        )}
      </div>
      <div className="filter blur-sm pointer-events-none select-none" aria-hidden="true">
        {children}
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

  // Truncate expert critique for free users (first 120 chars)
  const truncatedCritique = analysis.expertCritique
    ? analysis.expertCritique.length > 120
      ? analysis.expertCritique.substring(0, 120) + '...'
      : analysis.expertCritique
    : '';

  return (
    <div className="min-h-screen w-full max-w-7xl mx-auto p-4 md:p-10 space-y-8 animate-fade-in pb-32">
      {/* Header - always visible */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-6 md:pb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg">
            <Award size={24} className="md:w-7 md:h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Interview Report</h1>
            <p className="text-slate-500 font-medium text-xs md:text-base">Aggregate Performance Score: {result.overallScore}%</p>
          </div>
        </div>
        <div className="flex gap-2 md:gap-4 w-full md:w-auto">
            {!isFree && (
              <button onClick={handleRetrain} className="flex-1 md:flex-none justify-center px-4 py-3 bg-white text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-50 rounded-2xl font-bold transition-all flex items-center gap-2 text-xs md:text-sm">
                  <RotateCw size={16} /> <span className="whitespace-nowrap">Retrain Weakness</span>
              </button>
            )}
            <button onClick={onHome} className="flex-1 md:flex-none justify-center px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl text-xs md:text-sm">Close</button>
        </div>
      </div>

      {/* Free tier: Upgrade CTA banner */}
      {isFree && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[2rem] p-6 md:p-8 text-white text-center space-y-3">
          <Lock size={28} className="mx-auto" />
          <h3 className="text-lg font-black">Upgrade to See Your Full Report</h3>
          <p className="text-indigo-100 text-sm max-w-md mx-auto">
            Below is a preview. Unlock detailed scores, expert critiques, strategic frameworks, CEO-level answers, and more.
          </p>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="px-8 py-3 bg-white text-indigo-700 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all shadow-lg"
            >
              Start 7-Day Free Trial
            </button>
          )}
        </div>
      )}

      {/* Question Selector Tabs - always visible */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap border transition-all ${
              activeTab === i
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
              : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
            }`}
          >
            Q{i + 1} {r.analysis ? `- ${r.analysis.overallScore}%` : ''}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Left Side: Performance Metrics & Critique */}
        <div className="lg:col-span-4 space-y-6">
          {/* Performance Matrix - locked for free */}
          {isFree ? (
            <LockedSection title="Performance Matrix">
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 space-y-6 md:space-y-8">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Zap size={20} />
                  <h3 className="text-xs md:text-sm font-black uppercase tracking-widest">Performance Matrix</h3>
                </div>
                <div className="space-y-6">
                  <ScoreBar label="Logic Consistency" score={65} color="bg-blue-500" />
                  <ScoreBar label="Conciseness" score={72} color="bg-emerald-500" />
                  <ScoreBar label="Precision" score={58} color="bg-violet-500" />
                </div>
              </div>
            </LockedSection>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm space-y-6 md:space-y-8">
              <div className="flex items-center gap-2 text-indigo-600">
                <Zap size={20} />
                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest">Performance Matrix</h3>
              </div>
              <div className="space-y-6">
                <ScoreBar label="Logic Consistency" score={analysis.logicScore || 0} color="bg-blue-500" />
                <ScoreBar label="Conciseness" score={analysis.concisenessScore || 0} color="bg-emerald-500" />
                <ScoreBar label="Precision" score={analysis.precisionScore || 0} color="bg-violet-500" />
              </div>
            </div>
          )}

          {/* Expert Perspective - show truncated for free, full for paid */}
          {isFree ? (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <Brain size={20} />
                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest">Expert Perspective</h3>
              </div>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed italic">
                "{truncatedCritique}"
              </p>
              {analysis.expertCritique && analysis.expertCritique.length > 120 && (
                <div className="pt-2 border-t border-slate-100 text-center">
                  {onUpgrade && (
                    <button onClick={onUpgrade} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 mx-auto">
                      <Lock size={12} /> Read Full Critique
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <Brain size={20} />
                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest">Expert Perspective</h3>
              </div>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed italic">
                "{analysis.expertCritique}"
              </p>
            </div>
          )}

          {/* Strategic Framework - locked for free */}
          {isFree ? (
            <LockedSection title="Strategic Framework">
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Compass size={20} />
                  <h3 className="text-xs md:text-sm font-black uppercase tracking-widest">Strategic Framework</h3>
                </div>
                <div className="space-y-4">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-wide">STAR Method</span>
                  <p className="mt-2 text-xs text-slate-500 leading-snug">A structured approach to answering behavioral interview questions...</p>
                </div>
              </div>
            </LockedSection>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <Compass size={20} />
                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest">Strategic Framework</h3>
              </div>
              {analysis.answerFramework ? (
                <div className="space-y-4">
                    <div>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-wide">
                            {analysis.answerFramework.name}
                        </span>
                        <p className="mt-2 text-xs text-slate-500 leading-snug">
                            {analysis.answerFramework.explanation}
                        </p>
                    </div>
                    <div className="space-y-3 pt-2">
                        {analysis.answerFramework.steps.map((s, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                        {i + 1}
                                    </div>
                                    {i < analysis.answerFramework.steps.length - 1 && <div className="w-px h-full bg-slate-100 my-1"></div>}
                                </div>
                                <div className="pb-2">
                                    <p className="text-xs font-bold text-slate-900">{s.step}</p>
                                    <p className="text-[11px] text-slate-500 leading-snug">{s.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No framework suggestion available.</p>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Logic Roadmap & Demo Answer */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          {/* Question + Logic Roadmap - always visible */}
          <div className="bg-indigo-600 text-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-6 md:space-y-8">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">The Question</span>
                <h2 className="text-base md:text-lg font-bold leading-tight">"{current.questionText}"</h2>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">{analysis.overallScore}%</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Score</span>
                </div>
              </div>

              {!isFree && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-200">
                    <ListChecks size={20} />
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-widest">Ideal Logic Roadmap</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {analysis.demoLogicRoadmap && analysis.demoLogicRoadmap.length > 0 ? (
                      analysis.demoLogicRoadmap.map((step, i) => (
                        <React.Fragment key={i}>
                          <div className="bg-white/10 border border-white/20 px-3 py-2 md:px-5 md:py-2.5 rounded-2xl text-[10px] md:text-xs font-bold backdrop-blur-md">
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
              )}
            </div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          </div>

          {/* CEO Answer - locked for free */}
          {isFree ? (
            <LockedSection title="CEO Level Perspective">
              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] md:rounded-[3rem] overflow-hidden">
                <div className="p-6 md:p-8 bg-black/20 border-b border-white/10 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg text-white shadow-lg">
                    <Crown size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">CEO Level Perspective</h3>
                    <p className="text-[10px] text-amber-200 font-medium">Visionary & Strategic Answer</p>
                  </div>
                </div>
                <div className="p-6 md:p-10">
                  <p className="text-slate-300 text-sm font-serif italic">The executive perspective on this question would demonstrate strategic vision and leadership acumen by framing the answer around business impact and organizational value...</p>
                </div>
              </div>
            </LockedSection>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
              <div className="p-6 md:p-8 bg-black/20 border-b border-white/10 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg text-white shadow-lg">
                    <Crown size={20} />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-white">CEO Level Perspective</h3>
                    <p className="text-[10px] text-amber-200 font-medium">Visionary & Strategic Answer</p>
                  </div>
                </div>
              </div>
              <div className="p-6 md:p-10 relative z-10">
                <div
                  className="text-slate-300 leading-relaxed text-sm md:text-base font-serif italic demo-answer-rich"
                  dangerouslySetInnerHTML={{ __html: (analysis.ceoDemoAnswer || "Executive insight unavailable.") }}
                />
              </div>
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl"></div>
            </div>
          )}

          {/* Standard Demo Answer - locked for free */}
          {isFree ? (
            <LockedSection title="Standard Professional Answer">
              <div className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[3rem] overflow-hidden">
                <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                  <Sparkles size={20} className="text-indigo-600" />
                  <h3 className="text-base font-black text-slate-900">Standard Professional Answer</h3>
                </div>
                <div className="p-6 md:p-10">
                  <p className="text-slate-700 text-sm font-medium">A well-structured professional answer would begin by establishing context, then walk through the key decision points with concrete examples from your experience...</p>
                </div>
              </div>
            </LockedSection>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-sm flex flex-col">
              <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles size={20} className="text-indigo-600" />
                  <h3 className="text-base md:text-lg font-black text-slate-900">Standard Professional Answer</h3>
                </div>
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</span>
              </div>
              <div className="p-6 md:p-10 space-y-6">
                <div
                  className="text-slate-700 leading-relaxed text-sm md:text-base font-medium demo-answer-rich"
                  dangerouslySetInnerHTML={{ __html: (analysis.demoAnswer || "").replace(/<u>/g, '<span class="bg-indigo-50 text-indigo-700 font-black px-1.5 rounded-md border-b-2 border-indigo-200">').replace(/<\/u>/g, '</span>') }}
                />
                <div className="pt-6 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Improvement Path</p>
                  <ul className="space-y-3">
                    {analysis.logicUpgrades && analysis.logicUpgrades.length > 0 ? (
                      analysis.logicUpgrades.map((tip, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs md:text-sm text-slate-600 font-medium">
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
          )}

          {/* Transcript - locked for free */}
          {isFree ? (
            <LockedSection title="Your Transcript">
              <div className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[3rem] overflow-hidden">
                <div className="p-6 md:p-8 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-3">
                  <MessageSquare size={20} className="text-slate-900" />
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Your Transcript</h3>
                </div>
                <div className="p-6 md:p-10 text-slate-500 font-medium italic text-xs">
                  Your full speech transcript will appear here with AI analysis of your response structure and content...
                </div>
              </div>
            </LockedSection>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-sm">
              <div className="p-6 md:p-8 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-3">
                <MessageSquare size={20} className="text-slate-900" />
                <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight">Your Transcript</h3>
              </div>
              <div className="p-6 md:p-10 text-slate-500 font-medium italic leading-relaxed text-xs md:text-sm">
                {analysis.transcript || "No speech detected."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons - always visible */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-md border border-slate-200 p-2 rounded-full shadow-2xl z-50">
        <button
          disabled={activeTab === 0}
          onClick={() => setActiveTab(prev => prev - 1)}
          className="p-3 md:p-4 bg-slate-100 rounded-full hover:bg-slate-200 disabled:opacity-20 transition-all text-slate-900"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="px-2 md:px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
          {activeTab + 1} / {results.length}
        </div>
        <button
          disabled={activeTab === results.length - 1}
          onClick={() => setActiveTab(prev => prev + 1)}
          className="p-3 md:p-4 bg-slate-900 rounded-full hover:bg-slate-800 disabled:opacity-20 transition-all text-white"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

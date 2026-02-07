
import React, { useState, useEffect } from 'react';
import { AppStep, SessionConfig, QuestionAnswer, SessionMode, HistoryItem, ExperienceLevel, UserProfile } from './types';
import { SessionSetup } from './components/SessionSetup';
import { Stage } from './components/Stage';
import { Analysis } from './components/Analysis';
import { Home } from './components/Home';
import { analyzeAnswer } from './services/geminiService';
import { saveHistoryItem } from './services/historyService';
import { getCurrentUser } from './services/authService';
import { Loader2, Sparkles } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.HOME);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [practiceContext, setPracticeContext] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
  }, []);

  const handleStartSession = (mode?: SessionMode) => {
    setPracticeContext(null); // Clear previous practice context
    setStep(AppStep.SETUP);
  };

  const handleSetupComplete = (config: SessionConfig) => {
    setSessionConfig(config);
    setAnswers([]);
    setStep(AppStep.STAGE);
  };

  const handleFinishQuestion = (blob: Blob, duration: number, index: number) => {
    if (!sessionConfig) return;
    const q = sessionConfig.questions[index];
    setAnswers(prev => [...prev, {
      questionId: q.id,
      questionText: q.text,
      audioBlob: blob,
      duration
    }]);
  };

  const handleAllFinished = (finalBlob?: Blob, finalDuration?: number, finalIndex?: number) => {
    let finalAnswers = [...answers];
    if (finalBlob && sessionConfig && finalIndex !== undefined) {
       const q = sessionConfig.questions[finalIndex];
       const lastAnswer = {
          questionId: q.id,
          questionText: q.text,
          audioBlob: finalBlob,
          duration: finalDuration || 0
       };
       finalAnswers = [...finalAnswers, lastAnswer];
       setAnswers(finalAnswers); // Update state for UI consistency
    }
    processAnalysis(finalAnswers);
  };

  const processAnalysis = async (answersToAnalyze: QuestionAnswer[]) => {
    if (!sessionConfig) return;
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    const analyzedAnswers: QuestionAnswer[] = [];
    for (let i = 0; i < answersToAnalyze.length; i++) {
      setAnalysisProgress(Math.round(((i) / answersToAnalyze.length) * 100));
      const res = await analyzeAnswer(
        answersToAnalyze[i].audioBlob,
        answersToAnalyze[i].questionText,
        sessionConfig.jobTitle,
        sessionConfig.jobDescription,
        sessionConfig.cvText,
        sessionConfig.experienceLevel,
        sessionConfig.language || "English"
      );
      analyzedAnswers.push({ ...answersToAnalyze[i], analysis: res });
    }
    
    setAnalysisProgress(100);
    const avgScore = Math.round(analyzedAnswers.reduce((a, b) => a + (b.analysis?.overallScore || 0), 0) / analyzedAnswers.length);
    
    // Refresh user state to ensure we have latest info before saving
    const user = await getCurrentUser();

    if (user && !user.isGuest) {
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        userId: user.id,
        date: new Date().toISOString(),
        jobTitle: sessionConfig.jobTitle,
        score: avgScore,
        results: analyzedAnswers
      };
      await saveHistoryItem(historyItem as any);
    }
    
    setAnswers(analyzedAnswers);
    setIsAnalyzing(false);
    setStep(AppStep.ANALYSIS);
  };

  const handlePracticeWeakness = (weakAnswers: QuestionAnswer[]) => {
    if (!sessionConfig) return;
    
    const summary = weakAnswers.map(a => `Question: "${a.questionText}" -> Score: ${a.analysis?.overallScore}. Critique: ${a.analysis?.expertCritique}`).join('\n');
    const excluded = answers.map(a => a.questionText);
    
    setPracticeContext({
      weaknesses: summary,
      excludedQuestions: excluded,
      jobTitle: sessionConfig.jobTitle,
      jd: sessionConfig.jobDescription,
      level: sessionConfig.experienceLevel
    });
    
    setStep(AppStep.SETUP);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {step === AppStep.HOME && <Home 
        onStartSession={handleStartSession} 
        onViewHistory={() => {}} 
        onOpenSettings={() => {}} 
        onViewSession={(item) => {
          setAnswers(item.results);
          setSessionConfig({ jobTitle: item.jobTitle } as any);
          setStep(AppStep.ANALYSIS);
        }} 
      />}
      {step === AppStep.SETUP && (
        <SessionSetup 
          onNext={handleSetupComplete} 
          onHome={() => setStep(AppStep.HOME)} 
          practiceContext={practiceContext}
        />
      )}
      {step === AppStep.STAGE && sessionConfig && (
        <Stage 
          config={sessionConfig} 
          onFinishQuestion={handleFinishQuestion} 
          onAllFinished={handleAllFinished} 
        />
      )}
      {step === AppStep.ANALYSIS && sessionConfig && (
        <Analysis 
          result={{
            overallScore: Math.round(answers.reduce((a, b) => a + (b.analysis?.overallScore || 0), 0) / answers.length)
          }}
          results={answers}
          onHome={() => setStep(AppStep.HOME)}
          onPracticeWeakness={handlePracticeWeakness}
        />
      )}

      {isAnalyzing && (
        <div className="fixed inset-0 z-[999] bg-white flex flex-col items-center justify-center p-10 animate-fade-in">
           <div className="w-full max-w-sm space-y-8 text-center">
              <div className="relative">
                <Loader2 className="w-24 h-24 text-indigo-600 animate-spin mx-auto" strokeWidth={1} />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400" size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">Conducting Executive Review</h2>
                <p className="text-slate-400 text-sm font-medium italic">Benchmarking answers against CV & JD...</p>
              </div>
              <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${analysisProgress}%` }}></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

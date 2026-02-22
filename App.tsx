
import React, { useState, useEffect } from 'react';
import { AppStep, SessionConfig, QuestionAnswer, SessionMode, HistoryItem, ExperienceLevel, UserProfile, SubscriptionInfo } from './types';
import { SessionSetup } from './components/SessionSetup';
import { Stage } from './components/Stage';
import { Analysis } from './components/Analysis';
import { Home } from './components/Home';
import { PricingPage } from './components/PricingPage';
import { UpgradePrompt } from './components/UpgradePrompt';
import { analyzeAnswer } from './services/geminiService';
import { saveHistoryItem } from './services/historyService';
import { getCurrentUser } from './services/authService';
import { isAuthenticated, setTokens, subscriptionApi } from './services/api';
import { Loader2, Sparkles } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.HOME);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [practiceContext, setPracticeContext] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const goToSubscription = () => {
    if (window.location.pathname === '/subscription') return;
    window.location.href = '/subscription';
  };

  // Handle OAuth callback, subscription return, and URL routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessTokenParam = params.get('accessToken');
    const refreshTokenParam = params.get('refreshToken');
    const subscriptionParam = params.get('subscription');

    // Detect /subscription URL
    if (window.location.pathname === '/subscription') {
      setStep(AppStep.PRICING);
    }

    // OAuth callback — tokens in URL (from /auth/callback or any path)
    if (accessTokenParam && refreshTokenParam) {
      setTokens(accessTokenParam, refreshTokenParam);
      // Always redirect to home after storing tokens
      window.history.replaceState({}, '', '/');

      getCurrentUser().then(user => {
        setCurrentUser(user);
        if (user && !user.isGuest) {
          loadSubscription();
        }
      });
      return;
    }

    // Subscription success return
    if (subscriptionParam === 'success') {
      window.history.replaceState({}, '', '/');
      loadSubscription().then(() => {
        window.location.href = '/';
      });
      return;
    }

    // If stuck on /auth/callback without tokens, redirect home
    if (window.location.pathname === '/auth/callback') {
      window.location.href = '/';
      return;
    }

    // Normal load
    getCurrentUser().then(user => {
      setCurrentUser(user);
      if (user && !user.isGuest && isAuthenticated()) {
        loadSubscription();
      }
    });
  }, []);

  const loadSubscription = async () => {
    try {
      const info = await subscriptionApi.getStatus();
      setSubscriptionInfo(info);
    } catch (e) {
      console.error('Failed to load subscription:', e);
    }
  };

  const handleStartSession = (mode?: SessionMode) => {
    setPracticeContext(null);
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
       setAnswers(finalAnswers);
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

  // Determine tier for feature gating
  const tier = subscriptionInfo?.tier || 'free';
  const isGuest = currentUser?.isGuest ?? true;

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
        subscriptionInfo={subscriptionInfo}
        onPricing={goToSubscription}
        onUserChanged={(user) => {
          setCurrentUser(user);
          if (user && !user.isGuest && isAuthenticated()) {
            loadSubscription();
          } else {
            setSubscriptionInfo(null);
          }
        }}
      />}
      {step === AppStep.SETUP && (
        <SessionSetup
          onNext={handleSetupComplete}
          onHome={() => setStep(AppStep.HOME)}
          practiceContext={practiceContext}
          tier={tier}
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
          tier={tier}
          onUpgrade={goToSubscription}
        />
      )}
      {step === AppStep.PRICING && (
        <PricingPage
          onBack={() => { window.location.href = '/'; }}
          subscriptionInfo={subscriptionInfo}
          lockMode={subscriptionInfo?.requiresUpgrade && isAuthenticated()}
        />
      )}

      {showUpgradePrompt && step !== AppStep.PRICING && subscriptionInfo?.upgradeReason && (
        <UpgradePrompt
          reason={subscriptionInfo.upgradeReason}
          onUpgrade={() => {
            setShowUpgradePrompt(false);
            goToSubscription();
          }}
          onDismiss={() => setShowUpgradePrompt(false)}
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

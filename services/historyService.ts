
import { HistoryItem } from '../types';
import localforage from 'localforage';
import { isAuthenticated, interviewApi } from './api';

const DB_NAME = 'InstantSpeechDB';
const STORE_NAME = 'history';

// Initialize localforage
localforage.config({
  name: DB_NAME,
  storeName: STORE_NAME
});

// Convert backend InterviewSession to frontend HistoryItem
function backendToHistoryItem(session: any): HistoryItem {
  return {
    id: session.id,
    userId: session.userId,
    date: session.createdAt,
    jobTitle: session.jobTitle,
    score: session.aggregateScore,
    results: (session.answers || []).map((a: any) => ({
      questionId: a.id,
      questionText: a.questionText,
      audioBlob: new Blob(),
      duration: a.duration || 0,
      analysis: {
        overallScore: a.overallScore || 0,
        logicScore: a.logicScore || 0,
        concisenessScore: a.concisenessScore || 0,
        precisionScore: a.precisionScore || 0,
        expertCritique: a.expertCritique || '',
        transcript: a.transcript || '',
        demoAnswer: a.demoAnswer || '',
        ceoDemoAnswer: a.ceoDemoAnswer || '',
        demoLogicRoadmap: a.demoLogicRoadmap || [],
        answerFramework: a.answerFramework || { name: '', explanation: '', steps: [] },
        logicUpgrades: a.logicUpgrades || [],
      },
    })),
  };
}

// One-time migration: upload old IndexedDB sessions to the database
let migrationDone = false;
async function migrateLocalToApi(): Promise<void> {
  if (migrationDone) return;
  migrationDone = true;
  try {
    const localSessions = await localforage.getItem<HistoryItem[]>('sessions');
    if (!localSessions || localSessions.length === 0) return;

    console.log(`Migrating ${localSessions.length} local sessions to database...`);
    let successCount = 0;
    for (const item of localSessions) {
      try {
        await interviewApi.saveSession({
          jobTitle: item.jobTitle || 'Untitled Session',
          aggregateScore: item.score || 0,
          answers: (item.results || []).map(r => ({
            questionText: r.questionText,
            duration: r.duration,
            transcript: r.analysis?.transcript,
            overallScore: r.analysis?.overallScore,
            logicScore: r.analysis?.logicScore,
            concisenessScore: r.analysis?.concisenessScore,
            precisionScore: r.analysis?.precisionScore,
            expertCritique: r.analysis?.expertCritique,
            demoAnswer: r.analysis?.demoAnswer,
            ceoDemoAnswer: r.analysis?.ceoDemoAnswer,
            demoLogicRoadmap: r.analysis?.demoLogicRoadmap,
            answerFramework: r.analysis?.answerFramework,
            logicUpgrades: r.analysis?.logicUpgrades,
          })),
        });
        successCount++;
      } catch (e) {
        console.error('Failed to migrate session:', item.jobTitle, e);
      }
    }
    // Only clear local data if ALL sessions were saved successfully
    if (successCount === localSessions.length) {
      await localforage.removeItem('sessions');
      console.log('Migration complete — local sessions moved to database.');
    } else if (successCount > 0) {
      console.warn(`Migration partial: ${successCount}/${localSessions.length} sessions saved. Local data kept.`);
      migrationDone = false; // Allow retry
    } else {
      console.error('Migration failed: no sessions could be saved. Local data kept.');
      migrationDone = false; // Allow retry
    }
  } catch (e) {
    console.error('Migration failed:', e);
    migrationDone = false; // Allow retry on next load
  }
}

export const getHistory = async (): Promise<HistoryItem[]> => {
  // Authenticated users: fetch from backend API
  if (isAuthenticated()) {
    // Run one-time migration of old IndexedDB data
    await migrateLocalToApi();
    try {
      const sessions = await interviewApi.getHistory();
      return (Array.isArray(sessions) ? sessions : []).map(backendToHistoryItem);
    } catch (e) {
      console.error("Failed to load history from API, falling back to local", e);
    }
  }
  // Fallback: IndexedDB for guests
  try {
    const stored = await localforage.getItem<HistoryItem[]>('sessions');
    return stored || [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveHistoryItem = async (
  item: HistoryItem,
  sessionConfig?: {
    jobDescription?: string;
    cvText?: string;
    experienceLevel?: string;
    language?: string;
    focusBalance?: number;
  }
) => {
  // Authenticated users: save to backend API
  if (isAuthenticated()) {
    try {
      await interviewApi.saveSession({
        jobTitle: item.jobTitle,
        jobDescription: sessionConfig?.jobDescription,
        cvText: sessionConfig?.cvText,
        experienceLevel: sessionConfig?.experienceLevel,
        language: sessionConfig?.language,
        focusBalance: sessionConfig?.focusBalance,
        aggregateScore: item.score,
        answers: item.results.map(r => ({
          questionText: r.questionText,
          duration: r.duration,
          transcript: r.analysis?.transcript,
          overallScore: r.analysis?.overallScore,
          logicScore: r.analysis?.logicScore,
          concisenessScore: r.analysis?.concisenessScore,
          precisionScore: r.analysis?.precisionScore,
          expertCritique: r.analysis?.expertCritique,
          demoAnswer: r.analysis?.demoAnswer,
          ceoDemoAnswer: r.analysis?.ceoDemoAnswer,
          demoLogicRoadmap: r.analysis?.demoLogicRoadmap,
          answerFramework: r.analysis?.answerFramework,
          logicUpgrades: r.analysis?.logicUpgrades,
        })),
      });
      return;
    } catch (e) {
      console.error("Failed to save to API, falling back to local", e);
    }
  }
  // Fallback: IndexedDB for guests
  try {
    const history = await getHistory();
    const updated = [item, ...history].slice(0, 50);
    await localforage.setItem('sessions', updated);
  } catch (e) {
    console.error("Failed to save history", e);
  }
};

export const getUserProfile = async (): Promise<{ cvText: string }> => {
  if (isAuthenticated()) {
    try {
      const data = await interviewApi.getCv();
      return { cvText: data.cvText || '' };
    } catch (e) {
      // Fall through to local
    }
  }
  try {
    const profile = await localforage.getItem<{ cvText: string }>('user_profile');
    return profile || { cvText: '' };
  } catch (e) {
    return { cvText: '' };
  }
};

export const saveUserProfile = async (cvText: string) => {
  if (isAuthenticated()) {
    try {
      await interviewApi.saveCv(cvText);
      return;
    } catch (e) {
      console.error("Failed to save CV to API, falling back to local", e);
    }
  }
  try {
    await localforage.setItem('user_profile', { cvText });
  } catch (e) {
    console.error("Failed to save profile", e);
  }
};

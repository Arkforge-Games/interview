
export enum AppStep {
  ONBOARDING = 'ONBOARDING',
  HOME = 'HOME',
  SETUP = 'SETUP',
  QUESTION_REVIEW = 'QUESTION_REVIEW',
  STAGE = 'STAGE',
  ANALYSIS = 'ANALYSIS'
}

export enum SessionMode {
  MOCK_INTERVIEW = 'MOCK_INTERVIEW',
  INTERVIEWER_GUIDE = 'INTERVIEWER_GUIDE',
  STARR_DRILL = 'STARR_DRILL',
  SPEECH = 'SPEECH',
  EXPRESS = 'EXPRESS',
  DEBATE = 'DEBATE',
  COMEDY = 'COMEDY'
}

export enum ExperienceLevel {
  FRESH_GRAD = 'FRESH_GRAD',
  JUNIOR = 'JUNIOR',
  MID_LEVEL = 'MID_LEVEL',
  SENIOR = 'SENIOR',
  EXECUTIVE = 'EXECUTIVE'
}

export enum EducationLevel {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  UNIVERSITY = 'UNIVERSITY',
  PROFESSIONAL = 'PROFESSIONAL'
}

export enum DrillType {
  LOGIC = 'LOGIC',
  FLOW = 'FLOW',
  CONTENT = 'CONTENT',
  IMPACT = 'IMPACT'
}

export interface UserPreferences {
  topics: string[];
  preferredMode: SessionMode;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  category: 'Intro' | 'Experience' | 'Behavioral' | 'Technical';
}

export interface SessionConfig {
  jobTitle: string;
  companyName: string;
  yearsOfExperience: string;
  jobDescription: string;
  cvText: string;
  experienceLevel: ExperienceLevel;
  language: string;
  mode: SessionMode;
  focusBalance: number; // 0 (Behavioral) to 100 (Technical)
  questions: InterviewQuestion[];
  backupQuestions: InterviewQuestion[]; 
}

export interface QuestionAnalysis {
  overallScore: number;
  logicScore: number;
  concisenessScore: number;
  precisionScore: number;
  expertCritique: string;
  transcript: string;
  demoAnswer: string; 
  ceoDemoAnswer: string; // New field for Executive level answer
  demoLogicRoadmap: string[]; 
  answerFramework: {
    name: string;
    explanation: string;
    steps: { step: string; detail: string }[];
  };
  logicUpgrades: string[];
}

export type AnalysisResult = QuestionAnalysis;

export interface QuestionAnswer {
  questionId: string;
  questionText: string;
  audioBlob: Blob;
  duration: number;
  analysis?: QuestionAnalysis;
}

export interface DrillBatchResult {
  overallImprovement: string;
  rounds: {
    round: number;
    score: number;
    prompt: string;
    transcript: string;
    logicFeedback: string;
    vocabUpgrades: { original: string; suggested: string; tip: string }[];
    polishedVersion: string;
    keyTransitions: string[];
  }[];
}

export interface HistoryItem {
  id: string;
  userId: string; // New field to link to user
  date: string;
  jobTitle: string;
  score: number;
  results: QuestionAnswer[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
  cvText?: string;
}

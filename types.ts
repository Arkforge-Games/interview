
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

// Fix: Add missing EducationLevel enum used by VirtualCoach and DrillSession
export enum EducationLevel {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  UNIVERSITY = 'UNIVERSITY',
  PROFESSIONAL = 'PROFESSIONAL'
}

// Fix: Add missing DrillType enum used by DrillSession
export enum DrillType {
  LOGIC = 'LOGIC',
  FLOW = 'FLOW',
  CONTENT = 'CONTENT',
  IMPACT = 'IMPACT'
}

// Fix: Add missing UserPreferences interface used by Onboarding
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
  questions: InterviewQuestion[];
}

export interface QuestionAnalysis {
  overallScore: number;
  logicScore: number;
  concisenessScore: number;
  precisionScore: number;
  expertCritique: string;
  transcript: string;
  demoAnswer: string; // Will include <u>placeholders</u>
  demoLogicRoadmap: string[]; // ["1. Action", "2. Outcome"]
  vocabUpgrades: { original: string; suggested: string }[];
  logicUpgrades: string[];
}

// Fix: Add missing AnalysisResult alias used by VirtualCoach
export type AnalysisResult = QuestionAnalysis;

export interface QuestionAnswer {
  questionId: string;
  questionText: string;
  audioBlob: Blob;
  duration: number;
  analysis?: QuestionAnalysis;
}

// Fix: Add missing DrillBatchResult interface used by DrillSession
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
  date: string;
  jobTitle: string;
  score: number;
  results: QuestionAnswer[];
}
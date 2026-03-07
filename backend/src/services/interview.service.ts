import { interviewRepository, CreateInterviewAnswerData } from '../repositories/interview.repository';
import { userRepository } from '../repositories/user.repository';
import { QuestionCategory } from '@prisma/client';
import { Errors } from '../middleware/errorHandler';

function mapCategory(cat?: string): QuestionCategory | undefined {
  if (!cat) return undefined;
  const map: Record<string, QuestionCategory> = {
    'Intro': 'INTRO',
    'Experience': 'EXPERIENCE',
    'Behavioral': 'BEHAVIORAL',
    'Technical': 'TECHNICAL',
    'Scenario': 'SCENARIO',
  };
  return map[cat] || undefined;
}

export interface SaveInterviewInput {
  jobTitle: string;
  jobDescription?: string;
  cvText?: string;
  experienceLevel?: string;
  language?: string;
  focusBalance?: number;
  aggregateScore: number;
  answers: {
    questionText: string;
    category?: string;
    duration?: number;
    transcript?: string;
    overallScore?: number;
    logicScore?: number;
    concisenessScore?: number;
    precisionScore?: number;
    expertCritique?: string;
    demoAnswer?: string;
    ceoDemoAnswer?: string;
    demoLogicRoadmap?: string[];
    answerFramework?: any;
    logicUpgrades?: string[];
  }[];
}

export const interviewService = {
  async saveSession(userId: string, input: SaveInterviewInput) {
    const answersData: CreateInterviewAnswerData[] = input.answers.map((a, index) => ({
      questionIndex: index,
      questionText: a.questionText,
      category: mapCategory(a.category),
      duration: a.duration,
      transcript: a.transcript,
      overallScore: a.overallScore,
      logicScore: a.logicScore,
      concisenessScore: a.concisenessScore,
      precisionScore: a.precisionScore,
      expertCritique: a.expertCritique,
      demoAnswer: a.demoAnswer,
      ceoDemoAnswer: a.ceoDemoAnswer,
      demoLogicRoadmap: a.demoLogicRoadmap,
      answerFramework: a.answerFramework,
      logicUpgrades: a.logicUpgrades,
    }));

    return interviewRepository.createWithAnswers(
      {
        userId,
        jobTitle: input.jobTitle,
        jobDescription: input.jobDescription,
        cvText: input.cvText,
        experienceLevel: input.experienceLevel,
        language: input.language,
        focusBalance: input.focusBalance,
        questionCount: input.answers.length,
        aggregateScore: input.aggregateScore,
      },
      answersData
    );
  },

  async getHistory(userId: string, limit?: number, offset?: number) {
    const [sessions, total] = await Promise.all([
      interviewRepository.findByUserId(userId, limit, offset),
      interviewRepository.countByUserId(userId),
    ]);
    return { sessions, total };
  },

  async getSession(userId: string, sessionId: string) {
    const session = await interviewRepository.findById(sessionId);
    if (!session) throw Errors.notFound('Interview session not found');
    if (session.userId !== userId) throw Errors.forbidden('Access denied');
    return session;
  },

  async deleteSession(userId: string, sessionId: string) {
    const session = await interviewRepository.findById(sessionId);
    if (!session) throw Errors.notFound('Interview session not found');
    if (session.userId !== userId) throw Errors.forbidden('Access denied');
    await interviewRepository.delete(sessionId);
  },

  async saveCvText(userId: string, cvText: string) {
    return userRepository.update(userId, { cvText } as any);
  },

  async getCvText(userId: string): Promise<string | null> {
    const user = await userRepository.findById(userId);
    return (user as any)?.cvText || null;
  },
};

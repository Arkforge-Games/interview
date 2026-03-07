import { prisma } from '../config/database';
import { InterviewSession, InterviewAnswer, QuestionCategory } from '@prisma/client';

export interface CreateInterviewSessionData {
  userId: string;
  jobTitle: string;
  jobDescription?: string;
  cvText?: string;
  experienceLevel?: string;
  language?: string;
  focusBalance?: number;
  questionCount?: number;
  aggregateScore: number;
}

export interface CreateInterviewAnswerData {
  questionIndex: number;
  questionText: string;
  category?: QuestionCategory;
  duration?: number;
  transcript?: string;
  overallScore?: number;
  logicScore?: number;
  concisenessScore?: number;
  precisionScore?: number;
  expertCritique?: string;
  demoAnswer?: string;
  ceoDemoAnswer?: string;
  demoLogicRoadmap?: any;
  answerFramework?: any;
  logicUpgrades?: any;
}

export const interviewRepository = {
  async createWithAnswers(
    sessionData: CreateInterviewSessionData,
    answersData: CreateInterviewAnswerData[]
  ): Promise<InterviewSession & { answers: InterviewAnswer[] }> {
    return prisma.interviewSession.create({
      data: {
        ...sessionData,
        answers: {
          create: answersData,
        },
      },
      include: { answers: { orderBy: { questionIndex: 'asc' } } },
    });
  },

  async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<(InterviewSession & { answers: InterviewAnswer[] })[]> {
    return prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { answers: { orderBy: { questionIndex: 'asc' } } },
    });
  },

  async findById(id: string): Promise<(InterviewSession & { answers: InterviewAnswer[] }) | null> {
    return prisma.interviewSession.findUnique({
      where: { id },
      include: { answers: { orderBy: { questionIndex: 'asc' } } },
    });
  },

  async countByUserId(userId: string): Promise<number> {
    return prisma.interviewSession.count({
      where: { userId },
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.interviewSession.delete({
      where: { id },
    });
  },
};

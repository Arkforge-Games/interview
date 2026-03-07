import { Request, Response, NextFunction } from 'express';
import { interviewService } from '../services/interview.service';
import { sendSuccess } from '../utils/response';
import { Errors } from '../middleware/errorHandler';

export const interviewController = {
  async saveSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw Errors.unauthorized();
      const session = await interviewService.saveSession(req.user.sub, req.body);
      sendSuccess(res, session, 201);
    } catch (error) {
      next(error);
    }
  },

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw Errors.unauthorized();
      const limit = parseInt(String(req.query.limit)) || 50;
      const offset = parseInt(String(req.query.offset)) || 0;
      const { sessions, total } = await interviewService.getHistory(req.user.sub, limit, offset);
      sendSuccess(res, sessions, 200, {
        total,
        page: Math.floor(offset / limit) + 1,
        perPage: limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },

  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw Errors.unauthorized();
      const session = await interviewService.getSession(req.user.sub, req.params.id as string);
      sendSuccess(res, session);
    } catch (error) {
      next(error);
    }
  },

  async deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw Errors.unauthorized();
      await interviewService.deleteSession(req.user.sub, req.params.id as string);
      sendSuccess(res, { message: 'Session deleted' });
    } catch (error) {
      next(error);
    }
  },

  async saveCv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw Errors.unauthorized();
      const { cvText } = req.body;
      if (typeof cvText !== 'string') throw Errors.badRequest('cvText must be a string');
      await interviewService.saveCvText(req.user.sub, cvText);
      sendSuccess(res, { message: 'CV saved' });
    } catch (error) {
      next(error);
    }
  },

  async getCv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw Errors.unauthorized();
      const cvText = await interviewService.getCvText(req.user.sub);
      sendSuccess(res, { cvText: cvText || '' });
    } catch (error) {
      next(error);
    }
  },
};

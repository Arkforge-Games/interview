import { Router } from 'express';
import { interviewController } from '../controllers/interview.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Static routes BEFORE dynamic :id to avoid conflicts
router.put('/profile/cv', requireAuth, interviewController.saveCv);
router.get('/profile/cv', requireAuth, interviewController.getCv);

// CRUD
router.post('/', requireAuth, interviewController.saveSession);
router.get('/', requireAuth, interviewController.getHistory);
router.get('/:id', requireAuth, interviewController.getSession);
router.delete('/:id', requireAuth, interviewController.deleteSession);

export default router;

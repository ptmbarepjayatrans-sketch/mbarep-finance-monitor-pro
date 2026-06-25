import { Router, Request, Response, NextFunction } from 'express';
import { AiAssistantService } from './ai.service.js';
import { authenticateToken, AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const aiService = new AiAssistantService();

router.use(authenticateToken);

// POST /ai/chat
router.post('/chat', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { question } = req.body;
    const answer = await aiService.chat(req.userId!, question);
    res.json(createSuccessResponse('Answer generated', { question, answer }));
  } catch (error) {
    next(error);
  }
});

export const aiRouter = router;

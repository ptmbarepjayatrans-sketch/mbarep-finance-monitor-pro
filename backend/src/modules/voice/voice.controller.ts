import { Router, Request, Response, NextFunction } from 'express';
import { VoiceEngineService } from './voice.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const voiceService = new VoiceEngineService();

router.use(authenticateToken);

// POST /voice/generate
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, amount, language = 'id', packId } = req.body;
    const voice = await voiceService.generateVoice({
      text,
      amount: BigInt(amount),
      language,
      packId,
    });
    res.json(createSuccessResponse('Voice generated', voice));
  } catch (error) {
    next(error);
  }
});

// GET /voice/packs
router.get('/packs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const language = req.query.language as string | undefined;
    const packs = await voiceService.getVoicePacks(language);
    res.json(createSuccessResponse('Voice packs retrieved', packs));
  } catch (error) {
    next(error);
  }
});

// POST /voice/packs
router.post('/packs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pack = await voiceService.createVoicePack(req.body);
    res.status(201).json(createSuccessResponse('Voice pack created', pack));
  } catch (error) {
    next(error);
  }
});

export const voiceRouter = router;

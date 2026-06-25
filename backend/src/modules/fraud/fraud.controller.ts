import { Router, Request, Response, NextFunction } from 'express';
import { FraudDetectionService } from './fraud.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const fraudService = new FraudDetectionService();

router.use(authenticateToken);

// POST /fraud/analyze/:transactionId
router.post('/analyze/:transactionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transactionId } = req.params;
    const result = await fraudService.analyzeTransaction(transactionId);
    res.json(createSuccessResponse('Transaction analyzed', result));
  } catch (error) {
    next(error);
  }
});

// GET /fraud/anomalies
router.get('/anomalies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.query.branchId as string;
    const anomalies = await fraudService.detectAnomalies(branchId);
    res.json(createSuccessResponse('Anomalies detected', anomalies));
  } catch (error) {
    next(error);
  }
});

export const fraudRouter = router;

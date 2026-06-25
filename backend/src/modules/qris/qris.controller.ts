import { Router, Request, Response, NextFunction } from 'express';
import { QrisService } from './qris.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const qrisService = new QrisService();

router.use(authenticateToken);

// POST /qris
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qrisTransaction = await qrisService.createQrisTransaction(req.body);
    res.status(201).json(createSuccessResponse('QRIS transaction created', qrisTransaction));
  } catch (error) {
    next(error);
  }
});

// GET /qris/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qrisTransaction = await qrisService.getQrisTransactionById(req.params.id);
    res.json(createSuccessResponse('QRIS transaction retrieved', qrisTransaction));
  } catch (error) {
    next(error);
  }
});

// GET /qris
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await qrisService.listQrisTransactions(page, limit);
    res.json(createSuccessResponse('QRIS transactions retrieved', result));
  } catch (error) {
    next(error);
  }
});

// GET /qris/settlement
router.get('/settlement/:merchantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId } = req.params;
    const { startDate, endDate } = req.query;
    const settlement = await qrisService.getQrisSettlement(
      merchantId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json(createSuccessResponse('Settlement retrieved', settlement));
  } catch (error) {
    next(error);
  }
});

// POST /qris/:id/settle
router.post('/:id/settle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settledAmount } = req.body;
    const qrisTransaction = await qrisService.settleQrisTransaction(req.params.id, BigInt(settledAmount));
    res.json(createSuccessResponse('QRIS transaction settled', qrisTransaction));
  } catch (error) {
    next(error);
  }
});

// GET /qris/performance/:merchantId
router.get('/performance/:merchantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId } = req.params;
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
    const performance = await qrisService.getQrisPerformance(merchantId, period);
    res.json(createSuccessResponse('Performance retrieved', performance));
  } catch (error) {
    next(error);
  }
});

export const qrisRouter = router;

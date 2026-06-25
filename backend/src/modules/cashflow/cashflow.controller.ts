import { Router, Request, Response, NextFunction } from 'express';
import { CashflowService } from './cashflow.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const cashflowService = new CashflowService();

router.use(authenticateToken);

// GET /cashflow
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branchId as string) || null;
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
    const cashflow = await cashflowService.calculateCashflow(branchId, period);
    res.json(createSuccessResponse('Cashflow calculated', cashflow));
  } catch (error) {
    next(error);
  }
});

// GET /cashflow/forecast
router.get('/forecast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branchId as string) || null;
    const days = parseInt(req.query.days as string) || 30;
    const forecast = await cashflowService.getCashflowForecast(branchId, days);
    res.json(createSuccessResponse('Forecast generated', forecast));
  } catch (error) {
    next(error);
  }
});

// GET /cashflow/health
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branchId as string) || null;
    const health = await cashflowService.getFinancialHealth(branchId);
    res.json(createSuccessResponse('Financial health retrieved', health));
  } catch (error) {
    next(error);
  }
});

// GET /cashflow/breakeven
router.get('/breakeven', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branchId as string) || null;
    const analysis = await cashflowService.getBreakEvenAnalysis(branchId);
    res.json(createSuccessResponse('Break-even analysis retrieved', analysis));
  } catch (error) {
    next(error);
  }
});

export const cashflowRouter = router;

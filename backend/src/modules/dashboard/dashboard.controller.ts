import { Router, Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const dashboardService = new DashboardService();

router.use(authenticateToken);

// GET /dashboard/summary
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branchId as string) || '';
    const summary = await dashboardService.getSummary(branchId);
    res.json(createSuccessResponse('Dashboard summary retrieved', summary));
  } catch (error) {
    next(error);
  }
});

// GET /dashboard/revenue
router.get('/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branchId as string) || '';
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
    const revenue = await dashboardService.getRevenue(branchId, period);
    res.json(createSuccessResponse('Revenue data retrieved', revenue));
  } catch (error) {
    next(error);
  }
});

// GET /dashboard/cashflow
router.get('/cashflow', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branchId as string) || '';
    const cashflow = await dashboardService.getCashflow(branchId);
    res.json(createSuccessResponse('Cashflow data retrieved', cashflow));
  } catch (error) {
    next(error);
  }
});

// GET /dashboard/merchants
router.get('/merchants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branchId as string) || '';
    const merchants = await dashboardService.getTopMerchants(branchId);
    res.json(createSuccessResponse('Top merchants retrieved', merchants));
  } catch (error) {
    next(error);
  }
});

// GET /dashboard/alerts
router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branchId as string) || '';
    const alerts = await dashboardService.getAlerts(branchId);
    res.json(createSuccessResponse('Alerts retrieved', alerts));
  } catch (error) {
    next(error);
  }
});

export const dashboardRouter = router;

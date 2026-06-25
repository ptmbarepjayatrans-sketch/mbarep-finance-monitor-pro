import { Router, Request, Response, NextFunction } from 'express';
import { MonitoringService } from './monitoring.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const monitoringService = new MonitoringService();

router.use(authenticateToken);

// GET /monitoring/health
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await monitoringService.getHealthStatus();
    res.json(createSuccessResponse('Health status retrieved', health));
  } catch (error) {
    next(error);
  }
});

// GET /monitoring/metrics
router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const metrics = await monitoringService.getSystemMetrics(limit);
    res.json(createSuccessResponse('Metrics retrieved', metrics));
  } catch (error) {
    next(error);
  }
});

// GET /monitoring/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hours = parseInt(req.query.hours as string) || 1;
    const stats = await monitoringService.getMetricsStats(hours);
    res.json(createSuccessResponse('Stats retrieved', stats));
  } catch (error) {
    next(error);
  }
});

// POST /monitoring/metric
router.post('/metric', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metric = await monitoringService.recordSystemMetric(req.body);
    res.status(201).json(createSuccessResponse('Metric recorded', metric));
  } catch (error) {
    next(error);
  }
});

export const monitoringRouter = router;

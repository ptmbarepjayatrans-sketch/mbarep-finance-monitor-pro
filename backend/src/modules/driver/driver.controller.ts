import { Router, Request, Response, NextFunction } from 'express';
import { DriverService } from './driver.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const driverService = new DriverService();

router.use(authenticateToken);

// POST /drivers
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driver = await driverService.createDriver(req.body);
    res.status(201).json(createSuccessResponse('Driver created', driver));
  } catch (error) {
    next(error);
  }
});

// GET /drivers/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driver = await driverService.getDriverById(req.params.id);
    res.json(createSuccessResponse('Driver retrieved', driver));
  } catch (error) {
    next(error);
  }
});

// GET /drivers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.query.branchId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await driverService.listDrivers(branchId, page, limit);
    res.json(createSuccessResponse('Drivers retrieved', result));
  } catch (error) {
    next(error);
  }
});

// GET /drivers/top/:branchId
router.get('/top/:branchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const drivers = await driverService.getTopDrivers(branchId, limit);
    res.json(createSuccessResponse('Top drivers retrieved', drivers));
  } catch (error) {
    next(error);
  }
});

// PATCH /drivers/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const driver = await driverService.updateDriverStatus(req.params.id, status);
    res.json(createSuccessResponse('Driver status updated', driver));
  } catch (error) {
    next(error);
  }
});

// POST /drivers/:id/earning
router.post('/:id/earning', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body;
    const driver = await driverService.recordEarning(req.params.id, BigInt(amount));
    res.json(createSuccessResponse('Earning recorded', driver));
  } catch (error) {
    next(error);
  }
});

export const driverRouter = router;

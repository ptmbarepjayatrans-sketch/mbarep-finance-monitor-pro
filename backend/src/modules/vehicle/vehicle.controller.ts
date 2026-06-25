import { Router, Request, Response, NextFunction } from 'express';
import { VehicleService } from './vehicle.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const vehicleService = new VehicleService();

router.use(authenticateToken);

// POST /vehicles
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vehicle = await vehicleService.createVehicle(req.body);
    res.status(201).json(createSuccessResponse('Vehicle created', vehicle));
  } catch (error) {
    next(error);
  }
});

// GET /vehicles/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id);
    res.json(createSuccessResponse('Vehicle retrieved', vehicle));
  } catch (error) {
    next(error);
  }
});

// GET /vehicles
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.query.branchId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await vehicleService.listVehicles(branchId, page, limit);
    res.json(createSuccessResponse('Vehicles retrieved', result));
  } catch (error) {
    next(error);
  }
});

// GET /vehicles/type/:type
router.get('/type/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.query.branchId as string;
    const { type } = req.params;
    const vehicles = await vehicleService.getVehiclesByType(branchId, type);
    res.json(createSuccessResponse('Vehicles retrieved', vehicles));
  } catch (error) {
    next(error);
  }
});

// GET /vehicles/top/:branchId
router.get('/top/:branchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const vehicles = await vehicleService.getTopVehicles(branchId, limit);
    res.json(createSuccessResponse('Top vehicles retrieved', vehicles));
  } catch (error) {
    next(error);
  }
});

// PATCH /vehicles/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const vehicle = await vehicleService.updateVehicleStatus(req.params.id, status);
    res.json(createSuccessResponse('Vehicle status updated', vehicle));
  } catch (error) {
    next(error);
  }
});

export const vehicleRouter = router;

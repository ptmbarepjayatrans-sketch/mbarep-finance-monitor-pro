import { Router, Request, Response, NextFunction } from 'express';
import { WallboardService } from './wallboard.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const wallboardService = new WallboardService();

router.use(authenticateToken);

// GET /wallboard
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branchId as string) || undefined;
    const data = await wallboardService.getWallboardData(branchId);
    res.json(createSuccessResponse('Wallboard data retrieved', data));
  } catch (error) {
    next(error);
  }
});

export const wallboardRouter = router;

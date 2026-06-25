import { Router, Request, Response, NextFunction } from 'express';
import { BranchService } from './branch.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const branchService = new BranchService();

router.use(authenticateToken);

// POST /branches
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branch = await branchService.createBranch(req.body);
    res.status(201).json(createSuccessResponse('Branch created', branch));
  } catch (error) {
    next(error);
  }
});

// GET /branches/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branch = await branchService.getBranchById(req.params.id);
    res.json(createSuccessResponse('Branch retrieved', branch));
  } catch (error) {
    next(error);
  }
});

// GET /branches
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await branchService.listBranches(page, limit);
    res.json(createSuccessResponse('Branches retrieved', result));
  } catch (error) {
    next(error);
  }
});

// GET /branches/:id/performance
router.get('/:id/performance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const performance = await branchService.getBranchPerformance(req.params.id);
    res.json(createSuccessResponse('Branch performance retrieved', performance));
  } catch (error) {
    next(error);
  }
});

// GET /branches/ranking/all
router.get('/ranking/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ranking = await branchService.getRanking();
    res.json(createSuccessResponse('Branch ranking retrieved', ranking));
  } catch (error) {
    next(error);
  }
});

export const branchRouter = router;

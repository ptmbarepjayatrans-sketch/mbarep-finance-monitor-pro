import { Router, Request, Response, NextFunction } from 'express';
import { ReconciliationService } from './reconciliation.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const reconciliationService = new ReconciliationService();

router.use(authenticateToken);

// POST /reconciliation/by-amount
router.post('/by-amount', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, amount, invoiceId } = req.body;
    const result = await reconciliationService.reconcileByAmount(branchId, BigInt(amount), invoiceId);
    res.json(createSuccessResponse('Reconciliation completed', result));
  } catch (error) {
    next(error);
  }
});

// POST /reconciliation/by-date
router.post('/by-date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, startDate, endDate, totalAmount } = req.body;
    const result = await reconciliationService.reconcileByDateRange(
      branchId,
      new Date(startDate),
      new Date(endDate),
      BigInt(totalAmount)
    );
    res.json(createSuccessResponse('Reconciliation completed', result));
  } catch (error) {
    next(error);
  }
});

// GET /reconciliation/status
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.query.branchId as string;
    const status = await reconciliationService.getReconciliationStatus(branchId);
    res.json(createSuccessResponse('Reconciliation status retrieved', status));
  } catch (error) {
    next(error);
  }
});

export const reconciliationRouter = router;

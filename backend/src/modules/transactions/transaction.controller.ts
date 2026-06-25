import { Router, Request, Response, NextFunction } from 'express';
import { TransactionService } from './transaction.service.js';
import { createSuccessResponse } from '../../utils/response.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';

const router = Router();
const transactionService = new TransactionService();

router.use(authenticateToken);

// POST /transactions
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transaction = await transactionService.createTransaction(req.body);
    res.status(201).json(createSuccessResponse('Transaction created', transaction));
  } catch (error) {
    next(error);
  }
});

// GET /transactions/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id);
    res.json(createSuccessResponse('Transaction retrieved', transaction));
  } catch (error) {
    next(error);
  }
});

// GET /transactions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: any = {};
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.branchId) filter.branchId = req.query.branchId;

    const result = await transactionService.listTransactions(filter, page, limit);
    res.json(createSuccessResponse('Transactions retrieved', result));
  } catch (error) {
    next(error);
  }
});

// PUT /transactions/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transaction = await transactionService.updateTransaction(req.params.id, req.body);
    res.json(createSuccessResponse('Transaction updated', transaction));
  } catch (error) {
    next(error);
  }
});

// DELETE /transactions/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await transactionService.deleteTransaction(req.params.id);
    res.json(createSuccessResponse('Transaction deleted'));
  } catch (error) {
    next(error);
  }
});

// POST /transactions/:id/reconcile
router.post('/:id/reconcile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transaction = await transactionService.reconcileTransaction(req.params.id, req.body.invoiceId);
    res.json(createSuccessResponse('Transaction reconciled', transaction));
  } catch (error) {
    next(error);
  }
});

export const transactionRouter = router;

import { Router, Request, Response, NextFunction } from 'express';
import { CustomerService } from './customer.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const customerService = new CustomerService();

router.use(authenticateToken);

// GET /customers/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    res.json(createSuccessResponse('Customer retrieved', customer));
  } catch (error) {
    next(error);
  }
});

// GET /customers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await customerService.listCustomers(page, limit);
    res.json(createSuccessResponse('Customers retrieved', result));
  } catch (error) {
    next(error);
  }
});

// GET /customers/top/list
router.get('/top/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const customers = await customerService.getTopCustomers(limit);
    res.json(createSuccessResponse('Top customers retrieved', customers));
  } catch (error) {
    next(error);
  }
});

// GET /customers/ranking/all
router.get('/ranking/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ranking = await customerService.getRanking();
    res.json(createSuccessResponse('Customer ranking retrieved', ranking));
  } catch (error) {
    next(error);
  }
});

// POST /customers/:id/notes
router.post('/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { note, priority } = req.body;
    const result = await customerService.addCustomerNote(req.params.id, note, priority);
    res.status(201).json(createSuccessResponse('Note added', result));
  } catch (error) {
    next(error);
  }
});

export const customerRouter = router;

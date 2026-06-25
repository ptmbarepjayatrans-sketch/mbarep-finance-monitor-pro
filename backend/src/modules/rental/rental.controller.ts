import { Router, Request, Response, NextFunction } from 'express';
import { RentalService } from './rental.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const rentalService = new RentalService();

router.use(authenticateToken);

// POST /rentals
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rental = await rentalService.createRental(req.body);
    res.status(201).json(createSuccessResponse('Rental created', rental));
  } catch (error) {
    next(error);
  }
});

// POST /rentals/:id/complete
router.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rental = await rentalService.completeRental(req.params.id, req.body);
    res.json(createSuccessResponse('Rental completed', rental));
  } catch (error) {
    next(error);
  }
});

// GET /rentals/history/:customerId
router.get('/history/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rentals = await rentalService.getRentalHistory(req.params.customerId);
    res.json(createSuccessResponse('Rental history retrieved', rentals));
  } catch (error) {
    next(error);
  }
});

export const rentalRouter = router;

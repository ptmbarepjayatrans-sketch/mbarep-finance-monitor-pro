import { Router, Request, Response, NextFunction } from 'express';
import { BookingService } from './booking.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const bookingService = new BookingService();

router.use(authenticateToken);

// POST /bookings
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await bookingService.createBooking(req.body);
    res.status(201).json(createSuccessResponse('Booking created', booking));
  } catch (error) {
    next(error);
  }
});

// POST /bookings/:id/passengers
router.post('/:id/passengers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const passenger = await bookingService.addPassenger(req.params.id, req.body);
    res.status(201).json(createSuccessResponse('Passenger added', passenger));
  } catch (error) {
    next(error);
  }
});

// GET /bookings/:id/manifest
router.get('/:id/manifest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const manifest = await bookingService.generateManifest(req.params.id);
    res.json(createSuccessResponse('Manifest generated', manifest));
  } catch (error) {
    next(error);
  }
});

// PATCH /bookings/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const booking = await bookingService.updateBookingStatus(req.params.id, status);
    res.json(createSuccessResponse('Booking status updated', booking));
  } catch (error) {
    next(error);
  }
});

// GET /bookings/history/:customerId
router.get('/history/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await bookingService.getBookingHistory(req.params.customerId);
    res.json(createSuccessResponse('Booking history retrieved', bookings));
  } catch (error) {
    next(error);
  }
});

export const bookingRouter = router;

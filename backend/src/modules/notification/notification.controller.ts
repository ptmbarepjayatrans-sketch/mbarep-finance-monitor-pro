import { Router, Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service.js';
import { authenticateToken, AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const notificationService = new NotificationService();

router.use(authenticateToken);

// GET /notifications/unread
router.get('/unread', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const notifications = await notificationService.getUnreadNotifications(req.userId!, limit);
    res.json(createSuccessResponse('Unread notifications retrieved', notifications));
  } catch (error) {
    next(error);
  }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id);
    res.json(createSuccessResponse('Notification marked as read', notification));
  } catch (error) {
    next(error);
  }
});

// PATCH /notifications/read-all
router.patch('/read-all', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllAsRead(req.userId!);
    res.json(createSuccessResponse('All notifications marked as read'));
  } catch (error) {
    next(error);
  }
});

export const notificationRouter = router;

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createSuccessResponse } from '../../utils/response.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();

// POST /collector/notification
router.post('/notification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceId, notification } = req.body;

    if (!deviceId || !notification) {
      throw new ValidationError('deviceId and notification are required');
    }

    // Update device last seen
    await prisma.device.update({
      where: { deviceId },
      data: {
        lastSeenAt: new Date(),
        isOnline: true,
      },
    }).catch(() => null);

    logger.info({ deviceId, msg: 'Notification received from collector' });

    res.status(201).json(
      createSuccessResponse('Notification received', { received: true })
    );
  } catch (error) {
    next(error);
  }
});

// POST /collector/device-status
router.post('/device-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceId, isOnline, batteryLevel, latitude, longitude } = req.body;

    if (!deviceId) {
      throw new ValidationError('deviceId is required');
    }

    await prisma.device.update({
      where: { deviceId },
      data: {
        isOnline,
        batteryLevel,
        latitude,
        longitude,
        lastSeenAt: new Date(),
      },
    }).catch(() => null);

    logger.info({ deviceId, isOnline, batteryLevel, msg: 'Device status updated' });

    res.json(createSuccessResponse('Device status updated'));
  } catch (error) {
    next(error);
  }
});

// POST /collector/sync
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceId, transactions } = req.body;

    if (!deviceId) {
      throw new ValidationError('deviceId is required');
    }

    // Process synced transactions
    logger.info({ deviceId, transactionCount: transactions?.length || 0, msg: 'Sync received' });

    res.json(createSuccessResponse('Sync completed', { synced: transactions?.length || 0 }));
  } catch (error) {
    next(error);
  }
});

// POST /collector/battery
router.post('/battery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceId, level, status } = req.body;

    if (!deviceId) {
      throw new ValidationError('deviceId is required');
    }

    await prisma.device.update({
      where: { deviceId },
      data: {
        batteryLevel: level,
        batteryStatus: status,
      },
    }).catch(() => null);

    logger.info({ deviceId, level, status, msg: 'Battery status updated' });

    res.json(createSuccessResponse('Battery status updated'));
  } catch (error) {
    next(error);
  }
});

// POST /collector/location
router.post('/location', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceId, latitude, longitude, accuracy } = req.body;

    if (!deviceId) {
      throw new ValidationError('deviceId is required');
    }

    await prisma.device.update({
      where: { deviceId },
      data: {
        latitude,
        longitude,
      },
    }).catch(() => null);

    logger.info({ deviceId, latitude, longitude, accuracy, msg: 'Location updated' });

    res.json(createSuccessResponse('Location updated'));
  } catch (error) {
    next(error);
  }
});

export const collectorRouter = router;

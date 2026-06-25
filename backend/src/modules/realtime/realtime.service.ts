import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export interface IRealtimeEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export class RealtimeService {
  async emitTransactionCreated(transactionId: string, io: any): Promise<void> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) return;

    io.to(`branch-${transaction.branchId}`).emit('transaction.created', {
      transactionId,
      type: transaction.type,
      amount: transaction.amount,
      timestamp: new Date(),
    });

    logger.info({ transactionId, msg: 'Realtime: transaction.created emitted' });
  }

  async emitTransactionUpdated(transactionId: string, io: any): Promise<void> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) return;

    io.to(`branch-${transaction.branchId}`).emit('transaction.updated', {
      transactionId,
      status: transaction.status,
      reconciliationStatus: transaction.reconciliationStatus,
      timestamp: new Date(),
    });

    logger.info({ transactionId, msg: 'Realtime: transaction.updated emitted' });
  }

  async emitDeviceStatus(deviceId: string, isOnline: boolean, io: any): Promise<void> {
    io.emit('device.status', {
      deviceId,
      isOnline,
      timestamp: new Date(),
    });

    logger.info({ deviceId, isOnline, msg: 'Realtime: device.status emitted' });
  }

  async emitNotification(userId: string, notification: any, io: any): Promise<void> {
    io.to(`user-${userId}`).emit('notification.created', {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      timestamp: new Date(),
    });

    logger.info({ userId, notificationId: notification.id, msg: 'Realtime: notification.created emitted' });
  }

  async emitVoicePlay(userId: string, voiceData: any, io: any): Promise<void> {
    io.to(`user-${userId}`).emit('voice.play', {
      url: voiceData.url,
      text: voiceData.text,
      timestamp: new Date(),
    });

    logger.info({ userId, msg: 'Realtime: voice.play emitted' });
  }

  async emitDashboardRefresh(branchId: string, io: any): Promise<void> {
    io.to(`branch-${branchId}`).emit('dashboard.refresh', {
      timestamp: new Date(),
    });

    logger.info({ branchId, msg: 'Realtime: dashboard.refresh emitted' });
  }
}

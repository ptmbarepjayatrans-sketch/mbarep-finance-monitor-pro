import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export interface INotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  channels: string[];
  data?: any;
}

export class NotificationService {
  async createNotification(payload: INotificationPayload) {
    const notification = await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        channels: payload.channels,
        data: payload.data,
      },
    });

    logger.info({ notificationId: notification.id, userId: payload.userId, msg: 'Notification created' });
    return notification;
  }

  async notifyTransactionReceived(userId: string, amount: bigint, description: string, channels: string[] = ['push']) {
    const amountNum = Number(amount);
    let title = 'Transaksi Baru';
    let message = `Dana ${this.formatCurrency(amountNum)} telah diterima`;

    if (amountNum >= 50000000) {
      title = 'Transaksi Besar!';
      message = `Transaksi BESAR sebesar ${this.formatCurrency(amountNum)} telah diterima dengan sukses!`;
      channels.push('whatsapp', 'email');
    } else if (amountNum >= 10000000) {
      title = 'Transaksi Prioritas';
      message = `Transaksi prioritas ${this.formatCurrency(amountNum)} diterima`;
      channels.push('whatsapp');
    }

    return await this.createNotification({
      userId,
      type: 'TRANSACTION_RECEIVED',
      title,
      message,
      channels: [...new Set(channels)],
      data: {
        amount: amount.toString(),
        description,
      },
    });
  }

  async notifySuspiciousActivity(userId: string, type: string, riskLevel: string) {
    const channels = riskLevel === 'critical' ? ['push', 'whatsapp', 'email', 'telegram'] : ['push', 'email'];

    return await this.createNotification({
      userId,
      type: 'SUSPICIOUS_ACTIVITY',
      title: `Aktivitas Mencurigakan - ${riskLevel.toUpperCase()}`,
      message: `Transaksi mencurigakan terdeteksi: ${type}`,
      channels,
      data: { type, riskLevel },
    });
  }

  async notifyReconciliationAlert(userId: string, unmatchedCount: number) {
    return await this.createNotification({
      userId,
      type: 'RECONCILIATION_ALERT',
      title: 'Rekonsiliasi Diperlukan',
      message: `${unmatchedCount} transaksi belum direkonsiliasi`,
      channels: ['push', 'email'],
      data: { unmatchedCount },
    });
  }

  async getUnreadNotifications(userId: string, limit: number = 20) {
    const notifications = await prisma.notification.findMany({
      where: { userId, isRead: false },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return notifications;
  }

  async markAsRead(notificationId: string) {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}

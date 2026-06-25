import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export class DashboardService {
  async getSummary(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = await prisma.transaction.findMany({
      where: {
        branchId,
        transactionDate: { gte: today },
        deletedAt: null,
      },
    });

    const todayTotal = todayTransactions.reduce((sum, t) => sum + t.amount, BigInt(0));
    const todayCount = todayTransactions.length;

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weekTransactions = await prisma.transaction.findMany({
      where: {
        branchId,
        transactionDate: { gte: weekStart },
        deletedAt: null,
      },
    });

    const weekTotal = weekTransactions.reduce((sum, t) => sum + t.amount, BigInt(0));

    const monthStart = new Date(today);
    monthStart.setDate(1);

    const monthTransactions = await prisma.transaction.findMany({
      where: {
        branchId,
        transactionDate: { gte: monthStart },
        deletedAt: null,
      },
    });

    const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, BigInt(0));

    const yearStart = new Date(today);
    yearStart.setMonth(0);
    yearStart.setDate(1);

    const yearTransactions = await prisma.transaction.findMany({
      where: {
        branchId,
        transactionDate: { gte: yearStart },
        deletedAt: null,
      },
    });

    const yearTotal = yearTransactions.reduce((sum, t) => sum + t.amount, BigInt(0));

    const onlineDevices = await prisma.device.count({
      where: { isOnline: true },
    });

    return {
      today: {
        total: todayTotal.toString(),
        count: todayCount,
        average: todayCount > 0 ? (todayTotal / BigInt(todayCount)).toString() : '0',
      },
      week: {
        total: weekTotal.toString(),
        count: weekTransactions.length,
      },
      month: {
        total: monthTotal.toString(),
        count: monthTransactions.length,
      },
      year: {
        total: yearTotal.toString(),
        count: yearTransactions.length,
      },
      devicesOnline: onlineDevices,
    };
  }

  async getRevenue(branchId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const today = new Date();
    const revenues: any = [];

    if (period === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const transactions = await prisma.transaction.findMany({
          where: {
            branchId,
            transactionDate: { gte: date, lt: nextDate },
            type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
            deletedAt: null,
          },
        });

        const total = transactions.reduce((sum, t) => sum + t.amount, BigInt(0));

        revenues.push({
          date: date.toISOString().split('T')[0],
          amount: total.toString(),
          count: transactions.length,
        });
      }
    }

    return revenues;
  }

  async getCashflow(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const inflow = await prisma.transaction.findMany({
      where: {
        branchId,
        transactionDate: { gte: today },
        type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT', 'TOP_UP'] },
        deletedAt: null,
      },
    });

    const outflow = await prisma.transaction.findMany({
      where: {
        branchId,
        transactionDate: { gte: today },
        type: { in: ['TRANSFER_OUT', 'WITHDRAWAL', 'FEE'] },
        deletedAt: null,
      },
    });

    const inflowTotal = inflow.reduce((sum, t) => sum + t.amount, BigInt(0));
    const outflowTotal = outflow.reduce((sum, t) => sum + t.amount, BigInt(0));
    const netflow = inflowTotal - outflowTotal;

    return {
      inflow: inflowTotal.toString(),
      outflow: outflowTotal.toString(),
      netflow: netflow.toString(),
      health: netflow > BigInt(0) ? 'healthy' : 'warning',
    };
  }

  async getTopMerchants(branchId: string, limit: number = 10) {
    const merchants = await prisma.merchant.findMany({
      where: {
        qrisTransactions: {
          some: { merchant: { code: { not: null } } },
        },
      },
      take: limit,
      orderBy: { totalAmount: 'desc' },
    });

    return merchants.map((m) => ({
      name: m.name,
      total: m.totalAmount.toString(),
      transactions: m.totalTransactions,
    }));
  }

  async getAlerts(branchId: string, limit: number = 20) {
    const suspiciousActivities = await prisma.suspiciousActivity.findMany({
      where: { isInvestigated: false },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return suspiciousActivities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      riskLevel: activity.riskLevel,
      createdAt: activity.createdAt,
    }));
  }
}

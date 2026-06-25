import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { NotFoundError } from '../../utils/errors.js';

const prisma = new PrismaClient();

export class QrisService {
  async createQrisTransaction(data: any) {
    const qrisTransaction = await prisma.qrisTransaction.create({
      data: {
        merchantId: data.merchantId,
        qrisCode: data.qrisCode,
        qrisType: data.qrisType,
        amount: BigInt(data.amount),
        currency: data.currency || 'IDR',
        description: data.description,
        referenceId: data.referenceId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });

    logger.info({ qrisId: qrisTransaction.id, msg: 'QRIS transaction created' });
    return qrisTransaction;
  }

  async getQrisTransactionById(id: string) {
    const qrisTransaction = await prisma.qrisTransaction.findUnique({
      where: { id, deletedAt: null },
      include: {
        merchant: true,
        transactions: true,
      },
    });

    if (!qrisTransaction) {
      throw new NotFoundError('QRIS transaction not found');
    }

    return qrisTransaction;
  }

  async listQrisTransactions(page: number = 1, limit: number = 50) {
    const [transactions, total] = await Promise.all([
      prisma.qrisTransaction.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        include: { merchant: true },
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.qrisTransaction.count({ where: { deletedAt: null } }),
    ]);

    return { transactions, total, page, limit };
  }

  async getQrisSettlement(merchantId: string, startDate: Date, endDate: Date) {
    const transactions = await prisma.qrisTransaction.findMany({
      where: {
        merchantId,
        transactionDate: { gte: startDate, lte: endDate },
        status: 'completed',
        deletedAt: null,
      },
    });

    const totalSettled = transactions.reduce((sum, t) => sum + t.settlementAmount, BigInt(0));
    const totalFee = transactions.reduce((sum, t) => sum + t.fee, BigInt(0));
    const netSettlement = totalSettled - totalFee;

    return {
      merchantId,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalSettled: totalSettled.toString(),
      totalFee: totalFee.toString(),
      netSettlement: netSettlement.toString(),
      transactionCount: transactions.length,
    };
  }

  async settleQrisTransaction(id: string, settledAmount: bigint) {
    const qrisTransaction = await prisma.qrisTransaction.findUnique({
      where: { id },
    });

    if (!qrisTransaction) {
      throw new NotFoundError('QRIS transaction not found');
    }

    return await prisma.qrisTransaction.update({
      where: { id },
      data: {
        status: 'completed',
        settlementAmount: settledAmount,
        settlementDate: new Date(),
      },
    });
  }

  async getQrisPerformance(merchantId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const today = new Date();
    const transactions: any = [];

    if (period === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const qrisTransactions = await prisma.qrisTransaction.findMany({
          where: {
            merchantId,
            transactionDate: { gte: date, lt: nextDate },
            status: 'completed',
            deletedAt: null,
          },
        });

        const total = qrisTransactions.reduce((sum, t) => sum + t.settlementAmount, BigInt(0));

        transactions.push({
          date: date.toISOString().split('T')[0],
          amount: total.toString(),
          count: qrisTransactions.length,
        });
      }
    }

    return transactions;
  }
}

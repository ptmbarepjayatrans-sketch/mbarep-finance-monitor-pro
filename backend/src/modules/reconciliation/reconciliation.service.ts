import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export interface IReconciliationResult {
  matchedCount: number;
  unmatchedCount: number;
  partiallyMatchedCount: number;
}

export class ReconciliationService {
  async reconcileByAmount(branchId: string, amount: bigint, invoiceId: string): Promise<IReconciliationResult> {
    const unmatched = await prisma.transaction.findMany({
      where: {
        branchId,
        amount,
        reconciliationStatus: 'unmatched',
        deletedAt: null,
      },
    });

    let matched = 0;
    let unmatched_count = 0;
    let partial = 0;

    for (const transaction of unmatched) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          reconciliationStatus: 'matched',
          notes: `Reconciled with invoice ${invoiceId}`,
        },
      });
      matched++;
    }

    logger.info({
      branchId,
      amount: amount.toString(),
      matched,
      msg: 'Transactions reconciled by amount',
    });

    return {
      matchedCount: matched,
      unmatchedCount: unmatched_count,
      partiallyMatchedCount: partial,
    };
  }

  async reconcileByDateRange(
    branchId: string,
    startDate: Date,
    endDate: Date,
    totalAmount: bigint
  ): Promise<IReconciliationResult> {
    const transactions = await prisma.transaction.findMany({
      where: {
        branchId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        reconciliationStatus: 'unmatched',
        deletedAt: null,
      },
    });

    const transactionTotal = transactions.reduce((sum, t) => sum + t.amount, BigInt(0));

    let matched = 0;
    let partial = 0;

    if (transactionTotal === totalAmount) {
      for (const transaction of transactions) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { reconciliationStatus: 'matched' },
        });
      }
      matched = transactions.length;
    } else if (transactionTotal < totalAmount) {
      partial = transactions.length;
      for (const transaction of transactions) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { reconciliationStatus: 'partially_matched' },
        });
      }
    }

    logger.info({
      branchId,
      matched,
      partial,
      msg: 'Transactions reconciled by date range',
    });

    return {
      matchedCount: matched,
      unmatchedCount: transactions.length - matched - partial,
      partiallyMatchedCount: partial,
    };
  }

  async getReconciliationStatus(branchId: string) {
    const [matched, unmatched, partial, review] = await Promise.all([
      prisma.transaction.count({
        where: { branchId, reconciliationStatus: 'matched', deletedAt: null },
      }),
      prisma.transaction.count({
        where: { branchId, reconciliationStatus: 'unmatched', deletedAt: null },
      }),
      prisma.transaction.count({
        where: { branchId, reconciliationStatus: 'partially_matched', deletedAt: null },
      }),
      prisma.transaction.count({
        where: { branchId, reconciliationStatus: 'review', deletedAt: null },
      }),
    ]);

    const total = matched + unmatched + partial + review;

    return {
      matched,
      unmatched,
      partial,
      review,
      total,
      matchRate: total > 0 ? (matched / total) * 100 : 0,
    };
  }
}

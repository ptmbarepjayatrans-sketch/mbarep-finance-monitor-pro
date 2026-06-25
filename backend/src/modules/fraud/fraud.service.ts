import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export class FraudDetectionService {
  async analyzeTransaction(transactionId: string): Promise<{ riskScore: number; flags: string[] }> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
      },
    });

    if (!transaction) {
      return { riskScore: 0, flags: [] };
    }

    let riskScore = 0;
    const flags: string[] = [];

    // 1. Unusual Amount
    const branchTransactions = await prisma.transaction.findMany({
      where: {
        branchId: transaction.branchId,
        transactionDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
        deletedAt: null,
      },
    });

    const avgAmount =
      branchTransactions.reduce((sum, t) => sum + t.amount, BigInt(0)) /
      BigInt(Math.max(branchTransactions.length, 1));
    const stdDev = this.calculateStdDev(
      branchTransactions.map((t) => Number(t.amount)),
      Number(avgAmount)
    );

    if (Number(transaction.amount) > Number(avgAmount) + stdDev * 3) {
      riskScore += 25;
      flags.push('UNUSUAL_AMOUNT');
    }

    // 2. Rapid Transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        branchId: transaction.branchId,
        transactionDate: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
        deletedAt: null,
      },
    });

    if (recentTransactions.length > 5) {
      riskScore += 20;
      flags.push('RAPID_TRANSACTIONS');
    }

    // 3. Duplicate Detection
    const duplicates = await prisma.transaction.findMany({
      where: {
        branchId: transaction.branchId,
        amount: transaction.amount,
        description: transaction.description,
        transactionDate: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
        },
        id: { not: transactionId },
        deletedAt: null,
      },
    });

    if (duplicates.length > 0) {
      riskScore += 30;
      flags.push('DUPLICATE_TRANSACTION');
    }

    // 4. Unusual Time
    const hour = new Date(transaction.transactionDate).getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 15;
      flags.push('UNUSUAL_TIME');
    }

    // 5. New Customer
    if (transaction.customer) {
      if (transaction.customer.totalTransactions < 3) {
        riskScore += 10;
        flags.push('NEW_CUSTOMER');
      }
    }

    // 6. Unreconciled Transaction
    if (transaction.reconciliationStatus === 'unmatched') {
      riskScore += 15;
      flags.push('UNRECONCILED');
    }

    // Create suspicious activity record if score is high
    if (riskScore > 50) {
      await prisma.suspiciousActivity.create({
        data: {
          type: 'HIGH_RISK_TRANSACTION',
          description: `Transaction ${transactionId} flagged with risk score ${riskScore}`,
          riskLevel: riskScore > 75 ? 'critical' : 'high',
          transactionId,
        },
      });

      logger.warn({ transactionId, riskScore, flags, msg: 'High risk transaction detected' });
    }

    return { riskScore: Math.min(riskScore, 100), flags };
  }

  private calculateStdDev(values: number[], mean: number): number {
    const squareDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  async detectAnomalies(branchId: string): Promise<any[]> {
    const anomalies: any[] = [];

    // Get transactions from last 24 hours
    const today = new Date();
    today.setDate(today.getDate() - 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        branchId,
        transactionDate: { gte: today },
        deletedAt: null,
      },
    });

    for (const transaction of transactions) {
      const { riskScore, flags } = await this.analyzeTransaction(transaction.id);
      if (riskScore > 40) {
        anomalies.push({
          transactionId: transaction.id,
          riskScore,
          flags,
          amount: transaction.amount.toString(),
        });
      }
    }

    return anomalies;
  }
}

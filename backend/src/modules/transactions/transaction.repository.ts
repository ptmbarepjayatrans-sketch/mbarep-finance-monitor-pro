import { PrismaClient, Transaction } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { NotFoundError } from '../../utils/errors.js';
import { ICreateTransactionDto, IUpdateTransactionDto, ITransaction, ITransactionFilter } from './types.js';

const prisma = new PrismaClient();

export class TransactionRepository {
  async create(data: ICreateTransactionDto): Promise<ITransaction> {
    const transaction = await prisma.transaction.create({
      data: {
        branchId: data.branchId,
        bankAccountId: data.bankAccountId,
        ewalletAccountId: data.ewalletAccountId,
        referenceId: data.referenceId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        sourceApplication: data.sourceApplication,
        fromAccount: data.fromAccount,
        toAccount: data.toAccount,
        fromName: data.fromName,
        toName: data.toName,
        merchantName: data.merchantName,
        merchantCategory: data.merchantCategory,
        customerId: data.customerId,
        merchantId: data.merchantId,
        notes: data.notes,
      },
    });

    logger.info({ transactionId: transaction.id, msg: 'Transaction created' });
    return this.mapToInterface(transaction);
  }

  async findById(id: string): Promise<ITransaction | null> {
    const transaction = await prisma.transaction.findUnique({
      where: { id, deletedAt: null },
    });
    return transaction ? this.mapToInterface(transaction) : null;
  }

  async findByReferenceId(branchId: string, referenceId: string): Promise<ITransaction | null> {
    const transaction = await prisma.transaction.findFirst({
      where: {
        branchId,
        referenceId,
        deletedAt: null,
      },
    });
    return transaction ? this.mapToInterface(transaction) : null;
  }

  async findAll(filter: ITransactionFilter, page: number = 1, limit: number = 50): Promise<{ data: ITransaction[]; total: number }> {
    const where: any = { deletedAt: null };

    if (filter.branchId) where.branchId = filter.branchId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.reconciliationStatus) where.reconciliationStatus = filter.reconciliationStatus;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.merchantId) where.merchantId = filter.merchantId;
    if (filter.isSuspicious !== undefined) where.isSuspicious = filter.isSuspicious;
    if (filter.isDuplicate !== undefined) where.isDuplicate = filter.isDuplicate;

    if (filter.fromDate || filter.toDate) {
      where.transactionDate = {};
      if (filter.fromDate) where.transactionDate.gte = filter.fromDate;
      if (filter.toDate) where.transactionDate.lte = filter.toDate;
    }

    if (filter.minAmount || filter.maxAmount) {
      where.amount = {};
      if (filter.minAmount) where.amount.gte = filter.minAmount;
      if (filter.maxAmount) where.amount.lte = filter.maxAmount;
    }

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      data: data.map((t) => this.mapToInterface(t)),
      total,
    };
  }

  async update(id: string, data: IUpdateTransactionDto): Promise<ITransaction> {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        notes: data.notes,
        reconciliationStatus: data.reconciliationStatus,
      },
    });

    if (data.tags && data.tags.length > 0) {
      await prisma.transactionTagOnTransaction.deleteMany({
        where: { transactionId: id },
      });

      for (const tagName of data.tags) {
        const tag = await prisma.transactionTag.findUnique({
          where: { name: tagName },
        });
        if (tag) {
          await prisma.transactionTagOnTransaction.create({
            data: {
              transactionId: id,
              tagId: tag.id,
            },
          });
        }
      }
    }

    logger.info({ transactionId: id, msg: 'Transaction updated' });
    return this.mapToInterface(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    logger.info({ transactionId: id, msg: 'Transaction deleted' });
  }

  async detectDuplicates(branchId: string, amount: bigint, description: string, windowMinutes: number = 5): Promise<string[]> {
    const timeWindow = new Date(Date.now() - windowMinutes * 60 * 1000);

    const duplicates = await prisma.transaction.findMany({
      where: {
        branchId,
        amount,
        description,
        transactionDate: { gte: timeWindow },
        deletedAt: null,
      },
      select: { id: true },
    });

    return duplicates.map((d) => d.id);
  }

  async calculateRiskScore(transactionId: string): Promise<number> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) return 0;

    let score = 0;

    // High amount = higher risk
    if (transaction.amount > BigInt(50000000)) score += 30;
    else if (transaction.amount > BigInt(10000000)) score += 20;
    else if (transaction.amount > BigInt(1000000)) score += 10;

    // Suspicious keywords
    const suspiciousKeywords = ['urgent', 'transfer', 'immediate', 'verify'];
    if (suspiciousKeywords.some((keyword) => transaction.description.toLowerCase().includes(keyword))) {
      score += 15;
    }

    // Reconciliation status
    if (transaction.reconciliationStatus === 'review') score += 20;

    // Check for duplicate transactions
    if (transaction.isDuplicate) score += 25;

    return Math.min(score, 100);
  }

  private mapToInterface(transaction: Transaction): ITransaction {
    return {
      id: transaction.id,
      branchId: transaction.branchId,
      referenceId: transaction.referenceId,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      status: transaction.status,
      reconciliationStatus: transaction.reconciliationStatus,
      riskScore: transaction.riskScore,
      isDuplicate: transaction.isDuplicate,
      isSuspicious: transaction.isSuspicious,
      transactionDate: transaction.transactionDate,
      createdAt: transaction.createdAt,
    };
  }
}

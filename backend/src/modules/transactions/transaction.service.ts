import { TransactionRepository } from './transaction.repository.js';
import { logger } from '../../utils/logger.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { ICreateTransactionDto, IUpdateTransactionDto, ITransaction, ITransactionFilter } from './types.js';

const transactionRepository = new TransactionRepository();

export class TransactionService {
  async createTransaction(data: ICreateTransactionDto): Promise<ITransaction> {
    // Validate unique reference
    const existing = await transactionRepository.findByReferenceId(data.branchId, data.referenceId);
    if (existing) {
      throw new ValidationError('Transaction with this reference already exists');
    }

    // Create transaction
    const transaction = await transactionRepository.create(data);

    // Calculate risk score
    const riskScore = await transactionRepository.calculateRiskScore(transaction.id);

    // Update risk score
    const updated = await transactionRepository.update(transaction.id, {});

    // Check for duplicates
    const duplicates = await transactionRepository.detectDuplicates(
      data.branchId,
      data.amount,
      data.description
    );

    if (duplicates.length > 0) {
      logger.warn({ transactionId: transaction.id, duplicates, msg: 'Duplicate transaction detected' });
    }

    logger.info({ transactionId: transaction.id, msg: 'Transaction created successfully' });
    return updated;
  }

  async getTransactionById(id: string): Promise<ITransaction> {
    const transaction = await transactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }
    return transaction;
  }

  async listTransactions(
    filter: ITransactionFilter,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: ITransaction[]; total: number; page: number; limit: number }> {
    const { data, total } = await transactionRepository.findAll(filter, page, limit);
    return { data, total, page, limit };
  }

  async updateTransaction(id: string, data: IUpdateTransactionDto): Promise<ITransaction> {
    const transaction = await transactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return await transactionRepository.update(id, data);
  }

  async deleteTransaction(id: string): Promise<void> {
    const transaction = await transactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }
    await transactionRepository.delete(id);
  }

  async reconcileTransaction(id: string, invoiceId?: string): Promise<ITransaction> {
    const transaction = await transactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return await transactionRepository.update(id, {
      reconciliationStatus: 'matched',
    });
  }
}

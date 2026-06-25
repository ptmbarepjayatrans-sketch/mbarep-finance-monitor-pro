export interface ICreateTransactionDto {
  branchId: string;
  bankAccountId?: string;
  ewalletAccountId?: string;
  referenceId: string;
  type: 'TRANSFER_IN' | 'TRANSFER_OUT' | 'QRIS' | 'MERCHANT' | 'TOP_UP' | 'REFUND' | 'CASHBACK' | 'SETTLEMENT' | 'FEE' | 'WITHDRAWAL';
  amount: bigint;
  description: string;
  sourceApplication?: string;
  fromAccount?: string;
  toAccount?: string;
  fromName?: string;
  toName?: string;
  merchantName?: string;
  merchantCategory?: string;
  customerId?: string;
  merchantId?: string;
  notes?: string;
}

export interface IUpdateTransactionDto {
  categoryId?: string;
  tags?: string[];
  notes?: string;
  reconciliationStatus?: 'unmatched' | 'matched' | 'partially_matched' | 'review';
}

export interface ITransaction {
  id: string;
  branchId: string;
  referenceId: string;
  type: string;
  amount: bigint;
  description: string;
  status: string;
  reconciliationStatus: string;
  riskScore: number;
  isDuplicate: boolean;
  isSuspicious: boolean;
  transactionDate: Date;
  createdAt: Date;
}

export interface ITransactionFilter {
  branchId?: string;
  type?: string;
  status?: string;
  reconciliationStatus?: string;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: bigint;
  maxAmount?: bigint;
  customerId?: string;
  merchantId?: string;
  isSuspicious?: boolean;
  isDuplicate?: boolean;
}

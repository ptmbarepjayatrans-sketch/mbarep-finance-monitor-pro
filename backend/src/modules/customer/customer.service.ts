import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { NotFoundError } from '../../utils/errors.js';

const prisma = new PrismaClient();

export class CustomerService {
  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id, deletedAt: null },
      include: {
        transactions: { take: 10, orderBy: { transactionDate: 'desc' } },
        notes: true,
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return customer;
  }

  async listCustomers(page: number = 1, limit: number = 50) {
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { totalAmount: 'desc' },
      }),
      prisma.customer.count({ where: { deletedAt: null } }),
    ]);

    return { customers, total, page, limit };
  }

  async getTopCustomers(limit: number = 10) {
    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      take: limit,
      orderBy: { lifetimeValue: 'desc' },
    });

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      totalAmount: c.totalAmount.toString(),
      tier: c.tier,
      lifetimeValue: c.lifetimeValue.toString(),
    }));
  }

  async getRanking() {
    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { lifetimeValue: 'desc' },
      take: 100,
    });

    return customers.map((c, index) => ({
      rank: index + 1,
      name: c.name,
      tier: c.tier,
      lifetimeValue: c.lifetimeValue.toString(),
      totalTransactions: c.totalTransactions,
    }));
  }

  async addCustomerNote(customerId: string, note: string, priority: string = 'normal') {
    const customerNote = await prisma.customerNote.create({
      data: {
        customerId,
        note,
        priority,
      },
    });

    logger.info({ customerId, noteId: customerNote.id, msg: 'Customer note added' });

    return customerNote;
  }

  async updateCustomerTier(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    let tier = 'bronze';
    if (customer.lifetimeValue > BigInt(100000000)) tier = 'platinum';
    else if (customer.lifetimeValue > BigInt(50000000)) tier = 'gold';
    else if (customer.lifetimeValue > BigInt(10000000)) tier = 'silver';

    return await prisma.customer.update({
      where: { id: customerId },
      data: { tier },
    });
  }
}

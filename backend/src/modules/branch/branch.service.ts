import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { NotFoundError } from '../../utils/errors.js';

const prisma = new PrismaClient();

export class BranchService {
  async createBranch(data: any) {
    const branch = await prisma.branch.create({
      data: {
        code: data.code,
        name: data.name,
        city: data.city,
        address: data.address,
        phone: data.phone,
        email: data.email,
      },
    });

    logger.info({ branchId: branch.id, code: branch.code, msg: 'Branch created' });
    return branch;
  }

  async getBranchById(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id, deletedAt: null },
      include: {
        bankAccounts: true,
        ewalletAccounts: true,
        drivers: true,
        vehicles: true,
      },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    return branch;
  }

  async listBranches(page: number = 1, limit: number = 50) {
    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.branch.count({ where: { deletedAt: null } }),
    ]);

    return { branches, total, page, limit };
  }

  async getBranchPerformance(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayRevenue, weekRevenue, monthRevenue, devices, drivers, vehicles] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          branchId,
          transactionDate: { gte: today },
          type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          branchId,
          transactionDate: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
          type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          branchId,
          transactionDate: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
          type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      prisma.device.count({ where: { isOnline: true } }),
      prisma.driver.count({ where: { branchId, status: 'active', deletedAt: null } }),
      prisma.vehicle.count({ where: { branchId, status: 'available', deletedAt: null } }),
    ]);

    return {
      branchId,
      todayRevenue: (todayRevenue._sum.amount || BigInt(0)).toString(),
      weekRevenue: (weekRevenue._sum.amount || BigInt(0)).toString(),
      monthRevenue: (monthRevenue._sum.amount || BigInt(0)).toString(),
      onlineDevices: devices,
      activeDrivers: drivers,
      availableVehicles: vehicles,
    };
  }

  async getRanking() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const branches = await prisma.branch.findMany({
      where: { deletedAt: null },
    });

    const ranking = await Promise.all(
      branches.map(async (branch) => {
        const revenue = await prisma.transaction.aggregate({
          where: {
            branchId: branch.id,
            transactionDate: { gte: today },
            type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
            deletedAt: null,
          },
          _sum: { amount: true },
        });

        return {
          branchId: branch.id,
          code: branch.code,
          name: branch.name,
          todayRevenue: (revenue._sum.amount || BigInt(0)).toString(),
        };
      })
    );

    return ranking.sort((a, b) => BigInt(b.todayRevenue) > BigInt(a.todayRevenue) ? 1 : -1);
  }
}

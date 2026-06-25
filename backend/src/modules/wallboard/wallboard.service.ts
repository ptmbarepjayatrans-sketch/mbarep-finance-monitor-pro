import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export class WallboardService {
  async getWallboardData(branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's revenue
    const revenueData = await prisma.transaction.aggregate({
      where: {
        transactionDate: { gte: today },
        type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
        ...(branchId && { branchId }),
        deletedAt: null,
      },
      _sum: { amount: true },
      _count: true,
    });

    const totalRevenue = revenueData._sum.amount || BigInt(0);
    const transactionCount = revenueData._count;

    // Get top branch
    let topBranch = null;
    if (!branchId) {
      const branches = await prisma.branch.findMany({
        where: { deletedAt: null },
      });

      const branchRevenues = await Promise.all(
        branches.map(async (b) => {
          const revenue = await prisma.transaction.aggregate({
            where: {
              branchId: b.id,
              transactionDate: { gte: today },
              type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
              deletedAt: null,
            },
            _sum: { amount: true },
          });
          return { name: b.name, revenue: revenue._sum.amount || BigInt(0) };
        })
      );

      topBranch = branchRevenues.sort((a, b) => (b.revenue > a.revenue ? 1 : -1))[0];
    }

    // Get top driver
    const topDriver = await prisma.driver.findFirst({
      where: {
        ...(branchId && { branchId }),
        status: 'active',
        deletedAt: null,
      },
      orderBy: { totalEarnings: 'desc' },
    });

    // Get top vehicle
    const topVehicle = await prisma.vehicle.findFirst({
      where: {
        ...(branchId && { branchId }),
        status: 'available',
        deletedAt: null,
      },
      orderBy: { totalEarnings: 'desc' },
    });

    // Get alerts (high risk transactions)
    const alerts = await prisma.transaction.findMany({
      where: {
        transactionDate: { gte: today },
        isSuspicious: true,
        ...(branchId && { branchId }),
        deletedAt: null,
      },
      take: 5,
      orderBy: { riskScore: 'desc' },
    });

    // Get online devices
    const onlineDevices = await prisma.device.count({
      where: { isOnline: true },
    });

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalRevenue: totalRevenue.toString(),
        transactionCount,
        onlineDevices,
      },
      topPerformers: {
        branch: topBranch,
        driver: topDriver
          ? {
              name: topDriver.name,
              earnings: topDriver.totalEarnings.toString(),
              rides: topDriver.totalRides,
            }
          : null,
        vehicle: topVehicle
          ? {
              plate: topVehicle.licensePlate,
              earnings: topVehicle.totalEarnings.toString(),
              trips: topVehicle.totalTrips,
            }
          : null,
      },
      alerts: alerts.map((a) => ({
        id: a.id,
        amount: a.amount.toString(),
        description: a.description,
        riskScore: a.riskScore,
      })),
    };
  }
}

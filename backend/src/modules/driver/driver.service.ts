import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

const prisma = new PrismaClient();

export class DriverService {
  async createDriver(data: any) {
    const existing = await prisma.driver.findUnique({
      where: { idNumber: data.idNumber },
    });

    if (existing) {
      throw new ValidationError('Driver with this ID number already exists');
    }

    const driver = await prisma.driver.create({
      data: {
        branchId: data.branchId,
        name: data.name,
        idNumber: data.idNumber,
        phone: data.phone,
        address: data.address,
        licenseNumber: data.licenseNumber,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : undefined,
      },
    });

    logger.info({ driverId: driver.id, msg: 'Driver created' });
    return driver;
  }

  async getDriverById(id: string) {
    const driver = await prisma.driver.findUnique({
      where: { id, deletedAt: null },
      include: {
        vehicles: true,
        schedules: { take: 20, orderBy: { departureTime: 'desc' } },
      },
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    return driver;
  }

  async listDrivers(branchId: string, page: number = 1, limit: number = 50) {
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where: { branchId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { totalEarnings: 'desc' },
      }),
      prisma.driver.count({ where: { branchId, deletedAt: null } }),
    ]);

    return { drivers, total, page, limit };
  }

  async getTopDrivers(branchId: string, limit: number = 10) {
    const drivers = await prisma.driver.findMany({
      where: { branchId, status: 'active', deletedAt: null },
      take: limit,
      orderBy: { totalEarnings: 'desc' },
    });

    return drivers.map((d) => ({
      id: d.id,
      name: d.name,
      totalEarnings: d.totalEarnings.toString(),
      totalRides: d.totalRides,
      rating: d.rating,
    }));
  }

  async updateDriverStatus(id: string, status: 'active' | 'inactive' | 'suspended') {
    const driver = await prisma.driver.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    return await prisma.driver.update({
      where: { id },
      data: { status },
    });
  }

  async recordEarning(driverId: string, amount: bigint) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    return await prisma.driver.update({
      where: { id: driverId },
      data: {
        totalEarnings: driver.totalEarnings + amount,
        totalRides: driver.totalRides + 1,
      },
    });
  }

  async updateDriverRating(driverId: string, rating: number) {
    return await prisma.driver.update({
      where: { id: driverId },
      data: { rating },
    });
  }
}

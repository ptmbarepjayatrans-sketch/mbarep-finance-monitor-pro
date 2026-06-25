import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

const prisma = new PrismaClient();

export class VehicleService {
  async createVehicle(data: any) {
    const existing = await prisma.vehicle.findUnique({
      where: { licensePlate: data.licensePlate },
    });

    if (existing) {
      throw new ValidationError('Vehicle with this license plate already exists');
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        branchId: data.branchId,
        licensePlate: data.licensePlate,
        type: data.type,
        brand: data.brand,
        model: data.model,
        year: data.year,
        capacity: data.capacity,
        seatCapacity: data.seatCapacity,
      },
    });

    logger.info({ vehicleId: vehicle.id, msg: 'Vehicle created' });
    return vehicle;
  }

  async getVehicleById(id: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id, deletedAt: null },
      include: {
        drivers: true,
        schedules: { take: 20, orderBy: { departureTime: 'desc' } },
      },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    return vehicle;
  }

  async listVehicles(branchId: string, page: number = 1, limit: number = 50) {
    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where: { branchId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { totalEarnings: 'desc' },
      }),
      prisma.vehicle.count({ where: { branchId, deletedAt: null } }),
    ]);

    return { vehicles, total, page, limit };
  }

  async getVehiclesByType(branchId: string, type: string) {
    const vehicles = await prisma.vehicle.findMany({
      where: { branchId, type, status: 'available', deletedAt: null },
      orderBy: { utilisasi: 'desc' },
    });

    return vehicles;
  }

  async getTopVehicles(branchId: string, limit: number = 10) {
    const vehicles = await prisma.vehicle.findMany({
      where: { branchId, status: 'available', deletedAt: null },
      take: limit,
      orderBy: { totalEarnings: 'desc' },
    });

    return vehicles.map((v) => ({
      id: v.id,
      licensePlate: v.licensePlate,
      type: v.type,
      totalEarnings: v.totalEarnings.toString(),
      totalTrips: v.totalTrips,
      utilisasi: v.utilisasi.toFixed(2),
    }));
  }

  async updateVehicleStatus(id: string, status: 'available' | 'maintenance' | 'retired') {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    return await prisma.vehicle.update({
      where: { id },
      data: { status },
    });
  }

  async recordTrip(vehicleId: string, amount: bigint, utilisasi: number) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    return await prisma.vehicle.update({
      where: { vehicleId },
      data: {
        totalEarnings: vehicle.totalEarnings + amount,
        totalTrips: vehicle.totalTrips + 1,
        utilisasi: utilisasi,
      },
    });
  }
}

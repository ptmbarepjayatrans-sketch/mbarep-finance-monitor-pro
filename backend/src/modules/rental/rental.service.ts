import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

const prisma = new PrismaClient();

export class RentalService {
  async createRental(data: any) {
    const rentalNumber = await this.generateRentalNumber();

    const rental = await prisma.rental.create({
      data: {
        rentalNumber,
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        dailyRate: BigInt(data.dailyRate),
        deposit: BigInt(data.deposit),
        status: 'active',
      },
    });

    logger.info({ rentalId: rental.id, rentalNumber, msg: 'Rental created' });
    return rental;
  }

  private async generateRentalNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const lastRental = await prisma.rental.findFirst({
      where: {
        rentalNumber: {
          startsWith: `RNT-${year}${month}`,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sequence = lastRental ? parseInt(lastRental.rentalNumber.split('-')[2]) + 1 : 1;
    return `RNT-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }

  async completeRental(rentalId: string, returnData: any) {
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
    });

    if (!rental) {
      throw new NotFoundError('Rental not found');
    }

    const days = Math.ceil((returnData.actualReturnDate - rental.startDate) / (1000 * 60 * 60 * 24));
    const rentalCost = Number(rental.dailyRate) * days;
    let fine = BigInt(0);

    // Calculate late fee
    const expectedReturnDate = rental.endDate;
    if (new Date(returnData.actualReturnDate) > expectedReturnDate) {
      const lateDays = Math.ceil((new Date(returnData.actualReturnDate).getTime() - expectedReturnDate.getTime()) / (1000 * 60 * 60 * 24));
      fine = BigInt(lateDays * 100000); // IDR 100k per day
    }

    // Calculate damage fee
    let damageFee = BigInt(0);
    if (returnData.damageReport) {
      damageFee = BigInt(returnData.damageReport.amount);
    }

    const totalCost = BigInt(rentalCost) + fine + damageFee;
    const balanceDue = totalCost - rental.deposit;

    const updatedRental = await prisma.rental.update({
      where: { id: rentalId },
      data: {
        status: 'completed',
        actualReturnDate: new Date(returnData.actualReturnDate),
        lateFee: fine,
        damageFee,
        totalCost,
        balanceDue,
      },
    });

    logger.info({ rentalId, totalCost: totalCost.toString(), msg: 'Rental completed' });
    return updatedRental;
  }

  async getRentalHistory(customerId: string) {
    const rentals = await prisma.rental.findMany({
      where: { customerId },
      include: { vehicle: true },
      orderBy: { startDate: 'desc' },
    });

    return rentals;
  }
}

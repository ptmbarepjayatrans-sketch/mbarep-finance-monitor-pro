import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

const prisma = new PrismaClient();

export class BookingService {
  async createBooking(data: any) {
    const bookingNumber = await this.generateBookingNumber();

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        departureDate: new Date(data.departureDate),
        departureTime: data.departureTime,
        pickupPoint: data.pickupPoint,
        dropPoint: data.dropPoint,
        destination: data.destination,
        estimatedArrival: new Date(data.estimatedArrival),
        totalPassengers: data.totalPassengers,
        totalPrice: BigInt(data.totalPrice),
        status: 'pending',
      },
    });

    logger.info({ bookingId: booking.id, bookingNumber, msg: 'Booking created' });
    return booking;
  }

  private async generateBookingNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const lastBooking = await prisma.booking.findFirst({
      where: {
        bookingNumber: {
          startsWith: `BKG-${year}${month}`,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sequence = lastBooking ? parseInt(lastBooking.bookingNumber.split('-')[2]) + 1 : 1;
    return `BKG-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }

  async addPassenger(bookingId: string, passengerData: any) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const passenger = await prisma.passenger.create({
      data: {
        bookingId,
        name: passengerData.name,
        phone: passengerData.phone,
        idNumber: passengerData.idNumber,
        seatNumber: passengerData.seatNumber,
      },
    });

    logger.info({ bookingId, passengerId: passenger.id, msg: 'Passenger added' });
    return passenger;
  }

  async generateManifest(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        passengers: true,
        vehicle: true,
        driver: true,
        customer: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    return {
      bookingNumber: booking.bookingNumber,
      departureDate: booking.departureDate,
      vehicle: {
        licensePlate: booking.vehicle?.licensePlate,
        type: booking.vehicle?.type,
        capacity: booking.vehicle?.seatCapacity,
      },
      driver: {
        name: booking.driver?.name,
        phone: booking.driver?.phone,
      },
      passengers: booking.passengers.map((p) => ({
        name: p.name,
        phone: p.phone,
        seatNumber: p.seatNumber,
      })),
      pickupPoint: booking.pickupPoint,
      dropPoint: booking.dropPoint,
      destination: booking.destination,
    };
  }

  async updateBookingStatus(bookingId: string, status: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });
  }

  async getBookingHistory(customerId: string) {
    const bookings = await prisma.booking.findMany({
      where: { customerId },
      include: { vehicle: true, driver: true },
      orderBy: { departureDate: 'desc' },
    });

    return bookings;
  }
}

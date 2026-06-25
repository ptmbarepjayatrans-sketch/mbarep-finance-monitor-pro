import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import axios from 'axios';
import { config } from '../../config/index.js';

const prisma = new PrismaClient();

export class AiAssistantService {
  async chat(userId: string, question: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      return 'User not found';
    }

    let answer = '';

    // Parse questions
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('omzet') || lowerQuestion.includes('revenue') || lowerQuestion.includes('pemasukan')) {
      answer = await this.getRevenueInsight(userId);
    } else if (lowerQuestion.includes('cabang') || lowerQuestion.includes('branch')) {
      answer = await this.getBranchInsight(userId);
    } else if (lowerQuestion.includes('driver')) {
      answer = await this.getDriverInsight(userId);
    } else if (lowerQuestion.includes('kendaraan') || lowerQuestion.includes('vehicle')) {
      answer = await this.getVehicleInsight(userId);
    } else if (lowerQuestion.includes('pelanggan') || lowerQuestion.includes('customer')) {
      answer = await this.getCustomerInsight(userId);
    } else if (lowerQuestion.includes('bandingkan') || lowerQuestion.includes('compare')) {
      answer = await this.getComparisonInsight(userId);
    } else {
      answer = await this.generateCustomAnswer(question);
    }

    // Save conversation
    await prisma.aiConversation.create({
      data: {
        userId,
        question,
        answer,
      },
    });

    logger.info({ userId, question, msg: 'AI conversation recorded' });

    return answer;
  }

  private async getRevenueInsight(userId: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRevenue = await prisma.transaction.aggregate({
      where: {
        transactionDate: { gte: today },
        type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    const yesterdayStart = new Date(today);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(today);

    const yesterdayRevenue = await prisma.transaction.aggregate({
      where: {
        transactionDate: { gte: yesterdayStart, lt: yesterdayEnd },
        type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    const todayAmount = Number(todayRevenue._sum.amount || BigInt(0));
    const yesterdayAmount = Number(yesterdayRevenue._sum.amount || BigInt(0));
    const percentageChange = yesterdayAmount > 0 ? ((todayAmount - yesterdayAmount) / yesterdayAmount) * 100 : 0;

    return `Omzet hari ini adalah ${this.formatCurrency(todayAmount)}. Dibandingkan kemarin, ada ${percentageChange > 0 ? 'kenaikan' : 'penurunan'} sebesar ${Math.abs(percentageChange).toFixed(1)}%`;
  }

  private async getBranchInsight(userId: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const branches = await prisma.branch.findMany({
      where: { deletedAt: null },
    });

    const branchData = await Promise.all(
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
          name: branch.name,
          revenue: Number(revenue._sum.amount || BigInt(0)),
        };
      })
    );

    const topBranch = branchData.sort((a, b) => b.revenue - a.revenue)[0];
    return `Cabang terbaik hari ini adalah ${topBranch.name} dengan omzet ${this.formatCurrency(topBranch.revenue)}`;
  }

  private async getDriverInsight(userId: string): Promise<string> {
    const topDriver = await prisma.driver.findFirst({
      where: { deletedAt: null },
      orderBy: { totalEarnings: 'desc' },
    });

    if (!topDriver) {
      return 'Tidak ada data driver';
    }

    return `Driver terbaik adalah ${topDriver.name} dengan total penghasilan ${this.formatCurrency(Number(topDriver.totalEarnings))} dari ${topDriver.totalRides} perjalanan`;
  }

  private async getVehicleInsight(userId: string): Promise<string> {
    const topVehicle = await prisma.vehicle.findFirst({
      where: { deletedAt: null },
      orderBy: { totalEarnings: 'desc' },
    });

    if (!topVehicle) {
      return 'Tidak ada data kendaraan';
    }

    return `Kendaraan paling profitable adalah ${topVehicle.licensePlate} (${topVehicle.type}) dengan penghasilan ${this.formatCurrency(Number(topVehicle.totalEarnings))} dari ${topVehicle.totalTrips} perjalanan`;
  }

  private async getCustomerInsight(userId: string): Promise<string> {
    const topCustomer = await prisma.customer.findFirst({
      where: { deletedAt: null },
      orderBy: { lifetimeValue: 'desc' },
    });

    if (!topCustomer) {
      return 'Tidak ada data pelanggan';
    }

    return `Pelanggan terbaik adalah ${topCustomer.name} dengan lifetime value ${this.formatCurrency(Number(topCustomer.lifetimeValue))} dan tier ${topCustomer.tier}`;
  }

  private async getComparisonInsight(userId: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const thisMonthRevenue = await prisma.transaction.aggregate({
      where: {
        transactionDate: { gte: monthStart, lte: today },
        type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    const lastMonthRevenue = await prisma.transaction.aggregate({
      where: {
        transactionDate: { gte: lastMonthStart, lte: lastMonthEnd },
        type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    const thisAmount = Number(thisMonthRevenue._sum.amount || BigInt(0));
    const lastAmount = Number(lastMonthRevenue._sum.amount || BigInt(0));
    const percentageChange = lastAmount > 0 ? ((thisAmount - lastAmount) / lastAmount) * 100 : 0;

    return `Bulan ini sudah mencatat ${this.formatCurrency(thisAmount)}, dibanding bulan lalu ${this.formatCurrency(lastAmount)}. Pertumbuhan sebesar ${percentageChange.toFixed(1)}%`;
  }

  private async generateCustomAnswer(question: string): Promise<string> {
    // Default response
    return `Pertanyaan Anda: "${question}". Silakan coba pertanyaan seperti: "Berapa omzet hari ini?", "Cabang mana paling tinggi?", "Driver terbaik siapa?"`;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}

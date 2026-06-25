import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export class CashflowService {
  async calculateCashflow(branchId: string | null, period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dateFrom = today;
    let label = 'Today';

    if (period === 'weekly') {
      dateFrom = new Date(today);
      dateFrom.setDate(dateFrom.getDate() - today.getDay());
      label = 'This Week';
    } else if (period === 'monthly') {
      dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
      label = 'This Month';
    }

    const where: any = {
      transactionDate: { gte: dateFrom },
      deletedAt: null,
    };

    if (branchId) where.branchId = branchId;

    const inflow = await prisma.transaction.aggregate({
      where: {
        ...where,
        type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT', 'TOP_UP', 'CASHBACK'] },
      },
      _sum: { amount: true },
    });

    const outflow = await prisma.transaction.aggregate({
      where: {
        ...where,
        type: { in: ['TRANSFER_OUT', 'WITHDRAWAL', 'FEE'] },
      },
      _sum: { amount: true },
    });

    const inflowAmount = inflow._sum.amount || BigInt(0);
    const outflowAmount = outflow._sum.amount || BigInt(0);
    const netflow = inflowAmount - outflowAmount;

    let health = 'healthy';
    if (netflow < BigInt(0)) health = 'critical';
    else if (netflow < BigInt(1000000)) health = 'warning';

    return {
      period: label,
      inflow: inflowAmount.toString(),
      outflow: outflowAmount.toString(),
      netflow: netflow.toString(),
      health,
    };
  }

  async getCashflowForecast(branchId: string | null, days: number = 30) {
    const today = new Date();
    const forecast = [];

    // Get average daily cashflow from last 30 days
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalTransactions = await prisma.transaction.findMany({
      where: {
        transactionDate: { gte: thirtyDaysAgo },
        ...(branchId && { branchId }),
        deletedAt: null,
      },
      select: { amount: true, type: true, transactionDate: true },
    });

    // Calculate average daily inflow and outflow
    let totalInflow = BigInt(0);
    let totalOutflow = BigInt(0);

    for (const tx of historicalTransactions) {
      if (['TRANSFER_IN', 'QRIS', 'MERCHANT', 'TOP_UP', 'CASHBACK'].includes(tx.type)) {
        totalInflow += tx.amount;
      } else if (['TRANSFER_OUT', 'WITHDRAWAL', 'FEE'].includes(tx.type)) {
        totalOutflow += tx.amount;
      }
    }

    const avgDailyInflow = totalInflow / BigInt(30);
    const avgDailyOutflow = totalOutflow / BigInt(30);

    // Generate forecast
    for (let i = 0; i < days; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);

      const forecastedInflow = avgDailyInflow;
      const forecastedOutflow = avgDailyOutflow;
      const forecastedNetflow = forecastedInflow - forecastedOutflow;

      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        forecastedInflow: forecastedInflow.toString(),
        forecastedOutflow: forecastedOutflow.toString(),
        forecastedNetflow: forecastedNetflow.toString(),
      });
    }

    return forecast;
  }

  async getFinancialHealth(branchId: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Daily
    const dailyData = await this.calculateCashflow(branchId, 'daily');

    // Weekly
    const weeklyData = await this.calculateCashflow(branchId, 'weekly');

    // Monthly
    const monthlyData = await this.calculateCashflow(branchId, 'monthly');

    // Calculate health score
    let score = 100;

    const dailyNetflow = BigInt(dailyData.netflow);
    if (dailyNetflow < BigInt(0)) score -= 30;
    else if (dailyNetflow < BigInt(1000000)) score -= 10;

    const monthlyNetflow = BigInt(monthlyData.netflow);
    if (monthlyNetflow < BigInt(0)) score -= 30;
    else if (monthlyNetflow < BigInt(100000000)) score -= 15;

    return {
      healthScore: Math.max(score, 0),
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
      status: score >= 70 ? 'healthy' : score >= 40 ? 'warning' : 'critical',
    };
  }

  async getBreakEvenAnalysis(branchId: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const monthlyInflow = await prisma.transaction.aggregate({
      where: {
        transactionDate: { gte: monthStart, lt: nextMonth },
        type: { in: ['TRANSFER_IN', 'QRIS', 'MERCHANT'] },
        ...(branchId && { branchId }),
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    const monthlyOutflow = await prisma.transaction.aggregate({
      where: {
        transactionDate: { gte: monthStart, lt: nextMonth },
        type: { in: ['TRANSFER_OUT', 'WITHDRAWAL', 'FEE'] },
        ...(branchId && { branchId }),
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    const inflow = monthlyInflow._sum.amount || BigInt(0);
    const outflow = monthlyOutflow._sum.amount || BigInt(0);
    const profit = inflow - outflow;

    const daysInMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 0).getDate();
    const currentDay = today.getDate();
    const daysRemaining = daysInMonth - currentDay;

    const avgDailyProfit = profit / BigInt(currentDay);
    const projectedEndProfit = profit + (avgDailyProfit * BigInt(daysRemaining));
    const breakEvenDay = avgDailyProfit > BigInt(0) ? 0 : 'Beyond month';

    return {
      currentMonth: {
        inflow: inflow.toString(),
        outflow: outflow.toString(),
        profit: profit.toString(),
      },
      daily: {
        avgProfit: avgDailyProfit.toString(),
      },
      projection: {
        endOfMonthProfit: projectedEndProfit.toString(),
        breakEvenDay,
      },
    };
  }
}

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export class MonitoringService {
  async recordSystemMetric(metric: any) {
    const systemMetric = await prisma.systemMetric.create({
      data: {
        cpuUsage: metric.cpuUsage,
        memoryUsage: metric.memoryUsage,
        diskUsage: metric.diskUsage,
        activeConnections: metric.activeConnections,
        totalRequests: metric.totalRequests,
        failedRequests: metric.failedRequests,
        averageResponseTime: metric.averageResponseTime,
        databaseStatus: metric.databaseStatus,
        redisStatus: metric.redisStatus,
      },
    });

    return systemMetric;
  }

  async getSystemMetrics(limit: number = 100) {
    const metrics = await prisma.systemMetric.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return metrics;
  }

  async getLatestMetric() {
    const metric = await prisma.systemMetric.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return metric;
  }

  async getMetricsStats(hours: number = 1) {
    const from = new Date(Date.now() - hours * 60 * 60 * 1000);

    const metrics = await prisma.systemMetric.findMany({
      where: {
        createdAt: { gte: from },
      },
    });

    if (metrics.length === 0) {
      return null;
    }

    const avgCpuUsage = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length;
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
    const avgDiskUsage = metrics.reduce((sum, m) => sum + m.diskUsage, 0) / metrics.length;
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length;

    const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalFailedRequests = metrics.reduce((sum, m) => sum + m.failedRequests, 0);

    return {
      period: `Last ${hours} hour(s)`,
      samples: metrics.length,
      cpu: {
        average: avgCpuUsage.toFixed(2),
        max: Math.max(...metrics.map((m) => m.cpuUsage)).toFixed(2),
        min: Math.min(...metrics.map((m) => m.cpuUsage)).toFixed(2),
      },
      memory: {
        average: avgMemoryUsage.toFixed(2),
        max: Math.max(...metrics.map((m) => m.memoryUsage)).toFixed(2),
        min: Math.min(...metrics.map((m) => m.memoryUsage)).toFixed(2),
      },
      disk: {
        average: avgDiskUsage.toFixed(2),
        max: Math.max(...metrics.map((m) => m.diskUsage)).toFixed(2),
        min: Math.min(...metrics.map((m) => m.diskUsage)).toFixed(2),
      },
      requests: {
        total: totalRequests,
        failed: totalFailedRequests,
        failureRate: ((totalFailedRequests / totalRequests) * 100).toFixed(2),
        avgResponseTime: avgResponseTime.toFixed(0),
      },
    };
  }

  async getHealthStatus() {
    const latestMetric = await this.getLatestMetric();

    if (!latestMetric) {
      return { status: 'unknown' };
    }

    let overallStatus = 'healthy';

    if (latestMetric.cpuUsage > 80 || latestMetric.memoryUsage > 85) {
      overallStatus = 'warning';
    }

    if (latestMetric.cpuUsage > 95 || latestMetric.memoryUsage > 95 || latestMetric.failedRequests > 100) {
      overallStatus = 'critical';
    }

    if (latestMetric.databaseStatus !== 'healthy' || latestMetric.redisStatus !== 'healthy') {
      overallStatus = 'critical';
    }

    return {
      status: overallStatus,
      cpu: latestMetric.cpuUsage,
      memory: latestMetric.memoryUsage,
      disk: latestMetric.diskUsage,
      database: latestMetric.databaseStatus,
      redis: latestMetric.redisStatus,
      timestamp: latestMetric.createdAt.toISOString(),
    };
  }
}

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';
import { createErrorResponse } from './utils/response.js';

// Import routers
import { authRouter } from './modules/auth/auth.controller.js';
import { transactionRouter } from './modules/transactions/transaction.controller.js';
import { collectorRouter } from './modules/collector/collector.controller.js';
import { dashboardRouter } from './modules/dashboard/dashboard.controller.js';
import { voiceRouter } from './modules/voice/voice.controller.js';
import { fraudRouter } from './modules/fraud/fraud.controller.js';
import { reconciliationRouter } from './modules/reconciliation/reconciliation.controller.js';
import { customerRouter } from './modules/customer/customer.controller.js';
import { driverRouter } from './modules/driver/driver.controller.js';
import { vehicleRouter } from './modules/vehicle/vehicle.controller.js';
import { branchRouter } from './modules/branch/branch.controller.js';
import { qrisRouter } from './modules/qris/qris.controller.js';
import { cashflowRouter } from './modules/cashflow/cashflow.controller.js';
import { notificationRouter } from './modules/notification/notification.controller.js';
import { aiRouter } from './modules/ai/ai.controller.js';
import { wallboardRouter } from './modules/wallboard/wallboard.controller.js';
import { monitoringRouter } from './modules/monitoring/monitoring.controller.js';

// Import Socket.IO setup
import { setupSocketIO, realtimeService } from './modules/realtime/realtime.handler.js';

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.app.frontendUrl,
    methods: ['GET', 'POST'],
  },
});

// ============ MIDDLEWARES ============
app.use(helmet());
app.use(cors({ origin: config.app.frontendUrl }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip });
  next();
});

// ============ ROUTES ============

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API version
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    version: '1.0.0',
    name: 'MBAREP Finance Monitor Pro',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/transactions', transactionRouter);
app.use('/api/v1/collector', collectorRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/voice', voiceRouter);
app.use('/api/v1/fraud', fraudRouter);
app.use('/api/v1/reconciliation', reconciliationRouter);
app.use('/api/v1/customers', customerRouter);
app.use('/api/v1/drivers', driverRouter);
app.use('/api/v1/vehicles', vehicleRouter);
app.use('/api/v1/branches', branchRouter);
app.use('/api/v1/qris', qrisRouter);
app.use('/api/v1/cashflow', cashflowRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/wallboard', wallboardRouter);
app.use('/api/v1/monitoring', monitoringRouter);

// ============ ERROR HANDLING ============
app.use((req: Request, res: Response) => {
  res.status(404).json(createErrorResponse('Route not found'));
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, method: req.method, url: req.url });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(createErrorResponse(err.message, [err.details]));
  }

  res.status(500).json(createErrorResponse('Internal Server Error'));
});

// ============ SOCKET.IO ============
setupSocketIO(io);

// Export io for realtime emission
export { io, realtimeService };

// ============ SERVER START ============
httpServer.listen(config.app.port, () => {
  logger.info({
    port: config.app.port,
    env: config.app.env,
    msg: 'MBAREP Finance Monitor Pro - Backend Server Started',
  });
});

export { app, httpServer };

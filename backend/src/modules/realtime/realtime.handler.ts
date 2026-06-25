import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../../utils/logger.js';
import { RealtimeService } from './realtime.service.js';
import * as jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

const realtimeService = new RealtimeService();

export const setupSocketIO = (io: SocketIOServer) => {
  // Middleware: authenticate socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      socket.data.roleId = decoded.roleId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;

    logger.info({ socketId: socket.id, userId, msg: 'Socket connected' });

    // Join user room
    socket.join(`user-${userId}`);

    // Subscribe to branch updates
    socket.on('subscribe:branch', (branchId: string) => {
      socket.join(`branch-${branchId}`);
      logger.info({ socketId: socket.id, branchId, msg: 'Subscribed to branch' });
    });

    // Unsubscribe from branch updates
    socket.on('unsubscribe:branch', (branchId: string) => {
      socket.leave(`branch-${branchId}`);
      logger.info({ socketId: socket.id, branchId, msg: 'Unsubscribed from branch' });
    });

    // Ping
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id, userId, msg: 'Socket disconnected' });
    });

    // Error
    socket.on('error', (error) => {
      logger.error({ socketId: socket.id, error, msg: 'Socket error' });
    });
  });

  logger.info({ msg: 'Socket.IO initialized' });
};

export { realtimeService };

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:5173'],
    credentials: true,
  },
  namespace: '/reminders',
})
export class ReminderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ReminderGateway.name);
  private userSocketMap = new Map<string, string>(); // userId -> socketId

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      const tenantId = client.handshake.headers['x-tenant-id'];

      if (!token) {
        this.logger.warn('Connection rejected: No token provided');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;

      if (!userId) {
        this.logger.warn('Connection rejected: Invalid token');
        client.disconnect();
        return;
      }

      // Store user-socket mapping
      this.userSocketMap.set(userId, client.id);
      client.data.userId = userId;
      client.data.tenantId = tenantId;

      // Join user-specific room for targeted notifications
      client.join(`user:${userId}`);
      if (tenantId) {
        client.join(`tenant:${tenantId}`);
      }

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

      // Send initial connection success
      client.emit('connected', {
        success: true,
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error('Connection error:', error?.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      this.userSocketMap.delete(userId);
    }
    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
  }

  @SubscribeMessage('subscribe-reminders')
  handleSubscribeReminders(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      client.join(`reminders:${userId}`);
      this.logger.log(`User ${userId} subscribed to reminders`);
      client.emit('subscribed', { channel: 'reminders', success: true });
    }
  }

  @SubscribeMessage('unsubscribe-reminders')
  handleUnsubscribeReminders(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      client.leave(`reminders:${userId}`);
      this.logger.log(`User ${userId} unsubscribed from reminders`);
      client.emit('unsubscribed', { channel: 'reminders', success: true });
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  // Method to send real-time reminder to specific user
  sendReminderToUser(userId: string, reminder: any) {
    this.server.to(`user:${userId}`).emit('new-reminder', {
      type: 'new-reminder',
      data: reminder,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Sent reminder to user ${userId}: ${reminder.title}`);
  }

  // Method to broadcast to all users in a tenant
  broadcastToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, {
      type: event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to notify reminder triggered
  notifyReminderTriggered(userId: string, reminder: any) {
    this.server.to(`user:${userId}`).emit('reminder-triggered', {
      type: 'reminder-triggered',
      data: reminder,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to notify reminder updated
  notifyReminderUpdated(userId: string, reminder: any) {
    this.server.to(`user:${userId}`).emit('reminder-updated', {
      type: 'reminder-updated',
      data: reminder,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to notify reminder completed
  notifyReminderCompleted(userId: string, reminderId: string) {
    this.server.to(`user:${userId}`).emit('reminder-completed', {
      type: 'reminder-completed',
      data: { id: reminderId },
      timestamp: new Date().toISOString(),
    });
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }
}

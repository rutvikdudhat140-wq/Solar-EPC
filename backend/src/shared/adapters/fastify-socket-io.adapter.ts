import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { INestApplication } from '@nestjs/common';

export class FastifySocketIoAdapter extends IoAdapter {
  constructor(app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const adapter = this.httpServer;
    const fastifyInstance = (adapter as any).getInstance?.() || adapter;
    const server = fastifyInstance.server || fastifyInstance;

    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:5173'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });
  }
}

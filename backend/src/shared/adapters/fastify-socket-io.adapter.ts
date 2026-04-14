import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { INestApplication } from '@nestjs/common';

export class FastifySocketIoAdapter extends IoAdapter {
  constructor(private readonly app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    // Get the Fastify instance and raw HTTP server
    const httpAdapter = this.app.getHttpAdapter();
    const fastifyInstance = httpAdapter.getInstance();
    // Fastify stores the raw Node.js HTTP server in .server property
    const rawHttpServer = fastifyInstance.server;

    // Create Socket.IO server directly attached to raw HTTP server
    // Don't use super.createIOServer() as it has issues with Fastify
    const io = new Server(rawHttpServer, {
      ...options,
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:5173'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    return io;
  }
}

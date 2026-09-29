import { ValidationPipe, Inject, Injectable, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { FastifySocketIoAdapter } from './shared/adapters/fastify-socket-io.adapter';
import { setServers } from 'dns';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { SuccessResponseInterceptor } from './shared/interceptors/success-response.interceptor';
import { LogisticsService } from './modules/logistics/services/logistics.service';
import { ProcurementService } from './modules/procurement/services/procurement.service';
import { getModelToken } from '@nestjs/mongoose';
import { Inventory } from './modules/inventory/schemas/inventory.schema';

// Startup fix for INV3552
async function fixINV3552OnStartup(app: NestFastifyApplication) {
  try {
    console.log('[STARTUP FIX] ========== Checking INV3552 inventory ==========');
    const inventoryModel = app.get(getModelToken(Inventory.name));
    const item = await inventoryModel.findOne({ itemId: 'INV3552' }).exec();
    
    if (!item) {
      console.log('[STARTUP FIX] INV3552 not found in inventory collection');
      return;
    }
    
    console.log('[STARTUP FIX] Current state:', {
      itemId: item.itemId,
      stock: item.stock,
      reserved: item.reserved,
      available: item.available
    });
    
    if (item.reserved > 0) {
      await inventoryModel.updateOne(
        { _id: item._id },
        { $set: { reserved: 0, available: item.stock } }
      ).exec();
      console.log(`[STARTUP FIX] ✅ FIXED: Reserved ${item.reserved} -> 0, Available ${item.available} -> ${item.stock}`);
    } else {
      console.log('[STARTUP FIX] ✅ No fix needed - reserved is already 0');
    }
    console.log('[STARTUP FIX] ========== Complete ==========');
  } catch (err: any) {
    console.error('[STARTUP FIX] ❌ Error:', err?.message || err);
  }
}

async function bootstrap() {
  const dnsServersRaw = process.env.DNS_SERVERS;
  if (dnsServersRaw) {
    const servers = dnsServersRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (servers.length > 0) {
      setServers(servers);
    }
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 50 * 1024 * 1024, // 50MB for large base64 photo uploads
    }),
  );

  const shouldDebugLog =
    String(process.env.AUTH_DEBUG_LOGS || '').toLowerCase() === 'true' ||
    String(process.env.PERMISSION_DEBUG_LOGS || '').toLowerCase() === 'true';

  if (shouldDebugLog) {
    const instance = app.getHttpAdapter().getInstance();
    const shouldLogUrl = (urlRaw: any): boolean => {
      const url = String(urlRaw || '');
      return (
        url.includes('/api/auth/me') ||
        url.includes('/api/settings/rbac') ||
        url.includes('/api/settings/custom') ||
        url.includes('/api/settings/user') ||
        url.includes('/api/settings/feature')
      );
    };

    instance.addHook('onRequest', async (req: any) => {
      if (!shouldLogUrl(req?.url)) return;
      const tenantHeader = req?.headers?.['x-tenant-id'] || req?.headers?.['X-Tenant-Id'];
      const authPresent = Boolean(req?.headers?.authorization);
      console.log(
        `[HTTP_DEBUG] req method=${String(req?.method || '')} url=${String(req?.url || '')} x-tenant-id=${String(tenantHeader || '')} authHeaderPresent=${authPresent}`,
      );
    });

    instance.addHook('onSend', async (req: any, reply: any, payload: any) => {
      if (!shouldLogUrl(req?.url)) return payload;
      const size =
        typeof payload === 'string'
          ? payload.length
          : Buffer.isBuffer(payload)
            ? payload.length
            : undefined;
      console.log(
        `[HTTP_DEBUG] res method=${String(req?.method || '')} url=${String(req?.url || '')} status=${Number(reply?.statusCode || 0)} payloadSize=${size === undefined ? 'unknown' : String(size)}`,
      );
      return payload;
    });
  }

  await app.register(multipart as any, {
    limits: {
      fileSize: 20 * 1024 * 1024,
    },
  });

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173', 'http://localhost:8000', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002', 'http://127.0.0.1:5173', 'http://127.0.0.1:8000'],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'X-Tenant-Id', 'tenant-id', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['x-tenant-id'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix('api', {
    exclude: [
      { path: '/', method: RequestMethod.ALL },
      { path: 'favicon.ico', method: RequestMethod.ALL },
      { path: '/favicon.ico', method: RequestMethod.ALL }
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(process.env.APP_PORT ?? 3000);
  await app.listen({ port, host: '0.0.0.0' });

  // Enable WebSocket support with Fastify adapter (after server is listening)
  app.useWebSocketAdapter(new FastifySocketIoAdapter(app));

  // Run startup fix after server is ready
  await fixINV3552OnStartup(app);
}

void bootstrap();

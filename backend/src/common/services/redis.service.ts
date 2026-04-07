import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private isConnected = false;
  private readonly logger = new Logger(RedisService.name);
  private connectionAttempts = 0;
  private readonly maxConnectionAttempts = 5;
  private subscriber: Redis | null = null;

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  private sanitizeRedisUrl(url: string): string {
    try {
      const u = new URL(url);
      if (u.password) {
        u.password = '***';
      }
      return u.toString();
    } catch {
      // Fallback: avoid leaking secrets in logs
      return url.replace(/:\/\/[^:@/]+:([^@/]+)@/i, '://***:***@');
    }
  }

  private initializeRedis(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const useTls = this.configService.get<string>('REDIS_TLS') === 'true';
    
    if (!redisUrl) {
      this.logger.warn('[Redis] REDIS_URL not configured, running without cache');
      return;
    }

    try {
      this.logger.log(`[Redis] Initializing client: ${this.sanitizeRedisUrl(redisUrl)} (TLS=${useTls ? 'on' : 'off'})`);
      this.client = new Redis(redisUrl, {
        tls: useTls ? {} : undefined,
        keepAlive: parseInt(this.configService.get('REDIS_KEEPALIVE') || '30000'),
        retryStrategy: (times) => {
          this.connectionAttempts = times;
          if (times > this.maxConnectionAttempts) {
            this.logger.error(`[Redis] Max reconnection attempts (${this.maxConnectionAttempts}) reached. Giving up.`);
            return null;
          }
          const delay = Math.min(times * 100, 3000);
          this.logger.warn(`[Redis] Reconnection attempt ${times}/${this.maxConnectionAttempts} in ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 5000,
        disconnectTimeout: 2000,
      });

      // Force initial connect so the app prints Redis connected/ready logs on startup.
      // With lazyConnect=true, ioredis won't connect until the first command otherwise.
      this.client.connect().catch((err: any) => {
        this.logger.error('[Redis] Initial connect failed:', err?.message || String(err));
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        this.logger.log('[Redis] Connected successfully');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.logger.log('[Redis] Ready to accept commands');
      });

      this.client.on('error', (err) => {
        if (this.isConnected) {
          this.logger.error('[Redis] Error:', err.message);
        }
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn('[Redis] Connection closed');
      });

      this.client.on('reconnecting', () => {
        this.isConnected = false;
        this.logger.warn('[Redis] Reconnecting...');
      });

      this.client.on('end', () => {
        this.isConnected = false;
        this.logger.warn('[Redis] Connection ended');
      });

    } catch (error: any) {
      this.logger.error('[Redis] Failed to initialize:', error.message);
      this.client = null;
      this.isConnected = false;
    }
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null && this.client.status === 'ready';
  }

  getClient(): Redis | null {
    return this.client;
  }

  private safeExecute<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    if (!this.client || !this.isConnected) {
      return Promise.resolve(fallback);
    }

    if (this.client.status !== 'ready') {
      this.logger.debug('[Redis] Client not ready, using fallback');
      return Promise.resolve(fallback);
    }

    return operation().catch((error) => {
      this.logger.warn('[Redis] Operation failed:', error.message);
      return fallback;
    });
  }

  async get(key: string): Promise<string | null> {
    return this.safeExecute(
      () => this.client!.get(key),
      null
    );
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    return this.safeExecute(
      async () => {
        if (ttlSeconds) {
          await this.client!.setex(key, ttlSeconds, value);
        } else {
          await this.client!.set(key, value);
        }
      },
      undefined
    );
  }

  async del(key: string): Promise<void> {
    return this.safeExecute(
      () => this.client!.del(key).then(() => undefined),
      undefined
    );
  }

  async exists(key: string): Promise<boolean> {
    return this.safeExecute(
      async () => {
        const result = await this.client!.exists(key);
        return result === 1;
      },
      false
    );
  }

  async keys(pattern: string): Promise<string[]> {
    return this.safeExecute(
      () => this.client!.keys(pattern),
      []
    );
  }

  async flushAll(): Promise<void> {
    return this.safeExecute(
      () => this.client!.flushall().then(() => undefined),
      undefined
    );
  }

  async expire(key: string, seconds: number): Promise<void> {
    return this.safeExecute(
      () => this.client!.expire(key, seconds).then(() => undefined),
      undefined
    );
  }

  async ttl(key: string): Promise<number> {
    return this.safeExecute(
      () => this.client!.ttl(key),
      -1
    );
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.safeExecute(
      () => this.client!.publish(channel, message),
      0,
    );
  }

  /**
   * Acquire a distributed lock with timeout
   * @param key Lock key
   * @param ttlSeconds Lock timeout in seconds
   * @returns true if lock acquired, false otherwise
   */
  async acquireLock(key: string, ttlSeconds: number = 10): Promise<boolean> {
    return this.safeExecute(
      async () => {
        // Use SETNX (set if not exists) with expiry for atomic lock
        const result = await this.client!.set(key, '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      },
      false
    );
  }

  /**
   * Release a distributed lock
   * @param key Lock key
   */
  async releaseLock(key: string): Promise<void> {
    return this.safeExecute(
      () => this.client!.del(key).then(() => undefined),
      undefined
    );
  }

  /**
   * Wait for lock to be released with timeout
   * @param key Lock key
   * @param maxWaitMs Maximum wait time in milliseconds
   * @param checkIntervalMs Check interval in milliseconds
   * @returns true if lock was released, false if timeout
   */
  async waitForLock(
    key: string,
    maxWaitMs: number = 5000,
    checkIntervalMs: number = 100
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const exists = await this.exists(key);
      if (!exists) {
        return true; // Lock released
      }
      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }
    
    return false; // Timeout
  }

  /**
   * Execute function with distributed lock (prevents cache stampede)
   * @param lockKey Lock key prefix
   * @param fn Function to execute
   * @param ttlSeconds Lock TTL
   * @param maxWaitMs Maximum wait time for lock
   */
  async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 10,
    maxWaitMs: number = 5000
  ): Promise<T> {
    const lockAcquired = await this.acquireLock(lockKey, ttlSeconds);
    
    if (lockAcquired) {
      try {
        return await fn();
      } finally {
        await this.releaseLock(lockKey);
      }
    } else {
      // Wait for lock to be released
      const released = await this.waitForLock(lockKey, maxWaitMs);
      if (released) {
        // Lock was released, caller should retry or use cached data
        throw new Error('LOCK_RELEASED');
      }
      throw new Error('LOCK_TIMEOUT');
    }
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    if (!this.client) return;
    if (!this.subscriber) {
      try {
        this.subscriber = this.client.duplicate();
        await this.subscriber.connect();
      } catch (err: any) {
        this.logger.warn('[Redis] Failed to initialize subscriber:', err?.message || String(err));
        this.subscriber = null;
        return;
      }
    }

    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, msg) => {
        if (ch === channel) handler(msg);
      });
    } catch (err: any) {
      this.logger.warn('[Redis] Subscribe failed:', err?.message || String(err));
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriber) return;
    try {
      await this.subscriber.unsubscribe(channel);
    } catch (err: any) {
      this.logger.warn('[Redis] Unsubscribe failed:', err?.message || String(err));
    }
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      try {
        await this.subscriber.quit();
      } catch (error: any) {
        this.logger.warn('[Redis] Error closing subscriber connection:', error.message);
      }
      this.subscriber = null;
    }

    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('[Redis] Connection closed gracefully');
      } catch (error: any) {
        this.logger.warn('[Redis] Error closing connection:', error.message);
      }
    }
  }
}

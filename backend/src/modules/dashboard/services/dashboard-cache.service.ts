import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DashboardCache } from '../schemas/dashboard-cache.schema';

@Injectable()
export class DashboardCacheService {
  constructor(
    @InjectModel(DashboardCache.name) private cacheModel: Model<DashboardCache>,
  ) {}

  private getTenantQuery(tenantId: string): any {
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(tenantId);
    if (isValidObjectId) {
      return { tenantId: new Types.ObjectId(tenantId) };
    }
    return { tenantId };
  }

  async getCachedData(tenantId: string, key: string): Promise<any | null> {
    const tenantQuery = this.getTenantQuery(tenantId);
    const cache = await this.cacheModel.findOne({
      ...tenantQuery,
      cacheKey: key,
      expiresAt: { $gt: new Date() },
    });
    return cache?.data || null;
  }

  async setCachedData(tenantId: string, key: string, data: any, ttlMinutes = 5): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);
    const tenantQuery = this.getTenantQuery(tenantId);

    await this.cacheModel.findOneAndUpdate(
      { ...tenantQuery, cacheKey: key },
      { data, expiresAt },
      { upsert: true },
    );
  }

  async invalidateCache(tenantId: string, key?: string): Promise<void> {
    const tenantQuery = this.getTenantQuery(tenantId);
    const query: any = { ...tenantQuery };
    if (key) query.cacheKey = key;
    await this.cacheModel.deleteMany(query);
  }
}

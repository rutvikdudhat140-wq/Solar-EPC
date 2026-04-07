import { BadRequestException, Injectable, NotFoundException, ForbiddenException, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { createHash } from 'crypto';
import { Lead, LeadDocument } from '../schemas/lead.schema';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto, AddActivityDto } from '../dto/lead.dto';
import { LeadStatus, LeadStatusDocument, LeadStatusModuleConnection } from '../../settings/schemas/lead-status.schema';
import { buildVisibilityFilter, applyVisibilityFilter, buildCompleteFilter, canAccessRecord, UserWithVisibility } from '../../../common/utils/visibility-filter';
import { User, UserDocument } from '../../../core/auth/schemas/user.schema';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';
import { Project, ProjectDocument } from '../../projects/schemas/project.schema';
import { SiteSurveysService } from '../../survey/services/site-surveys.service';
import { CustomersService } from '../../customers/services/customers.service';
import { RedisService } from '../../../common/services/redis.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(LeadStatus.name) private leadStatusModel: Model<LeadStatusDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @Inject(forwardRef(() => SiteSurveysService))
    private readonly siteSurveysService: SiteSurveysService,
    private readonly customersService: CustomersService,
    private readonly redisService: RedisService,
  ) {}

  // Cache TTL constants (in seconds)
  private readonly DASHBOARD_TTL = 30; // 30 seconds with stale-while-revalidate
  private readonly LIST_TTL = 60; // 1 minute for list data
  private readonly EXPORT_TTL = 300; // 5 minutes for export results
  private readonly STALE_REFRESH_THRESHOLD = 10; // Refresh when <10s left

  /**
   * Generic cache wrapper using Redis with stampede protection
   * Executes function and caches result if not in cache
   * Implements stale-while-revalidate pattern
   */
  private async withCache<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
    useLock: boolean = true
  ): Promise<T> {
    try {
      // Try to get from Redis
      const cached = await this.redisService.get(key);
      if (cached) {
        Logger.log(`[CACHE HIT] ${key}`, 'LeadsService');
        
        // Check if cache is stale (needs background refresh)
        const ttl = await this.redisService.ttl(key);
        if (ttl > 0 && ttl < this.STALE_REFRESH_THRESHOLD) {
          Logger.log(`[STALE CACHE] ${key} - TTL: ${ttl}s, triggering background refresh`, 'LeadsService');
          // Trigger background refresh without waiting
          this.refreshCacheInBackground(key, ttlSeconds, fn).catch(err => {
            Logger.error(`[BACKGROUND REFRESH FAILED] ${key}: ${err.message}`, 'LeadsService');
          });
        }
        
        return JSON.parse(cached);
      }
      
      Logger.log(`[CACHE MISS] ${key}`, 'LeadsService');
      
      // Use distributed lock to prevent cache stampede
      if (useLock) {
        const lockKey = `lock:${key}`;
        try {
          return await this.redisService.withLock(lockKey, async () => {
            // Double-check cache after acquiring lock (another request might have populated it)
            const doubleCheck = await this.redisService.get(key);
            if (doubleCheck) {
              Logger.log(`[CACHE HIT AFTER LOCK] ${key}`, 'LeadsService');
              return JSON.parse(doubleCheck);
            }
            
            // Execute and cache
            const result = await fn();
            await this.redisService.set(key, JSON.stringify(result), ttlSeconds);
            return result;
          }, 10, 5000); // 10s lock TTL, 5s max wait
        } catch (error: any) {
          if (error.message === 'LOCK_RELEASED' || error.message === 'LOCK_TIMEOUT') {
            // Lock was released or timed out, use fallback execution
            Logger.warn(`[LOCK WAIT TIMEOUT] ${key}, executing without lock`, 'LeadsService');
            return fn();
          }
          throw error;
        }
      } else {
        // No locking, direct cache
        const result = await fn();
        await this.redisService.set(key, JSON.stringify(result), ttlSeconds);
        return result;
      }
    } catch (error) {
      Logger.error(`[CACHE ERROR] ${key}: ${(error as any).message}`, 'LeadsService');
      // Fallback: execute without caching
      return fn();
    }
  }

  /**
   * Refresh cache in background (stale-while-revalidate)
   */
  private async refreshCacheInBackground<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>
  ): Promise<void> {
    try {
      // Acquire lock to prevent multiple refreshes
      const lockKey = `lock:refresh:${key}`;
      const acquired = await this.redisService.acquireLock(lockKey, 5);
      
      if (acquired) {
        try {
          Logger.log(`[BACKGROUND REFRESH] ${key}`, 'LeadsService');
          const result = await fn();
          await this.redisService.set(key, JSON.stringify(result), ttlSeconds);
          Logger.log(`[BACKGROUND REFRESH COMPLETE] ${key}`, 'LeadsService');
        } finally {
          await this.redisService.releaseLock(lockKey);
        }
      } else {
        Logger.log(`[BACKGROUND REFRESH SKIPPED] ${key} - already refreshing`, 'LeadsService');
      }
    } catch (error) {
      Logger.error(`[BACKGROUND REFRESH ERROR] ${key}: ${(error as any).message}`, 'LeadsService');
    }
  }

  /**
   * Normalize filters to prevent key explosion
   * Only includes important fields in cache key
   */
  private normalizeFilters(filters: any): any {
    if (!filters) return {};
    
    const normalized: any = {};
    
    // Only include important filter fields
    const importantFields = ['status', 'source', 'assignedTo', 'minValue', 'maxValue', 'startDate', 'endDate', 'statusKey', 'statusKeys'];
    
    for (const field of importantFields) {
      if (filters[field] !== undefined && filters[field] !== null && filters[field] !== '') {
        normalized[field] = filters[field];
      }
    }
    
    return normalized;
  }

  /**
   * Generate optimized cache key with normalized filters hash
   * Prevents Redis key explosion from too many filter combinations
   */
  private generateCacheKey(prefix: string, tenantId?: string, userId?: string, filters?: any, ...parts: any[]): string {
    // Normalize filters first to reduce key variations
    const normalizedFilters = this.normalizeFilters(filters);
    
    const partsString = parts.map(p => 
      typeof p === 'object' ? JSON.stringify(p) : String(p)
    ).join(':');
    
    // Build key components
    const keyParts = [prefix];
    
    if (tenantId) keyParts.push(tenantId);
    if (userId) keyParts.push(userId);
    
    // Add normalized filters hash (only if filters exist)
    if (Object.keys(normalizedFilters).length > 0) {
      const filtersHash = createHash('md5')
        .update(JSON.stringify(normalizedFilters))
        .digest('hex');
      keyParts.push(filtersHash);
    }
    
    // Add remaining parts
    if (partsString) {
      keyParts.push(partsString);
    }
    
    const key = keyParts.join(':');
    
    // Use hash for long keys to stay within Redis key limits
    return key.length > 150 
      ? `${prefix}:${createHash('md5').update(key).digest('hex')}`
      : key;
  }

  /**
   * Build complete filter with tenant and visibility
   */
  private buildCompleteFilter(tenantId?: string, user?: UserWithVisibility, baseFilter: any = {}): any {
    // Use the centralized buildCompleteFilter from visibility-filter.ts
    // This properly respects dataScope (ALL vs ASSIGNED)
    return buildCompleteFilter(tenantId, user, baseFilter);
  }

  /**
   * Invalidate all CRM caches for a tenant
   * Call this when lead data changes (create/update/delete)
   * Uses granular invalidation to avoid over-invalidating
   */
  private async invalidateCrmCaches(
    tenantId?: string,
    options: {
      invalidateDashboard?: boolean;
      invalidateLists?: boolean;
      invalidateSpecificKey?: string;
    } = {}
  ): Promise<void> {
    if (!tenantId) return;
    
    const {
      invalidateDashboard = true,
      invalidateLists = true,
      invalidateSpecificKey
    } = options;
    
    try {
      const patterns: string[] = [];
      
      // Granular invalidation based on what changed
      if (invalidateDashboard) {
        patterns.push(`crm:dashboard:*:${tenantId}:*`);
      }
      
      if (invalidateLists) {
        patterns.push(`crm:leads:list:*:${tenantId}:*`);
      }
      
      // Specific key invalidation (most efficient)
      if (invalidateSpecificKey) {
        patterns.push(invalidateSpecificKey);
      }
      
      let totalInvalidated = 0;
      for (const pattern of patterns) {
        const keys = await this.redisService.keys(pattern);
        for (const key of keys) {
          await this.redisService.del(key);
          totalInvalidated++;
        }
        Logger.log(`[CACHE INVALIDATE] Pattern ${pattern}: cleared ${keys.length} keys`, 'LeadsService');
      }
      
      Logger.log(`[CACHE INVALIDATE] Total caches invalidated: ${totalInvalidated}`, 'LeadsService');
    } catch (error) {
      Logger.error(`[CACHE INVALIDATE] Failed: ${(error as any).message}`, 'LeadsService');
    }
  }

  // Check if user can access a specific lead
  private canAccessLead(user: UserWithVisibility, lead: any): boolean {
    return canAccessRecord(user, {
      assignedTo: lead?.assignedTo,
      createdBy: lead?.createdBy,
      tenantId: lead?.tenantId,
    });
  }

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    // Check if id is a valid 24-character hex string (MongoDB ObjectId format)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return undefined;
    try {
      return new Types.ObjectId(id);
    } catch {
      return undefined;
    }
  }

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  private tenantMatch(tenantId: string | Types.ObjectId) {
    const tid = typeof tenantId === 'string' ? new Types.ObjectId(tenantId) : tenantId;
    return { tenantId: tid };
  }

  private notDeletedMatch() {
    return { isDeleted: false };
  }

  // Helper to build date filter condition for MongoDB queries
  private buildDateFilter(startDate?: string, endDate?: string): any {
    if (!startDate && !endDate) return null;
    
    const range: any = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      range.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    
    return {
      $or: [
        { createdAt: range },
        { created: range },
      ],
    };
  }

  async getDashboardKpis(
    tenantId?: string,
    user?: UserWithVisibility,
    dateFilter?: { startDate?: string; endDate?: string }
  ): Promise<{
    totalLeads: number;
    pipelineLeads: number;
    convertedLeads: number;
    newLeads: number;
    lostLeads: number;
    pipelineValue: number;
    conversionRate: number;
    staleLeads7d: number;
    deltas: {
      totalLeadsPct: number;
      pipelineLeadsPct: number;
      convertedLeadsPct: number;
      pipelineValuePct: number;
    };
  }> {
    // Generate cache key based on tenant, user, and date filter
    const cacheKey = this.generateCacheKey(
      'crm:dashboard:kpis',
      tenantId,
      user?.id,
      dateFilter?.startDate || 'all',
      dateFilter?.endDate || 'all'
    );
    
    return this.withCache(cacheKey, this.DASHBOARD_TTL, async () => {
      // FORCE INLINE DATE FILTER IN EVERY QUERY
      const start = dateFilter?.startDate ? new Date(dateFilter.startDate) : null;
      const end = dateFilter?.endDate ? new Date(dateFilter.endDate) : null;
      
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      Logger.log(`[getDashboardKpis] INLINE DATES: start=${start?.toISOString()}, end=${end?.toISOString()}`, 'LeadsService');

      const baseMatch: any = { isDeleted: { $ne: true } };
      
      // Add tenant filter
      if (tenantId) {
        baseMatch.tenantId = new Types.ObjectId(tenantId);
      }
      
      // Add visibility filter from user
      if (user && !user.isSuperAdmin) {
        const visibility = buildVisibilityFilter(user);
        if (visibility.$and) {
          Object.assign(baseMatch, visibility);
        }
      }

      // CRITICAL: Add inline date filter
      if (start && end) {
        baseMatch.createdAt = { $gte: start, $lte: end };
      }

      Logger.log(`[getDashboardKpis] baseMatch: ${JSON.stringify(baseMatch)}`, 'LeadsService');

    const normalizedWonOrCustomer = ['won', 'customer'];
    const normalizedLost = ['lost'];

    // Build match conditions INLINE - no spreading
    const pipelineMatch = {
      ...baseMatch,
      statusKey: { $nin: [...normalizedWonOrCustomer, ...normalizedLost] }
    };

    const convertedMatch = {
      ...baseMatch,
      statusKey: { $in: normalizedWonOrCustomer }
    };

    const lostMatch = {
      ...baseMatch,
      statusKey: { $in: normalizedLost }
    };

    // NEW leads = leads created TODAY (regardless of date filter, this is intentional)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const newMatch = {
      ...baseMatch,
      createdAt: { $gte: todayStart, $lt: tomorrowStart }
    };

    Logger.log(`[getDashboardKpis] QUERY MATCHES:`, 'LeadsService');
    Logger.log(`  total/pipeline: ${JSON.stringify(pipelineMatch)}`, 'LeadsService');
    Logger.log(`  converted: ${JSON.stringify(convertedMatch)}`, 'LeadsService');
    Logger.log(`  lost: ${JSON.stringify(lostMatch)}`, 'LeadsService');

    const [
      totalLeads,
      pipelineLeads,
      convertedLeads,
      newLeads,
      lostLeads,
      pipelineValueAgg,
    ] = await Promise.all([
      this.leadModel.countDocuments(baseMatch),
      this.leadModel.countDocuments(pipelineMatch),
      this.leadModel.countDocuments(convertedMatch),
      this.leadModel.countDocuments(newMatch),
      this.leadModel.countDocuments(lostMatch),
      this.leadModel.aggregate([
        { $match: pipelineMatch },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$value', 0] } } } },
      ]),
    ]);

    const pipelineValue = Number(pipelineValueAgg?.[0]?.total || 0);
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    Logger.log(`[getDashboardKpis] RESULTS: total=${totalLeads}, pipeline=${pipelineLeads}, converted=${convertedLeads}, lost=${lostLeads}`, 'LeadsService');

    return {
      totalLeads,
      pipelineLeads,
      convertedLeads,
      newLeads,
      lostLeads,
      pipelineValue,
      conversionRate,
      staleLeads7d: 0, // Simplified for date filter fix
      deltas: {
        totalLeadsPct: 0,
        pipelineLeadsPct: 0,
        convertedLeadsPct: 0,
        pipelineValuePct: 0,
      },
    };
    }); // End withCache
  }

  private async assertValidStatusKey(statusKey: string | undefined, tenantId?: string): Promise<void> {
    if (!statusKey || statusKey === '') return;

    const normalizedStatusKey = statusKey.toString().trim().toLowerCase();
    if (!normalizedStatusKey) return;
    
    // Allow common lead status keys without DB validation
    const commonStatusKeys = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'estimate', 'survey', 'sitesurvey', 'site_survey'];
    if (commonStatusKeys.includes(normalizedStatusKey)) {
      return;
    }
    
    // For SuperAdmin/Global without tid, we skip strict DB validation for custom statuses
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid) return;

    const status = await this.leadStatusModel
      .findOne({ tenantId: tid, entity: 'lead', key: normalizedStatusKey, isActive: true })
      .lean()
      .exec();

    if (!status) {
      throw new BadRequestException(`Invalid lead statusKey '${statusKey}'`);
    }
  }

  // ============================================
  // LEAD SCORING ALGORITHM (matches frontend)
  // ============================================
  calculateScore(lead: Partial<Lead> & { [key: string]: any }): number {
    let score = 0;

    // Budget scoring based on value
    const value = (lead as any).value || 0;
    if (value >= 500000) score += 25;
    else if (value >= 200000) score += 15;
    else score += 5;

    // Timeline scoring based on created date
    const createdAt = lead.createdAt ? new Date(lead.createdAt).getTime() : Date.now();
    const daysSinceCreated = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated <= 7) score += 20;
    else if (daysSinceCreated <= 30) score += 10;
    else score += 5;

    // Source scoring
    if (lead.source === 'Referral') score += 15;
    else if (lead.source === 'Partner') score += 12;
    else if (lead.source === 'Website') score += 8;

    // Engagement scoring based on activities
    if (lead.activities && lead.activities.length > 0) {
      const recentActivities = lead.activities.filter((a: any) => {
        const activityDate = new Date(a.timestamp || Date.now()).getTime();
        const daysSince = Math.floor((Date.now() - activityDate) / (1000 * 60 * 60 * 24));
        return daysSince <= 7;
      });
      score += Math.min(recentActivities.length * 5, 20);
    }

    return Math.min(score, 100);
  }

  // ============================================
  // SLA BREACH DETECTION
  // ============================================
  checkSlaBreached(lead: Partial<Lead> & { [key: string]: any }): boolean {
    const activities = (lead as any).activities || [];
    const createdAt = (lead as any).createdAt;
    
    if (activities.length === 0) {
      const createdTime = createdAt ? new Date(createdAt).getTime() : Date.now();
      const daysSinceCreated = Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
      return daysSinceCreated > 3;
    }
    const lastActivity = activities[activities.length - 1];
    const activityTime = lastActivity?.timestamp ? new Date(lastActivity.timestamp).getTime() : Date.now();
    const daysSinceActivity = Math.floor((Date.now() - activityTime) / (1000 * 60 * 60 * 24));
    return daysSinceActivity > 3;
  }

  // ============================================
  // AUTOMATION RULES
  // ============================================
  applyAutomation(lead: Partial<Lead>): { ruleId: number; name: string; triggeredAt: Date }[] {
    const automationRules = [
      { id: 1, name: 'High Value Alert', condition: 'value > 500000' },
      { id: 2, name: 'SLA Follow-up', condition: 'days_inactive > 3' },
      { id: 3, name: 'Score Boost', condition: 'source == referral' },
    ];

    const activeAutomation: { ruleId: number; name: string; triggeredAt: Date }[] = [];

    automationRules.forEach((rule: any) => {
      let conditionMet = false;

      if (rule.condition.includes('value >')) {
        const threshold = parseInt(rule.condition.split(' > ')[1]);
        conditionMet = (lead.value || 0) > threshold;
      } else if (rule.condition.includes('days_inactive >')) {
        conditionMet = this.checkSlaBreached(lead);
      } else if (rule.condition.includes('source ==')) {
        const source = rule.condition.split(' == ')[1].replace(/'/g, '');
        conditionMet = lead.source === source;
      }

      if (conditionMet) {
        activeAutomation.push({
          ruleId: rule.id,
          name: rule.name,
          triggeredAt: new Date(),
        });
      }
    });

    return activeAutomation;
  }

  async create(createLeadDto: CreateLeadDto, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    const now = new Date();
    const leadId = `LEAD-${Date.now()}`;

    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new BadRequestException('Tenant context is required for creating leads');
    }

    // Check for duplicate email within tenant
    if (createLeadDto.email && tid) {
      const existingLead = await this.leadModel.findOne({
        tenantId: tid,
        email: createLeadDto.email.toLowerCase(),
        isDeleted: { $ne: true }
      }).lean().exec();
      
      if (existingLead) {
        throw new BadRequestException(
          `A lead with email "${createLeadDto.email}" already exists. Please use a different email or update the existing lead.`
        );
      }
    }

    await this.assertValidStatusKey(createLeadDto.statusKey, tenantId);
    
    const activities = [{
      type: 'created',
      ts: this.formatTimestamp(now),
      note: 'Lead created',
      by: user?.id || 'System',
      timestamp: now,
    }];

    const leadData: any = {
      ...createLeadDto,
      leadId,
      statusKey: createLeadDto.statusKey || 'new',
      activities,
      created: now,
      lastContact: now,
      tenantId: tid,
    };

    // Auto-sync: If statusKey is "customer", also set status field
    if (leadData.statusKey?.toLowerCase() === 'customer') {
      leadData.status = 'customer';
    }

    // Calculate initial score and SLA
    leadData.score = createLeadDto.score ?? this.calculateScore(leadData);
    leadData.slaBreached = this.checkSlaBreached(leadData);
    leadData.activeAutomation = this.applyAutomation(leadData);

    // CRITICAL: Always set createdBy from the user creating the lead
    if (user?._id) {
      leadData.createdBy = new Types.ObjectId(user._id.toString());
      Logger.log(`[create] >>> SET createdBy: ${leadData.createdBy} from user._id=${user._id}`, 'LeadsService');
    } else if (user?.id) {
      // Fallback to user.id if _id is not available
      const creatorId = typeof user.id === 'string' && Types.ObjectId.isValid(user.id)
        ? new Types.ObjectId(user.id)
        : user.id;
      leadData.createdBy = creatorId;
      Logger.log(`[create] >>> SET createdBy: ${leadData.createdBy} from user.id=${user.id}`, 'LeadsService');
    } else {
      Logger.warn(`[create] >>> WARNING: No user._id or user.id found! createdBy will be undefined`, 'LeadsService');
    }
    
    // Set assignedTo to null by default (unassigned)
    // This ensures visibility filter works correctly
    if (!leadData.assignedTo) {
      leadData.assignedTo = null;
    }

    Logger.log(`[create] >>> FINAL LEAD DATA: tenantId=${leadData.tenantId}, createdBy=${leadData.createdBy}, assignedTo=${leadData.assignedTo}`, 'LeadsService');

    const createdLead = new this.leadModel(leadData);
    const savedLead = await createdLead.save();
    
    // Invalidate caches after successful save
    await this.invalidateCrmCaches(tenantId);
    
    return savedLead;
  }

  async findAll(
    query: QueryLeadDto,
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<{ data: Lead[]; total: number }> {
    // TEMPORARY: Bypass cache for debugging
    const CACHE_BYPASS = true; // Set to false to re-enable cache
    
    if (CACHE_BYPASS) {
      Logger.log('[findAll] CACHE BYPASS ENABLED - executing fresh query', 'LeadsService');
      return this.executeFindAll(query, tenantId, user);
    }
    
    // Generate cache key based on query parameters
    const cacheKey = this.generateCacheKey(
      'crm:leads:list',
      tenantId,
      user?.id,
      JSON.stringify(query)
    );
    
    return this.withCache(cacheKey, this.LIST_TTL, async () => {
      return this.executeFindAll(query, tenantId, user);
    });
  }
  
  private async executeFindAll(
    query: QueryLeadDto,
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<{ data: Lead[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy,
      sortOrder = 'desc',
      search,
      source,
      statusKey,
      statusKeys,
      city,
      minScore,
      maxScore,
      minValue,
      maxValue,
      quickFilter,
      startDate,
      endDate,
    } = query;

    // Build complete filter with tenant and visibility
    const filter = this.buildCompleteFilter(tenantId, user, { isDeleted: { $ne: true } });
    
    // CRITICAL: If filter has top-level $or (visibility), we need to restructure it
    // to avoid mixing $or and $and at the same level
    if (filter.$or && !filter.$and) {
      // Move visibility $or into $and to keep structure clean
      const visibilityOr = filter.$or;
      delete filter.$or;
      filter.$and = [{ $or: visibilityOr }];
    }
    
    // CRITICAL DEBUG LOGGING
    Logger.log(`[findAll] >>> USER CONTEXT: id=${user?.id}, _id=${user?._id}, role=${user?.role}, tenant=${tenantId}`, 'LeadsService');
    Logger.log(`[findAll] >>> FILTER BUILT: ${JSON.stringify(filter)}`, 'LeadsService');

    // Apply quick filters
    if (quickFilter) {
      switch (quickFilter) {
        case 'highScore':
          filter.score = { $gt: 75 };
          break;
        case 'slaBreached':
          filter.slaBreached = true;
          break;
        case 'highValue':
          filter.value = { $gt: 500000 };
          break;
        case 'referral':
          filter.source = 'Referral';
          break;
        case 'automation':
          filter['activeAutomation.0'] = { $exists: true };
          break;
        case 'recent':
          filter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
          break;
      }
    }

    if (source) filter.source = source;
    const statusList = (typeof statusKeys === 'string' ? statusKeys : '')
      .split(',')
      .map((x) => String(x || '').trim().toLowerCase())
      .filter(Boolean);

    if (statusList.length > 0) {
      const statusExpr = {
        $expr: {
          $in: [
            { $toLower: { $ifNull: ['$statusKey', { $ifNull: ['$status', ''] }] } },
            statusList,
          ],
        },
      };
      // Status filter always adds to $and (which now always exists due to preprocessing)
      if (!filter.$and) {
        filter.$and = [];
      }
      filter.$and.push(statusExpr);
    } else if (statusKey) {
      const normalizedStatusKey = String(statusKey).trim().toLowerCase();
      if (normalizedStatusKey) {
        const statusExpr = {
          $expr: {
            $eq: [
              { $toLower: { $ifNull: ['$statusKey', { $ifNull: ['$status', ''] }] } },
              normalizedStatusKey,
            ],
          },
        };
        if (!filter.$and) {
          filter.$and = [];
        }
        filter.$and.push(statusExpr);
      }
    }
    if (city) filter.city = { $regex: city, $options: 'i' };

    if (minScore !== undefined || maxScore !== undefined) {
      filter.score = filter.score || {};
      if (minScore !== undefined) filter.score.$gte = minScore;
      if (maxScore !== undefined) filter.score.$lte = maxScore;
    }

    if (minValue !== undefined || maxValue !== undefined) {
      filter.value = {};
      if (minValue !== undefined) filter.value.$gte = minValue;
      if (maxValue !== undefined) filter.value.$lte = maxValue;
    }

    if (startDate || endDate) {
      // Use dates directly from ISO strings - frontend already sets proper boundaries
      const dateFilter: any = {};
      
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      
      if (endDate) {
        const end = new Date(endDate);
        // CRITICAL FIX: If start and end are the same day, set end to end-of-day
        // This ensures single-day selections work correctly
        if (startDate) {
          const start = new Date(startDate);
          const isSameDay = start.toISOString().split('T')[0] === end.toISOString().split('T')[0];
          if (isSameDay) {
            end.setHours(23, 59, 59, 999);
            Logger.log(`[findAll] Single day detected, adjusting end to: ${end.toISOString()}`, 'LeadsService');
          }
        }
        dateFilter.$lte = end;
      }

      // Apply date filter to BOTH createdAt AND created fields
      const dateExpr = {
        $or: [
          { createdAt: dateFilter },
          { created: dateFilter }
        ]
      };

      // Add to $and array (always exists due to preprocessing)
      if (!filter.$and) {
        filter.$and = [];
      }
      filter.$and.push(dateExpr);

      Logger.log(`[findAll] Date filter applied: ${JSON.stringify(dateFilter)}`, 'LeadsService');
    }

    if (search) {
      const searchNum = Number(search);
      const isNumeric = !isNaN(searchNum) && search.trim() !== '';
      
      // Build search conditions
      const orConditions: any[] = [];
      
      // Text fields - always search with regex
      orConditions.push(
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { statusKey: { $regex: search, $options: 'i' } }
      );
      
      // For numeric search, also match score and value
      if (isNumeric) {
        orConditions.push({ score: searchNum });
        orConditions.push({ value: { $gte: searchNum * 1000, $lt: (searchNum + 1) * 1000 } });
        orConditions.push({ value: { $gte: searchNum * 100000, $lt: (searchNum + 1) * 100000 } });
        orConditions.push({ value: { $gte: searchNum, $lt: searchNum + 1 } });
      }
      
      // Combine search $or with existing filter using $and
      if (!filter.$and) {
        filter.$and = [];
      }
      filter.$and.push({ $or: orConditions });
    }

    const sort: any = {};
    const sortField = sortBy || 'createdAt';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    Logger.log(`[findAll] Final filter: ${JSON.stringify(filter)}`, 'LeadsService');

    // DEBUG: Log the actual query that will be executed
    Logger.log(`[findAll] EXECUTING QUERY with filter: ${JSON.stringify(filter)}`, 'LeadsService');

    const [data, total] = await Promise.all([
      this.leadModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.leadModel.countDocuments(filter),
    ]);

    Logger.log(`[findAll] QUERY RESULT: ${data.length} leads found, total: ${total}`, 'LeadsService');

    const assignedToIds = Array.from(
      new Set(
        (Array.isArray(data) ? data : [])
          .map((l: any) => (l?.assignedTo ? String(l.assignedTo) : ''))
          .filter((x: string) => Boolean(x) && Types.ObjectId.isValid(x)),
      ),
    ).map((id) => new Types.ObjectId(id));

    const usersById = new Map<string, any>();
    if (assignedToIds.length > 0) {
      const users = await this.userModel
        .find({ _id: { $in: assignedToIds } })
        .select('firstName lastName name email')
        .lean()
        .exec();

      for (const u of users) {
        usersById.set(String((u as any)?._id), u);
      }
    }

    const enriched = (Array.isArray(data) ? data : []).map((lead: any) => {
      const assignedId = lead?.assignedTo ? String(lead.assignedTo) : undefined;
      const u = assignedId ? usersById.get(assignedId) : undefined;
      const displayName = u
        ? String((u as any).name || `${(u as any).firstName || ''} ${(u as any).lastName || ''}`.trim()).trim()
        : '';

      return {
        ...lead,
        assignedToName: displayName || undefined,
      };
    });

    return { data: enriched as any, total };
  }

  // ============================================
  // CUSTOMERS
  // ============================================
  async getCustomers(
    query: QueryLeadDto,
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<{ data: Lead[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      city,
      source,
      startDate,
      endDate,
    } = query;

    // Build complete filter with tenant and visibility
    // Filter for customers only (status = "customer" OR stage = "customer")
    Logger.log(`[getCustomers] Building filter for tenant=${tenantId}, user=${user?.id || user?._id}`, 'LeadsService');
    
    const baseFilter = {
      isDeleted: { $ne: true },
      $or: [
        { status: { $regex: '^customer$', $options: 'i' } },
        { stage: { $regex: '^customer$', $options: 'i' } },
        { statusKey: { $regex: '^customer$', $options: 'i' } },
      ],
    };
    Logger.log(`[getCustomers] Base filter (before visibility): ${JSON.stringify(baseFilter)}`, 'LeadsService');
    
    const filter = this.buildCompleteFilter(tenantId, user, baseFilter);
    Logger.log(`[getCustomers] Final filter (after visibility): ${JSON.stringify(filter)}`, 'LeadsService');

    // Apply additional filters
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (source) filter.source = source;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      const searchNum = Number(search);
      const isNumeric = !isNaN(searchNum) && search.trim() !== '';
      
      const orConditions: any[] = [];
      
      orConditions.push(
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      );

      if (isNumeric) {
        orConditions.push({ value: searchNum });
      }

      filter.$and = filter.$and || [];
      filter.$and.push({ $or: orConditions });
    }

    const sort: any = {};
    sort[sortBy || 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    Logger.log(`[getCustomers] EXECUTING QUERY with filter: ${JSON.stringify(filter)}`, 'LeadsService');

    // Fetch leads customers
    const [leadsData, leadsTotal] = await Promise.all([
      this.leadModel
        .find(filter)
        .populate('assignedTo', 'firstName lastName email name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.leadModel.countDocuments(filter),
    ]);

    Logger.log(`[getCustomers] Found ${leadsData.length} leads with status='customer'`, 'LeadsService');

    // Return ONLY leads with status='customer'
    // Note: Project customers are NOT included - they are not leads with status='customer'
    return { data: leadsData, total: leadsTotal };
  }

  async findOne(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    const filter: any = this.buildCompleteFilter(tenantId, user, {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    });

    const lead = await this.leadModel.findOne(filter).lean().exec();
    
    Logger.log(`[findOne] Found lead ${id}: statusKey=${lead?.statusKey}`, 'LeadsService');
    
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    
    // Check if user can access this specific lead
    if (user) {
      const canAccess = canAccessRecord(user, lead);
      if (!canAccess) {
        throw new ForbiddenException('You do not have permission to access this lead');
      }
    }
    
    return lead as Lead;
  }

  // Find lead by ID without tenant restrictions (for internal use)
  async findOneById(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Lead | null> {
    const base: any = {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    };

    const filter: any = tenantId || user ? this.buildCompleteFilter(tenantId, user, base) : base;
    const lead = await this.leadModel.findOne(filter).lean().exec();
    return lead as Lead | null;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    const filter: any = this.buildCompleteFilter(tenantId, user, {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    });
    
    // Check if lead exists first
    const existingLead = await this.leadModel.findOne(filter).exec();
    if (!existingLead) {
      throw new NotFoundException('Lead not found');
    }

    const previousStatusKey = existingLead.statusKey;
    const previousAssignedTo = existingLead.assignedTo ? existingLead.assignedTo.toString() : undefined;

    // Build update data - exclude undefined values
    const updateData: any = {};
    const allowedFields = [
      'name', 'company', 'email', 'phone', 'source', 'statusKey', 'city', 'state',
      'value', 'kw', 'roofArea', 'monthlyBill', 'roofType', 'budget', 'category',
      'tags', 'notes', 'assignedTo', 'score', 'archived', 'nextFollowUp', 'slaHours'
    ];
    
    const dtoAny = updateLeadDto as any;
    // Accept legacy/required alias: { stage: "..." } maps to statusKey
    if (dtoAny.stage !== undefined && dtoAny.statusKey === undefined) {
      dtoAny.statusKey = dtoAny.stage;
    }
    // Normalize statusKey/stage values so API can send e.g. "CONTACTED" while DB stores "contacted"
    if (typeof dtoAny.statusKey === 'string') {
      dtoAny.statusKey = dtoAny.statusKey.trim().toLowerCase();
    }
    
    Logger.log(`[update] Lead ${id}: incoming statusKey=${dtoAny.statusKey}, existing=${existingLead.statusKey}`);
    
    // Auto-sync: If stage/statusKey is set to "customer", also update status field
    if (dtoAny.statusKey && dtoAny.statusKey.toLowerCase() === 'customer') {
      updateData.status = 'customer';
    }
    
    for (const field of allowedFields) {
      if (dtoAny[field] !== undefined) {
        updateData[field] = dtoAny[field];
      }
    }

    // Only validate statusKey if it's being updated
    if (updateData.statusKey !== undefined) {
      await this.assertValidStatusKey(updateData.statusKey, tenantId);
    }

    // Handle stage change activity
    if (updateData.statusKey && updateData.statusKey !== existingLead.statusKey) {
      Logger.log(`[update] Lead ${id}: stage changing from ${existingLead.statusKey} to ${updateData.statusKey}`);
      const now = new Date();
      const activity = {
        type: 'stage_change',
        ts: this.formatTimestamp(now),
        note: `Stage changed from ${existingLead.statusKey} to ${updateData.statusKey}`,
        by: user?.id || 'System',
        timestamp: now,
      };
      
      // Push new activity to existing array
      updateData.$push = { activities: activity };
    }

    // Calculate auto-generated fields
    const autoFields = {
      lastContact: new Date(),
      score: updateLeadDto.score === undefined ? this.calculateScore({ ...existingLead.toObject(), ...updateData }) : updateLeadDto.score,
      slaBreached: this.checkSlaBreached({ ...existingLead.toObject(), ...updateData }),
      activeAutomation: this.applyAutomation({ ...existingLead.toObject(), ...updateData }),
    };

    // Use findOneAndUpdate to properly persist changes
    const updateQuery = {
      ...updateData,
      ...autoFields,
    };

    const updatedLead = await this.leadModel.findOneAndUpdate(
      filter,
      updateQuery,
      { new: true, runValidators: true }
    ).exec();

    if (!updatedLead) {
      throw new NotFoundException('Lead not found after update');
    }

    const nextAssignedTo = updatedLead.assignedTo ? updatedLead.assignedTo.toString() : undefined;
    const assignedChanged = updateData.assignedTo !== undefined && nextAssignedTo !== previousAssignedTo;

    // Dynamic module automation based on LeadStatus.moduleConnection
    const nextStatusKey = updatedLead.statusKey;
    const stageChanged = updateData.statusKey !== undefined && nextStatusKey !== previousStatusKey;
    if (stageChanged || assignedChanged) {
      try {
        const [prevConfig, nextConfig] = await Promise.all([
          previousStatusKey ? this.leadStatusModel.findOne({ tenantId: updatedLead.tenantId, entity: 'lead', key: previousStatusKey, isActive: true }).lean() : null,
          nextStatusKey ? this.leadStatusModel.findOne({ tenantId: updatedLead.tenantId, entity: 'lead', key: nextStatusKey, isActive: true }).lean() : null,
        ]);

        const prevConn = (prevConfig as any)?.moduleConnection as LeadStatusModuleConnection | null | undefined;
        const nextConn = (nextConfig as any)?.moduleConnection as LeadStatusModuleConnection | null | undefined;

        // Backward-compatible fallback for existing tenants (pre-config)
        const fallbackIsSurvey = (key?: string) => key === 'sitesurvey' || key === 'survey';

        const shouldCreateSurvey = nextConn === LeadStatusModuleConnection.SURVEY || (!nextConn && fallbackIsSurvey(nextStatusKey));
        const shouldDeactivateSurvey = (prevConn === LeadStatusModuleConnection.SURVEY || (!prevConn && fallbackIsSurvey(previousStatusKey))) && !shouldCreateSurvey;

        if (shouldCreateSurvey) {
          await this.siteSurveysService.createFromLead(
            {
              leadId: updatedLead._id.toString(),
              clientName: updatedLead.name,
              city: updatedLead.city,
              projectCapacity: updatedLead.kw ? `${updatedLead.kw} kW` : undefined,
              engineer: updatedLead.assignedTo ? updatedLead.assignedTo.toString() : undefined,
              assignedTo: updatedLead.assignedTo ? updatedLead.assignedTo.toString() : undefined,
            },
            tenantId,
            user
          );
        } else if (shouldDeactivateSurvey) {
          await this.siteSurveysService.deactivateByLeadId(updatedLead._id.toString(), tenantId, user);
        }

        // If the lead remains in a survey-connected stage and assignment changed, sync survey assignment
        if (assignedChanged && shouldCreateSurvey) {
          await this.siteSurveysService.updateAssignmentByLeadId(
            updatedLead._id.toString(),
            updatedLead.assignedTo ? updatedLead.assignedTo.toString() : undefined,
            tenantId,
            user
          );
        }

        if (nextConn === LeadStatusModuleConnection.CUSTOMER) {
          await this.customersService.create(
            {
              leadId: updatedLead._id.toString(),
              name: updatedLead.name,
              email: updatedLead.email,
              phone: updatedLead.phone,
            },
            tenantId,
            user
          );
        }
      } catch (error: any) {
        Logger.error(
          `[Lead Module Automation] Failed for lead=${updatedLead._id} from ${previousStatusKey} to ${nextStatusKey}: ${error?.message || error}`
        );
      }
    }

    // Invalidate caches after successful update
    await this.invalidateCrmCaches(tenantId);
    
    return updatedLead;
  }

  private formatTimestamp(date: Date): string {
    return date.toISOString();
  }

  async remove(id: string, tenantId?: string, user?: UserWithVisibility): Promise<void> {
    const filter: any = this.buildCompleteFilter(tenantId, user, {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
    });

    const result = await this.leadModel.findOneAndUpdate(
      filter,
      { isDeleted: true },
      { new: true }
    ).exec();

    if (!result) {
      throw new NotFoundException('Lead not found');
    }
    
    // Invalidate caches after successful delete
    await this.invalidateCrmCaches(tenantId);
  }

  async duplicate(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    const existing = await this.findOne(id, tenantId, user);
    const leadData = (existing as any).toObject ? (existing as any).toObject() : { ...existing };
    
    delete leadData._id;
    delete leadData.id;
    leadData.leadId = `LEAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    leadData.created = new Date();
    leadData.activities = [{
      type: 'created',
      ts: this.formatTimestamp(new Date()),
      note: `Duplicated from ${existing.leadId || id}`,
      by: user?.id || 'System',
      timestamp: new Date(),
    }];

    const newLead = new this.leadModel(leadData);
    return newLead.save();
  }

  async addActivity(id: string, dto: AddActivityDto, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    });

    const now = new Date();
    const activity = {
      ...dto,
      ts: this.formatTimestamp(now),
      timestamp: now,
      by: user?.id || 'System',
    };

    const updated = await this.leadModel.findOneAndUpdate(
      filter,
      { 
        $push: { activities: activity },
        $set: { lastContact: now }
      },
      { new: true }
    ).exec();

    if (!updated) {
      throw new NotFoundException('Lead not found');
    }

    return updated;
  }

  async getTimeline(id: string, tenantId?: string, user?: UserWithVisibility): Promise<any[]> {
    const lead = await this.findOne(id, tenantId, user);
    return lead.activities || [];
  }

  async getTracker(id: string, tenantId?: string, user?: UserWithVisibility): Promise<any> {
    console.log(`[getTracker] Called with id: ${id}, tenantId: ${tenantId}`);
    
    const lead = await this.findOne(id, tenantId, user);
    console.log(`[getTracker] Found lead: ${lead?.leadId}, statusKey: ${lead?.statusKey}`);
    
    // Get all available lead statuses for stages
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    const statusQuery: any = { entity: 'lead', isActive: true };
    if (tid) {
      statusQuery.tenantId = tid;
    }
    const statuses = await this.leadStatusModel
      .find(statusQuery)
      .sort({ order: 1 })
      .lean()
      .exec();
    
    console.log(`[getTracker] Found ${statuses.length} statuses`);
    
    // Build stages array with current status
    const currentStatusKey = (lead.statusKey || 'new').toString().toLowerCase();
    console.log(`[getTracker] Current status key: ${currentStatusKey}`);
    
    const defaultStages = [
      { key: 'new', label: 'New', color: '#3b82f6', order: 1 },
      { key: 'contacted', label: 'Contacted', color: '#6366f1', order: 2 },
      { key: 'qualified', label: 'Qualified', color: '#8b5cf6', order: 3 },
      { key: 'proposal', label: 'Proposal', color: '#ec4899', order: 4 },
      { key: 'negotiation', label: 'Negotiation', color: '#f59e0b', order: 5 },
      { key: 'won', label: 'Won', color: '#10b981', order: 6 },
      { key: 'lost', label: 'Lost', color: '#ef4444', order: 7 },
    ];
    
    const stages = (statuses.length > 0 ? statuses : defaultStages).map((s: any) => ({
      stage: s.key,
      label: s.label,
      color: s.color,
      isCurrent: s.key.toLowerCase() === currentStatusKey,
      completed: s.order < (statuses.find((st: any) => st.key?.toLowerCase() === currentStatusKey)?.order || 999),
    }));
    
    console.log(`[getTracker] Built ${stages.length} stages`);
    
    // Calculate progress percentage
    const currentIndex = stages.findIndex((s: any) => s.isCurrent);
    const totalStages = stages.length;
    const progress = totalStages > 0 ? Math.round(((currentIndex + 1) / totalStages) * 100) : 0;
    
    const result = {
      leadId: lead.leadId,
      status: lead.statusKey,
      lastContact: lead.lastContact,
      score: lead.score,
      slaBreached: lead.slaBreached,
      stages,
      progress,
    };
    
    console.log(`[getTracker] Returning result with ${result.stages.length} stages, progress: ${result.progress}`);
    
    return result;
  }

  async updateStage(id: string, stage: string, userId: string, tenantId?: string, user?: UserWithVisibility): Promise<Lead> {
    Logger.log(`[updateStage] Called for lead ${id} with stage: ${stage}`);

    const normalizedIncomingStage = (stage || '').toString().trim().toLowerCase();
    const normalizedStage =
      normalizedIncomingStage === 'survey'
      || normalizedIncomingStage === 'site survey'
      || normalizedIncomingStage === 'site_survey'
        ? 'sitesurvey'
        : normalizedIncomingStage;

    const result = await this.update(id, { statusKey: normalizedStage } as any, tenantId, user);
    Logger.log(`[updateStage] Result for lead ${id}: statusKey=${result.statusKey}`);
    return result;
  }

  async bulkArchive(ids: string[], tenantId?: string, user?: UserWithVisibility): Promise<{ modified: number }> {
    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [
        { _id: { $in: objectIds } },
        { leadId: { $in: ids } }
      ],
      isDeleted: { $ne: true }
    });

    const result = await this.leadModel.updateMany(
      filter,
      { $set: { archived: true } }
    );

    return { modified: result.modifiedCount };
  }

  async reassignStatusKey(
    fromStatusKey: string,
    toStatusKey: string,
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<{ matched: number; modified: number; targetStatusKey: string }> {
    const fromKey = String(fromStatusKey || '').trim().toLowerCase();
    const toKey = String(toStatusKey || '').trim().toLowerCase();

    if (!fromKey || !toKey) {
      throw new BadRequestException('fromStatusKey and toStatusKey are required');
    }
    if (fromKey === toKey) {
      throw new BadRequestException('fromStatusKey and toStatusKey must be different');
    }

    // validate target status exists (tenant-scoped)
    await this.assertValidStatusKey(toKey, tenantId);

    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new BadRequestException('Tenant context is required');
    }

    // Find all leads in this tenant currently using fromKey (tenant-authoritative)
    const leads = await this.leadModel
      .find({ tenantId: tid, isDeleted: { $ne: true }, statusKey: fromKey })
      .select('_id')
      .lean()
      .exec();

    let modified = 0;
    for (const l of leads) {
      try {
        await this.update((l as any)._id.toString(), { statusKey: toKey } as any, tenantId, user);
        modified += 1;
      } catch (e) {
        // best-effort; continue so partial progress still helps unblock delete
        continue;
      }
    }

    return { matched: leads.length, modified, targetStatusKey: toKey };
  }

  async bulkDelete(ids: string[], tenantId?: string, user?: UserWithVisibility): Promise<{ modified: number }> {
    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [
        { _id: { $in: objectIds } },
        { leadId: { $in: ids } }
      ],
    });

    const result = await this.leadModel.updateMany(
      filter,
      { $set: { isDeleted: true } }
    );

    return { modified: result.modifiedCount };
  }

  async bulkUpdateStage(ids: string[], stage: string, tenantId?: string, user?: UserWithVisibility): Promise<{ modified: number }> {
    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [
        { _id: { $in: objectIds } },
        { leadId: { $in: ids } }
      ],
      isDeleted: { $ne: true }
    });

    const result = await this.leadModel.updateMany(
      filter,
      { $set: { statusKey: stage.toLowerCase() } }
    );

    return { modified: result.modifiedCount };
  }

  async getStats(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const filter = this.buildCompleteFilter(tenantId, user, { isDeleted: false });
    
    const [total, monthly, highValue, won, lost] = await Promise.all([
      this.leadModel.countDocuments(filter),
      this.leadModel.countDocuments({
        ...filter,
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
      this.leadModel.countDocuments({ ...filter, value: { $gte: 500000 } }),
      this.leadModel.countDocuments({ ...filter, statusKey: 'won' }),
      this.leadModel.countDocuments({ ...filter, statusKey: 'lost' }),
    ]);

    return {
      total,
      monthly,
      highValue,
      won,
      lost,
      conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
    };
  }

  async getDashboardOverview(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    return this.getStats(tenantId, user);
  }

  async getDashboardFunnel(
    tenantId?: string,
    user?: UserWithVisibility,
    dateFilter?: { startDate?: string; endDate?: string }
  ): Promise<any> {
    // Generate cache key based on tenant, user, and date filter
    const cacheKey = this.generateCacheKey(
      'crm:dashboard:funnel',
      tenantId,
      user?.id,
      dateFilter?.startDate || 'all',
      dateFilter?.endDate || 'all'
    );
    
    return this.withCache(cacheKey, this.DASHBOARD_TTL, async () => {
      // FORCE INLINE DATE FILTER
      const start = dateFilter?.startDate ? new Date(dateFilter.startDate) : null;
      const end = dateFilter?.endDate ? new Date(dateFilter.endDate) : null;
      
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      Logger.log(`[getDashboardFunnel] INLINE DATES: start=${start?.toISOString()}, end=${end?.toISOString()}`, 'LeadsService');

      const baseMatch: any = { isDeleted: { $ne: true } };
      
      // Add tenant filter
      if (tenantId) {
        baseMatch.tenantId = new Types.ObjectId(tenantId);
      }
      
      // Add visibility filter from user
      if (user && !user.isSuperAdmin) {
        const visibility = buildVisibilityFilter(user);
        if (visibility.$and) {
          Object.assign(baseMatch, visibility);
        }
      }

      // CRITICAL: Add inline date filter
      if (start && end) {
        baseMatch.createdAt = { $gte: start, $lte: end };
      }

      Logger.log(`[getDashboardFunnel] baseMatch: ${JSON.stringify(baseMatch)}`, 'LeadsService');
    
    // Get lead statuses with tenant filtering
    const statusQuery: any = { entity: 'lead', isActive: true };
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    
    if (tid) {
      statusQuery.tenantId = tid;
    }
    
    const statuses = await this.leadStatusModel.find(statusQuery).sort({ order: 1 }).lean();
    
    // Count leads for each status key - INLINE FILTER
    const counts = await Promise.all(statuses.map(async (s) => ({
      key: s.key,
      label: s.label,
      order: s.order || 0,
      count: await this.leadModel.countDocuments({ ...baseMatch, statusKey: s.key })
    })));

    Logger.log(`[getDashboardFunnel] counts: ${JSON.stringify(counts)}`, 'LeadsService');

    // Group by label and sum counts (deduplicate same label with different keys)
    const labelMap = new Map<string, { label: string; count: number; order: number }>();
    
    for (const item of counts) {
      if (!item.label) continue;
      
      const existing = labelMap.get(item.label);
      if (existing) {
        existing.count += item.count;
      } else {
        labelMap.set(item.label, {
          label: item.label,
          count: item.count,
          order: item.order
        });
      }
    }

    const uniqueStages = Array.from(labelMap.values())
      .sort((a, b) => a.order - b.order)
      .map(s => ({ stage: s.label, count: s.count }));

    return { stages: uniqueStages };
    }); // End withCache
  }

  async getDashboardSources(
    tenantId?: string,
    user?: UserWithVisibility,
    dateFilter?: { startDate?: string; endDate?: string }
  ): Promise<{ sources: Array<{ source: string; leads: number; value: number; pct: number }> }> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(
      'crm:dashboard:sources',
      tenantId,
      user?.id,
      dateFilter?.startDate || 'all',
      dateFilter?.endDate || 'all'
    );
    
    return this.withCache(cacheKey, this.DASHBOARD_TTL, async () => {
      // FORCE INLINE DATE FILTER
      const start = dateFilter?.startDate ? new Date(dateFilter.startDate) : null;
      const end = dateFilter?.endDate ? new Date(dateFilter.endDate) : null;
      
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      Logger.log(`[getDashboardSources] INLINE DATES: start=${start?.toISOString()}, end=${end?.toISOString()}`, 'LeadsService');

    const baseMatch: any = { isDeleted: { $ne: true } };
    
    // Add tenant filter
    if (tenantId) {
      baseMatch.tenantId = new Types.ObjectId(tenantId);
    }
    
    // Add visibility filter from user
    if (user && !user.isSuperAdmin) {
      const visibility = buildVisibilityFilter(user);
      if (visibility.$and) {
        Object.assign(baseMatch, visibility);
      }
    }

    // CRITICAL: Add inline date filter
    if (start && end) {
      baseMatch.createdAt = { $gte: start, $lte: end };
    }

    Logger.log(`[getDashboardSources] baseMatch: ${JSON.stringify(baseMatch)}`, 'LeadsService');
    
    const total = await this.leadModel.countDocuments(baseMatch);
    Logger.log(`[getDashboardSources] total leads in date range: ${total}`, 'LeadsService');

    const agg = await this.leadModel.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          _source: {
            $toLower: {
              $trim: {
                input: { $ifNull: ['$source', 'manual'] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          _sourceNorm: {
            $switch: {
              branches: [
                { case: { $in: ['$_source', ['website']] }, then: 'Website' },
                { case: { $in: ['$_source', ['referral']] }, then: 'Referral' },
                { case: { $in: ['$_source', ['campaign']] }, then: 'Campaign' },
                { case: { $in: ['$_source', ['ads', 'ad', 'facebook', 'google']] }, then: 'Ads' },
              ],
              default: 'Manual',
            },
          },
        },
      },
      {
        $group: {
          _id: '$_sourceNorm',
          leads: { $sum: 1 },
          value: { $sum: { $ifNull: ['$value', 0] } },
        },
      },
    ]);

    const order = ['Website', 'Referral', 'Campaign', 'Ads', 'Manual'];
    const map = new Map<string, { leads: number; value: number }>();
    for (const r of agg as any[]) {
      map.set(String(r._id), { leads: Number(r.leads || 0), value: Number(r.value || 0) });
    }

    Logger.log(`[getDashboardSources] agg results: ${JSON.stringify(agg)}`, 'LeadsService');

    return {
      sources: order.map((source) => {
        const v = map.get(source) || { leads: 0, value: 0 };
        const pct = total > 0 ? Math.round((v.leads / total) * 100) : 0;
        return { source, leads: v.leads, value: v.value, pct };
      }),
    };
    }); // End withCache
  }

  async getDashboardMonthly(
    tenantId?: string,
    user?: UserWithVisibility,
    dateFilter?: { startDate?: string; endDate?: string }
  ): Promise<{ months: Array<{ month: string; created: number; won: number }> }> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(
      'crm:dashboard:monthly',
      tenantId,
      user?.id,
      dateFilter?.startDate || 'all',
      dateFilter?.endDate || 'all'
    );
    
    return this.withCache(cacheKey, this.DASHBOARD_TTL, async () => {
      // FORCE INLINE DATE FILTER
      const start = dateFilter?.startDate ? new Date(dateFilter.startDate) : null;
      const end = dateFilter?.endDate ? new Date(dateFilter.endDate) : null;
      
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      Logger.log(`[getDashboardMonthly] INLINE DATES: start=${start?.toISOString()}, end=${end?.toISOString()}`, 'LeadsService');

      const baseMatch: any = { isDeleted: { $ne: true } };
      
      // Add tenant filter
      if (tenantId) {
        baseMatch.tenantId = new Types.ObjectId(tenantId);
      }
      
      // Add visibility filter from user
      if (user && !user.isSuperAdmin) {
        const visibility = buildVisibilityFilter(user);
        if (visibility.$and) {
          Object.assign(baseMatch, visibility);
        }
      }

      // CRITICAL: Add inline date filter
      if (start && end) {
        baseMatch.createdAt = { $gte: start, $lte: end };
      }

      Logger.log(`[getDashboardMonthly] baseMatch: ${JSON.stringify(baseMatch)}`, 'LeadsService');

    // Aggregate created leads by month - INLINE FILTER
    const createdAgg = await this.leadModel.aggregate([
      { $match: baseMatch },
      { $addFields: { _createdAt: { $ifNull: ['$createdAt', '$created'] } } },
      {
        $group: {
          _id: { y: { $year: '$_createdAt' }, m: { $month: '$_createdAt' } },
          created: { $sum: 1 },
        },
      },
    ]);

    Logger.log(`[getDashboardMonthly] createdAgg: ${JSON.stringify(createdAgg)}`, 'LeadsService');

    // Aggregate won leads by month - INLINE FILTER with status check
    const wonMatch = {
      ...baseMatch,
      statusKey: { $in: ['won', 'customer'] }
    };

    const wonAgg = await this.leadModel.aggregate([
      { $match: wonMatch },
      { $addFields: { _ts: { $ifNull: ['$updatedAt', { $ifNull: ['$createdAt', '$created'] }] } } },
      {
        $group: {
          _id: { y: { $year: '$_ts' }, m: { $month: '$_ts' } },
          won: { $sum: 1 },
        },
      },
    ]);

    Logger.log(`[getDashboardMonthly] wonAgg: ${JSON.stringify(wonAgg)}`, 'LeadsService');

    const key = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
    const createdMap = new Map<string, number>();
    for (const r of createdAgg as any[]) {
      createdMap.set(key(r._id.y, r._id.m), Number(r.created || 0));
    }
    const wonMap = new Map<string, number>();
    for (const r of wonAgg as any[]) {
      wonMap.set(key(r._id.y, r._id.m), Number(r.won || 0));
    }

    const months: Array<{ month: string; created: number; won: number }> = [];
    const d = new Date(start || new Date());
    d.setMonth(d.getMonth() - 11); // Default to last 12 months if no date filter
    const finalMonth = new Date(end || new Date());
    
    while (d <= finalMonth) {
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const k = key(y, m);
      months.push({ month: `${label} ${String(y).slice(-2)}`, created: createdMap.get(k) || 0, won: wonMap.get(k) || 0 });
      d.setMonth(d.getMonth() + 1);
    }

    return { months };
    }); // End withCache
  }

  async getDashboardTopPerformers(
    tenantId?: string,
    user?: UserWithVisibility,
    dateFilter?: { startDate?: string; endDate?: string }
  ): Promise<{ performers: Array<{ id: string; name: string; leadsHandled: number; converted: number; conversionRate: number }> }> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(
      'crm:dashboard:performers',
      tenantId,
      user?.id,
      dateFilter?.startDate || 'all',
      dateFilter?.endDate || 'all'
    );
    
    return this.withCache(cacheKey, this.DASHBOARD_TTL, async () => {
      // FORCE INLINE DATE FILTER
      const start = dateFilter?.startDate ? new Date(dateFilter.startDate) : null;
      const end = dateFilter?.endDate ? new Date(dateFilter.endDate) : null;
      
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      Logger.log(`[getDashboardTopPerformers] INLINE DATES: start=${start?.toISOString()}, end=${end?.toISOString()}`, 'LeadsService');

    const baseMatch: any = { isDeleted: { $ne: true } };
    
    // Add tenant filter
    if (tenantId) {
      baseMatch.tenantId = new Types.ObjectId(tenantId);
    }
    
    // Add visibility filter from user
    if (user && !user.isSuperAdmin) {
      const visibility = buildVisibilityFilter(user);
      if (visibility.$and) {
        Object.assign(baseMatch, visibility);
      }
    }

    // CRITICAL: Add inline date filter
    if (start && end) {
      baseMatch.createdAt = { $gte: start, $lte: end };
    }

    Logger.log(`[getDashboardTopPerformers] baseMatch: ${JSON.stringify(baseMatch)}`, 'LeadsService');

    const agg = await this.leadModel.aggregate([
      { $match: { ...baseMatch, assignedTo: { $nin: [null, ''] } } },
      {
        $addFields: {
          _assignee: {
            $cond: [{ $eq: ['$assignedTo', ''] }, null, { $ifNull: ['$assignedTo', null] }],
          },
          _statusNorm: { $toLower: { $ifNull: ['$statusKey', { $ifNull: ['$status', ''] }] } },
        },
      },
      {
        $group: {
          _id: '$_assignee',
          leadsHandled: { $sum: 1 },
          converted: { $sum: { $cond: [{ $in: ['$_statusNorm', ['won', 'customer']] }, 1, 0] } },
        },
      },
      { $sort: { converted: -1, leadsHandled: -1 } },
      { $limit: 5 },
    ]);

    Logger.log(`[getDashboardTopPerformers] agg results: ${JSON.stringify(agg)}`, 'LeadsService');

    const ids = (agg || []).map((r: any) => r._id).filter((id: any) => id && Types.ObjectId.isValid(String(id)));
    const users = ids.length
      ? await this.userModel
          .find({ _id: { $in: ids.map((id: any) => new Types.ObjectId(String(id))) } })
          .select({ firstName: 1, lastName: 1, name: 1, email: 1 })
          .lean()
          .exec()
      : [];
    const userMap = new Map<string, any>((users || []).map((u: any) => [String(u._id), u]));

    const performers = (agg || []).map((r: any) => {
      const id = r._id ? String(r._id) : 'unassigned';
      const u = userMap.get(id);
      const name =
        id === 'unassigned'
          ? 'Unassigned'
          : (u?.name || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || 'Unknown');
      const leadsHandled = Number(r.leadsHandled || 0);
      const converted = Number(r.converted || 0);
      const conversionRate = leadsHandled > 0 ? Math.round((converted / leadsHandled) * 100) : 0;
      return { id, name, leadsHandled, converted, conversionRate };
    });

    return { performers };
    }); // End withCache
  }

  // ============================================
  // UNIFIED DASHBOARD - SINGLE API WITH STRICT DATE FILTER
  // ============================================

  async getFullDashboard(
    tenantId?: string,
    user?: UserWithVisibility,
    dateFilter?: { startDate?: string; endDate?: string }
  ): Promise<{
    kpis: {
      totalLeads: number;
      pipelineLeads: number;
      convertedLeads: number;
      newLeads: number;
      lostLeads: number;
      pipelineValue: number;
      conversionRate: number;
    };
    funnel: { stages: Array<{ stage: string; count: number }> };
    sources: { sources: Array<{ source: string; leads: number; value: number }> };
    monthly: { months: Array<{ month: string; created: number; won: number }> };
    topPerformers: { performers: Array<{ id: string; name: string; leadsHandled: number; converted: number; conversionRate: number }> };
  }> {
    // STEP 1: PARSE AND VALIDATE DATES
    const start = dateFilter?.startDate ? new Date(dateFilter.startDate) : null;
    const end = dateFilter?.endDate ? new Date(dateFilter.endDate) : null;
    
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    
    Logger.log(`[getFullDashboard] DATE RANGE: start=${start?.toISOString()}, end=${end?.toISOString()}`, 'LeadsService');

    // STEP 2: CREATE SINGLE BASE FILTER - USED BY ALL QUERIES
    const baseMatch: any = { isDeleted: { $ne: true } };
    
    // Add tenant filter
    if (tenantId) {
      baseMatch.tenantId = new Types.ObjectId(tenantId);
    }
    
    // Add visibility filter from user
    if (user && !user.isSuperAdmin) {
      const visibility = buildVisibilityFilter(user);
      if (visibility.$and) {
        Object.assign(baseMatch, visibility);
      }
    }

    // CRITICAL: Add date filter to baseMatch - THIS IS THE SINGLE SOURCE OF TRUTH
    if (start && end) {
      baseMatch.createdAt = { $gte: start, $lte: end };
    }

    Logger.log(`[getFullDashboard] BASE FILTER: ${JSON.stringify(baseMatch)}`, 'LeadsService');

    // STEP 3: KPIs - USE baseMatch FOR ALL COUNTS
    const normalizedWon = ['won', 'customer'];
    const normalizedLost = ['lost'];

    const pipelineMatch = { ...baseMatch, statusKey: { $nin: [...normalizedWon, ...normalizedLost] } };
    const convertedMatch = { ...baseMatch, statusKey: { $in: normalizedWon } };
    const lostMatch = { ...baseMatch, statusKey: { $in: normalizedLost } };

    Logger.log(`[getFullDashboard] KPI MATCHES:`, 'LeadsService');
    Logger.log(`  total: ${JSON.stringify(baseMatch)}`, 'LeadsService');
    Logger.log(`  pipeline: ${JSON.stringify(pipelineMatch)}`, 'LeadsService');
    Logger.log(`  converted: ${JSON.stringify(convertedMatch)}`, 'LeadsService');
    Logger.log(`  lost: ${JSON.stringify(lostMatch)}`, 'LeadsService');

    const [
      totalLeads,
      pipelineLeads,
      convertedLeads,
      lostLeads,
      pipelineValueAgg,
    ] = await Promise.all([
      this.leadModel.countDocuments(baseMatch),
      this.leadModel.countDocuments(pipelineMatch),
      this.leadModel.countDocuments(convertedMatch),
      this.leadModel.countDocuments(lostMatch),
      this.leadModel.aggregate([
        { $match: pipelineMatch },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$value', 0] } } } },
      ]),
    ]);

    const pipelineValue = Number(pipelineValueAgg?.[0]?.total || 0);
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    // New leads = created today (not affected by date filter - this is standard behavior)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const newMatch = {
      ...baseMatch,
      createdAt: { $gte: todayStart, $lt: tomorrowStart }
    };
    const newLeads = await this.leadModel.countDocuments(newMatch);

    Logger.log(`[getFullDashboard] KPI RESULTS: total=${totalLeads}, pipeline=${pipelineLeads}, converted=${convertedLeads}, lost=${lostLeads}`, 'LeadsService');

    // STEP 4: FUNNEL - USE baseMatch
    const statusQuery: any = { entity: 'lead', isActive: true };
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      statusQuery.tenantId = new Types.ObjectId(tenantId);
    }
    const statuses = await this.leadStatusModel.find(statusQuery).sort({ order: 1 }).lean();

    const funnelCounts = await Promise.all(statuses.map(async (s) => ({
      key: s.key,
      label: s.label,
      order: s.order || 0,
      count: await this.leadModel.countDocuments({ ...baseMatch, statusKey: s.key })
    })));

    // Group by label and deduplicate
    const labelMap = new Map<string, { label: string; count: number; order: number }>();
    for (const item of funnelCounts) {
      if (!item.label) continue;
      const existing = labelMap.get(item.label);
      if (existing) {
        existing.count += item.count;
      } else {
        labelMap.set(item.label, { label: item.label, count: item.count, order: item.order });
      }
    }
    const stages = Array.from(labelMap.values())
      .sort((a, b) => a.order - b.order)
      .map(s => ({ stage: s.label, count: s.count }));

    Logger.log(`[getFullDashboard] FUNNEL: ${JSON.stringify(stages)}`, 'LeadsService');

    // STEP 5: SOURCES - USE baseMatch
    const sourcesAgg = await this.leadModel.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { $ifNull: ['$source', 'Unknown'] },
          leads: { $sum: 1 },
          value: { $sum: { $ifNull: ['$value', 0] } },
        },
      },
      { $sort: { leads: -1 } },
    ]);
    const sources = sourcesAgg.map((r: any) => ({ source: r._id, leads: r.leads, value: r.value }));

    Logger.log(`[getFullDashboard] SOURCES: ${JSON.stringify(sources)}`, 'LeadsService');

    // STEP 6: MONTHLY TREND - USE baseMatch
    const createdAgg = await this.leadModel.aggregate([
      { $match: baseMatch },
      { $addFields: { _createdAt: { $ifNull: ['$createdAt', '$created'] } } },
      {
        $group: {
          _id: { y: { $year: '$_createdAt' }, m: { $month: '$_createdAt' } },
          created: { $sum: 1 },
        },
      },
    ]);

    const wonMatch = { ...baseMatch, statusKey: { $in: normalizedWon } };
    const wonAgg = await this.leadModel.aggregate([
      { $match: wonMatch },
      { $addFields: { _ts: { $ifNull: ['$updatedAt', { $ifNull: ['$createdAt', '$created'] }] } } },
      {
        $group: {
          _id: { y: { $year: '$_ts' }, m: { $month: '$_ts' } },
          won: { $sum: 1 },
        },
      },
    ]);

    const key = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
    const createdMap = new Map<string, number>();
    for (const r of createdAgg as any[]) {
      createdMap.set(key(r._id.y, r._id.m), Number(r.created || 0));
    }
    const wonMap = new Map<string, number>();
    for (const r of wonAgg as any[]) {
      wonMap.set(key(r._id.y, r._id.m), Number(r.won || 0));
    }

    const months: Array<{ month: string; created: number; won: number }> = [];
    if (start && end) {
      const d = new Date(start);
      const finalMonth = new Date(end);
      while (d <= finalMonth) {
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const label = d.toLocaleString('en-US', { month: 'short' });
        const k = key(y, m);
        months.push({ month: `${label} ${String(y).slice(-2)}`, created: createdMap.get(k) || 0, won: wonMap.get(k) || 0 });
        d.setMonth(d.getMonth() + 1);
      }
    }

    Logger.log(`[getFullDashboard] MONTHLY: ${JSON.stringify(months)}`, 'LeadsService');

    // STEP 7: TOP PERFORMERS - USE baseMatch
    const performersAgg = await this.leadModel.aggregate([
      { $match: { ...baseMatch, assignedTo: { $nin: [null, ''] } } },
      {
        $addFields: {
          _assignee: { $cond: [{ $eq: ['$assignedTo', ''] }, null, { $ifNull: ['$assignedTo', null] }] },
          _statusNorm: { $toLower: { $ifNull: ['$statusKey', { $ifNull: ['$status', ''] }] } },
        },
      },
      {
        $group: {
          _id: '$_assignee',
          leadsHandled: { $sum: 1 },
          converted: { $sum: { $cond: [{ $in: ['$_statusNorm', ['won', 'customer']] }, 1, 0] } },
        },
      },
      { $sort: { converted: -1, leadsHandled: -1 } },
      { $limit: 5 },
    ]);

    const performerIds = (performersAgg || [])
      .map((r: any) => r._id)
      .filter((id: any) => id && Types.ObjectId.isValid(String(id)));
    
    const users = performerIds.length
      ? await this.userModel
          .find({ _id: { $in: performerIds.map((id: any) => new Types.ObjectId(String(id))) } })
          .select({ firstName: 1, lastName: 1, name: 1, email: 1 })
          .lean()
          .exec()
      : [];
    
    const userMap = new Map<string, any>(users.map((u: any) => [String(u._id), u]));

    const performers = (performersAgg || []).map((r: any) => {
      const id = r._id ? String(r._id) : 'unassigned';
      const u = userMap.get(id);
      const name = id === 'unassigned'
        ? 'Unassigned'
        : (u?.name || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || 'Unknown');
      const leadsHandled = Number(r.leadsHandled || 0);
      const converted = Number(r.converted || 0);
      const conversionRate = leadsHandled > 0 ? Math.round((converted / leadsHandled) * 100) : 0;
      return { id, name, leadsHandled, converted, conversionRate };
    });

    Logger.log(`[getFullDashboard] PERFORMERS: ${JSON.stringify(performers)}`, 'LeadsService');

    // STEP 8: RETURN UNIFIED RESULT
    return {
      kpis: {
        totalLeads,
        pipelineLeads,
        convertedLeads,
        newLeads,
        lostLeads,
        pipelineValue,
        conversionRate,
      },
      funnel: { stages },
      sources: { sources },
      monthly: { months },
      topPerformers: { performers },
    };
  }

  async getDashboardSource(tenantId?: string, user?: UserWithVisibility): Promise<{ sources: Array<{ source: string; leads: number; value: number }> }> {
    const cacheKey = this.generateCacheKey('crm:dashboard:source', tenantId, user?.id);
    return this.withCache(cacheKey, this.DASHBOARD_TTL, async () => {
      const filter = this.buildCompleteFilter(tenantId, user, {});

      const agg = await this.leadModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $ifNull: ['$source', 'Unknown'] },
            leads: { $sum: 1 },
            value: { $sum: { $ifNull: ['$value', 0] } },
          },
        },
        { $sort: { leads: -1 } },
      ]);

      return { sources: agg.map((r: any) => ({ source: r._id, leads: r.leads, value: r.value })) };
    });
  }

  async getDashboardTrend(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const filter = this.buildCompleteFilter(tenantId, user, { isDeleted: false });
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return this.leadModel.aggregate([
      { $match: { ...filter, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
  }

  async getDashboardActivity(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const filter = this.buildCompleteFilter(tenantId, user, { isDeleted: false });
    
    const leads = await this.leadModel.find(filter).sort({ lastContact: -1 }).limit(10).lean();
    return leads.map(l => ({
      leadName: l.name,
      lastActivity: l.activities?.[l.activities.length - 1],
      lastContact: l.lastContact
    }));
  }

  async getStatusOptions(tenantId?: string): Promise<any[]> {
    const query: any = { entity: 'lead', isActive: true };
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    
    if (tid) {
      query.tenantId = tid;
    }

    const statuses = await this.leadStatusModel
      .find(query)
      .sort({ order: 1 })
      .lean()
      .exec();

    // If no statuses found in DB, return defaults with proper labels
    if (statuses.length === 0) {
      return [
        { key: 'new', label: 'New', color: '#3b82f6', order: 1 },
        { key: 'contacted', label: 'Contacted', color: '#6366f1', order: 2 },
        { key: 'qualified', label: 'Qualified', color: '#8b5cf6', order: 3 },
        { key: 'proposal', label: 'Proposal', color: '#ec4899', order: 4 },
        { key: 'negotiation', label: 'Negotiation', color: '#f59e0b', order: 5 },
        { key: 'survey', label: 'Site Survey', color: '#06b6d4', order: 6 },
        { key: 'won', label: 'Won', color: '#10b981', order: 7 },
        { key: 'lost', label: 'Lost', color: '#ef4444', order: 8 },
      ];
    }

    // Map DB statuses to ensure proper label field
    return statuses.map(s => ({
      key: s.key,
      label: s.label || s.key, // Use label from DB, fallback to key
      color: s.color || '#64748b',
      order: s.order || 0,
      type: s.type,
      isActive: s.isActive,
    }));
  }

  async recalculateAllScores(tenantId?: string, user?: UserWithVisibility): Promise<{ processed: number }> {
    const filter = this.buildCompleteFilter(tenantId, user, { isDeleted: false });
    
    const leads = await this.leadModel.find(filter).exec();
    let processed = 0;

    for (const lead of leads) {
      const score = this.calculateScore(lead.toObject());
      const slaBreached = this.checkSlaBreached(lead.toObject());
      const activeAutomation = this.applyAutomation(lead.toObject());

      await this.leadModel.updateOne(
        { _id: lead._id },
        { $set: { score, slaBreached, activeAutomation } }
      );
      processed++;
    }

    return { processed };
  }

  async importLeads(filePath: string, fileExtension: string, tenantId?: string, user?: UserWithVisibility): Promise<any> {
    try {
      const rows = await this.parseFile(filePath, fileExtension);
      const validRows = this.filterValidRows(rows);
      const result = {
        total: validRows.length,
        inserted: 0,
        updated: 0,
        failed: 0,
        errors: [] as any[],
      };

      const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
      
      // For SuperAdmin without tenant context, we can't easily import leads 
      // as they MUST belong to a tenant.
      if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
        throw new BadRequestException('Tenant context is required for importing leads');
      }

      const knownFields = Object.keys(this.leadModel.schema.paths);
      const batchSize = 100;
      const bulkOps: any[] = [];

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const rowNumber = i + 2;

        try {
          const normalizedData = this.normalizeRowData(row, knownFields);
          
          // Check for existing lead by email or phone
          const existing = tid ? await this.findDuplicate(normalizedData.email, normalizedData.phone, tid.toString()) : null;

          if (existing) {
            const updateData = this.buildUpdateData(normalizedData);
            bulkOps.push({
              updateOne: {
                filter: { _id: existing._id },
                update: { $set: updateData },
              },
            });
            result.updated++;
          } else {
            if (!tid) {
              throw new Error('Tenant ID is required for new leads');
            }
            const leadId = `LEAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const now = new Date();
            const leadData: any = {
              ...normalizedData,
              leadId,
              tenantId: tid,
              createdBy: user?._id,
              created: now,
              lastContact: now,
              statusKey: normalizedData.statusKey || 'new',
              activities: [{
                type: 'created',
                ts: this.formatTimestamp(now),
                note: 'Lead imported',
                by: user?.id || 'System',
                timestamp: now,
              }],
            };

            leadData.score = this.calculateScore(leadData);
            leadData.slaBreached = this.checkSlaBreached(leadData);
            leadData.activeAutomation = this.applyAutomation(leadData);

            const filter = {
              tenantId: tid,
              leadId,
            };

            const updateDoc = {
              $setOnInsert: leadData,
            };

            bulkOps.push({
              updateOne: {
                filter: { leadId },
                update: { $set: leadData },
                upsert: true,
              },
            });
            result.inserted++;
          }

          if (bulkOps.length >= batchSize || i === validRows.length - 1) {
            if (bulkOps.length > 0) {
              await this.leadModel.bulkWrite(bulkOps);
              bulkOps.length = 0;
            }
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push({ row: rowNumber, reason: error.message });
        }
      }

      return result;
    } catch (error: any) {
      throw new BadRequestException(`Import failed: ${error.message}`);
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  private async parseFile(filePath: string, fileExtension: string): Promise<any[]> {
    const ext = fileExtension.toLowerCase();
    if (ext === '.csv' || ext === 'csv') return this.parseCSV(filePath);
    if (ext === '.xlsx' || ext === 'xlsx' || ext === '.xls' || ext === 'xls') return this.parseExcel(filePath);
    if (ext === '.json' || ext === 'json') return this.parseJSON(filePath);
    throw new BadRequestException('Unsupported file format');
  }

  private parseCSV(filePath: string): Promise<any[]> {
    const csvParser = require('csv-parser');
    return new Promise((resolve, reject) => {
      const rows: any[] = [];
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data: any) => rows.push(data))
        .on('end', () => resolve(rows))
        .on('error', (error: any) => reject(error));
    });
  }

  private parseExcel(filePath: string): any[] {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet);
  }

  private parseJSON(filePath: string): any[] {
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  private normalizeRowData(row: any, knownFields: string[]): any {
    const normalized: any = {
      customFields: {},
    };

    // Define comprehensive field mapping for CSV headers
    const fieldMapping: Record<string, string> = {
      // Name variations
      'name': 'name',
      'fullname': 'name',
      'full_name': 'name',
      'customername': 'name',
      'customer_name': 'name',
      'contactname': 'name',
      'contact_name': 'name',
      'leadname': 'name',
      'lead_name': 'name',
      
      // First/Last name
      'firstname': 'firstName',
      'first_name': 'firstName',
      'lastname': 'lastName',
      'last_name': 'lastName',
      
      // Email variations
      'email': 'email',
      'emailaddress': 'email',
      'email_address': 'email',
      'primaryemail': 'email',
      'primary_email': 'email',
      'e_mail': 'email',
      
      // Phone variations
      'phone': 'phone',
      'phonenumber': 'phone',
      'phone_number': 'phone',
      'mobile': 'phone',
      'mobilenumber': 'phone',
      'mobile_number': 'phone',
      'cellphone': 'phone',
      'cell_phone': 'phone',
      'contactnumber': 'phone',
      'contact_number': 'phone',
      'telephone': 'phone',
      'tel': 'phone',
      
      // Company variations
      'company': 'company',
      'companyname': 'company',
      'company_name': 'company',
      'businessname': 'company',
      'business_name': 'company',
      'organization': 'company',
      'organisation': 'company',
      
      // Stage/Status variations
      'stage': 'statusKey',
      'status': 'statusKey',
      'leadstage': 'statusKey',
      'lead_stage': 'statusKey',
      'dealstage': 'statusKey',
      'deal_stage': 'statusKey',
      'opportunitystage': 'statusKey',
      'opportunity_stage': 'statusKey',
      
      // Source variations
      'source': 'source',
      'leadsource': 'source',
      'lead_source': 'source',
      'origin': 'source',
      'channel': 'source',
      
      // Value variations
      'value': 'value',
      'dealvalue': 'value',
      'deal_value': 'value',
      'leadvalue': 'value',
      'lead_value': 'value',
      'opportunityvalue': 'value',
      'opportunity_value': 'value',
      'amount': 'value',
      'price': 'value',
      
      // Score variations
      'score': 'score',
      'leadscore': 'score',
      'lead_score': 'score',
      'priority': 'score',
      'rating': 'score',
      
      // City variations
      'city': 'city',
      'location': 'city',
      'area': 'city',
      'region': 'city',
      
      // State variations
      'state': 'state',
      'province': 'state',
      
      // Activity log variations
      'activitylog': 'activityLogs',
      'activity_log': 'activityLogs',
      'activitylogs': 'activityLogs',
      'activity_logs': 'activityLogs',
      'activities': 'activityLogs',
      'notes': 'activityLogs',
      'comments': 'activityLogs',
      'remarks': 'activityLogs',
    };

    // Normalize header names
    const normalizedRow: any = {};
    Object.keys(row).forEach((key) => {
      const normalizedKey = this.normalizeHeader(key);
      const mappedKey = fieldMapping[normalizedKey] || normalizedKey;
      normalizedRow[mappedKey] = row[key];
    });

    // Process each field
    Object.keys(normalizedRow).forEach((key) => {
      const value = normalizedRow[key];
      if (value === undefined || value === null || value === '') return;

      // Map known fields with special handling
      if (key === 'firstname' || key === 'first_name') {
        normalized.firstName = String(value).trim();
      } else if (key === 'lastname' || key === 'last_name') {
        normalized.lastName = String(value).trim();
      } else if (key === 'stage' || key === 'status') {
        normalized.statusKey = String(value).toLowerCase().trim();
      } else if (key === 'score') {
        const numScore = Number(value);
        normalized.score = isNaN(numScore) ? 0 : Math.min(Math.max(numScore, 0), 100);
      } else if (key === 'value') {
        normalized.value = this.normalizeValue(value);
      } else if (key === 'activityLogs') {
        // Handle activity logs - can be pipe-separated or single entry
        const logs = String(value).split('|').map((s) => s.trim()).filter((s) => s);
        normalized.activityLogs = logs;
      } else if (knownFields.includes(key)) {
        // Handle other known schema fields
        normalized[key] = this.normalizeField(key, value);
      } else {
        // Store unknown fields in customFields (dynamic custom field creation)
        // Normalize the key name for storage (e.g., "Building Type" -> "building_type")
        const customFieldKey = this.normalizeHeader(key);
        normalized.customFields[customFieldKey] = value;
      }
    });

    // Build full name from firstName + lastName
    if (normalized.firstName || normalized.lastName) {
      const first = normalized.firstName || '';
      const last = normalized.lastName || '';
      normalized.name = `${first} ${last}`.trim();
    } else if (normalizedRow.name) {
      normalized.name = String(normalizedRow.name).trim();
    }

    // Remove firstName/lastName from top level after combining
    delete normalized.firstName;
    delete normalized.lastName;

    return normalized;
  }

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  // Generate CSV import documentation with supported columns
  getImportDocumentation(): { standardFields: Array<{column: string; field: string; description: string}>; activityLogSupport: boolean; customFieldSupport: boolean } {
    return {
      standardFields: [
        { column: 'Name / Full Name / Customer Name', field: 'name', description: 'Lead full name (required)' },
        { column: 'Email / Email Address', field: 'email', description: 'Customer email address' },
        { column: 'Phone / Phone Number / Mobile', field: 'phone', description: 'Contact phone number' },
        { column: 'Company / Company Name', field: 'company', description: 'Company or organization name' },
        { column: 'Stage / Status', field: 'statusKey', description: 'Lead stage (new, contacted, qualified, proposal, negotiation, won, lost)' },
        { column: 'Source / Lead Source', field: 'source', description: 'Lead source (website, referral, campaign, ads, etc.)' },
        { column: 'Value / Deal Value / Amount', field: 'value', description: 'Deal value in currency' },
        { column: 'Score / Lead Score', field: 'score', description: 'Lead score (0-100)' },
        { column: 'City / Location', field: 'city', description: 'Customer city' },
        { column: 'State / Province', field: 'state', description: 'Customer state' },
        { column: 'Activity Log / Notes / Comments', field: 'activityLogs', description: 'Activity notes (use | separator for multiple entries)' },
      ],
      activityLogSupport: true,
      customFieldSupport: true,
    };
  }

  private normalizeValue(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    const str = String(value).trim();

    // Remove ₹ symbol and commas
    let cleanStr = str.replace(/[₹,]/g, '');

    // Handle L (Lakhs)
    if (cleanStr.toLowerCase().includes('l')) {
      const num = parseFloat(cleanStr.replace(/l/i, ''));
      return isNaN(num) ? 0 : num * 100000;
    }

    // Handle Cr (Crores)
    if (cleanStr.toLowerCase().includes('cr')) {
      const num = parseFloat(cleanStr.replace(/cr/i, ''));
      return isNaN(num) ? 0 : num * 10000000;
    }

    // Handle K (Thousands)
    if (cleanStr.toLowerCase().includes('k')) {
      const num = parseFloat(cleanStr.replace(/k/i, ''));
      return isNaN(num) ? 0 : num * 1000;
    }

    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  }

  private normalizeField(field: string, value: any): any {
    if (field === 'email') {
      return String(value).toLowerCase().trim();
    }
    if (field === 'score') {
      const num = Number(value);
      return isNaN(num) ? 0 : Math.min(Math.max(num, 0), 100);
    }
    if (field === 'value' || field === 'kw' || field === 'roofArea' || field === 'monthlyBill' || field === 'budget') {
      return this.normalizeValue(value);
    }
    return value;
  }

  private async findDuplicate(email?: string, phone?: string, tenantId?: string): Promise<any> {
    if (!email && !phone) return null;

    const filter: any = { isDeleted: { $ne: true } };
    
    if (tenantId) {
      filter.tenantId = this.toObjectId(tenantId);
    }

    const orConditions: any[] = [];
    if (email) orConditions.push({ email: email.toLowerCase() });
    if (phone) orConditions.push({ phone });
    
    filter.$or = orConditions;

    return this.leadModel.findOne(filter).lean().exec();
  }

  private buildUpdateData(normalizedData: any): any {
    const updateFields: any = {};
    
    const allowedFields = [
      'name', 'company', 'email', 'phone', 'source', 'statusKey', 'city', 'state',
      'value', 'kw', 'roofArea', 'monthlyBill', 'roofType', 'budget', 'category',
      'tags', 'notes', 'assignedTo', 'score', 'archived', 'nextFollowUp', 'slaHours'
    ];

    allowedFields.forEach((field) => {
      if (normalizedData[field] !== undefined) {
        updateFields[field] = normalizedData[field];
      }
    });

    // Merge customFields if any
    if (Object.keys(normalizedData.customFields).length > 0) {
      updateFields.customFields = normalizedData.customFields;
    }

    return updateFields;
  }

  // ============================================
  // CSV/Excel ROW FILTERING
  // ============================================

  private filterValidRows(rows: any[]): any[] {
    return rows.filter(row => {
      // Check if row has any valid data
      const hasValidData = Object.values(row).some(value => {
        // Skip null, undefined, empty strings
        if (value === null || value === undefined || value === '') {
          return false;
        }
        
        // Trim and check for formatting artifacts
        const trimmedValue = String(value).trim();
        
        // Skip formatting artifacts
        if (trimmedValue === '' || 
            trimmedValue === '######' || 
            trimmedValue === 'NaN' ||
            trimmedValue === 'undefined' ||
            trimmedValue === 'null') {
          return false;
        }
        
        return true;
      });
      
      return hasValidData;
    });
  }

  // ============================================
  // LEAD ASSIGNMENT
  // ============================================

  async assignLead(
    id: string,
    assignedTo: string,
    user: UserWithVisibility,
  ): Promise<Lead> {
    Logger.log(`[ASSIGN LEAD SERVICE] Called with - id: ${id}, assignedTo: ${assignedTo}, userId: ${user?.id}`, 'LeadsService');
    
    // STEP 1: Security - Never trust frontend role, validate from authenticated user
    const userRole = user?.role?.toLowerCase() || '';
    const allowedRoles = ['admin', 'manager'];
    if (!allowedRoles.includes(userRole)) {
      Logger.error(`[ASSIGN LEAD] Unauthorized: User role ${userRole} not allowed`, 'LeadsService');
      throw new ForbiddenException('Not authorized to assign leads. Only Admin or Manager can assign leads.');
    }

    // STEP 2: Validate assignedTo user ID
    Logger.log(`[ASSIGN LEAD] Validating assignedTo: ${assignedTo}`, 'LeadsService');

    // We always persist assignedTo as an ObjectId (User/Employee _id) to keep visibility filtering correct.
    // The incoming assignedTo may be:
    // - a Mongo ObjectId string
    // - an employeeId/custom id string
    let assignedToLookup: Types.ObjectId | string;
    if (Types.ObjectId.isValid(assignedTo)) {
      assignedToLookup = new Types.ObjectId(assignedTo);
      Logger.log(`[ASSIGN LEAD] Using ObjectId lookup: ${assignedToLookup}`, 'LeadsService');
    } else {
      assignedToLookup = assignedTo;
      Logger.log(`[ASSIGN LEAD] Using string lookup: ${assignedToLookup}`, 'LeadsService');
    }

    // Get tenantId from authenticated user (never from frontend)
    const tid = this.toObjectId(user.tenantId?.toString());
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new ForbiddenException('Tenant context missing');
    }
    
    // Use the assignedToId we already created above
    const assignedById = user._id;

    // STEP 3: Verify lead belongs to same tenant
    const leadFilter: any = this.buildCompleteFilter(tid?.toString(), user, {
      $or: [
        { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined },
        { leadId: id }
      ].filter(Boolean),
      isDeleted: { $ne: true }
    });

    const lead = await this.leadModel.findOne(leadFilter).lean().exec();
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // STEP 4: Verify target user belongs to same tenant
    let targetUser: any;
    if (tid) {
      // Try to find user in User collection first
      targetUser = undefined;
      
      if (typeof assignedToLookup === 'string') {
        // If it's a string ID, try matching against employeeId or custom ID fields
        targetUser = await this.userModel
          .findOne({ 
            $or: [
              { _id: assignedToLookup as any },
              { id: assignedToLookup }
            ],
            tenantId: tid 
          })
          .lean()
          .exec();
          
        // If not found in User collection, check Employee collection
        if (!targetUser) {
          // Use mongoose connection to query Employee collection
          const EmployeeModel = (this.leadModel as any).db.model('Employee');
          const employee = await EmployeeModel
            .findOne({ employeeId: assignedToLookup, tenantId: tid })
            .lean()
            .exec();
            
          if (employee) {
            Logger.log(`[ASSIGN LEAD] Found employee match: ${employee._id}`, 'LeadsService');
            // Convert employee to user-like structure for assignment
            targetUser = { 
              _id: employee._id, 
              id: employee.employeeId,
              email: employee.email,
              name: `${employee.firstName} ${employee.lastName}`
            };
          }
        }
      } else {
        // It's an ObjectId - search in BOTH User and Employee collections
        // First try User collection
        targetUser = await this.userModel
          .findOne({ _id: assignedToLookup, tenantId: tid })
          .lean()
          .exec();
        
        // If not found in User collection, check Employee collection
        if (!targetUser) {
          const EmployeeModel = (this.leadModel as any).db.model('Employee');
          const employee = await EmployeeModel
            .findOne({ _id: assignedToLookup, tenantId: tid })
            .lean()
            .exec();
            
          if (employee) {
            Logger.log(`[ASSIGN LEAD] Found employee by ObjectId match: ${employee._id}`, 'LeadsService');
            // Convert employee to user-like structure for assignment
            targetUser = { 
              _id: employee._id, 
              id: employee.employeeId,
              email: employee.email,
              name: `${employee.firstName} ${employee.lastName}`
            };
          }
        }
      }

      if (!targetUser) {
        Logger.error(`[ASSIGN LEAD] Target user not found: ${assignedTo}`, 'LeadsService');
        Logger.error(`[ASSIGN LEAD] Searched in tenant: ${tid}`, 'LeadsService');
        throw new BadRequestException('Target user does not belong to your tenant or does not exist');
      }
      
      Logger.log(`[ASSIGN LEAD] Target user found: ${targetUser._id || targetUser.id}`, 'LeadsService');
    }

    const assignedToId = targetUser?._id && Types.ObjectId.isValid(targetUser._id.toString())
      ? new Types.ObjectId(targetUser._id.toString())
      : (Types.ObjectId.isValid(assignedTo) ? new Types.ObjectId(assignedTo) : undefined);

    if (!assignedToId) {
      throw new BadRequestException('Invalid assignedTo user ID');
    }

    // Check if already assigned to same user
    const currentAssignedTo = lead.assignedTo?.toString();
    if (currentAssignedTo === assignedToId.toString()) {
      throw new BadRequestException('Lead is already assigned to this user');
    }

    const now = new Date();

    // STEP 5: Update lead with assignedTo and assignedBy
    const updateData: any = {
      assignedTo: assignedToId,
      assignedBy: assignedById,
      lastContact: now,
    };

    // Add assignment activity
    const activity = {
      type: 'assignment',
      ts: this.formatTimestamp(now),
      note: `Lead assigned to user ${assignedTo}`,
      by: user?.id || 'System',
      timestamp: now,
    };
    updateData.$push = { activities: activity };

    const updatedLead = await this.leadModel.findOneAndUpdate(
      leadFilter,
      updateData,
      { new: true, runValidators: true }
    ).exec();

    if (!updatedLead) {
      throw new NotFoundException('Lead not found after assignment');
    }

    // If lead is in a survey-connected stage, sync SiteSurvey.assignedTo so ASSIGNED users can see it.
    try {
      const statusKey = (updatedLead as any)?.statusKey;
      const tidStr = tid?.toString();
      const config = statusKey
        ? await this.leadStatusModel.findOne({ tenantId: updatedLead.tenantId, entity: 'lead', key: String(statusKey).toLowerCase(), isActive: true }).lean()
        : null;

      const conn = (config as any)?.moduleConnection as any;
      const fallbackIsSurvey = (key?: string) => key === 'sitesurvey' || key === 'survey';
      const isSurveyStage = conn === LeadStatusModuleConnection.SURVEY || (!conn && fallbackIsSurvey(String(statusKey || '').toLowerCase()));

      if (isSurveyStage) {
        await this.siteSurveysService.updateAssignmentByLeadId(
          updatedLead._id.toString(),
          assignedToId.toString(),
          tidStr,
          user,
        );
      }
    } catch (e: any) {
      Logger.warn(`[ASSIGN LEAD] Survey assignment sync failed: ${e?.message || e}`, 'LeadsService');
    }

    return updatedLead;
  }

  // ============================================
  // EXPORT LEADS
  // ============================================

  async exportLeads(ids: string[], tenantId?: string, user?: UserWithVisibility): Promise<{ csv: string; filename: string }> {
    const safeIds = Array.isArray(ids) ? ids : [];
    const objectIds = safeIds.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const orConditions: any[] = [];
    if (safeIds.length > 0) {
      if (objectIds.length > 0) orConditions.push({ _id: { $in: objectIds } });
      orConditions.push({ leadId: { $in: safeIds } });
    }

    const base: any = { isDeleted: { $ne: true } };
    if (orConditions.length > 0) {
      base.$or = orConditions;
    }

    const filter: any = this.buildCompleteFilter(tenantId, user, base);
    const leads = await this.leadModel.find(filter).lean().exec();

    return this.generateCSV(leads);
  }

  /**
   * Export leads with filters - supports date range and other filters
   * Uses streaming/batching for large datasets to avoid memory issues
   */
  async exportLeadsWithFilters(
    filters: any,
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<{ csv: string; filename: string }> {
    try {
      Logger.log(`[EXPORT] Building filter for export`, 'LeadsService');
      
      // Build base filter
      const baseFilter: any = { isDeleted: { $ne: true } };
      
      // Add tenant filter
      if (tenantId) {
        baseFilter.tenantId = new Types.ObjectId(tenantId);
      }
      
      // Add visibility filter from user (using buildCompleteFilter pattern)
      // Note: Visibility is handled by buildCompleteFilter
      
      // Apply date filters if provided
      if (filters?.startDate || filters?.endDate) {
        baseFilter.createdAt = {};
        if (filters.startDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          baseFilter.createdAt.$gte = start;
        }
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          baseFilter.createdAt.$lte = end;
        }
        Logger.log(`[EXPORT] Date filter applied: ${JSON.stringify(baseFilter.createdAt)}`, 'LeadsService');
      }
      
      // Merge with additional filters
      const finalFilter = { ...baseFilter, ...filters };
      delete finalFilter.startDate;
      delete finalFilter.endDate;
      
      Logger.log(`[EXPORT] Final filter: ${JSON.stringify(finalFilter)}`, 'LeadsService');
      
      // Use batch processing for memory efficiency
      const BATCH_SIZE = 1000;
      let skip = 0;
      let allLeads: any[] = [];
      
      do {
        const batch = await this.leadModel
          .find(finalFilter)
          .lean()
          .skip(skip)
          .limit(BATCH_SIZE)
          .exec();
        
        allLeads = [...allLeads, ...batch];
        skip += BATCH_SIZE;
        
        Logger.log(`[EXPORT] Fetched batch: ${batch.length} leads, total: ${allLeads.length}`, 'LeadsService');
      } while (skip < 10000); // Safety limit to prevent infinite loops
      
      Logger.log(`[EXPORT] Total leads fetched: ${allLeads.length}`, 'LeadsService');
      
      return this.generateCSV(allLeads);
    } catch (error: any) {
      Logger.error(`[EXPORT] Export failed: ${error.message}`, 'LeadsService');
      throw error;
    }
  }

  /**
   * Generate CSV from leads array
   */
  private generateCSV(leads: any[]): { csv: string; filename: string } {
    // Collect all unique custom field keys across all leads
    const allCustomFieldKeys = new Set<string>();
    leads.forEach(lead => {
      if (lead.customFields && typeof lead.customFields === 'object') {
        Object.keys(lead.customFields).forEach(key => allCustomFieldKeys.add(key));
      }
    });
    const customFieldColumns = Array.from(allCustomFieldKeys).sort();

    // Generate CSV headers with custom fields
    const baseHeaders = ['Name', 'Company', 'Email', 'Phone', 'Stage', 'Source', 'Value', 'Score', 'City', 'Assigned To', 'Created At'];
    const headers = [...baseHeaders, ...customFieldColumns];

    const rows = leads.map(lead => {
      const baseRow = [
        lead.name || '',
        lead.company || '',
        lead.email || '',
        lead.phone || '',
        lead.statusKey || 'new',
        lead.source || '',
        lead.value || 0,
        lead.score || 0,
        lead.city || '',
        lead.assignedTo?.toString() || '',
        lead.created ? new Date(lead.created).toISOString() : ''
      ];

      // Add custom field values
      const customFieldValues = customFieldColumns.map(key => {
        const value = lead.customFields?.[key];
        return value !== undefined && value !== null ? value : '';
      });

      return [...baseRow, ...customFieldValues];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return {
      csv: csvContent,
      filename: `leads_export_${new Date().toISOString().split('T')[0]}.csv`
    };
  }

  // ============================================
  // BULK UPDATE SCORE
  // ============================================

  async bulkUpdateScore(ids: string[], scoreIncrease: number, tenantId?: string, user?: UserWithVisibility): Promise<{ modified: number }> {
    if (!ids || ids.length === 0) {
      return { modified: 0 };
    }

    if (typeof scoreIncrease !== 'number' || Number.isNaN(scoreIncrease)) {
      throw new BadRequestException('scoreIncrease must be a number');
    }

    const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    const orConditions: any[] = [];
    if (objectIds.length > 0) orConditions.push({ _id: { $in: objectIds } });
    orConditions.push({ leadId: { $in: ids } });

    const filter: any = this.buildCompleteFilter(tenantId, user, {
      $or: orConditions,
      isDeleted: { $ne: true },
    });

    const matched = await this.leadModel.countDocuments(filter);
    if (matched === 0) {
      return { modified: 0 };
    }

    const now = new Date();
    const activity = {
      type: 'score_boost',
      ts: this.formatTimestamp(now),
      note: `Score boosted by ${scoreIncrease}`,
      by: user?.id || 'System',
      timestamp: now,
    };

    const result = await this.leadModel.updateMany(
      filter,
      {
        $inc: { score: scoreIncrease },
        $push: { activities: activity },
      }
    );

    if (result.modifiedCount !== matched) {
      throw new BadRequestException(`Bulk score update partially failed: matched ${matched}, modified ${result.modifiedCount}`);
    }

    return { modified: result.modifiedCount };
  }
}

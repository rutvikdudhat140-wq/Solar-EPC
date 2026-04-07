import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RBACConfig, RBACConfigDocument } from '../../modules/settings/schemas/rbac-config.schema';
import { CustomRole, CustomRoleDocument } from '../../modules/settings/schemas/custom-role.schema';
import { UserOverride, UserOverrideDocument } from '../../modules/settings/schemas/user-override.schema';
import { FeatureFlag, FeatureFlagDocument } from '../../modules/settings/schemas/feature-flag.schema';
import { RoleModulePermission, RoleModulePermissionDocument } from '../../modules/hrm/schemas/role-module-permission.schema';
import { RedisService } from './redis.service';

type PermissionObject = Record<string, Record<string, boolean>>;
type DataScopeObject = Record<string, string>;

@Injectable()
export class PermissionEngineService {
  private readonly logger = new Logger(PermissionEngineService.name);
  private readonly ttlSeconds = 300;

  private isAdminLike(role: string | undefined, isSuperAdmin?: boolean): boolean {
    if (isSuperAdmin === true) return true;
    const raw = String(role || '').trim();
    if (!raw) return false;
    const normalized = raw
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_');
    return normalized === 'ADMIN' || normalized === 'SUPER_ADMIN' || normalized === 'SUPERADMIN';
  }

  private shouldDebugLog(): boolean {
    return (
      String(process.env.PERMISSION_DEBUG_LOGS || '').toLowerCase() === 'true' ||
      String(process.env.PERMISSION_DEBUG || '').toLowerCase() === 'true'
    );
  }

  private summarizePermissions(perms: PermissionObject): {
    modules: number;
    actions: number;
    granted: number;
  } {
    let modules = 0;
    let actions = 0;
    let granted = 0;

    for (const modulePerms of Object.values(perms || {})) {
      modules += 1;
      for (const v of Object.values(modulePerms || {})) {
        actions += 1;
        if (v === true) granted += 1;
      }
    }

    return { modules, actions, granted };
  }

  private readonly fixedSchema: Record<string, string[]> = {
    dashboard: ['view'],
    hrm: ['view'],
    employees: ['view', 'create', 'edit', 'delete'],
    attendance: ['view', 'checkin', 'checkout', 'edit'],
    leaves: ['view', 'apply', 'approve', 'reject'],
    payroll: ['view', 'generate', 'export'],
    increments: ['view', 'create', 'edit', 'delete'],
    departments: ['view', 'create', 'edit', 'delete'],
    crm: ['view', 'create', 'edit', 'delete', 'assign', 'convert'],
    survey: ['view', 'create', 'edit', 'delete', 'export', 'assign'],
    design: ['view', 'create', 'edit', 'delete', 'export', 'approve'],
    documents: ['view', 'create', 'edit', 'delete', 'export'],
    inventory: ['view', 'create', 'edit', 'delete', 'export', 'approve', 'assign'],
    procurement: ['view', 'create', 'approve'],
    projects: ['view', 'create', 'edit', 'delete', 'export', 'approve', 'assign'],
    project: ['view', 'create', 'edit', 'delete', 'export', 'approve', 'assign'],
    logistics: ['view', 'create', 'edit', 'delete', 'assign', 'approve', 'export'],
    installation: ['view', 'assign', 'update'],
    commissioning: ['view', 'assign', 'update', 'approve', 'export'],
    finance: ['view', 'create', 'approve', 'export'],
    service: ['view', 'create', 'edit', 'delete', 'assign', 'approve', 'export'],
    compliance: ['view', 'create', 'edit', 'delete', 'export', 'approve'],
    admin: ['view', 'create', 'edit', 'delete', 'export', 'approve', 'assign'],
    settings: ['view', 'create', 'edit', 'delete', 'export', 'approve', 'assign'],
    intelligence: ['view'],
    tickets: ['view', 'create', 'edit', 'delete', 'assign', 'approve', 'export'],
    quotation: ['view', 'create', 'edit', 'delete', 'export', 'approve'],
    quotations: ['view', 'create', 'edit', 'delete', 'export', 'approve'],
    leads: ['view', 'create', 'edit', 'delete', 'export', 'assign', 'convert'],
    tasks: ['view', 'create', 'edit', 'delete', 'export', 'assign'],
  };

  constructor(
    private readonly redisService: RedisService,
    @InjectModel(RBACConfig.name) private readonly rbacConfigModel: Model<RBACConfigDocument>,
    @InjectModel(CustomRole.name) private readonly customRoleModel: Model<CustomRoleDocument>,
    @InjectModel(UserOverride.name) private readonly userOverrideModel: Model<UserOverrideDocument>,
    @InjectModel(FeatureFlag.name) private readonly featureFlagModel: Model<FeatureFlagDocument>,
    @InjectModel(RoleModulePermission.name) private readonly roleModulePermissionModel: Model<RoleModulePermissionDocument>,
  ) {}

  private permissionKey(tenantId: string, userId: string): string {
    return `permission:${tenantId}:${userId}`;
  }

  private dataScopeKey(tenantId: string, userId: string): string {
    return `datascope:${tenantId}:${userId}`;
  }

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    if (!Types.ObjectId.isValid(id)) return undefined;
    return new Types.ObjectId(id);
  }

  private getAllowedActions(moduleId: string): string[] {
    if (this.fixedSchema[moduleId]) return this.fixedSchema[moduleId];
    const defaults = new Set<string>([
      'view',
      'create',
      'edit',
      'delete',
      'export',
      'approve',
      'assign',
      'convert',
      'update',
      'checkin',
      'checkout',
      'apply',
      'generate',
      'reject',
    ]);
    return Array.from(defaults);
  }

  private ensureModuleShape(perms: PermissionObject, moduleId: string): void {
    if (perms[moduleId]) return;
    const actions = this.getAllowedActions(moduleId);
    perms[moduleId] = Object.fromEntries(actions.map(a => [a, false]));
  }

  private setPermission(perms: PermissionObject, moduleId: string, actionId: string, value: boolean): void {
    const allowed = this.getAllowedActions(moduleId);
    if (!allowed.includes(actionId)) {
      return;
    }
    this.ensureModuleShape(perms, moduleId);
    perms[moduleId][actionId] = value === true;
  }

  private async getAllKnownModules(tenantId: string | undefined): Promise<string[]> {
    const tid = this.toObjectId(tenantId);
    const flags = await this.featureFlagModel
      .find(tid ? { tenantId: tid } : {})
      .select('moduleId')
      .lean();

    const fromFlags = (flags || [])
      .map((f: any) => String(f.moduleId || '').trim())
      .filter(Boolean);

    const fromSchema = Object.keys(this.fixedSchema);
    const out = new Set<string>([...fromSchema, ...fromFlags]);
    return Array.from(out);
  }

  private normalizeRbacPermissions(raw: any): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    if (!raw || typeof raw !== 'object') return out;

    if (typeof raw.entries === 'function') {
      for (const [k, v] of raw.entries()) {
        out[String(k)] = v === true;
      }
      return out;
    }

    for (const [k, v] of Object.entries(raw)) {
      out[String(k)] = v === true;
    }
    return out;
  }

  private async buildFullAccessMatrix(tenantId: string | undefined): Promise<{ permissions: PermissionObject; dataScope: DataScopeObject }> {
    const modules = await this.getAllKnownModules(tenantId);
    const permissions: PermissionObject = {};
    const dataScope: DataScopeObject = {};

    for (const moduleId of modules) {
      this.ensureModuleShape(permissions, moduleId);
      for (const actionId of this.getAllowedActions(moduleId)) {
        this.setPermission(permissions, moduleId, actionId, true);
      }
      dataScope[moduleId] = 'ALL';
    }

    return { permissions, dataScope };
  }

  private normalizeNestedPermissions(raw: any): Record<string, Record<string, boolean>> {
    const out: Record<string, Record<string, boolean>> = {};
    if (!raw || typeof raw !== 'object') return out;

    const entries: Array<[any, any]> = typeof raw.entries === 'function'
      ? (Array.from((raw as any).entries()) as Array<[any, any]>)
      : (Object.entries(raw) as Array<[any, any]>);
    for (const [moduleIdRaw, modulePermsRaw] of entries) {
      const moduleId = String(moduleIdRaw);
      out[moduleId] = this.normalizeRbacPermissions(modulePermsRaw);
    }
    return out;
  }

  async getPermissions(
    userId: string,
    tenantId: string,
    roleId: string,
    isSuperAdmin?: boolean,
  ): Promise<{ permissions: PermissionObject; dataScope: DataScopeObject }> {
    if (this.isAdminLike(roleId, isSuperAdmin)) {
      console.log('[ADMIN OVERRIDE ACTIVE]', userId);
      if (this.shouldDebugLog()) {
        this.logger.debug(
          `[PERMISSION_DEBUG] admin override active tenantId=${tenantId} userId=${userId} roleId=${roleId} isSuperAdmin=${String(isSuperAdmin === true)}`,
        );
      }
      return this.buildFullAccessMatrix(tenantId);
    }

    const permKey = this.permissionKey(tenantId, userId);
    const scopeKey = this.dataScopeKey(tenantId, userId);

    if (this.shouldDebugLog()) {
      this.logger.debug(
        `[PERMISSION_DEBUG] getPermissions start tenantId=${tenantId} userId=${userId} roleId=${roleId} permKey=${permKey} scopeKey=${scopeKey} ttl=${this.ttlSeconds}s`,
      );
    }

    const cached = await this.redisService.get(permKey);
    const cachedScope = await this.redisService.get(scopeKey);

    if (cached && cachedScope) {
      try {
        const permissions = JSON.parse(cached);
        const dataScope = JSON.parse(cachedScope);

        if (this.shouldDebugLog()) {
          const summary = this.summarizePermissions(permissions);
          this.logger.debug(
            `[PERMISSION_DEBUG] redis HIT tenantId=${tenantId} userId=${userId} summary=${JSON.stringify(summary)} scopeModules=${Object.keys(dataScope || {}).length}`,
          );
        }

        return { permissions, dataScope };
      } catch {
        if (this.shouldDebugLog()) {
          this.logger.warn(
            `[PERMISSION_DEBUG] redis PARSE_ERROR tenantId=${tenantId} userId=${userId} -> rebuilding`,
          );
        }
      }
    } else if (this.shouldDebugLog()) {
      this.logger.debug(
        `[PERMISSION_DEBUG] redis MISS tenantId=${tenantId} userId=${userId} hasPerm=${Boolean(cached)} hasScope=${Boolean(cachedScope)} -> building`,
      );
    }

    const result = await this.buildAndCachePermissions(userId, tenantId, roleId);
    return result;
  }

  async buildAndCachePermissions(userId: string, tenantId: string, roleId: string): Promise<{ permissions: PermissionObject; dataScope: DataScopeObject }> {
    const startedAt = Date.now();

    const [modules, rbacDocs, userOverrideDoc] = await Promise.all([
      this.getAllKnownModules(tenantId),
      this.rbacConfigModel.find({ tenantId: this.toObjectId(tenantId), roleId }).lean(),
      this.userOverrideModel.findOne({ tenantId: this.toObjectId(tenantId), userId: this.toObjectId(userId) }).lean(),
    ]);

    const effectiveRoleId = (userOverrideDoc as any)?.customRoleId || roleId;

    if (this.shouldDebugLog()) {
      this.logger.debug(
        `[PERMISSION_DEBUG] buildAndCachePermissions sources tenantId=${tenantId} userId=${userId} roleId=${roleId} effectiveRoleId=${effectiveRoleId} modules=${modules?.length || 0} rbacDocs=${rbacDocs?.length || 0} hasUserOverride=${Boolean(userOverrideDoc)}`,
      );
    }

    const tid = this.toObjectId(tenantId);
    const [customRoleDoc, hrmModulePerms] = await Promise.all([
      this.customRoleModel.findOne({ tenantId: tid, roleId: effectiveRoleId }).lean(),
      this.roleModulePermissionModel
        .find({
          roleId: effectiveRoleId,
          $or: [
            ...(tid ? [{ tenantId: tid }] : []),
            { tenantId: { $exists: false } },
            { tenantId: null },
          ],
        })
        .lean(),
    ]);

    if (this.shouldDebugLog()) {
      this.logger.debug(
        `[PERMISSION_DEBUG] buildAndCachePermissions roleSources tenantId=${tenantId} userId=${userId} effectiveRoleId=${effectiveRoleId} hasCustomRole=${Boolean(customRoleDoc)} hrmModulePerms=${hrmModulePerms?.length || 0}`,
      );
    }

    const permissions: PermissionObject = {};
    const dataScope: DataScopeObject = {};

    for (const moduleId of modules) {
      this.ensureModuleShape(permissions, moduleId);
      dataScope[moduleId] = 'ALL';
    }

    for (const doc of rbacDocs || []) {
      const moduleId = String((doc as any).moduleId || '').trim();
      if (!moduleId) continue;
      const permsObj = this.normalizeRbacPermissions((doc as any).permissions);
      for (const [actionId, val] of Object.entries(permsObj)) {
        this.setPermission(permissions, moduleId, actionId, val === true);
      }
    }

    if (customRoleDoc) {
      const rawPermissions = (customRoleDoc as any).permissions;
      this.logger.log(`[CUSTOM_ROLE_DEBUG] roleId=${effectiveRoleId} rawPermissions type=${typeof rawPermissions} isMap=${rawPermissions instanceof Map} keys=${rawPermissions ? Object.keys(rawPermissions) : 'null'}`);
      
      const nested = this.normalizeNestedPermissions(rawPermissions);
      this.logger.log(`[CUSTOM_ROLE_DEBUG] normalized permissions keys=${Object.keys(nested)} project=${JSON.stringify(nested.projects)}`);
      
      for (const [moduleId, actions] of Object.entries(nested)) {
        for (const [actionId, val] of Object.entries(actions)) {
          this.setPermission(permissions, moduleId, actionId, val === true);
        }
      }
    }

    for (const perm of hrmModulePerms || []) {
      const moduleId = String((perm as any).module || '').trim();
      if (!moduleId) continue;
      const actions = (perm as any).actions || {};
      for (const [actionId, val] of Object.entries(actions)) {
        this.setPermission(permissions, moduleId, actionId, val === true);
      }
      const ds = (perm as any).dataScope;
      if (typeof ds === 'string' && ds) {
        dataScope[moduleId] = ds;
      }
    }

    if (userOverrideDoc && (userOverrideDoc as any).overrides) {
      const raw: any = (userOverrideDoc as any).overrides;
      const entries: Array<[any, any]> = typeof raw.entries === 'function'
        ? (Array.from((raw as any).entries()) as Array<[any, any]>)
        : (Object.entries(raw) as Array<[any, any]>);

      for (const [moduleIdRaw, moduleOverridesRaw] of entries) {
        const moduleId = String(moduleIdRaw);
        const actionEntries =
          moduleOverridesRaw && typeof (moduleOverridesRaw as any).entries === 'function'
            ? (Array.from((moduleOverridesRaw as any).entries()) as Array<[any, any]>)
            : (Object.entries(moduleOverridesRaw || {}) as Array<[any, any]>);

        for (const [actionIdRaw, value] of actionEntries) {
          if (value === null || value === undefined) continue;
          this.setPermission(permissions, moduleId, String(actionIdRaw), value === true);
        }
      }
    }

    // Keep HRM navigation module IDs in sync with canonical HRM modules.
    // Do this at the very end so no other RBAC/customRole/userOverride source can re-introduce mismatches.
    const hrmSidebarMap: Record<string, string> = {
      'hrm-employees': 'employees',
      'hrm-leaves': 'leaves',
      'hrm-attendance': 'attendance',
      'hrm-payroll': 'payroll',
      'hrm-increments': 'increments',
      'hrm-departments': 'departments',
    };

    for (const [sidebarModuleId, canonicalModuleId] of Object.entries(hrmSidebarMap)) {
      this.ensureModuleShape(permissions, sidebarModuleId);
      this.ensureModuleShape(permissions, canonicalModuleId);

      for (const actionId of this.getAllowedActions(sidebarModuleId)) {
        const v = permissions?.[canonicalModuleId]?.[actionId] === true;
        this.setPermission(permissions, sidebarModuleId, actionId, v);
      }

      if (dataScope[canonicalModuleId]) {
        dataScope[sidebarModuleId] = dataScope[canonicalModuleId];
      }
    }

    // HRM parent is visible if any HRM child is visible
    const hrmChildren = Object.keys(hrmSidebarMap);
    const anyHrmVisible = hrmChildren.some(m => permissions?.[m]?.view === true);
    this.setPermission(permissions, 'hrm', 'view', anyHrmVisible);

    // Keep Projects module IDs in sync (some pages use 'project' while RBAC preset uses 'projects')
    // Bidirectional sync: whichever exists, copy to the other
    this.ensureModuleShape(permissions, 'projects');
    this.ensureModuleShape(permissions, 'project');

    for (const actionId of this.getAllowedActions('projects')) {
      // projects -> project
      const v1 = permissions?.projects?.[actionId] === true;
      if (v1) this.setPermission(permissions, 'project', actionId, true);
      // project -> projects  
      const v2 = permissions?.project?.[actionId] === true;
      if (v2) this.setPermission(permissions, 'projects', actionId, true);
    }

    if (dataScope.projects) dataScope.project = dataScope.projects;
    if (dataScope.project) dataScope.projects = dataScope.project;

    try {
      const permKey = this.permissionKey(tenantId, userId);
      const scopeKey = this.dataScopeKey(tenantId, userId);

      await Promise.all([
        this.redisService.set(permKey, JSON.stringify(permissions), this.ttlSeconds),
        this.redisService.set(scopeKey, JSON.stringify(dataScope), this.ttlSeconds),
      ]);

      if (this.shouldDebugLog()) {
        const summary = this.summarizePermissions(permissions);
        this.logger.debug(
          `[PERMISSION_DEBUG] redis SET_OK tenantId=${tenantId} userId=${userId} permKey=${permKey} scopeKey=${scopeKey} ttl=${this.ttlSeconds}s summary=${JSON.stringify(summary)} scopeModules=${Object.keys(dataScope || {}).length} durationMs=${Date.now() - startedAt}`,
        );
      }
    } catch {
      if (this.shouldDebugLog()) {
        const summary = this.summarizePermissions(permissions);
        this.logger.warn(
          `[PERMISSION_DEBUG] redis SET_FAIL tenantId=${tenantId} userId=${userId} ttl=${this.ttlSeconds}s summary=${JSON.stringify(summary)} durationMs=${Date.now() - startedAt}`,
        );
      }
    }

    if (this.shouldDebugLog()) {
      const summary = this.summarizePermissions(permissions);
      this.logger.debug(
        `[PERMISSION_DEBUG] buildAndCachePermissions done tenantId=${tenantId} userId=${userId} summary=${JSON.stringify(summary)} durationMs=${Date.now() - startedAt}`,
      );
    }

    return { permissions, dataScope };
  }

  async invalidateTenantPermissions(tenantId: string): Promise<void> {
    const permissionKeys = await this.redisService.keys(`permission:${tenantId}:*`);
    const scopeKeys = await this.redisService.keys(`datascope:${tenantId}:*`);
    const all = [...permissionKeys, ...scopeKeys];
    await Promise.all(all.map(k => this.redisService.del(k)));
    await this.redisService.publish('permission_update', tenantId);
  }

  async invalidateUserPermissions(tenantId: string, userId: string): Promise<void> {
    await Promise.all([
      this.redisService.del(this.permissionKey(tenantId, userId)),
      this.redisService.del(this.dataScopeKey(tenantId, userId)),
    ]);
    await this.redisService.publish('permission_update', tenantId);
  }
}

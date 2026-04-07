import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { SettingsService } from '../services/settings.service';
import { FeatureFlagService } from '../services/feature-flag.service';
import { RBACService } from '../services/rbac.service';
import { CustomRoleService } from '../services/custom-role.service';
import { UserOverrideService } from '../services/user-override.service';
import { PermissionService } from '../services/permission.service';
import { PermissionEngineService } from '../../../common/services/permission-engine.service';
import { ViewAsService } from '../services/view-as.service';
import { WorkflowEngineService } from '../services/workflow-engine.service';
import { AuditService } from '../services/audit.service';
import { ProjectTypeService } from '../services/project-type.service';
import { InstallationTaskService } from '../services/installation-task.service';
import { CommissioningTaskService } from '../services/commissioning-task.service';
import { UpdateInstallationTasksConfigDto } from '../dto/installation-task.dto';
import { UpdateCommissioningTasksConfigDto } from '../dto/commissioning-task.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { AdminGuard } from '../../../core/auth/guards/admin.guard';
import { 
  ToggleModuleDto, 
  UpdateFeatureFlagDto 
} from '../dto/feature-flag.dto';
import { 
  UpdateRbacDto,
  ToggleRbacPermissionDto 
} from '../dto/rbac.dto';
import {
  CreateCustomRoleDto,
  UpdateCustomRoleDto,
  UpdateCustomRolePermissionsDto,
  CloneRoleDto,
} from '../dto/custom-role.dto';
import {
  AssignCustomRoleDto,
  SetPermissionOverrideDto,
} from '../dto/user-override.dto';
import {
  StartViewAsDto,
  CheckPermissionDto,
} from '../dto/view-as.dto';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ToggleWorkflowDto,
  TriggerWorkflowDto,
} from '../dto/workflow.dto';
import {
  CreateProjectTypeDto,
  UpdateProjectTypeDto,
  ValidateDesignDto,
  CalculatePriceDto,
  FinancialProjectionsDto,
} from '../dto/project-type.dto';
import { InstallationType, ProjectType } from '../../estimates/schemas/estimate.schema';

@Controller('settings')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly rbacService: RBACService,
    private readonly customRoleService: CustomRoleService,
    private readonly userOverrideService: UserOverrideService,
    private readonly permissionService: PermissionService,
    private readonly permissionEngine: PermissionEngineService,
    private readonly viewAsService: ViewAsService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly auditService: AuditService,
    private readonly projectTypeService: ProjectTypeService,
    private readonly installationTaskService: InstallationTaskService,
    private readonly commissioningTaskService: CommissioningTaskService,
  ) {}

  @Get('type-options')
  async getTypeOptions(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const configs = await this.settingsService.getProjectTypeConfigs(tenantId);
    const labelByTypeId: Record<string, string> = {};
    configs.forEach((c: any) => {
      const label = c?.config?.shortLabel || c?.config?.label;
      if (c?.typeId && label) labelByTypeId[c.typeId] = String(label);
    });

    const projectTypes = Object.values(ProjectType).map((value) => ({
      value,
      label: labelByTypeId[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
    }));

    const installationTypes = Object.values(InstallationType).map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
    }));

    return { projectTypes, installationTypes };
  }

  // ── Full Settings ─────────────────────────────────────────────────────────
  @Get()
  async getFullSettings(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      
      const flags = await this.featureFlagService.getAllFlags(tenantId);
      const rbac = await this.rbacService.getFullRBAC(tenantId);
      
      // Get custom roles from new service
      const customRolesData = await this.customRoleService.getCustomRoles(tenantId);
      
      // Transform custom roles to frontend format
      const customRoles: Record<string, any> = {};
      customRolesData.forEach((r: any) => {
        const rawPerms = (r as any).permissions;
        const permsObj: Record<string, any> = {};
        if (rawPerms && typeof rawPerms === 'object') {
          if (typeof rawPerms.entries === 'function') {
            for (const [moduleId, modulePerms] of rawPerms.entries()) {
              if (modulePerms && typeof (modulePerms as any).entries === 'function') {
                permsObj[moduleId] = Object.fromEntries((modulePerms as any).entries());
              } else if (modulePerms && typeof modulePerms === 'object') {
                permsObj[moduleId] = modulePerms;
              } else {
                permsObj[moduleId] = {};
              }
            }
          } else {
            for (const [moduleId, modulePerms] of Object.entries(rawPerms)) {
              if (modulePerms && typeof (modulePerms as any).entries === 'function') {
                permsObj[moduleId] = Object.fromEntries((modulePerms as any).entries());
              } else if (modulePerms && typeof modulePerms === 'object') {
                permsObj[moduleId] = modulePerms;
              } else {
                permsObj[moduleId] = {};
              }
            }
          }
        }
        customRoles[r.roleId] = {
          id: r.roleId,
          roleId: r.roleId,
          label: r.label,
          description: r.description,
          baseRole: r.baseRole,
          color: r.color,
          bg: r.bg,
          isCustom: r.isCustom,
          dataScope: (r as any).dataScope || 'ASSIGNED',
          permissions: permsObj,
          createdAt: (r as any).createdAt,
          updatedAt: (r as any).updatedAt,
        };
      });

      // Get legacy data from SettingsService for remaining items
      const legacy = await this.settingsService.getFullSettings(tenantId);
      // Also fetch installation task config if available
      const installCfg = await this.installationTaskService.getConfig(tenantId);
      // Also fetch commissioning task config if available
      const commissioningCfg = await this.commissioningTaskService.getConfig(tenantId);
      // Also fetch milestones config
      const milestones = await this.settingsService.getMilestones(tenantId);

      return {
        flags,
        rbac,
        workflows: legacy.workflows,
        auditLogs: legacy.auditLogs,
        customRoles, // Now from customRoleService
        projectTypeConfigs: legacy.projectTypeConfigs,
        installationTasks: installCfg.tasks,
        commissioningTasks: commissioningCfg.tasks,
        milestones,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Unknown error',
        stack: error?.stack,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // FEATURE FLAGS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get all feature flags for tenant
   * GET /settings/flags
   */
  @Get('flags')
  @UseGuards(AdminGuard)
  async getFeatureFlags(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const flags = await this.featureFlagService.getAllFlags(tenantId);
    return { data: flags };
  }

  /**
   * Get specific module feature flag
   * GET /settings/flags/:moduleId
   */
  @Get('flags/:moduleId')
  @UseGuards(AdminGuard)
  async getFeatureFlag(
    @Param('moduleId') moduleId: string,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const flag = await this.featureFlagService.getFeatureFlag(tenantId, moduleId);
    
    if (!flag) {
      return {
        moduleId,
        enabled: true, // Default
        features: {},
        actions: {},
      };
    }

    return {
      moduleId: flag.moduleId,
      enabled: flag.enabled,
      features: Object.fromEntries(flag.features || new Map()),
      actions: Object.fromEntries(flag.actions || new Map()),
    };
  }

  /**
   * Check if module is enabled (permission check endpoint)
   * GET /settings/flags/:moduleId/check
   */
  @Get('flags/:moduleId/check')
  @UseGuards(AdminGuard)
  async checkModuleEnabled(
    @Param('moduleId') moduleId: string,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const enabled = await this.featureFlagService.isModuleEnabled(tenantId, moduleId);
    return { moduleId, enabled };
  }

  /**
   * Check if action is enabled (permission check endpoint)
   * GET /settings/flags/:moduleId/actions/:actionId/check
   */
  @Get('flags/:moduleId/actions/:actionId/check')
  @UseGuards(AdminGuard)
  async checkActionEnabled(
    @Param('moduleId') moduleId: string,
    @Param('actionId') actionId: string,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const enabled = await this.featureFlagService.isActionEnabled(tenantId, moduleId, actionId);
    return { moduleId, actionId, enabled };
  }

  /**
   * Update feature flag (module, features, or actions)
   * PUT /settings/flags/:moduleId
   */
  @Put('flags/:moduleId')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateFeatureFlag(
    @Param('moduleId') moduleId: string,
    @Body() update: UpdateFeatureFlagDto,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    // Convert DTO to partial FeatureFlag with proper Map types
    const updateData: any = {};
    if (update.enabled !== undefined) updateData.enabled = update.enabled;
    if (update.features) updateData.features = new Map(Object.entries(update.features));
    if (update.actions) updateData.actions = new Map(Object.entries(update.actions));
    
    const doc = await this.featureFlagService.updateFeatureFlag(tenantId, moduleId, updateData);
    
    return {
      moduleId: doc.moduleId,
      enabled: doc.enabled,
      features: Object.fromEntries(doc.features || new Map()),
      actions: Object.fromEntries(doc.actions || new Map()),
    };
  }

  /**
   * Toggle module enabled/disabled
   * POST /settings/flags/:moduleId/toggle
   */
  @Post('flags/:moduleId/toggle')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async toggleModule(
    @Param('moduleId') moduleId: string,
    @Body() body: ToggleModuleDto,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const doc = await this.featureFlagService.toggle(
      tenantId, 
      moduleId, 
      'module', 
      null, 
      body.enabled,
      req.user?.id,
    );
    
    return { 
      moduleId: doc.moduleId, 
      enabled: doc.enabled,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Toggle specific feature
   * POST /settings/flags/:moduleId/features/:featureId
   */
  @Post('flags/:moduleId/features/:featureId')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async toggleFeature(
    @Param('moduleId') moduleId: string,
    @Param('featureId') featureId: string,
    @Body() body: { enabled: boolean },
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const doc = await this.featureFlagService.toggle(
      tenantId, 
      moduleId, 
      'feature', 
      featureId, 
      body.enabled,
      req.user?.id,
    );
    
    return { 
      moduleId, 
      featureId, 
      enabled: doc.features.get(featureId),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Toggle specific action
   * POST /settings/flags/:moduleId/actions/:actionId
   */
  @Post('flags/:moduleId/actions/:actionId')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async toggleAction(
    @Param('moduleId') moduleId: string,
    @Param('actionId') actionId: string,
    @Body() body: { enabled: boolean },
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const doc = await this.featureFlagService.toggle(
      tenantId, 
      moduleId, 
      'action', 
      actionId, 
      body.enabled,
      req.user?.id,
    );
    
    return { 
      moduleId, 
      actionId, 
      enabled: doc.actions.get(actionId),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset feature flag to defaults
   * POST /settings/flags/:moduleId/reset
   */
  @Post('flags/:moduleId/reset')
  @UseGuards(AdminGuard)
  async resetFeatureFlag(
    @Param('moduleId') moduleId: string,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    await this.featureFlagService.resetToDefaults(tenantId, moduleId);
    
    return { 
      moduleId, 
      reset: true,
      message: 'Feature flag reset to defaults',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset all feature flags (admin only)
   * POST /settings/flags/reset-all
   */
  @Post('flags/reset-all')
  @UseGuards(AdminGuard)
  async resetAllFeatureFlags(@Request() req: any) {
    const tenantId = req.tenant?.id;
    await this.featureFlagService.resetToDefaults(tenantId);
    
    return { 
      reset: true,
      message: 'All feature flags reset to defaults',
      timestamp: new Date().toISOString(),
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RBAC (BASE ROLES)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get full RBAC matrix
   * GET /settings/rbac
   */
  @Get('rbac')
  @UseGuards(AdminGuard)
  async getRBACConfigs(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const rbac = await this.rbacService.getFullRBAC(tenantId);
    return { data: rbac };
  }

  /**
   * Get permissions for a specific role
   * GET /settings/rbac/:roleId
   */
  @Get('rbac/:roleId')
  @UseGuards(AdminGuard)
  async getRolePermissions(
    @Param('roleId') roleId: string,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const permissions = await this.rbacService.getRolePermissions(tenantId, roleId);
    return { roleId, permissions };
  }

  /**
   * Get specific permission value
   * GET /settings/rbac/:roleId/:moduleId/:actionId
   */
  @Get('rbac/:roleId/:moduleId/:actionId')
  @UseGuards(AdminGuard)
  async getPermission(
    @Param('roleId') roleId: string,
    @Param('moduleId') moduleId: string,
    @Param('actionId') actionId: string,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const permitted = await this.rbacService.getPermission(tenantId, roleId, moduleId, actionId);
    return { roleId, moduleId, actionId, permitted };
  }

  /**
   * Get RBAC config for role+module
   * GET /settings/rbac/:roleId/:moduleId
   */
  @Get('rbac/:roleId/:moduleId')
  @UseGuards(AdminGuard)
  async getRBACConfig(
    @Param('roleId') roleId: string,
    @Param('moduleId') moduleId: string,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const config = await this.rbacService.getRBACConfig(tenantId, roleId, moduleId);
    
    if (!config) {
      return { 
        roleId, 
        moduleId, 
        permissions: {} 
      };
    }

    return {
      roleId: config.roleId,
      moduleId: config.moduleId,
      permissions: Object.fromEntries(config.permissions || new Map()),
    };
  }

  /**
   * Update permissions for role+module (bulk)
   * PUT /settings/rbac/:roleId/:moduleId
   */
  @Put('rbac/:roleId/:moduleId')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateRBAC(
    @Param('roleId') roleId: string,
    @Param('moduleId') moduleId: string,
    @Body() body: UpdateRbacDto,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    await this.rbacService.updatePermissions(tenantId, roleId, moduleId, body.permissions);

    await this.permissionEngine.invalidateTenantPermissions(String(tenantId));
    
    return { 
      roleId, 
      moduleId, 
      permissions: body.permissions,
      updated: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update specific permission
   * PATCH /settings/rbac/:roleId/:moduleId/:actionId
   */
  @Put('rbac/:roleId/:moduleId/:actionId')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updatePermission(
    @Param('roleId') roleId: string,
    @Param('moduleId') moduleId: string,
    @Param('actionId') actionId: string,
    @Body() body: ToggleRbacPermissionDto,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    await this.rbacService.updatePermission(
      tenantId, 
      roleId, 
      moduleId, 
      actionId, 
      body.enabled,
      req.user?.id,
    );

    await this.permissionEngine.invalidateTenantPermissions(String(tenantId));
    
    return { 
      roleId, 
      moduleId, 
      actionId, 
      enabled: body.enabled,
      updated: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Apply preset to role
   * POST /settings/rbac/:roleId/preset
   */
  @Post('rbac/:roleId/preset')
  @UseGuards(AdminGuard)
  async applyPreset(
    @Param('roleId') roleId: string,
    @Body() body: { preset: 'full' | 'view_only' | 'none' },
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    await this.rbacService.applyPreset(tenantId, roleId, body.preset);
    
    return { 
      roleId, 
      preset: body.preset,
      applied: true,
      message: `Preset '${body.preset}' applied to role '${roleId}'`,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Workflow Rules ────────────────────────────────────────────────────────
  @Get('workflows')
  @UseGuards(AdminGuard)
  async getWorkflowRules(@Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.settingsService.getWorkflowRules(tenantId);
  }

  @Post('workflows')
  @UseGuards(AdminGuard)
  async createWorkflowRule(@Body() body: any, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.settingsService.createWorkflowRule(body, tenantId);
  }

  @Put('workflows/:wfId')
  @UseGuards(AdminGuard)
  async updateWorkflowRule(@Param('wfId') wfId: string, @Body() body: any, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.settingsService.updateWorkflowRule(wfId, body, tenantId);
  }

  @Delete('workflows/:wfId')
  @UseGuards(AdminGuard)
  async deleteWorkflowRule(@Param('wfId') wfId: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.settingsService.deleteWorkflowRule(wfId, tenantId);
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────
  @Get('audit')
  @UseGuards(AdminGuard)
  async getAuditLogs(@Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.settingsService.getAuditLogs(tenantId);
  }

  @Post('audit')
  @UseGuards(AdminGuard)
  async createAuditLog(@Body() body: any, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.settingsService.createAuditLog(body, tenantId);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PERMISSION CHECKING (Phase 2)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Check if current user has permission
   * POST /settings/check-permission
   */
  @Post('check-permission')
  @UsePipes(new ValidationPipe({ transform: true }))
  async checkPermission(
    @Body() body: CheckPermissionDto,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const baseRoleId = req.user?.role;

    if (!userId || !baseRoleId) {
      return { permitted: false, reason: 'User not authenticated' };
    }

    const result = await this.permissionService.resolvePermission(
      tenantId,
      userId,
      baseRoleId,
      body.moduleId,
      body.actionId,
    );

    return result;
  }

  /**
   * Get current user's full permission matrix
   * GET /settings/my-permissions
   */
  @Get('my-permissions')
  async getMyPermissions(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const baseRoleId = req.user?.role;

    if (!userId || !baseRoleId) {
      return { error: 'User not authenticated' };
    }

    const matrix = await this.permissionService.resolveAllPermissions(
      tenantId,
      userId,
      baseRoleId,
    );

    return { userId, permissions: matrix };
  }

  /**
   * Debug permission resolution
   * GET /settings/debug-permission/:moduleId/:actionId
   */
  @Get('debug-permission/:moduleId/:actionId')
  @UseGuards(AdminGuard)
  async debugPermission(
    @Param('moduleId') moduleId: string,
    @Param('actionId') actionId: string,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const baseRoleId = req.user?.role;

    if (!userId || !baseRoleId) {
      return { error: 'User not authenticated' };
    }

    const debug = await this.permissionService.getPermissionDebug(
      tenantId,
      userId,
      baseRoleId,
      moduleId,
      actionId,
    );

    return debug;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CUSTOM ROLES (Phase 2 - Enhanced)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get all custom roles
   * GET /settings/custom-roles
   */
  @Get('custom-roles')
  @UseGuards(AdminGuard)
  async getCustomRoles(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const roles = await this.customRoleService.getCustomRoles(tenantId);
    
    // Transform to { [roleId]: role }
    const result: Record<string, any> = {};
    roles.forEach((r: any) => {
      const rawPerms = (r as any).permissions;
      const permsObj: Record<string, any> = {};
      if (rawPerms && typeof rawPerms === 'object') {
        if (typeof rawPerms.entries === 'function') {
          for (const [moduleId, modulePerms] of rawPerms.entries()) {
            if (modulePerms && typeof (modulePerms as any).entries === 'function') {
              permsObj[moduleId] = Object.fromEntries((modulePerms as any).entries());
            } else if (modulePerms && typeof modulePerms === 'object') {
              permsObj[moduleId] = modulePerms;
            } else {
              permsObj[moduleId] = {};
            }
          }
        } else {
          for (const [moduleId, modulePerms] of Object.entries(rawPerms)) {
            if (modulePerms && typeof (modulePerms as any).entries === 'function') {
              permsObj[moduleId] = Object.fromEntries((modulePerms as any).entries());
            } else if (modulePerms && typeof modulePerms === 'object') {
              permsObj[moduleId] = modulePerms;
            } else {
              permsObj[moduleId] = {};
            }
          }
        }
      }
      result[r.roleId] = {
        id: r.roleId,
        label: r.label,
        description: r.description,
        baseRole: r.baseRole,
        color: r.color,
        bg: r.bg,
        isCustom: r.isCustom,
        dataScope: (r as any).dataScope || 'ASSIGNED',
        permissions: permsObj,
        createdAt: (r as any).createdAt,
        updatedAt: (r as any).updatedAt,
      };
    });
    return result;
  }

  /**
   * Get specific custom role
   * GET /settings/custom-roles/:roleId
   */
  @Get('custom-roles/:roleId')
  @UseGuards(AdminGuard)
  async getCustomRole(@Param('roleId') roleId: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const role = await this.customRoleService.getCustomRole(tenantId, roleId);
    
    if (!role) {
      return { error: 'Role not found' };
    }

    return {
      id: role.roleId,
      label: role.label,
      description: role.description,
      baseRole: role.baseRole,
      color: role.color,
      bg: role.bg,
      isCustom: role.isCustom,
      dataScope: (role as any).dataScope || 'ASSIGNED',
      permissions: Object.fromEntries(
        Array.from((role as any).permissions?.entries() || []).map((entry: any) => [entry[0], Object.fromEntries(entry[1] || new Map())])
      ),
      createdAt: (role as any).createdAt,
      updatedAt: (role as any).updatedAt,
    };
  }

  /**
   * Create custom role
   * POST /settings/custom-roles
   */
  @Post('custom-roles')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createCustomRole(@Body() body: CreateCustomRoleDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const role = await this.customRoleService.createCustomRole(tenantId, {
      ...body,
      baseRole: body.baseRole ?? undefined,
    }, req.user?.id);
    
    return {
      id: role.roleId,
      label: role.label,
      description: role.description,
      baseRole: role.baseRole,
      color: role.color,
      bg: role.bg,
      isCustom: role.isCustom,
      dataScope: (role as any).dataScope || 'ASSIGNED',
      created: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update custom role
   * PATCH /settings/custom-roles/:roleId
   */
  @Put('custom-roles/:roleId')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateCustomRole(
    @Param('roleId') roleId: string, 
    @Body() body: UpdateCustomRoleDto, 
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const role = await this.customRoleService.updateCustomRole(tenantId, roleId, body, req.user?.id);
    
    if (!role) {
      return { error: 'Role not found' };
    }

    return {
      id: role.roleId,
      updated: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Delete custom role
   * DELETE /settings/custom-roles/:roleId
   */
  @Delete('custom-roles/:roleId')
  @UseGuards(AdminGuard)
  async deleteCustomRole(@Param('roleId') roleId: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const role = await this.customRoleService.deleteCustomRole(tenantId, roleId, req.user?.id);
    
    if (!role) {
      return { error: 'Role not found' };
    }

    return {
      id: roleId,
      deleted: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update custom role permissions
   * PUT /settings/custom-roles/:roleId/permissions
   */
  @Put('custom-roles/:roleId/permissions')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateCustomRolePermissions(
    @Param('roleId') roleId: string,
    @Body() body: UpdateCustomRolePermissionsDto,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const role = await this.customRoleService.updatePermissions(
      tenantId, 
      roleId, 
      body.moduleId, 
      body.permissions,
      req.user?.id,
    );

    await this.permissionEngine.invalidateTenantPermissions(String(tenantId));

    return {
      id: roleId,
      moduleId: body.moduleId,
      updated: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clone custom role
   * POST /settings/custom-roles/:roleId/clone
   */
  @Post('custom-roles/:roleId/clone')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async cloneRole(
    @Param('roleId') roleId: string,
    @Body() body: CloneRoleDto,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const cloned = await this.customRoleService.cloneRole(tenantId, roleId, body.label, req.user?.id);

    return {
      sourceId: roleId,
      newId: cloned.roleId,
      label: cloned.label,
      cloned: true,
      timestamp: new Date().toISOString(),
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // USER PERMISSION OVERRIDES (Phase 2)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get all user overrides for tenant
   * GET /settings/user-overrides
   */
  @Get('user-overrides')
  @UseGuards(AdminGuard)
  async getUserOverrides(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const overrides = await this.userOverrideService.getAllUserOverrides(tenantId);
    
    return {
      data: overrides.map((o: any) => ({
        userId: o.userId.toString(),
        customRoleId: o.customRoleId,
        overrides: Object.fromEntries(
          Array.from((o as any).overrides?.entries() || []).map((entry: any) => [
            entry[0], 
            Object.fromEntries(entry[1] || new Map())
          ])
        ),
        updatedAt: (o as any).updatedAt,
      })),
    };
  }

  /**
   * Get specific user override
   * GET /settings/user-overrides/:userId
   */
  @Get('user-overrides/:userId')
  @UseGuards(AdminGuard)
  async getUserOverride(@Param('userId') userId: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const override = await this.userOverrideService.getUserOverride(tenantId, userId);
    const count = await this.userOverrideService.getOverrideCount(tenantId, userId);
    
    if (!override) {
      return {
        userId,
        customRoleId: null,
        overrides: {},
        overrideCount: 0,
      };
    }

    return {
      userId: override.userId.toString(),
      customRoleId: override.customRoleId,
      overrides: Object.fromEntries(
        Array.from((override as any).overrides?.entries() || []).map((entry: any) => [
          entry[0], 
          Object.fromEntries(entry[1] || new Map())
        ])
      ),
      overrideCount: count,
      updatedAt: (override as any).updatedAt,
    };
  }

  /**
   * Assign custom role to user
   * PUT /settings/user-overrides/:userId/role
   */
  @Put('user-overrides/:userId/role')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async assignCustomRole(
    @Param('userId') userId: string,
    @Body() body: AssignCustomRoleDto,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    await this.userOverrideService.assignCustomRole(
      tenantId, 
      userId, 
      body.customRoleId,
      req.user?.id,
    );

    await this.permissionEngine.invalidateTenantPermissions(String(tenantId));

    return {
      userId,
      customRoleId: body.customRoleId,
      assigned: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Set permission override for user
   * PUT /settings/user-overrides/:userId/permissions
   */
  @Put('user-overrides/:userId/permissions')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async setPermissionOverride(
    @Param('userId') userId: string,
    @Body() body: SetPermissionOverrideDto,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    await this.userOverrideService.setPermissionOverride(
      tenantId,
      userId,
      body.moduleId,
      body.actionId,
      body.value,
      req.user?.id,
    );

    await this.permissionEngine.invalidateTenantPermissions(String(tenantId));

    return {
      userId,
      moduleId: body.moduleId,
      actionId: body.actionId,
      value: body.value,
      set: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear all overrides for user
   * DELETE /settings/user-overrides/:userId
   */
  @Delete('user-overrides/:userId')
  @UseGuards(AdminGuard)
  async clearUserOverrides(@Param('userId') userId: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    await this.userOverrideService.clearUserOverrides(tenantId, userId, req.user?.id);

    await this.permissionEngine.invalidateTenantPermissions(String(tenantId));

    return {
      userId,
      cleared: true,
      timestamp: new Date().toISOString(),
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW AS (IMPERSONATION) (Phase 2)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Start view-as session
   * POST /settings/view-as
   */
  @Post('view-as')
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async startViewAs(@Body() body: StartViewAsDto, @Request() req: any) {
    const adminUserId = req.user?.id;
    
    if (!adminUserId) {
      return { error: 'User not authenticated' };
    }

    const session = await this.viewAsService.startSession(
      adminUserId,
      body.targetUserId,
      body.targetRole,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return {
      started: true,
      targetUserId: session.targetUserId,
      targetRole: session.targetRole,
      expiresAt: session.expiresAt,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current view-as status
   * GET /settings/view-as
   */
  @Get('view-as')
  @UseGuards(AdminGuard)
  async getViewAsStatus(@Request() req: any) {
    const adminUserId = req.user?.id;
    
    if (!adminUserId) {
      return { error: 'User not authenticated' };
    }

    const session = this.viewAsService.getSession(adminUserId);

    if (!session) {
      return { active: false };
    }

    const remainingMs = session.expiresAt.getTime() - Date.now();

    return {
      active: true,
      targetUserId: session.targetUserId,
      targetRole: session.targetRole,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      remainingMinutes: Math.ceil(remainingMs / 60000),
    };
  }

  /**
   * End view-as session
   * DELETE /settings/view-as
   */
  @Delete('view-as')
  @UseGuards(AdminGuard)
  async endViewAs(@Request() req: any) {
    const adminUserId = req.user?.id;
    
    if (!adminUserId) {
      return { error: 'User not authenticated' };
    }

    const ended = this.viewAsService.endSession(adminUserId);

    return {
      ended,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Preview user permissions without starting session
   * GET /settings/view-as/preview/:userId
   */
  @Get('view-as/preview/:userId')
  @UseGuards(AdminGuard)
  async previewUserPermissions(
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const baseRoleId = req.user?.role;

    // Get enriched user data
    const matrix = await this.permissionService.resolveAllPermissions(
      tenantId,
      userId,
      baseRoleId,
    );

    return {
      userId,
      preview: true,
      permissions: matrix,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Installation Task Checklist Builder ─────────────────────────────────
  @Get('installation/tasks')
  @UseGuards(AdminGuard)
  async getInstallationTasks(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const cfg = await this.installationTaskService.getConfig(tenantId);
    return { data: cfg.tasks };
  }

  @Put('installation/tasks')
  @UseGuards(AdminGuard)
  async updateInstallationTasks(
    @Body() body: UpdateInstallationTasksConfigDto,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const doc = await this.installationTaskService.updateConfig(tenantId, body.tasks, userId);
    return { data: doc.tasks };
  }

  // ── Commissioning Task Checklist Builder ────────────────────────────────
  @Get('commissioning/tasks')
  @UseGuards(AdminGuard)
  async getCommissioningTasks(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const cfg = await this.commissioningTaskService.getConfig(tenantId);
    return { data: cfg.tasks };
  }

  @Put('commissioning/tasks')
  @UseGuards(AdminGuard)
  async updateCommissioningTasks(
    @Body() body: UpdateCommissioningTasksConfigDto,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const doc = await this.commissioningTaskService.updateConfig(tenantId, body.tasks, userId);
    return { data: doc.tasks };
  }

  // ── Milestones Config ───────────────────────────────────────────────────
  @Get('milestones')
  @UseGuards(AdminGuard)
  async getMilestones(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const cfg = await this.settingsService.getMilestones(tenantId);
    return { data: cfg };
  }

  @Put('milestones')
  @UseGuards(AdminGuard)
  async updateMilestones(
    @Body() body: { milestones: any[] },
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const doc = await this.settingsService.updateMilestones(tenantId, body.milestones, userId);
    return { data: doc };
  }

  // ── Project Type Configs ────────────────────────────────────────────────
  @Get('project-types')
  @UseGuards(AdminGuard)
  async getProjectTypeConfigs(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const configs = await this.settingsService.getProjectTypeConfigs(tenantId);
    const result: Record<string, any> = {};
    configs.forEach((c: any) => {
      result[c.typeId] = c.config;
    });
    return result;
  }

  @Put('project-types/:typeId')
  @UseGuards(AdminGuard)
  async updateProjectTypeConfig(@Param('typeId') typeId: string, @Body() body: any, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.settingsService.updateProjectTypeConfig(typeId, body, tenantId);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeatureFlag, FeatureFlagDocument } from '../schemas/feature-flag.schema';
import { RBACConfig, RBACConfigDocument } from '../schemas/rbac-config.schema';
import { WorkflowRule, WorkflowRuleDocument } from '../schemas/workflow-rule.schema';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';
import { CustomRole, CustomRoleDocument } from '../schemas/custom-role.schema';
import { ProjectTypeConfig, ProjectTypeConfigDocument } from '../schemas/project-type-config.schema';
import { CommissioningTaskConfig, CommissioningTaskConfigDocument } from '../schemas/commissioning-task.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(FeatureFlag.name) private featureFlagModel: Model<FeatureFlagDocument>,
    @InjectModel(RBACConfig.name) private rbacConfigModel: Model<RBACConfigDocument>,
    @InjectModel(WorkflowRule.name) private workflowRuleModel: Model<WorkflowRuleDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(CustomRole.name) private customRoleModel: Model<CustomRoleDocument>,
    @InjectModel(ProjectTypeConfig.name) private projectTypeConfigModel: Model<ProjectTypeConfigDocument>,
    @InjectModel(CommissioningTaskConfig.name) private commissioningTaskConfigModel: Model<CommissioningTaskConfigDocument>,
  ) {}

  private toObjectId(tenantId: string): Types.ObjectId {
    if (!tenantId) {
      throw new Error('Tenant ID is required for multi-tenant operations');
    }
    // Check if tenantId is a valid 24-character hex string (MongoDB ObjectId format)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(tenantId);
    if (!isValidObjectId) {
      throw new Error(`Invalid tenant ID format: ${tenantId}`);
    }
    try { return new Types.ObjectId(tenantId); } catch { 
      throw new Error(`Failed to convert tenant ID to ObjectId: ${tenantId}`);
    }
  }

  // ── Feature Flags ─────────────────────────────────────────────────────────
  async getFeatureFlags(tenantId: string): Promise<FeatureFlag[]> {
    const tid = this.toObjectId(tenantId);
    return this.featureFlagModel.find({ tenantId: tid }).exec();
  }

  async updateFeatureFlag(moduleId: string, update: Partial<FeatureFlag>, tenantId: string): Promise<FeatureFlag> {
    const tid = this.toObjectId(tenantId);
    const filter = { moduleId, tenantId: tid };
    const doc = await this.featureFlagModel.findOneAndUpdate(filter, { $set: update }, { upsert: true, new: true }).exec();
    return doc;
  }

  async toggleModule(moduleId: string, enabled: boolean, tenantId: string): Promise<FeatureFlag> {
    return this.updateFeatureFlag(moduleId, { enabled }, tenantId);
  }

  async toggleFeature(moduleId: string, featureId: string, enabled: boolean, tenantId: string): Promise<FeatureFlag> {
    const flag = await this.getOrCreateFeatureFlag(moduleId, tenantId);
    flag.features.set(featureId, enabled);
    return flag.save();
  }

  async toggleAction(moduleId: string, actionId: string, enabled: boolean, tenantId: string): Promise<FeatureFlag> {
    const flag = await this.getOrCreateFeatureFlag(moduleId, tenantId);
    flag.actions.set(actionId, enabled);
    return flag.save();
  }

  private async getOrCreateFeatureFlag(moduleId: string, tenantId: string): Promise<FeatureFlagDocument> {
    const tid = this.toObjectId(tenantId);
    const filter = { moduleId, tenantId: tid };
    let flag = await this.featureFlagModel.findOne(filter).exec();
    if (!flag) {
      flag = new this.featureFlagModel({ moduleId, tenantId: tid, enabled: true, features: {}, actions: {} });
      await flag.save();
    }
    return flag;
  }

  // ── RBAC ─────────────────────────────────────────────────────────────────
  async getRBACConfigs(tenantId: string): Promise<RBACConfig[]> {
    const tid = this.toObjectId(tenantId);
    return this.rbacConfigModel.find({ tenantId: tid }).exec();
  }

  async updateRBAC(roleId: string, moduleId: string, permissions: Map<string, boolean>, tenantId: string): Promise<RBACConfig> {
    const tid = this.toObjectId(tenantId);
    const filter = { roleId, moduleId, tenantId: tid };
    const doc = await this.rbacConfigModel.findOneAndUpdate(filter, { $set: { permissions } }, { upsert: true, new: true }).exec();
    return doc;
  }

  async toggleRBAC(roleId: string, moduleId: string, actionId: string, enabled: boolean, tenantId: string): Promise<RBACConfig> {
    const tid = this.toObjectId(tenantId);
    const filter = { roleId, moduleId, tenantId: tid };
    let config = await this.rbacConfigModel.findOne(filter).exec();
    if (!config) {
      config = new this.rbacConfigModel({ roleId, moduleId, tenantId: tid, permissions: new Map() });
    }
    config.permissions.set(actionId, enabled);
    return config.save();
  }

  // ── Workflow Rules ──────────────────────────────────────────────────────
  async getWorkflowRules(tenantId: string): Promise<WorkflowRule[]> {
    const tid = this.toObjectId(tenantId);
    return this.workflowRuleModel.find({ tenantId: tid }).exec();
  }

  async createWorkflowRule(rule: Partial<WorkflowRule>, tenantId: string): Promise<WorkflowRule> {
    const tid = this.toObjectId(tenantId);
    const newRule = new this.workflowRuleModel({ ...rule, tenantId: tid, wfId: `wf${Date.now()}` });
    return newRule.save();
  }

  async updateWorkflowRule(wfId: string, updates: Partial<WorkflowRule>, tenantId: string): Promise<WorkflowRule | null> {
    const tid = this.toObjectId(tenantId);
    const filter = { wfId, tenantId: tid };
    return this.workflowRuleModel.findOneAndUpdate(filter, { $set: updates }, { new: true }).exec();
  }

  async deleteWorkflowRule(wfId: string, tenantId: string): Promise<WorkflowRule | null> {
    const tid = this.toObjectId(tenantId);
    const filter = { wfId, tenantId: tid };
    return this.workflowRuleModel.findOneAndDelete(filter).exec();
  }

  // ── Audit Logs ───────────────────────────────────────────────────────────
  async getAuditLogs(tenantId: string, limit = 500): Promise<AuditLog[]> {
    const tid = this.toObjectId(tenantId);
    return this.auditLogModel.find({ tenantId: tid }).sort({ ts: -1 }).limit(limit).exec();
  }

  async createAuditLog(log: Partial<AuditLog>, tenantId: string): Promise<AuditLog> {
    const tid = this.toObjectId(tenantId);

    const toSafeString = (value: any): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value;
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    };

    const newLog = new this.auditLogModel({
      ...log,
      user: toSafeString((log as any).user),
      action: toSafeString((log as any).action),
      target: toSafeString((log as any).target),
      from: toSafeString((log as any).from),
      to: toSafeString((log as any).to),
      tenantId: tid,
      logId: `a${Date.now()}`,
      ts: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });
    return newLog.save();
  }

  // ── Custom Roles ────────────────────────────────────────────────────────
  async getCustomRoles(tenantId: string): Promise<CustomRole[]> {
    const tid = this.toObjectId(tenantId);
    return this.customRoleModel.find({ tenantId: tid }).exec();
  }

  async createCustomRole(role: Partial<CustomRole>, tenantId: string): Promise<CustomRole> {
    const tid = this.toObjectId(tenantId);
    const newRole = new this.customRoleModel({ ...role, tenantId: tid, roleId: `custom_${Date.now()}` });
    return newRole.save();
  }

  async updateCustomRole(roleId: string, updates: Partial<CustomRole>, tenantId: string): Promise<CustomRole | null> {
    const tid = this.toObjectId(tenantId);
    const filter = { roleId, tenantId: tid };
    return this.customRoleModel.findOneAndUpdate(filter, { $set: updates }, { new: true }).exec();
  }

  async deleteCustomRole(roleId: string, tenantId: string): Promise<CustomRole | null> {
    const tid = this.toObjectId(tenantId);
    const filter = { roleId, tenantId: tid };
    return this.customRoleModel.findOneAndDelete(filter).exec();
  }

  // ── Project Type Config ────────────────────────────────────────────────
  async getProjectTypeConfigs(tenantId: string): Promise<ProjectTypeConfig[]> {
    const tid = this.toObjectId(tenantId);
    return this.projectTypeConfigModel.find({ tenantId: tid }).exec();
  }

  async updateProjectTypeConfig(typeId: string, config: any, tenantId: string): Promise<ProjectTypeConfig> {
    const tid = this.toObjectId(tenantId);
    const filter = { typeId, tenantId: tid };
    const doc = await this.projectTypeConfigModel.findOneAndUpdate(filter, { $set: { config } }, { upsert: true, new: true }).exec();
    return doc;
  }

  // ── Milestones Config ─────────────────────────────────────────────────
  async getMilestones(tenantId: string): Promise<any[]> {
    try {
      const tid = this.toObjectId(tenantId);
      console.log('[DEBUG getMilestones] tenantId:', tenantId, 'tid:', tid);
      // Use ProjectTypeConfig as a generic settings store for milestones
      const config = await this.projectTypeConfigModel.findOne({ tenantId: tid, typeId: '__milestones__' }).exec();
      console.log('[DEBUG getMilestones] config from DB:', config);
      // Cast to any to bypass TypeScript strict type checking
      const milestones = (config?.config as any)?.milestones || [];
      console.log('[DEBUG getMilestones] milestones:', milestones);
      return milestones;
    } catch (err) {
      console.error('[DEBUG getMilestones] Error:', err);
      return [];
    }
  }

  async updateMilestones(tenantId: string, milestones: any[], userId?: string): Promise<any> {
    const tid = this.toObjectId(tenantId);
    console.log('[DEBUG updateMilestones] tenantId:', tenantId, 'tid:', tid);
    console.log('[DEBUG updateMilestones] milestones to save:', milestones);
    const filter = { tenantId: tid, typeId: '__milestones__' };
    const update = { 
      $set: { 
        config: { milestones },
        updatedAt: new Date(),
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: new Date(),
        createdBy: userId,
      }
    };
    console.log('[DEBUG updateMilestones] filter:', filter, 'update:', JSON.stringify(update));
    const doc = await this.projectTypeConfigModel.findOneAndUpdate(filter, update, { upsert: true, new: true }).exec();
    console.log('[DEBUG updateMilestones] saved doc:', doc);
    // Cast to any to bypass TypeScript strict type checking
    return (doc?.config as any)?.milestones || milestones;
  }

  // ── Full Settings ───────────────────────────────────────────────────────
  async getFullSettings(tenantId: string): Promise<any> {
    const [flags, rbac, workflows, auditLogs, customRoles, projectTypeConfigs, commissioningTaskConfig, milestonesConfig] = await Promise.all([
      this.getFeatureFlags(tenantId),
      this.getRBACConfigs(tenantId),
      this.getWorkflowRules(tenantId),
      this.getAuditLogs(tenantId),
      this.getCustomRoles(tenantId),
      this.getProjectTypeConfigs(tenantId),
      this.commissioningTaskConfigModel.findOne({ tenantId: this.toObjectId(tenantId) }).exec(),
      this.getMilestones(tenantId),
    ]);

    return {
      flags,
      rbac,
      workflows,
      auditLogs,
      customRoles,
      projectTypeConfigs,
      commissioningTasks: commissioningTaskConfig?.tasks || [],
      milestones: milestonesConfig,
    };
  }
}

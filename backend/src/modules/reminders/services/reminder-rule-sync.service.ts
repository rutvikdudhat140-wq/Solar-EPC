import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DashboardService } from '../../dashboard/services/dashboard.service';
import { ReminderService } from './reminder.service';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';
import { User, UserDocument } from '../../../core/auth/schemas/user.schema';
import { Task, TaskDocument } from '../../tasks/schemas/task.schema';
import { Survey, SurveyDocument } from '../../survey/schemas/survey.schema';
import { DocumentEntity, DocumentEntityDocument } from '../../document/schemas/document.schema';
import { PurchaseOrder, PurchaseOrderDocument } from '../../procurement/schemas/purchase-order.schema';
import { Dispatch, DispatchDocument } from '../../logistics/schemas/dispatch.schema';
import { Installation } from '../../installation/schemas/installation.schema';
import { Commissioning } from '../../commissioning/schemas/commissioning.schema';
import { ComplianceDocument } from '../../compliance/schemas/compliance-document.schema';
import { InstallationTaskConfig, InstallationTaskConfigDocument } from '../../settings/schemas/installation-task.schema';
import { CommissioningTaskConfig, CommissioningTaskConfigDocument } from '../../settings/schemas/commissioning-task.schema';
import { WorkflowRule, WorkflowRuleDocument } from '../../settings/schemas/workflow-rule.schema';

@Injectable()
export class ReminderRuleSyncService {
  private readonly logger = new Logger(ReminderRuleSyncService.name);

  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Survey.name) private readonly surveyModel: Model<SurveyDocument>,
    @InjectModel(DocumentEntity.name) private readonly documentModel: Model<DocumentEntityDocument>,
    @InjectModel(PurchaseOrder.name) private readonly purchaseOrderModel: Model<PurchaseOrderDocument>,
    @InjectModel(Dispatch.name) private readonly dispatchModel: Model<DispatchDocument>,
    @InjectModel(Installation.name) private readonly installationModel: Model<Installation>,
    @InjectModel(Commissioning.name) private readonly commissioningModel: Model<Commissioning>,
    @InjectModel(ComplianceDocument.name) private readonly complianceDocumentModel: Model<ComplianceDocument>,
    @InjectModel(InstallationTaskConfig.name) private readonly installationTaskConfigModel: Model<InstallationTaskConfigDocument>,
    @InjectModel(CommissioningTaskConfig.name) private readonly commissioningTaskConfigModel: Model<CommissioningTaskConfigDocument>,
    @InjectModel(WorkflowRule.name) private readonly workflowRuleModel: Model<WorkflowRuleDocument>,
    private readonly dashboardService: DashboardService,
    private readonly reminderService: ReminderService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncSyntheticReminders() {
    this.logger.log('[REMINDER_SYNC] Starting synthetic reminder sync...');
    const tenants = await this.tenantModel.find({ isActive: true }).select('_id code').lean();
    this.logger.log(`[REMINDER_SYNC] Found ${tenants.length} active tenants`);
    
    for (const tenant of tenants) {
      const tenantId = String(tenant._id);
      try {
        this.logger.log(`[REMINDER_SYNC] Processing tenant: ${tenant.code || tenantId}`);
        await this.syncTenant(tenantId);
      } catch (error: any) {
        this.logger.error(`[REMINDER_SYNC] Failed for tenant ${tenantId}: ${error?.message || error}`);
      }
    }
    this.logger.log('[REMINDER_SYNC] Sync completed');
  }

  private async syncTenant(tenantId: string) {
    const adminUserId = await this.resolveAdminUserId(tenantId);
    if (!adminUserId) {
      this.logger.warn(`Skipping synthetic reminder sync for tenant ${tenantId}: no active admin/user found`);
      return;
    }

    const syntheticUser = { role: 'Admin', tenantId };
    const activeByModule = new Map<string, string[]>();
    const register = async (
      moduleId: string,
      sourceKey: string,
      title: string,
      description: string,
      priority: 'low' | 'medium' | 'high' | 'critical',
      dueDate: Date,
      metadata: Record<string, any> = {},
    ) => {
      const keys = activeByModule.get(moduleId) || [];
      keys.push(sourceKey);
      activeByModule.set(moduleId, keys);

      this.logger.debug(`[REMINDER_SYNC] Creating reminder: ${moduleId}/${sourceKey} - ${title}`);
      
      await this.reminderService.upsertSyntheticReminder(tenantId, {
        title,
        description,
        module: moduleId,
        dueDate,
        remindAt: dueDate,
        assignedTo: adminUserId,
        createdBy: adminUserId,
        priority,
        type: 'smart',
        notificationChannels: ['in-app'],
        metadata,
        sourceKey,
        sourceKind: 'synthetic',
        triggerType: 'date',
      });
    };

    const overview = await this.dashboardService.getOverview(tenantId, syntheticUser);
    const summary = overview?.summary || {};
    if (Number(summary.lowStockItems || 0) > 0) {
      await register(
        'dashboard',
        'dashboard:low-stock',
        'Low stock items need attention',
        `${summary.lowStockItems} inventory items are below recommended stock levels.`,

        'high',
        new Date(Date.now() + 6 * 60 * 60 * 1000),
        { metric: 'lowStockItems', value: summary.lowStockItems },
      );
    }
    if (Number(summary.pendingInstallations || 0) > 0) {
      await register(
        'dashboard',
        'dashboard:pending-installations',
        'Pending installations require assignment',
        `${summary.pendingInstallations} installations are waiting for assignment or kickoff.`,
        'medium',
        new Date(Date.now() + 8 * 60 * 60 * 1000),
        { metric: 'pendingInstallations', value: summary.pendingInstallations },
      );
    }
    if (Number(summary.pendingPOs || 0) > 0) {
      await register(
        'dashboard',
        'dashboard:pending-pos',
        'Pending purchase orders need tracking',
        `${summary.pendingPOs} purchase orders are still pending or ordered.`,
        'medium',
        new Date(Date.now() + 8 * 60 * 60 * 1000),
        { metric: 'pendingPOs', value: summary.pendingPOs },
      );
    }
    if (Number(summary.outstandingAmount || 0) > 100000) {
      await register(
        'dashboard',
        'dashboard:outstanding-amount',
        'Outstanding receivables need follow-up',
        `Outstanding amount is ${summary.outstandingAmount}. Review collections and invoice follow-up.`,
        'high',
        new Date(Date.now() + 4 * 60 * 60 * 1000),
        { metric: 'outstandingAmount', value: summary.outstandingAmount },
      );
    }

    const insights = await this.dashboardService.getIntelligentInsights(tenantId, syntheticUser);
    for (const [index, insight] of (Array.isArray(insights) ? insights : []).entries()) {
      const severity = String(insight?.severity || '').toLowerCase();
      if (!['high', 'medium'].includes(severity)) continue;
      const priority = severity === 'high' ? 'high' : 'medium';
      await register(
        'intelligence',
        `intelligence:${String(insight.module || 'general').toLowerCase()}:${index}:${String(insight.message || '').toLowerCase()}`,
        `AI insight: ${insight.module || 'Business'}`,
        insight.message || 'AI generated action requires attention.',
        priority,
        new Date(Date.now() + 4 * 60 * 60 * 1000),
        { moduleSource: insight.module, action: insight.action, severity: insight.severity, type: insight.type },
      );
    }

    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const overdueTasks = await this.taskModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
      status: 'pending',
      dueDate: { $lt: now },
    });
    if (overdueTasks > 0) {
      await register('tasks', 'tasks:overdue', 'Overdue tasks require action', `${overdueTasks} tasks are past due date.`, 'high', new Date(Date.now() + 2 * 60 * 60 * 1000), { count: overdueTasks });
    }
    const dueTodayTasks = await this.taskModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
      status: 'pending',
      dueDate: { $gte: now, $lte: endOfDay },
    });
    if (dueTodayTasks > 0) {
      await register('tasks', 'tasks:due-today', 'Tasks due today', `${dueTodayTasks} tasks are due before day end.`, 'medium', endOfDay, { count: dueTodayTasks });
    }

    const overdueSurveys = await this.surveyModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
      status: { $nin: ['Completed', 'Cancelled'] },
      scheduledDate: { $lt: now.toISOString().slice(0, 10) },
    });
    if (overdueSurveys > 0) {
      await register('survey', 'survey:overdue', 'Overdue surveys pending completion', `${overdueSurveys} surveys are scheduled in the past and still open.`, 'high', new Date(Date.now() + 4 * 60 * 60 * 1000), { count: overdueSurveys });
    }

    const designPending = await this.documentModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
      type: { $in: ['proposal', 'quotation'] },
      status: { $in: ['draft', 'pending'] },
    });
    if (designPending > 0) {
      await register('design', 'design:awaiting-approval', 'Design and BOQ items await approval', `${designPending} proposal or quotation records still need design follow-up.`, 'medium', new Date(Date.now() + 12 * 60 * 60 * 1000), { count: designPending });
    }

    const docsPending = await this.documentModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
      status: { $in: ['pending', 'draft', 'sent'] },
    });
    if (docsPending > 0) {
      await register('documentation', 'documentation:pending', 'Pending documents need review', `${docsPending} documents are still pending, draft, or sent.`, 'medium', new Date(Date.now() + 12 * 60 * 60 * 1000), { count: docsPending });
    }
    const docsRejected = await this.documentModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
      status: 'rejected',
    });
    if (docsRejected > 0) {
      await register('documentation', 'documentation:rejected', 'Rejected documents need resubmission', `${docsRejected} documents were rejected and may require rework.`, 'high', new Date(Date.now() + 6 * 60 * 60 * 1000), { count: docsRejected });
    }

    const pendingPOs = await this.purchaseOrderModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
      isDeleted: { $ne: true },
      status: { $in: ['Pending', 'Draft'] },
    });
    if (pendingPOs > 0) {
      await register('procurement', 'procurement:pending', 'Procurement orders pending action', `${pendingPOs} purchase orders are pending or draft.`, 'medium', new Date(Date.now() + 8 * 60 * 60 * 1000), { count: pendingPOs });
    }
    const orderedPOs = await this.purchaseOrderModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
      isDeleted: { $ne: true },
      status: 'Ordered',
    });
    if (orderedPOs > 0) {
      await register('procurement', 'procurement:ordered', 'Ordered procurement needs delivery tracking', `${orderedPOs} ordered purchase orders are awaiting completion.`, 'medium', new Date(Date.now() + 24 * 60 * 60 * 1000), { count: orderedPOs });
    }

    const delayedDispatches = await this.dispatchModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
      status: { $in: ['Scheduled', 'In Transit'] },
    });
    if (delayedDispatches > 0) {
      await register('logistics', 'logistics:active-dispatches', 'Logistics dispatches need monitoring', `${delayedDispatches} dispatches are scheduled or currently in transit.`, 'medium', new Date(Date.now() + 12 * 60 * 60 * 1000), { count: delayedDispatches });
    }

    const pendingInstallations = await this.installationModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
      status: 'Pending Assign',
    });
    if (pendingInstallations > 0) {
      await register('installation', 'installation:pending', 'Installations are awaiting assignment', `${pendingInstallations} installation records are pending assignment or kickoff.`, 'high', new Date(Date.now() + 4 * 60 * 60 * 1000), { count: pendingInstallations });
    }

    const activeCommissioning = await this.commissioningModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
      status: { $in: ['Pending', 'In Progress'] },
    });
    if (activeCommissioning > 0) {
      await register('commissioning', 'commissioning:active', 'Commissioning jobs need follow-up', `${activeCommissioning} commissioning records are pending or in progress.`, 'medium', new Date(Date.now() + 8 * 60 * 60 * 1000), { count: activeCommissioning });
    }

    const compliancePending = await this.complianceDocumentModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
      status: { $in: ['Pending', 'Rejected'] },
    });
    if (compliancePending > 0) {
      await register('compliance', 'compliance:pending', 'Compliance documents need action', `${compliancePending} compliance documents are pending or rejected.`, 'high', new Date(Date.now() + 6 * 60 * 60 * 1000), { count: compliancePending });
    }

    const inactiveUsers = await this.userModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
      isActive: false,
    });
    if (inactiveUsers > 0) {
      await register('admin', 'admin:inactive-users', 'Inactive users need admin review', `${inactiveUsers} users are inactive and may require activation or cleanup.`, 'medium', new Date(Date.now() + 24 * 60 * 60 * 1000), { count: inactiveUsers });
    }

    const workflowRules = await this.workflowRuleModel.countDocuments({ tenantId: new Types.ObjectId(tenantId) });
    if (workflowRules === 0) {
      await register('settings', 'settings:workflow-rules', 'Workflow rules are not configured', 'No workflow rules are configured for this tenant.', 'high', new Date(Date.now() + 24 * 60 * 60 * 1000), { count: workflowRules });
    }
    const installationTaskConfig = await this.installationTaskConfigModel.findOne({ tenantId: new Types.ObjectId(tenantId) }).lean();
    if (!installationTaskConfig || !Array.isArray(installationTaskConfig.tasks) || installationTaskConfig.tasks.length === 0) {
      await register('settings', 'settings:installation-task-config', 'Installation task template is missing', 'Installation task checklist configuration is empty or missing.', 'medium', new Date(Date.now() + 24 * 60 * 60 * 1000));
    }
    const commissioningTaskConfig = await this.commissioningTaskConfigModel.findOne({ tenantId: new Types.ObjectId(tenantId) }).lean();
    if (!commissioningTaskConfig || !Array.isArray(commissioningTaskConfig.tasks) || commissioningTaskConfig.tasks.length === 0) {
      await register('settings', 'settings:commissioning-task-config', 'Commissioning task template is missing', 'Commissioning task checklist configuration is empty or missing.', 'medium', new Date(Date.now() + 24 * 60 * 60 * 1000));
    }

    for (const [moduleId, keys] of activeByModule.entries()) {
      await this.reminderService.resolveSyntheticReminderState(tenantId, moduleId, keys);
    }

    const managedModules = [
      'dashboard',
      'intelligence',
      'tasks',
      'survey',
      'design',
      'documentation',
      'procurement',
      'logistics',
      'installation',
      'commissioning',
      'compliance',
      'admin',
      'settings',
    ];
    for (const moduleId of managedModules.filter((moduleId) => !activeByModule.has(moduleId))) {
      await this.reminderService.resolveSyntheticReminderState(tenantId, moduleId, []);
    }
    
    // Summary log
    const totalReminders = Array.from(activeByModule.values()).reduce((sum, keys) => sum + keys.length, 0);
    this.logger.log(`[REMINDER_SYNC] Tenant ${tenantId}: Created/Updated ${totalReminders} reminders across ${activeByModule.size} modules`);
  }

  private async resolveAdminUserId(tenantId: string): Promise<string | null> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    this.logger.debug(`[REMINDER_SYNC] Resolving admin for tenant: ${tenantId}`);
    
    // First try to find an admin user
    const admin = await this.userModel.findOne({
      tenantId: tenantObjectId,
      isDeleted: { $ne: true },
      isActive: true,
      role: { $regex: 'admin', $options: 'i' },
    }).select('_id role').lean();

    if (admin?._id) {
      this.logger.debug(`[REMINDER_SYNC] Found admin user: ${admin._id} (role: ${admin.role})`);
      return String(admin._id);
    }

    // Fallback: find any active user
    this.logger.debug(`[REMINDER_SYNC] No admin found, looking for any active user...`);
    const anyUser = await this.userModel.findOne({
      tenantId: tenantObjectId,
      isDeleted: { $ne: true },
      isActive: true,
    }).select('_id role').lean();

    if (anyUser?._id) {
      this.logger.debug(`[REMINDER_SYNC] Found user (fallback): ${anyUser._id} (role: ${anyUser.role})`);
      return String(anyUser._id);
    }
    
    // Debug: count total users for this tenant
    const totalUsers = await this.userModel.countDocuments({ tenantId: tenantObjectId });
    const activeUsers = await this.userModel.countDocuments({ 
      tenantId: tenantObjectId, 
      isActive: true 
    });
    const nonDeletedUsers = await this.userModel.countDocuments({ 
      tenantId: tenantObjectId, 
      isDeleted: { $ne: true } 
    });
    this.logger.warn(`[REMINDER_SYNC] No eligible user found for tenant ${tenantId}. Stats: total=${totalUsers}, active=${activeUsers}, nonDeleted=${nonDeletedUsers}`);
    
    return null;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DashboardCacheService } from './dashboard-cache.service';

// Import schemas for models
import { Lead } from '../../leads/schemas/lead.schema';
import { Project } from '../../projects/schemas/project.schema';
import { Invoice } from '../../finance/schemas/invoice.schema';
import { Expense } from '../../finance/schemas/expense.schema';
import { Inventory } from '../../inventory/schemas/inventory.schema';
import { Installation } from '../../installation/schemas/installation.schema';
import { PurchaseOrder } from '../../procurement/schemas/purchase-order.schema';
import { Estimate } from '../../estimates/schemas/estimate.schema';
import { Employee } from '../../hrm/schemas/employee.schema';
import { Attendance } from '../../hrm/schemas/attendance.schema';
import { Survey } from '../../survey/schemas/survey.schema';
import { SiteSurvey } from '../../survey/schemas/site-survey.schema';
import { Quotation } from '../../quotation/schemas/quotation.schema';
import { Ticket } from '../../service-amc/schemas/ticket.schema';
import { Commissioning } from '../../commissioning/schemas/commissioning.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';
import { Task } from '../../tasks/schemas/task.schema';

// Import domain services
import { LeadsService } from '../../leads/services/leads.service';
import { ProjectsService } from '../../projects/services/projects.service';
import { InventoryService } from '../../inventory/services/inventory.service';
import { TasksService } from '../../tasks/services/tasks.service';
import { InvoiceService } from '../../finance/services/invoice.service';
import { ExpenseService } from '../../finance/services/expense.service';
import { SurveysService } from '../../survey/services/surveys.service';
import { SiteSurveysService } from '../../survey/services/site-surveys.service';
import { QuotationService } from '../../quotation/services/quotation.service';
import { CommissioningService } from '../../commissioning/services/commissioning.service';
import { InstallationService } from '../../installation/services/installation.service';
import { ProcurementService } from '../../procurement/services/procurement.service';
import { TicketsService } from '../../service-amc/services/tickets.service';
import { EmployeeService } from '../../hrm/services/employee.service';
import { buildCompleteFilter, UserWithVisibility } from '../../../common/utils/visibility-filter';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    // Domain services for simple stats
    private readonly leadsService: LeadsService,
    private readonly projectsService: ProjectsService,
    private readonly inventoryService: InventoryService,
    private readonly tasksService: TasksService,
    private readonly invoiceService: InvoiceService,
    private readonly expenseService: ExpenseService,
    private readonly surveysService: SurveysService,
    private readonly siteSurveysService: SiteSurveysService,
    private readonly quotationService: QuotationService,
    private readonly commissioningService: CommissioningService,
    private readonly installationService: InstallationService,
    private readonly procurementService: ProcurementService,
    private readonly ticketsService: TicketsService,
    private readonly employeeService: EmployeeService,
    // Mongoose models for complex aggregations (kept for backward compatibility)
    @InjectModel(Lead.name) private leadModel: Model<Lead>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Expense.name) private expenseModel: Model<Expense>,
    @InjectModel(Inventory.name) private inventoryModel: Model<Inventory>,
    @InjectModel(Installation.name) private installationModel: Model<Installation>,
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrder>,
    @InjectModel(Estimate.name) private estimateModel: Model<Estimate>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
    @InjectModel(Survey.name) private surveyModel: Model<Survey>,
    @InjectModel(SiteSurvey.name) private siteSurveyModel: Model<SiteSurvey>,
    @InjectModel(Quotation.name) private quotationModel: Model<Quotation>,
    @InjectModel(Ticket.name) private ticketModel: Model<Ticket>,
    @InjectModel(Commissioning.name) private commissioningModel: Model<Commissioning>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
    private readonly cacheService: DashboardCacheService,
  ) {}

  // Helper to combine base query with soft-delete filter
  private combineWithSoftDelete(baseQuery: any): any {
    const softDelete = {
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false },
        { isDeleted: null },
      ],
    };

    // If baseQuery is empty, just return soft delete filter
    if (!baseQuery || Object.keys(baseQuery).length === 0) {
      return softDelete;
    }

    // If baseQuery has $or, wrap both in $and to avoid conflicts
    if (baseQuery.$or) {
      return {
        $and: [baseQuery, softDelete],
      };
    }

    // Otherwise, spread both together
    return { ...baseQuery, ...softDelete };
  }

  private getSoftDeleteFilter(): Record<string, any> {
    return {
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false },
        { isDeleted: null },
      ],
    };
  }

  private async buildBaseQuery(tenantId: string, user?: any) {
    if (!tenantId || tenantId === 'solarcorp' || tenantId === 'default') {
      this.logger.warn('[Dashboard] No valid tenantId provided - returning empty query (no data)');
      return {};
    }

    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(tenantId);
    const isSuperAdmin = user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin';

    if (isSuperAdmin) {
      this.logger.log('[Dashboard] SuperAdmin - returning empty query for full access');
      return {};
    }

    const buildTenantOr = (tid: Types.ObjectId, tenantCodeOrId: string) => {
      // Some modules store tenantId as ObjectId, some as string.
      // We match both to avoid 0 counts because of type mismatch.
      return {
        $or: [
          { tenantId: tid },
          { tenantId: tid.toString() },
          { tenantId: tenantCodeOrId },
        ],
      };
    };

    if (isValidObjectId) {
      const tid = new Types.ObjectId(tenantId);
      this.logger.log(`[Dashboard] Using ObjectId tenant (OR match): ${tenantId}`);
      return buildTenantOr(tid, tenantId);
    }

    // Try to resolve tenant code to ObjectId using tenantModel
    try {
      const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
      if (tenant) {
        const tid = (tenant as any)._id as Types.ObjectId;
        this.logger.log(`[Dashboard] Resolved tenant code '${tenantId}' to ObjectId: ${tid}`);
        return buildTenantOr(tid, tenantId);
      }
    } catch (error: any) {
      this.logger.error(`[Dashboard] Error resolving tenant code '${tenantId}':`, error?.message);
    }

    // Fallback: Try as string tenantId (some schemas store it as string)
    this.logger.log(`[Dashboard] Using string tenant: ${tenantId}`);
    return { tenantId };
  }

  async getWidgetData(tenantId: string, user?: any) {
    this.logger.log(`[Dashboard] getWidgetData for tenant: ${tenantId}`);
    const baseQuery = await this.buildBaseQuery(tenantId, user);

    const [
      leadsData,
      projectsData,
      surveysData,
      inventoryData,
      commissioningData,
      installationData,
      quotationData,
      serviceData,
      procurementData,
      financeData,
      employeesData,
      tasksData,
    ] = await Promise.all([
      this.getLeadsStats(tenantId, user),
      this.getProjectsStats(tenantId, user),
      this.getSurveysStats(tenantId, user),
      this.getInventoryStats(tenantId, user),
      this.getCommissioningStats(baseQuery),
      this.getInstallationStats(baseQuery),
      this.getQuotationStats(tenantId),
      this.getServiceStats(baseQuery),
      this.getProcurementStats(baseQuery),
      this.getFinanceStats(baseQuery),
      this.getEmployeesStats(baseQuery),
      this.getTasksStats(tenantId, user),
    ]);

    const normalizedCommissioningData = {
      ...commissioningData,
      completed: commissioningData.completed || projectsData.commissioned || projectsData.completed || 0,
      commissioned: commissioningData.completed || projectsData.commissioned || projectsData.completed || 0,
    };

    return {
      leads: leadsData,
      projects: projectsData,
      surveys: surveysData,
      inventory: inventoryData,
      commissioning: normalizedCommissioningData,
      installation: installationData,
      quotation: quotationData,
      service: serviceData,
      procurement: procurementData,
      finance: financeData,
      employees: employeesData,
      tasks: tasksData,
      estimates: { total: 0, pending: 0, approved: 0 },
      logistics: { total: 0, inTransit: 0, delivered: 0 },
      compliance: { total: 0, pending: 0, compliant: 0 },
      documents: { total: 0, pending: 0, approved: 0 },
    };
  }

  async getInventoryStatsForDashboard(tenantId: string, user?: any) {
    const inventoryStats = await this.getInventoryStats(tenantId, user);
    this.logger.log(
      `[Dashboard] inventory-stats tenantId=${tenantId} totalStock=${inventoryStats.totalStock} totalAvailableStock=${inventoryStats.totalAvailableStock} byCategory=${inventoryStats.byCategory?.length || 0}`,
    );
    return inventoryStats;
  }

  async getServiceStatsForDashboard(tenantId: string, user?: any) {
    const serviceStats = await this.ticketsService.getDashboardStats(tenantId, user);
    this.logger.log(
      `[Dashboard] service-stats tenantId=${tenantId} totalTickets=${serviceStats.totalTickets || 0} open=${serviceStats.openTickets || 0} inProgress=${serviceStats.inProgressTickets || 0} resolved=${serviceStats.resolvedTickets || 0}`,
    );
    return {
      totalTickets: Number(serviceStats.totalTickets || 0),
      openTickets: Number(serviceStats.openTickets || 0),
      inProgressTickets: Number(serviceStats.inProgressTickets || serviceStats.inProgress || 0),
      resolvedTickets: Number(serviceStats.resolvedTickets || serviceStats.resolved || 0),
      scheduledTickets: Number(serviceStats.scheduledTickets || serviceStats.scheduled || 0),
      closedTickets: Number(serviceStats.closedTickets || serviceStats.closed || 0),
      statusDistribution: serviceStats.statusDistribution || {},
      open: Number(serviceStats.openTickets || serviceStats.open || 0),
      inProgress: Number(serviceStats.inProgressTickets || serviceStats.inProgress || 0),
      resolved: Number(serviceStats.resolvedTickets || serviceStats.resolved || 0),
    };
  }

  async getDashboardMetrics(tenantId: string, user?: any) {
    const [inventory, service, widget] = await Promise.all([
      this.getInventoryStatsForDashboard(tenantId, user),
      this.getServiceStatsForDashboard(tenantId, user),
      this.getWidgetData(tenantId, user),
    ]);

    return {
      inventory,
      service,
      metrics: {
        totalStock: Number(inventory.totalAvailableStock || inventory.totalStock || 0),
        lowStockItems: Number(inventory.lowStockItems || 0),
        inventoryByCategory: Array.isArray(inventory.byCategory) ? inventory.byCategory : [],
        totalServiceTickets: Number(service.totalTickets || 0),
        openServiceTickets: Number(service.openTickets || 0),
      },
      widget,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getTasksStats(tenantId: string, user?: any) {
    this.logger.log('[Dashboard] getTasksStats for tenant:', tenantId);
    try {
      return await this.tasksService.getStats(user, tenantId);
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching tasks stats:', error);
      return { total: 0, pending: 0, inProgress: 0, completed: 0 };
    }
  }

  private async getLeadsStats(tenantId: string, user?: any) {
    this.logger.log('[Dashboard] getLeadsStats for tenant:', tenantId);
    try {
      const stats = await this.leadsService.getStats(tenantId, user);
      return {
        total: stats.total || 0,
        hot: stats.hot || 0,
        new: stats.newLeads || 0,
        converted: stats.won || 0,
        qualified: stats.qualified || 0,
        won: stats.won || 0,
        lost: stats.lost || 0,
      };
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching leads stats:', error);
      return { total: 0, hot: 0, new: 0, converted: 0, qualified: 0, won: 0, lost: 0 };
    }
  }

  private async getProjectsStats(tenantId: string, user?: any) {
    this.logger.log('[Dashboard] getProjectsStats for tenant:', tenantId);
    try {
      const stats = await this.projectsService.getStats(tenantId, user);
      return {
        total: stats.totalProjects || 0,
        active: stats.active || 0,
        completed: stats.commissioned || 0,
        commissioned: stats.commissioned || 0,
        totalProjects: stats.totalProjects || 0,
        totalCapacity: stats.totalCapacity || 0,
        avgProgress: stats.avgProgress || 0,
        totalValue: stats.totalValue || 0,
      };
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching projects stats:', error);
      return { total: 0, active: 0, completed: 0, totalProjects: 0, totalCapacity: 0, avgProgress: 0, totalValue: 0 };
    }
  }

  private async getInventoryStats(tenantId: string, user?: any) {
    this.logger.log('[Dashboard] getInventoryStats for tenant:', tenantId);
    try {
      const stats = await this.inventoryService.getStats(tenantId, user);
      const totalItems = stats.totalItems || 0;
      const totalStock = stats.totalStock || 0;
      const totalAvailableStock = stats.totalAvailableStock || 0;
      const lowStockItems = stats.lowStockItems || 0;
      const byCategory = Array.isArray(stats.byCategory) ? stats.byCategory : [];

      return {
        totalItems,
        totalStock,
        totalAvailableStock,
        total: totalItems,
        lowStockItems,
        byCategory: byCategory.map((c: any) => ({
          name: c.name || c.category || 'Other',
          value: c.count || c.value || 0,
        })),
      };
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching inventory stats:', error);
      return { totalItems: 0, totalStock: 0, totalAvailableStock: 0, total: 0, lowStockItems: 0, byCategory: [] };
    }
  }

  private async getSurveysStats(tenantId: string, user?: UserWithVisibility) {
    this.logger.log('[Dashboard] getSurveysStats for tenant:', tenantId);
    try {
      const siteSurveyStats = await this.siteSurveysService.getStats(tenantId, user);

      const existingLeadIdsRaw = await this.siteSurveyModel.distinct(
        'leadId',
        buildCompleteFilter(tenantId, user, { leadId: { $exists: true, $ne: null } }),
      );
      const existingLeadIds = existingLeadIdsRaw
        .map((id: any) => (typeof id === 'string' && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id))
        .filter(Boolean);

      const leadFilter = buildCompleteFilter(tenantId, user, {});
      const statusExpr = {
        $expr: {
          $in: [
            { $toLower: { $ifNull: ['$statusKey', { $ifNull: ['$status', ''] }] } },
            ['survey', 'site_survey', 'sitesurvey'],
          ],
        },
      };

      const leadQuery =
        existingLeadIds.length > 0
          ? { $and: [leadFilter, statusExpr, { _id: { $nin: existingLeadIds } }] }
          : { $and: [leadFilter, statusExpr] };

      const surveyLeadCount = await this.leadModel.countDocuments(leadQuery);
      const pending = (siteSurveyStats.pending || 0) + surveyLeadCount;
      const completed = siteSurveyStats.complete || 0;
      const scheduled = pending;
      const total = (siteSurveyStats.total || 0) + surveyLeadCount;

      this.logger.log(
        `[Dashboard] Surveys stats - siteSurveys: ${siteSurveyStats.total || 0}, surveyLeads: ${surveyLeadCount}, total: ${total}`,
      );

      return {
        total,
        completed,
        pending,
        scheduled,
        active: siteSurveyStats.active || 0,
        complete: completed,
        surveyLeads: surveyLeadCount,
      };
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching surveys stats:', error);
      return { total: 0, completed: 0, pending: 0, scheduled: 0 };
    }
  }

  private async getCommissioningStats(baseQuery: any) {
    const query = this.combineWithSoftDelete(baseQuery);
    this.logger.log('[Dashboard] getCommissioningStats query:', JSON.stringify(query));
    try {
      const total = await this.commissioningModel.countDocuments(query);
      this.logger.log('[Dashboard] Commissioning total count:', total);

      const [completed, pending, inProgress] = await Promise.all([
        this.commissioningModel.countDocuments({ $and: [query, { status: { $regex: 'completed', $options: 'i' } }] }),
        this.commissioningModel.countDocuments({ $and: [query, { status: { $regex: 'pending', $options: 'i' } }] }),
        this.commissioningModel.countDocuments({ $and: [query, { status: { $regex: 'in.?progress', $options: 'i' } }] }),
      ]);
      this.logger.log(`[Dashboard] Commissioning stats - total: ${total}, completed: ${completed}, pending: ${pending}, inProgress: ${inProgress}`);
      return { total, completed, pending, inProgress };
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching commissioning stats:', error);
      return { total: 0, completed: 0, pending: 0, inProgress: 0 };
    }
  }

  private async getInstallationStats(baseQuery: any) {
    const query = this.combineWithSoftDelete(baseQuery);
    this.logger.log('[Dashboard] getInstallationStats query:', JSON.stringify(query));
    try {
      const total = await this.installationModel.countDocuments(query);
      this.logger.log('[Dashboard] Installation total count:', total);

      const [inProgress, completed, pending] = await Promise.all([
        this.installationModel.countDocuments({ $and: [query, { status: { $regex: 'in.?progress', $options: 'i' } }] }),
        this.installationModel.countDocuments({ $and: [query, { status: { $regex: 'completed', $options: 'i' } }] }),
        this.installationModel.countDocuments({ $and: [query, { status: { $regex: 'pending', $options: 'i' } }] }),
      ]);
      this.logger.log(`[Dashboard] Installation stats - total: ${total}, inProgress: ${inProgress}, completed: ${completed}, pending: ${pending}`);
      return { total, inProgress, completed, pending, active: inProgress };
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching installation stats:', error);
      return { total: 0, inProgress: 0, completed: 0, pending: 0, active: 0 };
    }
  }

  private async getQuotationStats(tenantId: string, user?: any) {
    this.logger.log('[Dashboard] getQuotationStats for tenant:', tenantId);
    try {
      const stats = await this.quotationService.getStats(tenantId);
      return {
        total: stats.total || 0,
        pending: stats.pending || 0,
        approved: stats.approved || 0,
        rejected: stats.rejected || 0,
        draft: stats.pending || 0,
      };
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching quotation stats:', error);
      return { total: 0, pending: 0, approved: 0, rejected: 0, draft: 0 };
    }
  }

  private async getServiceStats(baseQuery: any) {
    const query = this.combineWithSoftDelete(baseQuery);
    this.logger.log('[Dashboard] getServiceStats query:', JSON.stringify(query));
    try {
      const totalContracts = await this.ticketModel.countDocuments(query);
      this.logger.log('[Dashboard] Service total count:', totalContracts);

      const [openTickets, inProgress, resolved] = await Promise.all([
        this.ticketModel.countDocuments({ $and: [query, { status: { $regex: 'open', $options: 'i' } }] }),
        this.ticketModel.countDocuments({ $and: [query, { status: { $regex: 'in.?progress', $options: 'i' } }] }),
        this.ticketModel.countDocuments({ $and: [query, { status: { $regex: 'resolved', $options: 'i' } }] }),
      ]);
      this.logger.log(`[Dashboard] Service stats - total: ${totalContracts}, open: ${openTickets}, inProgress: ${inProgress}, resolved: ${resolved}`);
      return { openTickets, open: openTickets, inProgressTickets: inProgress, resolvedTickets: resolved, totalContracts };
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching service stats:', error);
      return { openTickets: 0, open: 0, inProgressTickets: 0, resolvedTickets: 0, totalContracts: 0 };
    }
  }

  private async getProcurementStats(baseQuery: any) {
    const query = this.combineWithSoftDelete(baseQuery);
    this.logger.log('[Dashboard] getProcurementStats query:', JSON.stringify(query));
    try {
      const [total, pending, completed, ordered] = await Promise.all([
        this.poModel.countDocuments({ $and: [query, { isActive: true }] }),
        this.poModel.countDocuments({ $and: [query, { isActive: true, status: 'Pending' }] }),
        this.poModel.countDocuments({ $and: [query, { isActive: true, status: 'Completed' }] }),
        this.poModel.countDocuments({ $and: [query, { isActive: true, status: 'Ordered' }] }),
      ]);
      this.logger.log(`[Dashboard] Procurement stats - total: ${total}, pending: ${pending}, completed: ${completed}, ordered: ${ordered}`);
      return { total, pending, completed, ordered };
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching procurement stats:', error);
      return { total: 0, pending: 0, completed: 0, ordered: 0 };
    }
  }

  private async getFinanceStats(baseQuery: any) {
    const query = this.combineWithSoftDelete(baseQuery);
    this.logger.log('[Dashboard] getFinanceStats query:', JSON.stringify(query));
    try {
      const [totalRevenue, outstanding, totalInvoices, paidInvoices] = await Promise.all([
        this.invoiceModel.aggregate([
          { $match: { ...query, status: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$paid' } } },
        ]),
        this.invoiceModel.aggregate([
          { $match: { ...query, status: { $in: ['Pending', 'Partial', 'Overdue'] } } },
          { $group: { _id: null, total: { $sum: '$balance' } } },
        ]),
        this.invoiceModel.countDocuments(query),
        this.invoiceModel.countDocuments({ ...query, status: 'Paid' }),
      ]);
      this.logger.log(`[Dashboard] Finance stats - totalInvoices: ${totalInvoices}, paid: ${paidInvoices}`);
      return {
        totalRevenue: totalRevenue[0]?.total || 0,
        outstanding: outstanding[0]?.total || 0,
        totalInvoices,
        paidInvoices,
      };
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching finance stats:', error);
      return { totalRevenue: 0, outstanding: 0, totalInvoices: 0, paidInvoices: 0 };
    }
  }

  private async getEmployeesStats(baseQuery: any) {
    const query = this.combineWithSoftDelete(baseQuery);
    this.logger.log('[Dashboard] getEmployeesStats query:', JSON.stringify(query));
    try {
      const [total, active, onLeave] = await Promise.all([
        this.employeeModel.countDocuments(query),
        this.employeeModel.countDocuments({ $and: [query, { status: 'active' }] }),
        this.employeeModel.countDocuments({ $and: [query, { status: 'on_leave' }] }),
      ]);
      this.logger.log(`[Dashboard] Employees stats - total: ${total}, active: ${active}, onLeave: ${onLeave}`);
      return { total, active, onLeave, totalEmployees: total };
    } catch (error) {
      this.logger.error('[Dashboard] Error fetching employees stats:', error);
      return { total: 0, active: 0, onLeave: 0, totalEmployees: 0 };
    }
  }

  async getOverview(tenantId: string, user?: any) {
    const cacheKey = 'overview';
    const cached = await this.cacheService.getCachedData(tenantId, cacheKey);
    if (cached) return cached;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const baseQuery = await this.buildBaseQuery(tenantId, user);
    const query = this.combineWithSoftDelete(baseQuery);

    const [
      totalLeads,
      newLeads30d,
      totalProjects,
      projectsByStatus,
      activeProjects,
      completedProjects,
      totalRevenue,
      revenue30d,
      outstandingAmount,
      totalExpenses,
      expenses30d,
      inventoryValue,
      lowStockItems,
      activeInstallations,
      completedInstallations30d,
      pendingInstallations,
      totalEmployees,
      presentToday,
      pendingPOs,
      totalEstimates,
      estimatesPending,
    ] = await Promise.all([
      this.leadModel.countDocuments(query),
      this.leadModel.countDocuments({ $and: [query, { createdAt: { $gte: thirtyDaysAgo } }] }),
      this.projectModel.countDocuments(query),
      this.projectModel.aggregate([{ $match: query }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.projectModel.countDocuments({ $and: [query, { status: { $in: ['Survey', 'Design', 'Quotation', 'Procurement', 'Installation'] } }] }),
      this.projectModel.countDocuments({ $and: [query, { status: 'Commissioned' }] }),
      this.invoiceModel.aggregate([{ $match: { ...query, status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$paid' } } }]),
      this.invoiceModel.aggregate([{ $match: { ...query, status: 'Paid', paidDate: { $gte: thirtyDaysAgo } } }, { $group: { _id: null, total: { $sum: '$paid' } } }]),
      this.invoiceModel.aggregate([{ $match: { ...query, status: { $in: ['Pending', 'Partial', 'Overdue'] } } }, { $group: { _id: null, total: { $sum: '$balance' } } }]),
      this.expenseModel.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      this.expenseModel.aggregate([{ $match: { ...query, date: { $gte: thirtyDaysAgo } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      this.inventoryModel.aggregate([{ $match: query }, { $group: { _id: null, value: { $sum: { $multiply: ['$stock', '$rate'] } } } }]),
      this.inventoryModel.countDocuments({ $and: [query, { status: 'Low Stock' }] }),
      this.installationModel.countDocuments({ $and: [query, { status: { $in: ['Pending', 'In Progress'] } }] }),
      this.installationModel.countDocuments({ $and: [query, { status: 'Completed', updatedAt: { $gte: thirtyDaysAgo } }] }),
      this.installationModel.countDocuments({ $and: [query, { status: 'Pending Assign' }] }),
      this.employeeModel.countDocuments({ $and: [query, { status: 'active' }] }),
      this.attendanceModel.countDocuments({ ...baseQuery, date: { $gte: new Date(now.setHours(0,0,0,0)) }, status: 'Present' }),
      this.poModel.countDocuments({ ...baseQuery, isActive: true, status: { $in: ['Draft', 'Ordered'] } }),
      this.estimateModel.countDocuments(query),
      this.estimateModel.countDocuments({ $and: [query, { status: { $in: ['draft', 'sent'] } }] }),
    ]);

    const revenue = totalRevenue[0]?.total || 0;
    const expenses = totalExpenses[0]?.total || 0;
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

    const result = {
      summary: {
        totalLeads,
        newLeads30d,
        totalProjects,
        activeProjects,
        completedProjects,
        totalRevenue: revenue,
        revenue30d: revenue30d[0]?.total || 0,
        outstandingAmount: outstandingAmount[0]?.total || 0,
        totalExpenses: expenses,
        expenses30d: expenses30d[0]?.total || 0,
        profit,
        profitMargin: `${profitMargin}%`,
        inventoryValue: inventoryValue[0]?.value || 0,
        lowStockItems,
        activeInstallations,
        completedInstallations30d,
        pendingInstallations,
        totalEmployees,
        presentToday,
        pendingPOs,
        totalEstimates,
        estimatesPending,
      },
      projectsByStatus: projectsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      generatedAt: new Date().toISOString(),
    };

    await this.cacheService.setCachedData(tenantId, cacheKey, result, 5);
    return result;
  }

  async getSalesPipeline(tenantId: string, user?: any) {
    const baseQuery = await this.buildBaseQuery(tenantId, user);
    const query = this.combineWithSoftDelete(baseQuery);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      leadsByStatus,
      estimatesByStatus,
      conversionStats,
      monthlyTrend,
    ] = await Promise.all([
      this.leadModel.aggregate([
        { $match: query },
        { $group: { _id: '$statusKey', count: { $sum: 1 } } },
      ]),
      this.estimateModel.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.getConversionStats(baseQuery),
      this.getMonthlyTrend(baseQuery),
    ]);

    return {
      leadsByStatus: leadsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      estimatesByStatus: estimatesByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      conversionStats,
      monthlyTrend,
    };
  }

  private async getConversionStats(baseQuery: any) {
    const query = this.combineWithSoftDelete(baseQuery);
    const totalLeads = await this.leadModel.countDocuments(query);
    const qualifiedLeads = await this.leadModel.countDocuments({ $and: [query, { statusKey: { $in: ['qualified', 'proposal', 'negotiation'] } }] });
    const convertedToProject = await this.projectModel.countDocuments(query);

    return {
      leadToQualified: totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0,
      qualifiedToProject: qualifiedLeads > 0 ? ((convertedToProject / qualifiedLeads) * 100).toFixed(1) : 0,
      overallConversion: totalLeads > 0 ? ((convertedToProject / totalLeads) * 100).toFixed(1) : 0,
    };
  }

  private async getMonthlyTrend(baseQuery: any) {
    const query = this.combineWithSoftDelete(baseQuery);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await this.leadModel.aggregate([
      { $match: { ...query, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          leads: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return monthlyData.map(item => ({
      month: item._id,
      leads: item.leads,
    }));
  }

  async getFinancialMetrics(tenantId: string, user?: any) {
    const baseQuery = await this.buildBaseQuery(tenantId, user);
    const softDelete = this.getSoftDeleteFilter();

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    const [
      revenueByMonth,
      expensesByMonth,
      invoiceStatus,
      topCustomers,
      overdueInvoices,
    ] = await Promise.all([
      this.invoiceModel.aggregate([
        { $match: { ...baseQuery, ...softDelete, status: 'Paid', paidDate: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$paidDate" } },
            amount: { $sum: '$paid' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.expenseModel.aggregate([
        { $match: { ...baseQuery, ...softDelete, date: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { ...baseQuery, ...softDelete } },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { ...baseQuery, ...softDelete, status: 'Paid' } },
        { $group: { _id: '$customerName', total: { $sum: '$paid' } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
      this.invoiceModel.find({
        ...baseQuery,
        ...softDelete,
        status: 'Overdue',
      }).sort({ dueDate: 1 }).limit(5).select('invoiceNumber customerName balance dueDate'),
    ]);

    return {
      revenueByMonth: revenueByMonth.map(item => ({
        month: item._id,
        amount: item.amount,
      })),
      expensesByMonth: expensesByMonth.map(item => ({
        month: item._id,
        amount: item.amount,
      })),
      invoiceStatus,
      topCustomers,
      overdueInvoices,
    };
  }

  async getProjectMetrics(tenantId: string, user?: any) {
    const baseQuery = await this.buildBaseQuery(tenantId, user);
    const softDelete = this.getSoftDeleteFilter();

    const [
      projectsByStage,
      delayedProjects,
      recentProjects,
      installationProgress,
    ] = await Promise.all([
      this.projectModel.aggregate([
        { $match: { ...baseQuery, ...softDelete } },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$value' } } },
      ]),
      this.projectModel.find({
        ...baseQuery,
        ...softDelete,
        status: { $in: ['Installation', 'Commissioned'] },
        $expr: { $gt: [{ $toDate: '$estEndDate' }, new Date()] },
      }).sort({ estEndDate: 1 }).limit(5).select('projectId customerName status progress estEndDate'),
      this.projectModel.find({
        ...baseQuery,
        ...softDelete,
      }).sort({ createdAt: -1 }).limit(5).select('projectId customerName status progress value'),
      this.installationModel.aggregate([
        { $match: { ...baseQuery, ...softDelete } },
        { $group: { _id: '$status', count: { $sum: 1 }, avgProgress: { $avg: '$progress' } } },
      ]),
    ]);

    return {
      projectsByStage,
      delayedProjects,
      recentProjects,
      installationProgress,
    };
  }

  async getInventoryAlerts(tenantId: string, user?: any) {
    const baseQuery = await this.buildBaseQuery(tenantId, user);
    const softDelete = this.getSoftDeleteFilter();

    const [
      lowStockItems,
      outOfStockItems,
      inventoryByCategory,
      reservedInventory,
    ] = await Promise.all([
      this.inventoryModel.find({
        ...baseQuery,
        ...softDelete,
        $or: [
          { status: { $regex: /^low.?stock$/i } },
          { status: 'Low Stock' },
        ],
      }).sort({ stock: 1 }).limit(10).select('itemId name stock minStock reserved category'),
      this.inventoryModel.find({
        ...baseQuery,
        ...softDelete,
        $or: [
          { status: { $regex: /^out.?of.?stock$/i } },
          { status: 'Out of Stock' },
        ],
      }).select('itemId name category'),
      this.inventoryModel.aggregate([
        { $match: { ...baseQuery, ...softDelete } },
        { $group: { _id: '$category', count: { $sum: 1 }, value: { $sum: { $multiply: ['$stock', '$rate'] } } } },
      ]),
      this.inventoryModel.aggregate([
        { $match: { ...baseQuery, ...softDelete, reserved: { $gt: 0 } } },
        { $group: { _id: null, totalReserved: { $sum: '$reserved' }, count: { $sum: 1 } } },
      ]),
    ]);

    return {
      lowStockItems,
      outOfStockItems,
      inventoryByCategory,
      reservedCount: reservedInventory[0]?.count || 0,
      totalReserved: reservedInventory[0]?.totalReserved || 0,
    };
  }

  async getTeamPerformance(tenantId: string, user?: any) {
    const baseQuery = await this.buildBaseQuery(tenantId, user);
    const softDelete = this.getSoftDeleteFilter();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      attendanceToday,
      installationByTechnician,
      leadsByOwner,
      employeeStats,
    ] = await Promise.all([
      this.attendanceModel.aggregate([
        { $match: { ...baseQuery, date: { $gte: today } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.installationModel.aggregate([
        { $match: { ...baseQuery, ...softDelete, status: 'Completed' } },
        { $group: { _id: '$technicianName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      this.leadModel.aggregate([
        { $match: { ...baseQuery, ...softDelete, assignedTo: { $exists: true } } },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $project: { _id: 1, count: 1, name: { $arrayElemAt: ['$user.name', 0] } } },
        { $limit: 5 },
      ]),
      this.employeeModel.aggregate([
        { $match: { ...baseQuery, ...softDelete } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      attendanceToday: attendanceToday.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      installationByTechnician,
      leadsByOwner,
      employeeStats,
    };
  }

  async getIntelligentInsights(tenantId: string, user?: any) {
    const baseQuery = await this.buildBaseQuery(tenantId, user);
    const softDelete = this.getSoftDeleteFilter();

    const insights = [];

    // Check for overdue invoices
    const overdueCount = await this.invoiceModel.countDocuments({
      ...baseQuery,
      ...softDelete,
      status: 'Overdue',
    });
    if (overdueCount > 0) {
      insights.push({
        type: 'warning',
        severity: 'high',
        message: `${overdueCount} invoice(s) are overdue. Follow up for payment collection.`,
        module: 'finance',
        action: 'View Invoices',
      });
    }

    // Check for low stock
    const lowStockCount = await this.inventoryModel.countDocuments({
      ...baseQuery,
      ...softDelete,
      $or: [
        { status: { $regex: /^low.?stock$/i } },
        { status: 'Low Stock' },
      ],
    });
    if (lowStockCount > 0) {
      insights.push({
        type: 'alert',
        severity: 'high',
        message: `${lowStockCount} items are running low on stock. Review procurement needs.`,
        module: 'inventory',
        action: 'View Inventory',
      });
    }

    // Check for pending installations
    const pendingInstallations = await this.installationModel.countDocuments({
      ...baseQuery,
      ...softDelete,
      status: 'Pending Assign',
    });
    if (pendingInstallations > 0) {
      insights.push({
        type: 'info',
        severity: 'medium',
        message: `${pendingInstallations} installation(s) need technician assignment.`,
        module: 'installation',
        action: 'Assign Technicians',
      });
    }

    // Check for pending purchase orders
    const pendingPOs = await this.poModel.countDocuments({
      ...baseQuery,
      isActive: true,
      status: { $in: ['Draft', 'Ordered'] },
    });
    if (pendingPOs > 0) {
      insights.push({
        type: 'info',
        severity: 'medium',
        message: `${pendingPOs} purchase order(s) are pending. Track delivery status.`,
        module: 'procurement',
        action: 'View POs',
      });
    }

    // Compare revenue with last month
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthRevenue, lastMonthRevenue] = await Promise.all([
      this.invoiceModel.aggregate([
        { $match: { ...baseQuery, ...softDelete, status: 'Paid', paidDate: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$paid' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { ...baseQuery, ...softDelete, status: 'Paid', paidDate: { $gte: lastMonth, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$paid' } } },
      ]),
    ]);

    const current = thisMonthRevenue[0]?.total || 0;
    const previous = lastMonthRevenue[0]?.total || 0;

    if (previous > 0) {
      const change = ((current - previous) / previous) * 100;
      if (change > 10) {
        insights.push({
          type: 'success',
          severity: 'low',
          message: `Revenue increased by ${change.toFixed(1)}% compared to last month!`,
          module: 'finance',
          action: 'View Report',
        });
      } else if (change < -10) {
        insights.push({
          type: 'warning',
          severity: 'medium',
          message: `Revenue decreased by ${Math.abs(change).toFixed(1)}% compared to last month.`,
          module: 'finance',
          action: 'View Report',
        });
      }
    }

    return insights;
  }

  async getRecentActivities(tenantId: string, limit = 10, user?: any) {
    const baseQuery = await this.buildBaseQuery(tenantId, user);
    const softDelete = this.getSoftDeleteFilter();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      recentLeads,
      recentProjects,
      recentInvoices,
      recentInstallations,
    ] = await Promise.all([
      this.leadModel.find({
        ...baseQuery,
        ...softDelete,
        createdAt: { $gte: thirtyDaysAgo },
      }).sort({ createdAt: -1 }).limit(limit).select('leadId name statusKey createdAt'),
      this.projectModel.find({
        ...baseQuery,
        ...softDelete,
        createdAt: { $gte: thirtyDaysAgo },
      }).sort({ createdAt: -1 }).limit(limit).select('projectId customerName status createdAt'),
      this.invoiceModel.find({
        ...baseQuery,
        ...softDelete,
        createdAt: { $gte: thirtyDaysAgo },
      }).sort({ createdAt: -1 }).limit(limit).select('invoiceNumber customerName status amount createdAt'),
      this.installationModel.find({
        ...baseQuery,
        ...softDelete,
        updatedAt: { $gte: thirtyDaysAgo },
        status: 'Completed',
      }).sort({ updatedAt: -1 }).limit(limit).select('installationId customerName status completedAt'),
    ]);

    const activities = [
      ...recentLeads.map(l => ({ type: 'lead', title: `New Lead: ${l.name}`, status: l.statusKey, date: (l as any).createdAt || l.created, id: l.leadId })),
      ...recentProjects.map(p => ({ type: 'project', title: `Project Created: ${p.customerName}`, status: p.status, date: (p as any).createdAt || (p as any).createdBy || new Date(), id: p.projectId })),
      ...recentInvoices.map(i => ({ type: 'invoice', title: `Invoice ${i.invoiceNumber}`, status: i.status, amount: i.amount, date: (i as any).createdAt || (i as any).createdBy || new Date(), })),
      ...recentInstallations.map(i => ({ type: 'installation', title: `Installation Completed: ${i.customerName}`, status: i.status, date: (i as any).completedAt || (i as any).updatedAt || new Date(), id: i.installationId })),
    ];

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
  }
}

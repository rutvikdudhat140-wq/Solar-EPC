import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { DashboardCacheService } from './services/dashboard-cache.service';
import { DashboardCache, DashboardCacheSchema } from './schemas/dashboard-cache.schema';

// Import schemas for MongooseModule
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Invoice, InvoiceSchema } from '../finance/schemas/invoice.schema';
import { Expense, ExpenseSchema } from '../finance/schemas/expense.schema';
import { Inventory, InventorySchema } from '../inventory/schemas/inventory.schema';
import { Installation, InstallationSchema } from '../installation/schemas/installation.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../procurement/schemas/purchase-order.schema';
import { Estimate, EstimateSchema } from '../estimates/schemas/estimate.schema';
import { Employee, EmployeeSchema } from '../hrm/schemas/employee.schema';
import { Attendance, AttendanceSchema } from '../hrm/schemas/attendance.schema';
import { Survey, SurveySchema } from '../survey/schemas/survey.schema';
import { SiteSurvey, SiteSurveySchema } from '../survey/schemas/site-survey.schema';
import { Quotation, QuotationSchema } from '../quotation/schemas/quotation.schema';
import { Ticket, TicketSchema } from '../service-amc/schemas/ticket.schema';
import { Commissioning, CommissioningSchema } from '../commissioning/schemas/commissioning.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';

// Import modules that provide domain services
import { LeadsModule } from '../leads/leads.module';
import { ProjectsModule } from '../projects/projects.module';
import { InventoryModule } from '../inventory/inventory.module';
import { TasksModule } from '../tasks/tasks.module';
import { FinanceModule } from '../finance/finance.module';
import { HrmModule } from '../hrm/hrm.module';
import { SurveyModule } from '../survey/survey.module';
import { QuotationModule } from '../quotation/quotation.module';
import { CommissioningModule } from '../commissioning/commissioning.module';
import { InstallationModule } from '../installation/installation.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { ServiceAmcModule } from '../service-amc/service-amc.module';
import { TenantModule } from '../../core/tenant/tenant.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DashboardCache.name, schema: DashboardCacheSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: Installation.name, schema: InstallationSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Estimate.name, schema: EstimateSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Survey.name, schema: SurveySchema },
      { name: SiteSurvey.name, schema: SiteSurveySchema },
      { name: Quotation.name, schema: QuotationSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Commissioning.name, schema: CommissioningSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    // Domain modules that provide services
    LeadsModule,
    ProjectsModule,
    InventoryModule,
    TasksModule,
    FinanceModule,
    HrmModule,
    SurveyModule,
    QuotationModule,
    CommissioningModule,
    InstallationModule,
    ProcurementModule,
    ServiceAmcModule,
    TenantModule,
    SettingsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardCacheService],
  exports: [DashboardService, DashboardCacheService],
})
export class DashboardModule {}

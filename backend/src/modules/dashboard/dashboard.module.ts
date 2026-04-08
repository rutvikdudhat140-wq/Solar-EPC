import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { DashboardCacheService } from './services/dashboard-cache.service';
import { DashboardCache, DashboardCacheSchema } from './schemas/dashboard-cache.schema';
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
import { Quotation, QuotationSchema } from '../quotation/schemas/quotation.schema';
import { Ticket, TicketSchema } from '../service-amc/schemas/ticket.schema';
import { Commissioning, CommissioningSchema } from '../commissioning/schemas/commissioning.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
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
      { name: Quotation.name, schema: QuotationSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Commissioning.name, schema: CommissioningSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    SettingsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardCacheService],
  exports: [DashboardService, DashboardCacheService],
})
export class DashboardModule {}

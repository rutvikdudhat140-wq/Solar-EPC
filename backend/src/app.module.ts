import { Module } from '@nestjs/common';
import { CoreConfigModule } from './core/config/core-config.module';
import { DatabaseModule } from './shared/database/database.module';
import { CommissioningModule } from './modules/commissioning/commissioning.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { DesignModule } from './modules/design/design.module';
import { FinanceModule } from './modules/finance/finance.module';
import { InstallationModule } from './modules/installation/installation.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LeadsModule } from './modules/leads/leads.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QuotationModule } from './modules/quotation/quotation.module';
import { ServiceAmcModule } from './modules/service-amc/service-amc.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SurveyModule } from './modules/survey/survey.module';
import { WorkflowModule } from './core/workflow/workflow.module';
import { HrmModule } from './modules/hrm/hrm.module';
import { PermissionsModule } from './core/permissions/permissions.module';
import { AuthModule } from './core/auth/auth.module';
import { TenantModule } from './core/tenant/tenant.module';
import { DocumentModule } from './modules/document/document.module';
import { EmailModule } from './modules/email/email.module';
import { ItemsModule } from './modules/items/items.module';
import { EstimatesModule } from './modules/estimates/estimates.module';
import { SuperadminModule } from './modules/superadmin';
import { AutomationModule } from './modules/automation/automation.module';
import { CustomersModule } from './modules/customers/customers.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    CoreConfigModule,
    DatabaseModule,
    AuthModule,
    TenantModule,
    WorkflowModule,
    PermissionsModule,
    EmailModule,
    InventoryModule,
    LeadsModule,
    LogisticsModule,
    ProcurementModule,
    ProjectsModule,
    QuotationModule,
    ServiceAmcModule,
    DocumentModule,
    SurveyModule,
    CustomersModule,
    DesignModule,
    ItemsModule,
    EstimatesModule,
    InstallationModule,
    CommissioningModule,
    FinanceModule,
    ComplianceModule,
    SettingsModule,
    HrmModule,
    SuperadminModule,
    AutomationModule,
    TasksModule,
    DashboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

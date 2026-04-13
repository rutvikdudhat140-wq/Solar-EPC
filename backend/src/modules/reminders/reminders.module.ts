import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { DashboardModule } from '../dashboard/dashboard.module';
import { SuperadminModule } from '../superadmin/superadmin.module';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { User, UserSchema } from '../../core/auth/schemas/user.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Survey, SurveySchema } from '../survey/schemas/survey.schema';
import { DocumentEntity, DocumentEntitySchema } from '../document/schemas/document.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../procurement/schemas/purchase-order.schema';
import { Dispatch, DispatchSchema } from '../logistics/schemas/dispatch.schema';
import { Installation, InstallationSchema } from '../installation/schemas/installation.schema';
import { Commissioning, CommissioningSchema } from '../commissioning/schemas/commissioning.schema';
import { ComplianceDocument, ComplianceDocumentSchema } from '../compliance/schemas/compliance-document.schema';
import { InstallationTaskConfig, InstallationTaskConfigSchema } from '../settings/schemas/installation-task.schema';
import { CommissioningTaskConfig, CommissioningTaskConfigSchema } from '../settings/schemas/commissioning-task.schema';
import { WorkflowRule, WorkflowRuleSchema } from '../settings/schemas/workflow-rule.schema';
import { ReminderController } from './controllers/reminder.controller';
import { ReminderService } from './services/reminder.service';
import { ReminderScheduler } from './services/reminder-scheduler.service';
import { ReminderNotificationService } from './services/reminder-notification.service';
import { AutoReminderService } from './services/auto-reminder.service';
import { ReminderRuleSyncService } from './services/reminder-rule-sync.service';
import { ReminderGateway } from './gateways/reminder.gateway';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';
import { NotificationLog, NotificationLogSchema } from './schemas/notification-log.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DashboardModule,
    SuperadminModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Survey.name, schema: SurveySchema },
      { name: DocumentEntity.name, schema: DocumentEntitySchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Dispatch.name, schema: DispatchSchema },
      { name: Installation.name, schema: InstallationSchema },
      { name: Commissioning.name, schema: CommissioningSchema },
      { name: ComplianceDocument.name, schema: ComplianceDocumentSchema },
      { name: InstallationTaskConfig.name, schema: InstallationTaskConfigSchema },
      { name: CommissioningTaskConfig.name, schema: CommissioningTaskConfigSchema },
      { name: WorkflowRule.name, schema: WorkflowRuleSchema },
    ]),
  ],
  controllers: [ReminderController],
  providers: [
    ReminderService,
    ReminderScheduler,
    ReminderNotificationService,
    AutoReminderService,
    ReminderRuleSyncService,
    ReminderGateway,
  ],
  exports: [ReminderService, ReminderNotificationService, AutoReminderService, ReminderRuleSyncService, ReminderGateway],
})
export class RemindersModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantController } from './controllers/tenant.controller';
import { SubscriptionController } from './controllers/subscription.controller';
import { BackupController } from './controllers/backup.controller';
import { UserManagementController } from './user-management.controller';
import { TeamManagementController } from './team-management.controller';
import { TenantService } from './services/tenant.service';
import { SubscriptionService } from './services/subscription.service';
import { BackupService } from './services/backup.service';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { SystemBackup, SystemBackupSchema } from './schemas/backup.schema';
import { User, UserSchema } from '../../core/auth/schemas/user.schema';
import { Department, DepartmentSchema } from '../hrm/schemas/department.schema';
import { Employee, EmployeeSchema } from '../hrm/schemas/employee.schema';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SystemBackup.name, schema: SystemBackupSchema },
      { name: User.name, schema: UserSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    AuthModule,
  ],
  controllers: [
    TenantController,
    SubscriptionController,
    BackupController,
    UserManagementController,
    TeamManagementController,
  ],
  providers: [
    TenantService,
    SubscriptionService,
    BackupService,
  ],
  exports: [
    TenantService,
    SubscriptionService,
    BackupService,
  ],
})
export class SuperadminModule {}

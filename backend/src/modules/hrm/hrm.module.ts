import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Import CommonModule for PermissionCacheService
import { CommonModule } from '../../common/common.module';

// Schemas
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { Leave, LeaveSchema } from './schemas/leave.schema';
import { Payroll, PayrollSchema } from './schemas/payroll.schema';
import { SalaryIncrement, SalaryIncrementSchema } from './schemas/salary-increment.schema';
import { Department, DepartmentSchema } from './schemas/department.schema';
import { Permission, PermissionSchema } from './schemas/permission.schema';
import { Role, RoleSchema } from './schemas/role.schema';
import { RoleColumnPermission, RoleColumnPermissionSchema } from './schemas/role-column-permission.schema';
import { RoleModulePermission, RoleModulePermissionSchema } from './schemas/role-module-permission.schema';
import { CompanyAttendancePolicy, CompanyAttendancePolicySchema } from './schemas/company-attendance-policy.schema';
import { User, UserSchema } from '../../core/auth/schemas/user.schema';

// Services
import { EmployeeService } from './services/employee.service';
import { AttendanceService } from './services/attendance.service';
import { LeaveService } from './services/leave.service';
import { PayrollService } from './services/payroll.service';
import { SalaryIncrementService } from './services/salary-increment.service';
import { DepartmentService } from './services/department.service';
import { PermissionService } from './services/permission.service';
import { AttendancePolicyService } from './services/attendance-policy.service';
import { HrmDashboardService } from './services/hrm-dashboard.service';

// Controllers
import { EmployeeController } from './controllers/employee.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { LeaveController } from './controllers/leave.controller';
import { PayrollController } from './controllers/payroll.controller';
import { SalaryIncrementController } from './controllers/salary-increment.controller';
import { DepartmentController } from './controllers/department.controller';
import { PermissionController } from './controllers/permission.controller';
import { AttendancePolicyController } from './controllers/attendance-policy.controller';
import { HrmDashboardController } from './controllers/hrm-dashboard.controller';

@Module({
  imports: [
    // Import CommonModule to get PermissionCacheService
    CommonModule,
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Leave.name, schema: LeaveSchema },
      { name: Payroll.name, schema: PayrollSchema },
      { name: SalaryIncrement.name, schema: SalaryIncrementSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: Role.name, schema: RoleSchema },
      { name: RoleColumnPermission.name, schema: RoleColumnPermissionSchema },
      { name: RoleModulePermission.name, schema: RoleModulePermissionSchema },
      { name: CompanyAttendancePolicy.name, schema: CompanyAttendancePolicySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [
    EmployeeController,
    AttendanceController,
    LeaveController,
    PayrollController,
    SalaryIncrementController,
    DepartmentController,
    PermissionController,
    AttendancePolicyController,
    HrmDashboardController,
  ],
  providers: [
    EmployeeService,
    AttendanceService,
    LeaveService,
    PayrollService,
    SalaryIncrementService,
    DepartmentService,
    PermissionService,
    AttendancePolicyService,
    HrmDashboardService,
  ],
  exports: [
    EmployeeService,
    AttendanceService,
    LeaveService,
    PayrollService,
    SalaryIncrementService,
    DepartmentService,
    PermissionService,
  ],
})
export class HrmModule {}

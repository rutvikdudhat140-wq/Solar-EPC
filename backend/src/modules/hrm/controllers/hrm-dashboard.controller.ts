import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { HrmDashboardService } from '../services/hrm-dashboard.service';

@Controller('hrm')
@UseGuards(JwtAuthGuard, TenantGuard)
export class HrmDashboardController {
  constructor(
    private readonly dashboardService: HrmDashboardService,
  ) {}

  @Get('dashboard-metrics')
  async getDashboardMetrics(@Req() req: any) {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const user = req.user;
    const userId = user?.id || user?._id || user?.sub;
    
    // Determine if user is admin
    const isAdmin = user?.role?.toLowerCase() === 'admin' || 
                    user?.role?.toLowerCase() === 'superadmin' || 
                    user?.isSuperAdmin === true;

    const metrics = await this.dashboardService.getDashboardMetrics(
      tenantId,
      isAdmin ? null : userId,
      isAdmin,
      {}, // dataScopeFilter can be extended for department-level access
    );

    return {
      success: true,
      data: metrics,
    };
  }

  @Get('reports/employee/:id')
  async getEmployeeReport(@Param('id') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    
    const report = await this.dashboardService.getEmployeeReport(
      employeeId,
      tenantId,
    );

    return {
      success: true,
      data: report,
    };
  }
}

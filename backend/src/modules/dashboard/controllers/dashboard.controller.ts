import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../../modules/settings/guards/permission.guard';
import { DashboardService } from '../services/dashboard.service';
import { DashboardCacheService } from '../services/dashboard-cache.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly cacheService: DashboardCacheService,
  ) {}

  @Get('overview')
  async getOverview(@Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId;
    const data = await this.dashboardService.getOverview(tenantId, req.user);
    return { success: true, data };
  }

  @Get('sales')
  async getSalesPipeline(@Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId;
    const data = await this.dashboardService.getSalesPipeline(tenantId, req.user);
    return { success: true, data };
  }

  @Get('finance')
  async getFinancialMetrics(@Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId;
    const data = await this.dashboardService.getFinancialMetrics(tenantId, req.user);
    return { success: true, data };
  }

  @Get('projects')
  async getProjectMetrics(@Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId;
    const data = await this.dashboardService.getProjectMetrics(tenantId, req.user);
    return { success: true, data };
  }

  @Get('inventory')
  async getInventoryAlerts(@Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId;
    const data = await this.dashboardService.getInventoryAlerts(tenantId, req.user);
    return { success: true, data };
  }

  @Get('team')
  async getTeamPerformance(@Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId;
    const data = await this.dashboardService.getTeamPerformance(tenantId, req.user);
    return { success: true, data };
  }

  @Get('insights')
  async getInsights(@Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId;
    const data = await this.dashboardService.getIntelligentInsights(tenantId, req.user);
    return { success: true, data };
  }

  @Get('activities')
  async getRecentActivities(@Req() req: any, @Query('limit') limit?: string) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId;
    const data = await this.dashboardService.getRecentActivities(tenantId, parseInt(limit || '10'), req.user);
    return { success: true, data };
  }

  @Get('refresh')
  async refreshCache(@Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId;
    await this.cacheService.invalidateCache(tenantId);
    return { success: true, message: 'Dashboard cache cleared' };
  }

  @Get('widget')
  async getWidgetData(@Req() req: any) {
    // Try all possible sources for tenantId
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId || '';
    console.log('[Dashboard Controller] getWidgetData - tenantId:', tenantId, 'req.tenant:', req.tenant);
    const data = await this.dashboardService.getWidgetData(tenantId, req.user);
    return { success: true, data };
  }

  @Get('all')
  async getAllDashboardData(@Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId;
    const [
      overview,
      sales,
      finance,
      projects,
      inventory,
      team,
      insights,
      activities,
    ] = await Promise.all([
      this.dashboardService.getOverview(tenantId, req.user),
      this.dashboardService.getSalesPipeline(tenantId, req.user),
      this.dashboardService.getFinancialMetrics(tenantId, req.user),
      this.dashboardService.getProjectMetrics(tenantId, req.user),
      this.dashboardService.getInventoryAlerts(tenantId, req.user),
      this.dashboardService.getTeamPerformance(tenantId, req.user),
      this.dashboardService.getIntelligentInsights(tenantId, req.user),
      this.dashboardService.getRecentActivities(tenantId, 10, req.user),
    ]);

    return {
      success: true,
      data: {
        overview,
        sales,
        finance,
        projects,
        inventory,
        team,
        insights,
        activities,
      },
    };
  }
}

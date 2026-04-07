import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { LeadsService } from '../services/leads.service';
import { ExportQueueService } from '../services/export-queue.service';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto, AddActivityDto, BulkActionDto } from '../dto/lead.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../../modules/settings/guards/permission.guard';
import { RequirePermission } from '../../../modules/settings/decorators/permissions.decorator';

@Controller('leads')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);
  
  constructor(
    private readonly leadsService: LeadsService,
    private readonly exportQueueService: ExportQueueService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('crm', 'create')
  async create(@Body() createLeadDto: CreateLeadDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      this.logger.log(`[DEBUG] create lead - tenantId: ${tenantId}`);
      const result = await this.leadsService.create(createLeadDto, tenantId, req.user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Create lead failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get()
  @RequirePermission('crm', 'view')
  async findAll(@Query() query: QueryLeadDto, @Request() req: any) {
    try {
      let tenantId = req.tenant?.id;
      const user = req.user;
      
      // TEMPORARY DEBUG: Log full request context
      this.logger.log(`[DEBUG FINDALL] Full req.tenant: ${JSON.stringify(req.tenant)}`);
      this.logger.log(`[DEBUG FINDALL] Full req.user: ${JSON.stringify(req.user)}`);
      this.logger.log(`[DEBUG FINDALL] tenantId: ${tenantId}, user: ${user?.id}, dataScope: ${user?.dataScope}`);
      
      // Fallback: If tenantId is missing but user has tenantId in token, use that
      if (!tenantId && user?.tenantId) {
        tenantId = user.tenantId;
        this.logger.log(`[DEBUG FINDALL] Using fallback tenantId from user: ${tenantId}`);
      }
      
      const result = await this.leadsService.findAll(query, tenantId, user);
      const page = Number(query?.page || 1);
      const limit = Number(query?.limit || 25);
      const pages = limit > 0 ? Math.max(1, Math.ceil((result.total || 0) / limit)) : 1;
      return { success: true, data: result.data, total: result.total, page, pages };
    } catch (error: any) {
      this.logger.error(`Find all leads failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      this.logger.log(`[DEBUG] getStats leads - tenantId: ${tenantId}, user: ${user?.id}, dataScope: ${user?.dataScope}`);
      return await this.leadsService.getStats(tenantId, user);
    } catch (error: any) {
      this.logger.error(`Get stats failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('status-options')
  async getStatusOptions(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.leadsService.getStatusOptions(tenantId);
    } catch (error: any) {
      this.logger.error(`Get status options failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post('recalculate-scores')
  @HttpCode(HttpStatus.OK)
  async recalculateScores(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.leadsService.recalculateAllScores(tenantId, req.user);
    } catch (error: any) {
      this.logger.error(`Recalculate scores failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get(':id')
  @RequirePermission('crm', 'view')
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.findOne(id, tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Find one lead failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Put(':id')
  @RequirePermission('crm', 'edit')
  async update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @Request() req: any) {
    try {
      this.logger.log(`Updating lead ${id} with data: ${JSON.stringify(updateLeadDto)}`);
      const tenantId = req.tenant?.id;
      const result = await this.leadsService.update(id, updateLeadDto, tenantId, req.user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Update lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('crm', 'delete')
  async remove(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      await this.leadsService.remove(id, tenantId, req.user);
    } catch (error: any) {
      this.logger.error(`Remove lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicate(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.leadsService.duplicate(id, tenantId, req.user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Duplicate lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.leadsService.update(id, { archived: true } as any, tenantId, req.user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Archive lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  async unarchive(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.leadsService.update(id, { archived: false } as any, tenantId, req.user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Unarchive lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post(':id/activities')
  @HttpCode(HttpStatus.CREATED)
  async addActivity(@Param('id') id: string, @Body() activityDto: AddActivityDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.leadsService.addActivity(id, activityDto, tenantId, req.user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Add activity to lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get(':id/timeline')
  @HttpCode(HttpStatus.OK)
  async getTimeline(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      return await this.leadsService.getTimeline(id, tenantId, user);
    } catch (error: any) {
      this.logger.error(`Get timeline for lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get(':id/tracker')
  @HttpCode(HttpStatus.OK)
  async getTracker(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      this.logger.log(`[getTracker] Request - id: ${id}, tenantId: ${tenantId}, user: ${user?.id}`);
      
      const result = await this.leadsService.getTracker(id, tenantId, user);
      this.logger.log(`[getTracker] Service result: ${JSON.stringify(result)}`);
      
      const response = { success: true, data: result };
      this.logger.log(`[getTracker] Sending response: ${JSON.stringify(response)}`);
      return response;
    } catch (error: any) {
      this.logger.error(`[getTracker] Error for lead ${id}: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Patch(':id/assign')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('crm', 'assign')
  async assignLead(
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string,
    @Request() req: any
  ) {
    try {
      // Log the incoming request for debugging
      this.logger.log(`[ASSIGN LEAD] Received request - Lead ID: ${id}, assignedTo: ${assignedTo}, type: ${typeof assignedTo}`);
      
      // Pass full user object from JWT token - NEVER trust frontend role
      const user = req.user;
      this.logger.log(`[DEBUG] assignLead ${id} to ${assignedTo} by ${user?.id} (role: ${user?.role})`);
      const result = await this.leadsService.assignLead(id, assignedTo, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Assign lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Patch(':id/stage')
  @HttpCode(HttpStatus.OK)
  async updateStage(@Param('id') id: string, @Body('stage') stage: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      this.logger.log(`[updateStage] Request: leadId=${id}, stage=${stage}, tenantId=${tenantId}`);
      const result = await this.leadsService.updateStage(id, stage, user?.id || 'System', tenantId, user);
      this.logger.log(`[updateStage] Response: leadId=${id}, statusKey=${result.statusKey}`);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Update stage for lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // Bulk actions
  @Post('bulk/archive')
  @HttpCode(HttpStatus.OK)
  async bulkArchive(@Body() bulkDto: BulkActionDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.leadsService.bulkArchive(bulkDto.ids, tenantId, req.user);
    } catch (error: any) {
      this.logger.error(`Bulk archive failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('crm', 'delete')
  async bulkDelete(@Body() body: { leadIds: string[] }, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.leadsService.bulkDelete(body.leadIds, tenantId, req.user);
    } catch (error: any) {
      this.logger.error(`Bulk delete failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('crm', 'delete')
  async bulkDeleteEndpoint(@Body() body: { leadIds: string[] }, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.leadsService.bulkDelete(body.leadIds, tenantId, req.user);
    } catch (error: any) {
      this.logger.error(`Bulk delete failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Patch('bulk-assign')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('crm', 'assign')
  async bulkAssign(
    @Body() body: { leadIds: string[]; assignedTo: string },
    @Request() req: any
  ) {
    try {
      const user = req.user;
      this.logger.log(`[DEBUG] bulkAssign ${body.leadIds?.length} leads to ${body.assignedTo} by ${user?.id}`);
      const results = [];
      for (const leadId of body.leadIds || []) {
        try {
          const result = await this.leadsService.assignLead(leadId, body.assignedTo, user);
          results.push({ leadId, success: true, data: result });
        } catch (err: any) {
          results.push({ leadId, success: false, error: err?.message });
        }
      }
      return { success: true, data: results };
    } catch (error: any) {
      this.logger.error(`Bulk assign failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Patch('bulk-score')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('crm', 'edit')
  async bulkScore(
    @Body() body: { leadIds: string[]; scoreIncrease?: number; score?: number },
    @Request() req: any
  ) {
    try {
      const tenantId = req.tenant?.id;
      const scoreValue = (body as any)?.scoreIncrease ?? (body as any)?.score;
      if (typeof scoreValue !== 'number' || Number.isNaN(scoreValue)) {
        throw new BadRequestException('scoreIncrease/score must be a number');
      }
      this.logger.log(`[DEBUG] bulkScore ${body.leadIds?.length} leads by ${scoreValue}`);
      const result = await this.leadsService.bulkUpdateScore(body.leadIds, scoreValue, tenantId, req.user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Bulk score failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('crm', 'export')
  async exportLeads(
    @Body() body: { leadIds?: string[]; filters?: any },
    @Request() req: any
  ) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      
      // Check if using filters or specific IDs
      if (body.filters && Object.keys(body.filters).length > 0) {
        this.logger.log(`[EXPORT] Filter-based export with filters:`, body.filters);
        return await this.leadsService.exportLeadsWithFilters(body.filters, tenantId, user);
      } else if (body.leadIds && body.leadIds.length > 0) {
        this.logger.log(`[EXPORT] ID-based export: ${body.leadIds.length} leads`);
        return await this.leadsService.exportLeads(body.leadIds, tenantId, user);
      } else {
        this.logger.log(`[EXPORT] No filters or IDs - exporting ALL leads`);
        // Export all leads when no filters or IDs provided
        return await this.leadsService.exportLeadsWithFilters({}, tenantId, user);
      }
    } catch (error: any) {
      this.logger.error(`Export leads failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post('bulk/stage/:stage')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateStage(@Body() bulkDto: BulkActionDto, @Param('stage') stage: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.leadsService.bulkUpdateStage(bulkDto.ids, stage, tenantId, req.user);
    } catch (error: any) {
      this.logger.error(`Bulk update stage failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post('reassign-status')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('crm', 'edit')
  async reassignStatus(
    @Body() body: { fromStatusKey: string; toStatusKey: string },
    @Request() req: any
  ) {
    try {
      const tenantId = req.tenant?.id;
      if (!body?.fromStatusKey || !body?.toStatusKey) {
        throw new BadRequestException('fromStatusKey and toStatusKey are required');
      }
      const result = await this.leadsService.reassignStatusKey(
        body.fromStatusKey,
        body.toStatusKey,
        tenantId,
        req.user
      );
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Reassign status failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // UNIFIED DASHBOARD API - SINGLE ENDPOINT WITH STRICT DATE FILTER
  // ============================================

  @Get('dashboard')
  async getFullDashboard(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any
  ) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      this.logger.log(`[UNIFIED DASHBOARD] startDate: ${startDate}, endDate: ${endDate}`);
      const result = await this.leadsService.getFullDashboard(tenantId, user, { startDate, endDate });
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get full dashboard failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // OLD DASHBOARD ENDPOINTS - DEPRECATED (kept for backward compatibility)
  // ============================================

  /* DEPRECATED - Use GET /leads/dashboard instead
  @Get('dashboard/kpis')
  async getDashboardKpis(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any
  ) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      this.logger.log(`[DATE FILTER] KPIs - startDate: ${startDate}, endDate: ${endDate}`);
      const result = await this.leadsService.getDashboardKpis(tenantId, user, { startDate, endDate });
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get dashboard kpis failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }
  */

  @Get('dashboard/overview')
  async getDashboardOverview(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.getDashboardOverview(tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get dashboard overview failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/funnel')
  async getFunnelData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any
  ) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      this.logger.log(`[DATE FILTER] Funnel - startDate: ${startDate}, endDate: ${endDate}`);
      const result = await this.leadsService.getDashboardFunnel(tenantId, user, { startDate, endDate });
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get funnel data failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/sources')
  async getDashboardSources(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any
  ) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      this.logger.log(`[DATE FILTER] Sources - startDate: ${startDate}, endDate: ${endDate}`);
      const result = await this.leadsService.getDashboardSources(tenantId, user, { startDate, endDate });
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get dashboard sources failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/source')
  async getSourcePerformance(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.getDashboardSource(tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get source performance failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/monthly')
  async getDashboardMonthly(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any
  ) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      this.logger.log(`[DATE FILTER] Monthly - startDate: ${startDate}, endDate: ${endDate}`);
      const result = await this.leadsService.getDashboardMonthly(tenantId, user, { startDate, endDate });
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get dashboard monthly failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/trend')
  async getLeadTrend(@Query('months') months: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.getDashboardTrend(tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get lead trend failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/top-performers')
  async getDashboardTopPerformers(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any
  ) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      this.logger.log(`[DATE FILTER] Top Performers - startDate: ${startDate}, endDate: ${endDate}`);
      const result = await this.leadsService.getDashboardTopPerformers(tenantId, user, { startDate, endDate });
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get dashboard top performers failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/value-trend')
  async getValueTrend(@Query('months') months: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      // Value trend is included in getDashboardTrend
      const result = await this.leadsService.getDashboardTrend(tenantId, user);
      return { success: true, data: result.months };
    } catch (error: any) {
      this.logger.error(`Get value trend failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/score-distribution')
  async getScoreDistribution(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      // Score distribution is included in getDashboardTrend
      const result = await this.leadsService.getDashboardTrend(tenantId, user);
      return { success: true, data: result.scoreBuckets };
    } catch (error: any) {
      this.logger.error(`Get score distribution failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/activity')
  async getActivityStats(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.getDashboardActivity(tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get activity stats failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('import/documentation')
  @HttpCode(HttpStatus.OK)
  async getImportDocumentation(@Request() req: any) {
    try {
      const documentation = await this.leadsService.getImportDocumentation();
      return { success: true, data: documentation };
    } catch (error: any) {
      this.logger.error(`Get import documentation failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // CUSTOMERS ENDPOINT
  // ============================================
  @Get('customers')
  @RequirePermission('crm', 'view')
  async getCustomers(@Query() query: QueryLeadDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      this.logger.log(`[DEBUG] getCustomers - tenantId: ${tenantId}, user: ${user?.id}`);
      const result = await this.leadsService.getCustomers(query, tenantId, user);
      const page = Number(query?.page || 1);
      const limit = Number(query?.limit || 25);
      const pages = limit > 0 ? Math.max(1, Math.ceil((result.total || 0) / limit)) : 1;
      return { success: true, data: result.data, total: result.total, page, pages };
    } catch (error: any) {
      this.logger.error(`Get customers failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // LEAD IMPORT ENDPOINT
  // ============================================
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('crm', 'create')
  async importLeads(@Request() req: any) {
    try {
      // Use Fastify multipart to get the file
      const file = await req.file();
        
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }
  
      const allowedExt = ['.csv', '.xlsx', '.xls', '.json'];
      const ext = extname(file.filename || '').toLowerCase();
      if (!allowedExt.includes(ext)) {
        throw new BadRequestException('Only CSV, XLSX, XLS, or JSON files are allowed');
      }
  
      const uploadDir = join(process.cwd(), 'uploads', 'leads');
      if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const storedFileName = `leads-${uniqueSuffix}${ext}`;
      const storedPath = join(uploadDir, storedFileName);
  
      // Read file buffer and write to disk
      const buffer = await file.toBuffer();
      await require('fs/promises').writeFile(storedPath, buffer);
  
      const user = req.user;
      const tenantId = user?.tenantId || req.tenant?.id;
      if (!tenantId && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
        throw new BadRequestException('Tenant context missing');
      }
      const fileExtension = ext;
        
      this.logger.log(`Importing leads from file: ${file.filename}, tenant: ${tenantId}`);
        
      const result = await this.leadsService.importLeads(storedPath, fileExtension, tenantId, user);
  
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Import leads failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }
}

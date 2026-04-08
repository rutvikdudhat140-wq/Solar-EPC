import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Request,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto, UpdateProjectDto, UpdateProjectStatusDto } from '../dto/project.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../../modules/settings/guards/permission.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermission('projects', 'view')
  async findAll(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const user = req?.user;
    return this.projectsService.findAll(tenantId, user, status, search);
  }

  @Get('stats')
  async getStats(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Request() req?: any,
  ) {
    const tenantId = headerTenantId || queryTenantId || '';
    const user = req?.user;
    console.log('[Projects Stats] tenantId:', tenantId);
    return this.projectsService.getStats(tenantId, user);
  }

  @Get('by-stage')
  async getProjectsByStage(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || '';
    return this.projectsService.getProjectsByStage(tenantId);
  }

  @Get('project-managers')
  async getProjectManagers(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.getProjectManagers(tenantId);
  }

  @Get(':projectId')
  async findOne(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.findOne(tenantId, projectId);
  }

  @Post()
  @RequirePermission('projects', 'create')
  async create(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.create(tenantId, createProjectDto);
  }

  @Post('from-quotation/:quotationId')
  async createFromQuotation(
    @Param('quotationId') quotationId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const project = await this.projectsService.createFromQuotation(quotationId, tenantId);
    return { success: true, data: project };
  }

  @Patch(':projectId')
  @RequirePermission('projects', 'edit')
  async update(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.update(tenantId, projectId, updateProjectDto);
  }

  @Patch(':projectId/status')
  async updateStatus(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
    @Body() updateStatusDto: UpdateProjectStatusDto,
    @Request() req?: any,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const user = req?.user;
    return this.projectsService.updateStatus(tenantId, projectId, updateStatusDto, user);
  }

  @Post('fix-inventory/inv3552')
  @SetMetadata('isPublic', true)
  async fixInventoryINV3552(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    await this.projectsService.forceFixINV3552(tenantId);
    return { success: true, message: 'INV3552 inventory fixed' };
  }

  @Patch(':projectId/restore')
  async restore(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.restore(tenantId, projectId);
  }

  @Delete(':projectId')
  @RequirePermission('projects', 'delete')
  async remove(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.remove(tenantId, projectId);
  }
}

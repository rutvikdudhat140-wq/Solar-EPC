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

  private getTenantId(req: any): string {
    // TenantGuard sets req.tenant.id after resolving code to ObjectId
    return req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId || '';
  }

  @Get()
  @RequirePermission('projects', 'view')
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    const tenantId = this.getTenantId(req);
    const user = req?.user;
    return this.projectsService.findAll(tenantId, user, status, search);
  }

  @Get('stats')
  async getStats(@Request() req?: any) {
    const tenantId = this.getTenantId(req);
    const user = req?.user;
    console.log('[Projects Stats] tenantId:', tenantId);
    return this.projectsService.getStats(tenantId, user);
  }

  @Get('by-stage')
  async getProjectsByStage(@Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.projectsService.getProjectsByStage(tenantId);
  }

  @Get('project-managers')
  async getProjectManagers(@Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.projectsService.getProjectManagers(tenantId);
  }

  @Get(':projectId')
  async findOne(@Param('projectId') projectId: string, @Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.projectsService.findOne(tenantId, projectId);
  }

  @Post()
  @RequirePermission('projects', 'create')
  async create(@Body() createProjectDto: CreateProjectDto, @Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.projectsService.create(tenantId, createProjectDto);
  }

  @Post('from-quotation/:quotationId')
  async createFromQuotation(
    @Param('quotationId') quotationId: string,
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    const project = await this.projectsService.createFromQuotation(quotationId, tenantId);
    return { success: true, data: project };
  }

  @Patch(':projectId')
  @RequirePermission('projects', 'edit')
  async update(
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    return this.projectsService.update(tenantId, projectId, updateProjectDto);
  }

  @Patch(':projectId/status')
  async updateStatus(
    @Param('projectId') projectId: string,
    @Body() updateStatusDto: UpdateProjectStatusDto,
    @Request() req?: any,
  ) {
    const tenantId = this.getTenantId(req);
    const user = req?.user;
    return this.projectsService.updateStatus(tenantId, projectId, updateStatusDto, user);
  }

  @Post('fix-inventory/inv3552')
  @SetMetadata('isPublic', true)
  async fixInventoryINV3552(@Request() req: any) {
    const tenantId = this.getTenantId(req);
    await this.projectsService.forceFixINV3552(tenantId);
    return { success: true, message: 'INV3552 inventory fixed' };
  }

  @Patch(':projectId/restore')
  async restore(@Param('projectId') projectId: string, @Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.projectsService.restore(tenantId, projectId);
  }

  @Delete(':projectId')
  @RequirePermission('projects', 'delete')
  async remove(@Param('projectId') projectId: string, @Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.projectsService.remove(tenantId, projectId);
  }
}

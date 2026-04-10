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
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ComplianceService } from '../services/compliance.service';
import {
  CreateNetMeteringDto, UpdateNetMeteringDto,
  CreateSubsidyDto, UpdateSubsidyDto,
  CreateInspectionDto, UpdateInspectionDto,
  CreateComplianceDocumentDto, UpdateComplianceDocumentDto,
} from '../dto/compliance.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('compliance')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  private getTenantId(req: any): string {
    // TenantGuard sets req.tenant.id after resolving code to ObjectId
    return req.tenant?.id || req.headers['x-tenant-id'] || '';
  }

  // ==================== STATS ====================

  @Get('stats')
  async getStats(@Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.getStats(tenantId);
  }

  // ==================== NET METERING ====================

  @Get('net-metering')
  async findAllNetMetering(
    @Query('status') status?: string,
    @Request() req?: any,
  ) {
    const tenantId = this.getTenantId(req);
    const user = req?.user ? {
      id: req.user.id,
      _id: req.user.id,
      dataScope: req.user.dataScope || 'ASSIGNED',
    } : undefined;
    return this.complianceService.findAllNetMetering(tenantId, user, status);
  }

  @Get('net-metering/:applicationId')
  async findOneNetMetering(
    @Param('applicationId') applicationId: string,
    @Request() req?: any,
  ) {
    const tenantId = this.getTenantId(req);
    const user = req?.user ? {
      id: req.user.id,
      _id: req.user.id,
      dataScope: req.user.dataScope || 'ASSIGNED',
    } : undefined;
    return this.complianceService.findOneNetMetering(tenantId, applicationId, user);
  }

  @Post('net-metering')
  @HttpCode(HttpStatus.CREATED)
  async createNetMetering(
    @Body() createDto: CreateNetMeteringDto,
    @Request() req?: any,
  ) {
    const tenantId = this.getTenantId(req);
    const user = req?.user ? {
      id: req.user.id,
      _id: req.user.id,
      dataScope: req.user.dataScope || 'ASSIGNED',
    } : undefined;
    return this.complianceService.createNetMetering(tenantId, createDto, user);
  }

  @Patch('net-metering/:applicationId')
  async updateNetMetering(
    @Request() req: any,
    @Param('applicationId') applicationId: string,
    @Body() updateDto: UpdateNetMeteringDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.updateNetMetering(tenantId, applicationId, updateDto);
  }

  @Delete('net-metering/:applicationId')
  async removeNetMetering(
    @Request() req: any,
    @Param('applicationId') applicationId: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.removeNetMetering(tenantId, applicationId);
  }

  // ==================== SUBSIDIES ====================

  @Get('subsidies')
  async findAllSubsidies(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.findAllSubsidies(tenantId, status);
  }

  @Get('subsidies/:subsidyId')
  async findOneSubsidy(
    @Request() req: any,
    @Param('subsidyId') subsidyId: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.findOneSubsidy(tenantId, subsidyId);
  }

  @Post('subsidies')
  @HttpCode(HttpStatus.CREATED)
  async createSubsidy(
    @Request() req: any,
    @Body() createDto: CreateSubsidyDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.createSubsidy(tenantId, createDto);
  }

  @Patch('subsidies/:subsidyId')
  async updateSubsidy(
    @Request() req: any,
    @Param('subsidyId') subsidyId: string,
    @Body() updateDto: UpdateSubsidyDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.updateSubsidy(tenantId, subsidyId, updateDto);
  }

  @Delete('subsidies/:subsidyId')
  async removeSubsidy(
    @Request() req: any,
    @Param('subsidyId') subsidyId: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.removeSubsidy(tenantId, subsidyId);
  }

  // ==================== INSPECTIONS ====================

  @Get('inspections')
  async findAllInspections(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.findAllInspections(tenantId, status);
  }

  @Get('inspections/:inspectionId')
  async findOneInspection(
    @Request() req: any,
    @Param('inspectionId') inspectionId: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.findOneInspection(tenantId, inspectionId);
  }

  @Post('inspections')
  @HttpCode(HttpStatus.CREATED)
  async createInspection(
    @Request() req: any,
    @Body() createDto: CreateInspectionDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.createInspection(tenantId, createDto);
  }

  @Patch('inspections/:inspectionId')
  async updateInspection(
    @Request() req: any,
    @Param('inspectionId') inspectionId: string,
    @Body() updateDto: UpdateInspectionDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.updateInspection(tenantId, inspectionId, updateDto);
  }

  @Delete('inspections/:inspectionId')
  async removeInspection(
    @Request() req: any,
    @Param('inspectionId') inspectionId: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.removeInspection(tenantId, inspectionId);
  }

  // ==================== DOCUMENTS ====================

  @Get('documents')
  async findAllDocuments(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.findAllDocuments(tenantId, status, category);
  }

  @Get('documents/:documentId')
  async findOneDocument(
    @Request() req: any,
    @Param('documentId') documentId: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.findOneDocument(tenantId, documentId);
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  async createDocument(
    @Request() req: any,
    @Body() createDto: CreateComplianceDocumentDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.createDocument(tenantId, createDto);
  }

  @Patch('documents/:documentId')
  async updateDocument(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Body() updateDto: UpdateComplianceDocumentDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.updateDocument(tenantId, documentId, updateDto);
  }

  @Delete('documents/:documentId')
  async removeDocument(
    @Request() req: any,
    @Param('documentId') documentId: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.complianceService.removeDocument(tenantId, documentId);
  }
}

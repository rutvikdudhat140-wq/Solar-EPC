import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { LookupService } from '../services/lookup.service';
import { CreateWarehouseDto, UpdateWarehouseDto, CreateCategoryDto, UpdateCategoryDto, CreateUnitDto, UpdateUnitDto } from '../dto/lookup.dto';

@Controller('lookups')
@UseGuards(JwtAuthGuard, TenantGuard)
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  private getTenantId(req: any): string {
    // TenantGuard sets req.tenant.id after resolving code to ObjectId
    return req.tenant?.id || req.headers['x-tenant-id'] || '';
  }

  // Warehouse endpoints
  @Get('warehouses')
  findAllWarehouses(@Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.findAllWarehouses(tenantId);
  }

  @Post('warehouses')
  createWarehouse(@Request() req: any, @Body() dto: CreateWarehouseDto) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.createWarehouse(tenantId, dto);
  }

  @Patch('warehouses/:code')
  updateWarehouse(@Request() req: any, @Param('code') code: string, @Body() dto: UpdateWarehouseDto) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.updateWarehouse(tenantId, code, dto);
  }

  @Delete('warehouses/:code')
  deleteWarehouse(@Request() req: any, @Param('code') code: string) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.deleteWarehouse(tenantId, code);
  }

  // Category endpoints
  @Get('categories')
  findAllCategories(@Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.findAllCategories(tenantId);
  }

  @Post('categories')
  createCategory(@Request() req: any, @Body() dto: CreateCategoryDto) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.createCategory(tenantId, dto);
  }

  @Patch('categories/:code')
  updateCategory(@Request() req: any, @Param('code') code: string, @Body() dto: UpdateCategoryDto) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.updateCategory(tenantId, code, dto);
  }

  @Delete('categories/:code')
  deleteCategory(@Request() req: any, @Param('code') code: string) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.deleteCategory(tenantId, code);
  }

  // Unit endpoints
  @Get('units')
  findAllUnits(@Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.findAllUnits(tenantId);
  }

  @Post('units')
  createUnit(@Request() req: any, @Body() dto: CreateUnitDto) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.createUnit(tenantId, dto);
  }

  @Patch('units/:code')
  updateUnit(@Request() req: any, @Param('code') code: string, @Body() dto: UpdateUnitDto) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.updateUnit(tenantId, code, dto);
  }

  @Delete('units/:code')
  deleteUnit(@Request() req: any, @Param('code') code: string) {
    const tenantId = this.getTenantId(req);
    return this.lookupService.deleteUnit(tenantId, code);
  }
}

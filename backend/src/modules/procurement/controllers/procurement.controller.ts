import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Headers, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../../modules/settings/guards/permission.guard';
import { LoggingGuard } from '../../../common/guards/logging.guard';
import { ProcurementService } from '../services/procurement.service';
import { CreateVendorDto, UpdateVendorDto } from '../dto/create-vendor.dto';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, UpdatePurchaseOrderStatusDto } from '../dto/create-purchase-order.dto';

@Controller('procurement')
@UseGuards(LoggingGuard, JwtAuthGuard, TenantGuard, PermissionGuard)
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  private getTenantId(req: any): string {
    // TenantGuard sets req.tenant.id after resolving code to ObjectId
    return req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId || '';
  }

  // ==================== VENDOR ENDPOINTS ====================

  @Post('vendors')
  async createVendor(@Body() dto: CreateVendorDto, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    const vendor = await this.procurementService.createVendor(dto, tenantId);
    return { success: true, data: vendor };
  }

  @Get('vendors')
  async findAllVendors(@Req() req: any) {
    console.log(`[PROCUREMENT CONTROLLER] START findAllVendors`);
    console.log(`[PROCUREMENT CONTROLLER] req.user =`, JSON.stringify(req.user));
    console.log(`[PROCUREMENT CONTROLLER] req.tenant =`, JSON.stringify(req.tenant));
    const tenantId = this.getTenantId(req);
    const user = req.user;
    console.log(`[PROCUREMENT CONTROLLER] Calling service with tenantId: ${tenantId}, user:`, JSON.stringify(user));
    const vendors = await this.procurementService.findAllVendors(tenantId, user);
    console.log(`[PROCUREMENT CONTROLLER] END findAllVendors`);
    return { success: true, data: vendors };
  }

  @Get('vendors/:id')
  async findVendorById(@Param('id') id: string, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    const vendor = await this.procurementService.findVendorById(id, tenantId);
    return { success: true, data: vendor };
  }

  @Patch('vendors/:id')
  async updateVendor(@Param('id') id: string, @Body() dto: UpdateVendorDto, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    const vendor = await this.procurementService.updateVendor(id, dto, tenantId);
    return { success: true, data: vendor };
  }

  @Delete('vendors/:id')
  async deleteVendor(@Param('id') id: string, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    await this.procurementService.deleteVendor(id, tenantId);
    return { success: true, message: 'Vendor deleted successfully' };
  }

  // ==================== PURCHASE ORDER ENDPOINTS ====================

  @Post('purchase-orders')
  async createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    const po = await this.procurementService.createPurchaseOrder(dto, tenantId);
    return { success: true, data: po };
  }

  @Get('purchase-orders')
  async findAllPurchaseOrders(@Req() req: any) {
    const tenantId = this.getTenantId(req);
    const user = req.user;
    const pos = await this.procurementService.findAllPurchaseOrders(tenantId, user);
    return { success: true, data: pos };
  }

  @Get('purchase-orders/:id')
  async findPurchaseOrderById(@Param('id') id: string, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    const po = await this.procurementService.findPurchaseOrderById(id, tenantId);
    return { success: true, data: po };
  }

  @Patch('purchase-orders/:id/status')
  async updatePurchaseOrderStatus(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderStatusDto, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    const po = await this.procurementService.updatePurchaseOrderStatus(id, dto, tenantId);
    return { success: true, data: po };
  }

  @Patch('purchase-orders/:id')
  async updatePurchaseOrder(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    const po = await this.procurementService.updatePurchaseOrder(id, dto, tenantId);
    return { success: true, data: po };
  }

  @Delete('purchase-orders/:id')
  async deletePurchaseOrder(@Param('id') id: string, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    await this.procurementService.deletePurchaseOrder(id, tenantId);
    return { success: true, message: 'Purchase Order deleted successfully' };
  }

  // ==================== STATS ENDPOINTS ====================

  @Get('stats')
  async getProcurementStats(@Req() req: any) {
    const tenantId = this.getTenantId(req);
    const user = req.user;
    const stats = await this.procurementService.getProcurementStats(tenantId, user);
    return { success: true, data: stats };
  }
}

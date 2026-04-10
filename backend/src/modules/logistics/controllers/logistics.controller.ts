import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../../modules/settings/guards/permission.guard';
import { LoggingGuard } from '../../../common/guards/logging.guard';
import { LogisticsService } from '../services/logistics.service';
import { Dispatch } from '../schemas/dispatch.schema';
import { Vendor } from '../schemas/vendor.schema';
import { CreateLogisticsVendorDto, UpdateLogisticsVendorDto } from '../dto/create-vendor.dto';

@Controller('logistics')
@UseGuards(LoggingGuard, JwtAuthGuard, TenantGuard, PermissionGuard)
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  private getTenantId(req: any): string {
    // TenantGuard sets req.tenant.id after resolving code to ObjectId
    return req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId || '';
  }

  // Dispatch routes
  @Get('dispatches')
  async findAll(@Req() req: any) {
    console.log(`[LOGISTICS CTRL] req.user =`, JSON.stringify(req.user));
    const user = req.user;
    const tenantId = this.getTenantId(req);
    const data = await this.logisticsService.findAll(user, tenantId);
    return { success: true, data };
  }

  @Get('dispatches/:id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    const data = await this.logisticsService.findOne(id, tenantId);
    return { success: true, data };
  }

  @Post('dispatches')
  async create(@Body() createDto: Partial<Dispatch>, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    const data = await this.logisticsService.create(createDto, tenantId);
    return { success: true, data, message: 'Dispatch created successfully' };
  }

  @Patch('dispatches/:id')
  async update(@Param('id') id: string, @Body() updateDto: Partial<Dispatch>, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    const data = await this.logisticsService.update(id, updateDto, req.user, tenantId);
    return { success: true, data, message: 'Dispatch updated successfully' };
  }

  @Patch('dispatches/:id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string, @Req() req: any) {
    const user = req.user;
    const tenantId = this.getTenantId(req);
    const data = await this.logisticsService.updateStatus(id, status, user, tenantId);
    return { success: true, data, message: 'Status updated successfully' };
  }

  @Delete('dispatches/:id')
  async delete(@Param('id') id: string) {
    await this.logisticsService.delete(id);
    return { success: true, message: 'Dispatch deleted successfully' };
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    const user = req.user;
    const tenantId = this.getTenantId(req);
    const data = await this.logisticsService.getStats(user, tenantId);
    return { success: true, data };
  }

  // Vendor routes
  @Get('vendors')
  async findAllVendors(@Req() req: any) {
    console.log(`[LOGISTICS CTRL vendors] req.user =`, JSON.stringify(req.user));
    const user = req.user;
    const tenantId = this.getTenantId(req);
    const data = await this.logisticsService.findAllVendors(user, tenantId);
    return { success: true, data };
  }

  @Get('vendors/:id')
  async findVendorById(@Param('id') id: string, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    const data = await this.logisticsService.findVendorById(id, tenantId);
    return { success: true, data };
  }

  @Post('vendors')
  async createVendor(@Body() createDto: CreateLogisticsVendorDto, @Req() req: any) {
    try {
      console.log('[VENDOR CREATE] Received data:', JSON.stringify(createDto));
      const tenantId = this.getTenantId(req);
      const data = await this.logisticsService.createVendor(createDto, tenantId);
      console.log('[VENDOR CREATE] Saved vendor:', JSON.stringify(data));
      return { success: true, data, message: 'Vendor created successfully' };
    } catch (error: any) {
      console.error('[VENDOR CREATE] Error:', error.message, error.stack);
      return { success: false, error: error.message || 'Unknown error', code: error.code };
    }
  }

  @Patch('vendors/:id')
  async updateVendor(@Param('id') id: string, @Body() updateDto: UpdateLogisticsVendorDto, @Req() req: any) {
    try {
      const tenantId = this.getTenantId(req);
      const data = await this.logisticsService.updateVendor(id, updateDto, tenantId);
      return { success: true, data, message: 'Vendor updated successfully' };
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      console.error('Error response:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error', code: error.code };
    }
  }

  @Delete('vendors/:id')
  async deleteVendor(@Param('id') id: string, @Req() req: any) {
    const tenantId = this.getTenantId(req);
    await this.logisticsService.deleteVendor(id, tenantId);
    return { success: true, message: 'Vendor deleted successfully' };
  }

  // Vendor delivery - adds stock to inventory
  @Post('vendors/:id/delivery')
  async vendorDelivery(
    @Param('id') id: string,
    @Body('itemName') itemName: string,
    @Body('quantity') quantity: number,
    @Req() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    const data = await this.logisticsService.vendorDelivery(id, itemName, quantity, tenantId);
    return { success: true, data, message: 'Stock added to inventory from vendor' };
  }
}

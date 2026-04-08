import { Controller, Get, Post, Put, Delete, Body, Param, Req, Query } from '@nestjs/common';
import { Request } from 'express';
import { FinanceVendorService } from '../services/finance-vendor.service';

@Controller('finance/vendors')
export class FinanceVendorController {
  constructor(private readonly financeVendorService: FinanceVendorService) {}

  private getTenantId(req: Request): string {
    return (req as any).user?.tenantId || req.headers['x-tenant-id'] || 'default';
  }

  @Get()
  async getAllVendors(@Req() req: Request) {
    const tenantId = this.getTenantId(req);
    
    // Auto-sync all procurement vendors and their POs on every GET request
    try {
      await this.financeVendorService.syncAllVendorsFromProcurement(tenantId);
    } catch (syncErr) {
      console.error('[FINANCE] Auto-sync failed:', syncErr);
    }
    
    return this.financeVendorService.findAll(tenantId);
  }

  @Get(':vendorId')
  async getVendorById(@Req() req: Request, @Param('vendorId') vendorId: string) {
    const tenantId = this.getTenantId(req);
    return this.financeVendorService.findByVendorId(tenantId, vendorId);
  }

  @Post('sync')
  async syncVendor(@Req() req: Request, @Body() body: {
    vendorId: string;
    vendorName: string;
    vendorCode: string;
    totalPayable?: number;
    totalPaid?: number;
    totalPurchaseOrders?: number;
    procurementVendor?: any;
    purchaseOrders?: any[];
  }) {
    const tenantId = this.getTenantId(req);
    
    // If procurementVendor and purchaseOrders are provided, use the full sync method
    if (body.procurementVendor && body.purchaseOrders) {
      return this.financeVendorService.syncVendorFromProcurement(
        tenantId,
        body.procurementVendor,
        body.purchaseOrders
      );
    }
    
    // Otherwise, use the simple createOrUpdate method
    return this.financeVendorService.createOrUpdateVendor(tenantId, body);
  }

  @Post(':vendorId/payment')
  async recordPayment(
    @Req() req: Request,
    @Param('vendorId') vendorId: string,
    @Body() body: {
      amount: number;
      date: string;
      poId?: string;
      poNumber?: string;
      notes?: string;
    }
  ) {
    const tenantId = this.getTenantId(req);
    return this.financeVendorService.recordVendorPayment(tenantId, vendorId, body);
  }

  @Delete(':vendorId')
  async deleteVendor(@Req() req: Request, @Param('vendorId') vendorId: string) {
    const tenantId = this.getTenantId(req);
    await this.financeVendorService.deleteVendor(tenantId, vendorId);
    return { success: true, message: 'Vendor deleted successfully' };
  }

  // ==================== FINANCE PURCHASE ORDERS ENDPOINTS ====================

  @Get('purchase-orders')
  async getAllPurchaseOrders(@Req() req: Request) {
    const tenantId = this.getTenantId(req);
    return this.financeVendorService.findAllPurchaseOrders(tenantId);
  }

  @Get('purchase-orders/:poId')
  async getPurchaseOrderById(@Req() req: Request, @Param('poId') poId: string) {
    const tenantId = this.getTenantId(req);
    return this.financeVendorService.findPurchaseOrderByPoId(tenantId, poId);
  }

  @Get('purchase-orders-by-vendor/:vendorId')
  async getPurchaseOrdersByVendor(@Req() req: Request, @Param('vendorId') vendorId: string) {
    const tenantId = this.getTenantId(req);
    return this.financeVendorService.findPurchaseOrdersByVendorId(tenantId, vendorId);
  }
}

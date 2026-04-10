import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../settings/guards/permission.guard';
import { ItemsService } from '../services/items.service';
import { InventoryService } from '../services/inventory.service';
import { CreateItemDto, UpdateItemDto } from '../dto/item.dto';

@Controller('items')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly inventoryService: InventoryService,
  ) {}

  private getTenantId(req: any): string {
    // TenantGuard sets req.tenant.id after resolving code to ObjectId
    return req.tenant?.id || req.headers['x-tenant-id'] || '';
  }

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('itemGroupId') itemGroupId?: string,
    @Req() req?: any,
  ) {
    const tenantId = this.getTenantId(req);
    // Extract user with dataScope from JWT (same pattern as Finance controller)
    const user = req?.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    console.log(`[ITEMS CTRL] tenantId: ${tenantId}, user.dataScope:`, user?.dataScope);
    return this.itemsService.findAll(tenantId, user, search, itemGroupId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    return this.itemsService.findOne(tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() createItemDto: CreateItemDto) {
    const tenantId = this.getTenantId(req);
    return this.itemsService.create(tenantId, createItemDto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
    const tenantId = this.getTenantId(req);
    return this.itemsService.update(tenantId, id, updateItemDto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    return this.itemsService.remove(tenantId, id);
  }

  @Delete('bulk/delete')
  bulkDelete(@Req() req: any, @Body('ids') ids: string[]) {
    const tenantId = this.getTenantId(req);
    return this.itemsService.bulkDelete(tenantId, ids);
  }

  @Post(':id/stock-in')
  stockIn(
    @Req() req: any,
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('poReference') poReference?: string,
    @Body('receivedDate') receivedDate?: string,
    @Body('remarks') remarks?: string,
    @Body('warehouse') warehouse?: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.itemsService.stockIn(tenantId, id, quantity, poReference, receivedDate, remarks, warehouse);
  }

  @Post(':id/stock-out')
  stockOut(
    @Req() req: any,
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('projectId') projectId?: string,
    @Body('issuedDate') issuedDate?: string,
    @Body('remarks') remarks?: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.itemsService.stockOut(tenantId, id, quantity, projectId, issuedDate, remarks);
  }

  @Post('transfers')
  transfer(
    @Req() req: any,
    @Body() transferDto: { fromInventoryId: string; toWarehouseId: string; quantity: number; remarks?: string },
  ) {
    const tenantId = this.getTenantId(req);
    return this.itemsService.transfer(tenantId, transferDto.fromInventoryId, transferDto.toWarehouseId, transferDto.quantity, transferDto.remarks);
  }
}

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
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../settings/guards/permission.guard';
import { InventoryService } from '../services/inventory.service';
import { CreateInventoryDto, UpdateInventoryDto, StockInDto, StockOutDto, CreateReservationDto, UpdateReservationDto } from '../dto/inventory.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    const user = req.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    return this.inventoryService.findAll(tenantId, user, category, search);
  }

  @Get('categories')
  async getCategories(
    @Request() req?: any,
  ) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    const user = req.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    return this.inventoryService.getCategories(tenantId, user);
  }

  @Get('units')
  async getUnits(
    @Request() req?: any,
  ) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    const user = req.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    return this.inventoryService.getUnits(tenantId, user);
  }

  @Get('stats')
  async getStats(
    @Request() req?: any,
  ) {
    // TenantGuard sets req.tenant.id after resolving code to ObjectId
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    const user = req.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    console.log('[Inventory Stats] tenantId:', tenantId);
    return this.inventoryService.getStats(tenantId, user);
  }

  @Get('by-category')
  async getItemsByCategory(@Request() req?: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    const user = req.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    return this.inventoryService.getItemsByCategory(tenantId, user);
  }

  @Get(':itemId')
  async findOne(@Param('itemId') itemId: string, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.findOne(tenantId, itemId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateInventoryDto, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.create(tenantId, createDto);
  }

  @Patch(':itemId')
  async update(@Param('itemId') itemId: string, @Body() updateDto: UpdateInventoryDto, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.update(tenantId, itemId, updateDto);
  }

  @Post(':itemId/stock-in')
  async stockIn(@Param('itemId') itemId: string, @Body() stockInDto: StockInDto, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.stockIn(tenantId, itemId, stockInDto);
  }

  @Post(':itemId/stock-out')
  async stockOut(@Param('itemId') itemId: string, @Body() stockOutDto: StockOutDto, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.stockOut(tenantId, itemId, stockOutDto);
  }

  @Post('transfers')
  async transfer(@Body() transferDto: { fromInventoryId: string; toWarehouseId: string; quantity: number; remarks?: string }, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.transfer(tenantId, transferDto.fromInventoryId, transferDto.toWarehouseId, transferDto.quantity, transferDto.remarks);
  }

  @Delete(':itemId')
  async remove(@Param('itemId') itemId: string, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.remove(tenantId, itemId);
  }

  @Post('reservations')
  @HttpCode(HttpStatus.CREATED)
  async createReservation(@Body() createDto: CreateReservationDto, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.createReservation(tenantId, createDto);
  }

  @Get('reservations/by-project/:projectId')
  async getReservationsByProject(@Param('projectId') projectId: string, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.getReservationsByProject(tenantId, projectId);
  }

  @Get('reservations/by-item/:itemId')
  async getReservationsByItem(@Param('itemId') itemId: string, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.getReservationsByItem(tenantId, itemId);
  }

  @Get(':itemId/with-reservations')
  async findOneWithReservations(@Param('itemId') itemId: string, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.findOneWithReservations(tenantId, itemId);
  }

  @Patch('reservations/:reservationId')
  async updateReservation(@Param('reservationId') reservationId: string, @Body() updateDto: UpdateReservationDto, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.updateReservation(tenantId, reservationId, updateDto);
  }

  @Patch('reservations/:reservationId/cancel')
  async cancelReservation(@Param('reservationId') reservationId: string, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.cancelReservation(tenantId, reservationId);
  }

  @Patch('reservations/:reservationId/fulfill')
  async fulfillReservation(@Param('reservationId') reservationId: string, @Request() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || '';
    return this.inventoryService.fulfillReservation(tenantId, reservationId);
  }
}

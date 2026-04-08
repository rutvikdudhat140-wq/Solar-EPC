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
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const user = req.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    return this.inventoryService.findAll(tenantId, user, category, search);
  }

  @Get('categories')
  async getCategories(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Request() req?: any,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const user = req.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    return this.inventoryService.getCategories(tenantId, user);
  }

  @Get('units')
  async getUnits(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Request() req?: any,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const user = req.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    return this.inventoryService.getUnits(tenantId, user);
  }

  @Get('stats')
  async getStats(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Request() req?: any,
  ) {
    const tenantId = headerTenantId || queryTenantId || '';
    const user = req.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    console.log('[Inventory Stats] tenantId:', tenantId);
    return this.inventoryService.getStats(tenantId, user);
  }

  @Get('by-category')
  async getItemsByCategory(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Request() req?: any,
  ) {
    const tenantId = headerTenantId || queryTenantId || '';
    const user = req.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    return this.inventoryService.getItemsByCategory(tenantId, user);
  }

  @Get(':itemId')
  async findOne(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.findOne(tenantId, itemId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createDto: CreateInventoryDto,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.create(tenantId, createDto);
  }

  @Patch(':itemId')
  async update(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateInventoryDto,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.update(tenantId, itemId, updateDto);
  }

  @Post(':itemId/stock-in')
  async stockIn(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
    @Body() stockInDto: StockInDto,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.stockIn(tenantId, itemId, stockInDto);
  }

  @Post(':itemId/stock-out')
  async stockOut(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
    @Body() stockOutDto: StockOutDto,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.stockOut(tenantId, itemId, stockOutDto);
  }

  @Post('transfers')
  async transfer(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() transferDto: { fromInventoryId: string; toWarehouseId: string; quantity: number; remarks?: string },
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.transfer(tenantId, transferDto.fromInventoryId, transferDto.toWarehouseId, transferDto.quantity, transferDto.remarks);
  }

  @Delete(':itemId')
  async remove(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.remove(tenantId, itemId);
  }

  @Post('reservations')
  @HttpCode(HttpStatus.CREATED)
  async createReservation(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createDto: CreateReservationDto,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.createReservation(tenantId, createDto);
  }

  @Get('reservations/by-project/:projectId')
  async getReservationsByProject(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.getReservationsByProject(tenantId, projectId);
  }

  @Get('reservations/by-item/:itemId')
  async getReservationsByItem(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.getReservationsByItem(tenantId, itemId);
  }

  @Get(':itemId/with-reservations')
  async findOneWithReservations(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.findOneWithReservations(tenantId, itemId);
  }

  @Patch('reservations/:reservationId')
  async updateReservation(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('reservationId') reservationId: string,
    @Body() updateDto: UpdateReservationDto,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.updateReservation(tenantId, reservationId, updateDto);
  }

  @Patch('reservations/:reservationId/cancel')
  async cancelReservation(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('reservationId') reservationId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.cancelReservation(tenantId, reservationId);
  }

  @Patch('reservations/:reservationId/fulfill')
  async fulfillReservation(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('reservationId') reservationId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.inventoryService.fulfillReservation(tenantId, reservationId);
  }
}

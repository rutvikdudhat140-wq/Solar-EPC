import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { ReminderService } from '../services/reminder.service';
import { ReminderRuleSyncService } from '../services/reminder-rule-sync.service';
import { CreateReminderDto, UpdateReminderDto, QueryReminderDto, SnoozeReminderDto } from '../dto/reminder.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    tenantId?: string;
    role?: string;
  };
  tenant?: {
    id: string;
  };
}

@Controller('reminders')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReminderController {
  constructor(
    private readonly reminderService: ReminderService,
    private readonly reminderRuleSyncService: ReminderRuleSyncService,
  ) {}

  private getTenantId(req: RequestWithUser): string {
    // TenantGuard sets req.tenant.id after resolving tenant code to ObjectId
    const tid = req.tenant?.id || req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tid) {
      throw new Error('Tenant ID required');
    }
    return tid;
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() dto: CreateReminderDto) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.id;
    const reminder = await this.reminderService.create(tenantId, userId, dto);
    return { success: true, data: reminder };
  }

  @Get()
  async findAll(@Req() req: RequestWithUser, @Query() query: QueryReminderDto) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.id;
    const userRole = req.user.role || 'User';
    const result = await this.reminderService.findAll(tenantId, query, userRole, userId);
    return { success: true, ...result };
  }

  @Get('stats')
  async getStats(@Req() req: RequestWithUser) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.id;
    const userRole = req.user.role || 'User';
    const stats = await this.reminderService.getStats(tenantId, userId, userRole);
    return { success: true, data: stats };
  }

  @Get('upcoming')
  async getUpcoming(@Req() req: RequestWithUser, @Query('hours') hours?: string) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.id;
    const userRole = req.user.role || 'User';
    const reminders = await this.reminderService.getUpcomingReminders(
      tenantId,
      userId,
      userRole,
      hours ? parseInt(hours) : 24
    );
    return { success: true, data: reminders };
  }

  @Get(':id')
  async findById(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.id;
    const userRole = req.user.role || 'User';
    const reminder = await this.reminderService.findById(tenantId, id, userRole, userId);
    return { success: true, data: reminder };
  }

  @Put(':id')
  async update(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateReminderDto) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.id;
    const userRole = req.user.role || 'User';
    const reminder = await this.reminderService.update(tenantId, id, userId, userRole, dto);
    return { success: true, data: reminder };
  }

  @Delete(':id')
  async delete(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.id;
    const userRole = req.user.role || 'User';
    await this.reminderService.delete(tenantId, id, userId, userRole);
    return { success: true, message: 'Reminder deleted' };
  }

  @Post(':id/complete')
  async complete(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.id;
    const reminder = await this.reminderService.complete(tenantId, id, userId);
    return { success: true, data: reminder };
  }

  @Post(':id/snooze')
  async snooze(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: SnoozeReminderDto) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.id;
    const reminder = await this.reminderService.snooze(tenantId, id, userId, dto.snoozeMinutes);
    return { success: true, data: reminder };
  }

  @Post(':id/cancel')
  async cancel(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.id;
    const reminder = await this.reminderService.cancel(tenantId, id, userId);
    return { success: true, data: reminder };
  }

  @Post('admin/sync-synthetic')
  async syncSynthetic(@Req() req: RequestWithUser) {
    const tenantId = this.getTenantId(req);
    const userRole = req.user.role || 'User';
    
    if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
      return { success: false, message: 'Admin access required' };
    }
    
    try {
      await this.reminderRuleSyncService.syncSyntheticReminders();
      return { success: true, message: 'Synthetic reminder sync triggered' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Sync failed' };
    }
  }
}

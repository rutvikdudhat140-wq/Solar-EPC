import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reminder, ReminderDocument } from '../schemas/reminder.schema';
import { CreateReminderDto, UpdateReminderDto, QueryReminderDto } from '../dto/reminder.dto';
import { normalizeReminderModule } from '../constants/reminder-modules';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectModel(Reminder.name) private readonly reminderModel: Model<ReminderDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ObjectId: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  // ==================== CRUD OPERATIONS ====================

  async create(tenantId: string, userId: string, dto: CreateReminderDto): Promise<any> {
    // Calculate remindAt if not provided
    let remindAt = dto.remindAt || dto.dueDate;
    
    if (dto.triggerType === 'relative' && dto.offsetValue && dto.offsetUnit) {
      remindAt = this.calculateRelativeDate(dto.dueDate, dto.offsetValue, dto.offsetUnit, dto.relativeTo);
    } else if (dto.triggerType === 'date' && dto.triggerDate) {
      remindAt = dto.triggerDate;
    }

    const reminder = new this.reminderModel({
      ...dto,
      module: normalizeReminderModule(dto.module),
      tenantId: this.toObjectId(tenantId),
      createdBy: this.toObjectId(dto.createdBy || userId),
      assignedTo: this.toObjectId(dto.assignedTo),
      remindAt,
      status: 'pending',
      isTriggered: false,
      triggerCount: 0,
      sourceKind: dto.sourceKind || 'manual',
      sourceKey: dto.sourceKey,
    });

    const saved = await reminder.save();
    this.logger.log(`Reminder created: ${saved._id} for tenant ${tenantId}`);
    return saved;
  }

  async findAll(tenantId: string, query: QueryReminderDto, userRole: string, userId: string): Promise<{ reminders: any[]; total: number }> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    // Role-based filtering - only apply if no specific assignedTo filter requested
    if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
      if (query.assignedTo) {
        // Non-admin can only view their own reminders even with assignedTo filter
        filter.assignedTo = new Types.ObjectId(userId);
      } else {
        filter.assignedTo = new Types.ObjectId(userId);
      }
    } else if (query.assignedTo) {
      // Admin can filter by specific assignedTo
      filter.assignedTo = new Types.ObjectId(query.assignedTo);
    }

    if (query.module) {
      filter.module = normalizeReminderModule(query.module);
    }

    if (query.priority && query.priority !== 'all') {
      filter.priority = query.priority;
    }

    // Handle status filter - don't overwrite with overdue filter
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    } else if (!query.includeOverdue) {
      filter.status = { $nin: ['overdue'] };
    }

    const limit = query.limit || 50;
    const skip = query.skip || 0;

    const [reminders, total] = await Promise.all([
      this.reminderModel
        .find(filter)
        .sort({ priority: -1, dueDate: 1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .lean(),
      this.reminderModel.countDocuments(filter),
    ]);

    this.logger.debug(`Found ${reminders.length} reminders for tenant ${tenantId}, user ${userId}, role ${userRole}`);
    this.logger.debug(`Query filter: ${JSON.stringify(filter)}`);
    return { reminders, total };
  }

  async findById(tenantId: string, id: string, userRole: string, userId: string): Promise<any> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
      filter.assignedTo = new Types.ObjectId(userId);
    }

    const reminder = await this.reminderModel
      .findOne(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    return reminder;
  }

  async update(tenantId: string, id: string, userId: string, userRole: string, dto: UpdateReminderDto): Promise<any> {
    const reminder = await this.findById(tenantId, id, userRole, userId);

    // Only creator or admin can update
    if (reminder.createdBy.toString() !== userId) {
      throw new BadRequestException('Only creator can update reminder');
    }

    // Recalculate remindAt if trigger config changed
    let remindAt = dto.remindAt;
    if (dto.triggerType === 'relative' && dto.offsetValue) {
      remindAt = this.calculateRelativeDate(
        dto.dueDate || reminder.dueDate,
        dto.offsetValue,
        dto.offsetUnit || 'days',
        'dueDate'
      );
    } else if (dto.triggerType === 'date' && dto.triggerDate) {
      remindAt = dto.triggerDate;
    }

    const updated = await this.reminderModel.findByIdAndUpdate(
      id,
      { ...dto, remindAt, updatedAt: new Date() },
      { new: true }
    ).lean();

    this.logger.log(`Reminder updated: ${id}`);
    return updated;
  }

  async delete(tenantId: string, id: string, userId: string, userRole: string): Promise<void> {
    const reminder = await this.findById(tenantId, id, userRole, userId);

    if (reminder.createdBy.toString() !== userId) {
      throw new BadRequestException('Only creator can delete reminder');
    }

    await this.reminderModel.findByIdAndUpdate(id, { isDeleted: true });
    this.logger.log(`Reminder deleted: ${id}`);
  }

  // ==================== STATUS OPERATIONS ====================

  async complete(tenantId: string, id: string, userId: string): Promise<any> {
    const updated = await this.reminderModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        assignedTo: new Types.ObjectId(userId),
      },
      { status: 'completed', updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!updated) {
      throw new NotFoundException('Reminder not found');
    }

    this.logger.log(`Reminder completed: ${id}`);
    return updated;
  }

  async snooze(tenantId: string, id: string, userId: string, snoozeMinutes: number): Promise<any> {
    const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);

    const updated = await this.reminderModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        assignedTo: new Types.ObjectId(userId),
      },
      {
        isSnoozed: true,
        snoozedUntil,
        remindAt: snoozedUntil,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!updated) {
      throw new NotFoundException('Reminder not found');
    }

    this.logger.log(`Reminder snoozed: ${id} until ${snoozedUntil}`);
    return updated;
  }

  async cancel(tenantId: string, id: string, userId: string): Promise<any> {
    const updated = await this.reminderModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        $or: [
          { createdBy: new Types.ObjectId(userId) },
          { assignedTo: new Types.ObjectId(userId) },
        ],
      },
      { status: 'cancelled', updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!updated) {
      throw new NotFoundException('Reminder not found');
    }

    this.logger.log(`Reminder cancelled: ${id}`);
    return updated;
  }

  // ==================== SCHEDULER OPERATIONS ====================

  async getPendingRemindersToTrigger(): Promise<any[]> {
    const now = new Date();

    return this.reminderModel.find({
      status: 'pending',
      remindAt: { $lte: now },
      isTriggered: false,
      isSnoozed: { $ne: true },
      $or: [
        { snoozedUntil: { $exists: false } },
        { snoozedUntil: { $lte: now } },
      ],
    }).lean();
  }

  async markTriggered(id: string): Promise<void> {
    await this.reminderModel.findByIdAndUpdate(id, {
      isTriggered: true,
      lastTriggeredAt: new Date(),
      $inc: { triggerCount: 1 },
    });
  }

  async updateOverdueReminders(): Promise<number> {
    const now = new Date();

    const result = await this.reminderModel.updateMany(
      {
        status: 'pending',
        dueDate: { $lt: now },
      },
      {
        status: 'overdue',
      }
    );

    return result.modifiedCount;
  }

  async handleRecurringReminder(reminder: any): Promise<void> {
    if (!reminder.recurringPattern) return;

    const nextRemindAt = this.calculateNextOccurrence(
      reminder.remindAt,
      reminder.recurringPattern,
      reminder.recurringDays,
      reminder.recurringTime
    );

    // Create next occurrence
    await this.reminderModel.create({
      ...reminder,
      _id: undefined,
      status: 'pending',
      isTriggered: false,
      triggerCount: 0,
      remindAt: nextRemindAt,
      dueDate: nextRemindAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ==================== HELPER METHODS ====================

  private calculateRelativeDate(
    baseDate: Date,
    offsetValue: number,
    offsetUnit: string,
    relativeTo?: string
  ): Date {
    const date = new Date(baseDate);
    const multiplier = offsetUnit === 'minutes' ? 1 : offsetUnit === 'hours' ? 60 : 24 * 60;
    const minutes = offsetValue * multiplier;
    
    // For "before" logic (negative offset), subtract minutes
    date.setMinutes(date.getMinutes() - minutes);
    return date;
  }

  private calculateNextOccurrence(
    currentDate: Date,
    pattern: string,
    days?: number[],
    time?: string
  ): Date {
    const next = new Date(currentDate);
    
    if (pattern === 'daily') {
      next.setDate(next.getDate() + 1);
    } else if (pattern === 'weekly' && days && days.length > 0) {
      // Find next occurrence based on days of week
      const currentDay = next.getDay();
      const sortedDays = days.sort((a, b) => a - b);
      let daysToAdd = 0;
      
      for (const day of sortedDays) {
        if (day > currentDay) {
          daysToAdd = day - currentDay;
          break;
        }
      }
      
      if (daysToAdd === 0) {
        daysToAdd = 7 - currentDay + sortedDays[0];
      }
      
      next.setDate(next.getDate() + daysToAdd);
    } else if (pattern === 'monthly') {
      next.setMonth(next.getMonth() + 1);
    }

    // Set time if provided
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      next.setHours(hours, minutes, 0, 0);
    }

    return next;
  }

  // ==================== DASHBOARD STATS ====================

  async getStats(tenantId: string, userId: string, userRole: string): Promise<any> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
      filter.assignedTo = new Types.ObjectId(userId);
    }

    const [total, pending, completed, overdue, critical, high] = await Promise.all([
      this.reminderModel.countDocuments(filter),
      this.reminderModel.countDocuments({ ...filter, status: 'pending' }),
      this.reminderModel.countDocuments({ ...filter, status: 'completed' }),
      this.reminderModel.countDocuments({ ...filter, status: 'overdue' }),
      this.reminderModel.countDocuments({ ...filter, status: 'pending', priority: 'critical' }),
      this.reminderModel.countDocuments({ ...filter, status: 'pending', priority: 'high' }),
    ]);

    return { total, pending, completed, overdue, critical, high };
  }

  async getUpcomingReminders(tenantId: string, userId: string, userRole: string, hours: number = 24): Promise<any[]> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
      status: 'pending',
      remindAt: {
        $gte: new Date(),
        $lte: new Date(Date.now() + hours * 60 * 60 * 1000),
      },
    };

    if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
      filter.assignedTo = new Types.ObjectId(userId);
    }

    return this.reminderModel
      .find(filter)
      .sort({ remindAt: 1 })
      .populate('assignedTo', 'name email')
      .lean();
  }

  async upsertSyntheticReminder(
    tenantId: string,
    payload: {
      title: string;
      description?: string;
      module: string;
      dueDate: Date;
      remindAt?: Date;
      assignedTo: string;
      createdBy: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      type?: 'system' | 'custom' | 'smart';
      notificationChannels?: string[];
      metadata?: Record<string, any>;
      sourceKey: string;
      sourceKind?: 'manual' | 'event' | 'synthetic';
      isCustom?: boolean;
      triggerType?: 'date' | 'relative' | 'recurring';
    },
  ): Promise<any> {
    const normalizedModule = normalizeReminderModule(payload.module);
    const filter = {
      tenantId: this.toObjectId(tenantId),
      module: normalizedModule,
      sourceKey: payload.sourceKey,
      sourceKind: payload.sourceKind || 'synthetic',
      isDeleted: false,
      status: { $in: ['pending', 'overdue'] },
    };

    const update = {
      title: payload.title,
      description: payload.description || '',
      module: normalizedModule,
      dueDate: payload.dueDate,
      remindAt: payload.remindAt || payload.dueDate,
      assignedTo: this.toObjectId(payload.assignedTo),
      createdBy: this.toObjectId(payload.createdBy),
      priority: payload.priority || 'medium',
      type: payload.type || 'smart',
      notificationChannels: payload.notificationChannels || ['in-app'],
      metadata: payload.metadata || {},
      sourceKey: payload.sourceKey,
      sourceKind: payload.sourceKind || 'synthetic',
      isCustom: payload.isCustom ?? false,
      triggerType: payload.triggerType || 'date',
      status: 'pending',
      isDeleted: false,
      isTriggered: false,
      updatedAt: new Date(),
    };

    return this.reminderModel.findOneAndUpdate(
      filter,
      {
        $set: update,
        $setOnInsert: {
          tenantId: this.toObjectId(tenantId),
          triggerCount: 0,
          createdAt: new Date(),
        },
      },
      { new: true, upsert: true },
    ).lean();
  }

  async resolveSyntheticReminderState(
    tenantId: string,
    module: string,
    activeSourceKeys: string[],
    resolvedStatus: 'completed' | 'cancelled' = 'completed',
  ): Promise<void> {
    await this.reminderModel.updateMany(
      {
        tenantId: this.toObjectId(tenantId),
        module: normalizeReminderModule(module),
        sourceKind: 'synthetic',
        isDeleted: false,
        status: { $in: ['pending', 'overdue'] },
        ...(activeSourceKeys.length > 0 ? { sourceKey: { $nin: activeSourceKeys } } : {}),
      },
      {
        $set: {
          status: resolvedStatus,
          updatedAt: new Date(),
        },
      },
    );
  }
}

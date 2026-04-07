import { IsString, IsOptional, IsEnum, IsDate, IsMongoId, IsBoolean, IsNumber, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReminderDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['system', 'custom', 'smart'])
  @IsOptional()
  type?: 'system' | 'custom' | 'smart';

  @IsString()
  module!: string;

  @IsMongoId()
  @IsOptional()
  referenceId?: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsDate()
  @Type(() => Date)
  dueDate!: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  remindAt?: Date;

  @IsMongoId()
  assignedTo!: string;

  @IsMongoId()
  @IsOptional()
  createdBy?: string;

  @IsBoolean()
  @IsOptional()
  isCustom?: boolean;

  @IsEnum(['date', 'relative', 'recurring'])
  @IsOptional()
  triggerType?: 'date' | 'relative' | 'recurring';

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  triggerDate?: Date;

  @IsEnum(['createdAt', 'dueDate', 'lastActivity'])
  @IsOptional()
  relativeTo?: 'createdAt' | 'dueDate' | 'lastActivity';

  @IsNumber()
  @IsOptional()
  offsetValue?: number;

  @IsEnum(['minutes', 'hours', 'days'])
  @IsOptional()
  offsetUnit?: 'minutes' | 'hours' | 'days';

  @IsEnum(['daily', 'weekly', 'monthly'])
  @IsOptional()
  recurringPattern?: 'daily' | 'weekly' | 'monthly';

  @IsArray()
  @IsOptional()
  recurringDays?: number[];

  @IsString()
  @IsOptional()
  recurringTime?: string;

  @IsArray()
  @IsOptional()
  notificationChannels?: string[];

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class UpdateReminderDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  remindAt?: Date;

  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @IsEnum(['pending', 'completed', 'cancelled', 'overdue'])
  @IsOptional()
  status?: 'pending' | 'completed' | 'cancelled' | 'overdue';

  @IsEnum(['date', 'relative', 'recurring'])
  @IsOptional()
  triggerType?: 'date' | 'relative' | 'recurring';

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  triggerDate?: Date;

  @IsEnum(['createdAt', 'dueDate', 'lastActivity'])
  @IsOptional()
  relativeTo?: 'createdAt' | 'dueDate' | 'lastActivity';

  @IsNumber()
  @IsOptional()
  offsetValue?: number;

  @IsEnum(['minutes', 'hours', 'days'])
  @IsOptional()
  offsetUnit?: 'minutes' | 'hours' | 'days';

  @IsEnum(['daily', 'weekly', 'monthly'])
  @IsOptional()
  recurringPattern?: 'daily' | 'weekly' | 'monthly';

  @IsArray()
  @IsOptional()
  notificationChannels?: string[];

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class SnoozeReminderDto {
  @IsNumber()
  snoozeMinutes!: number;
}

export class QueryReminderDto {
  @IsEnum(['pending', 'completed', 'cancelled', 'overdue', 'all'])
  @IsOptional()
  status?: 'pending' | 'completed' | 'cancelled' | 'overdue' | 'all';

  @IsString()
  @IsOptional()
  module?: string;

  @IsEnum(['low', 'medium', 'high', 'critical', 'all'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' | 'critical' | 'all';

  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @IsBoolean()
  @IsOptional()
  includeOverdue?: boolean;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  skip?: number;
}

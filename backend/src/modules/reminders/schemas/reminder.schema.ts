import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReminderDocument = Reminder & Document;

@Schema({ timestamps: true, collection: 'reminders' })
export class Reminder extends Document {
  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: ['system', 'custom', 'smart'], default: 'custom' })
  type!: 'system' | 'custom' | 'smart';

  @Prop({ required: true })
  module!: string; // crm, hrm, finance, inventory, procurement, service, etc

  @Prop({ type: Types.ObjectId })
  referenceId?: Types.ObjectId; // leadId, invoiceId, projectId, etc

  @Prop({ required: true, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' })
  priority!: 'low' | 'medium' | 'high' | 'critical';

  @Prop({ required: true })
  dueDate!: Date;

  @Prop({ required: true })
  remindAt!: Date;

  @Prop({ required: true, enum: ['pending', 'completed', 'cancelled', 'overdue'], default: 'pending' })
  status!: 'pending' | 'completed' | 'cancelled' | 'overdue';

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  assignedTo!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Tenant' })
  tenantId!: Types.ObjectId;

  // Custom Reminder Configuration
  @Prop({ default: false })
  isCustom!: boolean;

  @Prop({ enum: ['date', 'relative', 'recurring'], default: 'date' })
  triggerType!: 'date' | 'relative' | 'recurring';

  // Date-based trigger
  @Prop()
  triggerDate?: Date;

  // Relative-based trigger
  @Prop({ enum: ['createdAt', 'dueDate', 'lastActivity'] })
  relativeTo?: 'createdAt' | 'dueDate' | 'lastActivity';

  @Prop()
  offsetValue?: number;

  @Prop({ enum: ['minutes', 'hours', 'days'] })
  offsetUnit?: 'minutes' | 'hours' | 'days';

  // Recurring trigger
  @Prop({ enum: ['daily', 'weekly', 'monthly'] })
  recurringPattern?: 'daily' | 'weekly' | 'monthly';

  @Prop({ type: [Number], default: [] })
  recurringDays?: number[]; // 0=Sunday, 1=Monday, etc

  @Prop()
  recurringTime?: string; // HH:mm format

  // Notification channels
  @Prop({ type: [String], default: ['in-app'] })
  notificationChannels!: string[];

  // Tracking
  @Prop()
  lastTriggeredAt?: Date;

  @Prop({ default: false })
  isTriggered!: boolean;

  @Prop({ default: 0 })
  triggerCount!: number;

  // Snooze
  @Prop()
  snoozedUntil?: Date;

  @Prop({ default: false })
  isSnoozed!: boolean;

  // Metadata
  @Prop({ type: Object, default: {} })
  metadata?: any;

  // Soft delete
  @Prop({ default: false })
  isDeleted!: boolean;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);

// Create indexes
ReminderSchema.index({ tenantId: 1, status: 1, remindAt: 1 });
ReminderSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });
ReminderSchema.index({ remindAt: 1, status: 1, isTriggered: 1 });
ReminderSchema.index({ tenantId: 1, module: 1, status: 1 });

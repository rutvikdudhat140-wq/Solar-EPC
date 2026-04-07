import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationLogDocument = NotificationLog & Document;

@Schema({ timestamps: true, collection: 'notification_logs' })
export class NotificationLog extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Reminder' })
  reminderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Tenant' })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ type: [{ channel: String, success: Boolean, error: String }] })
  channels!: Array<{ channel: string; success: boolean; error?: string }>;

  @Prop()
  sentAt!: Date;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);

// Create indexes
NotificationLogSchema.index({ reminderId: 1 });
NotificationLogSchema.index({ tenantId: 1, sentAt: -1 });

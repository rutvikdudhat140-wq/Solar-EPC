import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition } from '../../../shared/database/base.schema';

export type LeadDocument = Lead & Document;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  ts!: string;

  @Prop({ required: true })
  note!: string;

  @Prop({ required: true })
  by!: string;

  @Prop({ type: Date, default: Date.now })
  timestamp!: Date;
}

const ActivitySchema = SchemaFactory.createForClass(Activity);

@Schema({ timestamps: true })
export class LeadStage {
  @Prop({ required: true })
  stage!: string;

  @Prop({ type: Boolean, default: false })
  completed!: boolean;

  @Prop({ type: Date, default: null })
  completedAt?: Date | null;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;
}

const LeadStageSchema = SchemaFactory.createForClass(LeadStage);

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true, unique: true })
  leadId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: '' })
  company!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop({ required: true, lowercase: true })
  email!: string;

  @Prop({ required: true })
  source!: string;

  @Prop({ required: true, default: 'new' })
  statusKey!: string;

  @Prop({ type: Number, default: 0 })
  score!: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  assignedTo?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  assignedBy?: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  kw!: number;

  @Prop({ type: Number, default: 0 })
  value!: number;

  @Prop({ type: Number, default: 0 })
  age!: number;

  @Prop({ default: '' })
  city!: string;

  @Prop({ default: '' })
  state!: string;

  @Prop({ default: Date.now })
  created!: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  createdBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  lastContact!: Date;

  @Prop({ type: Number, default: 0 })
  monthlyBill!: number;

  @Prop({ type: Number, default: 0 })
  roofArea!: number;

  @Prop({ default: '' })
  roofType!: string;

  @Prop({ type: Number, default: 0 })
  budget!: number;

  @Prop({ default: 'Commercial' })
  category!: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: Number, default: 0 })
  lat!: number;

  @Prop({ type: Number, default: 0 })
  lng!: number;

  @Prop({ type: [ActivitySchema], default: [] })
  activities!: Activity[];

  @Prop({ type: [LeadStageSchema], default: [] })
  leadStages!: LeadStage[];

  @Prop({ default: '' })
  nextFollowUp!: string;

  @Prop({ type: Number, default: 24 })
  slaHours!: number;

  @Prop({ type: Boolean, default: false })
  slaBreached!: boolean;

  @Prop({ type: String, default: '' })
  notes!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  customFields!: Record<string, any>;

  @Prop({
    type: [{
      ruleId: Number,
      name: String,
      triggeredAt: { type: Date, default: Date.now }
    }],
    default: []
  })
  activeAutomation!: {
    ruleId: number;
    name: string;
    triggeredAt: Date;
  }[];

  @Prop({ ...BaseSchemaDefinition.tenantId })
  tenantId!: Types.ObjectId;

  @Prop({ ...BaseSchemaDefinition.isDeleted })
  isDeleted!: boolean;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);

// Multi-tenant security indexes
LeadSchema.index({ tenantId: 1, createdBy: 1 }); // For AGENT role queries
LeadSchema.index({ tenantId: 1, assignedTo: 1 }); // For AGENT/MANAGER role queries
LeadSchema.index({ tenantId: 1, assignedBy: 1 }); // For tracking who assigned leads
LeadSchema.index({ tenantId: 1, createdBy: 1, assignedTo: 1 }); // Compound index for visibility queries
LeadSchema.index({ tenantId: 1, statusKey: 1 }); // For dashboard analytics
LeadSchema.index({ tenantId: 1, createdAt: -1 }); // For recent leads queries

// PERFORMANCE OPTIMIZATION: High-impact query indexes
LeadSchema.index({ tenantId: 1, isDeleted: 1, createdAt: -1 }); // For list queries with pagination
LeadSchema.index({ tenantId: 1, isDeleted: 1, statusKey: 1, createdAt: -1 }); // For filtered lists
LeadSchema.index({ tenantId: 1, isDeleted: 1, source: 1, createdAt: -1 }); // For source-filtered lists
LeadSchema.index({ tenantId: 1, isDeleted: 1, city: 1, createdAt: -1 }); // For city-filtered lists
LeadSchema.index({ tenantId: 1, isDeleted: 1, score: -1 }); // For high-score lead queries
LeadSchema.index({ tenantId: 1, isDeleted: 1, value: -1 }); // For high-value lead queries
LeadSchema.index({ tenantId: 1, isDeleted: 1, slaBreached: 1 }); // For SLA breach queries

// Dashboard analytics indexes
LeadSchema.index({ tenantId: 1, isDeleted: 1, statusKey: 1, value: 1 }); // For funnel stats
LeadSchema.index({ tenantId: 1, isDeleted: 1, source: 1, value: 1 }); // For source stats
LeadSchema.index({ tenantId: 1, isDeleted: 1, assignedTo: 1, statusKey: 1 }); // For performer stats
LeadSchema.index({ tenantId: 1, isDeleted: 1, createdAt: 1, statusKey: 1 }); // For monthly trends

// Text search optimization
LeadSchema.index({ 
  name: 'text', 
  email: 'text', 
  company: 'text', 
  phone: 'text', 
  city: 'text' 
}, { 
  weights: { 
    name: 10, 
    email: 8, 
    company: 6, 
    phone: 4, 
    city: 2 
  } 
});

// Existing indexes
LeadSchema.index({ email: 1, tenantId: 1 }, { unique: true, sparse: true });
LeadSchema.index({ statusKey: 1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ score: -1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ createdBy: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FinancePurchaseOrderDocument = HydratedDocument<FinancePurchaseOrder>;

@Schema({ timestamps: true, collection: 'finance_purchase_orders' })
export class FinancePurchaseOrder {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'FinanceVendor' })
  vendorId!: Types.ObjectId;

  @Prop({ required: true })
  vendorName!: string;

  @Prop({ type: String, default: '' })
  items!: string;

  @Prop({ required: true })
  totalAmount!: number;

  @Prop({ required: true, default: 0 })
  paidAmount!: number;

  @Prop({ required: true, default: 0 })
  outstandingAmount!: number;

  @Prop({ required: true, enum: ['Draft', 'Ordered', 'In Transit', 'Delivered', 'Cancelled'], default: 'Draft' })
  status!: string;

  @Prop({ required: true })
  orderedDate!: string;

  @Prop({ required: true })
  expectedDate!: string;

  @Prop({ type: String, default: null })
  deliveredDate!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null })
  relatedProjectId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Tenant' })
  tenantId!: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;

  // Inventory fields
  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  categoryId!: Types.ObjectId | null;

  @Prop({ type: String, default: '' })
  categoryName!: string;

  @Prop({ type: String, default: null })
  itemId!: string | null;

  @Prop({ type: String, default: '' })
  itemName!: string;

  @Prop({ type: String, default: '' })
  unit!: string;

  @Prop({ type: Number, default: 0 })
  requiredQuantity!: number;

  // Payment tracking
  @Prop({ type: [{ 
    date: Date, 
    amount: Number, 
    notes: String,
    poNumber: String 
  }], default: [] })
  paymentHistory!: Array<{ 
    date: Date; 
    amount: number; 
    notes?: string;
    poNumber?: string;
  }>;
}

export const FinancePurchaseOrderSchema = SchemaFactory.createForClass(FinancePurchaseOrder);

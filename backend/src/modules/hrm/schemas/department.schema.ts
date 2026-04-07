import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type DepartmentDocument = Department & Document;

@Schema({ ...BaseSchemaOptions, collection: 'hrmDepartments' })
export class Department {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: false, index: true })
  tenantId?: Types.ObjectId;

  @Prop({ ...BaseSchemaDefinition.isDeleted })
  isDeleted!: boolean;

  @Prop({ required: true, index: true })
  name!: string;

  @Prop({ default: '' })
  code!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 0 })
  employeeCount!: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  headId?: Types.ObjectId;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

DepartmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });
DepartmentSchema.index({ name: 1, tenantId: 1 }, { unique: true, sparse: true });
DepartmentSchema.index({ code: 1 });

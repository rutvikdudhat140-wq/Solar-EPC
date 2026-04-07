import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition } from '../../../shared/database/base.schema';

export type EmployeeDocument = Employee & Document;

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

@Schema({ timestamps: true })
export class Employee {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  employeeId!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop({ default: '' })
  address!: string;

  @Prop({ required: true })
  joiningDate!: Date;

  @Prop({ default: '' })
  department!: string;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: false, index: true })
  departmentId?: Types.ObjectId;

  @Prop({ type: String, index: true })
  roleId?: string;

  @Prop({ default: '' })
  designation!: string;

  @Prop({ enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status!: EmployeeStatus;

  @Prop({ type: Number, default: 0 })
  salary!: number;

  @Prop({ default: '' })
  emergencyContact!: string;

  @Prop({ default: '' })
  emergencyPhone!: string;

  @Prop({ ...BaseSchemaDefinition.tenantId })
  tenantId!: Types.ObjectId;

  @Prop({ ...BaseSchemaDefinition.isDeleted })
  isDeleted!: boolean;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

EmployeeSchema.index({ employeeId: 1, tenantId: 1 }, { unique: true, sparse: true });
EmployeeSchema.index({ email: 1, tenantId: 1 }, { unique: true, sparse: true });
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ roleId: 1 });

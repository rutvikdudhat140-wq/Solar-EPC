import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType, DocumentStatus } from '../schemas/document.schema';

export class DocumentItemDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsNumber()
  @Type(() => Number)
  quantity!: number;

  @IsNumber()
  @Type(() => Number)
  unitPrice!: number;

  @IsNumber()
  @Type(() => Number)
  total!: number;
}

export class ProjectBenefitsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  yearlySavings?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  co2Reduction?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  paybackPeriod?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  warrantyYears?: number;
}

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  documentId?: string;

  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  // Solar Project Specific Fields
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  systemCapacity?: number;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsString()
  installationType?: string;

  @IsOptional()
  @IsString()
  projectLocation?: string;

  // Cost Breakdown
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  equipmentCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  installationCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  engineeringCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  transportationCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  miscellaneousCost?: number;

  @IsOptional()
  @IsArray()
  items?: DocumentItemDto[];

  @IsOptional()
  benefits?: ProjectBenefitsDto;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gstRate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gstAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  total?: number;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  // Solar Project Specific Fields
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  systemCapacity?: number;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsString()
  installationType?: string;

  @IsOptional()
  @IsString()
  projectLocation?: string;

  // Cost Breakdown
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  equipmentCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  installationCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  engineeringCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  transportationCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  miscellaneousCost?: number;

  @IsOptional()
  @IsArray()
  items?: DocumentItemDto[];

  @IsOptional()
  benefits?: ProjectBenefitsDto;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gstRate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gstAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  total?: number;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  canvasData?: {
    canvasElements: any[];
    canvasSize: { width: number; height: number };
    savedAt: string;
  };
}

export class QueryDocumentDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export class BulkActionDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class SendDocumentDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsNumber, IsOptional, Min, IsMongoId } from 'class-validator';

export class CreateItemDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax2?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  warehouse?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reserved?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  itemGroupId?: string;

  @IsOptional()
  @IsString()
  poReference?: string;

  @IsOptional()
  @IsString()
  receivedDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateItemDto extends PartialType(CreateItemDto) {}

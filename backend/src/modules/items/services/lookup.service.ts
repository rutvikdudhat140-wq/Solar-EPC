import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Warehouse } from '../schemas/warehouse.schema';
import { Category } from '../schemas/category.schema';
import { Unit } from '../schemas/unit.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';
import { CreateWarehouseDto, UpdateWarehouseDto, CreateCategoryDto, UpdateCategoryDto, CreateUnitDto, UpdateUnitDto } from '../dto/lookup.dto';

@Injectable()
export class LookupService {
  constructor(
    @InjectModel(Warehouse.name) private readonly warehouseModel: Model<Warehouse>,
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @InjectModel(Unit.name) private readonly unitModel: Model<Unit>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
  ) {}

  private async getTenantId(tenantCode: string): Promise<string> {
    // First, try to find by code
    const tenantByCode = await this.tenantModel.findOne({ code: tenantCode });
    if (tenantByCode) {
      return tenantByCode._id.toString();
    }
    
    // If not found by code, and input looks like ObjectId, try to find by _id
    if (Types.ObjectId.isValid(tenantCode)) {
      const tenantById = await this.tenantModel.findById(tenantCode);
      if (tenantById) {
        return tenantById._id.toString();
      }
    }
    
    throw new NotFoundException(`Tenant ${tenantCode} not found`);
  }

  // Warehouse CRUD
  async findAllWarehouses(tenantId: string) {
    const actualTenantId = await this.getTenantId(tenantId);
    return this.warehouseModel.find({ tenantId: actualTenantId, isDeleted: false }).sort({ name: 1 }).exec();
  }

  async createWarehouse(tenantId: string, dto: CreateWarehouseDto) {
    const actualTenantId = await this.getTenantId(tenantId);
    const warehouse = new this.warehouseModel({ ...dto, tenantId: actualTenantId });
    return warehouse.save();
  }

  async updateWarehouse(tenantId: string, code: string, dto: UpdateWarehouseDto) {
    const actualTenantId = await this.getTenantId(tenantId);
    // Try to find by code first, then by name (for backward compatibility)
    let warehouse = await this.warehouseModel.findOneAndUpdate(
      { tenantId: actualTenantId, code, isDeleted: false },
      { $set: dto },
      { new: true },
    ).exec();
    
    // If not found by code, try by name
    if (!warehouse && dto.name) {
      warehouse = await this.warehouseModel.findOneAndUpdate(
        { tenantId: actualTenantId, name: code, isDeleted: false },
        { $set: dto },
        { new: true },
      ).exec();
    }
    
    if (!warehouse) throw new NotFoundException(`Warehouse ${code} not found`);
    return warehouse;
  }

  async deleteWarehouse(tenantId: string, code: string) {
    const actualTenantId = await this.getTenantId(tenantId);
    // Try to find by code first, then by name
    let warehouse = await this.warehouseModel.findOneAndUpdate(
      { tenantId: actualTenantId, code, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    ).exec();
    
    // If not found by code, try by name
    if (!warehouse) {
      warehouse = await this.warehouseModel.findOneAndUpdate(
        { tenantId: actualTenantId, name: code, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { new: true },
      ).exec();
    }
    
    if (!warehouse) throw new NotFoundException(`Warehouse ${code} not found`);
    return { message: 'Warehouse deleted successfully' };
  }

  // Category CRUD
  async findAllCategories(tenantId: string) {
    try {
      const actualTenantId = await this.getTenantId(tenantId);
      const categories = await this.categoryModel.find({ tenantId: actualTenantId, isDeleted: false }).sort({ name: 1 }).exec();
      // If no categories found, return default solar categories
      if (categories.length === 0) {
        return [
          { code: 'SOLAR_PANEL', name: 'Solar Panel' },
          { code: 'INVERTER', name: 'Inverter' },
          { code: 'BATTERY', name: 'Battery' },
          { code: 'STRUCTURE', name: 'Mounting Structure' },
          { code: 'CABLE', name: 'Cable' },
          { code: 'ACCESSORIES', name: 'Accessories' },
        ];
      }
      return categories;
    } catch (error) {
      // Return default categories on error
      return [
        { code: 'SOLAR_PANEL', name: 'Solar Panel' },
        { code: 'INVERTER', name: 'Inverter' },
        { code: 'BATTERY', name: 'Battery' },
        { code: 'STRUCTURE', name: 'Mounting Structure' },
        { code: 'CABLE', name: 'Cable' },
        { code: 'ACCESSORIES', name: 'Accessories' },
      ];
    }
  }

  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    const actualTenantId = await this.getTenantId(tenantId);
    const category = new this.categoryModel({ ...dto, tenantId: actualTenantId });
    return category.save();
  }

  async updateCategory(tenantId: string, code: string, dto: UpdateCategoryDto) {
    const actualTenantId = await this.getTenantId(tenantId);
    const category = await this.categoryModel.findOneAndUpdate(
      { tenantId: actualTenantId, code, isDeleted: false },
      { $set: dto },
      { new: true },
    ).exec();
    if (!category) throw new NotFoundException(`Category ${code} not found`);
    return category;
  }

  async deleteCategory(tenantId: string, code: string) {
    const actualTenantId = await this.getTenantId(tenantId);
    const category = await this.categoryModel.findOneAndUpdate(
      { tenantId: actualTenantId, code, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    ).exec();
    if (!category) throw new NotFoundException(`Category ${code} not found`);
    return { message: 'Category deleted successfully' };
  }

  // Unit CRUD
  async findAllUnits(tenantId: string) {
    try {
      const actualTenantId = await this.getTenantId(tenantId);
      const units = await this.unitModel.find({ tenantId: actualTenantId, isDeleted: false }).sort({ name: 1 }).exec();
      // If no units found, return default units
      if (units.length === 0) {
        return [
          { code: 'PIECE', name: 'Piece' },
          { code: 'UNIT', name: 'Unit' },
          { code: 'METER', name: 'Meter' },
          { code: 'WATT', name: 'Watt' },
          { code: 'KW', name: 'kW' },
          { code: 'MW', name: 'MW' },
          { code: 'BOX', name: 'Box' },
          { code: 'SET', name: 'Set' },
        ];
      }
      return units;
    } catch (error) {
      // Return default units on error
      return [
        { code: 'PIECE', name: 'Piece' },
        { code: 'UNIT', name: 'Unit' },
        { code: 'METER', name: 'Meter' },
        { code: 'WATT', name: 'Watt' },
        { code: 'KW', name: 'kW' },
        { code: 'MW', name: 'MW' },
        { code: 'BOX', name: 'Box' },
        { code: 'SET', name: 'Set' },
      ];
    }
  }

  async createUnit(tenantId: string, dto: CreateUnitDto) {
    const actualTenantId = await this.getTenantId(tenantId);
    const unit = new this.unitModel({ ...dto, tenantId: actualTenantId });
    return unit.save();
  }

  async updateUnit(tenantId: string, code: string, dto: UpdateUnitDto) {
    const actualTenantId = await this.getTenantId(tenantId);
    const unit = await this.unitModel.findOneAndUpdate(
      { tenantId: actualTenantId, code, isDeleted: false },
      { $set: dto },
      { new: true },
    ).exec();
    if (!unit) throw new NotFoundException(`Unit ${code} not found`);
    return unit;
  }

  async deleteUnit(tenantId: string, code: string) {
    const actualTenantId = await this.getTenantId(tenantId);
    const unit = await this.unitModel.findOneAndUpdate(
      { tenantId: actualTenantId, code, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    ).exec();
    if (!unit) throw new NotFoundException(`Unit ${code} not found`);
    return { message: 'Unit deleted successfully' };
  }
}

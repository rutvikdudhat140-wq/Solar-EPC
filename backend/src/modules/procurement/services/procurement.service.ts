import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vendor, VendorDocument } from '../schemas/vendor.schema';
import { PurchaseOrder, PurchaseOrderDocument } from '../schemas/purchase-order.schema';
import { Project } from '../../projects/schemas/project.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';
import { CreateVendorDto, UpdateVendorDto } from '../dto/create-vendor.dto';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, UpdatePurchaseOrderStatusDto } from '../dto/create-purchase-order.dto';

interface UserWithVisibility {
  id?: string;
  _id?: string;
  dataScope?: 'ALL' | 'ASSIGNED';
}

@Injectable()
export class ProcurementService {
  constructor(
    @InjectModel('ProcurementVendor') private vendorModel: Model<VendorDocument>,
    @InjectModel(PurchaseOrder.name) private purchaseOrderModel: Model<PurchaseOrderDocument>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
  ) {}

  private async getTenantId(tenantCode: string): Promise<Types.ObjectId | null> {
    if (tenantCode === 'default') return null;
    // If it looks like an ObjectId (24 hex chars), use it directly
    if (/^[0-9a-fA-F]{24}$/.test(tenantCode)) {
      return new Types.ObjectId(tenantCode);
    }
    // Otherwise, look up by code
    const tenant = await this.tenantModel.findOne({ code: tenantCode });
    if (!tenant) {
      // Return null instead of throwing - will query all records
      console.warn(`Tenant ${tenantCode} not found, querying all records`);
      return null;
    }
    return tenant._id as Types.ObjectId;
  }

  // ==================== VENDOR CRUD ====================

  async createVendor(dto: CreateVendorDto, tenantId: string): Promise<Vendor> {
    const tenantObjId = await this.getTenantId(tenantId);
    // Count all active vendors when tenant is default, otherwise count by tenant
    const countQuery = tenantObjId ? { tenantId: tenantObjId, isActive: true } : { isActive: true };
    const count = await this.vendorModel.countDocuments(countQuery);
    const id = `V${String(count + 1).padStart(3, '0')}`;

    const vendor = new this.vendorModel({
      ...dto,
      id,
      rating: dto.rating || 0,
      totalOrders: 0,
      tenantId: tenantObjId,
    });
    return vendor.save();
  }

  async findAllVendors(tenantId: string, user?: UserWithVisibility): Promise<Vendor[]> {
    console.log(`[PROCUREMENT VENDORS] Called with user:`, JSON.stringify(user));
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query: any = tenantObjId 
      ? { $or: [{ tenantId: tenantObjId }, { tenantId: null }, { tenantId: { $exists: false } }], isActive: true }
      : { isActive: true };
    
    console.log(`[PROCUREMENT VENDORS] user?.dataScope:`, user?.dataScope);
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      console.log(`[PROCUREMENT VENDORS] userId:`, userId);
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only show vendors explicitly assigned to this user
        query.assignedTo = objectId;
        console.log(`[PROCUREMENT VENDORS VISIBILITY] Applied assignedTo filter:`, objectId);
      }
    } else {
      console.log(`[PROCUREMENT VENDORS] SKIPPING filter - dataScope is not ASSIGNED`);
    }
    
    console.log('[PROCUREMENT VENDORS] Final query:', JSON.stringify(query));
    const results = await this.vendorModel.find(query).exec();
    console.log('[PROCUREMENT VENDORS] Found:', results.length, 'records');
    return results;
  }

  async findVendorById(id: string, tenantId: string): Promise<Vendor> {
    const tenantObjId = await this.getTenantId(tenantId);
    const query = tenantObjId ? { id, tenantId: tenantObjId } : { id };
    const vendor = await this.vendorModel.findOne(query).exec();
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async updateVendor(id: string, dto: UpdateVendorDto, tenantId: string): Promise<Vendor> {
    const tenantObjId = await this.getTenantId(tenantId);
    const query = tenantObjId ? { id, tenantId: tenantObjId } : { id };
    const vendor = await this.vendorModel.findOneAndUpdate(
      query,
      { $set: dto },
      { new: true },
    ).exec();
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async deleteVendor(id: string, tenantId: string): Promise<void> {
    const tenantObjId = await this.getTenantId(tenantId);
    const query = tenantObjId ? { id, tenantId: tenantObjId } : { id };
    const result = await this.vendorModel.findOneAndUpdate(
      query,
      { $set: { isActive: false } },
    ).exec();
    if (!result) throw new NotFoundException(`Vendor ${id} not found`);
  }

  // ==================== PURCHASE ORDER CRUD ====================

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, tenantId: string): Promise<PurchaseOrder> {
    const tenantObjId = await this.getTenantId(tenantId);
    
    console.log('[PROCUREMENT] Received DTO:', JSON.stringify(dto, null, 2));
    console.log('[PROCUREMENT] Inventory fields in DTO:', {
      categoryId: dto.categoryId,
      itemId: dto.itemId,
      unit: dto.unit,
      requiredQuantity: dto.requiredQuantity
    });
    
    // Find the highest existing PO id from active POs and increment
    // Use lean() to get plain objects where 'id' is the actual stored field, not the Mongoose virtual
    const allPOs = await this.purchaseOrderModel.find({}, { id: 1 }).lean().exec();
    const existingNumbers = allPOs.map((po: any) => {
      const rawId = po.id as string;
      const match = rawId?.match(/PO(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const id = `PO${String(maxNum + 1).padStart(3, '0')}`;

    // Get vendor from logistics_vendors collection using MongoDB _id
    const vendor = await this.vendorModel.findById(dto.vendorId).exec();
    if (!vendor) throw new NotFoundException(`Vendor ${dto.vendorId} not found`);

    const now = new Date();
    const orderedDate = now.toISOString().split('T')[0];

    let resolvedRelatedProjectId: Types.ObjectId | null = null;
    if (dto.relatedProjectId) {
      if (Types.ObjectId.isValid(dto.relatedProjectId)) {
        resolvedRelatedProjectId = new Types.ObjectId(dto.relatedProjectId);
      } else {
        const project = await this.projectModel.findOne({ projectId: dto.relatedProjectId }).exec();
        if (!project) {
          throw new BadRequestException(`Invalid relatedProjectId: Project ${dto.relatedProjectId} not found`);
        }
        resolvedRelatedProjectId = project._id as Types.ObjectId;
      }
    }

    const purchaseOrder = new this.purchaseOrderModel({
      ...dto,
      relatedProjectId: resolvedRelatedProjectId,
      id,
      vendorId: vendor._id,
      vendorName: vendor.name,
      items: dto.items || '',
      orderedDate,
      status: 'Ordered',
      deliveredDate: null,
      tenantId: tenantObjId,
      // Inventory fields
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : null,
      categoryName: dto.categoryName || '',
      itemId: dto.itemId || null,
      itemName: dto.itemName || '',
      unit: dto.unit || '',
      requiredQuantity: dto.requiredQuantity ? Number(dto.requiredQuantity) : 0,
    });

    console.log('[PROCUREMENT] Creating PO with inventory fields:', {
      categoryId: dto.categoryId,
      categoryName: dto.categoryName,
      itemId: dto.itemId,
      itemName: dto.itemName,
      unit: dto.unit,
      requiredQuantity: dto.requiredQuantity
    });

    // Increment vendor total orders
    await this.vendorModel.findByIdAndUpdate(vendor._id, { $inc: { totalOrders: 1 } });

    return purchaseOrder.save();
  }

  async findAllPurchaseOrders(tenantId: string, user?: UserWithVisibility): Promise<PurchaseOrder[]> {
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query: any = tenantObjId 
      ? { $or: [{ tenantId: tenantObjId }, { tenantId: null }, { tenantId: { $exists: false } }], isActive: true }
      : { isActive: true };
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only show POs explicitly assigned to this user
        query.assignedTo = objectId;
        console.log(`[PROCUREMENT PO VISIBILITY] Applied assignedTo filter:`, objectId);
      }
    }
    
    const pos = await this.purchaseOrderModel
      .find(query)
      .populate('vendorId', 'id name')
      .exec();
    
    // Update vendorName with current vendor's name
    return pos.map(po => {
      const poObj = po.toObject();
      const populatedVendor = poObj.vendorId as any;
      console.log(`[DEBUG] PO ${poObj.id} - vendorId:`, populatedVendor, '- vendorName:', poObj.vendorName);
      if (populatedVendor && typeof populatedVendor === 'object' && populatedVendor.name) {
        poObj.vendorName = populatedVendor.name;
        console.log(`[DEBUG] Updated vendorName to:`, poObj.vendorName);
      }
      return poObj as PurchaseOrder;
    });
  }

  async findPurchaseOrderById(id: string, tenantId: string): Promise<PurchaseOrder> {
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query = tenantObjId 
      ? { $or: [{ id, tenantId: tenantObjId }, { id, tenantId: null }, { id, tenantId: { $exists: false } }] }
      : { id };
    const po = await this.purchaseOrderModel
      .findOne(query)
      .populate('vendorId', 'id name')
      .exec();
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    
    // Update vendorName with current vendor's name
    const poObj = po.toObject();
    const populatedVendor = poObj.vendorId as any;
    if (populatedVendor && typeof populatedVendor === 'object' && populatedVendor.name) {
      poObj.vendorName = populatedVendor.name;
    }
    return poObj as PurchaseOrder;
  }

  async updatePurchaseOrderStatus(id: string, dto: UpdatePurchaseOrderStatusDto, tenantId: string): Promise<PurchaseOrder> {
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query = tenantObjId 
      ? { $or: [{ id, tenantId: tenantObjId }, { id, tenantId: null }, { id, tenantId: { $exists: false } }] }
      : { id };
    const updateData: any = { status: dto.status };
    if (dto.deliveredDate) {
      updateData.deliveredDate = dto.deliveredDate;
    }
    if (dto.status === 'Delivered' && !dto.deliveredDate) {
      updateData.deliveredDate = new Date().toISOString().split('T')[0];
    }

    const po = await this.purchaseOrderModel.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true },
    ).exec();
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    return po;
  }

  async updatePurchaseOrder(id: string, dto: UpdatePurchaseOrderDto, tenantId: string): Promise<PurchaseOrder> {
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query = tenantObjId 
      ? { $or: [{ id, tenantId: tenantObjId }, { id, tenantId: null }, { id, tenantId: { $exists: false } }] }
      : { id };
    const po = await this.purchaseOrderModel.findOneAndUpdate(
      query,
      { $set: dto },
      { new: true },
    ).exec();
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    return po;
  }

  async deletePurchaseOrder(id: string, tenantId: string): Promise<void> {
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query = tenantObjId 
      ? { $or: [{ id, tenantId: tenantObjId }, { id, tenantId: null }, { id, tenantId: { $exists: false } }] }
      : { id };
    const result = await this.purchaseOrderModel.findOneAndUpdate(
      query,
      { $set: { isActive: false } },
    ).exec();
    if (!result) throw new NotFoundException(`Purchase Order ${id} not found`);
  }

  // ==================== STATS ====================

  async getProcurementStats(tenantId: string, user?: UserWithVisibility): Promise<any> {
    const tenantObjId = await this.getTenantId(tenantId);
    const baseQuery: any = tenantObjId ? { tenantId: tenantObjId, isActive: true } : { isActive: true };
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only include records explicitly assigned to this user
        baseQuery.assignedTo = objectId;
        console.log(`[PROCUREMENT STATS VISIBILITY] Applied assignedTo filter:`, objectId);
      }
    }
    
    const vendorCount = await this.vendorModel.countDocuments(baseQuery);
    const poCount = await this.purchaseOrderModel.countDocuments(baseQuery);
    const inTransitCount = await this.purchaseOrderModel.countDocuments({
      ...baseQuery,
      status: 'In Transit',
    });

    const totalSpendAgg = tenantObjId 
      ? await this.purchaseOrderModel.aggregate([
          { $match: { tenantId: tenantObjId, isActive: true, ...(baseQuery.assignedTo ? { assignedTo: baseQuery.assignedTo } : {}) } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ])
      : await this.purchaseOrderModel.aggregate([
          { $match: { isActive: true, ...(baseQuery.assignedTo ? { assignedTo: baseQuery.assignedTo } : {}) } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);
    const totalSpend = totalSpendAgg.length > 0 ? totalSpendAgg[0].total : 0;

    return {
      vendorCount,
      poCount,
      total: poCount, // For frontend compatibility
      inTransitCount,
      pending: inTransitCount, // For frontend compatibility
      completed: poCount - inTransitCount, // Calculate completed
      totalSpend,
    };
  }

  // ==================== VENDOR SYNC ====================

  async syncVendorName(vendorId: Types.ObjectId | string, newVendorName: string): Promise<void> {
    console.log(`[PROCUREMENT SYNC] Syncing vendor name for vendor ${vendorId} to "${newVendorName}"`);
    
    const vendorObjId = typeof vendorId === 'string' && Types.ObjectId.isValid(vendorId)
      ? new Types.ObjectId(vendorId)
      : vendorId;
    
    const result = await this.purchaseOrderModel.updateMany(
      { vendorId: vendorObjId, isActive: true },
      { $set: { vendorName: newVendorName } }
    );
    
    console.log(`[PROCUREMENT SYNC] Updated ${result.modifiedCount} purchase orders`);
  }
}

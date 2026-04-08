import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inventory } from '../schemas/inventory.schema';
import { InventoryReservation } from '../schemas/inventory-reservation.schema';
import { Tenant, TenantSchema } from '../../../core/tenant/schemas/tenant.schema';
import { StockMovementService } from './stock-movement.service';
import { CreateInventoryDto, UpdateInventoryDto, StockInDto, StockOutDto, CreateReservationDto, UpdateReservationDto } from '../dto/inventory.dto';

interface UserWithVisibility {
  id?: string;
  _id?: string;
  dataScope?: 'ALL' | 'ASSIGNED';
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,
    @InjectModel(InventoryReservation.name) private readonly reservationModel: Model<InventoryReservation>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    private readonly stockMovementService: StockMovementService,
  ) {}

  private async getTenantId(tenantCode: string): Promise<Types.ObjectId> {
    return this.resolveTenantObjectId(tenantCode);
  }

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    // Try to find by code if it's not a valid ObjectId
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  async findAll(tenantCode: string, user?: UserWithVisibility, category?: string, search?: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    console.log(`[INVENTORY VISIBILITY] user:`, JSON.stringify(user));
    console.log(`[INVENTORY VISIBILITY] user?.dataScope:`, user?.dataScope);
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      console.log(`[INVENTORY VISIBILITY] userId:`, userId);
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only show items explicitly assigned to this user
        query.assignedTo = objectId;
        console.log(`[INVENTORY VISIBILITY] Applied STRICT assignedTo filter:`, objectId);
      }
    } else {
      console.log(`[INVENTORY VISIBILITY] No filter applied - ALL scope or no user`);
    }
    if (category && category !== 'All') {
      query.category = category;
    }
    if (search) {
      query.$text = { $search: search };
    }
    console.log(`[INVENTORY VISIBILITY] Final query:`, JSON.stringify(query));
    return this.inventoryModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(tenantCode: string, itemId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const item = await this.inventoryModel.findOne({ tenantId, itemId, isDeleted: false }).exec();
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }
    return item;
  }

  async create(tenantCode: string, createDto: CreateInventoryDto) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const stock = createDto.stock || 0;
    const available = createDto.available || 0;
    const minStock = createDto.minStock || 0;
    let status: string;
    if (available === 0) {
      status = 'Out of Stock';
    } else if (available <= minStock) {
      status = 'Low Stock';
    } else if (createDto.reserved && createDto.reserved > 0) {
      status = 'Reserved';
    } else {
      status = 'In Stock';
    }
    const item = new this.inventoryModel({
      ...createDto,
      tenantId,
      status,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
    return item.save();
  }

  async update(tenantCode: string, itemId: string, updateDto: UpdateInventoryDto) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const item = await this.inventoryModel.findOneAndUpdate(
      { tenantId, itemId },
      { 
        $set: { 
         ...updateDto,
          lastUpdated: new Date().toISOString().split('T')[0],
        }
      },
      { new: true },
    ).exec();
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }
    return item;
  }
  async createReservation(tenantCode: string, createDto: CreateReservationDto) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    console.log(`[DEBUG createReservation] tenantCode: ${tenantCode}, createDto:`, JSON.stringify(createDto));
    console.log(`[DEBUG createReservation] resolved tenantId: ${tenantId}`);
    const item = await this.inventoryModel.findOne({ tenantId, itemId: createDto.itemId }).exec();
    if (!item) {
      console.error(`[DEBUG createReservation] Item not found: ${createDto.itemId}`);
      throw new NotFoundException(`Item ${createDto.itemId} not found`);
    }
    console.log(`[DEBUG createReservation] Found item:`, item.itemId, `available: ${item.available}, requested: ${createDto.quantity}`);
    if (item.available < createDto.quantity) {

      throw new BadRequestException(

        `Insufficient available stock. Available: ${item.available}, Requested: ${createDto.quantity}`

      );

    }

    const reservationId = `RES${Date.now().toString(36).toUpperCase()}`;
    const reservationData = {
      ...createDto,
      reservationId,
      tenantId,
      status: 'active',
      reservedDate: new Date().toISOString().split('T')[0],
    };
    console.log(`[DEBUG createReservation] Creating reservation:`, JSON.stringify(reservationData));
    const reservation = new this.reservationModel(reservationData);
    const newReserved = item.reserved + createDto.quantity;
    const newAvailable = item.stock - newReserved;
    await this.inventoryModel.findOneAndUpdate(
      { tenantId, itemId: createDto.itemId },
      {
        $set: {
          reserved: newReserved,
          available: newAvailable,
          lastUpdated: new Date().toISOString().split('T')[0],
        }
      },

    ).exec();
    const savedReservation = await reservation.save();
    console.log(`[DEBUG createReservation] Saved reservation:`, JSON.stringify(savedReservation));
    return savedReservation;

  }

  async getReservationsByProject(tenantCode: string, projectId: string) {

    const tenantId = await this.resolveTenantObjectId(tenantCode);

    console.log(`[DEBUG getReservationsByProject] tenantCode: ${tenantCode}, projectId: ${projectId}`);
    console.log(`[DEBUG getReservationsByProject] resolved tenantId: ${tenantId}`);

    // Build projectId variants to match both string and ObjectId formats

    const searchProjectIds: any[] = [projectId];

    if (Types.ObjectId.isValid(projectId)) {

      searchProjectIds.push(new Types.ObjectId(projectId));

    }

    try {
      const projectDoc: any = await this.inventoryModel.db.collection('projects').findOne(
        {
          tenantId: tenantId,
          projectId: projectId,
          isDeleted: false,
        },
        { projection: { _id: 1 } },
      );
      if (projectDoc?._id) {
        searchProjectIds.push(projectDoc._id);
        console.log(`[DEBUG getReservationsByProject] Found project _id: ${projectDoc._id}`);
      }
    } catch (e) {
      console.log(`[DEBUG getReservationsByProject] Error finding project:`, e);
    }

    console.log(`[DEBUG getReservationsByProject] searchProjectIds:`, searchProjectIds);

    const reservations = await this.reservationModel

      .find({ 
        $and: [
          {
            $or: [
              { tenantId: tenantId },
              { tenantId: tenantId.toString() },
            ]
          },
          {
            $or: [
              { projectId: { $in: searchProjectIds } },
              { projectId: projectId.toString() }
            ]
          }
        ],
        status: { $in: ['active', 'fulfilled', 'Pending', 'Active'] } 
      })
      .sort({ createdAt: -1 })
      .exec();

    console.log(`[DEBUG getReservationsByProject] Found ${reservations.length} reservations`);
    console.log(`[DEBUG getReservationsByProject] Reservations:`, reservations.map(r => ({ itemId: r.itemId, projectId: r.projectId, status: r.status, quantity: r.quantity })));

    return reservations;

  }
  async getReservationsByItem(tenantCode: string, itemId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    console.log(`[DEBUG getReservationsByItem] tenantCode: ${tenantCode}, itemId: ${itemId}`);
    console.log(`[DEBUG getReservationsByItem] resolved tenantId: ${tenantId}`);
    // Build itemId variants to match across different ID formats

    const searchItemIds = [itemId];

    if (itemId.startsWith('INV')) {

      searchItemIds.push(itemId.replace(/^INV/, ''));

    } else {

      searchItemIds.push('INV' + itemId);

    }
    console.log(`[DEBUG getReservationsByItem] searchItemIds:`, searchItemIds);
    // First, let's check ALL reservations for this tenant to see what exists
    const allReservations = await this.reservationModel
      .find({
        $or: [
          { tenantId: tenantId },
          { tenantId: tenantId.toString() },
        ],
      })
      .limit(10)
      .exec();
    console.log(`[DEBUG getReservationsByItem] ALL reservations for tenant (${allReservations.length}):`, allReservations.map(r => ({ itemId: r.itemId, projectId: r.projectId, status: r.status })));
    const reservations = await this.reservationModel
      .find({
        $or: [
          { tenantId: tenantId },
          { tenantId: tenantId.toString() },
        ],
        itemId: { $in: searchItemIds },
        status: { $in: ['active', 'fulfilled', 'Pending', 'Active', 'pending'] },
      })
      .sort({ createdAt: -1 })
      .exec();
    console.log(`[DEBUG getReservationsByItem] Filtered reservations count: ${reservations.length}`);
    console.log(`[DEBUG getReservationsByItem] Filtered reservations:`, reservations.map(r => ({ itemId: r.itemId, projectId: r.projectId, status: r.status, quantity: r.quantity })));
    // Transform reservations to include project details
    const transformedReservations = await Promise.all(
      reservations.map(async (res) => {
        const resObj = res.toObject();
        // Try to find project details - projectId could be string or ObjectId
        let projectDetails = null;
        try {
          const projectIdStr = res.projectId?.toString();
          // Try to find by projectId as string (e.g., P3262)
          const query: any = { projectId: projectIdStr };
          // Also try _id if projectId is a valid ObjectId
          if (Types.ObjectId.isValid(res.projectId)) {
            query.$or = [
              { projectId: projectIdStr },
              { _id: new Types.ObjectId(res.projectId) }
            ];
            delete query.projectId;
          }
          projectDetails = await this.inventoryModel.db.collection('projects').findOne(query, { projection: { projectId: 1, customerName: 1, name: 1, status: 1 } });
          console.log(`[DEBUG getReservationsByItem] Project lookup for ${projectIdStr}:`, projectDetails);
        } catch (e) {
          console.error(`[DEBUG getReservationsByItem] Error looking up project:`, e);
        }
        return {
          ...resObj,
          projectId: res.projectId?.toString(),
          project: projectDetails || {
            projectId: res.projectId?.toString(),
            customerName: (res as any).projectName || 'Unknown Project'
          }
        };
      }
    )
    );

    console.log(`[DEBUG getReservationsByItem] Returning ${transformedReservations.length} reservations`);
    return transformedReservations;
  }
  async updateReservation(
    tenantCode: string, 
    reservationId: string, 
    updateDto: UpdateReservationDto
  ) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const reservation = await this.reservationModel.findOne({ tenantId, reservationId }).exec();
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }
    if (updateDto.quantity && updateDto.quantity !== reservation.quantity) {
      const item = await this.inventoryModel.findOne({ 
        tenantId, 
        itemId: reservation.itemId 
      }).exec();
      if (item) {
        const quantityDiff = updateDto.quantity - reservation.quantity;
        if (item.available < quantityDiff) {
          throw new BadRequestException(`Insufficient available stock for this update`);
        }
        const newReserved = item.reserved + quantityDiff;
        const newAvailable = item.stock - newReserved;
        await this.inventoryModel.findOneAndUpdate(
          { tenantId, itemId: reservation.itemId },
          {
            $set: {
              reserved: newReserved,
              available: newAvailable,
              lastUpdated: new Date().toISOString().split('T')[0],
            }
          },
        ).exec();
      }
    }
    if (updateDto.status === 'cancelled' && reservation.status !== 'cancelled') {
      const item = await this.inventoryModel.findOne({ 
        tenantId, 
        itemId: reservation.itemId 
      }).exec();
      if (item) {
        const newReserved = Math.max(0, item.reserved - reservation.quantity);
        const newAvailable = item.stock - newReserved;
        await this.inventoryModel.findOneAndUpdate(
          { tenantId, itemId: reservation.itemId },

          {

            $set: {
              reserved: newReserved,
              available: newAvailable,
              lastUpdated: new Date().toISOString().split('T')[0],
            }
          },
        ).exec();
      }
    }
    return this.reservationModel.findOneAndUpdate(
      { tenantId, reservationId },
      { $set: updateDto },
      { new: true },
    ).exec();
  }
  async transfer(
    tenantCode: string,
    fromInventoryId: string,
    toWarehouseId: string,
    quantity: number,
    remarks?: string,
  ): Promise<{ fromItem: Inventory; toItem: Inventory }> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const tenantIdStr = tenantId.toString();
    
    console.log(`[DEBUG TRANSFER] tenantCode: ${tenantCode}, resolved tenantId: ${tenantIdStr}`);
    console.log(`[DEBUG TRANSFER] fromInventoryId: ${fromInventoryId}, toWarehouseId: ${toWarehouseId}`);
    
    // Try multiple lookup strategies
    let fromItem: any = null;
    
    // Strategy 1: By itemId with tenantId
    fromItem = await this.inventoryModel.findOne({ tenantId, itemId: fromInventoryId, isDeleted: false }).exec();
    console.log(`[DEBUG TRANSFER] Lookup by itemId: ${fromItem ? 'FOUND' : 'NOT FOUND'}`);
    
    // Strategy 2: By itemId with tenantId as string
    if (!fromItem) {
      fromItem = await this.inventoryModel.findOne({ tenantId: tenantIdStr, itemId: fromInventoryId, isDeleted: false }).exec();
      console.log(`[DEBUG TRANSFER] Lookup by tenantId string: ${fromItem ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // Strategy 3: By _id if valid ObjectId
    if (!fromItem && Types.ObjectId.isValid(fromInventoryId)) {
      fromItem = await this.inventoryModel.findOne({ tenantId, _id: new Types.ObjectId(fromInventoryId), isDeleted: false }).exec();
      console.log(`[DEBUG TRANSFER] Lookup by _id: ${fromItem ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // Strategy 4: Without tenant filter (fallback)
    if (!fromItem) {
      fromItem = await this.inventoryModel.findOne({ itemId: fromInventoryId, isDeleted: false }).exec();
      console.log(`[DEBUG TRANSFER] Lookup without tenant: ${fromItem ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    if (!fromItem) {
      console.error(`[DEBUG TRANSFER] All lookup strategies failed for itemId: ${fromInventoryId}`);
      throw new NotFoundException(`Source inventory item ${fromInventoryId} not found`);
    }
    
    console.log(`[DEBUG TRANSFER] Found fromItem: ${fromItem.itemId}, warehouse: ${fromItem.warehouse}, available: ${fromItem.available}`);
    if (fromItem.available < quantity) {
      throw new BadRequestException(
        `Insufficient available stock. Available: ${fromItem.available}, Requested: ${quantity}`,
      );
    }
    let toItem = await this.inventoryModel.findOne({ tenantId, name: fromItem.name, warehouse: toWarehouseId }).exec();
    if (!toItem) {
      const newItem = new this.inventoryModel({
        tenantId,
        itemId: `INV${Date.now().toString(36).toUpperCase()}`,
        name: fromItem.name,
        description: fromItem.name,
        category: fromItem.category,
        stock: quantity,
        available: quantity,
        reserved: 0,
        minStock: fromItem.minStock,
        rate: fromItem.rate,
        unit: fromItem.unit,
        warehouse: toWarehouseId,
        status: 'In Stock',
        lastUpdated: new Date().toISOString().split('T')[0],
      });
      toItem = await newItem.save();
    } else {
      const newStock = toItem.stock + quantity;
      const newAvailable = newStock - toItem.reserved;
      toItem = await this.inventoryModel.findOneAndUpdate(
        { tenantId, _id: toItem._id },
        {
          $set: {
            stock: newStock,
            available: newAvailable,
            lastUpdated: new Date().toISOString().split('T')[0],
          },
        },
        { new: true },
      ).exec();
    }
    const newFromStock = fromItem.stock - quantity;
    const newFromAvailable = newFromStock - fromItem.reserved;
    const updatedFromItem = await this.inventoryModel.findOneAndUpdate(
      { tenantId, _id: fromItem._id },
      {
        $set: {
          stock: newFromStock,
          available: newFromAvailable,
          lastUpdated: new Date().toISOString().split('T')[0],
        },
      },
      { new: true },
    ).exec();

    // Log stock movements for TRANSFER
    try {
      // Outgoing from source warehouse
      await this.stockMovementService.logMovement(tenantCode, {
        itemId: fromItem.itemId || fromItem._id.toString(),
        type: 'TRANSFER',
        quantity: -quantity,
        reference: `To: ${toWarehouseId}`,
        referenceType: 'TRANSFER',
        note: `Transferred ${quantity} units to warehouse ${toWarehouseId}${remarks ? ': ' + remarks : ''}`,
        warehouseName: fromItem.warehouse || 'Main Warehouse',
      });

      // Incoming to destination warehouse
      if (toItem) {
        await this.stockMovementService.logMovement(tenantCode, {
          itemId: toItem.itemId || toItem._id.toString(),
          type: 'TRANSFER',
          quantity: quantity,
          reference: `From: ${fromItem.warehouse || 'Main Warehouse'}`,
          referenceType: 'TRANSFER',
          note: `Received ${quantity} units from warehouse ${fromItem.warehouse || 'Main Warehouse'}${remarks ? ': ' + remarks : ''}`,
          warehouseName: toWarehouseId,
        });
      }
    } catch (err) {
      console.error('[STOCK MOVEMENT] Failed to log TRANSFER movements:', err);
    }

    return { fromItem: updatedFromItem!, toItem: toItem! };
  }
  async cancelReservation(tenantCode: string, reservationId: string) {
    return this.updateReservation(tenantCode, reservationId, { status: 'cancelled' });
  }
  async fulfillReservation(tenantCode: string, reservationId: string) {
    return this.updateReservation(tenantCode, reservationId, { status: 'fulfilled' });
  }

  async findOneWithReservations(tenantCode: string, itemId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const [item, reservations] = await Promise.all([
      this.inventoryModel.findOne({ tenantId, itemId, isDeleted: false }).exec(),
      this.reservationModel
        .find({ tenantId, itemId, status: 'active' })
        .select('reservationId projectId quantity reservedDate notes')
        .sort({ reservedDate: -1 })
        .exec()
    ]);
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }
    return {
      ...item.toObject(),
      reservations

    };
  }
  async stockIn(tenantCode: string, itemId: string, stockInDto: StockInDto) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const item = await this.inventoryModel.findOne({ tenantId, itemId }).exec();
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }
    const newStock = item.stock + stockInDto.quantity;
    const newAvailable = newStock - item.reserved;
    const updatedItem = await this.inventoryModel.findOneAndUpdate(
      { tenantId, itemId },
      {
        $set: {
          stock: newStock,
          available: newAvailable,
          lastUpdated: new Date().toISOString().split('T')[0],
        }
      },
      { new: true },

    ).exec();
    return updatedItem;

  }
  async stockOut(tenantCode: string, itemId: string, stockOutDto: StockOutDto) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const item = await this.inventoryModel.findOne({ tenantId, itemId }).exec();
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }
    if (item.available < stockOutDto.quantity) {
      throw new NotFoundException(`Insufficient stock. Available: ${item.available}`);
    }
    const newStock = item.stock - stockOutDto.quantity;
    const newAvailable = newStock - item.reserved;
    const updatedItem = await this.inventoryModel.findOneAndUpdate(
      { tenantId, itemId },
      {
        $set: {
          stock: newStock,
          available: newAvailable,
          lastUpdated: new Date().toISOString().split('T')[0],
        }
      },
      { new: true },
    ).exec();
    return updatedItem;
  }


  async addStock(itemName: string, quantity: number, remarks?: string, referenceId?: string, tenantCode: string = 'solarcorp') {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    let item: any = await this.inventoryModel.findOne({ tenantId, name: itemName, isDeleted: false }).exec();
    if (!item) {
      item = await this.inventoryModel.findOne({ tenantId, itemId: itemName, isDeleted: false }).exec();
    }
    if (!item && Types.ObjectId.isValid(itemName)) {
      item = await this.inventoryModel.findOne({ tenantId, _id: new Types.ObjectId(itemName), isDeleted: false }).exec();
    }
    if (!item) {
      throw new NotFoundException(`Inventory item "${itemName}" not found`);
    }
    const newStock = (Number(item.stock) || 0) + quantity;
    const newAvailable = newStock - (Number(item.reserved) || 0);
    const updatedItem = await this.inventoryModel.findOneAndUpdate(
      { tenantId, _id: item._id },
      { $set: { stock: newStock, available: newAvailable, lastUpdated: new Date().toISOString().split('T')[0] } },
      { new: true },
    ).exec();
    return updatedItem;
  }
  async removeStock(itemName: string, quantity: number, remarks?: string, referenceId?: string, tenantCode: string = 'solarcorp') {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    let item: any = await this.inventoryModel.findOne({ tenantId, name: itemName, isDeleted: false }).exec();
    if (!item) {
      item = await this.inventoryModel.findOne({ tenantId, itemId: itemName, isDeleted: false }).exec();
    }
    if (!item && Types.ObjectId.isValid(itemName)) {
      item = await this.inventoryModel.findOne({ tenantId, _id: new Types.ObjectId(itemName), isDeleted: false }).exec();
    }
    if (!item) {
      throw new NotFoundException(`Inventory item "${itemName}" not found`);
    }
    if ((Number(item.available) || 0) < quantity) {
      throw new BadRequestException(`Insufficient stock for "${itemName}". Available: ${item.available}, Requested: ${quantity}`);
    }
    const newStock = (Number(item.stock) || 0) - quantity;
    const newAvailable = newStock - (Number(item.reserved) || 0);
    const updatedItem = await this.inventoryModel.findOneAndUpdate(
      { tenantId, _id: item._id },
      { $set: { stock: newStock, available: newAvailable, lastUpdated: new Date().toISOString().split('T')[0] } },
      { new: true },
    ).exec();
    return updatedItem;
  }


  async remove(tenantCode: string, itemId: string) {

    const tenantId = await this.resolveTenantObjectId(tenantCode);

    const item = await this.inventoryModel.findOneAndUpdate(

      { tenantId, itemId },



      { $set: { isDeleted: true } },
      { new: true },
    ).exec();
  }
  async getCategories(tenantCode: string, user?: UserWithVisibility): Promise<string[]> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const matchQuery: any = { tenantId, isDeleted: false };
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
        matchQuery.assignedTo = objectId;
      }
    }
    const categories = await this.inventoryModel.distinct('category', matchQuery);
    return categories.filter((cat: string) => cat && cat.trim() !== '').sort();
  }
  async getUnits(tenantCode: string, user?: UserWithVisibility): Promise<string[]> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const matchQuery: any = { tenantId, isDeleted: false };
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
        matchQuery.assignedTo = objectId;
      }
    }
    const units = await this.inventoryModel.distinct('unit', matchQuery);
    return units.filter((unit: string) => unit && unit.trim() !== '').sort();
  }
  async getStats(tenantCode: string, user?: UserWithVisibility) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const matchQuery: any = { tenantId, isDeleted: false };
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
        matchQuery.assignedTo = objectId;
      }
    }
    const items: any[] = await this.inventoryModel.find(matchQuery).lean();
    const totalItems = items.length;
    const totalStock = items.reduce((sum, it) => sum + (Number(it.stock) || 0), 0);
    const lowStockItems = items.filter((it) => {
      const available = Number(it.available) || 0;
      const minStock = Number(it.minStock) || 0;
      return available > 0 && available <= minStock;
    }).length;
    const outOfStockItems = items.filter((it) => (Number(it.available) || 0) <= 0).length;
    const reservedItems = items.filter((it) => (Number(it.reserved) || 0) > 0).length;
    return { totalItems, totalStock, lowStockItems, outOfStockItems, reservedItems };
  }
  async getItemsByCategory(tenantCode: string, user?: UserWithVisibility) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const matchQuery: any = { tenantId, isDeleted: false };
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
        matchQuery.assignedTo = objectId;
      }
    }
    return this.inventoryModel.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$category', count: { $sum: 1 }, totalStock: { $sum: '$stock' }, totalAvailable: { $sum: '$available' } } },
      { $project: { _id: 0, category: '$_id', count: 1, totalStock: 1, totalAvailable: 1 } },
      { $sort: { category: 1 } },
    ]).exec();
  }

/*
  return updatedItem;
}

async remove(tenantCode: string, itemId: string) {
  const tenantId = await this.resolveTenantObjectId(tenantCode);
  const item = await this.inventoryModel.findOneAndUpdate(
    { tenantId, itemId },
    { $set: { isDeleted: true } },
    { new: true },
  ).exec();
}

async getCategories(tenantCode: string, user?: UserWithVisibility): Promise<string[]> {
  const tenantId = await this.resolveTenantObjectId(tenantCode);
  const matchQuery: any = { tenantId, isDeleted: false };
  if (user?.dataScope === 'ASSIGNED') {
    const userId = user._id || user.id;
    if (userId) {
      const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
      matchQuery.assignedTo = objectId;
    }

    // If still not found, try searching by itemId

    if (!item) {

      item = await this.inventoryModel.findOne({ tenantId, itemId: itemName }).exec();
    }
    if (!item) {
      throw new NotFoundException(`Inventory item "${itemName}" not found`);
    }
    if (item.available < quantity) {
      throw new BadRequestException(`Insufficient stock for "${itemName}". Available: ${item.available}, Requested: ${quantity}`);
    }
    const newStock = item.stock - quantity;
    const newAvailable = newStock - item.reserved;
    return this.inventoryModel.findOneAndUpdate(
      { tenantId, _id: item._id },
      {
        $set: {
          stock: newStock,
          available: newAvailable,
          lastUpdated: new Date().toISOString().split('T')[0],
        }
      },
      { new: true },
    ).exec();
  }
}
*/
}
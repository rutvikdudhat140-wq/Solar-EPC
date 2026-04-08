import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from '../schemas/project.schema';
import { Tenant, TenantSchema } from '../../../core/tenant/schemas/tenant.schema';
import { Item } from '../../items/schemas/item.schema';
import { Inventory } from '../../inventory/schemas/inventory.schema';
import { InventoryReservation } from '../../inventory/schemas/inventory-reservation.schema';
import { DocumentEntity } from '../../document/schemas/document.schema';
import { CreateProjectDto, UpdateProjectDto, UpdateProjectStatusDto } from '../dto/project.dto';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';
import { StockMovementService } from '../../inventory/services/stock-movement.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Item.name) private readonly itemModel: Model<Item>,
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,
    @InjectModel(InventoryReservation.name) private readonly reservationModel: Model<InventoryReservation>,
    @InjectModel(DocumentEntity.name) private readonly documentModel: Model<DocumentEntity>,
    private readonly stockMovementService: StockMovementService,
  ) {}

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

  async findAll(tenantCode: string, user?: UserWithVisibility, status?: string, search?: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    
    console.log('[PROJECTS VISIBILITY] ===== FIND ALL CALLED =====');
    console.log('[PROJECTS VISIBILITY] user:', JSON.stringify(user));
    console.log('[PROJECTS VISIBILITY] user?.dataScope:', user?.dataScope);
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      // Build user identifiers from email, firstName, lastName
      const userEmail = (user as any).email || '';
      const userNameFromEmail = userEmail.split('@')[0];
      const firstName = (user as any).firstName || '';
      const lastName = (user as any).lastName || '';
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      const firstNameLower = firstName.toLowerCase();
      console.log('[PROJECTS VISIBILITY] userId:', userId, 'emailPrefix:', userNameFromEmail, 'fullName:', fullName);
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        const pmOrConditions: any[] = [];
        if (userNameFromEmail) pmOrConditions.push({ pm: { $regex: userNameFromEmail, $options: 'i' } });
        if (firstNameLower) pmOrConditions.push({ pm: { $regex: firstNameLower, $options: 'i' } });
        if (fullName) pmOrConditions.push({ pm: { $regex: fullName, $options: 'i' } });
        // Filter by assignedTo OR pm field matching email prefix, firstName, or full name
        query.$or = [
          { assignedTo: objectId },
          ...pmOrConditions,
        ];
        console.log('[PROJECTS VISIBILITY] Applied $or filter with name matching');
      }
    } else {
      console.log('[PROJECTS VISIBILITY] No filter applied - ALL scope or no user');
    }
    
    console.log('[PROJECTS VISIBILITY] Final query (stringified):', JSON.stringify(query));
    console.log('[PROJECTS VISIBILITY] Query assignedTo type:', typeof query.assignedTo, 'instance:', query.assignedTo instanceof Types.ObjectId);
    
    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const result = await this.projectModel.find(query).sort({ createdAt: -1 }).exec();
    console.log('[PROJECTS VISIBILITY] Query returned', result.length, 'records');
    return result;
  }

  async findOne(tenantCode: string, projectId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const project = await this.projectModel.findOne({
      tenantId,
      projectId,
      isDeleted: false,
    }).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  async create(tenantCode: string, createProjectDto: CreateProjectDto) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    const project = new this.projectModel({
      ...createProjectDto,
      tenantId,
    });

    return project.save();
  }

  async update(tenantCode: string, projectId: string, updateProjectDto: UpdateProjectDto) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId },
      { $set: updateProjectDto },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  async updateStatus(
    tenantCode: string,
    projectId: string,
    updateStatusDto: UpdateProjectStatusDto,
    user?: UserWithVisibility,
  ) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    // Normalize status (frontend may send different casing like CANCELLED)
    const incomingStatus = updateStatusDto?.status;
    console.log(`[DEBUG CANCEL] updateStatus called with status: ${incomingStatus}, userRole: ${user?.role}`);
    
    if (incomingStatus && String(incomingStatus).toLowerCase() === 'cancelled') {
      (updateStatusDto as any).status = 'Cancelled';
      console.log(`[DEBUG CANCEL] Status normalized to 'Cancelled'`);
    }
    
    // Extract user role and ID from user object
    const userRole = user?.role;
    const userId = user?._id || user?.id;
    
    // Role validation for Cancelled status
    if (updateStatusDto.status === 'Cancelled') {
      console.log(`[DEBUG CANCEL] Checking role permissions. userRole: ${userRole}, allowed: ['Admin', 'Project Manager']`);
      const allowedRoles = ['Admin', 'Project Manager'];
      if (!userRole || !allowedRoles.includes(userRole)) {
        console.error(`[DEBUG CANCEL] ROLE CHECK FAILED: ${userRole} not in allowed roles`);
        throw new UnauthorizedException('Only Admin or Project Manager can cancel a project');
      }
      console.log(`[DEBUG CANCEL] Role check passed`);
    }
    
    // Cancelled needs to be ATOMIC + IDEMPOTENT because it has financial stock impact
    if (updateStatusDto.status === 'Cancelled') {
      console.log(`[DEBUG CANCEL] Calling cancelProjectAndRestoreInventory for ${projectId}`);
      return this.cancelProjectAndRestoreInventory(tenantCode, tenantId, projectId, updateStatusDto, userId);
    }

    // Non-cancel updates (no inventory impact)
    const updateData: any = { status: updateStatusDto.status };

    if (updateStatusDto.progress !== undefined) {
      updateData.progress = updateStatusDto.progress;
    }

    if (updateStatusDto.milestones !== undefined) {
      updateData.milestones = updateStatusDto.milestones;
    }

    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId },
      { $set: updateData },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  private async cancelProjectAndRestoreInventory(
    tenantCode: string,
    tenantId: Types.ObjectId,
    projectId: string,
    updateStatusDto: UpdateProjectStatusDto,
    userId?: any,
  ) {
    console.log(`[DEBUG CANCEL] cancelProjectAndRestoreInventory START for project ${projectId}`);
    const session = await this.projectModel.db.startSession();
    console.log(`[DEBUG CANCEL] MongoDB session created`);

    try {
      await session.withTransaction(async () => {
        console.log(`[DEBUG CANCEL] Transaction started for ${projectId}`);
        const project = await this.projectModel.findOne({ tenantId, projectId, isDeleted: false }).session(session);
        if (!project) {
          console.error(`[DEBUG CANCEL] Project ${projectId} not found`);
          throw new NotFoundException(`Project ${projectId} not found`);
        }
        console.log(`[DEBUG CANCEL] Project found: ${project.projectId}, current status: ${project.status}, inventoryRestored: ${project.inventoryRestored}`);

        const updateData: any = { status: 'Cancelled', cancelledAt: new Date() };

        if (updateStatusDto.progress !== undefined) {
          updateData.progress = updateStatusDto.progress;
        }

        if (updateStatusDto.milestones !== undefined) {
          updateData.milestones = updateStatusDto.milestones;
        }

        if (updateStatusDto.cancelledBy) {
          updateData.cancelledBy = updateStatusDto.cancelledBy;
        } else if (userId) {
          const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
            ? new Types.ObjectId(userId)
            : userId;
          updateData.cancelledBy = objectId;
        }

        // Idempotency guard: if inventory already restored AND project was already cancelled, skip
        // But if project is moving from non-Cancelled to Cancelled, always process
        const wasAlreadyCancelled = project.status === 'Cancelled';
        const needsRestore = !wasAlreadyCancelled || project.inventoryRestored !== true;
        console.log(`[DEBUG CANCEL] wasAlreadyCancelled: ${wasAlreadyCancelled}, needsRestore: ${needsRestore}, inventoryRestored: ${project.inventoryRestored}`);

        await this.projectModel.updateOne(
          { _id: project._id },
          { $set: updateData },
          { session },
        );
        console.log(`[DEBUG CANCEL] Project status updated to Cancelled`);

        if (!needsRestore) {
          console.log(`[DEBUG CANCEL] Inventory already restored, skipping restore logic`);
          return;
        }

        const projectQuery: any[] = [{ projectId: projectId }];
        if (Types.ObjectId.isValid(projectId)) {
          projectQuery.push({ projectId: new Types.ObjectId(projectId) });
        }
        
        // Also add project._id to query to be sure
        projectQuery.push({ projectId: project._id });

        const tenantIdStr = tenantId.toString();
        const reservations = await this.reservationModel.find({
          $and: [
            {
              $or: [
                { tenantId },
                { tenantId: tenantIdStr as any },
              ],
            },
            {
              $or: projectQuery,
            },
          ],
          status: { $nin: ['Cancelled', 'cancelled', 'released', 'Released'] },
        } as any).session(session);

        console.log(`[DEBUG] Found ${reservations.length} reservations to restore for project ${projectId}`);

        let missingInventoryCount = 0;

        for (const reservation of reservations) {
          const qty = Number(reservation.quantity || 0);
          if (!qty || qty <= 0) {
            await this.reservationModel.updateOne(
              { _id: reservation._id },
              { $set: { status: 'Cancelled' } },
              { session },
            );
            continue;
          }

          // STRICT RULES:
          // - Only affect RESERVED and AVAILABLE quantities
          // - DO NOT modify TOTAL quantity (stock)
          // We restore by: reserved -= releasedQty, available += releasedQty
          // (releasedQty is capped to current reserved to avoid underflow)
          
          const candidates: any[] = [];
          if (reservation.inventoryId) {
            candidates.push({ _id: reservation.inventoryId });
          }
          if (reservation.itemId) {
            candidates.push({ itemId: reservation.itemId });
            const itemIdStr = String(reservation.itemId);
            if (itemIdStr.startsWith('INV')) {
              candidates.push({ itemId: itemIdStr.replace(/^INV/, '') });
            } else {
              candidates.push({ itemId: 'INV' + itemIdStr });
            }
          }
          if (reservation.itemId && Types.ObjectId.isValid(String(reservation.itemId))) {
            candidates.push({ _id: new Types.ObjectId(String(reservation.itemId)) });
          }

          let inventory: any = null;

          // Tenant-safe lookup first
          const tenantMatch: any = { $or: [{ tenantId }, { tenantId: tenantId.toString() }] };
          for (const c of candidates) {
            inventory = await this.inventoryModel.findOne({ $and: [tenantMatch, { isDeleted: false, ...c }] }).session(session);
            if (inventory) break;
          }
          console.log(`[DEBUG INVENTORY] Lookup with tenant filter: ${reservation.itemId}, found: ${inventory ? 'YES' : 'NO'}`);

          // Fallback: without tenant filter (data may have wrong tenant)
          if (!inventory) {
            for (const c of candidates) {
              inventory = await this.inventoryModel.findOne({ isDeleted: false, ...c }).session(session);
              if (inventory) break;
            }
            console.log(`[DEBUG INVENTORY] Lookup WITHOUT tenant filter: ${reservation.itemId}, found: ${inventory ? 'YES' : 'NO'}`);
          }

          if (!inventory) {
            // Fallback: UI stock is driven by Items module, so try releasing reserved qty on Item directly.
            const itemIdStr = String(reservation.itemId || '');
            const itemIdVariants = Array.from(new Set([
              itemIdStr,
              itemIdStr.startsWith('INV') ? itemIdStr.replace(/^INV/, '') : `INV${itemIdStr}`,
            ].filter(Boolean)));

            let itemDoc: any = null;
            
            // Strategy 1: If we have itemObjectId (MongoDB _id), use it directly
            if (reservation.itemObjectId) {
              itemDoc = await this.itemModel.findById(reservation.itemObjectId).session(session);
              console.log(`[DEBUG ITEM RELEASE] Lookup by itemObjectId: ${reservation.itemObjectId}, found: ${itemDoc ? 'YES' : 'NO'}`);
            }
            
            // Strategy 2: If we have warehouse, find warehouse-specific instance
            if (!itemDoc && reservation.warehouse) {
              for (const v of itemIdVariants) {
                itemDoc = await this.itemModel.findOne({ 
                  tenantId, 
                  itemId: v, 
                  warehouse: reservation.warehouse,
                  isDeleted: false 
                }).session(session);
                if (itemDoc) break;
              }
              console.log(`[DEBUG ITEM RELEASE] Lookup by warehouse (${reservation.warehouse}): ${itemDoc ? 'YES' : 'NO'}`);
            }
            
            // Strategy 3: Fallback to base item (warehouse=null/undefined)
            if (!itemDoc) {
              for (const v of itemIdVariants) {
                itemDoc = await this.itemModel.findOne({ 
                  tenantId, 
                  itemId: v, 
                  $or: [{ warehouse: null }, { warehouse: '' }, { warehouse: { $exists: false } }],
                  isDeleted: false 
                }).session(session);
                if (itemDoc) break;
              }
              console.log(`[DEBUG ITEM RELEASE] Lookup by base item: ${itemDoc ? 'YES' : 'NO'}`);
            }
            
            // Strategy 4: Last resort - any item with this itemId
            if (!itemDoc) {
              for (const v of itemIdVariants) {
                itemDoc = await this.itemModel.findOne({ tenantId, itemId: v, isDeleted: false }).session(session);
                if (itemDoc) break;
              }
              console.log(`[DEBUG ITEM RELEASE] Lookup by itemId only: ${itemDoc ? 'YES' : 'NO'}`);
            }

            if (itemDoc) {
              // Use $inc for atomic decrement (safer for concurrent updates)
              const itemReleasedQty = Math.max(0, Math.min(qty, Number(itemDoc.reserved || 0)));

              console.log('[DEBUG ITEM RELEASE] Releasing reserved from item (fallback)', {
                projectId,
                itemId: itemDoc.itemId,
                qty,
                itemReservedBefore: itemDoc.reserved,
                itemReleasedQty,
              });

              // Use $inc to atomically decrease reserved
              await this.itemModel.updateOne(
                { _id: itemDoc._id },
                { $inc: { reserved: -itemReleasedQty } },
                { session },
              );

              // Verify the update
              const updatedItem = await this.itemModel.findById(itemDoc._id).session(session);
              console.log('[DEBUG ITEM RELEASE] Item after update', {
                itemId: updatedItem?.itemId,
                reserved: updatedItem?.reserved,
                stock: updatedItem?.stock,
                available: (updatedItem?.stock || 0) - (updatedItem?.reserved || 0),
              });

              await this.reservationModel.updateOne(
                { _id: reservation._id },
                { $set: { status: 'Cancelled' } },
                { session },
              );

              const updatedRes = await this.reservationModel.findById(reservation._id).session(session);
              console.log('[DEBUG ITEM RELEASE] Reservation status after update (fallback)', {
                reservationId: reservation._id,
                status: updatedRes?.status,
              });

              try {
                await this.stockMovementService.logMovement(tenantCode, {
                  itemId: itemDoc._id.toString(),
                  type: 'RELEASE',
                  quantity: qty,
                  reference: projectId,
                  referenceType: 'PROJECT',
                  note: `Released ${qty} units from cancelled project ${projectId}`,
                  warehouseName: (itemDoc as any).warehouse || 'Main Warehouse',
                });
              } catch (err) {
                console.error('[STOCK MOVEMENT] Failed to log RELEASE for cancelled project (item fallback):', err);
              }

              continue;
            }

            console.error('PROJECT CANCEL INVENTORY RELEASE - inventory item not found (inventory+items), aborting to avoid silent skip', {
              projectId,
              reservationId: reservation._id,
              itemId: reservation.itemId,
              inventoryId: reservation.inventoryId,
              quantity: qty,
              tenantId: tenantIdStr,
            });
            missingInventoryCount += 1;
            throw new Error(`Inventory not found for reservation ${reservation._id} (itemId=${reservation.itemId})`);
          }
          
          console.log(`[DEBUG INVENTORY] Found inventory: ${inventory.itemId}, _id: ${inventory._id}, tenantId: ${inventory.tenantId}`);

          const before = {
            reserved: inventory.reserved || 0,
            available: inventory.available || 0,
            stock: inventory.stock || 0,
          };
          console.log(`[DEBUG INVENTORY] BEFORE UPDATE - Item: ${reservation.itemId}, Available: ${before.available}, Reserved: ${before.reserved}, Stock: ${before.stock}, Releasing: ${qty}`);

          const reservedBefore = Number(inventory.reserved || 0);
          const availableBefore = Number(inventory.available || 0);
          const stockTotal = Number(inventory.stock || 0);

          const releasedQty = Math.max(0, Math.min(qty, reservedBefore));
          if (reservedBefore < qty) {
            console.warn('PROJECT CANCEL INVENTORY RELEASE - reserved underflow prevented by capping release to reserved', {
              projectId,
              itemId: reservation.itemId,
              quantity: qty,
              reserved: reservedBefore,
              releasedQty,
            });
          }

          const newReserved = Math.max(0, reservedBefore - releasedQty);
          const newAvailable = Math.max(0, availableBefore + releasedQty);
          if (stockTotal > 0 && newReserved + newAvailable !== stockTotal) {
            console.warn('PROJECT CANCEL INVENTORY RELEASE - integrity mismatch (reserved+available != stock)', {
              projectId,
              itemId: reservation.itemId,
              stock: stockTotal,
              reservedBefore,
              availableBefore,
              reservedAfter: newReserved,
              availableAfter: newAvailable,
            });
          }
          console.log(`[DEBUG INVENTORY] CALCULATED - Item: ${reservation.itemId}, releasedQty: ${releasedQty}, NewReserved: ${newReserved}, NewAvailable: ${newAvailable}`);

          await this.inventoryModel.updateOne(
            { _id: inventory._id },
            {
              $set: {
                reserved: newReserved,
                available: newAvailable,
                lastUpdated: new Date().toISOString().split('T')[0],
              },
            },
            { session },
          );
          console.log(`[DEBUG INVENTORY] MongoDB updateOne executed for ${reservation.itemId}`);

          const afterInv = await this.inventoryModel.findById(inventory._id).session(session);
          const after = {
            reserved: afterInv?.reserved || 0,
            available: afterInv?.available || 0,
            stock: afterInv?.stock || 0,
          };
          console.log(`[DEBUG INVENTORY] AFTER UPDATE - Item: ${reservation.itemId}, Available: ${after.available} (was ${before.available}, +${after.available - before.available}), Reserved: ${after.reserved} (was ${before.reserved}, -${before.reserved - after.reserved})`);

          console.log('PROJECT_CANCEL_INVENTORY_RELEASE', {
            projectId,
            itemId: reservation.itemId,
            quantity: qty,
            before,
            after,
            deltaAvailable: after.available - before.available,
            deltaReserved: before.reserved - after.reserved,
          });

          await this.reservationModel.updateOne(
            { _id: reservation._id },
            { $set: { status: 'Cancelled' } },
            { session },
          );

          // Log stock movement for RELEASE (Cancelled Project)
          try {
            await this.stockMovementService.logMovement(tenantCode, {
              itemId: inventory._id.toString(),
              type: 'RELEASE',
              quantity: qty,
              reference: projectId,
              referenceType: 'PROJECT',
              note: `Released ${qty} units from cancelled project ${projectId}`,
              warehouseName: inventory.warehouse || 'Main Warehouse',
            });
          } catch (err) {
            console.error('[STOCK MOVEMENT] Failed to log RELEASE for cancelled project:', err);
          }
        }

        // Mark inventory restored if we processed all reservations.
        // Even if some inventory was missing, we still cancelled those reservations.
        await this.projectModel.updateOne(
          { _id: project._id },
          { $set: { inventoryRestored: true, inventoryRestoredAt: new Date() } },
          { session },
        );
        console.log(`[DEBUG CANCEL] Inventory restored flag set, missingInventoryCount: ${missingInventoryCount}`);
      });
    } finally {
      await session.endSession();
    }

    const updated = await this.projectModel.findOne({ tenantId, projectId, isDeleted: false }).exec();
    if (!updated) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return updated;
  }

  async remove(tenantCode: string, projectId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId },
      { $set: { isDeleted: true } },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return { message: `Project ${projectId} deleted successfully` };
  }

  async restore(tenantCode: string, projectId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId, isDeleted: true },
      { $set: { isDeleted: false } },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found or not deleted`);
    }

    return { message: `Project ${projectId} restored successfully` };
  }

  async getStats(tenantCode: string, user?: UserWithVisibility) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    
    const allowedStatuses = ['Logistics', 'Installation', 'Commissioned', 'On Hold', 'Cancelled'];
    
    // Build match conditions for aggregation
    const matchConditions: any = {
      tenantId,
      isDeleted: false,
      status: { $in: allowedStatuses }, // Only include the 5 allowed statuses
    };
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        matchConditions.assignedTo = objectId;
      }
    }
    
    const stats = await this.projectModel.aggregate([
      {
        $match: matchConditions,
      },
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          totalCapacity: { $sum: '$systemSize' },
          avgProgress: { $avg: '$progress' },
          commissioned: {
            $sum: { $cond: [{ $eq: ['$status', 'Commissioned'] }, 1, 0] },
          },
          active: {
            $sum: { $cond: [{ $ne: ['$status', 'Commissioned'] }, 1, 0] },
          },
          totalValue: { $sum: '$value' },
        },
      },
    ]).exec();

    return stats[0] || {
      totalProjects: 0,
      totalCapacity: 0,
      avgProgress: 0,
      commissioned: 0,
      active: 0,
      totalValue: 0,
    };
  }

  async getProjectsByStage(tenantCode: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const allowedStatuses = ['Logistics', 'Installation', 'Commissioned', 'On Hold', 'Cancelled'];
    
    return this.projectModel.aggregate([
      {
        $match: {
          tenantId,
          isDeleted: false,
          status: { $in: allowedStatuses }, // Only include the 5 allowed statuses
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          capacity: { $sum: '$systemSize' },
        },
      },
    ]).exec();
  }

  async getProjectManagers(tenantCode: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const projects = await this.projectModel
      .find({ tenantId, isDeleted: false })
      .select('pm')
      .distinct('pm')
      .exec();
    return { projectManagers: projects.filter(pm => pm && pm.trim() !== '') };
  }

  /**
   * Create a project from an accepted quotation
   */
  async createFromQuotation(quotationId: string, tenantCode: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    // Step 1: Validate quotation exists
    const quotation = await this.documentModel
      .findOne({
        $or: [{ _id: this.toObjectId(quotationId) }, { documentId: quotationId }],
        tenantId,
        isDeleted: false,
      })
      .exec();

    if (!quotation) {
      throw new NotFoundException(`Quotation with id ${quotationId} not found`);
    }

    // Step 2: Check quotation status is ACCEPTED
    if (quotation.status !== 'accepted') {
      throw new BadRequestException(
        `Quotation status is '${quotation.status}'. Only accepted quotations can be converted to projects`,
      );
    }

    // Step 3: Prevent duplicate project creation
    const existingProject = await this.projectModel
      .findOne({
        tenantId,
        quotationId: this.toObjectId(quotationId),
        isDeleted: false,
      })
      .exec();

    if (existingProject) {
      throw new ConflictException(
        `Project already exists for this quotation (Project ID: ${existingProject.projectId})`,
      );
    }

    // Step 4: Validate items array is not empty
    if (!quotation.items || quotation.items.length === 0) {
      throw new BadRequestException('Quotation has no items. Cannot create project without items');
    }

    // Step 5: Map quotation data to project structure
    const projectData: any = {
      tenantId,
      leadId: quotation.leadId,
      quotationId: this.toObjectId(quotationId),
      customerName: quotation.customerName,
      email: quotation.customerEmail,
      mobileNumber: quotation.customerPhone,
      site: quotation.customerAddress || 'Not specified',
      systemSize: 0,
      status: 'Quotation',
      pm: 'TBD',
      startDate: new Date().toISOString().split('T')[0],
      estEndDate: '',
      progress: 0,
      value: quotation.total,
      paymentTerms: String((quotation as any).paymentTerms || ''),
      visitsPerMonth: String((quotation as any).visitInMonth || ''),
      totalVisits: String((quotation as any).totalVisit || ''),
      items: quotation.items.map((item, index) => ({
        itemId: `ITEM-${Date.now()}-${index}`,
        category: this.extractCategoryFromItem(item),
        itemName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.total,
      })),
      tax: quotation.taxAmount,
      discount: quotation.discount,
      notes: quotation.notes || '',
      milestones: [],
      materials: [],
      isDeleted: false,
    };

    // Step 6: Generate unique projectId
    const projectId = await this.generateProjectId(tenantId);
    projectData.projectId = projectId;

    // Step 7: Create and save project
    const project = new this.projectModel(projectData);
    const savedProject = await project.save();

    return savedProject;
  }

/**
 * Helper method to extract category from quotation item
 */
private extractCategoryFromItem(item: any): string {
  // Try to extract category from description or name
  const desc = (item.description || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  if (desc.includes('panel') || name.includes('panel')) return 'panel';
  if (desc.includes('inverter') || name.includes('inverter')) return 'inverter';
  if (desc.includes('battery') || name.includes('battery')) return 'battery';
  if (desc.includes('structure') || name.includes('structure')) return 'structure';
  if (desc.includes('cable') || name.includes('cable')) return 'cable';
  if (desc.includes('accessories') || name.includes('accessories')) return 'accessories';
  if (desc.includes('bos') || name.includes('bos')) return 'bos';
  
  return 'other'; // Default category
}

/**
 * Helper method to generate unique project ID
 */
private async generateProjectId(tenantId: Types.ObjectId): Promise<string> {
  const prefix = 'PRJ';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const projectId = `${prefix}-${timestamp}-${random}`;

  // Ensure uniqueness
  const existing = await this.projectModel.findOne({ projectId }).exec();
  if (existing) {
    return this.generateProjectId(tenantId); // Recursively generate new ID
  }

  return projectId;
}

/**
 * Helper method to convert string to ObjectId
 */
private toObjectId(id: string): Types.ObjectId {
  if (!id) return null as any;
  if (Types.ObjectId.isValid(id)) {
    return new Types.ObjectId(id);
  }
  // If it's not a valid ObjectId, try to find by documentId/projectId
  return null as any;
}

/**
 * Return reserved inventory to available stock when project is cancelled
 */
private async returnReservedInventoryToStock(tenantId: Types.ObjectId, projectId: string): Promise<void> {
  try {
    // Build query for both string and ObjectId projectId formats
    const projectQuery: any[] = [{ projectId: projectId }];
    if (Types.ObjectId.isValid(projectId)) {
      projectQuery.push({ projectId: new Types.ObjectId(projectId) });
    }

    // Find all active reservations for this project
    const reservations = await this.reservationModel.find({
      $or: projectQuery,
      status: { $nin: ['Cancelled', 'cancelled'] },
    }).exec();

    if (reservations.length === 0) {
      return;
    }

    // Process each reservation
    for (const reservation of reservations) {
      // Find the inventory item BY ITEMID ONLY - completely ignore tenantId
      const item = await this.inventoryModel.findOne({
        itemId: reservation.itemId,
      }).exec();

      if (item) {
        const newReserved = Math.max(0, item.reserved - reservation.quantity);
        const newAvailable = item.available + reservation.quantity;

        await this.inventoryModel.updateOne(
          { _id: item._id },
          { 
            $set: { 
              reserved: newReserved,
              available: newAvailable
            },
          },
        ).exec();
      }

      // Mark reservation as cancelled
      await this.reservationModel.updateOne(
        { _id: reservation._id },
        { $set: { status: 'Cancelled' } },
      ).exec();
    }
  } catch (error: any) {
    // Removed logger.error
  }
}

/**
 * MANUAL FIX: Adjust inventory for INV3552
 */
private async fixStuckInventoryForINV3552(tenantId: Types.ObjectId): Promise<void> {
  try {
    // Find the inventory item BY ITEMID ONLY - no tenant filter
    const inventoryItem = await this.inventoryModel.findOne({
      itemId: 'INV3552'
    }).exec();

    if (!inventoryItem) {
      return;
    }

    if (inventoryItem.reserved > 0) {
      const newReserved = 0;
      const newAvailable = inventoryItem.stock;

      await this.inventoryModel.updateOne(
        { _id: inventoryItem._id },
        { 
          $set: { 
            reserved: newReserved,
            available: newAvailable
          },
        },
      ).exec();
    }
  } catch (error: any) {
    // Removed logger.error
  }
}

/**
 * Force fix for INV3552
 */
async forceFixINV3552(tenantCode: string): Promise<any> {
  try {
    // Find the inventory item BY ITEMID ONLY
    const item = await this.inventoryModel.findOne({
      itemId: 'INV3552',
    }).exec();

    if (!item) {
      return { success: false, message: 'INV3552 not found' };
    }

    const before = {
      reserved: item.reserved,
      available: item.available,
    };

    // FORCE UPDATE: Set reserved to 0, available to stock
    const newReserved = 0;
    const newAvailable = item.stock;
    const clearedQty = item.reserved;

    await this.inventoryModel.updateOne(
      { _id: item._id },
      { 
        $set: { 
          reserved: newReserved,
          available: newAvailable
        },
      },
    ).exec();

    return {
      success: true,
      message: `Fixed INV3552: Cleared ${clearedQty} pcs from reserved`,
      before,
      after: {
        reserved: newReserved,
        available: newAvailable,
      },
    };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Unknown error' };
  }
}

}

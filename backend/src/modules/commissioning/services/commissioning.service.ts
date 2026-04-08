import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Commissioning } from '../schemas/commissioning.schema';
import { Project } from '../../projects/schemas/project.schema';
import {
  CreateCommissioningDto,
  UpdateCommissioningDto,
  UpdateCommissioningStatusDto,
  UpdateCommissioningTasksDto,
  AddPhotoDto,
  QualityCheckDto,
  CustomerSignOffUpdateDto,
} from '../dto/commissioning.dto';
import { CommissioningIntegrationService } from './commissioning-integration.service';
import { CommissioningTaskService } from '../../settings/services/commissioning-task.service';

export interface CommissioningQuery {
  tenantId: Types.ObjectId;
  status?: string;
  projectId?: string;
  technicianId?: string;
  assignedTo?: string;
  isDeleted?: boolean;
}

export interface UserContext {
  userId?: string;
  id?: string;
  tenantId: string;
  dataScope: 'ALL' | 'ASSIGNED' | 'NONE';
  role?: string;
}

@Injectable()
export class CommissioningService {
  private readonly logger = new Logger(CommissioningService.name);
  constructor(
    @InjectModel(Commissioning.name)
    private CommissioningModel: Model<Commissioning>,
    @InjectModel(Project.name)
    private projectModel: Model<Project>,
    private commissioningIntegration: CommissioningIntegrationService,
    private CommissioningTaskService: CommissioningTaskService,
  ) {}

  private toObjectId(id: string | Types.ObjectId | undefined): Types.ObjectId | null {
    if (!id) return null;
    if (typeof id === 'string') {
      // Check if it's already a valid ObjectId hex string (24 chars)
      if (Types.ObjectId.isValid(id) && id.length === 24) {
        return new Types.ObjectId(id);
      }
      // For string tenantIds like "default", create a deterministic ObjectId
      // by padding/truncating to 24 chars using a hash approach
      const padded = this.stringToObjectIdHex(id);
      return new Types.ObjectId(padded);
    }
    return id;
  }

  private stringToObjectIdHex(str: string): string {
    // Create a deterministic 24-char hex string from any string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex and pad to 24 chars
    const hex = Math.abs(hash).toString(16).padStart(24, '0');
    return hex.substring(0, 24);
  }

  private generateCommissioningId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `IL${timestamp}${random}`;
  }

  private calculateProgress(tasks: { done: boolean }[]): number {
    if (!tasks || tasks.length === 0) return 0;
    const doneCount = tasks.filter(t => t.done).length;
    return Math.round((doneCount / tasks.length) * 100);
  }

  private async logEvent(
    CommissioningId: string,
    eventType: string,
    userId?: Types.ObjectId,
    metadata?: any,
  ) {
    try {
      await this.CommissioningModel.updateOne(
        { _id: this.toObjectId(CommissioningId) },
        {
          $push: {
            events: { eventType, userId, timestamp: new Date(), metadata },
          },
        },
      );
    } catch (e) {
      console.error('[Commissioning] failed to log event', e);
    }
  }

  /**
   * Get all Commissionings with tenant filtering and data scope
   */
  async getCommissionings(userContext: UserContext, filters: {
    status?: string;
    projectId?: string;
    technicianId?: string;
    search?: string;
  } = {}): Promise<Commissioning[]> {
    // Handle tenantId - only convert to ObjectId if it's a valid 24-char hex string
    let tenantId: Types.ObjectId | string | null = null;
    if (userContext.tenantId) {
      if (Types.ObjectId.isValid(userContext.tenantId) && userContext.tenantId.length === 24) {
        tenantId = new Types.ObjectId(userContext.tenantId);
      } else {
        // If tenantId is a string name (like 'solarcorp'), skip tenant filter for now
        // or query by tenant name if schema supports it
        tenantId = userContext.tenantId;
      }
    }
    
    console.log('[Commissioning] getCommissionings called with tenantId:', userContext.tenantId);
    console.log('[Commissioning] Full userContext:', JSON.stringify(userContext));
    console.log('[Commissioning] Converted tenantId for query:', tenantId);

    const query: any = {
      isDeleted: { $ne: true },
    };

    // Only apply tenant filter if tenantId is a valid ObjectId (not a string name like 'solarcorp')
    if (tenantId && tenantId instanceof Types.ObjectId) {
      query.tenantId = tenantId;
    }

    // Apply data scope filtering
    if (userContext.dataScope === 'ASSIGNED') {
      // Convert userId to ObjectId for proper database matching
      const rawUserId = userContext.userId || userContext.id;
      console.log('[Commissioning] Raw userId from context:', rawUserId);
      const userIdObj = this.toObjectId(rawUserId);
      console.log('[Commissioning] Converted userIdObj:', userIdObj);
      
      // Only apply filter if we have a valid userId
      if (userIdObj) {
        // User should see Commissionings where:
        // 1. They are assigned (assignedTo)
        // 2. They are the technician (technicianId)
        // 3. They created the record (createdBy) - CREATOR ACCESS
        query.$or = [
          { assignedTo: userIdObj },
          { technicianId: userIdObj },
          { createdBy: userIdObj }
        ];
      }
    }

    // Apply additional filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.projectId) {
      query.projectId = filters.projectId;
    }
    if (filters.technicianId) {
      query.technicianId = filters.technicianId;
    }

    console.log('[Commissioning] Final query with all filters:', JSON.stringify(query));

    let Commissionings = await this.CommissioningModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Manually populate projectId only if it's a valid ObjectId
    const populatedCommissionings = await Promise.all(Commissionings.map(async (inst) => {
      if (inst.projectId && Types.ObjectId.isValid(inst.projectId.toString())) {
        const project = await this.projectModel.findById(inst.projectId).select('projectId customerName site systemSize').lean().exec();
        if (project) {
          (inst as any).projectId = project;
        }
      }
      return inst;
    }));

    // Populate technicianId (this is usually a valid ObjectId ref)
    const fullyPopulated = await this.CommissioningModel.populate(populatedCommissionings, {
      path: 'technicianId',
      select: 'firstName lastName email'
    });
    
    console.log('[Commissioning] Commissionings found:', fullyPopulated.length);
    
    // Text search if provided
    let result = fullyPopulated;
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      result = fullyPopulated.filter(
        inst => searchRegex.test(inst.customerName) || searchRegex.test(inst.site)
      );
    }

    return result;
  }

  /**
   * Get single Commissioning by ID
   */
  async getCommissioningById(id: string, userContext: UserContext): Promise<Commissioning> {
    const query: any = { _id: this.toObjectId(id), isDeleted: false };
    
    // Note: tenantId filter intentionally omitted to match getCommissionings behavior
    // The data scope check (ASSIGNED) handles visibility
    
    const Commissioning = await this.CommissioningModel
      .findOne(query)
      .populate('projectId', 'projectId customerName site systemSize status')
      .populate('technicianId', 'firstName lastName email phone')
      .populate('assignedTo', 'firstName lastName email')
      .populate('supervisorId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .exec();
    
    // Debug: Get raw document without populate
    const rawDoc = await this.CommissioningModel.findOne(query).lean().exec();
    console.log('[DEBUG] Raw doc assignedTo:', rawDoc?.assignedTo, 'technicianId:', rawDoc?.technicianId);
    console.log('[DEBUG] Populated assignedTo:', Commissioning?.assignedTo, 'technicianId:', Commissioning?.technicianId);

    if (!Commissioning) {
      throw new NotFoundException(`Commissioning with ID ${id} not found`);
    }

    // Check data scope - use rawDoc for permission check (populate may nullify refs)
    if (userContext.dataScope === 'ASSIGNED') {
      const userId = userContext.userId || userContext.id;
      
      // Use raw document values since populate may return null for missing refs
      const rawAssignedTo = rawDoc?.assignedTo;
      const rawTechnicianId = rawDoc?.technicianId;
      const rawCreatedBy = rawDoc?.createdBy;
      
      // Extract IDs from raw document
      const assignedId = rawAssignedTo?._id?.toString() || rawAssignedTo?.toString();
      const techId = rawTechnicianId?._id?.toString() || rawTechnicianId?.toString();
      const creatorId = rawCreatedBy?._id?.toString() || rawCreatedBy?.toString();
      
      // User can access if:
      // 1. They are assigned (assignedTo)
      // 2. They are the technician (technicianId)
      // 3. They created the record (createdBy) - CREATOR ACCESS
      const isAssigned = assignedId === userId;
      const isTechnician = techId === userId;
      const isCreator = creatorId === userId;
      
      console.log('[DATA_SCOPE_CHECK]', { userId, assignedId, techId, creatorId, isAssigned, isTechnician, isCreator });
      
      if (!isAssigned && !isTechnician && !isCreator) {
        throw new ForbiddenException('You do not have access to this Commissioning');
      }
    }

    return Commissioning;
  }


  /**
   * Get Commissioning by project ID
   */
  async getCommissioningByProjectId(projectId: string, userContext: UserContext): Promise<Commissioning | null> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const projectObjectId = this.toObjectId(projectId);

    const query: any = {
      projectId: projectObjectId,
      isDeleted: false,
    };

    if (tenantId) {
      query.tenantId = tenantId;
    }

    if (userContext.dataScope === 'ASSIGNED') {
      query.assignedTo = userContext.userId;
    }

    return this.CommissioningModel
      .findOne(query)
      .populate('technicianId', 'firstName lastName email')
      .exec();
  }

  /**
   * Create new Commissioning
   */
  async createCommissioning(
    createDto: CreateCommissioningDto,
    userContext: UserContext,
  ): Promise<Commissioning> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    // Generate Commissioning ID if not provided
    const CommissioningId = createDto.commissioningId || this.generateCommissioningId();

    // fetch default tasks from settings (ignore any tasks passed by client)
    let tasks = [];
    try {
      const cfg = await this.CommissioningTaskService.getConfig(userContext.tenantId);
      tasks = (cfg.tasks || []).map((t: any) => ({ name: t.name, done: false, photoRequired: !!t.photoRequired }));
    } catch (e) {
      // if settings lookup fails, allow client-provided or empty
      tasks = createDto.tasks || [];
    }

    // Calculate initial progress from tasks
    const progress = this.calculateProgress(tasks);

    const CommissioningData: any = {
      ...createDto,
      CommissioningId,
      tenantId,
      progress,
      tasks,
      createdBy: userId,
      assignedTo: createDto.assignedTo ? this.toObjectId(createDto.assignedTo) : userId,
      // If projectId is a valid mongo ID, convert it, otherwise keep as string (formatted PXXXX)
      projectId: createDto.projectId ? (Types.ObjectId.isValid(createDto.projectId) ? this.toObjectId(createDto.projectId) : createDto.projectId) : undefined,
      // projectIdString is required by schema - use provided value or convert from projectId
      projectIdString: createDto.projectIdString || (createDto.projectId ? String(createDto.projectId) : ''),
      dispatchId: createDto.dispatchId ? (Types.ObjectId.isValid(createDto.dispatchId) ? this.toObjectId(createDto.dispatchId) : createDto.dispatchId) : undefined,
      technicianId: this.toObjectId(createDto.technicianId),
      supervisorId: createDto.supervisorId ? this.toObjectId(createDto.supervisorId) : undefined,
    };

    console.log('[Commissioning] Creating with data:', JSON.stringify({
      CommissioningId: CommissioningData.CommissioningId,
      projectId: CommissioningData.projectId,
      customerName: CommissioningData.customerName,
      site: CommissioningData.site
    }));

    const Commissioning = new this.CommissioningModel(CommissioningData);
    const saved = await Commissioning.save();
    // log creation event
    await this.logEvent(saved._id.toString(), 'Commissioning_created', userId || undefined, {
      CommissioningId: saved.CommissioningId,
    });
    // if technicianId provided, log assignment event
    if (saved.technicianId) {
      await this.logEvent(saved._id.toString(), 'technician_assigned', userId || undefined, { to: saved.technicianId });
    }
    return saved;
  }

  /**
   * Create Commissioning from dispatch (auto-creation when dispatch is delivered)
   */
  async createCommissioningFromDispatch(
    dispatchData: {
      projectId: string;
      dispatchId: string;
      customerName: string;
      site: string;
      tenantId: string;
      items: string;
    },
    userContext: UserContext,
  ): Promise<Commissioning> {
    console.log('[Commissioning TRIGGERED]', dispatchData.dispatchId);
    
    // Use tenantId from dispatch or fall back to user context tenantId
    const dispatchTenantId = dispatchData.tenantId || userContext.tenantId;
    const tenantId = dispatchTenantId ? this.toObjectId(dispatchTenantId) : null;
    const userId = this.toObjectId(userContext.userId || userContext.id || '');
    
    console.log('[Commissioning] Dispatch tenantId:', dispatchData.tenantId);
    console.log('[Commissioning] User context tenantId:', userContext.tenantId);
    console.log('[Commissioning] Final converted tenantId:', tenantId);

    // Check if Commissioning already exists for this dispatch
    const existingQuery: any = {
      dispatchId: dispatchData.dispatchId, // Use STRING, not ObjectId
      isDeleted: { $ne: true },
    };
    if (tenantId) {
      existingQuery.tenantId = tenantId;
    }
    const existing = await this.CommissioningModel.findOne(existingQuery);
    
    console.log('[Commissioning] Existing Commissioning check:', existing ? 'Found' : 'Not found');

    if (existing) {
      console.log('[Commissioning] Duplicate found - returning existing:', existing._id);
      return existing; // Return existing instead of throwing error
    }

    // Look up the project by its custom projectId string (e.g., "PRJ001")
    const projectQuery: any = {
      projectId: dispatchData.projectId,
      isDeleted: false,
    };
    if (tenantId) {
      projectQuery.tenantId = tenantId;
    }
    
    console.log('[Commissioning] Project query:', JSON.stringify(projectQuery));
    
    let project = await this.projectModel.findOne(projectQuery);

    if (!project) {
      console.error(`[Commissioning] Project not found with projectId: ${dispatchData.projectId}`);
      console.error(`[Commissioning] Query was:`, JSON.stringify(projectQuery));
      
      // Try to find project without tenant filter (Super Admin case)
      project = await this.projectModel.findOne({
        projectId: dispatchData.projectId,
        isDeleted: false,
      });
      
      if (project) {
        console.log('[Commissioning] Found project without tenant filter:', project._id.toString());
      } else {
        throw new NotFoundException(`Project with ID ${dispatchData.projectId} not found`);
      }
    }

    console.log('[Commissioning] Found project:', project._id.toString());
    console.log('[Commissioning] Project tenantId:', project.tenantId);

    // Use project's tenantId as final fallback
    const effectiveTenantId = tenantId || project.tenantId;
    console.log('[Commissioning] Effective tenantId for Commissioning:', effectiveTenantId);

    if (!effectiveTenantId) {
      throw new BadRequestException('Cannot create Commissioning: no tenantId available from dispatch, user context, or project');
    }

    const CommissioningId = this.generateCommissioningId();

    // Default Commissioning tasks based on settings or legacy defaults
    let defaultTasks = [];
    try {
      const cfg = await this.CommissioningTaskService.getConfig(dispatchTenantId || userContext.tenantId);
      defaultTasks = (cfg.tasks || []).map((t: any) => ({ name: t.name, done: false, photoRequired: !!t.photoRequired }));
    } catch (e) {
      defaultTasks = [
        { name: 'Mounting Structure Installed', done: false },
        { name: 'Panel Mounting (Row 1–5)', done: false },
        { name: 'Panel Mounting (Row 6–10)', done: false },
        { name: 'DC Wiring', done: false },
        { name: 'Inverter Commissioning', done: false },
        { name: 'AC Wiring & DB', done: false },
        { name: 'Earthing', done: false },
      ];
    }

    const Commissioning = new this.CommissioningModel({
      CommissioningId,
      projectId: project._id, // Use the actual MongoDB ObjectId
      dispatchId: dispatchData.dispatchId, // Use STRING, don't convert to ObjectId
      customerName: dispatchData.customerName,
      site: dispatchData.site,
      technicianId: new Types.ObjectId('000000000000000000000000'), // Placeholder ObjectId (will be replaced on assignment)
      technicianName: 'Not Assigned',
      scheduledDate: new Date(), // Set current date as placeholder
      status: 'Pending Assign',
      progress: 0,
      tasks: defaultTasks,
      notes: `Auto-created from Dispatch ${dispatchData.dispatchId}. Items: ${dispatchData.items}`,
      tenantId: effectiveTenantId,
      createdBy: userId,
      assignedTo: null, // No auto-assignment
    });

    const saved = await Commissioning.save();
    await this.logEvent(saved._id.toString(), 'Commissioning_created', userId || undefined, { dispatchId: dispatchData.dispatchId });

    console.log('[Commissioning CREATED]', {
      _id: saved._id,
      CommissioningId: saved.CommissioningId,
      dispatchId: saved.dispatchId,
      projectId: saved.projectId,
      status: saved.status,
      tenantId: saved.tenantId,
    });
    return saved;
  }

  /**
   * Update Commissioning
   */
  async updateCommissioning(
    id: string,
    updateDto: UpdateCommissioningDto,
    userContext: UserContext,
  ): Promise<Commissioning> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    const Commissioning = await this.getCommissioningById(id, userContext);

    // log technician/assignment change
    if (updateDto.technicianId && updateDto.technicianId !== Commissioning.technicianId?.toString()) {
      await this.logEvent(id, 'technician_assigned', userId || undefined, { from: Commissioning.technicianId, to: updateDto.technicianId });
    }
    if (updateDto.assignedTo && updateDto.assignedTo !== Commissioning.assignedTo?.toString()) {
      await this.logEvent(id, 'technician_assigned', userId || undefined, { from: Commissioning.assignedTo, to: updateDto.assignedTo });
    }

    // Recalculate progress if tasks updated
    let progress = Commissioning.progress;
    if (updateDto.tasks) {
      progress = this.calculateProgress(updateDto.tasks);
    }

    const updateData: any = {
      ...updateDto,
      // ignore any manual progress value
      progress,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    // Convert ObjectId fields — handle null explicitly to allow unassigning
    if (updateDto.technicianId === null || updateDto.technicianId === '') {
      updateData.technicianId = null;
    } else if (updateDto.technicianId) {
      updateData.technicianId = this.toObjectId(updateDto.technicianId);
    }
    if (updateDto.supervisorId === null || updateDto.supervisorId === '') {
      updateData.supervisorId = null;
    } else if (updateDto.supervisorId) {
      updateData.supervisorId = this.toObjectId(updateDto.supervisorId);
    }
    if (updateDto.assignedTo === null || updateDto.assignedTo === '') {
      updateData.assignedTo = null;
    } else if (updateDto.assignedTo) {
      updateData.assignedTo = this.toObjectId(updateDto.assignedTo);
    }
    if (updateDto.projectId) {
      updateData.projectId = this.toObjectId(updateDto.projectId);
    }

    // Build query — only include tenantId filter when available (Super Admin has null tenantId)
    const updateQuery: any = { _id: this.toObjectId(id), isDeleted: { $ne: true } };
    if (tenantId) updateQuery.tenantId = tenantId;

    const updated = await this.CommissioningModel.findOneAndUpdate(
      updateQuery,
      { $set: updateData },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Commissioning with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Update Commissioning status
   */
  async updateStatus(
    id: string,
    statusDto: UpdateCommissioningStatusDto,
    userContext: UserContext,
  ): Promise<Commissioning> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    await this.getCommissioningById(id, userContext); // Verify access

    const updateData: any = {
      status: statusDto.status,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    // progress is derived automatically from tasks; ignore any attempt to set it via status update

    // Handle status-specific logic
    if (statusDto.status === 'In Progress' && !updateData.startTime) {
      updateData.startTime = new Date();
    }

    if (statusDto.status === 'Delayed') {
      updateData.delayedAt = new Date();
      if (statusDto.delayReason) {
        updateData.delayReason = statusDto.delayReason;
      }
    }

    if (statusDto.status === 'Completed') {
      // validation before marking complete
      const Commissioning = await this.CommissioningModel.findOne({
        _id: this.toObjectId(id),
      });
      if (Commissioning) {
        const incomplete = Commissioning.tasks?.some(t => !t.done);
        if (incomplete) {
          throw new BadRequestException('All tasks must be completed before marking Commissioning completed');
        }
        const photoNeeded = Commissioning.tasks?.some(t => t.photoRequired);
        if (photoNeeded && (!Commissioning.photos || Commissioning.photos.length === 0)) {
          throw new BadRequestException('Required photo evidence missing, cannot complete Commissioning');
        }
      }

      updateData.endTime = new Date();
      // Ensure 100% progress when completed
      updateData.progress = 100;
      // Mark all tasks as done
      if (Commissioning && Commissioning.tasks) {
        updateData.tasks = Commissioning.tasks.map(t => ({
          ...t,
          done: true,
          completedAt: t.completedAt || new Date(),
          completedBy: t.completedBy || userId,
        }));
      }
    }

    const updated = await this.CommissioningModel.findOneAndUpdate(
      { _id: this.toObjectId(id), isDeleted: false },
      { $set: updateData },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Commissioning with ID ${id} not found after update`);
    }


    return updated;
  }

  /**
   * Update Commissioning tasks
   */
  async updateTasks(
    id: string,
    tasksDto: UpdateCommissioningTasksDto,
    userContext: UserContext,
  ): Promise<Commissioning> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    const Commissioning = await this.getCommissioningById(id, userContext); // Verify access and get current data

    // validate photo requirement: if any task is being marked done and requires photo, ensure we have at least one photo on the Commissioning
    if (tasksDto.tasks.some(t => t.done && t.photoRequired)) {
      if (!Commissioning.photos || Commissioning.photos.length === 0) {
        throw new BadRequestException('Cannot complete photo‑required task without uploading photo');
      }
    }

    // Add completed metadata to tasks
    const tasks = tasksDto.tasks.map(task => ({
      ...task,
      completedAt: task.done ? (task.completedAt || new Date()) : undefined,
      completedBy: task.done ? (task.completedBy ? this.toObjectId(task.completedBy) : userId) : undefined,
    }));

    const progress = this.calculateProgress(tasks);

    // Auto-complete: if all tasks are done (100%), set status to Completed
    const allTasksDone = tasks.length > 0 && tasks.every(t => t.done);
    const currentStatus = Commissioning.status;
    const newStatus = allTasksDone && currentStatus !== 'Completed' ? 'Completed' : currentStatus;

    const updated = await this.CommissioningModel.findOneAndUpdate(
      { _id: this.toObjectId(id), isDeleted: false },
      {
        $set: {
          tasks,
          progress,
          status: newStatus,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    // emit events for completed tasks based on diff against prior Commissioning
    for (let i = 0; i < tasks.length; i++) {
      const prev = Commissioning.tasks[i];
      const curr = tasks[i];
      if (!prev?.done && curr.done) {
        await this.logEvent(id, 'task_completed', userId || undefined, { taskName: curr.name });
      }
    }

    if (!updated) {
      throw new NotFoundException(`Commissioning with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Add photo to Commissioning
   */
  async addPhoto(
    id: string,
    photoDto: AddPhotoDto,
    userContext: UserContext,
  ): Promise<Commissioning> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    // Verify access by checking if Commissioning exists and user has permission
    const Commissioning = await this.CommissioningModel.findOne({
      _id: this.toObjectId(id),
      isDeleted: false,
    });

    if (!Commissioning) {
      throw new NotFoundException(`Commissioning with ID ${id} not found`);
    }

    // Check data scope permissions
    if (userContext.dataScope === 'ASSIGNED') {
      const rawAssignedTo = Commissioning.assignedTo?.toString();
      const rawTechnicianId = Commissioning.technicianId?.toString();
      const currentUserId = userContext.userId || userContext.id;
      
      const isAssigned = rawAssignedTo === currentUserId;
      const isTechnician = rawTechnicianId === currentUserId;
      
      if (!isAssigned && !isTechnician) {
        throw new ForbiddenException('You do not have access to this Commissioning');
      }
    }

    const photo = {
      url: photoDto.url,
      key: photoDto.key,
      uploadedAt: new Date(),
      uploadedBy: userId,
      caption: photoDto.caption,
      category: photoDto.category,
    };

    // log photo upload event
    await this.logEvent(id, 'photo_uploaded', userId || undefined, { key: photo.key });

    const updated = await this.CommissioningModel.findOneAndUpdate(
      { _id: this.toObjectId(id), isDeleted: false },
      {
        $push: { photos: photo },
        $set: {
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Commissioning with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Remove photo from Commissioning
   */
  async removePhoto(
    id: string,
    photoKey: string,
    userContext: UserContext,
  ): Promise<Commissioning> {
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    await this.getCommissioningById(id, userContext); // Verify access

    const updated = await this.CommissioningModel.findOneAndUpdate(
      { _id: this.toObjectId(id), isDeleted: false },
      {
        $pull: { photos: { key: photoKey } },
        $set: {
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Commissioning with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Update quality check
   */
  async updateQualityCheck(
    id: string,
    qualityDto: QualityCheckDto,
    userContext: UserContext,
  ): Promise<Commissioning> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    await this.getCommissioningById(id, userContext); // Verify access

    const updated = await this.CommissioningModel.findOneAndUpdate(
      { _id: this.toObjectId(id), tenantId, isDeleted: false },
      {
        $set: {
          qualityCheckPassed: qualityDto.passed,
          qualityCheckNotes: qualityDto.notes,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Commissioning with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Update customer sign-off
   */
  async updateCustomerSignOff(
    id: string,
    signOffDto: CustomerSignOffUpdateDto,
    userContext: UserContext,
  ): Promise<Commissioning> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    await this.getCommissioningById(id, userContext); // Verify access

    const signOffData = {
      signed: signOffDto.signed,
      signedAt: signOffDto.signed ? new Date() : undefined,
      signatureUrl: signOffDto.signatureUrl,
    };

    const updated = await this.CommissioningModel.findOneAndUpdate(
      { _id: this.toObjectId(id), tenantId, isDeleted: false },
      {
        $set: {
          customerSignOff: signOffData,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Commissioning with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Delete Commissioning (soft delete)
   */
  async deleteCommissioning(id: string, userContext: UserContext): Promise<void> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const userId = this.toObjectId(userContext.userId || userContext.id || '');

    await this.getCommissioningById(id, userContext); // Verify access

    const result = await this.CommissioningModel.updateOne(
      { _id: this.toObjectId(id), tenantId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException(`Commissioning with ID ${id} not found`);
    }
  }

  /**
   * Assign Commissioning to a user
   * Updates assignedTo and tracks who made the assignment (assignedBy)
   */
  async assignCommissioning(
    id: string,
    assignedTo: string,
    userContext: UserContext,
  ): Promise<Commissioning> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const assignedById = this.toObjectId(userContext.userId || userContext.id || '');
    const assignedToId = this.toObjectId(assignedTo);

    if (!assignedToId) {
      throw new BadRequestException('Invalid assignedTo user ID');
    }

    // Verify the Commissioning exists and user has access
    await this.getCommissioningById(id, userContext);

    // Build query with tenant filter
    const updateQuery: any = { _id: this.toObjectId(id), isDeleted: false };
    if (tenantId) updateQuery.tenantId = tenantId;

    // Update both assignedTo and assignedBy
    const updated = await this.CommissioningModel.findOneAndUpdate(
      updateQuery,
      {
        $set: {
          assignedTo: assignedToId,
          assignedBy: assignedById,
          updatedAt: new Date(),
        },
      },
      { new: true },
    ).populate('assignedTo', 'firstName lastName email');

    if (!updated) {
      throw new NotFoundException(`Commissioning with ID ${id} not found`);
    }

    // Log assignment event
    await this.logEvent(id, 'assigned', assignedById || undefined, {
      assignedTo: assignedToId.toString(),
      assignedBy: assignedById?.toString(),
    });

    return updated;
  }

  /**
   * Get Commissioning statistics for dashboard
   */
  async getStatistics(userContext: UserContext): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    delayed: number;
    completed: number;
    commissioned: number;
    averageProgress: number;
  }> {
    const tenantId = this.toObjectId(userContext.tenantId);

    const query: any = { isDeleted: false };
    if (tenantId) {
      query.tenantId = tenantId;
    }
    
    // Apply visibility filtering for ASSIGNED dataScope
    if (userContext.dataScope === 'ASSIGNED') {
      const rawUserId = userContext.userId || userContext.id;
      const userIdObj = this.toObjectId(rawUserId);
      
      if (userIdObj) {
        // User should see statistics for Commissionings where:
        // 1. They are assigned (assignedTo)
        // 2. They are the technician (technicianId)
        // 3. They created the record (createdBy) - CREATOR ACCESS
        query.$or = [
          { assignedTo: userIdObj },
          { technicianId: userIdObj },
          { createdBy: userIdObj }
        ];
      }
    }

    const [
      total,
      pending,
      inProgress,
      delayed,
      completed,
      progressData,
    ] = await Promise.all([
      this.CommissioningModel.countDocuments(query),
      this.CommissioningModel.countDocuments({ ...query, status: 'Pending' }),
      this.CommissioningModel.countDocuments({ ...query, status: 'In Progress' }),
      this.CommissioningModel.countDocuments({ ...query, status: 'Delayed' }),
      this.CommissioningModel.countDocuments({ ...query, status: 'Completed' }),
      this.CommissioningModel.aggregate([
        { $match: { ...query, status: { $in: ['Pending', 'In Progress', 'Delayed'] } } },
        { $group: { _id: null, avgProgress: { $avg: '$progress' } } },
      ]),
    ]);

    const averageProgress = progressData.length > 0 ? Math.round(progressData[0].avgProgress) : 0;

    return {
      total,
      pending,
      inProgress,
      delayed,
      completed,
      commissioned: completed, // Alias for frontend compatibility
      averageProgress,
    };
  }

  /**
   * Returns chronological events for a single Commissioning
   */
  async getTimeline(id: string, userContext: UserContext): Promise<any[]> {
    const inst = await this.getCommissioningById(id, userContext);
    return (inst.events || []).sort((a, b) => (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  }

  /**
   * Get calendar events across Commissionings with optional filters
   */
  async getCalendarEvents(
    userContext: UserContext,
    filters: {
      from?: string;
      to?: string;
      technicianId?: string;
      projectId?: string;
      status?: string;
    } = {},
  ): Promise<any[]> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const query: any = { isDeleted: false };
    if (tenantId) query.tenantId = tenantId;
    
    // Apply visibility filtering for ASSIGNED dataScope
    if (userContext.dataScope === 'ASSIGNED') {
      const rawUserId = userContext.userId || userContext.id;
      const userIdObj = this.toObjectId(rawUserId);
      
      if (userIdObj) {
        // User should see calendar events for Commissionings where:
        // 1. They are assigned (assignedTo)
        // 2. They are the technician (technicianId)
        // 3. They created the record (createdBy) - CREATOR ACCESS
        query.$or = [
          { assignedTo: userIdObj },
          { technicianId: userIdObj },
          { createdBy: userIdObj }
        ];
      }
    }
    
    if (filters.technicianId) query.technicianId = this.toObjectId(filters.technicianId);
    if (filters.projectId) query.projectId = this.toObjectId(filters.projectId);
    if (filters.status) query.status = filters.status;
    if (filters.from || filters.to) {
      query['events.timestamp'] = {};
      if (filters.from) query['events.timestamp'].$gte = new Date(filters.from);
      if (filters.to) query['events.timestamp'].$lte = new Date(filters.to);
    }

    const docs = await this.CommissioningModel.find(query, 'CommissioningId events').exec();
    const events: any[] = [];
    docs.forEach(d => {
      (d.events || []).forEach(evt => {
        const obj = (evt as any).toObject ? (evt as any).toObject() : evt;
        events.push({ CommissioningId: d.CommissioningId, ...obj });
      });
    });
    // sort ascending by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return events;
  }

  /**
   * Check overdue Commissionings and mark as Delayed
   * Calculates delay days for each overdue Commissioning
   */
  async checkOverdueCommissionings(userContext: UserContext): Promise<{ updated: number; Commissionings: any[] }> {
    const tenantId = this.toObjectId(userContext.tenantId);
    const now = new Date();
    
    // Find Commissionings with dueDate passed but not completed
    const query: any = {
      isDeleted: false,
      status: { $nin: ['Completed', 'Delayed'] },
      dueDate: { $exists: true, $ne: null, $lt: now }
    };
    if (tenantId) query.tenantId = tenantId;
    
    const overdueCommissionings = await this.CommissioningModel.find(query).exec();
    const updatedCommissionings = [];
    
    for (const Commissioning of overdueCommissionings) {
      // Calculate delay days
      const dueDate = new Date(Commissioning.dueDate!);
      const delayDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Update status to Delayed and set delayDays
      Commissioning.status = 'Delayed';
      Commissioning.delayDays = delayDays;
      await Commissioning.save();
      
      updatedCommissionings.push({
        id: Commissioning._id,
        CommissioningId: Commissioning.CommissioningId,
        delayDays: delayDays,
        dueDate: Commissioning.dueDate
      });
    }
    
    return {
      updated: updatedCommissionings.length,
      Commissionings: updatedCommissionings
    };
  }

  /**
   * Check if user has access to this Commissioning (as technician, assigned user, or creator)
   */
  async isAssignedTechnician(id: string, userId: string): Promise<boolean> {
    const Commissioning = await this.CommissioningModel.findById(id).exec();
    if (!Commissioning) return false;
    
    const techId = Commissioning.technicianId?.toString();
    const assignedId = Commissioning.assignedTo?.toString();
    const creatorId = Commissioning.createdBy?.toString();
    
    // User has access if they are:
    // 1. The technician
    // 2. The assigned user
    // 3. The creator of the record
    return techId === userId || assignedId === userId || creatorId === userId;
  }
}

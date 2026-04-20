import { BadRequestException, Injectable, NotFoundException, forwardRef, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SiteSurvey, SiteSurveyDocument, SurveyStatus } from '../schemas/site-survey.schema';
import {
  CreateSiteSurveyDto,
  UpdateSiteSurveyDto,
  QuerySiteSurveyDto,
  MoveToActiveDto,
  MoveToCompleteDto,
  AssignSurveyDto
} from '../dto/site-survey.dto';
import { LeadsService } from '../../leads/services/leads.service';
import { UserWithVisibility, buildCompleteFilter, canAccessRecord } from '../../../common/utils/visibility-filter';

@Injectable()
export class SiteSurveysService {
  private readonly logger = new Logger(SiteSurveysService.name);

  constructor(
    @InjectModel(SiteSurvey.name) private surveyModel: Model<SiteSurveyDocument>,
    @Inject(forwardRef(() => LeadsService))
    private leadsService: LeadsService
  ) {}

  // Build complete filter with tenant isolation AND visibility rules
  private buildCompleteFilter(tenantId?: string, user?: UserWithVisibility, baseFilter: any = {}): any {
    // Use the centralized buildCompleteFilter from visibility-filter.ts
    // This properly respects dataScope (ALL vs ASSIGNED)
    return buildCompleteFilter(tenantId, user, baseFilter);
  }

  async updateAssignmentByLeadId(
    leadId: string,
    assignedTo: string | undefined,
    tenantId?: string,
    user?: UserWithVisibility,
  ): Promise<void> {
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new BadRequestException('Tenant context is required for updating surveys');
    }

    const leadObjId = this.toObjectId(leadId);
    const assignedToId = assignedTo && Types.ObjectId.isValid(assignedTo) ? new Types.ObjectId(assignedTo) : undefined;

    const filter: any = {
      tenantId: tid,
      isDeleted: { $ne: true },
      $or: [
        ...(leadObjId ? [{ leadId: leadObjId }] : []),
        { leadId }, // legacy string leadId support
      ],
    };

    await this.surveyModel
      .updateOne(filter, { $set: { assignedTo: assignedToId || undefined, updatedAt: new Date() } })
      .exec();
  }

  // Check if user can access a specific survey
  private canAccessSurvey(user: UserWithVisibility, survey: any): boolean {
    return canAccessRecord(user, {
      assignedTo: survey?.assignedTo,
      createdBy: survey?.createdBy,
      tenantId: survey?.tenantId,
    });
  }

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    return undefined;
  }

  // Generate unique survey ID
  private generateSurveyId(): string {
    const prefix = 'SVY';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Create new site survey (from lead stage change)
  async create(createDto: CreateSiteSurveyDto, tenantId?: string, user?: UserWithVisibility): Promise<SiteSurvey> {
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new BadRequestException('Tenant context is required for creating surveys');
    }

    // Get current user ID for createdBy
    const rawUserId = (user?._id ? user._id.toString() : user?.id) || undefined;
    const createdById = rawUserId && Types.ObjectId.isValid(rawUserId) ? new Types.ObjectId(rawUserId) : undefined;

    const assignedToId = createDto.assignedTo && Types.ObjectId.isValid(createDto.assignedTo)
      ? new Types.ObjectId(createDto.assignedTo)
      : undefined;

    const leadObjId = createDto.leadId && Types.ObjectId.isValid(createDto.leadId)
      ? new Types.ObjectId(createDto.leadId)
      : undefined;

    const surveyData = {
      ...createDto,
      leadId: leadObjId,
      surveyId: this.generateSurveyId(),
      status: SurveyStatus.PENDING,
      tenantId: tid,
      createdBy: createdById,
      assignedTo: assignedToId || createdById || undefined, // ensure visibility for ASSIGNED users
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const createdSurvey = new this.surveyModel(surveyData);
    return createdSurvey.save();
  }

  // Find all surveys with filters - populates fresh lead data
  async findAll(
    query: QuerySiteSurveyDto,
    tenantId?: string,
    user?: UserWithVisibility,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const {
      status,
      city,
      engineer,
      search,
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Build complete filter with tenant isolation
    const filter = this.buildCompleteFilter(tenantId, user, {});

    if (status) {
      filter.status = status;
    }

    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    if (engineer) {
      filter.engineer = { $regex: engineer, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { surveyId: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [surveys, total] = await Promise.all([
      this.surveyModel
        .find(filter)
        .populate('leadId')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.surveyModel.countDocuments(filter).exec()
    ]);

    // Enrich with fresh lead data
    const enrichedData = await Promise.all(
      surveys.map(async (survey) => {
        const surveyObj = survey.toObject();
        try {
          console.log(`[DEBUG] Processing survey ${survey.surveyId}, leadId: ${survey.leadId}`);
          
          if (!survey.leadId) {
            console.log(`[DEBUG] Survey ${survey.surveyId} has no leadId!`);
            return surveyObj;
          }

          const rawLeadId = (survey as any).leadId?._id
            ? (survey as any).leadId._id.toString()
            : survey.leadId.toString();

          const lead = await this.leadsService.findOneById(rawLeadId, tenantId, user);
          
          console.log(`[DEBUG] Lead lookup result for ${survey.leadId}:`, lead ? 'FOUND' : 'NOT FOUND');
          
          if (lead) {
            console.log(`[DEBUG] Lead data: kw=${lead.kw}, city=${lead.city}, assignedTo=${lead.assignedTo}`);
            
            // Override with fresh lead data if available
            if (lead.kw && lead.kw > 0) {
              surveyObj.projectCapacity = `${lead.kw} kW`;
              console.log(`[DEBUG] Updated capacity to: ${surveyObj.projectCapacity}`);
            }
            if (lead.city) {
              surveyObj.city = lead.city;
            }
            if (lead.assignedTo) {
              const engineerName = typeof lead.assignedTo === 'object' && lead.assignedTo !== null
                ? (lead.assignedTo as any).name || String(lead.assignedTo)
                : String(lead.assignedTo);
              
              // Only override engineer field if survey doesn't already have one
              if (!surveyObj.engineer || surveyObj.engineer === 'Unassigned' || surveyObj.engineer === '') {
                surveyObj.engineer = engineerName;
              }
              
              // Only override solarConsultant field if survey doesn't already have one
              if (!surveyObj.solarConsultant || surveyObj.solarConsultant === 'Unassigned' || surveyObj.solarConsultant === '') {
                surveyObj.solarConsultant = engineerName;
              }
            }
            // Add lead source data dynamically
            (surveyObj as any).leadSource = lead.source;
            (surveyObj as any).leadPhone = lead.phone;
            (surveyObj as any).leadEmail = lead.email;
          } else {
            console.log(`[DEBUG] Lead NOT found for survey ${survey.surveyId}, leadId: ${survey.leadId}`);
          }
        } catch (error) {
          console.log(`[DEBUG] Error fetching lead for survey ${survey.surveyId}:`, error);
        }
        return surveyObj;
      })
    );

    return {
      data: enrichedData,
      total,
      page,
      limit
    };
  }

  // Find one survey by ID
  async findOne(id: string, tenantId?: string, user?: UserWithVisibility): Promise<SiteSurvey> {
    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [{ _id: id }, { surveyId: id }],
    });

    const survey = await this.surveyModel.findOne(filter).exec();

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return survey;
  }

  private async resolveAssigneeForTenant(
    assignedTo: string,
    tid: Types.ObjectId,
  ): Promise<{ assigneeId: Types.ObjectId; assigneeName?: string; isEmployee: boolean }> {
    // Accept either a User _id, Employee _id, User.id, or Employee.employeeId
    const UserModel = (this.surveyModel as any).db.model('User');
    const EmployeeModel = (this.surveyModel as any).db.model('Employee');

    // 1) ObjectId path
    if (Types.ObjectId.isValid(assignedTo)) {
      const objId = new Types.ObjectId(assignedTo);

      const userDoc = await UserModel.findOne({ _id: objId, tenantId: tid })
        .select('firstName lastName name')
        .lean()
        .exec();
      if (userDoc) {
        const built = String((userDoc as any).name || `${(userDoc as any).firstName || ''} ${(userDoc as any).lastName || ''}`.trim()).trim();
        return { assigneeId: objId, assigneeName: built || undefined, isEmployee: false };
      }

      const empDoc = await EmployeeModel.findOne({ _id: objId, tenantId: tid })
        .select('firstName lastName tenantId')
        .lean()
        .exec();
      if (empDoc) {
        const built = String(`${(empDoc as any).firstName || ''} ${(empDoc as any).lastName || ''}`.trim()).trim();
        return { assigneeId: objId, assigneeName: built || undefined, isEmployee: true };
      }
    }

    // 2) String id path (User.id / Employee.employeeId)
    const userDoc = await UserModel.findOne({ id: assignedTo, tenantId: tid })
      .select('_id firstName lastName name')
      .lean()
      .exec();
    if (userDoc && (userDoc as any)._id) {
      const built = String((userDoc as any).name || `${(userDoc as any).firstName || ''} ${(userDoc as any).lastName || ''}`.trim()).trim();
      return { assigneeId: new Types.ObjectId((userDoc as any)._id.toString()), assigneeName: built || undefined, isEmployee: false };
    }

    const empDoc = await EmployeeModel.findOne({ employeeId: assignedTo, tenantId: tid })
      .select('_id firstName lastName tenantId')
      .lean()
      .exec();
    if (empDoc && (empDoc as any)._id) {
      const built = String(`${(empDoc as any).firstName || ''} ${(empDoc as any).lastName || ''}`.trim()).trim();
      return { assigneeId: new Types.ObjectId((empDoc as any)._id.toString()), assigneeName: built || undefined, isEmployee: true };
    }

    throw new BadRequestException('Invalid assignedTo user ID');
  }

  // Find survey by lead ID
  async findByLeadId(leadId: string, tenantId?: string, user?: UserWithVisibility): Promise<SiteSurvey | null> {
    const leadObjId = this.toObjectId(leadId);
    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [
        ...(leadObjId ? [{ leadId: leadObjId }] : []),
        { leadId }, // legacy string leadId support
      ],
    });
    return this.surveyModel.findOne(filter).exec();
  }

  async deactivateByLeadId(leadId: string, tenantId?: string, user?: UserWithVisibility): Promise<void> {
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new BadRequestException('Tenant context is required for deactivating surveys');
    }

    const leadObjId = this.toObjectId(leadId);
    const filter: any = {
      tenantId: tid,
      isDeleted: { $ne: true },
      $or: [
        ...(leadObjId ? [{ leadId: leadObjId }] : []),
        { leadId }, // legacy string leadId support
      ],
    };

    const result = await this.surveyModel
      .updateOne(filter, { $set: { status: SurveyStatus.CANCELLED, isDeleted: true, updatedAt: new Date() } })
      .exec();

    if (result.matchedCount === 0) {
      return;
    }
  }

  // Update survey
  async update(id: string, updateDto: UpdateSiteSurveyDto, tenantId?: string, user?: UserWithVisibility): Promise<SiteSurvey> {
    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [{ _id: id }, { surveyId: id }]
    });

    const survey = await this.surveyModel.findOneAndUpdate(
      filter,
      { ...updateDto, updatedAt: new Date() },
      { new: true }
    ).exec();

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return survey;
  }

  // Move survey from Pending to Active
  async moveToActive(id: string, moveDto: MoveToActiveDto, tenantId?: string, user?: UserWithVisibility): Promise<SiteSurvey> {
    // First verify the survey exists and belongs to tenant
    const survey = await this.findOne(id, tenantId, user);

    if (survey.status !== SurveyStatus.PENDING) {
      throw new BadRequestException(`Cannot move to Active: Survey is currently ${survey.status}`);
    }

    const rawAssignedBy = (user?._id ? user._id.toString() : user?.id) || undefined;
    const assignedById = rawAssignedBy && Types.ObjectId.isValid(rawAssignedBy)
      ? new Types.ObjectId(rawAssignedBy)
      : undefined;

    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new BadRequestException('Tenant context is required for updating surveys');
    }

    const effectiveTid = tid || (survey as any).tenantId;
    if (!effectiveTid) {
      throw new BadRequestException('Tenant context is required for updating surveys');
    }

    const rawAssignedTo = (moveDto as any)?.assignedTo;
    const { assigneeId: assignedToId, assigneeName: resolvedAssigneeName, isEmployee } = rawAssignedTo
      ? await this.resolveAssigneeForTenant(String(rawAssignedTo), effectiveTid)
      : { assigneeId: undefined as any, assigneeName: undefined, isEmployee: false };

    // Tenant-authoritative update: ensure state transition works even if visibility filtering would hide the survey.
    const filter: any = {
      tenantId: effectiveTid,
      isDeleted: { $ne: true },
      _id: (survey as any)._id,
    };

    const updateData: any = {
      status: SurveyStatus.ACTIVE,
      assignedBy: assignedById || (survey as any).assignedBy,
      engineer: moveDto.engineer || resolvedAssigneeName || survey.engineer,
      solarConsultant: moveDto.solarConsultant || resolvedAssigneeName || survey.solarConsultant,
      activeData: {
        ...moveDto.activeData,
        startedAt: new Date()
      },
      notes: moveDto.notes || survey.notes,
      updatedAt: new Date()
    };

    if (isEmployee) {
      updateData.assignedEmployeeId = rawAssignedTo;
      updateData.assignedTo = undefined;
    } else {
      updateData.assignedTo = assignedToId || (survey as any).assignedTo;
      updateData.assignedEmployeeId = (survey as any).assignedEmployeeId;
    }

    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
      filter,
      updateData,
      { new: true }
    ).exec();

    if (!updatedSurvey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return updatedSurvey;
  }

  // Move survey from Active to Complete (idempotent - if already complete, updates completeData)
  async moveToComplete(id: string, moveDto: MoveToCompleteDto, tenantId?: string, user?: UserWithVisibility): Promise<SiteSurvey> {
    // First verify the survey exists and belongs to tenant
    const survey = await this.findOne(id, tenantId, user);

    // If survey is already complete, we still update the completeData and return it
    if (survey.status === SurveyStatus.COMPLETE) {
      // Update completeData with new information
      const filter = this.buildCompleteFilter(tenantId, user, {
        $or: [{ _id: id }, { surveyId: id }]
      });

      const updatedSurvey = await this.surveyModel.findOneAndUpdate(
        filter,
        {
          completeData: {
            ...survey.completeData,
            ...moveDto.completeData,
            completionDate: survey.completeData?.completionDate || new Date()
          },
          notes: moveDto.notes || survey.notes,
          updatedAt: new Date()
        },
        { new: true }
      ).exec();

      if (!updatedSurvey) {
        throw new NotFoundException(`Survey with ID ${id} not found`);
      }

      return updatedSurvey;
    }

    // Normal flow: survey must be ACTIVE to move to COMPLETE
    if (survey.status !== SurveyStatus.ACTIVE) {
      throw new BadRequestException(`Cannot move to Complete: Survey is currently ${survey.status}. Only ACTIVE surveys can be completed.`);
    }

    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [{ _id: id }, { surveyId: id }]
    });

    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
      filter,
      {
        status: SurveyStatus.COMPLETE,
        completeData: {
          ...moveDto.completeData,
          completionDate: new Date()
        },
        notes: moveDto.notes || survey.notes,
        updatedAt: new Date()
      },
      { new: true }
    ).exec();

    if (!updatedSurvey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return updatedSurvey;
  }

  // Delete survey
  async remove(id: string, tenantId?: string, user?: UserWithVisibility): Promise<void> {
    const filter = this.buildCompleteFilter(tenantId, user, {
      $or: [{ _id: id }, { surveyId: id }]
    });

    const result = await this.surveyModel.deleteOne(filter).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }
  }

  // Get statistics
  async getStats(tenantId?: string, user?: UserWithVisibility): Promise<{
    total: number;
    pending: number;
    active: number;
    complete: number;
    byCity: { city: string; count: number }[];
    byMonth: { month: string; count: number }[];
  }> {
    // Build tenant filter
    const tenantFilter = this.buildCompleteFilter(tenantId, user, {});

    const [total, pending, active, complete, byCity, byMonth] = await Promise.all([
      this.surveyModel.countDocuments(tenantFilter).exec(),
      this.surveyModel.countDocuments({ ...tenantFilter, status: SurveyStatus.PENDING }).exec(),
      this.surveyModel.countDocuments({ ...tenantFilter, status: SurveyStatus.ACTIVE }).exec(),
      this.surveyModel.countDocuments({ ...tenantFilter, status: SurveyStatus.COMPLETE }).exec(),
      this.surveyModel.aggregate([
        { $match: tenantFilter },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $project: { city: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } }
      ]).exec(),
      this.surveyModel.aggregate([
        { $match: tenantFilter },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            month: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                { $toString: '$_id.month' }
              ]
            },
            count: 1,
            _id: 0
          }
        },
        { $sort: { month: -1 } }
      ]).exec()
    ]);

    return {
      total,
      pending,
      active,
      complete,
      byCity,
      byMonth
    };
  }

  // Auto-create survey when lead stage changes to 'Site Survey'
  async createFromLead(
    leadData: {
      leadId: string;
      clientName: string;
      city: string;
      projectCapacity?: string;
      engineer?: string;
      assignedTo?: string;
      sourceLeadId?: string;
    },
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<SiteSurvey> {
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new BadRequestException('Tenant context is required for creating surveys');
    }

    // Check if survey already exists for this lead (tenant-authoritative, not blocked by visibility)
    const leadObjId = this.toObjectId(leadData.leadId);
    const existingSurvey = await this.surveyModel.findOne({
      tenantId: tid,
      isDeleted: { $ne: true },
      $or: [
        ...(leadObjId ? [{ leadId: leadObjId }] : []),
        { leadId: leadData.leadId }, // legacy string leadId support
      ],
    }).exec();
    if (existingSurvey) return existingSurvey;

    return this.create({
      leadId: leadData.leadId,
      clientName: leadData.clientName,
      city: leadData.city || 'Unknown',
      projectCapacity: leadData.projectCapacity || 'To be determined',
      roofType: 'To be surveyed',
      structureType: 'To be surveyed',
      structureHeight: 'To be measured',
      moduleType: 'To be selected',
      solarConsultant: leadData.engineer || 'Unassigned',
      engineer: leadData.engineer || 'Unassigned',
      floors: 1,
      assignedTo: leadData.assignedTo
    }, tenantId, user);
  }

  // Assign survey to a user
  async assign(
    id: string,
    assignDto: AssignSurveyDto,
    tenantId?: string,
    user?: UserWithVisibility
  ): Promise<SiteSurvey> {
    // First verify the survey exists and belongs to tenant
    const survey = await this.findOne(id, tenantId, user);

    // Check if user can assign this survey (must be admin, manager, or creator)
    if (!this.canAssignSurvey(user, survey)) {
      throw new BadRequestException('You do not have permission to assign this survey');
    }

    // Get current user ID for assignedBy
    const rawAssignedBy = (user?._id ? user._id.toString() : user?.id) || undefined;
    const assignedById = rawAssignedBy && Types.ObjectId.isValid(rawAssignedBy)
      ? new Types.ObjectId(rawAssignedBy)
      : undefined;

    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new BadRequestException('Tenant context is required for assigning surveys');
    }

    const effectiveTid = tid || (survey as any).tenantId;
    if (!effectiveTid) {
      throw new BadRequestException('Tenant context is required for assigning surveys');
    }

    const { assigneeId: assignedToId, assigneeName, isEmployee } = await this.resolveAssigneeForTenant(String(assignDto.assignedTo), effectiveTid);

    const filter: any = {
      tenantId: effectiveTid,
      isDeleted: { $ne: true },
      _id: (survey as any)._id,
    };

    const updateData: any = {
      assignedBy: assignedById,
      engineer: assigneeName || survey.engineer,
      solarConsultant: assigneeName || survey.solarConsultant,
      updatedAt: new Date()
    };

    if (isEmployee) {
      updateData.assignedEmployeeId = assignDto.assignedTo;
      updateData.assignedTo = undefined;
    } else {
      updateData.assignedTo = assignedToId;
      updateData.assignedEmployeeId = undefined;
    }

    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
      filter,
      updateData,
      { new: true }
    ).exec();

    if (!updatedSurvey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    this.logger.log(`Survey ${id} assigned to user ${assignDto.assignedTo} by ${assignedById}`);

    return updatedSurvey;
  }

  // Check if user can assign a survey
  private canAssignSurvey(user: UserWithVisibility | undefined, survey: any): boolean {
    if (!user) return false;

    // SuperAdmin and Admin can assign any survey
    if (user.isSuperAdmin || user.role?.toLowerCase() === 'superadmin' || user.role?.toLowerCase() === 'admin') {
      return true;
    }

    // Manager can assign surveys in their team scope
    if (user.role?.toLowerCase() === 'manager' && user.dataScope === 'ALL') {
      return true;
    }

    // Creator can assign their own surveys
    const userId = user._id?.toString() || user.id;
    const surveyCreatedBy = survey.createdBy?.toString();
    if (userId && surveyCreatedBy === userId) {
      return true;
    }

    return false;
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentEntity, DocumentEntityDocument, DocumentStatus } from '../schemas/document.schema';
import { CreateDocumentDto, UpdateDocumentDto, QueryDocumentDto, SendDocumentDto } from '../dto/document.dto';
import { EmailService } from '../../email/email.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectModel(DocumentEntity.name) private documentModel: Model<DocumentEntityDocument>,
    private readonly emailService: EmailService,
  ) {}

  private startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  }

  private startOfNextMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
  }

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    try {
      return new Types.ObjectId(id);
    } catch {
      return undefined;
    }
  }

  private generateDocumentId(type: string): string {
    const prefix = type.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  }

  // ============================================
  // CRUD Operations
  // ============================================
  private calculateTotals(data: any): any {
    const items = data.items || [];
    const equipmentCost = items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    const installationCost = data.installationCost || 0;
    const engineeringCost = data.engineeringCost || 0;
    const transportationCost = data.transportationCost || 0;
    const miscellaneousCost = data.miscellaneousCost || 0;
    
    const subtotal = equipmentCost + installationCost + engineeringCost + transportationCost + miscellaneousCost;
    const taxRate = data.gstRate || data.taxRate || 18;
    const taxAmount = data.gstAmount || data.taxAmount || Math.round((subtotal * taxRate) / 100);
    const total = subtotal + taxAmount;

    return {
      equipmentCost,
      subtotal,
      taxRate,
      taxAmount,
      total,
    };
  }

  async create(createDto: CreateDocumentDto, tenantId?: string): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);

    // Calculate totals if not provided
    const calculatedTotals = this.calculateTotals(createDto);
    
    // Map gstRate/gstAmount to taxRate/taxAmount for compatibility
    const mappedData = {
      ...createDto,
      documentId: createDto.documentId || this.generateDocumentId(createDto.type),
      tenantId: tid,
      createdBy: 'system',
      // Map gst fields to tax fields
      taxRate: createDto.gstRate || createDto.taxRate || calculatedTotals.taxRate,
      taxAmount: createDto.gstAmount || createDto.taxAmount || calculatedTotals.taxAmount,
      subtotal: createDto.subtotal || calculatedTotals.subtotal,
      total: createDto.total || calculatedTotals.total,
      equipmentCost: createDto.equipmentCost || calculatedTotals.equipmentCost,
    };

    const created = new this.documentModel(mappedData);
    return created.save();
  }

  async findAll(query: QueryDocumentDto, tenantId?: string): Promise<{ data: DocumentEntity[]; total: number }> {
    const tid = this.toObjectId(tenantId);
    const { page = 1, limit, search, type, status, leadId, projectId, customerId } = query;
    const safeLimit = limit === undefined || limit === null ? 1000 : limit;

    const filter: any = { isDeleted: false };
    if (tid) filter.tenantId = tid;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (leadId) filter.leadId = this.toObjectId(leadId);
    if (projectId) filter.projectId = this.toObjectId(projectId);
    if (customerId) filter.customerId = this.toObjectId(customerId);

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { documentId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * safeLimit;
    const [data, total] = await Promise.all([
      this.documentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean().exec(),
      this.documentModel.countDocuments(filter),
    ]);

    return { data: data as DocumentEntity[], total };
  }

  async findByTypes(
    types: string[],
    query: QueryDocumentDto,
    tenantId?: string,
  ): Promise<{ data: DocumentEntity[]; total: number }> {
    const tid = this.toObjectId(tenantId);
    const { page = 1, limit = 20, search, status, leadId, projectId, customerId } = query;

    const filter: any = { type: { $in: types }, isDeleted: false };
    if (tid) filter.tenantId = tid;
    if (status) filter.status = status;
    if (leadId) filter.leadId = this.toObjectId(leadId);
    if (projectId) filter.projectId = this.toObjectId(projectId);
    if (customerId) filter.customerId = this.toObjectId(customerId);

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { documentId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.documentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documentModel.countDocuments(filter),
    ]);

    return { data: data as DocumentEntity[], total };
  }

  async findOne(id: string, tenantId?: string): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);
    const doc = await this.documentModel
      .findOne({
        $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
        ...(tid && { tenantId: tid }),
        isDeleted: false,
      })
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return doc as DocumentEntity;
  }

  async update(id: string, updateDto: UpdateDocumentDto, tenantId?: string): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);

    // Calculate totals if items or costs are being updated
    let calculatedTotals: any = {};
    if (updateDto.items || updateDto.installationCost !== undefined || 
        updateDto.engineeringCost !== undefined || updateDto.transportationCost !== undefined ||
        updateDto.miscellaneousCost !== undefined || updateDto.gstRate !== undefined ||
        updateDto.taxRate !== undefined) {
      
      // Get current doc to merge with updateDto for calculation
      const currentDoc = await this.documentModel.findOne({
        $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
        ...(tid && { tenantId: tid }),
        isDeleted: false,
      }).lean().exec();
      
      if (currentDoc) {
        const mergedData = {
          ...currentDoc,
          ...updateDto,
          items: updateDto.items || currentDoc.items,
        };
        calculatedTotals = this.calculateTotals(mergedData);
      }
    }

    // Map gst fields to tax fields
    const mappedUpdateDto = {
      ...updateDto,
      ...(updateDto.gstRate !== undefined && { taxRate: updateDto.gstRate }),
      ...(updateDto.gstAmount !== undefined && { taxAmount: updateDto.gstAmount }),
      ...(Object.keys(calculatedTotals).length > 0 && {
        taxRate: calculatedTotals.taxRate,
        taxAmount: calculatedTotals.taxAmount,
        subtotal: calculatedTotals.subtotal,
        total: calculatedTotals.total,
        equipmentCost: calculatedTotals.equipmentCost,
      }),
    };

    const doc = await this.documentModel
      .findOneAndUpdate(
        {
          $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        { $set: mappedUpdateDto },
        { new: true },
      )
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return doc as DocumentEntity;
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const tid = this.toObjectId(tenantId);

    const result = await this.documentModel
      .findOneAndUpdate(
        {
          $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        { $set: { isDeleted: true } },
      )
      .exec();

    if (!result) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }
  }

  // ============================================
  // Stats
  // ============================================
  async getStats(tenantId?: string): Promise<any> {
    const tid = this.toObjectId(tenantId);
    const baseFilter: any = { isDeleted: false };
    if (tid) baseFilter.tenantId = tid;

    const [total, byType, byStatus] = await Promise.all([
      this.documentModel.countDocuments(baseFilter),
      this.documentModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.documentModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byType: byType.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      byStatus: byStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
    };
  }

  async getStatsByTypes(types: string[], tenantId?: string): Promise<any> {
    const tid = this.toObjectId(tenantId);
    const baseFilter: any = { type: { $in: types }, isDeleted: false };
    if (tid) baseFilter.tenantId = tid;

    const [total, byStatus, totalValue] = await Promise.all([
      this.documentModel.countDocuments(baseFilter),
      this.documentModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.documentModel.aggregate([
        { $match: { ...baseFilter, status: { $in: [DocumentStatus.ACCEPTED, DocumentStatus.SENT] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      totalValue: totalValue[0]?.total || 0,
    };
  }

  async getDashboardStats(tenantId?: string): Promise<any> {
    const tid = this.toObjectId(tenantId);
    const baseFilter: any = { isDeleted: false };
    if (tid) baseFilter.tenantId = tid;

    const now = new Date();
    const thisMonthStart = this.startOfMonth(now);
    const nextMonthStart = this.startOfNextMonth(now);
    const lastMonthStart = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1, 0, 0, 0, 0);
    const prevMonthStart = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 2, 1, 0, 0, 0, 0);

    const epqFilter = { ...baseFilter, type: { $in: ['estimate', 'proposal', 'quotation'] } };

    const [
      totalDocuments,
      lastMonthDocuments,
      prevMonthDocuments,
      epqStats,
    ] = await Promise.all([
      this.documentModel.countDocuments(baseFilter),
      this.documentModel.countDocuments({ ...baseFilter, createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } }),
      this.documentModel.countDocuments({ ...baseFilter, createdAt: { $gte: prevMonthStart, $lt: lastMonthStart } }),
      this.getStatsByTypes(['estimate', 'proposal', 'quotation'], tenantId),
    ]);

    const docsMoM = prevMonthDocuments > 0
      ? ((lastMonthDocuments - prevMonthDocuments) / prevMonthDocuments) * 100
      : (lastMonthDocuments > 0 ? 100 : 0);

    const epqByStatus = epqStats?.byStatus || {};
    const epqDraft = Number(epqByStatus[DocumentStatus.DRAFT] || 0);
    const epqSent = Number(epqByStatus[DocumentStatus.SENT] || 0);
    const epqAccepted = Number(epqByStatus[DocumentStatus.ACCEPTED] || 0);
    const epqTotal = Number(epqStats?.total || 0);

    const epqActive = epqDraft + epqSent;
    const epqConversion = epqTotal > 0 ? (epqAccepted / epqTotal) * 100 : 0;

    const thisMonthEPQCount = await this.documentModel.countDocuments({
      ...epqFilter,
      createdAt: { $gte: thisMonthStart, $lt: nextMonthStart },
    });

    return {
      totalDocuments,
      documentsMoMPercent: Number(docsMoM.toFixed(2)),
      lastMonthDocuments,
      prevMonthDocuments,
      epq: {
        total: epqTotal,
        active: epqActive,
        conversionPercent: Number(epqConversion.toFixed(2)),
        byStatus: epqByStatus,
        thisMonthCount: thisMonthEPQCount,
        totalValue: epqStats?.totalValue || 0,
      },
    };
  }

  // ============================================
  // Document Actions
  // ============================================
  async send(id: string, sendDto: SendDocumentDto, tenantId?: string): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);

    // First find the document to get email info
    const doc = await this.findOne(id, tenantId);
    
    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    // Determine the recipient email
    const recipientEmail = sendDto.email || doc.customerEmail;
    
    if (!recipientEmail) {
      throw new BadRequestException('No recipient email available');
    }

    // Send email with PDF if it's an EPQ type
    if (['estimate', 'proposal', 'quotation'].includes(doc.type)) {
      try {
        // Create PDF content placeholder - in production this would generate actual PDF
        const emailSubject = `${doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}: ${doc.title || doc.documentId}`;
        const emailBody = `Dear ${doc.customerName || 'Customer'},\n\nPlease find attached your ${doc.type} document.\n\nDocument ID: ${doc.documentId}\nTotal Amount: ${doc.total || 'N/A'}\n\nRegards,\nSolar EPC Team`;
        
        // Send email (without PDF for now - just the email notification)
        await this.emailService.sendEmail(
          recipientEmail,
          emailSubject,
          emailBody,
          `<div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>${emailSubject}</h2>
            <p>Dear ${doc.customerName || 'Customer'},</p>
            <p>Please find attached your ${doc.type} document.</p>
            <table style="margin: 20px 0; border-collapse: collapse;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Document ID:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${doc.documentId}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Amount:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${doc.total || 'N/A'}</td></tr>
            </table>
            <p>Regards,<br>Solar EPC Team</p>
          </div>`
        );
      } catch (error: any) {
        console.error('Failed to send email:', error);
        throw new BadRequestException('Failed to send email: ' + (error?.message || 'Unknown error'));
      }
    }

    // Update document status
    const updatedDoc = await this.documentModel
      .findOneAndUpdate(
        {
          $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        {
          $set: {
            status: DocumentStatus.SENT,
            sentAt: new Date(),
            ...(sendDto.email && { customerEmail: sendDto.email }),
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    return updatedDoc as DocumentEntity;
  }

  async duplicate(id: string, tenantId?: string): Promise<DocumentEntity> {
    const original = await this.findOne(id, tenantId);

    const duplicated = {
      ...original,
      _id: undefined,
      documentId: this.generateDocumentId(original.type),
      status: DocumentStatus.DRAFT,
      title: `${original.title} (Copy)`,
      sentAt: null,
      acceptedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = new this.documentModel(duplicated);
    return created.save();
  }

  async convert(id: string, targetType: string, tenantId?: string): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);

    const doc = await this.documentModel
      .findOneAndUpdate(
        {
          $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        {
          $set: {
            type: targetType,
            documentId: this.generateDocumentId(targetType),
            status: DocumentStatus.DRAFT,
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return doc as DocumentEntity;
  }

  // ============================================
  // Bulk Actions
  // ============================================
  async bulkDelete(ids: string[], tenantId?: string): Promise<{ deleted: number }> {
    const tid = this.toObjectId(tenantId);
    const objectIds = ids.map((id) => this.toObjectId(id)).filter(Boolean);

    const result = await this.documentModel
      .updateMany(
        {
          _id: { $in: objectIds },
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        { $set: { isDeleted: true } },
      )
      .exec();

    return { deleted: result.modifiedCount };
  }

  async bulkUpdateStatus(ids: string[], status: string, tenantId?: string): Promise<{ updated: number }> {
    const tid = this.toObjectId(tenantId);
    const objectIds = ids.map((id) => this.toObjectId(id)).filter(Boolean);

    const updateData: any = { status };
    if (status === DocumentStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (status === DocumentStatus.VIEWED) {
      updateData.viewedAt = new Date();
    } else if (status === DocumentStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    } else if (status === DocumentStatus.REJECTED) {
      updateData.rejectedAt = new Date();
    }

    const result = await this.documentModel
      .updateMany(
        {
          _id: { $in: objectIds },
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        { $set: updateData },
      )
      .exec();

    return { updated: result.modifiedCount };
  }

  // ============================================
  // Canvas Operations
  // ============================================
  async saveCanvas(id: string, canvasData: any, tenantId?: string): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);

    const doc = await this.documentModel
      .findOneAndUpdate(
        {
          $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        {
          $set: {
            canvasData: {
              ...canvasData,
              savedAt: new Date().toISOString(),
            },
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return doc as DocumentEntity;
  }

  // ============================================
  // Email with PDF
  // ============================================
  async sendWithPdf(
    id: string,
    sendDto: SendDocumentDto,
    pdfBuffer: Buffer,
    tenantId?: string,
  ): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);

    // First find the document to get email info
    const doc = await this.findOne(id, tenantId);

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    // Determine the recipient email
    const recipientEmail = sendDto.email || doc.customerEmail;

    if (!recipientEmail) {
      throw new BadRequestException('No recipient email available');
    }

    // Send email with PDF attachment
    try {
      const emailSubject = `${doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}: ${doc.title || doc.documentId}`;
      const emailBody = `Dear ${doc.customerName || 'Customer'},\n\nPlease find attached your ${doc.type} document.\n\nDocument ID: ${doc.documentId}\nTotal Amount: ₹${doc.total || 'N/A'}\n\nRegards,\nSolar EPC Team`;

      // Send email with PDF attachment
      await this.emailService.sendEmail(
        recipientEmail,
        emailSubject,
        emailBody,
        `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>${emailSubject}</h2>
          <p>Dear ${doc.customerName || 'Customer'},</p>
          <p>Please find attached your ${doc.type} document.</p>
          <table style="margin: 20px 0; border-collapse: collapse;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Document ID:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${doc.documentId}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Amount:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">₹${doc.total || 'N/A'}</td></tr>
          </table>
          <p>Regards,<br>Solar EPC Team</p>
        </div>`,
        [
          {
            filename: `${doc.type}_${doc.documentId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      );
    } catch (error: any) {
      console.error('Failed to send email with PDF:', error);
      throw new BadRequestException('Failed to send email: ' + (error?.message || 'Unknown error'));
    }

    // Update document status
    const updatedDoc = await this.documentModel
      .findOneAndUpdate(
        {
          $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        {
          $set: {
            status: DocumentStatus.SENT,
            sentAt: new Date(),
            ...(sendDto.email && { customerEmail: sendDto.email }),
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    return updatedDoc as DocumentEntity;
  }
}

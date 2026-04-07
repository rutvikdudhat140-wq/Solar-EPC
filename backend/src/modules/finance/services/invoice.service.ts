import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { Invoice, InvoiceDocument, InvoiceStatus } from '../schemas/invoice.schema';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { Project, ProjectDocument } from '../schemas/project.schema';
import { ReminderLog, ReminderLogDocument, ReminderType } from '../schemas/reminder-log.schema';
import { Activity, ActivityDocument, ActivityAction } from '../schemas/activity.schema';
import { CreateInvoiceDto, UpdateInvoiceDto, RecordPaymentDto } from '../dto/invoice.dto';
import { CreatePaymentDto, UpdatePaymentDto } from '../dto/payment.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';
import { Quotation, QuotationDocument } from '../../quotation/schemas/quotation.schema';

interface UserWithVisibility {
  id?: string;
  _id?: string;
  dataScope?: 'ALL' | 'ASSIGNED';
}

// Payment term to project status mapping
const PAYMENT_TERM_STATUS_MAP: Record<string, string[]> = {
  '30% Advance': ['Procurement'],
  '50% on Delivery': ['Installation'],
  'Net 30': ['Design', 'Commission'],
  'Net 60': ['Design', 'Commission'],
};

// Reverse mapping: status -> allowed payment terms
const STATUS_PAYMENT_TERMS_MAP: Record<string, string[]> = {
  'Survey': [],
  'Design': ['Net 30', 'Net 60'],
  'Quotation': [],
  'Procurement': ['30% Advance'],
  'Installation': ['50% on Delivery'],
  'Commission': ['Net 30', 'Net 60'],
  'Commissioned': ['Net 30', 'Net 60'],
  'On Hold': [],
};

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(ReminderLog.name) private readonly reminderLogModel: Model<ReminderLogDocument>,
    @InjectModel(Activity.name) private readonly activityModel: Model<ActivityDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(Quotation.name) private readonly quotationModel: Model<QuotationDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    // Check if id is a valid 24-character hex string (MongoDB ObjectId format)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return undefined;
    try {
      return new Types.ObjectId(id);
    } catch {
      return undefined;
    }
  }

  /**
   * Resolves tenantId to a valid ObjectId.
   * If the string is already a valid ObjectId, uses it directly.
   * Otherwise treats it as a tenant code and looks up the tenant by code.
   */
  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  private tenantMatch(tenantId: string | Types.ObjectId) {
    const tid = typeof tenantId === 'string' ? new Types.ObjectId(tenantId) : tenantId;
    return { tenantId: tid };
  }

  private notDeletedMatch() {
    return { isDeleted: false };
  }

  getAllowedPaymentTerms(projectStatus: string): string[] {
    return STATUS_PAYMENT_TERMS_MAP[projectStatus] || [];
  }

  validatePaymentTerm(paymentTerm: string, projectStatus: string): void {
    const allowedTerms = this.getAllowedPaymentTerms(projectStatus);
    if (!allowedTerms.includes(paymentTerm)) {
      throw new BadRequestException(
        `Payment term '${paymentTerm}' is not allowed for project status '${projectStatus}'. Allowed terms: ${allowedTerms.join(', ') || 'None'}`
      );
    }
  }

  async getCustomerNamesFromProjects(tenantId: string): Promise<string[]> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const names = await this.projectModel.distinct('customerName', {
      tenantId: tid,
      ...this.notDeletedMatch(),
      customerName: { $exists: true, $nin: [null, ''] },
    });

    return (names || [])
      .map((n) => String(n).trim())
      .filter((n) => n.length > 0)
      .sort((a, b) => a.localeCompare(b));
  }

  async getAllProjects(tenantId: string): Promise<Project[]> {
    const tid = await this.resolveTenantObjectId(tenantId);
    return this.projectModel.find({
      tenantId: tid,
      ...this.notDeletedMatch(),
    }).select('_id name customerName email mobileNumber status value paymentTerms').sort({ name: 1 }).lean();
  }

  async getProjectById(tenantId: string, id: string): Promise<Project> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const project = await this.projectModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: tid,
      ...this.notDeletedMatch(),
    }).select('_id name customerName email mobileNumber status value paymentTerms').lean();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Fetch payment terms from quotation if project has quotationId (fallback)
    let paymentTerms: number | undefined;
    const projectWithQuotation = project as any;
    if (projectWithQuotation.quotationId) {
      const quotation = await this.quotationModel.findOne({
        _id: projectWithQuotation.quotationId,
        tenantId: tid,
        isDeleted: false,
      }).select('paymentTerms').lean();
      
      if (quotation && typeof quotation.paymentTerms === 'number') {
        paymentTerms = quotation.paymentTerms;
      }
    }

    // Use project's own paymentTerms if available, otherwise use from quotation
    const projectAny = project as any;
    const finalPaymentTerms = typeof projectAny.paymentTerms === 'number' ? projectAny.paymentTerms : paymentTerms;

    // Add paymentTerms to project response
    return { ...project, paymentTerms: finalPaymentTerms } as Project;
  }

  async findAll(tenantId: string, status?: string, user?: UserWithVisibility): Promise<any[]> {
    const query: any = { ...this.notDeletedMatch() };
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId !== '') {
      throw new BadRequestException('Invalid Tenant ID');
    }
    
    if (status && status !== 'All') {
      query.status = status;
    }
    
    let invoices = await this.invoiceModel.find(query).sort({ createdAt: -1 }).lean();
    
    // Note: Finance module does NOT filter by dataScope
    // Finance users need to see ALL invoices regardless of project assignment
    // This is different from other modules that respect dataScope
    
    // Auto-update overdue status for invoices with passed due dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const invoice of invoices) {
      // Check if invoice should be overdue (not Paid, not Draft, and due date passed)
      if (invoice.status !== 'Paid' && invoice.status !== 'Overdue' && invoice.status !== 'Draft') {
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          // Update status to Overdue
          await this.invoiceModel.findByIdAndUpdate(
            invoice._id,
            { status: 'Overdue' }
          );
          // Update in-memory invoice for return
          invoice.status = 'Overdue';
          console.log(`[Auto Overdue] Invoice ${invoice.invoiceNumber} marked as Overdue (Due: ${dueDate.toISOString()}, Today: ${today.toISOString()})`);
        }
      }
    }
    
    const projectIds = invoices.map(inv => inv.projectId?.toString()).filter(Boolean);
    const uniqueProjectIds = [...new Set(projectIds)];
    
    const projects = await this.projectModel.find({
      _id: { $in: uniqueProjectIds.map(id => new Types.ObjectId(id)) },
      ...this.notDeletedMatch(),
    }).select('_id email customerName').lean();
    
    const projectMap = new Map();
    projects.forEach(p => projectMap.set(p._id.toString(), p));
    
    return invoices.map(inv => {
      const project = inv.projectId ? projectMap.get(inv.projectId.toString()) : null;
      const result = {
        ...inv,
        email: inv.email || project?.email || null,
        customerName: inv.customerName || project?.customerName || null,
        phone: inv.phone || project?.phone || project?.mobileNumber || null,
        paymentTerms: inv.paymentTerms || null,
      };
      
      // Log first invoice for debugging
      if (invoices.length > 0 && inv._id === invoices[0]._id) {
        console.log('[Invoice FindAll] First invoice raw data:', JSON.stringify({
          id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          phone: inv.phone,
          paymentTerms: inv.paymentTerms,
          projectId: inv.projectId,
        }, null, 2));
        console.log('[Invoice FindAll] First invoice mapped result:', JSON.stringify({
          phone: result.phone,
          paymentTerms: result.paymentTerms,
        }, null, 2));
      }
      
      return result;
    });
  }

  async findById(tenantId: string, id: string): Promise<Invoice> {
    const query: any = {
      _id: new Types.ObjectId(id),
      ...this.notDeletedMatch(),
    };
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId !== '') {
      throw new BadRequestException('Invalid Tenant ID');
    }
    
    const invoice = await this.invoiceModel.findOne(query).lean();
    
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    console.log('[Invoice FindById] Invoice found:', JSON.stringify({
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      phone: invoice.phone,
      paymentTerms: invoice.paymentTerms,
      email: invoice.email,
    }, null, 2));

    return invoice;
  }

  async create(tenantId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const tenantObjectId = await this.resolveTenantObjectId(tenantId);

    // Generate milestones based on payment terms
    const milestones = dto.paymentTerms
      ? this.generateMilestones(dto.paymentTerms, dto.amount, new Date(dto.invoiceDate))
      : [];

    // Check if due date is in the past (before today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(dto.dueDate);
    dueDateObj.setHours(0, 0, 0, 0);
    
    const isOverdue = dueDateObj < today;
    const initialStatus = isOverdue ? 'Overdue' : this.calculateStatus(dto.amount, dto.paid || 0, dto.status ?? 'Draft');

    const invoice = new this.invoiceModel({
      ...dto,
      tenantId: tenantObjectId,
      paid: dto.paid || 0,
      balance: dto.amount - (dto.paid || 0),
      status: initialStatus,
      invoiceDate: new Date(dto.invoiceDate),
      dueDate: dueDateObj,
      paidDate: dto.paidDate ? new Date(dto.paidDate) : undefined,
      paymentIds: [],
      milestones,
    });

    console.log('[Invoice Create] DTO received:', JSON.stringify(dto, null, 2));
    console.log('[Invoice Create] Phone field in DTO:', dto.phone);
    console.log('[Invoice Create] Payment Terms in DTO:', dto.paymentTerms);

    const saved = await invoice.save();
    
    console.log('[Invoice Create] Saved invoice ID:', saved._id);
    console.log('[Invoice Create] Saved phone:', saved.phone);
    console.log('[Invoice Create] Saved payment terms:', saved.paymentTerms);
    
    // If invoice is overdue (past due date), send overdue reminder email
    if (isOverdue && dto.projectId) {
      try {
        // Get project email
        const project = await this.projectModel.findOne({
          _id: new Types.ObjectId(dto.projectId),
          ...this.notDeletedMatch(),
        }).select('customerName email').lean();
        
        if (project?.email) {
          console.log(`[Auto Overdue] Sending reminder for new overdue invoice ${saved.invoiceNumber} to ${project.email}`);
          
          const balance = dto.amount - (dto.paid || 0);
          const emailSubject = this.generateReminderSubject(saved.toObject(), 'Overdue');
          const emailBody = this.generateDefaultMessage(saved.toObject(), 'Overdue', balance);
          
          await this.sendReminderEmail({
            to: project.email.trim(),
            subject: emailSubject,
            html: this.generateReminderEmailBody(saved.toObject(), 'Overdue', balance, emailBody),
          });
          
          // Log the reminder
          const reminderLog = new this.reminderLogModel({
            tenantId: tenantObjectId,
            invoiceId: saved._id,
            invoiceNumber: saved.invoiceNumber,
            customerName: saved.customerName,
            customerEmail: project.email.trim(),
            reminderType: 'Overdue',
            messageBody: emailBody,
            balanceAtSend: balance,
            dueDate: saved.dueDate,
            sentAt: new Date(),
            emailSent: true,
          });
          await reminderLog.save();
          
          // Update invoice with reminder tracking
          await this.invoiceModel.findByIdAndUpdate(saved._id, {
            lastReminderSentAt: new Date(),
            reminderCount: 1,
          });
          
          // Log activity
          await this.logActivity(
            tenantId,
            saved._id.toString(),
            'REMINDER_SENT',
            (dto as any).createdBy || (dto as any).userId || '000000000000000000000000',
            {
              invoiceNumber: saved.invoiceNumber,
              reminderType: 'Overdue',
              customerEmail: project.email.trim(),
              balanceAtSend: balance,
              sentTo: project.email.trim(),
              autoSent: true,
              reason: 'Invoice created with past due date',
            },
          );
          
          console.log(`[Auto Overdue] Reminder sent successfully for ${saved.invoiceNumber}`);
        }
      } catch (err) {
        console.error('[Auto Overdue] Failed to send reminder email:', err);
        // Don't fail the invoice creation if email fails
      }
    }
    
    // Log activity
    await this.logActivity(
      tenantId,
      saved._id.toString(),
      'INVOICE_CREATED',
      (dto as any).createdBy || (dto as any).userId || '000000000000000000000000',
      {
        invoiceNumber: dto.invoiceNumber,
        amount: dto.amount,
        customerName: dto.customerName,
        status: initialStatus,
        isOverdue: isOverdue,
      },
    );
    
    return saved.toObject();
  }

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const existing = await this.findById(tenantId, id);

    if (existing.status === 'Paid') {
      throw new BadRequestException('Paid invoices cannot be edited');
    }
    
    const tid = await this.resolveTenantObjectId(tenantId);
    const amount = dto.amount ?? existing.amount;
    const paid = dto.paid ?? existing.paid;
    const balance = amount - paid;
    const status = dto.status || this.calculateStatus(amount, paid, existing.status);

    const updated = await this.invoiceModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: tid },
      {
        ...dto,
        balance,
        status,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : existing.invoiceDate,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : existing.dueDate,
        paidDate: dto.paidDate ? new Date(dto.paidDate) : existing.paidDate,
      },
      { new: true },
    ).lean();

    // If update with tenant filter fails, try without tenant filter as fallback
    if (!updated) {
      console.log('[update] Update with tenant filter failed, trying without tenant filter');
      const fallbackUpdated = await this.invoiceModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        {
          ...dto,
          balance,
          status,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : existing.invoiceDate,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : existing.dueDate,
          paidDate: dto.paidDate ? new Date(dto.paidDate) : existing.paidDate,
        },
        { new: true },
      ).lean();
      
      if (!fallbackUpdated) {
        throw new NotFoundException('Invoice not found');
      }
      
      console.log('[update] Invoice updated successfully without tenant filter');
      
      // Log activity
      await this.logActivity(
        tenantId,
        id,
        'INVOICE_UPDATED',
        (dto as any).updatedBy || (dto as any).userId || '000000000000000000000000',
        {
          invoiceNumber: fallbackUpdated.invoiceNumber,
          changes: Object.keys(dto).filter(k => k !== 'updatedBy' && k !== 'userId'),
          newStatus: status,
        },
      );

      return fallbackUpdated;
    }

    // Log activity
    await this.logActivity(
      tenantId,
      id,
      'INVOICE_UPDATED',
      (dto as any).updatedBy || (dto as any).userId || '000000000000000000000000',
      {
        invoiceNumber: updated.invoiceNumber,
        changes: Object.keys(dto).filter(k => k !== 'updatedBy' && k !== 'userId'),
        newStatus: status,
      },
    );

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const existing = await this.findById(tenantId, id);
    if (existing.status === 'Paid') {
      throw new BadRequestException('Paid invoices cannot be deleted');
    }

    const result = await this.invoiceModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: tid },
      { isDeleted: true },
    );

    if (!result) {
      throw new NotFoundException('Invoice not found');
    }
  }

  async updateStatus(tenantId: string, id: string, status: InvoiceStatus, userId?: string): Promise<Invoice> {
    const existing = await this.findById(tenantId, id);
    const previousStatus = existing.status;

    if (previousStatus === status) {
      return existing;
    }

    const order: Record<InvoiceStatus, number> = {
      Draft: 0,
      Sent: 1,
      Pending: 2,
      Partial: 3,
      Paid: 4,
      Overdue: 5,
    };

    const isBackward = order[status] < order[previousStatus];

    // Allow Overdue -> Partial and Overdue -> Paid even though they're technically backward
    const backwardAllowedFromOverdue = previousStatus === 'Overdue' && 
      (status === 'Partial' || status === 'Paid');

    const allowedTransitions = new Set<string>([
      'Draft->Sent',
      'Draft->Pending',
      'Sent->Pending',
      'Sent->Partial',
      'Sent->Paid',
      'Pending->Partial',
      'Partial->Paid',
      'Pending->Overdue',
      'Partial->Overdue',
      'Sent->Overdue',
      'Overdue->Partial',
      'Overdue->Paid',
    ]);

    const transitionKey = `${previousStatus}->${status}`;

    if (isBackward && !backwardAllowedFromOverdue) {
      throw new BadRequestException('Invoice status cannot be moved backward.');
    }

    if (!allowedTransitions.has(transitionKey)) {
      throw new BadRequestException('Invalid invoice status transition');
    }

    const tid = await this.resolveTenantObjectId(tenantId);
    const updated = await this.invoiceModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: tid,
        ...this.notDeletedMatch(),
      },
      { status, ...(status === 'Paid' ? { paidDate: new Date() } : {}) },
      { new: true },
    ).lean();

    if (!updated) {
      throw new NotFoundException('Invoice not found');
    }

    // Log activity
    await this.logActivity(
      tenantId,
      id,
      'STATUS_CHANGED',
      userId || '000000000000000000000000',
      {
        invoiceNumber: updated.invoiceNumber,
        previousStatus,
        newStatus: status,
      },
    );

    // Send invoice email when status changes from Draft to Sent
    console.log('Status change check:', { previousStatus, status, projectId: updated.projectId });
    if (previousStatus === 'Draft' && status === 'Sent') {
      console.log('Triggering email send...');
      try {
        await this.sendInvoiceEmail(tenantId, updated);
      } catch (error) {
        // Log error but don't fail the status update
        console.error('Failed to send invoice email:', error);
      }
    } else {
      console.log('Email not sent - status transition does not match Draft->Sent');
    }

    return updated;
  }

  async recordPayment(tenantId: string, dto: RecordPaymentDto): Promise<{ invoice: Invoice; payment: Payment }> {
    // Debug logging
    console.log('[recordPayment] Received invoiceId:', dto.invoiceId, 'Type:', typeof dto.invoiceId);
    
    // Validate invoiceId format first
    let invoiceObjectId = this.toObjectId(dto.invoiceId);
    if (!invoiceObjectId) {
      throw new BadRequestException(`Invalid invoice ID format: ${dto.invoiceId}. Must be a valid MongoDB ObjectId.`);
    }
    
    const invoice = await this.findById(tenantId, dto.invoiceId);
    
    // Ensure tenantId is a valid ObjectId, create one from string if needed
    let tenantObjectId = this.toObjectId(tenantId);
    if (!tenantObjectId) {
      // If tenantId is not a valid ObjectId format, create a deterministic ObjectId from the string
      // This ensures we always have a valid ObjectId for the payment
      const hash = tenantId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hexString = (hash % 16777215).toString(16).padStart(6, '0');
      const paddedTenantId = ('000000000000000000000000' + hexString).slice(-24);
      try {
        tenantObjectId = new Types.ObjectId(paddedTenantId);
      } catch {
        // Fallback to a default ObjectId if conversion fails
        tenantObjectId = new Types.ObjectId('000000000000000000000001');
      }
    }
    
    const payment = new this.paymentModel({
      paymentNumber: `PAY-${Date.now()}`,
      invoiceId: invoiceObjectId,
      customerName: invoice.customerName,
      customerId: invoice.customerId,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      paymentDate: new Date(dto.paymentDate),
      referenceNumber: dto.referenceNumber,
      bankName: dto.bankName,
      notes: dto.notes,
      tenantId: tenantObjectId,
    });

    const savedPayment = await payment.save();

    const newPaid = invoice.paid + dto.amount;
    const newBalance = invoice.amount - newPaid;
    const newStatus = this.calculateStatus(invoice.amount, newPaid, invoice.status);

    // Update milestones based on payment
    const updatedMilestones = this.updateMilestonesForPayment(
      invoice.milestones || [],
      newPaid,
      new Date(dto.paymentDate)
    );

    const tid = await this.resolveTenantObjectId(tenantId);
    const updatedInvoice = await this.invoiceModel.findOneAndUpdate(
      {
        _id: invoiceObjectId,
        tenantId: tid,
      },
      {
        paid: newPaid,
        balance: newBalance,
        status: newStatus,
        paidDate: newStatus === 'Paid' ? new Date(dto.paymentDate) : invoice.paidDate,
        milestones: updatedMilestones,
        $push: { paymentIds: savedPayment._id },
      },
      { new: true },
    ).lean();

    if (!updatedInvoice) {
      throw new NotFoundException('Invoice update failed');
    }
    console.log('[recordPayment] Invoice updated successfully with tenant filter');

    // Log activity
    await this.logActivity(
      tenantId,
      invoiceObjectId.toString(),
      'PAYMENT_ADDED',
      (dto as any).createdBy || (dto as any).userId || '000000000000000000000000',
      {
        invoiceNumber: invoice.invoiceNumber,
        paymentAmount: dto.amount,
        paymentMethod: dto.paymentMethod,
        newStatus,
        newPaid,
        newBalance,
      },
    );

    return { invoice: updatedInvoice, payment: savedPayment.toObject() };
  }

  async getDashboardStats(tenantId: string, user?: UserWithVisibility): Promise<any> {
    const query: any = { ...this.notDeletedMatch() };
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId !== '') {
      throw new BadRequestException('Invalid Tenant ID');
    }
    // If tenantId is '', we don't add it to query (SuperAdmin context)

    const invoices = await this.invoiceModel.find(query).lean();
    let filteredInvoices = invoices;
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        // Get all projects assigned to this user
        const projectQuery: any = {
          ...this.notDeletedMatch(),
          assignedTo: new Types.ObjectId(userId)
        };
        if (query.tenantId) projectQuery.tenantId = query.tenantId;

        const assignedProjects = await this.projectModel.find(projectQuery).select('_id').lean();
        
        const assignedProjectIds = new Set(assignedProjects.map(p => p._id.toString()));
        
        // Filter invoices to only those linked to assigned projects
        filteredInvoices = invoices.filter(inv => 
          inv.projectId && assignedProjectIds.has(inv.projectId.toString())
        );
      }
    }

    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalCollected = filteredInvoices.reduce((sum, inv) => sum + inv.paid, 0);
    const totalOutstanding = filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0);
    const overdueCount = filteredInvoices.filter(inv => inv.status === 'Overdue').length;
    const pendingCount = filteredInvoices.filter(inv => inv.status === 'Pending' || inv.status === 'Partial').length;

    return {
      totalRevenue,
      totalCollected,
      totalOutstanding,
      overdueCount,
      pendingCount,
      collectionRate: totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0,
    };
  }

  private calculateStatus(amount: number, paid: number, currentStatus?: string): InvoiceStatus {
    if (paid >= amount) return 'Paid';
    if (paid > 0) return 'Partial';
    if (currentStatus === 'Overdue') return 'Overdue';
    return (currentStatus as InvoiceStatus) || 'Pending';
  }

  private generateMilestones(paymentTerms: string, amount: number, invoiceDate: Date): any[] {
    const milestones: any[] = [];
    const invoiceDateObj = new Date(invoiceDate);

    switch (paymentTerms) {
      case '30% Advance':
        milestones.push({
          label: 'Advance',
          percentage: 30,
          amount: Math.round(amount * 0.30 * 100) / 100,
          dueDate: invoiceDateObj,
          isPaid: false,
        });
        milestones.push({
          label: 'Remaining',
          percentage: 70,
          amount: Math.round(amount * 0.70 * 100) / 100,
          dueDate: invoiceDateObj,
          isPaid: false,
        });
        break;

      case '50% on Delivery':
        milestones.push({
          label: 'On Delivery',
          percentage: 50,
          amount: Math.round(amount * 0.50 * 100) / 100,
          dueDate: invoiceDateObj,
          isPaid: false,
        });
        milestones.push({
          label: 'Remaining',
          percentage: 50,
          amount: Math.round(amount * 0.50 * 100) / 100,
          dueDate: invoiceDateObj,
          isPaid: false,
        });
        break;

      case 'Net 30':
        const net30Due = new Date(invoiceDateObj);
        net30Due.setDate(net30Due.getDate() + 30);
        milestones.push({
          label: 'Full Payment',
          percentage: 100,
          amount: amount,
          dueDate: net30Due,
          isPaid: false,
        });
        break;

      case 'Net 60':
        const net60Due = new Date(invoiceDateObj);
        net60Due.setDate(net60Due.getDate() + 60);
        milestones.push({
          label: 'Full Payment',
          percentage: 100,
          amount: amount,
          dueDate: net60Due,
          isPaid: false,
        });
        break;

      default:
        break;
    }

    return milestones;
  }

  private updateMilestonesForPayment(milestones: any[], totalPaid: number, paymentDate: Date): any[] {
    if (!milestones || milestones.length === 0) {
      return milestones;
    }

    let remainingPayment = totalPaid;
    const updatedMilestones = [...milestones];

    // Sort milestones by amount (ascending) to pay smaller milestones first
    updatedMilestones.sort((a, b) => a.amount - b.amount);

    for (const milestone of updatedMilestones) {
      if (remainingPayment >= milestone.amount && !milestone.isPaid) {
        milestone.isPaid = true;
        milestone.paidDate = paymentDate;
        remainingPayment -= milestone.amount;
      }
    }

    return updatedMilestones;
  }

  async sendReminder(
    tenantId: string,
    invoiceId: string,
    reminderType: ReminderType,
    customerEmail: string,
    messageBody: string,
  ): Promise<{ success: boolean; reminderLog: ReminderLog }> {
    const invoice = await this.findById(tenantId, invoiceId);

    // Validation: Check status
    if (invoice.status === 'Draft' || invoice.status === 'Paid') {
      throw new BadRequestException('Reminder cannot be sent for this invoice status.');
    }

    // Validation: Check balance
    const balance = Number(invoice.balance ?? (invoice.amount - (invoice.paid || 0)));
    if (balance <= 0) {
      throw new BadRequestException('Cannot send reminder - no outstanding balance.');
    }

    // Validation: Check email
    if (!customerEmail || !customerEmail.trim()) {
      throw new BadRequestException('Customer email is required to send reminder.');
    }

    // Generate email template based on reminder type
    const emailSubject = this.generateReminderSubject(invoice, reminderType);
    const emailBody = messageBody || this.generateDefaultMessage(invoice, reminderType, balance);

    // Send actual email using nodemailer
    let emailSent = false;
    let emailError: string | undefined;

    try {
      await this.sendReminderEmail({
        to: customerEmail.trim(),
        subject: emailSubject,
        html: this.generateReminderEmailBody(invoice, reminderType, balance, emailBody),
      });
      emailSent = true;
      console.log(`Reminder email sent to ${customerEmail} for invoice ${invoice.invoiceNumber}`);
    } catch (error) {
      emailSent = false;
      emailError = error instanceof Error ? error.message : 'Failed to send email';
      console.error('Failed to send reminder email:', error);
      throw new BadRequestException('Failed to send reminder email. Please check email configuration.');
    }

    // Create reminder log
    const reminderLog = new this.reminderLogModel({
      tenantId: this.toObjectId(tenantId) || await this.resolveTenantObjectId(tenantId),
      invoiceId: new Types.ObjectId(invoiceId),
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerEmail: customerEmail.trim(),
      reminderType,
      messageBody: emailBody,
      balanceAtSend: balance,
      dueDate: invoice.dueDate,
      sentAt: new Date(),
      emailSent,
      emailError,
    });

    const savedLog = await reminderLog.save();

    // Update invoice with reminder tracking
    const currentCount = invoice.reminderCount || 0;
    await this.invoiceModel.findOneAndUpdate(
      { _id: new Types.ObjectId(invoiceId), tenantId: new Types.ObjectId(tenantId) },
      {
        lastReminderSentAt: new Date(),
        reminderCount: currentCount + 1,
      },
    );

    // Log activity
    await this.logActivity(
      tenantId,
      invoiceId,
      'REMINDER_SENT',
      '000000000000000000000000',
      {
        invoiceNumber: invoice.invoiceNumber,
        reminderType,
        customerEmail: customerEmail.trim(),
        balanceAtSend: balance,
        sentTo: customerEmail.trim(),
      },
    );

    return { success: true, reminderLog: savedLog.toObject() };
  }

  private generateReminderSubject(invoice: Invoice, reminderType: ReminderType): string {
    const subjects: Record<ReminderType, string> = {
      'Gentle': `Friendly Reminder: Invoice ${invoice.invoiceNumber} Payment Due Soon`,
      'Due Today': `URGENT: Invoice ${invoice.invoiceNumber} Payment Due Today`,
      'Overdue': `ACTION REQUIRED: Overdue Invoice ${invoice.invoiceNumber}`,
    };
    return subjects[reminderType];
  }

  private generateDefaultMessage(invoice: Invoice, reminderType: ReminderType, balance: number): string {
    const dueDate = new Date(invoice.dueDate).toLocaleDateString();
    const amount = balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    const greetings: Record<ReminderType, string> = {
      'Gentle': `Dear ${invoice.customerName},\n\nWe hope this message finds you well. This is a friendly reminder that payment for your invoice is coming up.`,
      'Due Today': `Dear ${invoice.customerName},\n\nThis is an urgent reminder that your invoice payment is due today.`,
      'Overdue': `Dear ${invoice.customerName},\n\nOur records indicate that payment for the following invoice is now overdue. We kindly request immediate attention to this matter.`,
    };

    return `${greetings[reminderType]}

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Amount Due: ${amount}
- Due Date: ${dueDate}

Please arrange payment at your earliest convenience. If you have already made the payment, please disregard this reminder.

Thank you for your business.

Best regards,
Solar EPC Team`;
  }

  // Send reminder email using Nodemailer
  private async sendReminderEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    // Quick validation
    if (!options.to || !options.to.includes('@')) {
      throw new Error('Invalid recipient email');
    }

    let transporter;
    let fromEmail = 'noreply@solarepc.com';

    // If SMTP credentials configured, use them (FAST)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // Connection pooling for faster sending
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
      });
      fromEmail = process.env.SMTP_USER;
    } else {
      // Fallback: Use a simple mock/test transporter that completes immediately
      // This allows testing without real email but still completes fast
      console.warn('No SMTP config found - email would be sent to:', options.to);
      console.log('Email subject:', options.subject);
      // Return immediately without actually sending (for dev/testing)
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: `"Solar EPC" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log('Reminder email sent successfully:', info.messageId);
      const etherealUrl = (info as any).etherealMessageUrl;
      if (etherealUrl) {
        console.log('View reminder email at:', etherealUrl);
      }
    } catch (error) {
      console.error('Failed to send reminder email:', error);
      throw error;
    }
  }

  // Generate reminder email HTML body
  private generateReminderEmailBody(
    invoice: Invoice,
    reminderType: ReminderType,
    balance: number,
    messageBody: string,
  ): string {
    const formatCurrency = (amount: number) => {
      return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('en-IN');
    };

    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let urgencyColor = '#f59e0b'; // amber for gentle
    let urgencyBg = '#fffbeb';
    if (reminderType === 'Due Today') {
      urgencyColor = '#ef4444'; // red
      urgencyBg = '#fef2f2';
    } else if (reminderType === 'Overdue') {
      urgencyColor = '#dc2626'; // dark red
      urgencyBg = '#fee2e2';
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: ${urgencyColor}; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Solar EPC</h2>
          <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px;">Payment Reminder</p>
        </div>
        
        <div style="padding: 30px; background: ${urgencyBg}; border-left: 4px solid ${urgencyColor};">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear ${invoice.customerName},</p>
          
          <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${messageBody.replace(/\n/g, '<br>')}
          </div>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">Invoice Summary</h3>
          
          <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 8px; overflow: hidden;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 15px; font-weight: bold; color: #6b7280; width: 40%;">Invoice Number</td>
              <td style="padding: 12px 15px; color: #111;">${invoice.invoiceNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 15px; font-weight: bold; color: #6b7280;">Customer Name</td>
              <td style="padding: 12px 15px; color: #111;">${invoice.customerName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 15px; font-weight: bold; color: #6b7280;">Total Amount</td>
              <td style="padding: 12px 15px; color: #111;">${formatCurrency(invoice.amount)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 15px; font-weight: bold; color: #6b7280;">Amount Paid</td>
              <td style="padding: 12px 15px; color: #22c55e;">${formatCurrency(invoice.paid || 0)}</td>
            </tr>
            <tr style="background: ${urgencyBg};">
              <td style="padding: 12px 15px; font-weight: bold; color: ${urgencyColor};">Balance Due</td>
              <td style="padding: 12px 15px; font-weight: bold; color: ${urgencyColor}; font-size: 18px;">${formatCurrency(balance)}</td>
            </tr>
            <tr style="border-top: 1px solid #e5e7eb;">
              <td style="padding: 12px 15px; font-weight: bold; color: #6b7280;">Due Date</td>
              <td style="padding: 12px 15px; color: ${daysDiff < 0 ? '#dc2626' : '#111'};">
                ${formatDate(invoice.dueDate)}
                ${daysDiff < 0 ? ` <span style="color: #dc2626; font-weight: bold;">(${Math.abs(daysDiff)} days overdue)</span>` : ''}
                ${daysDiff === 0 ? ' <span style="color: #ef4444; font-weight: bold;">(Today)</span>' : ''}
                ${daysDiff > 0 && daysDiff <= 3 ? ` <span style="color: #f59e0b; font-weight: bold;">(${daysDiff} days left)</span>` : ''}
              </td>
            </tr>
          </table>
          
          <div style="margin-top: 25px; padding: 20px; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Payment Options:</p>
            <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
              <li>Bank Transfer: Account details available on request</li>
              <li>UPI: <strong>solarepc@upi</strong></li>
              <li>Cheque: Payable to "Solar EPC Solutions"</li>
            </ul>
          </div>
        </div>
        
        <div style="background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0 0 5px 0;">Thank you for your business!</p>
          <p style="margin: 0;">For any queries, contact us at <a href="mailto:info@solarepc.com" style="color: #60a5fa; text-decoration: none;">info@solarepc.com</a></p>
          <p style="margin: 10px 0 0 0; font-size: 11px;">Solar EPC Solutions | This is an automated reminder</p>
        </div>
      </div>
    `;
  }

  // Activity logging helper
  private async logActivity(
    tenantId: string,
    moduleId: string,
    action: ActivityAction,
    performedBy: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const activity = new this.activityModel({
      tenantId: this.toObjectId(tenantId) || await this.resolveTenantObjectId(tenantId),
      module: 'invoice',
      moduleId: new Types.ObjectId(moduleId),
      action,
      performedBy: new Types.ObjectId(performedBy),
      metadata,
      createdAt: new Date(),
    });
    await activity.save();
  }

  // Get invoice timeline (activities)
  async getTimeline(tenantId: string, invoiceId: string): Promise<any[]> {
    const activities = await this.activityModel
      .find({
        tenantId: this.toObjectId(tenantId),
        module: 'invoice',
        moduleId: new Types.ObjectId(invoiceId),
      })
      .sort({ createdAt: -1 })
      .populate('performedBy', 'name email')
      .lean();

    return activities.map(activity => ({
      id: activity._id,
      action: activity.action,
      metadata: activity.metadata,
      performedBy: activity.performedBy,
      createdAt: activity.createdAt,
    }));
  }

  // Send invoice email when status changes to Sent
  private async sendInvoiceEmail(tenantId: string, invoice: any): Promise<void> {
    // Fetch project to get customer email
    const project = await this.projectModel.findOne({
      _id: new Types.ObjectId(invoice.projectId),
      ...this.notDeletedMatch(),
    }).select('customerName email').lean();

    if (!project?.email) {
      console.warn('No customer email found for project:', invoice.projectId);
      return;
    }

    // Generate PDF attachment (skip if no project email to save time)
    let attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
    if (project?.email && process.env.SMTP_USER) {
      try {
        const pdfBuffer = await this.generateInvoicePDF(invoice);
        attachments = [{
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }];
      } catch (pdfError) {
        console.warn('PDF generation failed, sending without attachment:', pdfError);
      }
    }

    // Send email
    await this.sendEmailWithAttachment({
      to: project.email,
      subject: `Solar EPC Invoice - ${invoice.invoiceNumber}`,
      html: this.generateInvoiceEmailBody(invoice, project),
      attachments,
    });

    console.log(`Invoice email sent to ${project.email} for invoice ${invoice.invoiceNumber}`);
  }

  // Generate invoice PDF
  private async generateInvoicePDF(invoice: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        const formatCurrency = (amount: number) => {
          return '₹' + amount.toLocaleString('en-IN');
        };

        const formatDate = (date: Date) => {
          return new Date(date).toLocaleDateString('en-IN');
        };

        // Header
        doc.fontSize(24).text('Solar EPC', 50, 50);
        doc.fontSize(18).text('INVOICE', 50, 80);
        
        // Company Info
        doc.fontSize(10).text('Solar EPC Solutions', 400, 50, { align: 'right' });
        doc.fontSize(10).text('Email: info@solarepc.com', 400, 65, { align: 'right' });
        
        // Invoice Details
        doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 130);
        doc.fontSize(12).text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, 50, 150);
        doc.fontSize(12).text(`Due Date: ${formatDate(invoice.dueDate)}`, 50, 170);

        // Bill To
        doc.fontSize(14).text('Bill To:', 50, 210);
        doc.fontSize(12).text(invoice.customerName || 'Customer', 50, 230);
        if (invoice.customerAddress) {
          doc.fontSize(10).text(invoice.customerAddress, 50, 250);
        }

        // Line items header
        doc.moveTo(50, 300).lineTo(550, 300).stroke();
        doc.fontSize(12).text('Description', 50, 310);
        doc.fontSize(12).text('Amount', 450, 310, { align: 'right' });
        doc.moveTo(50, 330).lineTo(550, 330).stroke();

        // Line items (if any)
        let yPos = 350;
        if (invoice.items && invoice.items.length > 0) {
          invoice.items.forEach((item: any) => {
            doc.fontSize(10).text(item.description || 'Service', 50, yPos);
            doc.fontSize(10).text(formatCurrency(item.amount || 0), 450, yPos, { align: 'right' });
            yPos += 20;
          });
        } else {
          doc.fontSize(10).text('Solar EPC Services', 50, yPos);
          doc.fontSize(10).text(formatCurrency(invoice.amount || 0), 450, yPos, { align: 'right' });
          yPos += 20;
        }

        // Totals
        yPos += 20;
        doc.moveTo(350, yPos).lineTo(550, yPos).stroke();
        yPos += 15;
        doc.fontSize(12).text('Total Amount:', 350, yPos);
        doc.fontSize(12).text(formatCurrency(invoice.amount || 0), 450, yPos, { align: 'right' });
        
        yPos += 25;
        doc.fontSize(12).text('Amount Paid:', 350, yPos);
        doc.fontSize(12).text(formatCurrency(invoice.paid || 0), 450, yPos, { align: 'right' });
        
        yPos += 25;
        doc.fontSize(12).text('Balance Due:', 350, yPos);
        doc.fontSize(12).text(formatCurrency(invoice.balance || 0), 450, yPos, { align: 'right' });

        // Status
        yPos += 40;
        doc.fontSize(12).text(`Status: ${invoice.status || 'Pending'}`, 50, yPos);

        // Payment Terms
        if (invoice.paymentTerms) {
          yPos += 25;
          doc.fontSize(10).text(`Payment Terms: ${invoice.paymentTerms}`, 50, yPos);
        }

        // Footer
        doc.fontSize(10).text('Thank you for your business!', 50, 700);
        doc.fontSize(10).text('For any queries, please contact us at info@solarepc.com', 50, 715);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate invoice email body
  private generateInvoiceEmailBody(invoice: any, project: any): string {
    const formatCurrency = (amount: number) => {
      return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('en-IN');
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Solar EPC Invoice</h2>
        
        <p>Dear ${project?.customerName || invoice.customerName},</p>
        
        <p>Please find your invoice details below:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Customer Name</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${project?.customerName || invoice.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Project Name</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${project?.name || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Invoice Number</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Invoice Date</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(invoice.invoiceDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Due Date</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(invoice.dueDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total Amount</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(invoice.amount)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Outstanding Amount</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(invoice.balance)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Company Name</td>
            <td style="padding: 8px; border: 1px solid #ddd;">Solar EPC</td>
          </tr>
        </table>
        
        <p>Please find your invoice attached.</p>
        
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>Solar EPC Team</strong>
        </p>
      </div>
    `;
  }

  // Send email with attachment using Nodemailer
  private async sendEmailWithAttachment(options: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
  }): Promise<void> {
    let transporter;
    let fromEmail = 'noreply@solarepc.com';

    // If SMTP credentials configured, use them (FAST)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // Connection pooling for faster sending
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
      });
      fromEmail = process.env.SMTP_USER;
    } else {
      // Fallback: Log and return immediately for dev/testing (FAST)
      console.warn('No SMTP config found - email would be sent to:', options.to);
      console.log('Email subject:', options.subject);
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: `"Solar EPC" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: (options.attachments || []).map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      console.log('Email sent successfully:', info.messageId);
      const etherealUrl = (info as any).etherealMessageUrl;
      if (etherealUrl) {
        console.log('View email at:', etherealUrl);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }
}



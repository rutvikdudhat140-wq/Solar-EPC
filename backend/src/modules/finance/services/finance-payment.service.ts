import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FinancePayment, FinancePaymentDocument } from '../schemas/finance-payment.schema';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';

@Injectable()
export class FinancePaymentService {
  constructor(
    @InjectModel(FinancePayment.name) private readonly financePaymentModel: Model<FinancePaymentDocument>,
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel('PurchaseOrder') private readonly purchaseOrderModel: Model<any>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

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

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) {
      // For invalid ObjectIds (like vendor custom IDs "V001"), create a deterministic ObjectId
      try {
        // Create a deterministic ObjectId from the string
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hexString = (hash % 16777215).toString(16).padStart(6, '0');
        const paddedId = ('000000000000000000000000' + hexString).slice(-24);
        return new Types.ObjectId(paddedId);
      } catch {
        return undefined;
      }
    }
    try {
      return new Types.ObjectId(id);
    } catch {
      return undefined;
    }
  }

  async initiatePayment(tenantId: string, dto: RecordPaymentDto, userId?: string): Promise<FinancePayment> {
    const tid = await this.resolveTenantObjectId(tenantId);
    console.log('[initiatePayment] Received DTO:', JSON.stringify({
      paymentType: dto.paymentType,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      referenceIdLength: dto.referenceId?.length,
      referenceIdType: typeof dto.referenceId,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      paymentDate: dto.paymentDate,
    }, null, 2));

    const paymentNumber = await this.generatePaymentNumber(tenantId);

    let invoiceId: Types.ObjectId | undefined;
    let vendorId: Types.ObjectId | undefined;

    if (dto.referenceType === 'Invoice') {
      invoiceId = this.toObjectId(dto.referenceId);
      if (!invoiceId) {
        throw new BadRequestException(`Invalid invoice ID format: ${dto.referenceId}. Must be a valid MongoDB ObjectId.`);
      }
    } else if (dto.referenceType === 'Vendor') {
      vendorId = this.toObjectId(dto.referenceId);
      if (!vendorId) {
        throw new BadRequestException(`Invalid vendor ID format: "${dto.referenceId}" (length: ${dto.referenceId?.length}, type: ${typeof dto.referenceId}). This should be a valid MongoDB ObjectId or vendor custom ID like "V001".`);
      }
    } else {
      throw new BadRequestException(`Invalid referenceType: ${dto.referenceType}. Must be 'Invoice' or 'Vendor'.`);
    }

    const methodDetails: any = {};
    if (dto.paymentMethod === 'UPI') {
      methodDetails.upiRequestId = `UPI-${Date.now()}`;
    }

    const financePayment = new this.financePaymentModel({
      tenantId: tid,
      paymentNumber,
      paymentType: dto.paymentType,
      referenceType: dto.referenceType,
      referenceId: invoiceId || vendorId,
      invoiceId,
      vendorId,
      amount: dto.amount,
      status: 'Initiated',
      initiatedAt: new Date(),
      paymentMethod: dto.paymentMethod,
      paymentDate: new Date(dto.paymentDate),
      methodDetails,
      notes: dto.notes,
      createdBy: userId ? this.toObjectId(userId) : undefined,
      isDeleted: false,
    });

    const saved = await financePayment.save();
    return saved.toObject();
  }

  async verifyPayment(
    tenantId: string,
    id: string,
    payload: {
      bankName?: string;
      accountNumber?: string;
      transactionReference?: string;
      transferDate?: string;
      upiId?: string;
      chequeNumber?: string;
      chequeDate?: string;
      description?: string;
    },
  ): Promise<FinancePayment> {
    const existing = await this.findById(tenantId, id);

    if (existing.status === 'Completed') {
      return existing;
    }

    if (existing.paymentMethod === 'Bank Transfer') {
      if (!payload.bankName || !payload.transactionReference || !payload.transferDate) {
        throw new BadRequestException('bankName, transactionReference and transferDate are required');
      }
      if (!/^[A-Za-z0-9\-_/]{6,}$/.test(payload.transactionReference)) {
        throw new BadRequestException('Invalid transaction reference format');
      }
      const tid = await this.resolveTenantObjectId(tenantId);
      const updated = await this.financePaymentModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: tid, isDeleted: false },
        {
          $set: {
            status: 'Processing',
            processingAt: new Date(),
            methodDetails: {
              ...(existing.methodDetails || {}),
              bankName: payload.bankName,
              accountNumber: payload.accountNumber,
              transactionReference: payload.transactionReference,
              transferDate: payload.transferDate ? new Date(payload.transferDate) : undefined,
            },
          },
        },
        { new: true },
      ).lean();
      if (!updated) throw new NotFoundException('Payment not found');
      return updated;
    }

    if (existing.paymentMethod === 'Cheque') {
      if (!payload.chequeNumber || !payload.bankName || !payload.chequeDate) {
        throw new BadRequestException('chequeNumber, bankName and chequeDate are required');
      }
      const tid = await this.resolveTenantObjectId(tenantId);
      const updated = await this.financePaymentModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: tid, isDeleted: false },
        {
          $set: {
            status: 'Processing',
            processingAt: new Date(),
            methodDetails: {
              ...(existing.methodDetails || {}),
              chequeNumber: payload.chequeNumber,
              bankName: payload.bankName,
              chequeDate: payload.chequeDate ? new Date(payload.chequeDate) : undefined,
            },
          },
        },
        { new: true },
      ).lean();
      if (!updated) throw new NotFoundException('Payment not found');
      return updated;
    }

    if (existing.paymentMethod === 'UPI') {
      if (!payload.upiId) {
        throw new BadRequestException('upiId is required');
      }
      const tid = await this.resolveTenantObjectId(tenantId);
      const interim = await this.financePaymentModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: tid, isDeleted: false },
        {
          $set: {
            methodDetails: {
              ...(existing.methodDetails || {}),
              upiId: payload.upiId,
            },
          },
        },
        { new: true },
      ).lean();
      if (!interim) throw new NotFoundException('Payment not found');
      return this.completePayment(tenantId, id, { cashConfirmed: true });
    }

    if (existing.paymentMethod === 'Other') {
      if (!payload.description) {
        throw new BadRequestException('description is required');
      }
      const tid = await this.resolveTenantObjectId(tenantId);
      const updated = await this.financePaymentModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: tid, isDeleted: false },
        {
          $set: {
            methodDetails: {
              ...(existing.methodDetails || {}),
              description: payload.description,
            },
          },
        },
        { new: true },
      ).lean();
      if (!updated) throw new NotFoundException('Payment not found');
      return updated;
    }

    if (existing.paymentMethod === 'Cash') {
      return existing;
    }

    return existing;
  }

  async completePayment(
    tenantId: string,
    id: string,
    payload?: { cashConfirmed?: boolean },
    userId?: string,
  ): Promise<FinancePayment> {
    const existing = await this.findById(tenantId, id);
    if (existing.status === 'Completed') return existing;

    if (existing.paymentMethod === 'Cash') {
      if (!payload?.cashConfirmed) {
        throw new BadRequestException('Cash confirmation required');
      }
    }

    if (existing.paymentMethod === 'Bank Transfer') {
      if (existing.status !== 'Processing') {
        throw new BadRequestException('Bank transfer must be verified first');
      }
    }

    if (existing.paymentMethod === 'Cheque') {
      if (existing.status !== 'Processing') {
        throw new BadRequestException('Cheque must be in processing before clearance');
      }
    }

    const tid = await this.resolveTenantObjectId(tenantId);
    const updated = await this.financePaymentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: tid, isDeleted: false },
      {
        $set: {
          status: 'Completed',
          completedAt: new Date(),
          methodDetails: {
            ...(existing.methodDetails || {}),
            ...(existing.paymentMethod === 'Cash' ? { cashConfirmed: true } : {}),
          },
        },
      },
      { new: true },
    ).lean();

    if (!updated) throw new NotFoundException('Payment not found');

    if (updated.paymentType === 'Customer Payment' && updated.referenceType === 'Invoice' && updated.invoiceId) {
      await this.updateInvoicePayment(tenantId, String(updated.invoiceId), updated.amount);
    }

    if (updated.paymentType === 'Vendor Payment' && updated.referenceType === 'Vendor' && updated.vendorId) {
      await this.createVendorExpense(
        tenantId,
        {
          paymentType: updated.paymentType as any,
          referenceType: updated.referenceType as any,
          referenceId: String(updated.vendorId),
          amount: updated.amount,
          paymentDate: updated.paymentDate.toISOString(),
          paymentMethod: updated.paymentMethod as any,
          notes: updated.notes,
        },
        updated.paymentNumber,
        userId,
      );
    }

    return updated;
  }

  async updateInvoicePayment(tenantId: string, invoiceId: string, paymentAmount: number): Promise<void> {
    const invoiceObjectId = this.toObjectId(invoiceId);
    const tenantObjectId = await this.resolveTenantObjectId(tenantId);
    
    if (!invoiceObjectId) {
      throw new NotFoundException('Invalid invoice ID format');
    }
    
    const invoice = await this.invoiceModel.findOne({
      _id: invoiceObjectId,
      tenantId: tenantObjectId,
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Calculate new amounts
    const currentPaid = invoice.paid || 0;
    const newPaid = currentPaid + paymentAmount;
    const amount = invoice.amount;
    const newBalance = amount - newPaid;

    // Determine new status
    let newStatus = invoice.status;
    if (newPaid >= amount) {
      newStatus = 'Paid';
    } else if (newPaid > 0) {
      newStatus = 'Partial';
    }

    // Update the invoice
    await this.invoiceModel.findOneAndUpdate(
      { _id: invoiceObjectId, tenantId: tenantObjectId },
      {
        $set: {
          paid: newPaid,
          balance: newBalance,
          status: newStatus,
          paidDate: newPaid >= amount ? new Date() : invoice.paidDate,
        },
      },
    );
  }

  async createVendorExpense(tenantId: string, dto: RecordPaymentDto, paymentNumber: string, userId?: string): Promise<void> {
    const tid = await this.resolveTenantObjectId(tenantId);
    // Create an expense entry for the vendor payment
    const expense = new this.expenseModel({
      tenantId: tid,
      category: 'Vendor Payment',
      amount: dto.amount,
      expenseDate: new Date(dto.paymentDate),
      description: dto.notes || `Vendor payment - ${paymentNumber}`,
      vendor: dto.referenceId,
      status: 'Paid',
      paymentMethod: dto.paymentMethod,
      referenceNumber: paymentNumber,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      isDeleted: false,
    });

    await expense.save();

    // Update Purchase Order(s) for this vendor - add payment to oldest unpaid POs first
    await this.updateVendorPurchaseOrders(tenantId, dto.referenceId, dto.amount);
  }

  async updateVendorPurchaseOrders(tenantId: string, vendorId: string, paymentAmount: number): Promise<void> {
    const tid = await this.resolveTenantObjectId(tenantId);
    // Find all POs for this vendor with outstanding balance
    const vendorPOs = await this.purchaseOrderModel.find({
      tenantId: tid,
      vendorId: new Types.ObjectId(vendorId),
      status: { $ne: 'Cancelled' },
    }).sort({ orderedDate: 1 }).lean();

    let remainingPayment = paymentAmount;

    for (const po of vendorPOs) {
      if (remainingPayment <= 0) break;

      const poTotal = Number(po.totalAmount || 0);
      const poPaid = Number(po.paidAmount || 0);
      const poOutstanding = poTotal - poPaid;

      if (poOutstanding > 0) {
        const paymentForThisPO = Math.min(remainingPayment, poOutstanding);
        const newPaid = poPaid + paymentForThisPO;

        await this.purchaseOrderModel.findOneAndUpdate(
          { _id: po._id },
          { $set: { paidAmount: newPaid } }
        );

        remainingPayment -= paymentForThisPO;
      }
    }
  }

  async generatePaymentNumber(tenantId: string): Promise<string> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const prefix = 'PAY-';
    const currentYear = new Date().getFullYear();
    
    // Find the last payment for this tenant in the current year
    const lastPayment = await this.financePaymentModel
      .findOne({ 
        tenantId: tid,
        paymentNumber: { $regex: `^${prefix}${currentYear}-` },
      })
      .sort({ paymentNumber: -1 })
      .lean();

    let sequence = 1;
    if (lastPayment) {
      const match = lastPayment.paymentNumber.match(/-(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${currentYear}-${String(sequence).padStart(5, '0')}`;
  }

  async findAll(tenantId: string, filters?: { paymentType?: string; referenceId?: string }): Promise<FinancePayment[]> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const query: any = { tenantId: tid, isDeleted: false };
    
    if (filters?.paymentType) {
      query.paymentType = filters.paymentType;
    }
    
    if (filters?.referenceId) {
      query.referenceId = new Types.ObjectId(filters.referenceId);
    }

    return this.financePaymentModel
      .find(query)
      .sort({ paymentDate: -1 })
      .lean();
  }

  async findById(tenantId: string, id: string): Promise<FinancePayment> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const payment = await this.financePaymentModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: tid,
      isDeleted: false,
    }).lean();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const result = await this.financePaymentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: tid },
      { $set: { isDeleted: true } },
    );

    if (!result) {
      throw new NotFoundException('Payment not found');
    }
  }
}

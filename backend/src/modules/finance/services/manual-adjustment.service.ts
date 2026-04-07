import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ManualAdjustment, ManualAdjustmentDocument } from '../schemas/manual-adjustment.schema';
import { JournalEntry, JournalEntryDocument } from '../schemas/journal-entry.schema';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { CreateManualAdjustmentDto } from '../dto/manual-adjustment.dto';
import { FinancePurchaseOrder, FinancePurchaseOrderDocument } from '../../finance/schemas/finance-purchase-order.schema';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';
import { FinanceVendorService } from './finance-vendor.service';
import { FinanceVendor, FinanceVendorDocument } from '../schemas/finance-vendor.schema';

@Injectable()
export class ManualAdjustmentService {
  constructor(
    @InjectModel(ManualAdjustment.name) private readonly manualAdjustmentModel: Model<ManualAdjustmentDocument>,
    @InjectModel(JournalEntry.name) private readonly journalEntryModel: Model<JournalEntryDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(FinancePurchaseOrder.name) private readonly purchaseOrderModel: Model<FinancePurchaseOrderDocument>,
    @InjectModel(FinanceVendor.name) private readonly financeVendorModel: Model<FinanceVendorDocument>,
    private readonly financeVendorService: FinanceVendorService,
  ) {}

  /**
   * Resolves tenantId to a valid ObjectId.
   * If the string is already a valid ObjectId, uses it directly.
   * Otherwise treats it as a tenant code or slug and looks up the tenant.
   */
  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    const tenant = await this.tenantModel.findOne({ 
      $or: [{ code: tenantId }, { slug: tenantId }] 
    }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

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

  async findAll(tenantId: string): Promise<ManualAdjustment[]> {
    const tenantObjectId = await this.resolveTenantObjectId(tenantId);
    const data = await this.manualAdjustmentModel
      .find({ tenantId: tenantObjectId, isDeleted: false })
      .sort({ date: -1 })
      .lean();
    console.log('📋 FINDALL ADJUSTMENTS - Count:', data.length, 'First item:', data[0] ? JSON.stringify({id: data[0]._id, ref: data[0].reference, cat: data[0].category}) : 'none');
    return data;
  }

  async getBalance(tenantId: string): Promise<number> {
    const query: any = { isDeleted: false };
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId !== '') {
      throw new BadRequestException('Invalid Tenant ID');
    }
    
    // Invoice query
    const invoiceQuery: any = { 
      isDeleted: false
    };
    if (query.tenantId) invoiceQuery.tenantId = query.tenantId;
    
    // Expense query
    const expenseQuery: any = { 
      isDeleted: false, 
      status: 'Paid', 
      category: 'Vendor Payment' 
    };
    if (query.tenantId) expenseQuery.tenantId = query.tenantId;
    
    // Adjustment query
    const adjustmentQuery: any = { 
      isDeleted: false
    };
    if (query.tenantId) adjustmentQuery.tenantId = query.tenantId;

    console.log('=== getBalance querying DB');
    const [invoices, paidExpenses, adjustments] = await Promise.all([
      this.invoiceModel.find(invoiceQuery).lean(),
      this.expenseModel.find(expenseQuery).lean(),
      this.manualAdjustmentModel.find(adjustmentQuery).lean(),
    ]);

    console.log('=== getBalance STEP 8 DB queries done');

    // Debug: Check first few invoices
    console.log('=== First 3 invoices paid values:');
    (invoices || []).slice(0, 3).forEach((inv, i) => {
      console.log(`  Invoice ${i}: paid=${inv?.paid}, amount=${inv?.amount}, status=${inv?.status}`);
    });

    // Debug logging
    console.log('getBalance debug:', {
      tenantId,
      invoiceCount: invoices?.length || 0,
      paidExpensesCount: paidExpenses?.length || 0,
      adjustmentsCount: adjustments?.length || 0,
    });

    // Inflow: Total collected from invoices (paid field, or amount if status is Paid)
    const inflow = (invoices || []).reduce((sum, inv: any) => {
      const paid = Number(inv?.paid || 0);
      const amount = Number(inv?.amount || 0);
      // If paid is 0 but status is Paid, use the full amount
      const effectivePaid = (paid === 0 && inv?.status === 'Paid') ? amount : paid;
      return sum + effectivePaid;
    }, 0);
    console.log('=== getBalance STEP 9 inflow:', inflow);
    
    // Outflow: Total vendor payments made
    const outflow = (paidExpenses || []).reduce((sum, e: any) => sum + Number(e?.amount || e?.paidAmount || 0), 0);
    console.log('=== getBalance STEP 10 outflow:', outflow);

    // Net adjustments: Credit - Debit
    const netAdjustments = (adjustments || []).reduce((sum, a: any) => {
      const amt = Number(a?.amount || 0);
      return sum + (a?.type === 'credit' ? amt : -amt);
    }, 0);
    console.log('=== getBalance STEP 11 netAdjustments:', netAdjustments);

    const total = inflow - outflow + netAdjustments;
    console.log('=== getBalance STEP 12 TOTAL:', total);
    console.log('getBalance result:', { inflow, outflow, netAdjustments, total });

    return total;
  }

  async create(tenantId: string, dto: CreateManualAdjustmentDto, userId?: string): Promise<{ adjustment: ManualAdjustment; balance: number; journalEntry?: JournalEntry }> {
    console.log('🔧 CREATE MANUAL ADJUSTMENT - DTO:', JSON.stringify(dto, null, 2));
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (!tenantId) {
      throw new BadRequestException('Invalid or missing tenantId');
    }
    const tenantObjectId = await this.resolveTenantObjectId(tenantId);

    const currentBalance = await this.getBalance(tenantId);
    if (dto.type === 'debit' && currentBalance - amount < 0) {
      throw new BadRequestException('Debit would make balance negative');
    }

    const createdByObjectId = userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined;

    const adjustment = new this.manualAdjustmentModel({
      tenantId: tenantObjectId,
      type: dto.type,
      category: dto.category,
      amount,
      reason: dto.reason,
      reference: dto.reference,
      date: new Date(dto.date),
      createdBy: createdByObjectId,
      isDeleted: false,
      lf: dto.lf,
    });

    const saved = await adjustment.save();
    console.log('✅ SAVED ADJUSTMENT:', JSON.stringify(saved.toObject(), null, 2));

    // UPDATE INVOICE PAID AMOUNT for Invoice Payment adjustments
    if (dto.type === 'credit' && dto.category === 'Invoice Payment' && dto.reference) {
      try {
        const invoiceId = this.toObjectId(dto.reference);
        if (invoiceId) {
          const invoice = await this.invoiceModel.findById(invoiceId);
          if (invoice) {
            const currentPaid = Number(invoice.paid || 0);
            const newPaid = currentPaid + amount;
            const invoiceAmount = Number(invoice.amount || 0);
            const newStatus = newPaid >= invoiceAmount ? 'Paid' : 'Partial';
            
            await this.invoiceModel.findByIdAndUpdate(invoiceId, {
              $set: {
                paid: newPaid,
                balance: invoiceAmount - newPaid,
                status: newStatus,
                paidDate: dto.date
              }
            });
            console.log('✅ UPDATED INVOICE:', { invoiceId: dto.reference, newPaid, newStatus });
          }
        }
      } catch (invErr) {
        console.error('Failed to update invoice paid amount:', invErr);
        // Don't fail the adjustment if invoice update fails
      }
    }

    // UPDATE PAYABLE AMOUNT for Vendor Payment adjustments
    if (dto.type === 'debit' && dto.category === 'Vendor Payment' && dto.reference) {
      try {
        const payableId = this.toObjectId(dto.reference);
        if (payableId) {
          const payable = await this.expenseModel.findById(payableId);
          if (payable) {
            const payableAny = payable as any;
            const currentPaid = Number(payableAny.amountPaid || 0);
            const newPaid = currentPaid + amount;
            const payableAmount = Number(payable.amount || 0);
            const newOutstanding = payableAmount - newPaid;
            const newStatus = newOutstanding <= 0 ? 'Paid' : 'Partial';
            
            await this.expenseModel.findByIdAndUpdate(payableId, {
              $set: {
                amountPaid: newPaid,
                outstandingAmount: newOutstanding,
                status: newStatus
              }
            });
            console.log('✅ UPDATED PAYABLE:', { payableId: dto.reference, newPaid, newStatus });
          }
        }
      } catch (payErr) {
        console.error('Failed to update payable amount:', payErr);
        // Don't fail the adjustment if payable update fails
      }

      // UPDATE PURCHASE ORDERS for this vendor - add payment to oldest unpaid POs first
      try {
        const vendorId = dto.reference;
        const vendorObjectId = this.toObjectId(vendorId);
        if (vendorObjectId) {
          console.log('[Vendor Payment] Updating Purchase Orders for vendor:', vendorId, 'amount:', amount);
          
          // Find all POs for this vendor with outstanding balance
          const vendorPOs = await this.purchaseOrderModel.find({
            vendorId: vendorObjectId,
            status: { $ne: 'Cancelled' },
          }).sort({ orderedDate: 1 }).lean();
          
          console.log('[Vendor Payment] Found POs:', vendorPOs.length);
          
          let remainingPayment = amount;
          let firstPONumber = '';
          let firstPOId = '';
          
          for (const po of vendorPOs) {
            if (remainingPayment <= 0) break;
            
            const poTotal = Number(po.totalAmount || 0);
            const poPaid = Number(po.paidAmount || 0);
            const poOutstanding = poTotal - poPaid;
            
            if (poOutstanding > 0) {
              const paymentForThisPO = Math.min(remainingPayment, poOutstanding);
              const newPoPaid = poPaid + paymentForThisPO;
              
              await this.purchaseOrderModel.findOneAndUpdate(
                { _id: po._id },
                { $set: { paidAmount: newPoPaid } }
              );
              
              if (!firstPONumber) {
                firstPONumber = po.id || po._id.toString();
                firstPOId = po._id.toString();
              }
              
              console.log('[Vendor Payment] Updated PO:', po._id.toString(), 'oldPaid:', poPaid, 'newPaid:', newPoPaid);
              remainingPayment -= paymentForThisPO;
            }
          }
          
          console.log('[Vendor Payment] Purchase Orders updated successfully');
          
          // Update finance vendor's totalPaid to reflect the payment
          try {
            console.log('[Vendor Payment] Updating finance vendor totalPaid for vendor:', vendorId);
            
            // Update finance vendor's totalPaid directly using injected model
            await this.financeVendorModel.updateOne(
              { vendorId: vendorObjectId },
              { 
                $inc: { totalPaid: amount }  // Increment totalPaid by payment amount
              }
            );
            
            console.log('[Vendor Payment] Updated finance vendor totalPaid - incremented by:', amount);
          } catch (fvErr) {
            console.error('[Vendor Payment] Failed to update finance vendor:', fvErr);
            // Don't fail the adjustment if finance vendor update fails
          }
          
          console.log('[Vendor Payment] All updates completed successfully');
        }
      } catch (poErr) {
        console.error('[Vendor Payment] Failed to update Purchase Orders:', poErr);
        // Don't fail the adjustment if PO update fails, but DO fail if financeVendors recording failed
        if (poErr instanceof Error && poErr.message.includes('Failed to record vendor payment')) {
          throw poErr;
        }
      }
    }

    const balance = await this.getBalance(tenantId);

    // Create journal entry for this adjustment
    let journalEntry: JournalEntry | undefined;
    try {
      const journalEntryId = `JE-${Date.now().toString(36).toUpperCase()}`;
      const lines = [];
      let narration = '';

      // Get invoice info for Invoice Payment category
      let invoiceInfo = null;
      if (dto.category === 'Invoice Payment' && dto.reference) {
        try {
          const invoiceId = this.toObjectId(dto.reference);
          if (invoiceId) {
            invoiceInfo = await this.invoiceModel.findById(invoiceId).lean();
          }
        } catch (e) {
          // Ignore error, continue without invoice info
        }
      }

      if (dto.type === 'debit') {
        // Debit adjustment: Category debited, Cash/Bank credited
        lines.push({
          accountName: dto.category,
          debitAmount: amount,
          creditAmount: 0,
        });
        lines.push({
          accountName: 'Cash/Bank A/c',
          debitAmount: 0,
          creditAmount: amount,
        });
        narration = `Debit adjustment: ${dto.reason || dto.category}`;
      } else {
        // Credit adjustment: Cash/Bank debited, Category credited
        lines.push({
          accountName: 'Cash/Bank A/c',
          debitAmount: amount,
          creditAmount: 0,
        });
        // Include invoice number in account name for Invoice Payment
        const creditAccountName = (dto.category === 'Invoice Payment' && invoiceInfo?.invoiceNumber)
          ? `${dto.category} (${invoiceInfo.invoiceNumber})`
          : dto.category;
        lines.push({
          accountName: creditAccountName,
          debitAmount: 0,
          creditAmount: amount,
        });
        narration = `Credit adjustment: ${dto.reason || dto.category}`;
      }

      const journalEntryDoc = new this.journalEntryModel({
        tenantId: tenantObjectId,
        journalEntryId,
        date: new Date(dto.date),
        narration,
        reference: dto.reference,
        lines,
        totalDebit: amount,
        totalCredit: amount,
        relatedAdjustmentId: saved._id,
        createdBy: createdByObjectId,
        isDeleted: false,
        lf: dto.lf,
      });

      const savedJournal = await journalEntryDoc.save();
      journalEntry = savedJournal.toObject();
    } catch (jeErr) {
      console.error('Failed to create journal entry for adjustment:', jeErr);
      // Don't fail the adjustment if journal entry creation fails
    }

    return { adjustment: saved.toObject(), balance, journalEntry };
  }
}

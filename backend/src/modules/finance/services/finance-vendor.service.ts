import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FinanceVendor, FinanceVendorDocument } from '../schemas/finance-vendor.schema';
import { FinancePurchaseOrder, FinancePurchaseOrderDocument } from '../schemas/finance-purchase-order.schema';

@Injectable()
export class FinanceVendorService {
  constructor(
    @InjectModel(FinanceVendor.name) private readonly financeVendorModel: Model<FinanceVendorDocument>,
    @InjectModel(FinancePurchaseOrder.name) private readonly purchaseOrderModel: Model<FinancePurchaseOrderDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return undefined;
    try {
      return new Types.ObjectId(id);
    } catch {
      return undefined;
    }
  }

  async findAll(tenantId: string): Promise<FinanceVendor[]> {
    const tid = this.toObjectId(tenantId);
    const query: any = { isDeleted: false };
    if (tid) {
      // Include vendors with matching tenantId OR vendors without tenantId (for backwards compatibility)
      query.$or = [{ tenantId: tid }, { tenantId: { $exists: false } }, { tenantId: null }];
    }
    return this.financeVendorModel.find(query).sort({ vendorName: 1 }).lean();
  }

  async syncAllVendorsFromProcurement(tenantId: string): Promise<void> {
    console.log('[FINANCE AUTO-SYNC] Starting auto-sync for tenant:', tenantId);
    
    try {
      // Get all procurement vendors
      const procurementVendors = await this.purchaseOrderModel.aggregate([
        {
          $group: {
            _id: '$vendorId',
            vendorName: { $first: '$vendorName' },
            purchaseOrders: { $push: '$$ROOT' }
          }
        }
      ]);

      console.log('[FINANCE AUTO-SYNC] Found', procurementVendors.length, 'vendors in procurement');

      // Sync each vendor and their POs
      for (const vendor of procurementVendors) {
        try {
          await this.syncVendorFromProcurement(
            tenantId,
            { _id: vendor._id, name: vendor.vendorName },
            vendor.purchaseOrders
          );
          console.log('[FINANCE AUTO-SYNC] Synced vendor:', vendor._id);
        } catch (err) {
          console.error('[FINANCE AUTO-SYNC] Error syncing vendor', vendor._id, err);
        }
      }

      console.log('[FINANCE AUTO-SYNC] Complete');
    } catch (error) {
      console.error('[FINANCE AUTO-SYNC] Failed:', error);
    }
  }

  async findByVendorId(tenantId: string, vendorId: string): Promise<FinanceVendor | null> {
    const tid = this.toObjectId(tenantId);
    const vid = this.toObjectId(vendorId);
    if (!vid) return null;
    
    const query: any = { vendorId: vid, isDeleted: false };
    if (tid) {
      query.tenantId = tid;
    }
    return this.financeVendorModel.findOne(query).lean();
  }

  async createOrUpdateVendor(tenantId: string, vendorData: {
    vendorId: string;
    vendorName: string;
    vendorCode: string;
    totalPayable?: number;
    totalPaid?: number;
    totalPurchaseOrders?: number;
  }): Promise<FinanceVendor> {
    const tid = this.toObjectId(tenantId);
    const vid = this.toObjectId(vendorData.vendorId);
    if (!vid) {
      throw new NotFoundException('Invalid vendor ID');
    }

    const query: any = { vendorId: vid };
    if (tid) {
      query.tenantId = tid;
    }

    const existing = await this.financeVendorModel.findOne(query);

    if (existing) {
      // Update existing
      const updateData: any = {
        vendorName: vendorData.vendorName,
        vendorCode: vendorData.vendorCode,
      };

      if (vendorData.totalPayable !== undefined) {
        updateData.totalPayable = vendorData.totalPayable;
      }
      if (vendorData.totalPurchaseOrders !== undefined) {
        updateData.totalPurchaseOrders = vendorData.totalPurchaseOrders;
      }
      if (vendorData.totalPaid !== undefined) {
        // Only update totalPaid if it's from manual payments (recordVendorPayment)
        // NOT from PO-based sync - preserve existing manual payments
        const existingTotalPaid = existing.totalPaid || 0;
        const newTotalPaid = vendorData.totalPaid > existingTotalPaid 
          ? vendorData.totalPaid  // If new value is higher, use it (manual payment recorded)
          : existingTotalPaid;     // Otherwise keep existing (don't reduce from PO sync)
        updateData.totalPaid = newTotalPaid;
        updateData.outstandingAmount = (vendorData.totalPayable || existing.totalPayable || 0) - newTotalPaid;
      }

      const updated = await this.financeVendorModel.findOneAndUpdate(
        query,
        { $set: updateData },
        { new: true }
      ).lean();
      
      return updated as FinanceVendor;
    } else {
      // Create new
      const newVendor = new this.financeVendorModel({
        vendorId: vid,
        vendorName: vendorData.vendorName,
        vendorCode: vendorData.vendorCode,
        tenantId: tid,
        totalPayable: vendorData.totalPayable || 0,
        totalPaid: vendorData.totalPaid || 0,
        outstandingAmount: (vendorData.totalPayable || 0) - (vendorData.totalPaid || 0),
        totalPurchaseOrders: vendorData.totalPurchaseOrders || 0,
        status: 'Active',
        paymentHistory: [],
        isDeleted: false,
      });

      const saved = await newVendor.save();
      return saved.toObject();
    }
  }

  async recordVendorPayment(tenantId: string, vendorId: string, paymentData: {
    amount: number;
    date: string;
    poId?: string;
    poNumber?: string;
    notes?: string;
  }): Promise<FinanceVendor> {
    const tid = this.toObjectId(tenantId);
    const vid = this.toObjectId(vendorId);
    if (!vid) {
      throw new NotFoundException('Invalid vendor ID');
    }

    const query: any = { vendorId: vid, isDeleted: false };
    if (tid) {
      query.tenantId = tid;
    }

    let vendor = await this.financeVendorModel.findOne(query);
    
    // If vendor doesn't exist, create it first
    if (!vendor) {
      // Get vendor info from procurement vendors (if available)
      // For now, create with basic info
      const newVendor = new this.financeVendorModel({
        vendorId: vid,
        vendorName: paymentData.notes || 'Unknown Vendor',
        vendorCode: `V-${vendorId.slice(-4)}`,
        tenantId: tid,
        totalPayable: 0,
        totalPaid: 0,
        outstandingAmount: 0,
        totalPurchaseOrders: 0,
        status: 'Active',
        paymentHistory: [],
        isDeleted: false,
      });
      vendor = await newVendor.save();
    }

    const currentPaid = vendor.totalPaid || 0;
    const newPaid = currentPaid + paymentData.amount;
    const newOutstanding = vendor.totalPayable - newPaid;

    // Add payment to history
    const paymentEntry = {
      date: new Date(paymentData.date),
      amount: paymentData.amount,
      poId: paymentData.poId || '',
      poNumber: paymentData.poNumber || '',
      notes: paymentData.notes || '',
    };

    // Update vendor record
    const updated = await this.financeVendorModel.findOneAndUpdate(
      { _id: vendor._id },
      {
        $set: {
          totalPaid: newPaid,
          outstandingAmount: Math.max(0, newOutstanding),
          lastPaymentDate: new Date(paymentData.date),
          lastPaymentAmount: paymentData.amount,
          status: newOutstanding <= 0 ? 'Paid' : 'Partial',
        },
        $push: { paymentHistory: paymentEntry },
      },
      { new: true }
    ).lean();

    // IMPORTANT: Update the finance purchase order's paidAmount if poId is provided
    if (paymentData.poId) {
      console.log('[PAYMENT] Updating PO paidAmount for PO:', paymentData.poId, 'Amount:', paymentData.amount);
      
      // Find the finance PO by id
      let financePO = await this.purchaseOrderModel.findOne({ id: String(paymentData.poId) }).lean();
      
      if (!financePO) {
        console.warn('[PAYMENT] Finance PO not found for ID:', paymentData.poId, '- Syncing from procurement...');
        
        // PO doesn't exist in finance - fetch from procurement and sync it
        try {
          // Get all POs from procurement for this vendor to find the matching one
          const allPOsForVendor = await this.purchaseOrderModel.find({ 
            vendorId: vid 
          }).lean();
          
          const matchingPO = allPOsForVendor.find(po => String(po.id) === String(paymentData.poId));
          
          if (matchingPO) {
            console.log('[PAYMENT] Found PO in procurement, creating in finance...');
            
            // Create the finance PO with all procurement data
            const newFinancePO = new this.purchaseOrderModel({
              id: String(paymentData.poId),
              vendorId: vid,
              vendorName: vendor.vendorName || matchingPO.vendorName || 'Unknown',
              items: matchingPO.items || '',
              totalAmount: Number(matchingPO.totalAmount || 0),
              paidAmount: paymentData.amount,  // Set the payment amount
              outstandingAmount: Number(matchingPO.totalAmount || 0) - paymentData.amount,
              status: matchingPO.status || 'Draft',
              orderedDate: matchingPO.orderedDate,
              expectedDate: matchingPO.expectedDate,
              deliveredDate: matchingPO.deliveredDate || null,
              relatedProjectId: matchingPO.relatedProjectId ? new Types.ObjectId(String(matchingPO.relatedProjectId)) : null,
              tenantId: tid,
              categoryId: matchingPO.categoryId ? new Types.ObjectId(String(matchingPO.categoryId)) : null,
              categoryName: matchingPO.categoryName || '',
              itemId: matchingPO.itemId || null,
              itemName: matchingPO.itemName || '',
              unit: matchingPO.unit || '',
              requiredQuantity: Number(matchingPO.requiredQuantity || 0),
              isActive: true,
              paymentHistory: [{
                date: new Date(paymentData.date),
                amount: paymentData.amount,
                notes: paymentData.notes || 'Payment recorded',
                poNumber: paymentData.poNumber || String(paymentData.poId),
              }]
            });
            
            await newFinancePO.save();
            financePO = await this.purchaseOrderModel.findOne({ id: String(paymentData.poId) }).lean();
            console.log('[PAYMENT] Created finance PO with paidAmount:', paymentData.amount);
          } else {
            console.error('[PAYMENT] PO not found in procurement either for ID:', paymentData.poId);
          }
        } catch (createErr) {
          console.error('[PAYMENT] Failed to sync PO from procurement:', createErr);
        }
      }
      
      // Now update the existing finance PO
      if (financePO) {
        const currentPOPaid = financePO.paidAmount || 0;
        const newPOPaid = currentPOPaid + paymentData.amount;
        const newPOOutstanding = (financePO.totalAmount || 0) - newPOPaid;
        
        // Add payment entry to PO's payment history
        const poPaymentEntry = {
          date: new Date(paymentData.date),
          amount: paymentData.amount,
          notes: paymentData.notes || '',
          poNumber: paymentData.poNumber || String(paymentData.poId),
        };

        await this.purchaseOrderModel.updateOne(
          { id: String(paymentData.poId) },
          {
            $set: {
              paidAmount: newPOPaid,
              outstandingAmount: newPOOutstanding,
            },
            $push: {
              paymentHistory: poPaymentEntry,
            }
          }
        );
        
        console.log('[PAYMENT] Successfully updated PO paidAmount to:', newPOPaid);
      }
    }

    return updated as FinanceVendor;
  }

  async syncVendorFromProcurement(tenantId: string, procurementVendor: any, purchaseOrders: any[]): Promise<FinanceVendor> {
    const vendorId = procurementVendor._id || procurementVendor.id;
    if (!vendorId) {
      throw new NotFoundException('Invalid procurement vendor data');
    }

    console.log('[FINANCE SYNC] Starting sync for vendor:', vendorId);
    console.log('[FINANCE SYNC] Number of POs to sync:', purchaseOrders.length);

    // Calculate totals from purchase orders
    const totalPayable = purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);
    const totalPaid = purchaseOrders.reduce((sum, po) => sum + Number(po.paidAmount || 0), 0);

    console.log('[FINANCE SYNC] Total Payable:', totalPayable, 'Total Paid:', totalPaid);

    // Sync each purchase order to finance_purchase_orders collection
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const po of purchaseOrders) {
      const poId = po.id || po._id;
      if (!poId) {
        console.log('[FINANCE SYNC] Skipping PO - no ID found');
        continue;
      }

      console.log('[FINANCE SYNC] Processing PO:', poId);
      
      const existingFinancePO = await this.purchaseOrderModel.findOne({ id: String(poId) }).lean();
      
      const paidAmount = Number(po.paidAmount || 0);
      const outstandingAmount = Number(po.totalAmount || 0) - paidAmount;

      if (existingFinancePO) {
        console.log('[FINANCE SYNC] Updating existing PO:', poId);
        updatedCount++;
        // Update existing finance PO
        await this.purchaseOrderModel.updateOne(
          { id: String(poId) },
          {
            $set: {
              vendorId: new Types.ObjectId(vendorId),
              vendorName: procurementVendor.name || procurementVendor.vendorName || 'Unknown',
              items: po.items || '',
              totalAmount: Number(po.totalAmount || 0),
              paidAmount: paidAmount,
              outstandingAmount: outstandingAmount,
              status: po.status || 'Draft',
              orderedDate: po.orderedDate,
              expectedDate: po.expectedDate,
              deliveredDate: po.deliveredDate || null,
              relatedProjectId: po.relatedProjectId ? new Types.ObjectId(po.relatedProjectId) : null,
              categoryId: po.categoryId ? new Types.ObjectId(po.categoryId) : null,
              categoryName: po.categoryName || '',
              itemId: po.itemId || null,
              itemName: po.itemName || '',
              unit: po.unit || '',
              requiredQuantity: Number(po.requiredQuantity || 0),
              paymentHistory: (po.paymentHistory || []).map((p: any) => ({
                date: new Date(p.date),
                amount: Number(p.amount),
                notes: p.notes || '',
                poNumber: po.id || '',
              })),
            }
          }
        );
      } else {
        console.log('[FINANCE SYNC] Creating new PO:', poId);
        createdCount++;
        // Create new finance PO
        const newFinancePO = new this.purchaseOrderModel({
          id: String(poId),
          vendorId: new Types.ObjectId(vendorId),
          vendorName: procurementVendor.name || procurementVendor.vendorName || 'Unknown',
          items: po.items || '',
          totalAmount: Number(po.totalAmount || 0),
          paidAmount: paidAmount,
          outstandingAmount: outstandingAmount,
          status: po.status || 'Draft',
          orderedDate: po.orderedDate,
          expectedDate: po.expectedDate,
          deliveredDate: po.deliveredDate || null,
          relatedProjectId: po.relatedProjectId ? new Types.ObjectId(po.relatedProjectId) : null,
          tenantId: this.toObjectId(tenantId),
          categoryId: po.categoryId ? new Types.ObjectId(po.categoryId) : null,
          categoryName: po.categoryName || '',
          itemId: po.itemId || null,
          itemName: po.itemName || '',
          unit: po.unit || '',
          requiredQuantity: Number(po.requiredQuantity || 0),
          isActive: true,
          paymentHistory: (po.paymentHistory || []).map((p: any) => ({
            date: new Date(p.date),
            amount: Number(p.amount),
            notes: p.notes || '',
            poNumber: po.id || '',
          })),
        });
        await newFinancePO.save();
        console.log('[FINANCE SYNC] Successfully saved PO:', poId);
      }
    }

    console.log('[FINANCE SYNC] Complete - Created:', createdCount, 'Updated:', updatedCount);

    // Get existing vendor to preserve totalPaid from financeVendors (if any)
    const tid = this.toObjectId(tenantId);
    const vid = this.toObjectId(vendorId);
    const query: any = { vendorId: vid };
    if (tid) {
      query.tenantId = tid;
    }
    const existingVendor = await this.financeVendorModel.findOne(query);
    
    // If vendor exists, preserve its totalPaid (payments recorded via adjust amount)
    // Otherwise use the PO-based calculation
    const finalTotalPaid = existingVendor ? (existingVendor.totalPaid || 0) : totalPaid;

    return this.createOrUpdateVendor(tenantId, {
      vendorId: String(vendorId),
      vendorName: procurementVendor.name || procurementVendor.vendorName || 'Unknown',
      vendorCode: procurementVendor.id || procurementVendor.vendorCode || procurementVendor.code || `V-${String(vendorId).slice(-4)}`,
      totalPayable,
      totalPaid: finalTotalPaid,
      totalPurchaseOrders: purchaseOrders.length,
    });
  }

  async deleteVendor(tenantId: string, vendorId: string): Promise<void> {
    const tid = this.toObjectId(tenantId);
    const vid = this.toObjectId(vendorId);
    if (!vid) {
      throw new NotFoundException('Invalid vendor ID');
    }

    const query: any = { vendorId: vid };
    if (tid) {
      query.tenantId = tid;
    }

    const result = await this.financeVendorModel.findOneAndUpdate(
      query,
      { $set: { isDeleted: true } }
    );

    if (!result) {
      throw new NotFoundException('Finance vendor not found');
    }
  }

  // ==================== FINANCE PURCHASE ORDERS ====================

  async findAllPurchaseOrders(tenantId: string): Promise<any[]> {
    const tid = this.toObjectId(tenantId);
    const query: any = { isActive: true };
    
    if (tid) {
      // Include POs with matching tenantId OR POs without tenantId
      query.$or = [{ tenantId: tid }, { tenantId: { $exists: false } }, { tenantId: null }];
    }
    
    const purchaseOrders = await this.purchaseOrderModel.find(query).sort({ createdAt: -1 }).lean();
    
    // Transform data to include paid amount and outstanding
    return purchaseOrders.map(po => ({
      ...po,
      paidAmount: po.paidAmount || 0,
      outstandingAmount: (po.totalAmount || 0) - (po.paidAmount || 0),
      paymentHistory: po.paymentHistory || [],
    }));
  }

  async findPurchaseOrderByPoId(tenantId: string, poId: string): Promise<any | null> {
    const tid = this.toObjectId(tenantId);
    const query: any = { id: poId, isActive: true };
    
    if (tid) {
      query.tenantId = tid;
    }
    
    const po = await this.purchaseOrderModel.findOne(query).lean();
    
    if (!po) {
      return null;
    }
    
    return {
      ...po,
      paidAmount: po.paidAmount || 0,
      outstandingAmount: (po.totalAmount || 0) - (po.paidAmount || 0),
      paymentHistory: po.paymentHistory || [],
    };
  }

  async findPurchaseOrdersByVendorId(tenantId: string, vendorId: string): Promise<any[]> {
    const tid = this.toObjectId(tenantId);
    const vid = this.toObjectId(vendorId);
    
    if (!vid) {
      return [];
    }
    
    const query: any = { vendorId: vid, isActive: true };
    
    if (tid) {
      query.$or = [{ tenantId: tid }, { tenantId: { $exists: false } }, { tenantId: null }];
    }
    
    const purchaseOrders = await this.purchaseOrderModel.find(query).sort({ createdAt: -1 }).lean();
    
    return purchaseOrders.map(po => ({
      ...po,
      paidAmount: po.paidAmount || 0,
      outstandingAmount: (po.totalAmount || 0) - (po.paidAmount || 0),
      paymentHistory: po.paymentHistory || [],
    }));
  }
}

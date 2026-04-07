// Test script to verify finance PO sync
const mongoose = require('mongoose');

async function testSync() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/solar-epc');
    console.log('Connected to MongoDB');

    const FinancePurchaseOrder = mongoose.model('FinancePurchaseOrder', new mongoose.Schema({
      id: String,
      vendorId: mongoose.Schema.Types.ObjectId,
      vendorName: String,
      totalAmount: Number,
      paidAmount: Number,
      outstandingAmount: Number,
      status: String,
      isActive: Boolean,
    }, { collection: 'finance_purchase_orders' }));

    const PurchaseOrder = mongoose.model('PurchaseOrder', new mongoose.Schema({
      id: String,
      vendorId: mongoose.Schema.Types.ObjectId,
      vendorName: String,
      totalAmount: Number,
      status: String,
      isActive: Boolean,
    }, { collection: 'purchase_orders' }));

    // Count documents in both collections
    const poCount = await PurchaseOrder.countDocuments();
    const financePOCount = await FinancePurchaseOrder.countDocuments();

    console.log('\n=== COLLECTION COUNTS ===');
    console.log('purchase_orders:', poCount);
    console.log('finance_purchase_orders:', financePOCount);

    if (poCount > 0) {
      console.log('\n=== SAMPLE PURCHASE ORDERS ===');
      const samplePOs = await PurchaseOrder.find().limit(5);
      samplePOs.forEach(po => {
        console.log(`- PO ID: ${po.id}, Vendor: ${po.vendorName}, Amount: ${po.totalAmount}`);
      });
    }

    if (financePOCount > 0) {
      console.log('\n=== SAMPLE FINANCE POs ===');
      const sampleFinancePOs = await FinancePurchaseOrder.find().limit(5);
      sampleFinancePOs.forEach(po => {
        console.log(`- PO ID: ${po.id}, Vendor: ${po.vendorName}, Paid: ${po.paidAmount}, Outstanding: ${po.outstandingAmount}`);
      });
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSync();

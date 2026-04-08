/**
 * Migration Script: Fix paidAmount field in finance_purchase_orders collection
 * 
 * This script migrates any existing data from the incorrect 'amountPaid' field
 * to the correct 'paidAmount' field in the finance_purchase_orders collection.
 * 
 * Usage:
 *   npm run migrate-fix-paid-amount
 *   
 * Or directly with Node.js:
 *   node fix-po-paid-amount-field.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/solar-epc';

async function migratePaidAmountField() {
  let conn;
  try {
    console.log('🔌 Connecting to MongoDB...');
    conn = await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection;
    const collection = db.collection('finance_purchase_orders');

    // Check if collection exists
    const collections = await db.listCollections({ name: 'finance_purchase_orders' }).toArray();
    if (collections.length === 0) {
      console.log('⚠️  Collection "finance_purchase_orders" does not exist. Skipping migration.');
      return;
    }

    // Count documents with amountPaid field
    const countWithAmountPaid = await collection.countDocuments({ amountPaid: { $exists: true } });
    console.log(`\n📊 Found ${countWithAmountPaid} documents with 'amountPaid' field`);

    if (countWithAmountPaid === 0) {
      console.log('✅ No migration needed - all documents use correct field name');
      return;
    }

    // Show sample documents that need migration
    console.log('\n📋 Sample documents to migrate:');
    const samples = await collection.find({ amountPaid: { $exists: true } }).limit(3).toArray();
    samples.forEach(doc => {
      console.log(`   - PO ID: ${doc.id}, amountPaid: ${doc.amountPaid}, paidAmount: ${doc.paidAmount || 'N/A'}`);
    });

    // Perform migration
    console.log('\n🔄 Starting migration...');
    
    // Update all documents: copy amountPaid to paidAmount, then remove amountPaid
    const updateResult = await collection.updateMany(
      { amountPaid: { $exists: true } },
      [
        {
          $set: {
            paidAmount: {
              $cond: [
                { $gt: ['$amountPaid', 0] },
                '$amountPaid',
                { $ifNull: ['$paidAmount', 0] }
              ]
            }
          }
        },
        {
          $unset: '$amountPaid'
        }
      ]
    );

    console.log(`✅ Migration complete! Updated ${updateResult.modifiedCount} documents`);

    // Verify migration
    const countWithPaidAmount = await collection.countDocuments({ paidAmount: { $exists: true } });
    const stillHasAmountPaid = await collection.countDocuments({ amountPaid: { $exists: true } });
    
    console.log('\n📊 Verification:');
    console.log(`   - Documents with paidAmount: ${countWithPaidAmount}`);
    console.log(`   - Documents still with amountPaid: ${stillHasAmountPaid}`);

    // Show migrated samples
    console.log('\n📋 Sample documents after migration:');
    const migratedSamples = await collection.find({}).limit(3).toArray();
    migratedSamples.forEach(doc => {
      console.log(`   - PO ID: ${doc.id}, paidAmount: ${doc.paidAmount || 0}`);
    });

    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (conn) {
      await mongoose.disconnect();
      console.log('👋 Disconnected from MongoDB');
    }
  }
}

// Run migration
if (require.main === module) {
  migratePaidAmountField()
    .then(() => {
      console.log('\n✅ Script finished');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Script failed:', err);
      process.exit(1);
    });
}

module.exports = { migratePaidAmountField };

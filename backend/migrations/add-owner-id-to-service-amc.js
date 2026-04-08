/**
 * Migration script to add ownerId to existing Service & AMC records
 * Assigns ownerId from createdBy field or sets a default system user
 */

const { MongoClient, ObjectId } = require('mongodb');

async function migrate() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/solar-epc';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();

    // Collections to migrate
    const collections = [
      'tickets',           // service_tickets
      'visits',            // service_visits
      'amccontracts',      // amc_contracts
    ];

    for (const collectionName of collections) {
      console.log(`\nMigrating collection: ${collectionName}`);
      const collection = db.collection(collectionName);

      // Find records without ownerId
      const recordsWithoutOwner = await collection.find({
        $or: [
          { ownerId: { $exists: false } },
          { ownerId: null }
        ]
      }).toArray();

      console.log(`Found ${recordsWithoutOwner.length} records without ownerId`);

      let updated = 0;
      let skipped = 0;

      for (const record of recordsWithoutOwner) {
        let ownerId = null;

        // Try to get ownerId from createdBy
        if (record.createdBy) {
          ownerId = record.createdBy;
        }
        // Try to get ownerId from created_by (snake_case)
        else if (record.created_by) {
          ownerId = record.created_by;
        }
        // Try to get ownerId from userId
        else if (record.userId) {
          ownerId = record.userId;
        }
        // Try to get ownerId from user_id
        else if (record.user_id) {
          ownerId = record.user_id;
        }

        if (ownerId) {
          // Convert string to ObjectId if needed
          let ownerIdValue = ownerId;
          if (typeof ownerId === 'string' && ObjectId.isValid(ownerId)) {
            ownerIdValue = new ObjectId(ownerId);
          }

          await collection.updateOne(
            { _id: record._id },
            { $set: { ownerId: ownerIdValue } }
          );
          updated++;
        } else {
          // Skip records where we can't determine owner
          // These will need manual assignment
          console.log(`  Skipped record ${record._id}: No owner information found`);
          skipped++;
        }
      }

      console.log(`  Updated: ${updated}, Skipped: ${skipped}`);
    }

    console.log('\nMigration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
migrate();

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function fix() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db();
  
  const adminUser = await db.collection('users').findOne({ email: 'superadmin@solarios.com' });
  const TENANT_ID = adminUser.tenantId;

  const invoices = await db.collection('invoices').find({ tenantId: TENANT_ID }).toArray();
  
  for (let inv of invoices) {
    const amount = inv.amount || 50000;
    // ensure status is one of the schema ones
    const status = inv.status === 'Sent' ? 'Pending' : (inv.status === 'Cancelled' ? 'Overdue' : inv.status);
    
    let paid = 0;
    if (status === 'Paid') paid = amount;
    else if (status === 'Partial') paid = amount * 0.5;
    else paid = 0;
    
    const balance = amount - paid;
    
    await db.collection('invoices').updateOne(
      { _id: inv._id },
      { $set: { 
          paid: paid, 
          balance: balance,
          status: status,
          invoiceDate: inv.issuedDate || new Date(),
          dueDate: inv.dueDate || new Date(Date.now() + 30*24*60*60*1000)
        } 
      }
    );
  }
  
  console.log('Fixed ' + invoices.length + ' invoices!');
  await client.close();
}
fix().catch(console.error);

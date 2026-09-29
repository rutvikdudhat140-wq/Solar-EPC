const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/solar');
  await client.connect();
  const db = client.db('solar');
  const user = await db.collection('users').findOne({ email: 'superadmin@solarios.com' });
  if (user) {
    console.log(`TENANT_ID=${user.tenantId}`);
    console.log(`USER_ID=${user._id}`);
  } else {
    console.log('User not found');
  }
  await client.close();
}
run();

const { MongoClient, ObjectId } = require('mongodb');

require("dotenv").config();
const MONGO_URI = process.env.MONGO_URI;

const generateId = (prefix, num) => `${prefix}${String(num).padStart(4, '0')}`;
const randomDate = (daysBack = 30) => new Date(Date.now() - Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000));
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function run() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db();

    // Dynamically fetch IDs
    const adminUser = await db.collection('users').findOne({ email: 'superadmin@solarios.com' });
    if (!adminUser) throw new Error('Superadmin not found in Atlas!');
    const TENANT_ID = adminUser.tenantId;
    const USER_ID = adminUser._id;

    const employees = await db.collection('employees').find({ tenantId: TENANT_ID }).toArray();
    if (employees.length === 0) {
      console.log('No employees found, please run insert-dummy-data.js first.');
      return;
    }

    // 1. Tasks
    await db.collection('tasks').deleteMany({ tenantId: TENANT_ID });
    const tasks = [];
    for (let i = 1; i <= 20; i++) {
      tasks.push({
        title: `Task ${i} - ${randomElement(['Site Visit', 'Follow up', 'Document Collection', 'Maintenance'])}`,
        description: `Description for task ${i}`,
        assignedTo: employees[i % employees.length].firstName,
        assignedToUserId: employees[i % employees.length]._id,
        createdBy: USER_ID,
        tenantId: TENANT_ID,
        status: randomElement(['pending', 'in-progress', 'completed']),
        dueDate: randomDate(30),
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    await db.collection('tasks').insertMany(tasks);
    console.log(`Inserted 20 Tasks`);

    // 2. AMC Contracts
    await db.collection('amccontracts').deleteMany({ tenantId: TENANT_ID });
    const amc = [];
    for (let i = 1; i <= 20; i++) {
      amc.push({
        contractId: generateId('AMC', i),
        customer: `Customer ${i}`,
        employee: employees[i % employees.length].firstName,
        site: `Site ${i} Location`,
        systemSize: randomNumber(5, 100),
        startDate: randomDate(100).toISOString(),
        endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
        status: randomElement(['Active', 'Expired', 'Pending']),
        nextVisit: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        amount: randomNumber(5000, 50000),
        tenantId: TENANT_ID,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    await db.collection('amccontracts').insertMany(amc);
    console.log(`Inserted 20 AMC Contracts`);

    // 3. Tickets
    await db.collection('tickets').deleteMany({ tenantId: TENANT_ID });
    const tickets = [];
    for (let i = 1; i <= 20; i++) {
      tickets.push({
        ticketId: generateId('TKT', i),
        customerId: `CUST${i}`,
        customerName: `Customer ${i}`,
        type: randomElement(['Inverter Issue', 'Panel Cleaning', 'Wiring Issue', 'General Maintenance']),
        description: `Issue description ${i}`,
        priority: randomElement(['Low', 'Medium', 'High', 'Critical']),
        status: randomElement(['Open', 'In Progress', 'Resolved', 'Closed']),
        assignedTo: USER_ID,
        createdBy: USER_ID,
        created: randomDate(15),
        resolved: null,
        tenantId: TENANT_ID,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    await db.collection('tickets').insertMany(tickets);
    console.log(`Inserted 20 Tickets`);

    // 4. Payrolls
    await db.collection('hrmPayrolls').deleteMany({ tenantId: TENANT_ID });
    const payrolls = [];
    for (let i = 1; i <= 20; i++) {
      const baseSalary = randomNumber(20000, 100000);
      payrolls.push({
        tenantId: TENANT_ID,
        isDeleted: false,
        employeeId: employees[i % employees.length]._id,
        month: randomNumber(1, 12),
        year: 2026,
        baseSalary: baseSalary,
        allowances: randomNumber(1000, 5000),
        deductions: randomNumber(500, 2000),
        bonus: randomNumber(0, 5000),
        netSalary: baseSalary,
        generatedAt: new Date(),
        isPaid: true,
        paidAt: new Date(),
        paymentReference: `REF${i}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    await db.collection('hrmPayrolls').insertMany(payrolls);
    console.log(`Inserted 20 Payrolls`);

    // 5. Increments
    await db.collection('hrmSalaryIncrements').deleteMany({ tenantId: TENANT_ID });
    const increments = [];
    for (let i = 1; i <= 20; i++) {
      const prev = randomNumber(20000, 80000);
      increments.push({
        tenantId: TENANT_ID,
        isDeleted: false,
        employeeId: employees[i % employees.length]._id,
        previousSalary: prev,
        newSalary: prev * 1.1,
        incrementAmount: prev * 0.1,
        incrementPercentage: 10,
        effectiveFrom: new Date(),
        reason: 'Annual Review',
        approvedBy: USER_ID,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    await db.collection('hrmSalaryIncrements').insertMany(increments);
    console.log(`Inserted 20 Increments`);

    console.log('Done generating extra data!');
  } finally {
    await client.close();
  }
}
run().catch(console.error);

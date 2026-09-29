const { MongoClient, ObjectId } = require('mongodb');

// MongoDB Connection
require("dotenv").config();
const MONGO_URI = process.env.MONGO_URI;

// Helper functions
const generateId = (prefix, num) => `${prefix}${String(num).padStart(4, '0')}`;
const randomDate = (daysBack = 30) => new Date(Date.now() - Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000));
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Data Arrays
const firstNames = ['Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anita', 'Suresh', 'Deepa', 'Ravi', 'Kavita'];
const lastNames = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Mehta', 'Shah', 'Desai', 'Joshi', 'Rao'];
const cities = ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Junagadh'];
const states = ['Gujarat', 'Maharashtra', 'Rajasthan', 'Madhya Pradesh'];
const sources = ['Website', 'Referral', 'Facebook', 'Google Ads', 'Exhibition', 'Cold Call', 'Walk-in'];
const roofTypes = ['RCC', 'Tin Shed', 'Asbestos', 'Flat', 'Sloped'];
const categories = ['Residential', 'Commercial', 'Industrial'];
const itemCategories = ['Panel', 'Inverter', 'BOS', 'Structure', 'Cable', 'Other'];
const units = ['Nos', 'Mtr', 'Kg', 'Set', 'Pairs', 'Box'];
const departments = ['Sales', 'Engineering', 'Installation', 'Finance', 'HR', 'Logistics', 'Procurement'];
const designations = ['Manager', 'Engineer', 'Technician', 'Executive', 'Supervisor', 'Coordinator'];

async function insertDummyData() {
  const client = new MongoClient(MONGO_URI);
  
  // Define departments early for cleanup usage
  const departments = ['Sales', 'Engineering', 'Installation', 'Finance', 'HR', 'Logistics', 'Procurement'];
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('solar');
    
    // Dynamically fetch IDs
    const adminUser = await db.collection('users').findOne({ email: 'superadmin@solarios.com' });
    if (!adminUser) throw new Error('Superadmin not found in Atlas!');
    const TENANT_ID = adminUser.tenantId;
    const USER_ID = adminUser._id;

    // Clear existing dummy data for this tenant
    console.log('Clearing existing dummy data...');
    await db.collection('leads').deleteMany({ tenantId: TENANT_ID });
    await db.collection('items').deleteMany({ tenantId: TENANT_ID.toString() });
    await db.collection('inventories').deleteMany({ tenantId: TENANT_ID });
    await db.collection('projects').deleteMany({ tenantId: TENANT_ID });
    await db.collection('quotations').deleteMany({ tenantId: TENANT_ID.toString() });
    await db.collection('installations').deleteMany({ tenantId: TENANT_ID });
    await db.collection('commissionings').deleteMany({ tenantId: TENANT_ID });
    await db.collection('purchase_orders').deleteMany({ tenantId: TENANT_ID });
    await db.collection('dispatches').deleteMany({ tenantId: TENANT_ID });
    await db.collection('employees').deleteMany({ tenantId: TENANT_ID });
    await db.collection('invoices').deleteMany({ tenantId: TENANT_ID });
    await db.collection('expenses').deleteMany({ tenantId: TENANT_ID });
    await db.collection('attendances').deleteMany({ tenantId: TENANT_ID });
    await db.collection('leaves').deleteMany({ tenantId: TENANT_ID });
    await db.collection('documents').deleteMany({ tenantId: TENANT_ID });
    await db.collection('logisticsvendors').deleteMany({ tenantId: TENANT_ID });
    await db.collection('procurementvendors').deleteMany({ tenantId: TENANT_ID });
    await db.collection('subsidies').deleteMany({ tenantId: TENANT_ID });
    await db.collection('netmeterings').deleteMany({ tenantId: TENANT_ID });
    await db.collection('lead_statuses').deleteMany({ tenantId: TENANT_ID });
    await db.collection('departments').deleteMany({ $or: [{ tenantId: TENANT_ID }, { name: { $in: departments.map(d => new RegExp('^' + d)) } }] });
    console.log('Existing data cleared');

    // 0. CRM SETTINGS - LEAD STATUSES
    console.log('Inserting CRM Lead Statuses...');
    const leadStatuses = [
      { key: 'new', label: 'New Lead', color: '#3b82f6', type: 'start', order: 0, isSystem: true },
      { key: 'contacted', label: 'Contacted', color: '#8b5cf6', type: 'normal', order: 1, isSystem: true },
      { key: 'qualified', label: 'Qualified', color: '#06b6d4', type: 'normal', order: 2, isSystem: true },
      { key: 'sitesurvey', label: 'Site Survey', color: '#14b8a6', type: 'normal', order: 3, isSystem: true },
      { key: 'proposal', label: 'Proposal Sent', color: '#f59e0b', type: 'normal', order: 4, isSystem: true },
      { key: 'negotiation', label: 'Negotiation', color: '#eab308', type: 'normal', order: 5, isSystem: true },
      { key: 'won', label: 'Won', color: '#22c55e', type: 'success', order: 6, isSystem: true },
      { key: 'lost', label: 'Lost', color: '#ef4444', type: 'failure', order: 7, isSystem: true },
      { key: 'follow_up', label: 'Follow Up', color: '#ec4899', type: 'normal', order: 8, isSystem: false },
      { key: 'site_visit', label: 'Site Visit', color: '#14b8a6', type: 'normal', order: 9, isSystem: false },
      { key: 'estimate', label: 'Estimate', color: '#f97316', type: 'normal', order: 10, isSystem: false }
    ];
    
    const leadStatusDocs = leadStatuses.map((status, idx) => ({
      tenantId: TENANT_ID,
      module: 'crm',
      entity: 'lead',
      key: status.key,
      label: status.label,
      color: status.color,
      order: status.order,
      type: status.type,
      isActive: true,
      isSystem: status.isSystem,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    await db.collection('lead_statuses').insertMany(leadStatusDocs);
    console.log(`Inserted ${leadStatusDocs.length} Lead Statuses`);

    // 1. INSERT LEADS (1000 records)
    console.log('Inserting Leads...');
    const leads = [];
    for (let i = 1; i <= 20; i++) {
      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);
      leads.push({
        leadId: generateId('LD', i),
        name: `${firstName} ${lastName}`,
        company: `${firstName} Solar Solutions`,
        phone: `+91${randomNumber(7000000000, 9999999999)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@gmail.com`,
        source: randomElement(sources),
        statusKey: i % 2 === 0 ? 'sitesurvey' : randomElement(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
        score: randomNumber(10, 100),
        assignedTo: USER_ID,
        assignedBy: USER_ID,
        kw: randomNumber(5, 500),
        value: randomNumber(50000, 5000000),
        age: randomNumber(25, 65),
        city: randomElement(cities),
        state: randomElement(states),
        created: randomDate(60),
        createdBy: USER_ID,
        lastContact: randomDate(10),
        monthlyBill: randomNumber(2000, 50000),
        roofArea: randomNumber(500, 5000),
        roofType: randomElement(roofTypes),
        budget: randomNumber(100000, 10000000),
        category: randomElement(categories),
        tags: ['solar', 'interested', randomElement(['hot', 'warm', 'cold'])],
        lat: randomNumber(2100, 2400) / 100,
        lng: randomNumber(7200, 7400) / 100,
        activities: [
          { type: 'call', ts: new Date().toISOString(), note: 'Initial contact made', by: 'Admin', timestamp: randomDate(10) },
          { type: 'email', ts: new Date().toISOString(), note: 'Proposal sent', by: 'Admin', timestamp: randomDate(5) }
        ],
        leadStages: [
          { stage: 'Lead Captured', completed: true, completedAt: randomDate(20), createdAt: randomDate(25) },
          { stage: 'Site Survey', completed: Math.random() > 0.5, completedAt: Math.random() > 0.5 ? randomDate(10) : null, createdAt: randomDate(20) }
        ],
        nextFollowUp: new Date(Date.now() + randomNumber(1, 7) * 24 * 60 * 60 * 1000).toISOString(),
        slaHours: 24,
        slaBreached: Math.random() > 0.9,
        notes: `Lead ${i} - Interested in ${randomElement(['Rooftop Solar', 'Ground Mount', 'Water Pump'])}`,
        customFields: { sourceDetails: 'Online campaign', priority: randomElement(['High', 'Medium', 'Low']) },
        activeAutomation: [],
        tenantId: TENANT_ID,
        isDeleted: false,
        createdAt: randomDate(60),
        updatedAt: new Date()
      });
    }
    await db.collection('leads').insertMany(leads);
    console.log(`Inserted ${leads.length} Leads`);

    // 1.5 INSERT SURVEYS for leads with 'sitesurvey' status
    console.log('Inserting Surveys for Site Survey leads...');
    const surveys = [];
    const siteSurveyLeads = leads.filter(l => l.statusKey === 'sitesurvey');
    
    for (let i = 0; i < siteSurveyLeads.length; i++) {
      const lead = siteSurveyLeads[i];
      surveys.push({
        surveyId: generateId('SUR', i + 1),
        customerName: lead.name,
        site: `${lead.city}, ${lead.state}`,
        engineer: randomElement(firstNames) + ' ' + randomElement(lastNames),
        scheduledDate: randomDate(15).toISOString().split('T')[0],
        estimatedKw: lead.kw || randomNumber(5, 500),
        status: randomElement(['Scheduled', 'In Progress', 'Completed']),
        shadowPct: randomNumber(0, 30),
        roofArea: lead.roofArea || randomNumber(500, 5000),
        sourceLeadId: lead.leadId,
        notes: `Survey for ${lead.name} - ${lead.kw}kW system`,
        tenantId: TENANT_ID,
        createdBy: USER_ID,
        assignedTo: USER_ID,
        isDeleted: false,
        createdAt: randomDate(30),
        updatedAt: new Date()
      });
    }
    
    if (surveys.length > 0) {
      await db.collection('surveys').insertMany(surveys);
      console.log(`Inserted ${surveys.length} Surveys for site survey leads`);
    } else {
      console.log('No site survey leads found to create surveys');
    }

    // 2. INSERT ITEMS (50 records)
    console.log('Inserting Items...');
    const items = [];
    const itemNames = [
      'Mono PERC 540W Solar Panel', 'Poly 330W Solar Panel', 'TopCon 580W Panel',
      'Growatt 5kW Inverter', 'Sungrow 10kW Inverter', 'Solax 3kW Inverter',
      'DC Cable 4sqmm', 'AC Cable 10sqmm', 'MC4 Connector',
      'Earthing Strip', 'Lightning Arrester', 'DC Junction Box',
      'Aluminium Structure 4m', 'GI Structure 3m', 'Clamp Set',
      'Surge Protection Device', 'DC Isolator', 'AC Isolator',
      'Cable Tie 300mm', 'Cable Tray 2m', 'Conduit Pipe 3m'
    ];
    
    for (let i = 1; i <= 20; i++) {
      const baseName = itemNames[i % itemNames.length];
      items.push({
        itemId: generateId('ITM', i),
        description: `${baseName} - Model ${String.fromCharCode(65 + (i % 26))}${randomNumber(100, 999)}`,
        longDescription: `High quality ${baseName} suitable for residential and commercial installations`,
        rate: randomNumber(500, 50000),
        tax1: 9,
        tax2: 9,
        unit: randomElement(units),
        category: randomElement(itemCategories),
        warehouse: randomElement(['Main Warehouse', 'Godown 1', 'Godown 2', 'Ahmedabad Store']),
        stock: randomNumber(0, 1000),
        minStock: randomNumber(10, 50),
        reserved: randomNumber(0, 50),
        poReference: generateId('PO', randomNumber(1, 100)),
        status: randomElement(['In Stock', 'Low Stock', 'Out of Stock']),
        itemGroupName: randomElement(['Solar Panels', 'Inverters', 'Cables', 'Mounting', 'Safety']),
        tenantId: TENANT_ID.toString(),
        isDeleted: false,
        createdAt: randomDate(90),
        updatedAt: new Date()
      });
    }
    await db.collection('items').insertMany(items);
    console.log(`Inserted ${items.length} Items`);

    // 3. INSERT INVENTORY (30 records)
    console.log('Inserting Inventory...');
    const inventories = [];
    for (let i = 1; i <= 20; i++) {
      const stock = randomNumber(0, 500);
      const reserved = randomNumber(0, Math.min(stock, 50));
      inventories.push({
        tenantId: TENANT_ID,
        isDeleted: false,
        itemId: generateId('INV', i),
        name: itemNames[i % itemNames.length],
        category: randomElement(itemCategories),
        unit: randomElement(units),
        stock: stock,
        reserved: reserved,
        available: stock - reserved,
        minStock: randomNumber(20, 100),
        rate: randomNumber(1000, 50000),
        warehouse: randomElement(['Main Warehouse', 'Godown 1', 'Godown 2']),
        lastUpdated: randomDate(30).toISOString(),
        status: stock > 50 ? 'In Stock' : stock > 10 ? 'Low Stock' : 'Out of Stock',
        assignedTo: USER_ID,
        createdBy: USER_ID,
        createdAt: randomDate(90),
        updatedAt: new Date()
      });
    }
    await db.collection('inventories').insertMany(inventories);
    console.log(`Inserted ${inventories.length} Inventory records`);

    // 4. INSERT PROJECTS (15 records)
    console.log('Inserting Projects...');
    const projects = [];
    const projectStatuses = ['Survey', 'Design', 'Quotation', 'Procurement', 'Installation', 'Commissioned', 'On Hold'];
    
    for (let i = 1; i <= 20; i++) {
      const customerName = `${randomElement(firstNames)} ${randomElement(lastNames)}`;
      const status = randomElement(projectStatuses);
      projects.push({
        projectId: generateId('PRJ', i),
        leadId: leads[i % leads.length]._id,
        customerName: customerName,
        email: `${customerName.replace(' ', '.').toLowerCase()}@gmail.com`,
        mobileNumber: `+91${randomNumber(7000000000, 9999999999)}`,
        site: `${randomElement(cities)}, ${randomElement(states)}`,
        systemSize: randomNumber(5, 500),
        status: status,
        pm: randomElement(firstNames) + ' ' + randomElement(lastNames),
        startDate: randomDate(90).toISOString().split('T')[0],
        estEndDate: new Date(Date.now() + randomNumber(30, 180) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress: randomNumber(0, 100),
        value: randomNumber(100000, 10000000),
        milestones: [
          { name: 'Site Survey', status: status === 'Survey' ? 'In Progress' : 'Done', date: randomDate(60).toISOString() },
          { name: 'Design Approval', status: ['Survey'].includes(status) ? 'Pending' : 'Done', date: randomDate(50).toISOString() },
          { name: 'Material Procurement', status: ['Survey', 'Design', 'Quotation'].includes(status) ? 'Pending' : 'Done', date: randomDate(40).toISOString() },
          { name: 'Installation', status: ['Survey', 'Design', 'Quotation', 'Procurement'].includes(status) ? 'Pending' : 'In Progress', date: randomDate(20).toISOString() },
          { name: 'Commissioning', status: status === 'Commissioned' ? 'Done' : 'Pending', date: null }
        ],
        materials: [
          { itemId: generateId('ITM', 1), itemName: 'Solar Panel 540W', quantity: randomNumber(10, 100), issuedDate: randomDate(30).toISOString(), remarks: 'Good condition' },
          { itemId: generateId('ITM', 2), itemName: 'Growatt Inverter', quantity: randomNumber(1, 10), issuedDate: randomDate(30).toISOString(), remarks: 'New' }
        ],
        tenantId: TENANT_ID,
        isDeleted: false,
        assignedTo: USER_ID,
        createdBy: USER_ID,
        items: [
          { itemId: generateId('ITM', 1), category: 'Panel', itemName: 'Mono PERC 540W', quantity: randomNumber(20, 200), unitPrice: 12000, totalPrice: randomNumber(240000, 2400000) },
          { itemId: generateId('ITM', 2), category: 'Inverter', itemName: 'Growatt 5kW', quantity: randomNumber(2, 20), unitPrice: 45000, totalPrice: randomNumber(90000, 900000) }
        ],
        tax: randomNumber(50000, 500000),
        discount: randomNumber(10000, 100000),
        notes: `Project ${i} - ${randomElement(['Residential Rooftop', 'Commercial Ground Mount', 'Industrial Shed'])}`,
        createdAt: randomDate(90),
        updatedAt: new Date()
      });
    }
    await db.collection('projects').insertMany(projects);
    console.log(`Inserted ${projects.length} Projects`);

    // 5. INSERT QUOTATIONS (20 records)
    console.log('Inserting Quotations...');
    const quotations = [];
    for (let i = 1; i <= 20; i++) {
      const panelCount = randomNumber(10, 200);
      const panelPrice = 12000;
      const inverterCount = Math.ceil(panelCount / 10);
      const inverterPrice = 45000;
      const materialTotal = (panelCount * panelPrice) + (inverterCount * inverterPrice);
      const installationCost = materialTotal * 0.15;
      const transportCost = randomNumber(5000, 50000);
      const tax = materialTotal * 0.18;
      const finalPrice = materialTotal + installationCost + transportCost + tax;
      
      quotations.push({
        quotationId: generateId('QTN', i),
        tenantId: TENANT_ID.toString(),
        customerId: leads[i % leads.length]._id.toString(),
        leadId: leads[i % leads.length].leadId,
        customerName: leads[i % leads.length].name,
        customerPhone: leads[i % leads.length].phone,
        customerEmail: leads[i % leads.length].email,
        customerAddress: `${randomElement(cities)}, ${randomElement(states)}`,
        systemConfig: {
          systemSize: panelCount * 0.54,
          panelCount: panelCount,
          inverterType: randomElement(['String Inverter', 'Micro Inverter', 'Hybrid Inverter']),
          batteryOption: randomElement(['With Battery', 'Without Battery']),
          mountingStructure: randomElement(['RCC Mounting', 'Tin Shed Mounting', 'Ground Mount'])
        },
        materials: [
          { itemId: generateId('ITM', 1), name: 'Mono PERC 540W Panel', unit: 'Nos', category: 'Panel', quantity: panelCount, unitPrice: panelPrice, totalPrice: panelCount * panelPrice },
          { itemId: generateId('ITM', 2), name: 'Growatt Inverter', unit: 'Nos', category: 'Inverter', quantity: inverterCount, unitPrice: inverterPrice, totalPrice: inverterCount * inverterPrice },
          { itemId: generateId('ITM', 3), name: 'DC Cable 4sqmm', unit: 'Mtr', category: 'Cable', quantity: panelCount * 10, unitPrice: 45, totalPrice: panelCount * 10 * 45 }
        ],
        materialTotal: materialTotal,
        installationCost: installationCost,
        transportCost: transportCost,
        gstPercentage: 18,
        tax: tax,
        finalQuotationPrice: finalPrice,
        status: randomElement(['Draft', 'Sent', 'Viewed', 'Approved', 'Rejected', 'ConvertedToProject']),
        notes: `Quotation ${i} for ${panelCount} kW system`,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: USER_ID.toString(),
        createdAt: randomDate(60),
        updatedAt: new Date()
      });
    }
    await db.collection('quotations').insertMany(quotations);
    console.log(`Inserted ${quotations.length} Quotations`);

    // 6. INSTALLATIONS (15 records)
    console.log('Inserting Installations...');
    const installations = [];
    for (let i = 1; i <= 20; i++) {
      const project = projects[i % projects.length];
      installations.push({
        installationId: generateId('INST', i),
        projectId: project._id,
        dispatchId: generateId('DSP', i),
        customerName: project.customerName,
        site: project.site,
        technicianId: USER_ID,
        technicianName: randomElement(firstNames) + ' ' + randomElement(lastNames),
        supervisorId: USER_ID,
        supervisorName: randomElement(firstNames) + ' ' + randomElement(lastNames),
        scheduledDate: randomDate(30),
        dueDate: new Date(Date.now() + randomNumber(7, 30) * 24 * 60 * 60 * 1000),
        delayDays: Math.random() > 0.8 ? randomNumber(1, 10) : 0,
        startTime: randomDate(10),
        endTime: Math.random() > 0.5 ? new Date() : null,
        status: randomElement(['Pending Assign', 'Pending', 'In Progress', 'Delayed', 'Completed']),
        progress: randomNumber(0, 100),
        tasks: [
          { name: 'Site Preparation', done: true, completedAt: randomDate(20), completedBy: USER_ID, photoRequired: true },
          { name: 'Structure Installation', done: Math.random() > 0.3, completedAt: Math.random() > 0.3 ? randomDate(15) : null, completedBy: Math.random() > 0.3 ? USER_ID : null, photoRequired: true },
          { name: 'Panel Mounting', done: Math.random() > 0.5, completedAt: Math.random() > 0.5 ? randomDate(10) : null, completedBy: Math.random() > 0.5 ? USER_ID : null, photoRequired: true },
          { name: 'Wiring & Connections', done: Math.random() > 0.7, completedAt: Math.random() > 0.7 ? randomDate(5) : null, completedBy: Math.random() > 0.7 ? USER_ID : null, photoRequired: true },
          { name: 'Testing & Commissioning', done: Math.random() > 0.9, completedAt: Math.random() > 0.9 ? randomDate(2) : null, completedBy: Math.random() > 0.9 ? USER_ID : null, photoRequired: true }
        ],
        photos: [],
        events: [
          { eventType: 'Installation Started', userId: USER_ID, timestamp: randomDate(20), metadata: { notes: 'Team dispatched' } },
          { eventType: 'Progress Update', userId: USER_ID, timestamp: randomDate(10), metadata: { progress: 50 } }
        ],
        notes: `Installation ${i} - ${randomElement(['Residential', 'Commercial', 'Industrial'])}`,
        siteObservations: randomElement(['Good site condition', 'Access issues', 'Weather delays', 'Customer cooperative']),
        materialsUsed: [
          { itemId: generateId('ITM', 1), itemName: 'Solar Panel 540W', quantity: randomNumber(10, 100), serialNumbers: [] },
          { itemId: generateId('ITM', 2), itemName: 'Growatt Inverter', quantity: randomNumber(1, 10), serialNumbers: [] }
        ],
        qualityCheckPassed: Math.random() > 0.2,
        qualityCheckNotes: 'All parameters within limits',
        customerSignOff: { signed: Math.random() > 0.7, signedAt: Math.random() > 0.7 ? new Date() : null, signatureUrl: null },
        delayedAt: Math.random() > 0.8 ? randomDate(5) : null,
        delayReason: Math.random() > 0.8 ? randomElement(['Weather', 'Material shortage', 'Customer not available']) : '',
        commissioningTriggered: Math.random() > 0.6,
        tenantId: TENANT_ID,
        isDeleted: false,
        assignedTo: USER_ID,
        createdBy: USER_ID,
        updatedBy: USER_ID,
        createdAt: randomDate(60),
        updatedAt: new Date()
      });
    }
    await db.collection('installations').insertMany(installations);
    console.log(`Inserted ${installations.length} Installations`);

    // 7. COMMISSIONING (10 records)
    console.log('Inserting Commissioning records...');
    const commissioningRecords = [];
    for (let i = 1; i <= 20; i++) {
      const installation = installations[i % installations.length];
      commissioningRecords.push({
        CommissioningId: generateId('COMM', i),
        installationId: installation.installationId,
        projectId: installation.projectId,
        projectIdString: typeof installation.projectId === 'string' ? installation.projectId : installation.projectId.toString(),
        dispatchId: installation.dispatchId,
        customerName: installation.customerName,
        site: installation.site,
        technicianId: USER_ID,
        technicianName: installation.technicianName,
        supervisorId: USER_ID,
        supervisorName: installation.supervisorName,
        scheduledDate: randomDate(15),
        dueDate: new Date(Date.now() + randomNumber(3, 15) * 24 * 60 * 60 * 1000),
        delayDays: 0,
        startTime: randomDate(5),
        endTime: Math.random() > 0.5 ? new Date() : null,
        status: randomElement(['Pending', 'In Progress', 'Completed']),
        progress: randomNumber(0, 100),
        tasks: [
          { name: 'Electrical Testing', done: true, completedAt: randomDate(10), completedBy: USER_ID, photoRequired: true },
          { name: 'Performance Check', done: Math.random() > 0.3, completedAt: Math.random() > 0.3 ? randomDate(5) : null, completedBy: Math.random() > 0.3 ? USER_ID : null, photoRequired: true },
          { name: 'System Handover', done: Math.random() > 0.7, completedAt: Math.random() > 0.7 ? randomDate(2) : null, completedBy: Math.random() > 0.7 ? USER_ID : null, photoRequired: false }
        ],
        photos: [],
        events: [
          { eventType: 'Commissioning Started', userId: USER_ID, timestamp: randomDate(10), metadata: {} }
        ],
        notes: `Commissioning ${i} - Final testing`,
        siteObservations: 'System performing as per design',
        materialsUsed: [],
        qualityCheckPassed: Math.random() > 0.3,
        qualityCheckNotes: 'All tests passed',
        customerSignOff: { signed: Math.random() > 0.5, signedAt: Math.random() > 0.5 ? new Date() : null, signatureUrl: null },
        delayedAt: null,
        delayReason: '',
        commissioningTriggered: true,
        tenantId: TENANT_ID,
        isDeleted: false,
        assignedTo: USER_ID,
        createdBy: USER_ID,
        updatedBy: USER_ID,
        createdAt: randomDate(30),
        updatedAt: new Date()
      });
    }
    await db.collection('commissionings').insertMany(commissioningRecords);
    console.log(`Inserted ${commissioningRecords.length} Commissioning records`);

    // 8. PURCHASE ORDERS (15 records)
    console.log('Inserting Purchase Orders...');
    const purchaseOrders = [];
    for (let i = 1; i <= 20; i++) {
      purchaseOrders.push({
        id: generateId('PO', i),
        vendorId: new ObjectId(),
        vendorName: randomElement(['Tata Solar', 'Adani Solar', 'Waaree', 'Vikram Solar', 'RenewSys']),
        items: `${randomNumber(10, 100)}x Solar Panels, ${randomNumber(5, 20)}x Inverters`,
        totalAmount: randomNumber(500000, 5000000),
        status: randomElement(['Draft', 'Ordered', 'In Transit', 'Delivered', 'Cancelled']),
        orderedDate: randomDate(60).toISOString().split('T')[0],
        expectedDate: new Date(Date.now() + randomNumber(7, 45) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        deliveredDate: Math.random() > 0.5 ? randomDate(5).toISOString().split('T')[0] : null,
        relatedProjectId: Math.random() > 0.3 ? projects[i % projects.length]._id : null,
        tenantId: TENANT_ID,
        isActive: true,
        categoryId: Math.random() > 0.5 ? new ObjectId() : null,
        categoryName: randomElement(['Panels', 'Inverters', 'Cables', 'Structures']),
        itemId: generateId('ITM', i),
        itemName: itemNames[i % itemNames.length],
        unit: 'Nos',
        requiredQuantity: randomNumber(10, 100),
        createdAt: randomDate(60),
        updatedAt: new Date()
      });
    }
    await db.collection('purchase_orders').insertMany(purchaseOrders);
    console.log(`Inserted ${purchaseOrders.length} Purchase Orders`);

    // 9. DISPATCHES (12 records)
    console.log('Inserting Dispatches...');
    const dispatches = [];
    for (let i = 1; i <= 20; i++) {
      dispatches.push({
        id: generateId('DSP', i),
        projectId: projects[i % projects.length].projectId,
        customer: projects[i % projects.length].customerName,
        items: `${randomNumber(10, 100)} Panels, ${randomNumber(2, 20)} Inverters`,
        from: 'Main Warehouse',
        to: projects[i % projects.length].site,
        status: randomElement(['Scheduled', 'In Transit', 'Delivered', 'Cancelled']),
        dispatchDate: randomDate(30).toISOString().split('T')[0],
        driver: randomElement(['Ramesh', 'Suresh', 'Mahesh', 'Dinesh']),
        vehicle: `GJ-${randomNumber(1, 20)}-${String.fromCharCode(65 + randomNumber(0, 25))}-${randomNumber(1000, 9999)}`,
        cost: randomNumber(2000, 50000),
        isActive: true,
        deliveredDate: Math.random() > 0.6 ? randomDate(5) : null,
        notes: `Dispatch ${i} - ${randomElement(['Urgent', 'Normal', 'Scheduled'])}`,
        tenantId: TENANT_ID,
        createdAt: randomDate(45),
        updatedAt: new Date()
      });
    }
    await db.collection('dispatches').insertMany(dispatches);
    console.log(`Inserted ${dispatches.length} Dispatches`);

    // 10. EMPLOYEES (20 records)
    console.log('Inserting Employees...');
    const employees = [];
    for (let i = 1; i <= 20; i++) {
      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);
      employees.push({
        _id: new ObjectId(),
        employeeId: generateId('EMP', i),
        firstName: firstName,
        lastName: lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@company.com`,
        password: '$2a$10$BQWyyadu2b8ln9v824MNiudu3lD8ddULLCjtXE5Rda/NgmSPFFtUa',
        phone: `+91${randomNumber(7000000000, 9999999999)}`,
        address: `${randomNumber(1, 500)}, ${randomElement(cities)}`,
        joiningDate: randomDate(365),
        department: randomElement(departments),
        roleId: randomElement(['Engineer', 'Manager', 'Technician', null]),
        designation: randomElement(designations),
        status: randomElement(['active', 'inactive', 'suspended']),
        tenantId: TENANT_ID,
        isDeleted: false,
        createdAt: randomDate(365),
        updatedAt: new Date()
      });
    }
    await db.collection('employees').insertMany(employees);
    console.log(`Inserted ${employees.length} Employees`);

    // 11. FINANCE - INVOICES (15 records)
    console.log('Inserting Invoices...');
    const invoices = [];
    for (let i = 1; i <= 20; i++) {
      const amount = randomNumber(100000, 5000000);
      invoices.push({
        invoiceNumber: generateId('INV', i),
        projectId: projects[i % projects.length]._id,
        customerName: projects[i % projects.length].customerName,
        customerEmail: projects[i % projects.length].email,
        customerPhone: projects[i % projects.length].mobileNumber,
        amount: amount,
        taxAmount: amount * 0.18,
        totalAmount: amount * 1.18,
        paidAmount: Math.random() > 0.5 ? amount * 1.18 : Math.random() * amount * 1.18,
        status: randomElement(['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled']),
        dueDate: new Date(Date.now() + randomNumber(15, 90) * 24 * 60 * 60 * 1000),
        issuedDate: randomDate(30),
        paidDate: Math.random() > 0.5 ? randomDate(5) : null,
        description: `Invoice for ${projects[i % projects.length].projectId}`,
        notes: 'GST 18% applicable',
        tenantId: TENANT_ID,
        isDeleted: false,
        createdBy: USER_ID,
        createdAt: randomDate(60),
        updatedAt: new Date()
      });
    }
    await db.collection('invoices').insertMany(invoices);
    console.log(`Inserted ${invoices.length} Invoices`);

    // 12. FINANCE - EXPENSES (20 records)
    console.log('Inserting Expenses...');
    const expenses = [];
    const expenseCategories = ['Materials', 'Transport', 'Labor', 'Office', 'Utilities', 'Marketing', 'Maintenance'];
    for (let i = 1; i <= 20; i++) {
      expenses.push({
        expenseNumber: generateId('EXP', i),
        category: randomElement(expenseCategories),
        amount: randomNumber(5000, 500000),
        description: `Expense for ${randomElement(expenseCategories)}`,
        vendor: randomElement(['Tata', 'Adani', 'Local Vendor', 'Service Provider']),
        projectId: Math.random() > 0.5 ? projects[i % projects.length]._id : null,
        receiptUrl: null,
        status: randomElement(['Pending', 'Approved', 'Rejected', 'Reimbursed']),
        expenseDate: randomDate(60),
        approvedBy: Math.random() > 0.5 ? USER_ID : null,
        approvedAt: Math.random() > 0.5 ? randomDate(5) : null,
        tenantId: TENANT_ID,
        isDeleted: false,
        createdBy: USER_ID,
        createdAt: randomDate(90),
        updatedAt: new Date()
      });
    }
    await db.collection('expenses').insertMany(expenses);
    console.log(`Inserted ${expenses.length} Expenses`);

    // 13. HRM - ATTENDANCE (30 records)
    console.log('Inserting Attendance...');
    const attendances = [];
    for (let i = 1; i <= 20; i++) {
      attendances.push({
        employeeId: employees[i % employees.length]._id,
        date: i <= 10 ? new Date() : randomDate(30),
        status: i <= 8 ? 'Present' : randomElement(['Present', 'Absent', 'Half Day', 'Leave', 'WFH']),
        checkIn: `${randomNumber(8, 10)}:${randomNumber(0, 59)}:00`,
        checkOut: `${randomNumber(17, 19)}:${randomNumber(0, 59)}:00`,
        workHours: randomNumber(4, 10),
        overtime: randomNumber(0, 4),
        notes: randomElement(['', 'Late by 10 mins', 'Early leave', 'On site']),
        tenantId: TENANT_ID,
        isDeleted: false,
        createdAt: randomDate(30),
        updatedAt: new Date()
      });
    }
    await db.collection('attendances').insertMany(attendances);
    console.log(`Inserted ${attendances.length} Attendance records`);

    // 14. HRM - LEAVES (15 records)
    console.log('Inserting Leaves...');
    const leaves = [];
    for (let i = 1; i <= 20; i++) {
      const isToday = i <= 3;
      const startDate = isToday ? new Date() : randomDate(60);
      const endDate = new Date(startDate.getTime() + randomNumber(isToday ? 0 : 1, 7) * 24 * 60 * 60 * 1000);
      leaves.push({
        employeeId: employees[i % employees.length]._id,
        leaveType: randomElement(['Sick', 'Casual', 'Earned', 'Unpaid', 'Maternity', 'Paternity']),
        startDate: startDate,
        endDate: endDate,
        days: Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)),
        reason: randomElement(['Personal work', 'Family function', 'Not feeling well', 'Vacation']),
        status: randomElement(['Pending', 'Approved', 'Rejected']),
        appliedBy: employees[i % employees.length]._id,
        appliedAt: randomDate(90),
        approvedBy: Math.random() > 0.5 ? USER_ID : null,
        approvedAt: Math.random() > 0.5 ? randomDate(5) : null,
        tenantId: TENANT_ID,
        isDeleted: false,
        createdAt: randomDate(90),
        updatedAt: new Date()
      });
    }
    await db.collection('leaves').insertMany(leaves);
    console.log(`Inserted ${leaves.length} Leave records`);

    // 15. DOCUMENTS (25 records)
    console.log('Inserting Documents...');
    const documents = [];
    const docTypes = ['Contract', 'Permit', 'Drawing', 'Report', 'Invoice', 'Photo', 'Manual', 'Certificate'];
    for (let i = 1; i <= 20; i++) {
      documents.push({
        documentId: generateId('DOC', i),
        title: `${randomElement(docTypes)} - ${projects[i % projects.length].projectId}`,
        type: randomElement(docTypes),
        fileUrl: `https://storage.example.com/docs/${generateId('DOC', i)}.pdf`,
        fileKey: `docs/${generateId('DOC', i)}.pdf`,
        fileName: `${generateId('DOC', i)}.pdf`,
        fileSize: randomNumber(1000, 10000000),
        mimeType: 'application/pdf',
        projectId: projects[i % projects.length]._id,
        leadId: Math.random() > 0.5 ? leads[i % leads.length]._id : null,
        uploadedBy: USER_ID,
        tags: [randomElement(['Important', 'Confidential', 'Draft', 'Final'])],
        status: randomElement(['Active', 'Archived', 'Deleted']),
        tenantId: TENANT_ID,
        isDeleted: false,
        createdAt: randomDate(90),
        updatedAt: new Date()
      });
    }
    await db.collection('documents').insertMany(documents);
    console.log(`Inserted ${documents.length} Documents`);

    // 16. LOGISTICS VENDORS (8 records)
    console.log('Inserting Logistics Vendors...');
    const logisticsVendors = [];
    for (let i = 1; i <= 20; i++) {
      logisticsVendors.push({
        id: generateId('LVND', i),
        name: randomElement(['Speed Transport', 'Safe Logistics', 'Fast Delivery', 'Reliable Movers', 'Quick Transport']),
        contactPerson: randomElement(firstNames) + ' ' + randomElement(lastNames),
        phone: `+91${randomNumber(7000000000, 9999999999)}`,
        email: `vendor${i}@logistics.com`,
        address: `${randomElement(cities)}, ${randomElement(states)}`,
        serviceType: randomElement(['Transport', 'Warehousing', 'Both']),
        rating: randomNumber(1, 5),
        isActive: true,
        tenantId: TENANT_ID,
        isDeleted: false,
        createdAt: randomDate(180),
        updatedAt: new Date()
      });
    }
    await db.collection('logisticsvendors').insertMany(logisticsVendors);
    console.log(`Inserted ${logisticsVendors.length} Logistics Vendors`);

    // 17. PROCUREMENT VENDORS (10 records)
    console.log('Inserting Procurement Vendors...');
    const procurementVendors = [];
    for (let i = 1; i <= 20; i++) {
      procurementVendors.push({
        vendorId: generateId('VND', i),
        name: randomElement(['Tata Solar', 'Adani Solar', 'Waaree Energies', 'Vikram Solar', 'RenewSys', 'Premier Solar', 'Jakson']),
        contactPerson: randomElement(firstNames) + ' ' + randomElement(lastNames),
        phone: `+91${randomNumber(7000000000, 9999999999)}`,
        email: `vendor${i}@supplier.com`,
        address: `${randomElement(cities)}, ${randomElement(states)}`,
        gstNumber: `24${String.fromCharCode(65 + randomNumber(0, 25))}${String.fromCharCode(65 + randomNumber(0, 25))}${randomNumber(1000, 9999)}P${randomNumber(1, 9)}Z${randomNumber(1, 9)}F`,
        category: randomElement(['Panels', 'Inverters', 'Cables', 'Structures', 'BOS']),
        rating: randomNumber(1, 5),
        creditLimit: randomNumber(100000, 10000000),
        paymentTerms: randomElement(['30 Days', '45 Days', '60 Days', 'Immediate']),
        isActive: true,
        tenantId: TENANT_ID,
        isDeleted: false,
        createdBy: USER_ID,
        createdAt: randomDate(180),
        updatedAt: new Date()
      });
    }
    await db.collection('procurementvendors').insertMany(procurementVendors);
    console.log(`Inserted ${procurementVendors.length} Procurement Vendors`);

    // 18. COMPLIANCE - SUBSIDY (10 records)
    console.log('Inserting Subsidies...');
    const subsidies = [];
    for (let i = 1; i <= 20; i++) {
      subsidies.push({
        subsidyId: generateId('SBS', i),
        projectId: projects[i % projects.length]._id,
        customerName: projects[i % projects.length].customerName,
        applicationNumber: `APP${randomNumber(100000, 999999)}`,
        subsidyAmount: randomNumber(50000, 500000),
        appliedDate: randomDate(90),
        status: randomElement(['Applied', 'Under Review', 'Approved', 'Rejected', 'Disbursed']),
        approvedDate: Math.random() > 0.5 ? randomDate(30) : null,
        disbursedDate: Math.random() > 0.7 ? randomDate(15) : null,
        disbursedAmount: Math.random() > 0.7 ? randomNumber(50000, 500000) : 0,
        remarks: randomElement(['Under MNRE scheme', 'State subsidy', 'Rooftop scheme']),
        tenantId: TENANT_ID,
        isDeleted: false,
        createdBy: USER_ID,
        createdAt: randomDate(120),
        updatedAt: new Date()
      });
    }
    await db.collection('subsidies').insertMany(subsidies);
    console.log(`Inserted ${subsidies.length} Subsidies`);

    // 19. COMPLIANCE - NET METERING (10 records)
    console.log('Inserting Net Metering records...');
    const netMeterings = [];
    for (let i = 1; i <= 20; i++) {
      netMeterings.push({
        applicationId: generateId('NETM', i),
        netMeteringId: generateId('NET', i),
        projectId: projects[i % projects.length]._id,
        customerName: projects[i % projects.length].customerName,
        applicationNumber: `NET${randomNumber(100000, 999999)}`,
        discom: randomElement(['PGVCL', 'MGVCL', 'DGVCL', 'UGVCL']),
        sanctionedLoad: randomNumber(5, 500),
        applicationDate: randomDate(90),
        status: randomElement(['Applied', 'Under Review', 'Approved', 'Meter Installed', 'Rejected']),
        approvalDate: Math.random() > 0.5 ? randomDate(45) : null,
        meterInstallationDate: Math.random() > 0.7 ? randomDate(30) : null,
        remarks: '',
        tenantId: TENANT_ID,
        isDeleted: false,
        createdBy: USER_ID,
        createdAt: randomDate(120),
        updatedAt: new Date()
      });
    }
    await db.collection('netmeterings').insertMany(netMeterings);
    console.log(`Inserted ${netMeterings.length} Net Metering records`);

    // 20. HRM - DEPARTMENTS (1000 records)
    console.log('Inserting Departments...');
    const departmentDocs = [];
    let deptCounter = 0;
    for (const dept of departments) {
      for (let d = 0; d < 143; d++) {
        departmentDocs.push({
          name: `${dept} ${d + 1}`,
          description: `${dept} Department ${d + 1}`,
          managerId: Math.random() > 0.5 ? employees[randomNumber(0, employees.length - 1)]._id : null,
          employeeCount: randomNumber(2, 20),
          isActive: true,
          tenantId: TENANT_ID,
          isDeleted: false,
          createdAt: randomDate(365),
          updatedAt: new Date()
        });
      }
    }
    await db.collection('departments').insertMany(departmentDocs);
    console.log(`Inserted ${departmentDocs.length} Departments`);

    console.log('\n========================================');
    console.log('DUMMY DATA INSERTION COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log('\nSummary:');
    console.log(`- ${leadStatusDocs.length} CRM Lead Statuses`);
    console.log(`- ${leads.length} Leads`);
    console.log(`- ${surveys.length} Surveys (for site survey leads)`);
    console.log(`- ${items.length} Items`);
    console.log(`- ${inventories.length} Inventory records`);
    console.log(`- ${projects.length} Projects`);
    console.log(`- ${quotations.length} Quotations`);
    console.log(`- ${installations.length} Installations`);
    console.log(`- ${commissioningRecords.length} Commissioning records`);
    console.log(`- ${purchaseOrders.length} Purchase Orders`);
    console.log(`- ${dispatches.length} Dispatches`);
    console.log(`- ${employees.length} Employees`);
    console.log(`- ${invoices.length} Invoices`);
    console.log(`- ${expenses.length} Expenses`);
    console.log(`- ${attendances.length} Attendance records`);
    console.log(`- ${leaves.length} Leave records`);
    console.log(`- ${documents.length} Documents`);
    console.log(`- ${logisticsVendors.length} Logistics Vendors`);
    console.log(`- ${procurementVendors.length} Procurement Vendors`);
    console.log(`- ${subsidies.length} Subsidies`);
    console.log(`- ${netMeterings.length} Net Metering records`);
    console.log(`- ${departmentDocs.length} Departments`);
    console.log('\nAll data inserted with Tenant ID:', TENANT_ID.toString());
    console.log('User ID used:', USER_ID.toString());
    
  } catch (error) {
    console.error('Error inserting dummy data:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the script
insertDummyData();

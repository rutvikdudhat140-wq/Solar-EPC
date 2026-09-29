import * as dotenv from "dotenv";
dotenv.config();
import * as mongoose from 'mongoose';
import * as bcryptjs from 'bcryptjs';

// User Schema matching the application
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, index: true },
  isSuperAdmin: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
  dataScope: { type: String, default: 'ASSIGNED', enum: ['ALL', 'ASSIGNED'] },
  tenantId: { type: mongoose.Schema.Types.ObjectId, required: false },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

UserSchema.index({ email: 1, tenantId: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', UserSchema);

// Tenant Schema for creating default tenant
const TenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  status: { type: String, default: 'active' },
  subscriptionStatus: { type: String, default: 'active' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Tenant = mongoose.model('Tenant', TenantSchema);

async function createSuperAdmin() {
  try {
    // Get MongoDB URI from environment or use default
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/solar";
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if superadmin already exists
    const existingUser = await User.findOne({ email: 'superadmin@solarios.com' });
    if (existingUser) {
      console.log('\n⚠️  Superadmin user already exists!');
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:     superadmin@solarios.com');
      console.log('🔑 Password:  SuperAdmin@123');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      await mongoose.disconnect();
      return;
    }

    // Create default tenant for platform administration
    let defaultTenant = await Tenant.findOne({ slug: 'default' });
    if (!defaultTenant) {
      console.log('🏢 Creating default tenant...');
      defaultTenant = await Tenant.create({
        name: 'Default Platform',
        slug: 'default',
        status: 'active',
        subscriptionStatus: 'active',
        isActive: true,
      });
      console.log('✅ Default tenant created');
    } else {
      console.log('✅ Default tenant already exists');
    }

    // Hash password
    const password = 'SuperAdmin@123';
    const passwordHash = bcryptjs.hashSync(password, 10);

    // Create superadmin user
    console.log('👤 Creating superadmin user...');
    const superAdmin = await User.create({
      email: 'superadmin@solarios.com',
      passwordHash: passwordHash,
      role: 'Super Admin',
      isSuperAdmin: true,
      isActive: true,
      dataScope: 'ALL',
      tenantId: defaultTenant._id,
      isDeleted: false,
    });

    console.log('\n🎉 Setup Complete!');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:     superadmin@solarios.com');
      console.log('🔑 Password:  SuperAdmin@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('👉 Login at: http://localhost:5173/login\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

createSuperAdmin();

import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UpdateProfileDto } from './dto/profile.dto';
import { User, UserDocument } from './schemas/user.schema';
import { Employee, EmployeeDocument } from '../../modules/hrm/schemas/employee.schema';
import { Tenant, TenantDocument } from '../../core/tenant/schemas/tenant.schema';
import { UserOverride, UserOverrideDocument } from '../../modules/settings/schemas/user-override.schema';

 type FindUserByEmailResult = {
   userType: 'user' | 'employee';
   name?: string;
 };

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(UserOverride.name) private readonly userOverrideModel: Model<UserOverrideDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async findUserByEmail(email: string): Promise<FindUserByEmailResult | null> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.userModel
      .findOne({ email: normalizedEmail, isActive: true })
      .lean();

    if (user) {
      const name = user.firstName || user.lastName
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : user.email?.split('@')[0];

      return {
        userType: 'user',
        name,
      };
    }

    const employee = await this.employeeModel
      .findOne({ email: normalizedEmail, status: { $in: ['active', 'inactive'] } })
      .lean();

    if (employee) {
      const name = employee.firstName || employee.lastName
        ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
        : employee.email?.split('@')[0];

      return {
        userType: 'employee',
        name,
      };
    }

    return null;
  }

  async resetPasswordByEmail(
    email: string,
    newPassword: string,
    userType: 'user' | 'employee',
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (userType === 'user') {
      const updated = await this.userModel
        .findOneAndUpdate(
          { email: normalizedEmail, isActive: true },
          { $set: { passwordHash: hashedPassword } },
          { new: true },
        )
        .lean();

      if (!updated) {
        throw new NotFoundException('User not found');
      }

      return;
    }

    const updatedEmployee = await this.employeeModel
      .findOneAndUpdate(
        { email: normalizedEmail, status: { $in: ['active', 'inactive'] } },
        { $set: { password: hashedPassword } },
        { new: true },
      )
      .lean();

    if (!updatedEmployee) {
      throw new NotFoundException('User not found');
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    console.log('[DEBUG AUTH] Login attempt for email:', email);
    
    // First try to find user in users collection (admins, superadmins)
    let user = await this.userModel.findOne({ email, isActive: true }).lean();
    console.log('[DEBUG AUTH] User found in users collection:', user ? 'YES' : 'NO');
    
    let isEmployee = false;
    let employee = null;

    // If not found in users, try employees collection
    if (!user) {
      console.log('[DEBUG AUTH] Checking employees collection...');
      employee = await this.employeeModel.findOne({ 
        email, 
        status: { $in: ['active', 'inactive'] } // not terminated/suspended
      }).lean();
      
      console.log('[DEBUG AUTH] Employee found:', employee ? 'YES' : 'NO');
      if (employee) {
        console.log('[DEBUG AUTH] Employee status:', employee.status);
        console.log('[DEBUG AUTH] Employee has password:', employee.password ? 'YES' : 'NO');
        isEmployee = true;
      }
    }

    // If neither user nor employee found
    if (!user && !employee) {
      console.log('[DEBUG AUTH] Neither user nor employee found');
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    let passwordValid = false;
    if (user) {
      console.log('[DEBUG AUTH] Verifying user password...');
      passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
      console.log('[DEBUG AUTH] User password valid:', passwordValid);
    } else if (employee) {
      console.log('[DEBUG AUTH] Verifying employee password...');
      console.log('[DEBUG AUTH] Employee password starts with $2:', employee.password?.startsWith('$2'));
      
      // Handle both bcrypt hashed and plaintext passwords
      if (employee.password?.startsWith('$2')) {
        // Password is bcrypt hashed
        passwordValid = await bcrypt.compare(dto.password, employee.password);
      } else {
        // Password might be plaintext or using different hashing
        passwordValid = dto.password === employee.password;
        console.log('[DEBUG AUTH] Plaintext password comparison');
      }
      
      console.log('[DEBUG AUTH] Employee password valid:', passwordValid);
    }

    if (!passwordValid) {
      console.log('[DEBUG AUTH] Password validation failed');
      throw new UnauthorizedException('Invalid email or password');
    }

    // Handle employee login
    if (isEmployee && employee) {
      const payload = {
        sub: String(employee._id),
        role: 'Employee',
        tenantId: employee.tenantId ? String(employee.tenantId) : null,
        isSuperAdmin: false,
        roleId: employee.roleId || null,
        isEmployee: true,
        dataScope: 'ASSIGNED',
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
      };

      const accessToken = await this.jwtService.signAsync(payload);

      return {
        accessToken,
        user: {
          id: String(employee._id),
          email: employee.email,
          role: 'Employee',
          tenantId: employee.tenantId ? String(employee.tenantId) : null,
          isSuperAdmin: false,
          roleId: employee.roleId || null,
          isEmployee: true,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId,
        },
      };
    }

    // Handle regular user login
    // Check for custom role override
    console.log('[AUTH DEBUG] ==========================================');
    console.log('[AUTH DEBUG] LOGIN START - User:', user!._id.toString(), 'Role:', user!.role);
    console.log('[AUTH DEBUG] ==========================================');
    const userOverride = await this.userOverrideModel.findOne({ userId: user!._id }).lean();
    console.log('[AUTH DEBUG] User override found:', userOverride ? 'YES' : 'NO');
    if (userOverride) {
      console.log('[AUTH DEBUG] User override details:', JSON.stringify(userOverride, null, 2));
    }
    const customRoleId = userOverride?.customRoleId || null;
    console.log('[AUTH DEBUG] Extracted customRoleId:', customRoleId);

    const payload = {
      sub: String(user!._id),
      role: user!.role,
      tenantId: user!.tenantId ? String(user!.tenantId) : null,
      isSuperAdmin: Boolean(user!.isSuperAdmin),
      roleId: user!.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: String(user!._id),
        email: user!.email,
        role: user!.role,
        tenantId: user!.tenantId ? String(user!.tenantId) : null,
        isSuperAdmin: Boolean(user!.isSuperAdmin),
        roleId: user!.role,
      },
    };
  }

  async getUsersByTenantAndRole(tenantCode: string, role?: string) {
    const tenant = await this.tenantModel.findOne({ code: tenantCode }).lean();
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }
    const tenantId = tenant._id.toString();

    const query: any = { tenantId, isActive: true };
    if (role) {
      query.role = role;
    }

    const users = await this.userModel.find(query).lean();
    return users.map(u => ({
      id: String(u._id),
      name: u.email.split('@')[0],
      email: u.email,
      role: u.role,
    }));
  }

  async createUser(tenantCode: string, createUserDto: CreateUserDto) {
    let tenantId: string;
    
    if (createUserDto.tenantId) {
      tenantId = createUserDto.tenantId;
    } else {
      const tenant = await this.tenantModel.findOne({ code: tenantCode }).lean();
      if (!tenant) {
        // Fallback: check slug if code doesn't exist
        const tenantBySlug = await this.tenantModel.findOne({ slug: tenantCode }).lean();
        if (!tenantBySlug) {
          throw new NotFoundException(`Tenant ${tenantCode} not found`);
        }
        tenantId = tenantBySlug._id.toString();
      } else {
        tenantId = tenant._id.toString();
      }
    }

    const existingUser = await this.userModel.findOne({
      email: createUserDto.email.toLowerCase(),
      tenantId: new Types.ObjectId(tenantId),
    }).lean();

    if (existingUser) {
      throw new BadRequestException('User with this email already exists in this tenant');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = new this.userModel({
      email: createUserDto.email.toLowerCase(),
      passwordHash,
      role: createUserDto.role,
      tenantId: new Types.ObjectId(tenantId),
      isSuperAdmin: createUserDto.isSuperAdmin || false,
      isActive: true,
    });

    const savedUser = await user.save();
    return {
      id: String(savedUser._id),
      email: savedUser.email,
      role: savedUser.role,
      isActive: savedUser.isActive,
      isSuperAdmin: savedUser.isSuperAdmin,
    };
  }

  async findOne(tenantCode: string, userId: string) {
    const tenant = await this.tenantModel.findOne({ code: tenantCode }).lean();
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }

    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      tenantId: tenant._id,
    }).lean();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      id: String(user._id),
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
    };
  }

  async updateUser(tenantCode: string, userId: string, updateUserDto: UpdateUserDto) {
    const tenant = await this.tenantModel.findOne({ code: tenantCode }).lean();
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }

    const updateData: any = {};
    if (updateUserDto.email) updateData.email = updateUserDto.email.toLowerCase();
    if (updateUserDto.role) updateData.role = updateUserDto.role;
    if (updateUserDto.isActive !== undefined) updateData.isActive = updateUserDto.isActive;
    if (updateUserDto.isSuperAdmin !== undefined) updateData.isSuperAdmin = updateUserDto.isSuperAdmin;
    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(userId), tenantId: tenant._id },
      { $set: updateData },
      { new: true },
    ).lean();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      id: String(user._id),
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
    };
  }

  async deleteUser(tenantCode: string, userId: string) {
    const tenant = await this.tenantModel.findOne({ code: tenantCode }).lean();
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }

    const user = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(userId), tenantId: tenant._id },
      { $set: { isActive: false } },
      { new: true },
    ).lean();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return { message: `User ${userId} deleted successfully` };
  }

  // Profile methods
  async getProfile(userId: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      isActive: true,
    }).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: String(user._id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.firstName || user.lastName
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : undefined,
      profileImage: user.profileImage,
      phone: user.phone,
      role: user.role,
      tenantId: user.tenantId ? String(user.tenantId) : undefined,
      isSuperAdmin: user.isSuperAdmin,
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      isActive: true,
    }).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};

    // Update profile fields
    if (updateProfileDto.firstName !== undefined) updateData.firstName = updateProfileDto.firstName;
    if (updateProfileDto.lastName !== undefined) updateData.lastName = updateProfileDto.lastName;
    if (updateProfileDto.phone !== undefined) updateData.phone = updateProfileDto.phone;

    // Update email if provided and different
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      // Check if email already exists
      const existingUser = await this.userModel.findOne({
        email: updateProfileDto.email.toLowerCase(),
        _id: { $ne: new Types.ObjectId(userId) },
      }).lean();

      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }

      updateData.email = updateProfileDto.email.toLowerCase();
    }

    // Update password if provided
    if (updateProfileDto.newPassword) {
      if (!updateProfileDto.currentPassword) {
        throw new BadRequestException('Current password is required to change password');
      }

      // Verify current password
      const passwordValid = await bcrypt.compare(updateProfileDto.currentPassword, user.passwordHash);
      if (!passwordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      updateData.passwordHash = await bcrypt.hash(updateProfileDto.newPassword, 10);
    }

    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(userId) },
      { $set: updateData },
      { new: true },
    ).lean();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      id: String(updatedUser._id),
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      fullName: updatedUser.firstName || updatedUser.lastName
        ? `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim()
        : undefined,
      profileImage: updatedUser.profileImage,
      phone: updatedUser.phone,
      role: updatedUser.role,
      tenantId: updatedUser.tenantId ? String(updatedUser.tenantId) : undefined,
      isSuperAdmin: updatedUser.isSuperAdmin,
    };
  }

  async updateProfileImage(userId: string, imageUrl: string | null) {
    const user = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(userId) },
      { $set: { profileImage: imageUrl } },
      { new: true },
    ).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: String(user._id),
      profileImage: user.profileImage,
    };
  }

  // Helper method to get employee role permissions - returns OBJECT format
  private async getEmployeeRolePermissions(roleId?: string): Promise<Record<string, Record<string, boolean>>> {
    const permissions: Record<string, Record<string, boolean>> = {};
    
    // Default modules structure
    const modules = ['employees', 'attendance', 'leaves', 'payroll', 'increments', 'departments'];
    modules.forEach(m => {
      permissions[m] = { view: false, create: false, edit: false, delete: false };
    });
    
    if (!roleId) {
      // Default for employees without role - minimal access
      permissions.employees.view = true;
      permissions.attendance.view = true;
      permissions.attendance.checkin = true;
      permissions.attendance.checkout = true;
      permissions.leaves.view = true;
      permissions.leaves.apply = true;
      permissions.payroll.view = true;
      return permissions;
    }
    
    // Import PermissionService to get actual permissions
    try {
      const { PermissionService } = require('../../modules/hrm/services/permission.service');
      const permService = new PermissionService();
      
      // Get module permissions for this role
      const modulePerms = await permService.getAllRoleModulePermissions(roleId);
      
      for (const modPerm of modulePerms) {
        const module = modPerm.module;
        if (!permissions[module]) {
          permissions[module] = {};
        }
        // Convert actions object to boolean map
        const actions = modPerm.actions || {};
        for (const [action, val] of Object.entries(actions)) {
          permissions[module][action] = val === true;
        }
      }
      
      return permissions;
    } catch (e) {
      // Fallback to basic permissions if service fails
      permissions.employees.view = true;
      permissions.attendance.view = true;
      permissions.attendance.checkin = true;
      permissions.attendance.checkout = true;
      permissions.leaves.view = true;
      permissions.leaves.apply = true;
      return permissions;
    }
  }

  // Get base role permissions for non-HRM modules
  private getBaseRolePermissions(role: string, module: string): Record<string, boolean> {
    const roleLower = (role || '').toLowerCase();
    const isAdmin = roleLower === 'admin' || roleLower === 'superadmin' || roleLower === 'super admin';
    
    // Default permissions object
    const defaultPerms = { view: false, create: false, edit: false, delete: false };
    
    // Admin gets all permissions
    if (isAdmin) {
      return { view: true, create: true, edit: true, delete: true };
    }
    
    // Define module access by role
    const roleModuleMap: Record<string, string[]> = {
      'admin': ['dashboard', 'crm', 'survey', 'design', 'documents', 'procurement', 'inventory', 'project', 'logistics', 'installation', 'commissioning', 'finance', 'service', 'compliance', 'admin', 'settings', 'hrm', 'tasks'],
      'manager': ['dashboard', 'crm', 'survey', 'design', 'procurement', 'inventory', 'project', 'logistics', 'installation', 'finance', 'service', 'hrm', 'tasks'],
      'sales': ['dashboard', 'crm', 'quotations', 'leads', 'tasks'],
      'technician': ['dashboard', 'installation', 'service', 'tasks'],
      'hr': ['dashboard', 'hrm', 'employees', 'attendance', 'leaves', 'tasks'],
      'employee': ['dashboard', 'hrm', 'tasks'],
    };
    
    // Check if role has access to this module
    const roleModules = roleModuleMap[roleLower] || roleModuleMap['employee'];
    const hasAccess = roleModules.includes(module);
    
    if (!hasAccess) {
      return defaultPerms;
    }
    
    // Non-admin roles with access get view + limited create/edit
    return {
      view: true,
      create: roleLower !== 'employee',
      edit: roleLower !== 'employee',
      delete: roleLower === 'manager' || roleLower === 'admin',
    };
  }
}

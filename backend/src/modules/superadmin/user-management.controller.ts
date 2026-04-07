import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../core/auth/schemas/user.schema';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../core/auth/guards/superadmin.guard';
import * as bcrypt from 'bcrypt';

// DTOs
class CreateUserManagementDto {
  email!: string;
  password!: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phone?: string;
  isActive?: boolean;
  isSuperAdmin?: boolean;
}

class UpdateUserManagementDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phone?: string;
  isActive?: boolean;
  isSuperAdmin?: boolean;
  profileImage?: string;
}

class AssignDepartmentDto {
  departmentId!: string;
  isHead?: boolean;
}

@Controller('user-management')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class UserManagementController {
  private readonly logger = new Logger(UserManagementController.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Get all users with filtering and pagination
  @Get('users')
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    try {
      const skip = (page - 1) * limit;
      
      // Build filter
      const filter: any = { isDeleted: { $ne: true } };
      
      if (search) {
        filter.$or = [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ];
      }
      
      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      // Sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [users, total] = await Promise.all([
        this.userModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select('-passwordHash')
          .lean()
          .exec(),
        this.userModel.countDocuments(filter),
      ]);

      return {
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching users:', error);
      throw error;
    }
  }

  // Get single user by ID
  @Get('users/:userId')
  async getUserById(@Param('userId') userId: string) {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }

      const user = await this.userModel
        .findById(userId)
        .select('-passwordHash')
        .lean()
        .exec();

      if (!user || user.isDeleted) {
        throw new BadRequestException('User not found');
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      this.logger.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  }

  // Create new user
  @Post('users')
  async createUser(@Body() createUserDto: CreateUserManagementDto) {
    try {
      // Validate required fields
      if (!createUserDto.email || !createUserDto.password) {
        throw new BadRequestException('Email and password are required');
      }

      // Check if user already exists
      const existingUser = await this.userModel.findOne({
        email: createUserDto.email.toLowerCase(),
        isDeleted: { $ne: true },
      });

      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(createUserDto.password, saltRounds);

      // Create user
      const newUser = new this.userModel({
        email: createUserDto.email.toLowerCase().trim(),
        passwordHash,
        firstName: createUserDto.firstName || '',
        lastName: createUserDto.lastName || '',
        role: createUserDto.role || 'employee',
        phone: createUserDto.phone || '',
        isActive: createUserDto.isActive !== false,
        isSuperAdmin: createUserDto.isSuperAdmin === true,
        dataScope: 'ASSIGNED',
        isDeleted: false,
      });

      const savedUser = await newUser.save();
      
      // Return user without password
      const userObj = savedUser.toObject();
      delete (userObj as any)['passwordHash'];

      return {
        success: true,
        message: 'User created successfully',
        data: userObj,
      };
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  @Patch('users/:userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserManagementDto,
  ) {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }

      // Prevent updating own SuperAdmin status through this endpoint
      const updateData: any = { ...updateUserDto };
      delete updateData.password; // Password changes should be separate

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: updateData },
          { new: true, runValidators: true }
        )
        .select('-passwordHash')
        .lean()
        .exec();

      if (!updatedUser) {
        throw new BadRequestException('User not found');
      }

      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      this.logger.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  }

  // Delete user (soft delete)
  @Delete('users/:userId')
  async deleteUser(@Param('userId') userId: string) {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }

      // Prevent self-deletion
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Soft delete
      await this.userModel.findByIdAndUpdate(userId, {
        $set: { isDeleted: true, isActive: false, deletedAt: new Date() },
      });

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  }

  // Bulk delete users
  @Post('users/bulk-delete')
  async bulkDeleteUsers(@Body('userIds') userIds: string[]) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new BadRequestException('User IDs array is required');
      }

      const validIds = userIds.filter(id => Types.ObjectId.isValid(id));
      
      await this.userModel.updateMany(
        { _id: { $in: validIds.map(id => new Types.ObjectId(id)) } },
        { $set: { isDeleted: true, isActive: false, deletedAt: new Date() } }
      );

      return {
        success: true,
        message: `${validIds.length} users deleted successfully`,
      };
    } catch (error) {
      this.logger.error('Error bulk deleting users:', error);
      throw error;
    }
  }

  // Toggle user active status
  @Patch('users/:userId/toggle-active')
  async toggleUserActive(@Param('userId') userId: string) {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }

      const user = await this.userModel.findById(userId);
      if (!user || user.isDeleted) {
        throw new BadRequestException('User not found');
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: { isActive: !user.isActive } },
          { new: true }
        )
        .select('-passwordHash')
        .lean()
        .exec();

      if (!updatedUser) {
        throw new BadRequestException('Failed to update user');
      }

      return {
        success: true,
        message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
        data: updatedUser,
      };
    } catch (error) {
      this.logger.error(`Error toggling user active status ${userId}:`, error);
      throw error;
    }
  }

  // Get user statistics
  @Get('statistics')
  async getUserStatistics() {
    try {
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        superAdmins,
        usersByRole,
      ] = await Promise.all([
        this.userModel.countDocuments({ isDeleted: { $ne: true } }),
        this.userModel.countDocuments({ isDeleted: { $ne: true }, isActive: true }),
        this.userModel.countDocuments({ isDeleted: { $ne: true }, isActive: false }),
        this.userModel.countDocuments({ isDeleted: { $ne: true }, isSuperAdmin: true }),
        this.userModel.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: '$role', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

      return {
        success: true,
        data: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          superAdmins,
          usersByRole: usersByRole.map(r => ({ role: r._id, count: r.count })),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching user statistics:', error);
      throw error;
    }
  }

  // Reset user password
  @Patch('users/:userId/reset-password')
  async resetUserPassword(
    @Param('userId') userId: string,
    @Body('newPassword') newPassword: string,
  ) {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }

      if (!newPassword || newPassword.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters');
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: { passwordHash } },
          { new: true }
        )
        .select('-passwordHash')
        .lean()
        .exec();

      if (!updatedUser) {
        throw new BadRequestException('User not found');
      }

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      this.logger.error(`Error resetting password for user ${userId}:`, error);
      throw error;
    }
  }
}

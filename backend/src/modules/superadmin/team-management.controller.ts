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
  BadRequestException,
  Logger,
} from '@nestjs/common';
  import { InjectModel } from '@nestjs/mongoose';
  import { Model, Types } from 'mongoose';
  import { Department, DepartmentDocument } from '../../modules/hrm/schemas/department.schema';
  import { User, UserDocument } from '../../core/auth/schemas/user.schema';
  import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
  import { SuperAdminGuard } from '../../core/auth/guards/superadmin.guard';
  import { Employee, EmployeeDocument } from '../../modules/hrm/schemas/employee.schema';
  
  // DTOs
  class CreateDepartmentDto {
    name!: string;
    code?: string;
    description?: string;
    headId?: string;
  }
  
  class UpdateDepartmentDto {
    name?: string;
    code?: string;
    description?: string;
    headId?: string;
    isActive?: boolean;
  }
  
  class AssignUsersToDepartmentDto {
    emails!: string[];
  }
  
  class SetDepartmentHeadDto {
    userId!: string;
  }
  
  @Controller('team-management')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  export class TeamManagementController {
    private readonly logger = new Logger(TeamManagementController.name);
  
    constructor(
      @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
      @InjectModel(User.name) private userModel: Model<UserDocument>,
      @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    ) {}
  
    // Get all departments with filtering and pagination
    @Get('departments')
    async getAllDepartments(
      @Query('page') page: number = 1,
      @Query('limit') limit: number = 20,
      @Query('search') search?: string,
      @Query('isActive') isActive?: string,
    ) {
      try {
        const skip = (page - 1) * limit;
        
        // Build filter
        const filter: any = { isDeleted: { $ne: true } };
        
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ];
        }
        
        if (isActive !== undefined) filter.isActive = isActive === 'true';
  
        const [departments, total] = await Promise.all([
          this.departmentModel
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),
          this.departmentModel.countDocuments(filter),
        ]);
  
        // Get department heads info
        const headIds = departments
          .map(d => d.headId)
          .filter(id => id && Types.ObjectId.isValid(id));
        
        const heads = headIds.length > 0 
          ? await this.userModel
              .find({ _id: { $in: headIds } })
              .select('firstName lastName email')
              .lean()
          : [];
  
        const headsMap = new Map(heads.map(h => [h._id.toString(), h]));
  
        // Get employee counts for each department
        const deptIds = departments.map(d => d._id.toString());
        const employeeCounts = await this.employeeModel.aggregate([
          { 
            $match: { 
              departmentId: { $in: deptIds.map(id => new Types.ObjectId(id)) },
              isDeleted: { $ne: true }
            } 
          },
          { $group: { _id: '$departmentId', count: { $sum: 1 } } },
        ]);
  
        const countMap = new Map(employeeCounts.map(e => [e._id.toString(), e.count]));
  
        const enrichedDepartments = departments.map(dept => ({
          ...dept,
          head: dept.headId ? headsMap.get(dept.headId.toString()) : null,
          memberCount: countMap.get(dept._id.toString()) || 0,
        }));
  
        return {
          success: true,
          data: enrichedDepartments,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        this.logger.error('Error fetching departments:', error);
        throw error;
      }
    }
  
    // Get single department by ID with members
    @Get('departments/:departmentId')
    async getDepartmentById(@Param('departmentId') departmentId: string) {
      try {
        if (!Types.ObjectId.isValid(departmentId)) {
          throw new BadRequestException('Invalid department ID');
        }
  
        const department = await this.departmentModel
          .findById(departmentId)
          .lean()
          .exec();
  
        if (!department || department.isDeleted) {
          throw new BadRequestException('Department not found');
        }
  
        // Get department head
        let head = null;
        if (department.headId && Types.ObjectId.isValid(department.headId)) {
          head = await this.userModel
            .findById(department.headId)
            .select('firstName lastName email phone profileImage')
            .lean();
        }
  
        // Get department members from employees collection
        const employees = await this.employeeModel
          .find({ 
            departmentId: departmentId,
            isDeleted: { $ne: true }
          })
          .lean();
  
        return {
          success: true,
          data: {
            ...department,
            head,
            members: employees,
            memberCount: employees.length,
          },
        };
      } catch (error) {
        this.logger.error(`Error fetching department ${departmentId}:`, error);
        throw error;
      }
    }
  
    // Create new department
    @Post('departments')
    async createDepartment(@Body() createDto: CreateDepartmentDto) {
      try {
        if (!createDto.name) {
          throw new BadRequestException('Department name is required');
        }
  
        // Check if department with same name exists
        const existingDept = await this.departmentModel.findOne({
          name: { $regex: new RegExp(`^${createDto.name}$`, 'i') },
          isDeleted: { $ne: true },
        });
  
        if (existingDept) {
          throw new BadRequestException('Department with this name already exists');
        }
  
        // Generate code if not provided
        let code = createDto.code;
        if (!code) {
          code = createDto.name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 4);
        }
  
        // Check if code is unique
        if (code) {
          const existingCode = await this.departmentModel.findOne({
            code: { $regex: new RegExp(`^${code}$`, 'i') },
            isDeleted: { $ne: true },
          });
          
          if (existingCode) {
            code = `${code}${Date.now().toString().slice(-2)}`;
          }
        }
  
        const newDepartment = new this.departmentModel({
          name: createDto.name.trim(),
          code: code || '',
          description: createDto.description || '',
          headId: createDto.headId || null,
          isActive: true,
          isDeleted: false,
          employeeCount: 0,
        });
  
        const savedDepartment = await newDepartment.save();
  
        return {
          success: true,
          message: 'Department created successfully',
          data: savedDepartment,
        };
      } catch (error) {
        this.logger.error('Error creating department:', error);
        throw error;
      }
    }
  
    // Update department
    @Patch('departments/:departmentId')
    async updateDepartment(
      @Param('departmentId') departmentId: string,
      @Body() updateDto: UpdateDepartmentDto,
    ) {
      try {
        if (!Types.ObjectId.isValid(departmentId)) {
          throw new BadRequestException('Invalid department ID');
        }
  
        // Check for name uniqueness if name is being updated
        if (updateDto.name) {
          const existingDept = await this.departmentModel.findOne({
            _id: { $ne: departmentId },
            name: { $regex: new RegExp(`^${updateDto.name}$`, 'i') },
            isDeleted: { $ne: true },
          });
  
          if (existingDept) {
            throw new BadRequestException('Department with this name already exists');
          }
        }
  
        const updatedDepartment = await this.departmentModel
          .findByIdAndUpdate(
            departmentId,
            { $set: updateDto },
            { new: true, runValidators: true }
          )
          .lean()
          .exec();
  
        if (!updatedDepartment) {
          throw new BadRequestException('Department not found');
        }
  
        return {
          success: true,
          message: 'Department updated successfully',
          data: updatedDepartment,
        };
      } catch (error) {
        this.logger.error(`Error updating department ${departmentId}:`, error);
        throw error;
      }
    }
  
    // Delete department (soft delete)
    @Delete('departments/:departmentId')
    async deleteDepartment(@Param('departmentId') departmentId: string) {
      try {
        if (!Types.ObjectId.isValid(departmentId)) {
          throw new BadRequestException('Invalid department ID');
        }
  
        // Check if department has members
        const memberCount = await this.employeeModel.countDocuments({
          departmentId: departmentId,
          isDeleted: { $ne: true },
        });
  
        if (memberCount > 0) {
          throw new BadRequestException(
            `Cannot delete department with ${memberCount} members. Please reassign or remove members first.`
          );
        }
  
        // Soft delete
        await this.departmentModel.findByIdAndUpdate(departmentId, {
          $set: { isDeleted: true, isActive: false, deletedAt: new Date() },
        });
  
        return {
          success: true,
          message: 'Department deleted successfully',
        };
      } catch (error) {
        this.logger.error(`Error deleting department ${departmentId}:`, error);
        throw error;
      }
    }
  
    // Set department head
    @Patch('departments/:departmentId/head')
    async setDepartmentHead(
      @Param('departmentId') departmentId: string,
      @Body() setHeadDto: SetDepartmentHeadDto,
    ) {
      try {
        if (!Types.ObjectId.isValid(departmentId)) {
          throw new BadRequestException('Invalid department ID');
        }
  
        if (!setHeadDto.userId || !Types.ObjectId.isValid(setHeadDto.userId)) {
          throw new BadRequestException('Valid user ID is required');
        }
  
        // Verify user exists
        const user = await this.userModel.findById(setHeadDto.userId);
        if (!user || user.isDeleted) {
          throw new BadRequestException('User not found');
        }
  
        const updatedDepartment = await this.departmentModel
          .findByIdAndUpdate(
            departmentId,
            { $set: { headId: setHeadDto.userId } },
            { new: true }
          )
          .lean()
          .exec();
  
        if (!updatedDepartment) {
          throw new BadRequestException('Department not found');
        }
  
        return {
          success: true,
          message: 'Department head assigned successfully',
          data: updatedDepartment,
        };
      } catch (error) {
        this.logger.error(`Error setting department head ${departmentId}:`, error);
        throw error;
      }
    }
  
    // Remove department head
    @Delete('departments/:departmentId/head')
    async removeDepartmentHead(@Param('departmentId') departmentId: string) {
      try {
        if (!Types.ObjectId.isValid(departmentId)) {
          throw new BadRequestException('Invalid department ID');
        }
  
        const updatedDepartment = await this.departmentModel
          .findByIdAndUpdate(
            departmentId,
            { $set: { headId: null } },
            { new: true }
          )
          .lean()
          .exec();
  
        if (!updatedDepartment) {
          throw new BadRequestException('Department not found');
        }
  
        return {
          success: true,
          message: 'Department head removed successfully',
          data: updatedDepartment,
        };
      } catch (error) {
        this.logger.error(`Error removing department head ${departmentId}:`, error);
        throw error;
      }
    }
  
    // Assign users to department
    @Post('departments/:departmentId/assign-users')
    async assignUsersToDepartment(
      @Param('departmentId') departmentId: string,
      @Body() assignDto: AssignUsersToDepartmentDto,
    ) {
      try {
        if (!Types.ObjectId.isValid(departmentId)) {
          throw new BadRequestException('Invalid department ID');
        }
  
        if (!Array.isArray(assignDto.emails) || assignDto.emails.length === 0) {
          throw new BadRequestException('Emails array is required');
        }
  
        // Verify department exists
        const department = await this.departmentModel.findById(departmentId);
        if (!department || department.isDeleted) {
          throw new BadRequestException('Department not found');
        }
  
        const validEmails = assignDto.emails.filter(email => email && email.includes('@'));
        
        if (validEmails.length === 0) {
          throw new BadRequestException('No valid emails provided');
        }
  
        // Update employees with new department using email
        const updateResult = await this.employeeModel.updateMany(
          { 
            email: { $in: validEmails.map(email => email.toLowerCase()) },
            isDeleted: { $ne: true }
          },
          { 
            $set: { 
              departmentId: departmentId,
              department: department.name,
            } 
          }
        );
  
        // Update department employee count
        const employeeCount = await this.employeeModel.countDocuments({
          departmentId: departmentId,
          isDeleted: { $ne: true },
        });
  
        await this.departmentModel.findByIdAndUpdate(departmentId, {
          $set: { employeeCount },
        });
  
        return {
          success: true,
          message: `${updateResult.modifiedCount} users assigned to department`,
          assignedCount: updateResult.modifiedCount,
        };
      } catch (error) {
        this.logger.error(`Error assigning users to department ${departmentId}:`, error);
        throw error;
      }
    }
  
    // Remove users from department
    @Post('departments/:departmentId/remove-users')
    async removeUsersFromDepartment(
      @Param('departmentId') departmentId: string,
      @Body('emails') emails: string[],
    ) {
      try {
        if (!Types.ObjectId.isValid(departmentId)) {
          throw new BadRequestException('Invalid department ID');
        }
  
        if (!Array.isArray(emails) || emails.length === 0) {
          throw new BadRequestException('Emails array is required');
        }
  
        const validEmails = emails.filter(email => email && email.includes('@'));
  
        // Remove department from employees using email
        const updateResult = await this.employeeModel.updateMany(
          { 
            email: { $in: validEmails.map(email => email.toLowerCase()) },
            departmentId: departmentId,
          },
          { 
            $set: { 
              departmentId: null,
              department: '',
            } 
          }
        );
  
        // Update department employee count
        const employeeCount = await this.employeeModel.countDocuments({
          departmentId: departmentId,
          isDeleted: { $ne: true },
        });
  
        await this.departmentModel.findByIdAndUpdate(departmentId, {
          $set: { employeeCount },
        });
  
        return {
          success: true,
          message: `${updateResult.modifiedCount} users removed from department`,
          removedCount: updateResult.modifiedCount,
        };
      } catch (error) {
        this.logger.error(`Error removing users from department ${departmentId}:`, error);
        throw error;
      }
    }
  
    // Get available users for department assignment
    @Get('available-users')
    async getAvailableUsers(
      @Query('excludeDepartmentId') excludeDepartmentId?: string,
      @Query('search') search?: string,
    ) {
      try {
        const filter: any = { 
          isDeleted: { $ne: true },
          isActive: true,
        };
  
        if (excludeDepartmentId) {
          // Find employee emails in this department
          const employeesInDept = await this.employeeModel
            .find({ departmentId: excludeDepartmentId })
            .select('email');
          
          const emailsInDept = employeesInDept.map(e => e.email);
          
          if (emailsInDept.length > 0) {
            filter.email = { $nin: emailsInDept.map(email => email.toLowerCase()) };
          }
        }
  
        if (search) {
          filter.$or = [
            { email: { $regex: search, $options: 'i' } },
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
          ];
        }
  
        const users = await this.userModel
          .find(filter)
          .select('firstName lastName email phone profileImage isActive')
          .sort({ firstName: 1 })
          .limit(50)
          .lean();
  
        return {
          success: true,
          data: users,
          count: users.length,
        };
      } catch (error) {
        this.logger.error('Error fetching available users:', error);
        throw error;
      }
    }
  
    // Get department statistics
    @Get('statistics')
    async getDepartmentStatistics() {
      try {
        const [
          totalDepartments,
          activeDepartments,
          departmentsWithHead,
          totalEmployees,
          avgEmployeesPerDept,
        ] = await Promise.all([
          this.departmentModel.countDocuments({ isDeleted: { $ne: true } }),
          this.departmentModel.countDocuments({ isDeleted: { $ne: true }, isActive: true }),
          this.departmentModel.countDocuments({ 
            isDeleted: { $ne: true }, 
            headId: { $exists: true, $ne: null } 
          }),
          this.employeeModel.countDocuments({ isDeleted: { $ne: true } }),
          this.employeeModel.aggregate([
            { $match: { isDeleted: { $ne: true }, departmentId: { $exists: true, $ne: null } } },
            { $group: { _id: '$departmentId', count: { $sum: 1 } } },
            { $group: { _id: null, avg: { $avg: '$count' } } },
          ]),
        ]);
  
        return {
          success: true,
          data: {
            totalDepartments,
            activeDepartments,
            departmentsWithHead,
            totalEmployees,
            avgEmployeesPerDept: avgEmployeesPerDept[0]?.avg?.toFixed(1) || 0,
          },
        };
      } catch (error) {
        this.logger.error('Error fetching department statistics:', error);
        throw error;
      }
    }
  
    // Reorder departments
    @Patch('departments/reorder')
    async reorderDepartments(@Body('orderedIds') orderedIds: string[]) {
      try {
        if (!Array.isArray(orderedIds)) {
          throw new BadRequestException('Ordered IDs array is required');
        }
  
        const bulkOps = orderedIds.map((id, index) => ({
          updateOne: {
            filter: { _id: new Types.ObjectId(id) },
            update: { $set: { order: index } },
          },
        }));
  
        await this.departmentModel.bulkWrite(bulkOps);
  
        return {
          success: true,
          message: 'Departments reordered successfully',
        };
      } catch (error) {
        this.logger.error('Error reordering departments:', error);
        throw error;
      }
    }
  }
  

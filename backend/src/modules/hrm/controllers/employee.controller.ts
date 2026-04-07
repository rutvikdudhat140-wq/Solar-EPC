import { Controller, Get, Post, Patch, Delete, Body, Param, Req, Headers, Query, HttpCode, HttpStatus, UnauthorizedException, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto/employee.dto';
import { EmployeeDocument } from '../schemas/employee.schema';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionEngineService } from '../../../common/services/permission-engine.service';

@Controller('hrm/employees')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly permissionEngine: PermissionEngineService,
    private readonly configService: ConfigService,
  ) {}

  private async checkPermission(req: any, module: string, action: string) {
    const user = req.user;
    if (!user) throw new ForbiddenException('User not authenticated');

    const tenantId = req.tenant?.id || req.user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing. Access denied.');
    }

    const userId = user.id || user._id || user.sub;
    const roleIdRaw = user.roleId || user.customRoleId || user.role;
    const roleId = typeof roleIdRaw === 'string' ? roleIdRaw : (roleIdRaw ? String(roleIdRaw) : '');

    if (!userId || !roleId) {
      throw new ForbiddenException('User ID or role not found in token');
    }

    const { permissions } = await this.permissionEngine.getPermissions(
      String(userId),
      String(tenantId),
      String(roleId),
    );

    if (permissions?.[module]?.[action] !== true) {
      throw new ForbiddenException(`Permission denied: ${module}.${action} required`);
    }
  }

  private async getDataScopeFilter(req: any, module: string): Promise<any> {
    const user = req.user;
    const userDepartment = user?.department;

    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = user?.id || user?._id || user?.sub;
    const roleIdRaw = user?.roleId || user?.customRoleId || user?.role;
    const roleId = typeof roleIdRaw === 'string' ? roleIdRaw : (roleIdRaw ? String(roleIdRaw) : '');

    if (!tenantId || !userId || !roleId) return {};

    const { dataScope } = await this.permissionEngine.getPermissions(
      String(userId),
      String(tenantId),
      String(roleId),
    );

    const scopeRaw = dataScope?.[module] || 'all';
    const scope = String(scopeRaw).toLowerCase();
    switch (scope) {
      case 'own':
        return { employeeId: user?.sub };
      case 'department':
        return userDepartment ? { department: userDepartment } : { employeeId: user?.sub };
      case 'all':
      default:
        return {};
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: { email: string; password: string },
    @Req() req: any,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    // For login, try to resolve tenantId from headers, query, or context.
    // If multiple tenants exist, we need to know which one the user belongs to.
    const tenantId = headerTenantId || queryTenantId || req.tenant?.id || req.user?.tenantId;
    
    // If no tenantId provided, we'll try to find the employee across all tenants by email.
    // This is useful if the frontend hasn't set the tenant context yet.
    const resolvedTenantId = tenantId || 'ANY_TENANT';

    const employee = await this.employeeService.validateLogin(loginDto.email, loginDto.password, resolvedTenantId) as EmployeeDocument | null;
    
    if (!employee) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // IMPORTANT:
    // Always embed the employee's actual tenant ObjectId in the JWT.
    // The incoming tenantId may be a placeholder like 'default' if frontend didn't send x-tenant-id.
    const effectiveTenantId = employee?.tenantId ? String(employee.tenantId) : tenantId;

    const roleIdRaw = (employee as any)?.roleId;
    const roleId = typeof roleIdRaw === 'string'
      ? roleIdRaw
      : (roleIdRaw?._id ? String(roleIdRaw._id) : (roleIdRaw ? String(roleIdRaw) : null));

    // Generate JWT token using same secret as JwtStrategy
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const token = require('jsonwebtoken').sign(
      {
        sub: employee._id,
        role: 'Employee',
        roleId,
        tenantId: effectiveTenantId,
        department: employee.department,
        isEmployee: true,
        dataScope: 'ASSIGNED', // Employees can only see projects assigned to them
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      success: true,
      data: {
        id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        roleId,
        department: employee.department,
        tenantId: effectiveTenantId,
        token
      }
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEmployeeDto: CreateEmployeeDto, @Req() req: any) {
    await this.checkPermission(req, 'employees', 'create');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    const data = await this.employeeService.create(createEmployeeDto, tenantId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: any) {
    await this.checkPermission(req, 'employees', 'view');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    // Get data scope filter
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');

    // Fetch all employees for the tenant
    const allData = await this.employeeService.findAll(tenantId);

    // Normalize data for frontend (convert Dates to ISO strings)
    const normalizedData = allData.map((e: any) => ({
      ...e,
      _id: e._id?.toString(),
      joiningDate: e.joiningDate ? new Date(e.joiningDate).toISOString() : null,
      createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
      updatedAt: e.updatedAt ? new Date(e.updatedAt).toISOString() : null,
    }));

    // Apply data scope filtering
    let filteredData = normalizedData;
    if (scopeFilter.employeeId) {
      filteredData = normalizedData.filter((e: any) =>
        e._id === scopeFilter.employeeId ||
        e.employeeId === scopeFilter.employeeId
      );
    } else if (scopeFilter.department) {
      filteredData = normalizedData.filter((e: any) => e.department === scopeFilter.department);
    }

    return { success: true, data: filteredData };
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    await this.checkPermission(req, 'employees', 'view');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    // Get data scope filter
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');

    // Fetch all employees
    const allData = await this.employeeService.findAll(tenantId);

    // Normalize data (convert Dates to strings)
    const normalizedData = allData.map((e: any) => ({
      ...e,
      _id: e._id?.toString(),
      joiningDate: e.joiningDate ? new Date(e.joiningDate).toISOString() : null,
    }));

    // Apply data scope filtering
    let filteredData = normalizedData;
    if (scopeFilter.employeeId) {
      filteredData = normalizedData.filter((e: any) =>
        e._id === scopeFilter.employeeId
      );
    } else if (scopeFilter.department) {
      filteredData = normalizedData.filter((e: any) => e.department === scopeFilter.department);
    }

    const stats = {
      total: filteredData.length,
      active: filteredData.filter((e: any) => e.status === 'active').length,
      inactive: filteredData.filter((e: any) => e.status === 'inactive').length,
      suspended: filteredData.filter((e: any) => e.status === 'suspended').length,
      terminated: filteredData.filter((e: any) => e.status === 'terminated').length,
    };
    return { success: true, data: stats };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'employees', 'view');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    const data = await this.employeeService.findOne(id, tenantId);

    // Check if user can access this specific employee based on data scope
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');

    if (scopeFilter.employeeId && data._id?.toString() !== req.user?.sub && data.employeeId !== req.user?.sub) {
      throw new NotFoundException('Employee not found');
    }

    if (scopeFilter.department && data.department !== scopeFilter.department) {
      throw new NotFoundException('Employee not found');
    }

    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'employees', 'edit');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    // Check data scope - can only edit if has access to this employee
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');
    const existingEmployee = await this.employeeService.findOne(id, tenantId);

    if (scopeFilter.employeeId && existingEmployee._id?.toString() !== req.user?.sub) {
      throw new ForbiddenException('You can only edit your own employee record');
    }

    if (scopeFilter.department && existingEmployee.department !== scopeFilter.department) {
      throw new ForbiddenException('You can only edit employees in your department');
    }

    const data = await this.employeeService.update(id, updateEmployeeDto, tenantId);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'employees', 'delete');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    // Check data scope - can only delete if has access to this employee
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');
    const existingEmployee = await this.employeeService.findOne(id, tenantId);

    if (scopeFilter.employeeId && existingEmployee._id?.toString() !== req.user?.sub) {
      throw new ForbiddenException('You can only delete your own employee record');
    }

    if (scopeFilter.department && existingEmployee.department !== scopeFilter.department) {
      throw new ForbiddenException('You can only delete employees in your department');
    }

    const data = await this.employeeService.remove(id, tenantId);
    return { success: true, data };
  }

  @Get('by-department/:department')
  async findByDepartment(@Param('department') department: string, @Req() req: any) {
    await this.checkPermission(req, 'employees', 'view');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    // Check data scope - can only view own department
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');

    if (scopeFilter.department && scopeFilter.department !== department) {
      return { success: true, data: [] };
    }

    const data = await this.employeeService.findByDepartment(department, tenantId);

    // Normalize data for frontend
    const normalizedData = data.map((e: any) => {
      const obj = typeof e?.toObject === 'function' ? e.toObject() : e;
      return {
        ...obj,
        _id: obj?._id?.toString?.() || e?._id?.toString?.(),
        joiningDate: obj?.joiningDate ? new Date(obj.joiningDate).toISOString() : null,
        createdAt: obj?.createdAt ? new Date(obj.createdAt).toISOString() : null,
        updatedAt: obj?.updatedAt ? new Date(obj.updatedAt).toISOString() : null,
      };
    });

    return { success: true, data: normalizedData };
  }

  @Get('by-role/:roleId')
  async findByRole(@Param('roleId') roleId: string, @Req() req: any) {
    await this.checkPermission(req, 'employees', 'view');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    const data = await this.employeeService.findByRole(roleId, tenantId);

    // Normalize data for frontend
    const normalizedData = data.map((e: any) => ({
      ...e,
      _id: e._id?.toString(),
      joiningDate: e.joiningDate ? new Date(e.joiningDate).toISOString() : null,
      createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
      updatedAt: e.updatedAt ? new Date(e.updatedAt).toISOString() : null,
    }));

    // Apply data scope filtering
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');
    let filteredData = normalizedData;

    if (scopeFilter.employeeId) {
      filteredData = normalizedData.filter((e: any) => e._id === scopeFilter.employeeId);
    } else if (scopeFilter.department) {
      filteredData = normalizedData.filter((e: any) => e.department === scopeFilter.department);
    }

    return { success: true, data: filteredData };
  }
}

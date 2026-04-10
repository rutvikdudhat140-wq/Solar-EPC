import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
// import axios from 'axios';
import { Attendance, AttendanceDocument, AttendanceStatus } from '../schemas/attendance.schema';
import { Employee, EmployeeSchema } from '../schemas/employee.schema';
import { CheckInDto, CheckOutDto } from '../dto/attendance.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';
import { AttendancePolicyService } from './attendance-policy.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    private readonly policyService: AttendancePolicyService,
  ) {}

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  async checkIn(checkInDto: CheckInDto, tenantId?: string, user?: UserWithVisibility): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. First, find the employee to get their actual tenantId
    const employee = await this.tenantModel.db.model('Employee', EmployeeSchema).findById(checkInDto.employeeId).lean();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    const employeeTenantId = (employee as any).tenantId;

    const query: any = {
      employeeId: new Types.ObjectId(checkInDto.employeeId),
      date: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      },
      tenantId: new Types.ObjectId(employeeTenantId.toString()),
    };
    
    // Reset today for next steps
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await this.attendanceModel.findOne(query);

    if (existingAttendance && existingAttendance.checkIn) {
      throw new BadRequestException('Already checked in for today');
    }

    // Calculate status based on attendance policy
    const now = new Date();
    let status = AttendanceStatus.PRESENT;
    let isLate = false;
    let lateMinutes = 0;

    try {
      const policy = await this.policyService.getOrCreateDefaultPolicy(employeeTenantId.toString());
      if (policy && policy.isActive) {
        const checkInTime = this.policyService.getCheckInDateTime(policy, today);
        const graceEnd = new Date(checkInTime.getTime() + policy.gracePeriodMinutes * 60 * 1000);

        if (now > graceEnd) {
          isLate = true;
          lateMinutes = Math.ceil((now.getTime() - checkInTime.getTime()) / (60 * 1000));
          
          if (lateMinutes >= policy.halfDayAfterMinutes) {
            status = AttendanceStatus.HALF_DAY;
          } else if (lateMinutes >= policy.lateMarkAfterMinutes) {
            status = AttendanceStatus.LATE;
          }
        }
      }
    } catch (error) {
      console.log('[AttendancePolicy] Could not apply policy, using default logic');
      // Fallback to default 9:30 AM threshold
      const lateThreshold = new Date();
      lateThreshold.setHours(9, 30, 0, 0);
      if (now > lateThreshold) {
        status = AttendanceStatus.LATE;
        isLate = true;
      }
    }

    if (existingAttendance) {
      // Update existing record
      existingAttendance.checkIn = now;
      existingAttendance.type = checkInDto.type || existingAttendance.type;
      existingAttendance.location = checkInDto.location || existingAttendance.location;
      existingAttendance.checkInLocation = checkInDto.location || existingAttendance.checkInLocation;
      existingAttendance.notes = checkInDto.notes || existingAttendance.notes;
      existingAttendance.status = status;
      return existingAttendance.save();
    }

    // Create new attendance record
    const attendance = new this.attendanceModel({
      employeeId: new Types.ObjectId(checkInDto.employeeId),
      date: today,
      checkIn: now,
      status,
      type: checkInDto.type,
      location: checkInDto.location,
      checkInLocation: checkInDto.location,
      notes: checkInDto.notes,
      tenantId: employeeTenantId,
    });

    return attendance.save();
  }

  async checkOut(checkOutDto: CheckOutDto, tenantId?: string, user?: UserWithVisibility): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. First, find the employee to get their actual tenantId
    const employee = await this.tenantModel.db.model('Employee', EmployeeSchema).findById(checkOutDto.employeeId).lean();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    const employeeTenantId = (employee as any).tenantId;

    const query: any = {
      employeeId: new Types.ObjectId(checkOutDto.employeeId),
      date: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      },
      tenantId: new Types.ObjectId(employeeTenantId.toString()),
    };

    // Reset today for next steps
    today.setHours(0, 0, 0, 0);

    const attendance = await this.attendanceModel.findOne(query);

    if (!attendance) {
      throw new NotFoundException('No check-in record found for today');
    }

    if (!attendance.checkIn) {
      throw new BadRequestException('Must check in before checking out');
    }

    if (attendance.checkOut) {
      throw new BadRequestException('Already checked out for today');
    }

    const checkOut = new Date();
    attendance.checkOut = checkOut;
    
    // Calculate total hours with break time deduction
    const checkIn = new Date(attendance.checkIn);
    
    // Apply attendance policy for status and early exit determination
    try {
      const policy = await this.policyService.getOrCreateDefaultPolicy(employeeTenantId.toString());
      if (policy && policy.isActive) {
        // Calculate effective working hours (total - break time)
        const { totalHours, breakMinutes, effectiveHours } = this.policyService.calculateEffectiveWorkingHours(
          policy,
          checkIn,
          checkOut,
        );
        
        attendance.totalHours = effectiveHours;
        attendance.breakTime = breakMinutes;
        
        const scheduledCheckOut = this.policyService.getCheckOutDateTime(policy, today);
        const earlyLeaveThreshold = new Date(scheduledCheckOut.getTime() - policy.earlyLeaveBeforeMinutes * 60 * 1000);
        
        // Check for early exit
        attendance.isEarlyExit = checkOut < earlyLeaveThreshold;
        
        // Calculate overtime
        const overtimeStart = new Date(scheduledCheckOut.getTime() + policy.overtimeThresholdMinutes * 60 * 1000);
        if (checkOut > overtimeStart) {
          attendance.overtimeMinutes = Math.ceil((checkOut.getTime() - scheduledCheckOut.getTime()) / (60 * 1000));
        }
        
        // Auto mark as Half Day if working hours are less than half day threshold (in hours)
        const minHoursForFullDay = (policy.halfDayAfterMinutes / 60);
        
        // Also check if already marked as half day from check-in
        if (attendance.status !== AttendanceStatus.HALF_DAY && effectiveHours < minHoursForFullDay) {
          attendance.status = AttendanceStatus.HALF_DAY;
        }
      } else {
        // Fallback to default logic without break time
        const diffMs = checkOut.getTime() - checkIn.getTime();
        attendance.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        attendance.breakTime = 0;
        
        if (attendance.totalHours < 4) {
          attendance.status = AttendanceStatus.HALF_DAY;
        }
        
        const earlyExitThreshold = new Date();
        earlyExitThreshold.setHours(18, 0, 0, 0);
        attendance.isEarlyExit = checkOut < earlyExitThreshold;
      }
    } catch (error) {
      console.log('[AttendancePolicy] Could not apply policy on checkout, using default logic');
      // Fallback to default logic without break time
      const diffMs = checkOut.getTime() - checkIn.getTime();
      attendance.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      attendance.breakTime = 0;
      
      if (attendance.totalHours < 4) {
        attendance.status = AttendanceStatus.HALF_DAY;
      }
      
      const earlyExitThreshold = new Date();
      earlyExitThreshold.setHours(18, 0, 0, 0);
      attendance.isEarlyExit = checkOut < earlyExitThreshold;
    }
    
    if (checkOutDto.notes) {
      attendance.notes = checkOutDto.notes;
    }

    if (checkOutDto.location) {
      attendance.checkOutLocation = checkOutDto.location;
    }

    return attendance.save();
  }

  async findAll(
    employeeId?: string,
    startDate?: Date,
    endDate?: Date,
    tenantId?: string,
    user?: UserWithVisibility,
  ): Promise<Attendance[]> {
    const query: any = {};

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      // Regular users MUST have a tenantId
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }
    
    if (employeeId) {
      query.employeeId = new Types.ObjectId(employeeId);
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = startDate;
      }
      if (endDate) {
        query.date.$lte = endDate;
      }
    }

    return this.attendanceModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeId department')
      .sort({ date: -1 })
      .exec();
  }

  async findByEmployee(employeeId: string, startDate?: Date, endDate?: Date, tenantId?: string, user?: UserWithVisibility): Promise<Attendance[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { 
      employeeId: new Types.ObjectId(employeeId),
      tenantId: tid 
    };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    return this.attendanceModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .sort({ date: -1 })
      .exec();
  }

  async findByEmployeeId(employeeId: string, tenantId?: string, user?: UserWithVisibility): Promise<Attendance[]> {
    const query: any = { 
      employeeId: new Types.ObjectId(employeeId),
    };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    return this.attendanceModel
      .find(query)
      .sort({ date: -1 })
      .exec();
  }

  async getMonthlySummary(employeeId: string, month: number, year: number, tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const query: any = {
      employeeId: new Types.ObjectId(employeeId),
      date: { $gte: startDate, $lte: endDate },
    };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    const attendances = await this.attendanceModel.find(query).exec();

    const totalDays = attendances.length;
    const presentDays = attendances.filter(a => a.checkIn && a.checkOut).length;
    const totalHours = attendances.reduce((sum, a) => sum + (a.totalHours || 0), 0);
    const averageHours = presentDays > 0 ? Math.round((totalHours / presentDays) * 100) / 100 : 0;

    return {
      month,
      year,
      totalDays,
      presentDays,
      totalHours,
      averageHours,
    };
  }

  async update(id: string, updateData: Partial<Attendance>, tenantId?: string, user?: UserWithVisibility): Promise<Attendance> {
    const query: any = { _id: new Types.ObjectId(id) };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    const attendance = await this.attendanceModel.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true },
    ).exec();

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return attendance;
  }

  async delete(id: string, tenantId?: string, user?: UserWithVisibility): Promise<void> {
    const query: any = { _id: new Types.ObjectId(id) };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    const result = await this.attendanceModel.deleteOne(query).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException('Attendance record not found');
    }
  }

  async getTodaySummary(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query: any = { date: today };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    const attendances = await this.attendanceModel.find(query).exec();
    
    const present = attendances.filter(a => a.checkIn && a.status === AttendanceStatus.PRESENT).length;
    const late = attendances.filter(a => a.checkIn && a.status === AttendanceStatus.LATE).length;
    const halfDay = attendances.filter(a => a.checkIn && a.status === AttendanceStatus.HALF_DAY).length;
    const absent = attendances.filter(a => !a.checkIn).length;
    const checkedOut = attendances.filter(a => a.checkOut).length;

    return {
      date: today,
      total: attendances.length,
      present,
      late,
      halfDay,
      absent,
      checkedOut,
    };
  }

  async reverseGeocode(lat: number, lng: number): Promise<{ address: string }> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Invalid latitude/longitude');
    }

    try {
      // TODO: Re-enable axios call when package is available
      // const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      //   params: { format: 'json', lat, lon: lng, zoom: 18, addressdetails: 1 },
      //   headers: { 'User-Agent': 'SolarOS-Attendance/1.0' },
      //   timeout: 10000,
      // });
      // const data = res?.data;
      // const addr = data?.address || {};

      // Mock address for now
      const address = `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      return { address };
    } catch (e) {
      return { address: '' };
    }
  }
}

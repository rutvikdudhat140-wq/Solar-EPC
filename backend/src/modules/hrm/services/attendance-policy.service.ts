import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CompanyAttendancePolicy, CompanyAttendancePolicyDocument } from '../schemas/company-attendance-policy.schema';

@Injectable()
export class AttendancePolicyService {
  constructor(
    @InjectModel(CompanyAttendancePolicy.name)
    private readonly policyModel: Model<CompanyAttendancePolicyDocument>,
  ) {}

  async getPolicy(tenantId: string): Promise<CompanyAttendancePolicy | null> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      return null;
    }
    const tenantObjectId = new Types.ObjectId(tenantId);
    return this.policyModel
      .findOne({ tenantId: { $in: [tenantObjectId as any, tenantId as any] } })
      .exec();
  }

  async getOrCreateDefaultPolicy(tenantId: string): Promise<CompanyAttendancePolicy> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new NotFoundException('Valid tenant ID is required');
    }

    let policy = await this.getPolicy(tenantId);
    
    if (!policy) {
      const defaultPolicy = new this.policyModel({
        tenantId: new Types.ObjectId(tenantId),
        checkInTime: '09:00',
        checkOutTime: '18:00',
        gracePeriodMinutes: 15,
        halfDayAfterMinutes: 240,
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        lateMarkAfterMinutes: 30,
        earlyLeaveBeforeMinutes: 30,
        overtimeThresholdMinutes: 30,
        breakStartTime: '12:00',
        breakEndTime: '13:00',
        isBreakTimeDeducted: true,
        isActive: true,
      });
      policy = await defaultPolicy.save();
    }

    return policy;
  }

  async updatePolicy(tenantId: string, updateData: Partial<CompanyAttendancePolicy>): Promise<CompanyAttendancePolicy> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new NotFoundException('Valid tenant ID is required');
    }

    const tenantObjectId = new Types.ObjectId(tenantId);

    // Prevent accidental tenantId override from request body which can cause upsert duplicate key errors
    // when an existing record has tenantId stored as a string.
    const {
      _id: _ignoredId,
      id: _ignoredVirtualId,
      tenantId: _ignoredTenantId,
      createdAt: _ignoredCreatedAt,
      updatedAt: _ignoredUpdatedAt,
      ...safeUpdateData
    } = (updateData || {}) as any;

    const filter = { tenantId: tenantObjectId };
    const update = {
      $set: {
        ...safeUpdateData,
        tenantId: tenantObjectId,
      },
    };

    try {
      console.log('[AttendancePolicyService] Updating policy for tenant:', tenantId);
      const policy = await this.policyModel
        .findOneAndUpdate(filter, update, { 
          new: true, 
          upsert: true, 
          setDefaultsOnInsert: true,
          runValidators: true 
        })
        .exec();

      console.log('[AttendancePolicyService] Policy updated successfully');
      return policy;
    } catch (err: any) {
      console.error('[AttendancePolicyService] Error during update:', err.message);
      
      // In case of a race condition where two requests try to upsert simultaneously,
      // one may fail with duplicate key. Retry as a normal update.
      if (err?.code === 11000) {
        console.log('[AttendancePolicyService] Duplicate key detected, retrying without upsert');
        const policy = await this.policyModel
          .findOneAndUpdate(filter, update, { 
            new: true, 
            upsert: false,
            runValidators: true 
          })
          .exec();

        if (!policy) {
          console.error('[AttendancePolicyService] Policy not found after duplicate key error');
          throw err;
        }

        console.log('[AttendancePolicyService] Policy updated successfully after retry');
        return policy;
      }

      console.error('[AttendancePolicyService] Unexpected error:', err);
      throw err;
    }
  }

  async deletePolicy(tenantId: string): Promise<boolean> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      return false;
    }

    const result = await this.policyModel.deleteOne({ tenantId: new Types.ObjectId(tenantId) }).exec();
    return result.deletedCount > 0;
  }

  isWorkingDay(policy: CompanyAttendancePolicy, date: Date): boolean {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    return policy.workingDays.includes(dayName);
  }

  parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  getCheckInDateTime(policy: CompanyAttendancePolicy, date: Date): Date {
    const { hours, minutes } = this.parseTime(policy.checkInTime);
    const checkIn = new Date(date);
    checkIn.setHours(hours, minutes, 0, 0);
    return checkIn;
  }

  getCheckOutDateTime(policy: CompanyAttendancePolicy, date: Date): Date {
    const { hours, minutes } = this.parseTime(policy.checkOutTime);
    const checkOut = new Date(date);
    checkOut.setHours(hours, minutes, 0, 0);
    return checkOut;
  }

  calculateLateMinutes(policy: CompanyAttendancePolicy, actualCheckIn: Date, scheduledDate: Date): number {
    const scheduledCheckIn = this.getCheckInDateTime(policy, scheduledDate);
    const gracePeriodMs = policy.gracePeriodMinutes * 60 * 1000;
    const allowedCheckIn = new Date(scheduledCheckIn.getTime() + gracePeriodMs);

    if (actualCheckIn <= allowedCheckIn) {
      return 0;
    }

    return Math.ceil((actualCheckIn.getTime() - scheduledCheckIn.getTime()) / (60 * 1000));
  }

  calculateEarlyLeaveMinutes(policy: CompanyAttendancePolicy, actualCheckOut: Date, scheduledDate: Date): number {
    const scheduledCheckOut = this.getCheckOutDateTime(policy, scheduledDate);
    const allowedEarlyLeave = new Date(scheduledCheckOut.getTime() - policy.earlyLeaveBeforeMinutes * 60 * 1000);

    if (actualCheckOut >= allowedEarlyLeave) {
      return 0;
    }

    return Math.ceil((scheduledCheckOut.getTime() - actualCheckOut.getTime()) / (60 * 1000));
  }

  calculateOvertimeMinutes(policy: CompanyAttendancePolicy, actualCheckOut: Date, scheduledDate: Date): number {
    const scheduledCheckOut = this.getCheckOutDateTime(policy, scheduledDate);
    const overtimeStart = new Date(scheduledCheckOut.getTime() + policy.overtimeThresholdMinutes * 60 * 1000);

    if (actualCheckOut <= scheduledCheckOut) {
      return 0;
    }

    const effectiveStart = actualCheckOut > overtimeStart ? actualCheckOut : scheduledCheckOut;
    return Math.ceil((actualCheckOut.getTime() - effectiveStart.getTime()) / (60 * 1000));
  }

  getBreakStartDateTime(policy: CompanyAttendancePolicy, date: Date): Date {
    const { hours, minutes } = this.parseTime(policy.breakStartTime);
    const breakStart = new Date(date);
    breakStart.setHours(hours, minutes, 0, 0);
    return breakStart;
  }

  getBreakEndDateTime(policy: CompanyAttendancePolicy, date: Date): Date {
    const { hours, minutes } = this.parseTime(policy.breakEndTime);
    const breakEnd = new Date(date);
    breakEnd.setHours(hours, minutes, 0, 0);
    return breakEnd;
  }

  calculateBreakTimeMinutes(policy: CompanyAttendancePolicy): number {
    if (!policy.isBreakTimeDeducted) {
      return 0;
    }
    const start = this.parseTime(policy.breakStartTime);
    const end = this.parseTime(policy.breakEndTime);
    let diff = (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
    if (diff < 0) {
      diff += 24 * 60; // Handle overnight breaks
    }
    return diff;
  }

  calculateEffectiveWorkingHours(
    policy: CompanyAttendancePolicy,
    checkIn: Date,
    checkOut: Date,
  ): { totalHours: number; breakMinutes: number; effectiveHours: number } {
    // Calculate total hours from check-in to check-out
    const totalMinutes = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (60 * 1000));
    const totalHours = Math.floor(totalMinutes / 60) + (totalMinutes % 60) / 60;

    // Calculate break time
    const breakMinutes = this.calculateBreakTimeMinutes(policy);
    const breakHours = breakMinutes / 60;

    // Calculate effective hours (total - break)
    const effectiveHours = Math.max(0, totalHours - breakHours);

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      breakMinutes,
      effectiveHours: Math.round(effectiveHours * 100) / 100,
    };
  }

  determineAttendanceStatus(
    policy: CompanyAttendancePolicy,
    checkIn: Date,
    checkOut: Date | null,
    scheduledDate: Date,
  ): { status: string; isLate: boolean; isEarlyExit: boolean; isHalfDay: boolean; lateMinutes: number; earlyLeaveMinutes: number; overtimeMinutes: number } {
    const lateMinutes = this.calculateLateMinutes(policy, checkIn, scheduledDate);
    const isLate = lateMinutes > 0;

    let earlyLeaveMinutes = 0;
    let isEarlyExit = false;
    let overtimeMinutes = 0;

    if (checkOut) {
      earlyLeaveMinutes = this.calculateEarlyLeaveMinutes(policy, checkOut, scheduledDate);
      isEarlyExit = earlyLeaveMinutes > 0;
      overtimeMinutes = this.calculateOvertimeMinutes(policy, checkOut, scheduledDate);
    }

    const isHalfDay = isLate && lateMinutes >= policy.halfDayAfterMinutes;

    let status = 'present';
    if (isHalfDay) {
      status = 'half_day';
    } else if (isLate && lateMinutes >= policy.lateMarkAfterMinutes) {
      status = 'late';
    }

    return {
      status,
      isLate,
      isEarlyExit,
      isHalfDay,
      lateMinutes,
      earlyLeaveMinutes,
      overtimeMinutes,
    };
  }
}

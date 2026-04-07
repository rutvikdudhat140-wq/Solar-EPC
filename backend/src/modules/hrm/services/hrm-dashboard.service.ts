import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { Attendance, AttendanceDocument } from '../schemas/attendance.schema';
import { Employee, EmployeeDocument } from '../schemas/employee.schema';
import { Leave, LeaveDocument } from '../schemas/leave.schema';
import { Payroll, PayrollDocument } from '../schemas/payroll.schema';

@Injectable()
export class HrmDashboardService {
  constructor(
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
    @InjectModel(Payroll.name) private payrollModel: Model<PayrollDocument>,
  ) {}

  async getDashboardMetrics(
    tenantId: string,
    employeeId: string | null,
    isAdmin: boolean,
    dataScopeFilter: any,
  ) {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);
    const startOfLastMonth = startOfMonth(subMonths(today, 1));
    const endOfLastMonth = endOfMonth(subMonths(today, 1));

    if (isAdmin) {
      // Get all employee IDs for this tenant
      const employeeQuery: any = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
      if (dataScopeFilter.department) {
        employeeQuery.department = dataScopeFilter.department;
      }
      const employees = await this.employeeModel.find(employeeQuery).exec();
      const employeeIds = employees.map(e => e._id.toString());

      // Today's attendance stats
      const todayAttendance = await this.attendanceModel.find({
        tenantId: new Types.ObjectId(tenantId),
        date: { $gte: startOfToday, $lte: endOfToday },
        ...(dataScopeFilter.department ? { employeeId: { $in: employeeIds.map(id => new Types.ObjectId(id)) } } : {}),
      }).exec();

      const presentToday = todayAttendance.filter(a => a.status === 'present').length;
      const absentToday = todayAttendance.filter(a => a.status === 'absent').length;
      const lateToday = todayAttendance.filter(a => a.status === 'late').length;
      const halfDayToday = todayAttendance.filter(a => a.status === 'half_day').length;
      const totalToday = employees.filter(e => e.status === 'active').length || 1;
      const percentage = Math.round(((presentToday + lateToday) / totalToday) * 100);

      // Weekly trend (last 7 days)
      const weeklyTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        const dayAttendance = await this.attendanceModel.find({
          tenantId: new Types.ObjectId(tenantId),
          date: { $gte: dayStart, $lte: dayEnd },
        }).exec();
        
        const dayPresent = dayAttendance.filter(a => a.status === 'present').length;
        const dayTotal = employees.filter(e => e.status === 'active').length || 1;
        weeklyTrend.push({
          date: date.toISOString().split('T')[0],
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          present: dayPresent,
          total: dayTotal,
          percentage: Math.round((dayPresent / dayTotal) * 100),
        });
      }

      // Monthly attendance stats
      const monthAttendance = await this.attendanceModel.find({
        tenantId: new Types.ObjectId(tenantId),
        date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth },
      }).exec();

      const presentMonth = monthAttendance.filter(a => a.status === 'present').length;
      const lateMonth = monthAttendance.filter(a => a.status === 'late').length;
      const absentMonth = monthAttendance.filter(a => a.status === 'absent').length;

      // Leave stats
      const pendingLeaves = await this.leaveModel.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        status: 'pending',
      }).exec();

      const approvedLeaves = await this.leaveModel.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        status: 'approved',
        startDate: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth },
      }).exec();

      // Payroll stats
      const currentMonthPayroll = await this.payrollModel.find({
        tenantId: new Types.ObjectId(tenantId),
        month: today.getMonth() + 1,
        year: today.getFullYear(),
      }).exec();

      const totalPayroll = currentMonthPayroll.reduce((sum, p) => sum + (p.netSalary || 0), 0);
      const paidCount = currentMonthPayroll.filter(p => p.isPaid).length;
      const unpaidCount = currentMonthPayroll.length - paidCount;

      // Last month comparison
      const lastMonthPayroll = await this.payrollModel.find({
        tenantId: new Types.ObjectId(tenantId),
        month: startOfLastMonth.getMonth() + 1,
        year: startOfLastMonth.getFullYear(),
      }).exec();
      const lastMonthTotal = lastMonthPayroll.reduce((sum, p) => sum + (p.netSalary || 0), 0);
      const payrollChange = lastMonthTotal > 0 ? ((totalPayroll - lastMonthTotal) / lastMonthTotal) * 100 : 0;

      // Employee stats
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter(e => e.status === 'active').length;
      
      // At-risk employees (more than 2 absents or 3 lates this month)
      const atRiskEmployees = [];
      for (const emp of employees.filter(e => e.status === 'active')) {
        const empAttendance = monthAttendance.filter(a => a.employeeId?.toString() === emp._id.toString());
        const absents = empAttendance.filter(a => a.status === 'absent').length;
        const lates = empAttendance.filter(a => a.status === 'late').length;
        if (absents > 2 || lates > 3) {
          atRiskEmployees.push({
            id: emp._id.toString(),
            name: `${emp.firstName} ${emp.lastName}`,
            absents,
            lates,
          });
        }
      }

      // Generate alerts
      const alerts = [];
      if (percentage < 75) {
        alerts.push({
          type: 'critical',
          message: `Low attendance today: ${percentage}% present`,
          priority: 'high',
          emoji: '🚨',
        });
      }
      if (pendingLeaves > 5) {
        alerts.push({
          type: 'warning',
          message: `${pendingLeaves} leave requests pending approval`,
          priority: 'medium',
          emoji: '⏰',
        });
      }
      if (unpaidCount > 0) {
        alerts.push({
          type: 'warning',
          message: `${unpaidCount} payrolls pending payment`,
          priority: 'medium',
          emoji: '💰',
        });
      }
      if (atRiskEmployees.length > 0) {
        alerts.push({
          type: 'critical',
          message: `${atRiskEmployees.length} employees with attendance issues`,
          priority: 'high',
          emoji: '⚠️',
        });
      }

      return {
        role: 'admin',
        attendance: {
          presentToday,
          absentToday,
          lateToday,
          halfDayToday,
          totalToday,
          percentage,
          presentMonth,
          lateMonth,
          absentMonth,
          weeklyTrend,
        },
        leaves: {
          pending: pendingLeaves,
          approved: approvedLeaves,
          rejected: 0, // Can be calculated if needed
        },
        payroll: {
          totalPayroll,
          paidCount,
          unpaidCount,
          employeeCount: currentMonthPayroll.length,
          lastMonthComparison: Math.round(payrollChange),
        },
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          atRiskCount: atRiskEmployees.length,
          atRiskEmployees,
        },
        alerts,
      };
    } else {
      // Employee view - get personal data only
      const myEmployeeId = employeeId || '';
      
      // Today's status
      const todayRecord = await this.attendanceModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        employeeId: new Types.ObjectId(myEmployeeId),
        date: { $gte: startOfToday, $lte: endOfToday },
      }).exec();

      // Monthly attendance
      const myAttendance = await this.attendanceModel.find({
        tenantId: new Types.ObjectId(tenantId),
        employeeId: new Types.ObjectId(myEmployeeId),
        date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth },
      }).exec();

      const presentDays = myAttendance.filter(a => a.status === 'present').length;
      const lateDays = myAttendance.filter(a => a.status === 'late').length;
      const absentDays = myAttendance.filter(a => a.status === 'absent').length;
      const workingDays = 22; // Approximate working days in a month
      const attendancePercentage = Math.round((presentDays / workingDays) * 100);

      // Monthly trend
      const monthlyTrend = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        const record = myAttendance.find(a => 
          new Date(a.date).toDateString() === date.toDateString()
        );
        monthlyTrend.push({
          date: date.toISOString().split('T')[0],
          status: record ? record.status : 'no_record',
          checkIn: record?.checkIn || null,
        });
      }

      // Leave stats
      const myLeaves = await this.leaveModel.find({
        tenantId: new Types.ObjectId(tenantId),
        employeeId: new Types.ObjectId(myEmployeeId),
      }).exec();

      const usedLeaves = myLeaves
        .filter(l => l.status === 'approved')
        .reduce((sum, l) => sum + (l.days || 0), 0);
      const pendingLeaves = myLeaves.filter(l => l.status === 'pending').length;
      const annualAllocation = 24; // Default annual leave allocation
      const leaveBalance = annualAllocation - usedLeaves;

      // Payroll stats
      const myPayroll = await this.payrollModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        employeeId: new Types.ObjectId(myEmployeeId),
        month: today.getMonth() + 1,
        year: today.getFullYear(),
      }).exec();

      // Generate personal alerts
      const alerts = [];
      if (attendancePercentage < 75) {
        alerts.push({
          type: 'warning',
          message: 'Your attendance is below 75%. Please improve.',
          priority: 'high',
          emoji: '⚠️',
        });
      }
      if (lateDays > 2) {
        alerts.push({
          type: 'warning',
          message: `You've been late ${lateDays} times this month.`,
          priority: 'medium',
          emoji: '⏰',
        });
      }
      if (attendancePercentage >= 95) {
        alerts.push({
          type: 'positive',
          message: 'Excellent attendance! Keep it up! 🌟',
          priority: 'low',
          emoji: '🔥',
        });
      }

      return {
        role: 'employee',
        attendance: {
          todayStatus: todayRecord?.status || 'not_marked',
          checkIn: todayRecord?.checkIn || null,
          checkOut: todayRecord?.checkOut || null,
          percentage: attendancePercentage,
          presentDays,
          lateDays,
          absentDays,
          monthlyTrend,
        },
        leaves: {
          balance: leaveBalance,
          used: usedLeaves,
          pending: pendingLeaves,
          annualAllocation,
        },
        payroll: {
          netSalary: myPayroll?.netSalary || 0,
          baseSalary: myPayroll?.baseSalary || 0,
          status: myPayroll?.isPaid ? 'paid' : 'pending',
          month: today.getMonth() + 1,
          year: today.getFullYear(),
        },
        alerts,
      };
    }
  }

  async getEmployeeReport(employeeId: string, tenantId: string) {
    // Get employee details
    const employee = await this.employeeModel.findById(employeeId).exec();
    if (!employee) {
      throw new Error('Employee not found');
    }

    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);

    // Get attendance history
    const attendance = await this.attendanceModel.find({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
    }).sort({ date: -1 }).limit(30).exec();

    // Get leave history
    const leaves = await this.leaveModel.find({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
    }).sort({ createdAt: -1 }).limit(10).exec();

    // Get payroll history
    const payrolls = await this.payrollModel.find({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
    }).sort({ year: -1, month: -1 }).limit(6).exec();

    // Calculate summary stats
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const attendanceScore = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    const punctualityScore = totalDays > 0 ? Math.round(((totalDays - lateDays) / totalDays) * 100) : 0;

    return {
      employee: {
        id: employee._id.toString(),
        name: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        department: employee.department,
        designation: employee.designation,
        joiningDate: employee.joiningDate,
        email: employee.email,
      },
      summary: {
        attendanceScore,
        punctualityScore,
        engagementScore: Math.round((attendanceScore + punctualityScore) / 2),
        riskLevel: attendanceScore < 75 ? 'HIGH' : attendanceScore < 85 ? 'MEDIUM' : 'LOW',
      },
      attendance: {
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        percentage: attendanceScore,
        recent: attendance.slice(0, 7),
      },
      leaves: {
        total: leaves.length,
        recent: leaves.slice(0, 5),
      },
      payroll: {
        recent: payrolls.slice(0, 3),
        averageSalary: payrolls.length > 0 
          ? Math.round(payrolls.reduce((sum, p) => sum + p.netSalary, 0) / payrolls.length)
          : 0,
      },
    };
  }
}

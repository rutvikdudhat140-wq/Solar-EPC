import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Filter, Download, Calendar, Clock, LogIn, LogOut,
  RefreshCw, CheckCircle, XCircle, AlertCircle, ChevronLeft,
  ChevronRight, Users, TrendingUp, Plus, Edit, Trash2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { attendanceApi, employeeApi } from '../services/hrmApi';

// ==================== STATUS CONFIGS ====================
const ATTENDANCE_STATUS = {
  present: { label: 'Present', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: CheckCircle },
  absent: { label: 'Absent', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle },
  late: { label: 'Late', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock },
  half_day: { label: 'Half Day', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: AlertCircle },
};

const ATTENDANCE_TYPE = {
  office: { label: 'Office', color: '#3b82f6' },
  site: { label: 'Site', color: '#f59e0b' },
  remote: { label: 'Remote', color: '#22c55e' },
};

// ==================== MAIN COMPONENT ====================
const AttendancePage = () => {
  // ==================== STATE ====================
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    type: 'office',
    notes: '',
  });

  // Analytics
  const [analytics, setAnalytics] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    avgHours: 0,
    trends: { present: 0, absent: 0, late: 0 }
  });

  // ==================== FETCH DATA ====================
  useEffect(() => {
    fetchEmployees();
    fetchTodaySummary();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [dateFilter, customDate, dateRange, statusFilter, employeeFilter]);

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.getAll();
      const data = response.data?.data || response.data || [];
      setEmployees(data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    }
  };

  const fetchTodaySummary = async () => {
    try {
      const response = await attendanceApi.getTodaySummary();
      const data = response.data?.data || response.data;
      setTodaySummary(data);

      const totalEmployees = employees.length || data?.total || 0;
      const presentToday = data?.present || 0;
      const lateToday = data?.late || 0;
      const absentToday = totalEmployees - presentToday - lateToday;

      setAnalytics({
        totalEmployees,
        presentToday,
        absentToday: absentToday > 0 ? absentToday : 0,
        lateToday,
        avgHours: data?.avgHours || 0,
        trends: {
          present: presentToday,
          absent: absentToday > 0 ? absentToday : 0,
          late: lateToday
        }
      });
    } catch (error) {
      toast.error('Failed to fetch today summary');
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      let params = {};

      if (dateFilter === 'today') {
        params.startDate = format(new Date(), 'yyyy-MM-dd');
        params.endDate = format(new Date(), 'yyyy-MM-dd');
      } else if (dateFilter === 'custom' && customDate) {
        params.startDate = customDate;
        params.endDate = customDate;
      } else if (dateFilter === 'range' && dateRange.start && dateRange.end) {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
      } else if (dateFilter === 'week') {
        params.startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        params.endDate = format(new Date(), 'yyyy-MM-dd');
      } else if (dateFilter === 'month') {
        params.startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        params.endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      }

      if (employeeFilter !== 'all') {
        params.employeeId = employeeFilter;
      }

      const response = await attendanceApi.getAll(params);
      const data = response.data?.data || response.data || [];

      let filtered = data;
      if (statusFilter !== 'all') {
        filtered = data.filter(record => record.status === statusFilter);
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(record => {
          const empName = `${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''}`.toLowerCase();
          const empId = record.employeeId?.employeeId?.toLowerCase() || '';
          return empName.includes(query) || empId.includes(query);
        });
      }

      setAttendanceRecords(filtered);
      setCurrentPage(1);
    } catch (error) {
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  // ==================== HANDLERS ====================
  const handleCheckIn = async () => {
    if (!attendanceForm.employeeId) {
      toast.error('Please select an employee');
      return;
    }

    try {
      await attendanceApi.checkIn({
        employeeId: attendanceForm.employeeId,
        type: attendanceForm.type,
        notes: attendanceForm.notes,
      });
      toast.success('Check-in successful');
      setShowCheckInModal(false);
      resetCheckInForm();
      fetchAttendance();
      fetchTodaySummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async (employeeId) => {
    try {
      await attendanceApi.checkOut({ employeeId });
      toast.success('Check-out successful');
      fetchAttendance();
      fetchTodaySummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check out');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setAttendanceForm({
      employeeId: record.employeeId?._id || record.employeeId,
      type: record.type || 'office',
      notes: record.notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingRecord) return;
    try {
      await attendanceApi.update(editingRecord._id, {
        type: attendanceForm.type,
        notes: attendanceForm.notes,
      });
      toast.success('Attendance updated successfully');
      setShowEditModal(false);
      setEditingRecord(null);
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to update attendance');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) return;

    try {
      await attendanceApi.delete(id);
      toast.success('Attendance record deleted');
      fetchAttendance();
      fetchTodaySummary();
    } catch (error) {
      toast.error('Failed to delete attendance record');
    }
  };

  const resetCheckInForm = () => {
    setAttendanceForm({ employeeId: '', type: 'office', notes: '' });
  };

  // ==================== EXPORT TO CSV ====================
  const exportToCSV = () => {
    const headers = ['Employee Name', 'Employee ID', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Status', 'Type'];

    const rows = filteredRecords.map(record => [
      `${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''}`,
      record.employeeId?.employeeId || '',
      format(new Date(record.date), 'dd MMM yyyy'),
      record.checkIn ? format(new Date(record.checkIn), 'hh:mm a') : '-',
      record.checkOut ? format(new Date(record.checkOut), 'hh:mm a') : '-',
      record.totalHours || 0,
      record.status || 'absent',
      record.type || 'office'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Attendance exported successfully');
  };

  // ==================== PAGINATION ====================
  const filteredRecords = useMemo(() => attendanceRecords, [attendanceRecords]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // ==================== TABLE COLUMNS ====================
  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white flex items-center justify-center font-bold text-sm">
            {record.employeeId?.firstName?.[0]}{record.employeeId?.lastName?.[0]}
          </div>
          <div>
            <p className="font-semibold text-sm">{record.employeeId?.firstName} {record.employeeId?.lastName}</p>
            <p className="text-xs text-[var(--text-muted)]">{record.employeeId?.employeeId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (val) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--text-muted)]" />
          <span className="text-sm">{format(new Date(val), 'dd MMM yyyy')}</span>
        </div>
      ),
    },
    {
      key: 'checkIn',
      header: 'Check In',
      render: (val) => val ? (
        <div className="flex items-center gap-2 text-[var(--green)]">
          <LogIn size={14} />
          <span className="text-sm font-medium">{format(new Date(val), 'hh:mm a')}</span>
        </div>
      ) : (
        <span className="text-sm text-[var(--text-muted)]">-</span>
      ),
    },
    {
      key: 'checkOut',
      header: 'Check Out',
      render: (val) => val ? (
        <div className="flex items-center gap-2 text-[var(--primary)]">
          <LogOut size={14} />
          <span className="text-sm font-medium">{format(new Date(val), 'hh:mm a')}</span>
        </div>
      ) : (
        <span className="text-sm text-[var(--text-muted)]">-</span>
      ),
    },
    {
      key: 'totalHours',
      header: 'Hours',
      render: (val) => (
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {val ? `${val} hrs` : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => {
        const config = ATTENDANCE_STATUS[val] || ATTENDANCE_STATUS.absent;
        const Icon = config.icon;
        return (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              color: config.color,
              background: config.bg,
              border: `1px solid ${config.color}20`
            }}
          >
            <Icon size={12} />
            {config.label}
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Type',
      render: (val) => {
        const type = ATTENDANCE_TYPE[val] || ATTENDANCE_TYPE.office;
        return (
          <span
            className="px-2 py-1 rounded text-xs font-medium"
            style={{ color: type.color, background: `${type.color}15` }}
          >
            {type.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, record) => (
        <div className="flex items-center gap-1">
          {!record.checkIn && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAttendanceForm({ ...attendanceForm, employeeId: record.employeeId?._id });
                setShowCheckInModal(true);
              }}
              className="text-xs text-[var(--green)] border-[var(--border-base)] hover:bg-[var(--bg-hover)]"
            >
              <LogIn size={12} className="mr-1" /> Check In
            </Button>
          )}
          {record.checkIn && !record.checkOut && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCheckOut(record.employeeId?._id)}
              className="text-xs text-[var(--primary)] border-[var(--border-base)] hover:bg-[var(--bg-hover)]"
            >
              <LogOut size={12} className="mr-1" /> Check Out
            </Button>
          )}
          <button
            onClick={() => handleDelete(record._id)}
            className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // ==================== RENDER ====================
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Attendance Management"
        subtitle="Track and manage employee attendance records"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportToCSV} className="flex items-center gap-2">
              <Download size={16} />
              Export CSV
            </Button>
            <Button onClick={() => setShowCheckInModal(true)} className="flex items-center gap-2">
              <LogIn size={16} />
              Quick Check In
            </Button>
          </div>
        }
      />

      {/* KPI Cards Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <TrendingUp size={20} className="text-[var(--primary)]" />
            Attendance Dashboard
          </h3>
          <Button onClick={() => setShowCheckInModal(true)} className="flex items-center gap-2">
            <LogIn size={16} />
            Add Attendance
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total Employees"
            value={analytics.totalEmployees}
            icon={Users}
            variant="blue"
            sub="Total staff"
          />
          <KPICard
            label="Present Today"
            value={analytics.presentToday}
            icon={CheckCircle}
            variant="emerald"
            trend={`${analytics.totalEmployees > 0 ? Math.round((analytics.presentToday / analytics.totalEmployees) * 100) : 0}%`}
            trendUp={true}
          />
          <KPICard
            label="Absent Today"
            value={analytics.absentToday}
            icon={XCircle}
            variant="red"
            trend={`${analytics.totalEmployees > 0 ? Math.round((analytics.absentToday / analytics.totalEmployees) * 100) : 0}%`}
            trendUp={false}
          />
          <KPICard
            label="Late Today"
            value={analytics.lateToday}
            icon={Clock}
            variant="amber"
            trend={`${analytics.totalEmployees > 0 ? Math.round((analytics.lateToday / analytics.totalEmployees) * 100) : 0}%`}
            trendUp={false}
          />
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <TrendingUp size={20} className="text-[var(--primary)]" />
            Today's Attendance Overview
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--green)]" />
              <span>Present: {analytics.trends.present}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Absent: {analytics.trends.absent}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Late: {analytics.trends.late}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-4 bg-[var(--bg-elevated)] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-[var(--green)] transition-all duration-500"
            style={{ width: `${analytics.totalEmployees > 0 ? (analytics.presentToday / analytics.totalEmployees) * 100 : 0}%` }}
          />
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${analytics.totalEmployees > 0 ? (analytics.absentToday / analytics.totalEmployees) * 100 : 0}%` }}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${analytics.totalEmployees > 0 ? (analytics.lateToday / analytics.totalEmployees) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder="Search by employee name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {/* Date Filter */}
          <Select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-40 h-10"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Date</option>
            <option value="range">Date Range</option>
          </Select>

          {/* Custom Date */}
          {dateFilter === 'custom' && (
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-40 h-10"
            />
          )}

          {/* Date Range */}
          {dateFilter === 'range' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-36 h-10"
              />
              <span className="text-[var(--text-muted)]">to</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-36 h-10"
              />
            </div>
          )}

          {/* Employee Filter */}
          <Select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-44 h-10"
          >
            <option value="all">All Employees</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-36 h-10"
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="half_day">Half Day</option>
          </Select>

          {/* Refresh */}
          <Button variant="outline" onClick={fetchAttendance} className="flex items-center gap-2">
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock size={18} className="text-[var(--primary)]" />
            Attendance Records
          </h3>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span>Showing {filteredRecords.length} records</span>
            <span className="mx-2">|</span>
            <span>Page {currentPage} of {totalPages || 1}</span>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginatedRecords}
          emptyText="No attendance records found."
          loading={loading}
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-muted)]">Items per page:</span>
              <Select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-20 h-8"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page =>
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, idx, arr) => (
                    <React.Fragment key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-2 text-[var(--text-muted)]">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${currentPage === page
                          ? 'bg-[var(--primary)] text-white'
                          : 'hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                          }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Check In Modal */}
      <Modal
        open={showCheckInModal}
        onClose={() => {
          setShowCheckInModal(false);
          resetCheckInForm();
        }}
        title="Mark Attendance - Check In"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCheckInModal(false);
                resetCheckInForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCheckIn} disabled={!attendanceForm.employeeId}>
              <LogIn size={16} className="mr-2" />
              Check In
            </Button>
          </div>
        }
      >
        <FormField label="Select Employee">
          <Select
            value={attendanceForm.employeeId}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, employeeId: e.target.value })}
          >
            <option value="">Choose an employee</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.firstName} {emp.lastName} ({emp.employeeId})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Attendance Type" className="mt-4">
          <Select
            value={attendanceForm.type}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, type: e.target.value })}
          >
            <option value="office">Office</option>
            <option value="site">Site</option>
            <option value="remote">Remote</option>
          </Select>
        </FormField>

        <FormField label="Notes (Optional)" className="mt-4">
          <Textarea
            value={attendanceForm.notes}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
            placeholder="Add any notes..."
            rows={2}
          />
        </FormField>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRecord(null);
        }}
        title="Edit Attendance"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowEditModal(false);
                setEditingRecord(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate}>
              <Edit size={16} className="mr-2" />
              Update
            </Button>
          </div>
        }
      >
        <div className="mb-4">
          <p className="text-sm text-[var(--text-muted)]">Employee</p>
          <p className="font-medium">
            {editingRecord?.employeeId?.firstName} {editingRecord?.employeeId?.lastName}
          </p>
        </div>

        <FormField label="Attendance Type">
          <Select
            value={attendanceForm.type}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, type: e.target.value })}
          >
            <option value="office">Office</option>
            <option value="site">Site</option>
            <option value="remote">Remote</option>
          </Select>
        </FormField>

        <FormField label="Notes" className="mt-4">
          <Textarea
            value={attendanceForm.notes}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
            placeholder="Add any notes..."
            rows={2}
          />
        </FormField>
      </Modal>
    </div>
  );
};

export default AttendancePage;

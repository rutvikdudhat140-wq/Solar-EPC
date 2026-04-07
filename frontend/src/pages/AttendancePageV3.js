// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ADVANCED ATTENDANCE MANAGEMENT SYSTEM V3.0                              ║
// ║  Professional flat design · Maximum data visibility · 75/25 layout       ║
// ║  Comprehensive features · Real-time calendar · Bulk operations           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Filter, Download, Calendar, Clock, LogIn, LogOut,
  RefreshCw, CheckCircle, XCircle, AlertCircle, Users,
  MapPin, Wifi, Building, Home, TrendingUp, ChevronLeft,
  ChevronRight, Plus, Edit, Trash2, X, Check, User, Building2,
  Timer, AlertTriangle, Navigation, QrCode, Camera,
  Settings
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, addDays, isSameDay } from 'date-fns';
import { cn } from '../lib/utils';

import { PageHeader } from '../components/ui/PageHeader';
import KpiCards from '../components/hrm/KpiCards';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import AttendancePolicySettings from './AttendancePolicySettings';
import { attendanceApi, employeeApi } from '../services/hrmApi';
import { useAuth } from '../context/AuthContext';
import { useDataScope } from '../hooks/useDataScope';
import { usePermissions } from '../hooks/usePermissions';
import { api } from '../lib/apiClient';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// ==================== CONSTANTS ====================
const ATTENDANCE_STATUS = {
  present: { label: 'Present', color: '#22c55e', emoji: '✅', icon: CheckCircle },
  absent: { label: 'Absent', color: '#ef4444', emoji: '❌', icon: XCircle },
  late: { label: 'Late', color: '#f59e0b', emoji: '⚠️', icon: AlertTriangle },
  half_day: { label: 'Half Day', color: '#f59e0b', emoji: '🕐', icon: Clock },
  wfh: { label: 'Work From Home', color: '#3b82f6', emoji: '🏠', icon: Home },
  holiday: { label: 'Holiday', color: '#a855f7', emoji: '🎉', icon: Calendar },
  on_leave: { label: 'On Leave', color: '#6b7280', emoji: '📋', icon: AlertCircle },
};

const WORK_MODE = {
  office: { label: 'Office', color: '#3b82f6', icon: Building },
  remote: { label: 'Remote', color: '#22c55e', icon: Wifi },
  hybrid: { label: 'Hybrid', color: '#a855f7', icon: Building2 },
  site: { label: 'Site', color: '#f59e0b', icon: Navigation },
};

// ==================== ATTENDANCE VIEW MODAL ====================
const AttendanceViewModal = ({ record, onClose, onEdit }) => {
  if (!record) return null;
  const emp = record.employeeId || {};
  const initial = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase() || '?';
  const statusCfg = ATTENDANCE_STATUS[record.status] || ATTENDANCE_STATUS.absent;
  const workCfg = WORK_MODE[record.type] || WORK_MODE.office;
  const StatusIcon = statusCfg.icon;
  const WorkIcon = workCfg.icon;

  const InfoRow = ({ icon: Icon, label, value, color }) => value ? (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color || 'var(--primary)'}15` }}>
        <Icon size={14} style={{ color: color || 'var(--primary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{value}</p>
      </div>
    </div>
  ) : null;

  return (
    <Modal open={!!record} onClose={onClose} title="" size="lg" footer={
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
          <X size={13} /> Close
        </button>
        <button onClick={() => { onClose(); onEdit(record); }} className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-[var(--primary)] text-white hover:opacity-90">
          <Edit size={13} /> Edit Record
        </button>
      </div>
    }>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl mb-4 p-5 border border-[var(--border-base)]"
        style={{ background: `linear-gradient(135deg, ${statusCfg.color}18, ${statusCfg.color}05, transparent)` }}>
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-6 translate-x-6" style={{ background: `${statusCfg.color}10` }} />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl text-white flex items-center justify-center font-bold text-lg shadow-lg"
            style={{ background: `linear-gradient(135deg, var(--primary), var(--accent))` }}>{initial}</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{emp.firstName} {emp.lastName}</h2>
            <p className="text-sm text-[var(--text-muted)]">{emp.employeeId} · {emp.department || 'N/A'}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                style={{ color: statusCfg.color, background: `${statusCfg.color}15`, borderColor: `${statusCfg.color}30` }}>
                <StatusIcon size={11} /> {statusCfg.label}
              </span>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ color: workCfg.color, background: `${workCfg.color}15` }}>
                <WorkIcon size={11} /> {workCfg.label}
              </span>
              {record.status === 'late' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">⚠️ Late Mark</span>
              )}
              {record.isEarlyExit && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">🚨 Early Exit</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">{record.date ? format(new Date(record.date), 'EEE') : ''}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{record.date ? format(new Date(record.date), 'dd') : '-'}</p>
            <p className="text-xs text-[var(--text-muted)]">{record.date ? format(new Date(record.date), 'MMM yyyy') : ''}</p>
          </div>
        </div>
      </div>

      {/* Time Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-4 rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1"><LogIn size={14} className="text-[var(--green)]" /><span className="text-xs text-[var(--green)] font-medium">Check-In</span></div>
          <p className="text-2xl font-bold text-[var(--green)]">{record.checkIn ? format(new Date(record.checkIn), 'hh:mm') : '--:--'}</p>
          <p className="text-[10px] text-[var(--green)]/70">{record.checkIn ? format(new Date(record.checkIn), 'a') : ''}</p>
        </div>
        <div className="p-4 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1"><LogOut size={14} className="text-[var(--primary)]" /><span className="text-xs text-[var(--primary)] font-medium">Check-Out</span></div>
          <p className="text-2xl font-bold text-[var(--primary)]">{record.checkOut ? format(new Date(record.checkOut), 'hh:mm') : '--:--'}</p>
          <p className="text-[10px] text-[var(--primary)]/70">{record.checkOut ? format(new Date(record.checkOut), 'a') : 'Not checked out'}</p>
        </div>
      </div>

      {/* Hours Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Hours', value: `${record.totalHours || 0}h`, color: 'var(--primary)' },
          { label: 'Break Time', value: `${record.breakTime || 0}m`, color: '#f59e0b' },
          { label: 'Overtime', value: record.overtimeHours > 0 ? `+${record.overtimeHours}h` : '-', color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl border border-[var(--border-base)] bg-[var(--bg-elevated)] text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="space-y-2">
        {record.location && <InfoRow icon={MapPin} label="Location" value={record.location} color="#f59e0b" />}
        {record.notes && (
          <div className="p-3 rounded-xl bg-[var(--bg-elevated)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-[var(--text-primary)]">{record.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ==================== MAIN COMPONENT ====================
const AttendancePageV3 = () => {
  const [mounted, setMounted] = useState(false);

  // Get permissions and user info
  const { 
    canView, 
    canCreate, 
    canEdit, 
    canDelete, 
    canExport,
    columns: permissionColumns 
  } = usePermissions('attendance');
  
  const { user, getDataScope } = useAuth();
  
  // Check if data scope is OWN (only view own data)
  const attendanceDataScope = getDataScope('attendance');
  const isOwnScope = attendanceDataScope === 'OWN';
  const currentEmployee = user?.employee;

  // ==================== CORE STATE ====================
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);

  // ==================== FILTER STATE ====================
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workModeFilter, setWorkModeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
  const [lateFilter, setLateFilter] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // ==================== CALENDAR STATE ====================
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedCalendarDateForView, setSelectedCalendarDateForView] = useState(null);
  const calendarRef = useRef(null);

  // ==================== PAGINATION STATE ====================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // ==================== MODAL STATE ====================
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    type: 'office',
    location: '',
    notes: '',
  });

  // ==================== BULK OPERATIONS STATE ====================
  const [selectedIds, setSelectedIds] = useState([]);

  // ==================== VIEW STATE ====================
  const [viewAttendance, setViewAttendance] = useState(null);

  // ==================== DASHBOARD METRICS ====================
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin' || user?.isSuperAdmin === true;

  const fetchDashboardMetrics = async () => {
    try {
      const response = await api.get('/hrm/dashboard-metrics');
      console.log('[DEBUG] Dashboard metrics API response:', response.data);
      const metrics = response.data?.data || response.data;
      console.log('[DEBUG] Extracted metrics:', metrics);
      setDashboardMetrics(metrics || null);
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
      setDashboardMetrics({
        attendance: { percentage: 0, presentToday: 0, totalToday: 0 },
        leaves: { pending: 0 },
        payroll: { totalPayroll: 0, unpaidCount: 0 },
        employees: { atRiskCount: 0 }
      });
    }
  };

  // ==================== GEOLOCATION (MANDATORY) ====================
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [geoLocationText, setGeoLocationText] = useState('');

  const requestLocation = async () => {
    if (!('geolocation' in navigator)) {
      toast.error('Location is not supported in this browser');
      setGeoEnabled(false);
      setGeoLocationText('');
      return null;
    }

    setGeoLoading(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const lat = position?.coords?.latitude;
      const lng = position?.coords?.longitude;
      const accuracy = position?.coords?.accuracy;
      const ts = position?.timestamp ? new Date(position.timestamp) : new Date();

      let address = '';
      try {
        const res = await attendanceApi.reverseGeocode(lat, lng);
        console.log('[DEBUG] Reverse geocode response:', res.data);
        // The API returns { success: true, data: { address: "..." } }
        if (res.data?.success && res.data?.data?.address) {
          address = res.data.data.address;
        } else if (res.data?.address) {
          address = res.data.address;
        }
      } catch (e) {
        console.error('Reverse geocode failed:', e);
        address = '';
      }

      const coordsText = `Lat ${Number(lat).toFixed(6)}, Lng ${Number(lng).toFixed(6)}${accuracy ? ` (±${Math.round(accuracy)}m)` : ''}`;
      const text = address
        ? `${address} · ${coordsText} · ${format(ts, 'dd MMM yyyy, hh:mm a')}`
        : `${coordsText} · ${format(ts, 'dd MMM yyyy, hh:mm a')}`;

      console.log('[DEBUG] Setting location text to:', text);
      setGeoEnabled(true);
      setGeoLocationText(text);
      return text;
    } catch (err) {
      setGeoEnabled(false);
      setGeoLocationText('');

      if (err?.code === 1) {
        toast.error('Location permission is required to mark attendance');
      } else {
        toast.error('Unable to fetch location. Please enable GPS and try again');
      }
      return null;
    } finally {
      setGeoLoading(false);
    }
  };

  // ==================== MOUNT EFFECT ====================
  useEffect(() => {
    setMounted(true);
    requestLocation();
    fetchEmployees();
    fetchTodaySummary();
    fetchAttendance();
    fetchDashboardMetrics();
  }, []);

  useEffect(() => {
    if (mounted) fetchAttendance();
  }, [mounted, dateRangeFilter, selectedCalendarDate]);

  // ==================== FETCH DATA ====================
  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.getAll();
      const data = response.data?.data || response.data || [];
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to fetch employees');
    }
  };

  const fetchTodaySummary = async () => {
    try {
      console.log('[DEBUG] Fetching today summary...');
      const response = await attendanceApi.getTodaySummary();
      console.log('[DEBUG] Today summary response:', response);
      const data = response.data?.data || response.data || response;
      console.log('[DEBUG] Setting today summary:', data);
      setTodaySummary(data);
    } catch (error) {
      console.error('[DEBUG] Failed to fetch today summary:', error);
      console.error('[DEBUG] Error response:', error.response?.data);
      // Set default values on error
      setTodaySummary({
        date: new Date(),
        total: 0,
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        checkedOut: 0,
      });
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      let startDate, endDate;

      if (selectedCalendarDate) {
        const d = new Date(selectedCalendarDate);
        startDate = startOfDay(d);
        endDate = endOfDay(d);
      } else if (dateRangeFilter.start && dateRangeFilter.end) {
        startDate = startOfDay(new Date(dateRangeFilter.start));
        endDate = endOfDay(new Date(dateRangeFilter.end));
      } else {
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
      }

      const response = await attendanceApi.getAll({ startDate, endDate });
      const data = response.data?.data || response.data || [];
      setAttendanceRecords(data);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      toast.error('Failed to fetch attendance records');
      setAttendanceRecords([]);
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

    const locText = await requestLocation();
    if (!locText) return;

    try {
      await attendanceApi.checkIn({ ...attendanceForm, location: locText });
      toast.success('Check-in successful');
      setShowCheckInModal(false);
      resetForm();
      fetchAttendance();
      fetchTodaySummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async (employeeId) => {
    const locText = await requestLocation();
    if (!locText) return;

    try {
      await attendanceApi.checkOut({ employeeId, location: locText });
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
      location: record.location || '',
      notes: record.notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingRecord) return;

    try {
      await attendanceApi.update(editingRecord._id, attendanceForm);
      toast.success('Attendance updated successfully');
      setShowEditModal(false);
      setEditingRecord(null);
      resetForm();
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

  const resetForm = () => {
    setAttendanceForm({ employeeId: '', type: 'office', location: '', notes: '' });
  };

  // ==================== BULK OPERATIONS ====================
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedRecords.map(r => r._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkMarkPresent = async () => {
    if (selectedIds.length === 0) return;

    try {
      await attendanceApi.bulkUpdate({ ids: selectedIds, status: 'present' });
      toast.success(`${selectedIds.length} record(s) marked as present`);
      setSelectedIds([]);
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to update records');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} attendance record(s)?`)) return;

    try {
      await Promise.all(selectedIds.map(id => attendanceApi.delete(id)));
      toast.success(`${selectedIds.length} record(s) deleted`);
      setSelectedIds([]);
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to delete records');
    }
  };

  // ==================== EXPORT ====================
  const handleExport = (format) => {
    toast.success(`Exporting to ${format.toUpperCase()}...`);

    const headers = ['Employee Name', 'Employee ID', 'Department', 'Date', 'Check In', 'Check Out',
      'Total Hours', 'Break Time', 'Overtime', 'Status', 'Work Mode', 'Location', 'Late Mark', 'Early Exit'];

    const rows = filteredRecords.map(record => [
      `${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''}`,
      record.employeeId?.employeeId || '',
      record.employeeId?.department || '',
      format(new Date(record.date), 'dd MMM yyyy'),
      record.checkIn ? format(new Date(record.checkIn), 'hh:mm a') : '-',
      record.checkOut ? format(new Date(record.checkOut), 'hh:mm a') : '-',
      record.totalHours || 0,
      record.breakTime || 0,
      record.overtimeHours || 0,
      record.status || 'absent',
      record.type || 'office',
      record.location || '-',
      record.isLate ? 'Yes' : 'No',
      record.isEarlyExit ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ==================== RESET FILTERS ====================
  const resetFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setWorkModeFilter('all');
    setDateRangeFilter({ start: '', end: '' });
    setLateFilter(false);
    setSelectedCalendarDate(null);
  };

  // ==================== CALENDAR DATE CLICK ====================
  const handleCalendarDateClick = (dateStr) => {
    if (selectedCalendarDate === dateStr) {
      setSelectedCalendarDate(null);
    } else {
      setSelectedCalendarDate(dateStr);
    }
  };

  // ==================== DEPARTMENTS ====================
  const departments = useMemo(() => {
    const depts = new Set(employees.map(emp => emp.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // ==================== KPI CALCULATIONS ====================
  const kpiData = useMemo(() => {
    const totalEmployees = employees.length;
    const presentToday = todaySummary?.present || 0;
    const absentToday = todaySummary?.absent || 0;
    const lateToday = todaySummary?.late || 0;
    const halfDayToday = todaySummary?.halfDay || 0;
    const checkedOut = todaySummary?.checkedOut || 0;

    return [
      { label: 'Total Employees', value: totalEmployees, icon: Users, variant: 'blue' },
      { label: 'Present Today', value: presentToday, icon: CheckCircle, variant: 'emerald' },
      { label: 'Absent Today', value: absentToday, icon: XCircle, variant: 'red' },
      { label: 'Late Today', value: lateToday, icon: AlertTriangle, variant: 'amber' },
      { label: 'Half Day', value: halfDayToday, icon: Clock, variant: 'amber' },
      { label: 'Checked Out', value: checkedOut, icon: LogOut, variant: 'blue' },
    ];
  }, [employees, todaySummary]);

  // ==================== FILTERED DATA ====================
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(record => {
      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const empName = `${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''}`.toLowerCase();
        const empId = record.employeeId?.employeeId?.toLowerCase() || '';
        if (!empName.includes(search) && !empId.includes(search)) return false;
      }

      // Department filter
      if (departmentFilter !== 'all') {
        if (record.employeeId?.department !== departmentFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (record.status !== statusFilter) return false;
      }

      // Work mode filter
      if (workModeFilter !== 'all') {
        if (record.type !== workModeFilter) return false;
      }

      // Late filter
      if (lateFilter) {
        if (record.status !== 'late') return false;
      }

      // Calendar date filter
      if (selectedCalendarDate) {
        const recordDate = format(new Date(record.date), 'yyyy-MM-dd');
        if (recordDate !== selectedCalendarDate) return false;
      }

      return true;
    });
  }, [attendanceRecords, searchQuery, departmentFilter, statusFilter, workModeFilter, lateFilter, selectedCalendarDate]);

  // ==================== PAGINATION ====================
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // ==================== TABLE COLUMNS ====================
  const tableColumns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedIds.length === paginatedRecords.length && paginatedRecords.length > 0}
          onChange={handleSelectAll}
          className="w-3 h-3 rounded border-[var(--border-base)]"
        />
      ),
      render: (_, record) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(record._id)}
          onChange={() => handleSelectOne(record._id)}
          className="w-3 h-3 rounded border-[var(--border-base)]"
        />
      ),
    },
    {
      key: 'employeeId',
      header: 'Employee',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: 'var(--primary)' }}
          >
            {record.employeeId?.firstName?.[0]}{record.employeeId?.lastName?.[0]}
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {record.employeeId?.firstName} {record.employeeId?.lastName}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">{record.employeeId?.employeeId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (_, record) => (
        <div className="flex items-center gap-1.5">
          <Building2 size={12} style={{ color: 'var(--primary)' }} />
          <span className="text-xs text-[var(--text-secondary)]">{record.employeeId?.department || '-'}</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (val) => (
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)]">{format(new Date(val), 'dd MMM yyyy')}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{format(new Date(val), 'EEEE')}</p>
        </div>
      ),
    },
    {
      key: 'checkIn',
      header: 'Check-In',
      render: (val) => val ? (
        <div className="flex items-center gap-1.5 text-[#22c55e]">
          <LogIn size={12} />
          <span className="text-xs font-medium">{format(new Date(val), 'hh:mm a')}</span>
        </div>
      ) : <span className="text-xs text-[var(--text-muted)]">-</span>,
    },
    {
      key: 'checkOut',
      header: 'Check-Out',
      render: (val) => val ? (
        <div className="flex items-center gap-1.5 text-[#3b82f6]">
          <LogOut size={12} />
          <span className="text-xs font-medium">{format(new Date(val), 'hh:mm a')}</span>
        </div>
      ) : <span className="text-xs text-[var(--text-muted)]">-</span>,
    },
    {
      key: 'totalHours',
      header: 'Total Hours',
      render: (val) => (
        <div className="flex items-center gap-1">
          <Timer size={12} style={{ color: 'var(--primary)' }} />
          <span className="text-xs font-semibold text-[var(--text-primary)]">{val || 0}h</span>
        </div>
      ),
    },
    {
      key: 'breakTime',
      header: 'Break Time',
      render: (val) => (
        <span className="text-xs text-[var(--text-secondary)]">{val || 0}m</span>
      ),
    },
    {
      key: 'overtimeHours',
      header: 'Overtime',
      render: (val) => val > 0 ? (
        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>+{val}h</span>
      ) : <span className="text-xs text-[var(--text-muted)]">-</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => {
        const config = ATTENDANCE_STATUS[val] || ATTENDANCE_STATUS.absent;
        const Icon = config.icon;
        return (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold"
            style={{ color: config.color, background: `${config.color}15`, border: `1px solid ${config.color}30` }}
          >
            <Icon size={10} />
            {config.label}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, record) => (
        <div className="flex items-center gap-1">
          {record.checkIn && !record.checkOut && (
            <button
              onClick={() => handleCheckOut(record.employeeId?._id || record.employeeId)}
              className="p-1 rounded hover:bg-[#3b82f6]/10 text-[var(--text-muted)] hover:text-[#3b82f6]"
              title="Check Out"
            >
              <LogOut size={12} />
            </button>
          )}
          <button
            onClick={() => handleEdit(record)}
            className="p-1 rounded hover:bg-[var(--primary)]/10 text-[var(--text-muted)] hover:text-[var(--primary)]"
            title="Edit"
          >
            <Edit size={12} />
          </button>
          <button
            onClick={() => handleDelete(record._id)}
            className="p-1 rounded hover:bg-[#ef4444]/10 text-[var(--text-muted)] hover:text-[#ef4444]"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Advanced Attendance Management"
        subtitle="Real-time tracking · GPS location · Face recognition · Bulk operations"
        actions={[
          {
            type: 'button',
            label: 'System Policy',
            icon: Settings,
            variant: 'secondary',
            onClick: () => setShowPolicyModal(true),
          },
          {
            type: 'button',
            label: 'View Calendar',
            icon: Calendar,
            variant: 'secondary',
            onClick: () => setShowCalendarModal(true),
          },
          {
            type: 'button',
            label: 'Mark Attendance',
            icon: Plus,
            variant: 'primary',
            disabled: geoLoading || !geoEnabled,
            onClick: async () => {
              const locText = await requestLocation();
              if (!locText) return;
              setShowCheckInModal(true);
            },
          },
          {
            type: 'button',
            label: 'Refresh',
            icon: RefreshCw,
            variant: 'secondary',
            onClick: () => {
              fetchAttendance();
              fetchTodaySummary();
            },
          },
        ]}
      />

      <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-[var(--border-base)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={14} className={geoEnabled ? 'text-[var(--green)]' : 'text-[var(--amber)]'} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)]">Location</p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {geoLoading
                ? 'Fetching location…'
                : geoEnabled
                  ? (geoLocationText || 'Location enabled')
                  : 'Location permission is required to mark attendance'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!geoEnabled && (
            <Button
              size="sm"
              variant="primary"
              loading={geoLoading}
              onClick={() => requestLocation()}
            >
              Enable Location
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards - Dynamic Role-Based */}
      <KpiCards 
        role={isAdmin ? 'admin' : 'employee'} 
        metrics={dashboardMetrics} 
      />

      <div className="p-3 rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)] space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-2">
          <div className="lg:col-span-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee…"
              className="h-9"
            />
          </div>
          <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="h-9">
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9">
            <option value="all">All Status</option>
            {Object.entries(ATTENDANCE_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
          <Select value={workModeFilter} onChange={(e) => setWorkModeFilter(e.target.value)} className="h-9">
            <option value="all">All Work Mode</option>
            {Object.entries(WORK_MODE).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateRangeFilter.start}
              onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
              className="h-9"
            />
            <Input
              type="date"
              value={dateRangeFilter.end}
              onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
              className="h-9"
            />
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={lateFilter}
              onChange={(e) => setLateFilter(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[var(--border-base)]"
            />
            Late Only
          </label>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => handleExport('csv')} disabled={!canExport()}>
              <Download size={14} /> CSV
            </Button>
            <Button size="sm" variant="secondary" onClick={() => resetFilters()}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      <DataTable
        columns={tableColumns}
        data={paginatedRecords}
        total={filteredRecords.length}
        page={currentPage}
        pageSize={itemsPerPage}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={() => { /* itemsPerPage is fixed in this page */ }}
        loading={loading}
        emptyText="No attendance records found."
        hideSearch
        hideColumnToggle={false}
        onRowClick={(row) => setViewAttendance(row)}
      />

      <AttendanceViewModal
        record={viewAttendance}
        onClose={() => setViewAttendance(null)}
        onEdit={(rec) => handleEdit(rec)}
      />

      <Modal
        open={showCheckInModal}
        onClose={() => {
          setShowCheckInModal(false);
          resetForm();
        }}
        title="Mark Attendance"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCheckInModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCheckIn} 
              className={cn(
                "bg-[var(--primary)] text-white hover:opacity-90",
                (!attendanceForm.employeeId || geoLoading || !geoEnabled) && "opacity-50 cursor-not-allowed"
              )}
            >
              <LogIn size={14} /> Check In
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <FormField label="Employee">
            <Select
              value={attendanceForm.employeeId}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, employeeId: e.target.value })}
              disabled={isOwnScope}
            >
              <option value="">Choose an employee</option>
              {(isOwnScope && currentEmployee?._id) ? (
                <option value={currentEmployee._id}>
                  {currentEmployee.firstName} {currentEmployee.lastName}
                </option>
              ) : (
                employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </option>
                ))
              )}
            </Select>
          </FormField>

          <FormField label="Work Mode">
            <Select
              value={attendanceForm.type}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, type: e.target.value })}
            >
              <option value="office">Office</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="site">Site</option>
            </Select>
          </FormField>

          <FormField label="Location">
            <Input value={geoLocationText} disabled placeholder="Enable location to fetch" />
          </FormField>

          <FormField label="Notes">
            <Textarea
              value={attendanceForm.notes}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
              placeholder="Notes…"
              rows={2}
            />
          </FormField>
        </div>
      </Modal>

      {showEditModal && (
        <Modal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingRecord(null);
            resetForm();
          }}
          title="Edit Attendance Record"
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRecord(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                <Edit size={14} /> Update
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="p-2 bg-[var(--bg-elevated)] rounded">
              <p className="text-xs text-[var(--text-muted)]">Employee</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {editingRecord?.employeeId?.firstName} {editingRecord?.employeeId?.lastName}
              </p>
            </div>

            <FormField label="Work Mode">
              <Select
                value={attendanceForm.type}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, type: e.target.value })}
              >
                <option value="office">Office</option>
                <option value="remote">Remote / Work From Home</option>
                <option value="hybrid">Hybrid</option>
                <option value="site">Site</option>
              </Select>
            </FormField>

            <FormField label="Location">
              <Input
                value={attendanceForm.location}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, location: e.target.value })}
                placeholder="Update location"
              />
            </FormField>

            <FormField label="Notes">
              <Textarea
                value={attendanceForm.notes}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                placeholder="Update notes..."
                rows={2}
              />
            </FormField>
          </div>
        </Modal>
      )}

      {showPolicyModal && (
        <Modal
          open={showPolicyModal}
          onClose={() => setShowPolicyModal(false)}
          title="Attendance Policy Settings"
          size="xl"
        >
          <div className="p-1">
            <AttendancePolicySettings />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AttendancePageV3;
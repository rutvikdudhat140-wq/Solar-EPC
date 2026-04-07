// Solar OS – EPC Edition — HRMPage.js (Human Resource Management)
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, Eye,
  Briefcase, UserCircle, Calendar, Clock, Wallet, TrendingUp,
  CheckCircle, XCircle, AlertCircle, ChevronDown, MoreVertical,
  FileText, CheckSquare, XSquare, RefreshCw, Building2, Building,
  LayoutGrid, List, IndianRupee, LogIn, LogOut, Timer, ShieldCheck,
  Settings, BadgeCheck, Mail, Phone, MapPin
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge'; // Fix component usage to match import name
import { employeeApi, attendanceApi, leaveApi, payrollApi, incrementApi, departmentApi } from '../services/hrmApi';
import { api } from '../lib/apiClient';
import { useQuery } from '@tanstack/react-query';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext'; // Fix component usage to match import name
import HrmPermissionsPage from './HrmPermissionsPage';
import AttendancePolicySettings from './AttendancePolicySettings';
import { toast } from '../components/ui/Toast';
import { CURRENCY } from '../config/app.config';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const fmt = CURRENCY.format;

// ==================== STATUS CONFIGS ====================
const EMPLOYEE_STATUS = {
  active: { label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  inactive: { label: 'Inactive', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  suspended: { label: 'Suspended', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  terminated: { label: 'Terminated', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const LEAVE_STATUS = {
  pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  approved: { label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const LEAVE_TYPES = {
  paid: { label: 'Paid Leave', color: '#3b82f6' },
  unpaid: { label: 'Unpaid Leave', color: '#64748b' },
  sick: { label: 'Sick Leave', color: '#ef4444' },
  casual: { label: 'Casual Leave', color: '#22c55e' },
  earned: { label: 'Earned Leave', color: '#a855f7' },
};

// ==================== MAIN COMPONENT ====================
const HRMPage = ({ activeTab: initialTab = 'employees', onNavigate }) => {
  const { user, can, getDataScope } = useAuth();
  const { getDataScope: settingsGetDataScope } = useSettings();

  // Use initialTab prop if provided, otherwise default to 'employees'
  const [activeTab, setActiveTab] = useState(initialTab || 'employees');

  // Sync with initialTab prop when it changes (for navigation from parent)
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      console.log('[DEBUG] Syncing activeTab with initialTab:', initialTab);
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin' || user?.isSuperAdmin;

  // SINGLE SOURCE OF TRUTH: Direct permission checks from AuthContext
  // Admin bypass: Admin users get all permissions automatically
  const canViewEmployees = isAdmin || can('employees', 'view');
  const canManageEmployees = isAdmin || can('employees', 'edit') || can('employees', 'create');
  const canDeleteEmployees = isAdmin || can('employees', 'delete');

  const canViewLeaves = isAdmin || can('leaves', 'view');
  const canApplyLeave = isAdmin || can('leaves', 'create');
  const canApproveLeave = isAdmin || can('leaves', 'approve');

  const canViewAttendance = isAdmin || can('attendance', 'view');
  const canCheckIn = isAdmin || can('attendance', 'checkin');
  const canCheckOut = isAdmin || can('attendance', 'checkout');
  const canManageAttendance = isAdmin || can('attendance', 'edit');

  const canViewPayroll = isAdmin || can('payroll', 'view');
  const canManagePayroll = isAdmin || can('payroll', 'edit') || can('payroll', 'create');
  const canApprovePayroll = isAdmin || can('payroll', 'approve');

  const canViewIncrements = isAdmin || can('increments', 'view');
  const canManageIncrements = isAdmin || can('increments', 'edit') || can('increments', 'create');

  const canViewDepartments = isAdmin || can('departments', 'view');
  const canManageDepartments = isAdmin || can('departments', 'edit') || can('departments', 'create');

  const canViewHrDashboard = isAdmin || can('hrm', 'view');

  // Get data scope for attendance - single source of truth
  const attendanceDataScope = getDataScope('attendance');
  const isAttendanceOwnScope = attendanceDataScope === 'OWN';

  // Employee State
  const [employees, setEmployees] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);
  const { customRoles, allRoles, assignCustomRoleToUser } = useSettings();
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showViewEmployeeModal, setShowViewEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeForm, setEmployeeForm] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    joiningDate: '',
    department: '',
    roleId: '',
    status: 'active',
  });

  // Attendance State
  const [attendance, setAttendance] = useState([]);
  // State - default to today's date
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    type: 'office',
    notes: '',
  });
  const [todayAttendance, setTodayAttendance] = useState({});
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all');

  // Leave State
  const [leaves, setLeaves] = useState([]);
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'paid',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Payroll State
  const [payrolls, setPayrolls] = useState([]);
  const [payrollSearch, setPayrollSearch] = useState('');
  const [payrollMonthFilter, setPayrollMonthFilter] = useState(new Date().getMonth() + 1);
  const [payrollYearFilter, setPayrollYearFilter] = useState(new Date().getFullYear());
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    bonus: 0,
  });

  // Increment State
  const [increments, setIncrements] = useState([]);
  const [incrementSearch, setIncrementSearch] = useState('');
  const [showIncrementModal, setShowIncrementModal] = useState(false);
  const [incrementForm, setIncrementForm] = useState({
    employeeId: '',
    previousSalary: 0,
    incrementPercentage: 0,
    newSalary: 0,
    effectiveFrom: '',
    reason: '',
  });

  // Department State
  const [departments, setDepartments] = useState([]);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    code: '',
    description: '',
    managerId: '',
  });

  // Fetch HRM roles from backend (created in Permission Matrix)
  const { data: hrmRoles = [] } = useQuery({
    queryKey: ['hrm-roles'],
    queryFn: async () => {
      const response = await api.get('/hrm/permissions/roles');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  useEffect(() => {
    fetchEmployees();
    fetchProjectManagers();
  }, []);

  useEffect(() => {
    if (isAttendanceOwnScope) {
      const myId = user?.id || user?._id || user?.sub;
      if (myId) {
        setAttendanceForm(prev => ({ ...prev, employeeId: String(myId) }));
      }
    }
  }, [isAttendanceOwnScope, user]);

  useEffect(() => {
    console.log('[HRM VISIBILITY]', {
      roleId: user?.roleId || user?.role,
      visibleTabs: {
        employees: canViewEmployees,
        attendance: canViewAttendance,
        leaves: canViewLeaves,
        payroll: canViewPayroll,
        increments: canViewIncrements,
        departments: canViewDepartments,
      }
    });
  }, [user, canViewEmployees, canViewAttendance, canViewLeaves, canViewPayroll, canViewIncrements, canViewDepartments]);

  useEffect(() => {
    if (activeTab === 'attendance' && canViewAttendance) fetchAttendance();
    if (activeTab === 'leaves' && canViewLeaves) fetchLeaves();
    if (activeTab === 'payroll' && canViewPayroll) fetchPayrolls();
    if (activeTab === 'increments' && canViewIncrements) fetchIncrements();
    if (activeTab === 'departments' && canViewDepartments) fetchDepartments();
  }, [activeTab, canViewAttendance, canViewLeaves, canViewPayroll, canViewIncrements, canViewDepartments]);

  // Debug: Track activeTab changes
  useEffect(() => {
    console.log('[DEBUG] activeTab changed to:', activeTab);
  }, [activeTab]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeApi.getAll();
      // API returns {success: true, data: [...employees]}
      const employeesData = response.data?.data || response.data || [];
      console.log('[DEBUG] Employee data from API:', employeesData.map(e => ({ 
        id: e.employeeId, 
        joiningDate: e.joiningDate,
        roleId: e.roleId 
      })));
      setEmployees(employeesData);
    } catch (error) {
      toast.error('Failed to fetch employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await attendanceApi.getAll({
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
      });
      const attendanceData = response.data?.data || response.data || [];
      setAttendance(attendanceData);
    } catch (error) {
      toast.error('Failed to fetch attendance');
      setAttendance([]);
    }
  };

  const fetchLeaves = async () => {
    try {
      const response = await leaveApi.getAll();
      const leavesData = response.data?.data || response.data || [];
      setLeaves(leavesData);
    } catch (error) {
      toast.error('Failed to fetch leaves');
      setLeaves([]);
    }
  };

  const fetchPayrolls = async () => {
    try {
      const response = await payrollApi.getAll();
      const payrollsData = response.data?.data || response.data || [];
      setPayrolls(payrollsData);
    } catch (error) {
      toast.error('Failed to fetch payrolls');
      setPayrolls([]);
    }
  };

  const fetchIncrements = async () => {
    try {
      const response = await incrementApi.getAll();
      const incrementsData = response.data?.data || response.data || [];
      setIncrements(incrementsData);
    } catch (error) {
      toast.error('Failed to fetch increments');
      setIncrements([]);
    }
  };

  const fetchProjectManagers = async () => {
    try {
      const response = await api.get('/projects/project-managers', { tenantId: 'solarcorp' });
      const pmData = response?.data?.projectManagers || [];
      setProjectManagers(pmData);
    } catch (error) {
      setProjectManagers([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAll();
      const departmentsData = response.data?.data || response.data || [];
      setDepartments(departmentsData);
    } catch (error) {
      toast.error('Failed to fetch departments');
      setDepartments([]);
    }
  };

  // Fetch departments when employee modal opens
  useEffect(() => {
    if (showEmployeeModal && canViewDepartments) {
      fetchDepartments();
    }
  }, [showEmployeeModal, canViewDepartments]);
  const handleCreateEmployee = async () => {
    // Validate required fields
    if (!employeeForm.roleId) {
      toast.error('Please select a role for the employee');
      return;
    }
    if (!employeeForm.employeeId || !employeeForm.firstName || !employeeForm.lastName || !employeeForm.email || !employeeForm.password || !employeeForm.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!employeeForm.joiningDate) {
      toast.error('Please select a joining date');
      return;
    }

    // Debug: Log the form data
    console.log('[DEBUG] Creating employee with data:', employeeForm);

    try {
      const response = await employeeApi.create(employeeForm);
      console.log('[DEBUG] Employee created successfully:', response.data);

      // If custom role assigned, update user override in settings
      const employeeId = response.data?.data?._id || response.data?._id;
      if (employeeId && employeeForm.roleId?.startsWith('custom_')) {
        try {
          await assignCustomRoleToUser(employeeId, employeeForm.roleId, 'Admin');
          console.log('[DEBUG] Custom role assigned to user:', employeeForm.roleId);
        } catch (roleError) {
          console.error('[DEBUG] Failed to assign custom role:', roleError);
        }
      }

      toast.success('Employee created successfully');
      setShowEmployeeModal(false);
      fetchEmployees();
      resetEmployeeForm();
    } catch (error) {
      console.error('[DEBUG] Failed to create employee:', error);
      console.error('[DEBUG] Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create employee');
    }
  };

  const handleUpdateEmployee = async () => {
    try {
      await employeeApi.update(selectedEmployee._id, employeeForm);

      // If custom role changed, update user override in settings
      const oldRoleId = selectedEmployee.roleId;
      const newRoleId = employeeForm.roleId;
      if (newRoleId?.startsWith('custom_') && oldRoleId !== newRoleId) {
        try {
          await assignCustomRoleToUser(selectedEmployee._id, newRoleId, 'Admin');
          console.log('[DEBUG] Custom role updated for user:', newRoleId);
        } catch (roleError) {
          console.error('[DEBUG] Failed to update custom role:', roleError);
        }
      }

      toast.success('Employee updated successfully');
      setShowEmployeeModal(false);
      fetchEmployees();
      setSelectedEmployee(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await employeeApi.delete(id);
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      joiningDate: '',
      department: '',
      roleId: '',
      status: 'active',
    });
  };

  const openEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEmployeeForm({
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      address: employee.address || '',
      joiningDate: employee.joiningDate ? format(new Date(employee.joiningDate), 'yyyy-MM-dd') : '',
      department: employee.department || '',
      roleId: employee.roleId || '',
      status: employee.status,
    });
    setShowEmployeeModal(true);
  };

  // ==================== ATTENDANCE HANDLERS ====================
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
      setShowAttendanceModal(false);
      fetchAttendance();
      setAttendanceForm({ employeeId: '', type: 'office', notes: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async (employeeId) => {
    try {
      await attendanceApi.checkOut({ employeeId });
      toast.success('Check-out successful');
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check out');
    }
  };

  const getTodayAttendanceStatus = (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    const record = attendance.find(a => {
      const recordDate = new Date(a.date).toISOString().split('T')[0];
      return a.employeeId?._id === employeeId || a.employeeId === employeeId && recordDate === today;
    });
    return record || null;
  };
  const handleApplyLeave = async () => {
    try {
      await leaveApi.create(leaveForm);
      toast.success('Leave applied successfully');
      setShowLeaveModal(false);
      fetchLeaves();
      setLeaveForm({
        employeeId: '',
        leaveType: 'paid',
        startDate: '',
        endDate: '',
        reason: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply leave');
    }
  };

  const handleApproveLeave = async (id) => {
    try {
      await leaveApi.approve(id, 'current-user-id'); // Replace with actual user ID
      toast.success('Leave approved');
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to approve leave');
    }
  };

  const handleRejectLeave = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await leaveApi.reject(id, { rejectionReason: reason });
      toast.success('Leave rejected');
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to reject leave');
    }
  };

  // ==================== PAYROLL HANDLERS ====================
  const handleGeneratePayroll = async () => {
    try {
      await payrollApi.generate(payrollForm);
      toast.success('Payroll generated successfully');
      setShowPayrollModal(false);
      fetchPayrolls();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate payroll');
    }
  };

  const handleMarkAsPaid = async (id) => {
    const ref = prompt('Enter payment reference:');
    if (!ref) return;
    try {
      await payrollApi.markAsPaid(id, ref);
      toast.success('Marked as paid');
      fetchPayrolls();
    } catch (error) {
      toast.error('Failed to mark as paid');
    }
  };

  const handleDeletePayroll = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payroll record?')) return;
    try {
      await payrollApi.delete(id);
      toast.success('Payroll deleted successfully');
      fetchPayrolls();
    } catch (error) {
      toast.error('Failed to delete payroll');
    }
  };

  // ==================== INCREMENT HANDLERS ====================
  const handleCreateIncrement = async () => {
    try {
      await incrementApi.create(incrementForm);
      toast.success('Salary increment created');
      setShowIncrementModal(false);
      fetchIncrements();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create increment');
    }
  };

  const handleDeleteIncrement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this increment record?')) return;
    try {
      await incrementApi.delete(id);
      toast.success('Increment deleted successfully');
      fetchIncrements();
    } catch (error) {
      toast.error('Failed to delete increment');
    }
  };

  // ==================== DEPARTMENT HANDLERS ====================
  const handleCreateDepartment = async () => {
    if (!departmentForm.name) {
      toast.error('Please enter department name');
      return;
    }
    try {
      await departmentApi.create(departmentForm);
      toast.success('Department created successfully');
      setShowDepartmentModal(false);
      fetchDepartments();
      setDepartmentForm({ name: '', code: '', description: '', managerId: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create department');
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await departmentApi.delete(id);
      toast.success('Department deleted successfully');
      fetchDepartments();
    } catch (error) {
      toast.error('Failed to delete department');
    }
  };

  // ==================== KPIs ====================
  const kpis = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
    const totalPayroll = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

    return [
      { label: 'Total Employees', value: totalEmployees, icon: UserCircle, variant: 'blue' },
      { label: 'Active Employees', value: activeEmployees, icon: BadgeCheck, variant: 'emerald' },
      { label: 'Pending Leaves', value: pendingLeaves, icon: AlertCircle, variant: 'amber' },
      { label: 'Monthly Payroll', value: fmt(totalPayroll), icon: Wallet, variant: 'purple' },
    ];
  }, [employees, leaves, payrolls]);

  // ==================== FILTERED DATA ====================
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const search = employeeSearch.toLowerCase();
    return employees.filter(e =>
      e.firstName?.toLowerCase().includes(search) ||
      e.lastName?.toLowerCase().includes(search) ||
      e.email?.toLowerCase().includes(search) ||
      e.employeeId?.toLowerCase().includes(search) ||
      e.department?.toLowerCase().includes(search)
    );
  }, [employees, employeeSearch]);

  const filteredAttendance = useMemo(() => {
    let data = attendance;
    // Filter by selected date
    if (selectedDate) {
      data = data.filter(a => {
        const recordDate = new Date(a.date).toISOString().split('T')[0];
        return recordDate === selectedDate;
      });
    }
    if (attendanceSearch) {
      const search = attendanceSearch.toLowerCase();
      data = data.filter(a =>
        a.employeeId?.firstName?.toLowerCase().includes(search) ||
        a.employeeId?.lastName?.toLowerCase().includes(search) ||
        a.employeeId?.employeeId?.toLowerCase().includes(search)
      );
    }
    if (attendanceFilter !== 'all') {
      if (attendanceFilter === 'present') {
        data = data.filter(a => a.checkIn);
      } else if (attendanceFilter === 'absent') {
        data = data.filter(a => !a.checkIn);
      }
    }
    return data;
  }, [attendance, attendanceSearch, attendanceFilter, selectedDate]);

  const filteredLeaves = useMemo(() => {
    let data = leaves;
    if (leaveSearch) {
      const search = leaveSearch.toLowerCase();
      data = data.filter(l =>
        l.employeeId?.firstName?.toLowerCase().includes(search) ||
        l.employeeId?.lastName?.toLowerCase().includes(search) ||
        l.reason?.toLowerCase().includes(search)
      );
    }
    if (leaveStatusFilter !== 'all') {
      data = data.filter(l => l.status === leaveStatusFilter);
    }
    return data;
  }, [leaves, leaveSearch, leaveStatusFilter]);

  const filteredPayrolls = useMemo(() => {
    let data = payrolls;
    if (payrollSearch) {
      const search = payrollSearch.toLowerCase();
      data = data.filter(p =>
        p.employeeId?.firstName?.toLowerCase().includes(search) ||
        p.employeeId?.lastName?.toLowerCase().includes(search) ||
        p.employeeId?.employeeId?.toLowerCase().includes(search)
      );
    }
    return data;
  }, [payrolls, payrollSearch]);

  const filteredIncrements = useMemo(() => {
    if (!incrementSearch) return increments;
    const search = incrementSearch.toLowerCase();
    return increments.filter(i =>
      i.employeeId?.firstName?.toLowerCase().includes(search) ||
      i.employeeId?.lastName?.toLowerCase().includes(search) ||
      i.employeeId?.employeeId?.toLowerCase().includes(search)
    );
  }, [increments, incrementSearch]);

  const filteredDepartments = useMemo(() => {
    if (!departmentSearch) return departments;
    const search = departmentSearch.toLowerCase();
    return departments.filter(d =>
      d.name?.toLowerCase().includes(search) ||
      d.code?.toLowerCase().includes(search) ||
      d.description?.toLowerCase().includes(search)
    );
  }, [departments, departmentSearch]);

  // ==================== TABLE COLUMNS ====================
  const employeeColumns = [
    {
      key: 'employeeId',
      header: 'Employee ID',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs">
            {row.firstName?.[0]}{row.lastName?.[0]}
          </div>
          <div>
            <p className="font-semibold text-sm">{val}</p>
            <p className="text-xs text-[var(--text-muted)]">{row.firstName} {row.lastName}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'department', header: 'Department' },
    {
      key: 'joiningDate',
      header: 'Join Date',
      render: (val, row) => {
        console.log('[DEBUG RENDER] joiningDate val:', val, 'for', row.employeeId);
        if (!val) return <span className="text-[var(--text-faint)]">—</span>;
        try {
          const date = new Date(val);
          console.log('[DEBUG RENDER] parsed date:', date, 'isNaN:', isNaN(date.getTime()));
          if (isNaN(date.getTime())) return <span className="text-[var(--text-faint)]">—</span>;
          return (
            <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
              <Calendar size={12} className="text-[var(--text-muted)]" />
              <span>{format(date, 'dd MMM yyyy')}</span>
            </div>
          );
        } catch (e) {
          console.log('[DEBUG RENDER] error:', e);
          return <span className="text-[var(--text-faint)]">—</span>;
        }
      },
    },
    {
      key: 'salary',
      header: 'Salary',
      render: (val) => <span className="font-medium text-emerald-600">{val ? `₹${Number(val).toLocaleString()}` : '-'}</span>,
    },
    {
      key: 'roleId',
      header: 'Role',
      render: (val, row) => {
        const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim();
        const isProjectManager = projectManagers.some(pm =>
          pm === fullName || pm === row.firstName || pm === row.lastName
        );
        if (isProjectManager) {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500">
              Project Manager
            </span>
          );
        }

        // Convert customRoles to array if it's an object (dictionary)
        const customRolesArray = Array.isArray(customRoles) 
          ? customRoles 
          : Object.values(customRoles || {});
        
        // Check custom roles first - try exact key match first for dictionary format
        let customRole = null;
        if (customRoles && !Array.isArray(customRoles)) {
          // Dictionary format: { roleId: { id, label, ... } }
          customRole = customRoles[val];
        }
        
        if (!customRole) {
          // Try array search
          customRole = customRolesArray.find(r => r.id === val || r._id === val || r.roleId === val);
        }
        
        if (customRole) {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
              {customRole.label || customRole.name || customRole.roleId || val}
            </span>
          );
        }

        // Check HRM roles
        const hrmRole = Array.isArray(hrmRoles) ? hrmRoles.find(r => r._id === val || r.id === val || r.roleId === val) : null;
        if (hrmRole) {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
              {hrmRole.label || hrmRole.name || hrmRole.roleId}
            </span>
          );
        }

        // Check all roles from settings
        const allRole = Array.isArray(allRoles) ? allRoles.find(r => r.id === val || r._id === val || r.roleId === val) : null;
        if (allRole) {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
              {allRole.name || allRole.label || allRole.roleId}
            </span>
          );
        }

        // Fallback: show the ID or 'No Role'
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {val || 'No Role'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => {
        const config = EMPLOYEE_STATUS[val] || EMPLOYEE_STATUS.active;
        return (
          <span
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{ color: config.color, background: config.bg }}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditEmployee(row)}
            className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => handleDeleteEmployee(row._id)}
            className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const leaveColumns = [
    {
      key: 'employeeId',
      header: 'Employee',
      render: (val) => (
        <div>
          <p className="font-medium text-sm">{val?.firstName} {val?.lastName}</p>
          <p className="text-xs text-[var(--text-muted)]">{val?.employeeId}</p>
        </div>
      ),
    },
    {
      key: 'leaveType',
      header: 'Type',
      render: (val) => {
        const config = LEAVE_TYPES[val] || LEAVE_TYPES.paid;
        return (
          <span className="text-xs font-medium" style={{ color: config.color }}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (_, row) => (
        <div className="text-sm">
          <p>{format(new Date(row.startDate), 'dd MMM yyyy')}</p>
          <p className="text-xs text-[var(--text-muted)]">to {format(new Date(row.endDate), 'dd MMM yyyy')}</p>
        </div>
      ),
    },
    { key: 'days', header: 'Days' },
    { key: 'reason', header: 'Reason' },
    {
      key: 'status',
      header: 'Status',
      render: (val) => {
        const config = LEAVE_STATUS[val] || LEAVE_STATUS.pending;
        return (
          <span
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{ color: config.color, background: config.bg }}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) =>
        row.status === 'pending' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleApproveLeave(row._id)}
              className="p-1.5 rounded hover:bg-green-500/10 text-green-500"
              title="Approve"
            >
              <CheckSquare size={14} />
            </button>
            <button
              onClick={() => handleRejectLeave(row._id)}
              className="p-1.5 rounded hover:bg-red-500/10 text-red-500"
              title="Reject"
            >
              <XSquare size={14} />
            </button>
          </div>
        ),
    },
  ];

  const payrollColumns = [
    {
      key: 'employeeId',
      header: 'Employee',
      render: (val) => (
        <div>
          <p className="font-medium text-sm">{val?.firstName} {val?.lastName}</p>
          <p className="text-xs text-[var(--text-muted)]">{val?.employeeId}</p>
        </div>
      ),
    },
    {
      key: 'monthYear',
      header: 'Period',
      render: (_, row) => (
        <p className="text-sm">{row.month}/{row.year}</p>
      ),
    },
    {
      key: 'baseSalary',
      header: 'Base Salary',
      render: (val) => <span className="text-sm">{fmt(val)}</span>,
    },
    {
      key: 'allowances',
      header: 'Allowances',
      render: (val) => <span className="text-sm text-emerald-500">+{fmt(val || 0)}</span>,
    },
    {
      key: 'deductions',
      header: 'Deductions',
      render: (val) => <span className="text-sm text-red-500">-{fmt(val || 0)}</span>,
    },
    {
      key: 'netSalary',
      header: 'Net Salary',
      render: (val) => <span className="font-semibold text-sm text-[var(--accent)]">{fmt(val)}</span>,
    },
    {
      key: 'isPaid',
      header: 'Status',
      render: (val, row) =>
        val ? (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
            Paid
          </span>
        ) : (
          <button
            onClick={() => handleMarkAsPaid(row._id)}
            className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
          >
            Mark Paid
          </button>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleDeletePayroll(row._id)}
            className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const incrementColumns = [
    {
      key: 'employeeId',
      header: 'Employee',
      render: (val) => (
        <div>
          <p className="font-medium text-sm">{val?.firstName} {val?.lastName}</p>
          <p className="text-xs text-[var(--text-muted)]">{val?.employeeId}</p>
        </div>
      ),
    },
    {
      key: 'previousSalary',
      header: 'Previous',
      render: (val) => <span className="text-sm">{fmt(val)}</span>,
    },
    {
      key: 'newSalary',
      header: 'New Salary',
      render: (val) => <span className="font-semibold text-sm text-emerald-500">{fmt(val)}</span>,
    },
    {
      key: 'increment',
      header: 'Increment',
      render: (_, row) => (
        <div className="text-sm">
          <p className="text-emerald-500 font-medium">+{fmt(row.incrementAmount)}</p>
          <p className="text-xs text-[var(--text-muted)]">({row.incrementPercentage}%)</p>
        </div>
      ),
    },
    {
      key: 'effectiveFrom',
      header: 'Effective From',
      render: (val) => <span className="text-sm">{format(new Date(val), 'dd MMM yyyy')}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleDeleteIncrement(row._id)}
            className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const departmentColumns = [
    {
      key: 'name',
      header: 'Department',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold">
            <Building size={18} />
          </div>
          <div>
            <p className="font-semibold text-sm">{val}</p>
            <p className="text-xs text-[var(--text-muted)]">{row.code || 'No Code'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (val) => <span className="text-sm text-[var(--text-muted)]">{val || '-'}</span>,
    },
    {
      key: 'employeeCount',
      header: 'Employees',
      render: (val) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
          {val || 0} employees
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleDeleteDepartment(row._id)}
            className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      {/* ── Header ── */}
      <PageHeader
        title="Human Resource Management"
        subtitle="Employees · Attendance · Leave · Payroll · Increments"
        actions={[
          {
            type: 'button',
            label: activeTab === 'employees' ? 'Add Employee' :
              activeTab === 'attendance' ? 'Mark Attendance' :
                activeTab === 'leaves' ? 'Apply Leave' :
                  activeTab === 'payroll' ? 'Generate Payroll' :
                    activeTab === 'increments' ? 'Add Increment' :
                      activeTab === 'departments' ? 'Add Department' : 'Refresh',
            icon: Plus,
            variant: 'primary',
            onClick: () => {
              if (activeTab === 'employees' && canManageEmployees) {
                resetEmployeeForm();
                setShowEmployeeModal(true);
              } else if (activeTab === 'attendance' && (canCheckIn || canCheckOut)) {
                const myId = user?.id || user?._id || user?.sub;
                setAttendanceForm({ employeeId: isAttendanceOwnScope && myId ? String(myId) : '', type: 'office', notes: '' });
                setShowAttendanceModal(true);
              } else if (activeTab === 'leaves' && canApplyLeave) {
                setShowLeaveModal(true);
              } else if (activeTab === 'payroll' && canManagePayroll) {
                setPayrollForm({
                  employeeId: '',
                  month: new Date().getMonth() + 1,
                  year: new Date().getFullYear(),
                  baseSalary: 0,
                  allowances: 0,
                  deductions: 0,
                  bonus: 0,
                });
                setShowPayrollModal(true);
              } else if (activeTab === 'increments' && canManageIncrements) {
                setIncrementForm({
                  employeeId: '',
                  previousSalary: 0,
                  incrementPercentage: 0,
                  newSalary: 0,
                  effectiveFrom: '',
                  reason: '',
                });
                setShowIncrementModal(true);
              } else if (activeTab === 'departments' && canManageDepartments) {
                setDepartmentForm({ name: '', code: '', description: '', managerId: '' });
                setShowDepartmentModal(true);
              }
            },
          },
        ]}
      />

      {/* ── HRM Overview KPI Cards ── */}
      {canViewHrDashboard && (
        <div className="mb-2">
          <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
            <UserCircle size={12} className="text-[var(--accent-light)]" />
            <span>HRM Overview - Employee statistics and payroll summary</span>
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((kpi, index) => (
              <KPICard
                key={index}
                label={kpi.label}
                value={kpi.value}
                icon={kpi.icon}
                variant={kpi.variant}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Vertical Layout with Sidebar ── */}
      <div className="flex gap-5">
        {/* ── Left Sidebar Navigation ── */}
        <div className="w-56 shrink-0">
          <div className="p-2 space-y-1 sticky top-4">
            {canViewEmployees && (
              <button
                onClick={() => onNavigate ? onNavigate('hrm-employees') : setActiveTab('employees')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'employees'
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <UserCircle size={18} />
                Employees
              </button>
            )}
            {canViewAttendance && (
              <button
                onClick={() => onNavigate ? onNavigate('hrm-attendance') : setActiveTab('attendance')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'attendance'
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <Clock size={18} />
                Attendance
              </button>
            )}
            {(canViewLeaves) && (
              <button
                onClick={() => onNavigate ? onNavigate('hrm-leaves') : setActiveTab('leaves')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'leaves'
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <Calendar size={18} />
                Leaves
              </button>
            )}
            {canViewPayroll && (
              <button
                onClick={() => onNavigate ? onNavigate('hrm-payroll') : setActiveTab('payroll')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'payroll'
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <Wallet size={18} />
                Payroll
              </button>
            )}
            {canViewIncrements && (
              <button
                onClick={() => onNavigate ? onNavigate('hrm-increments') : setActiveTab('increments')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'increments'
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <TrendingUp size={18} />
                Increments
              </button>
            )}
            {canViewDepartments && (
              <button
                onClick={() => onNavigate ? onNavigate('hrm-departments') : setActiveTab('departments')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'departments'
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <Building size={18} />
                Departments
              </button>
            )}
            {/* Role Permissions Link for Admins */}
            {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin') && (
              <button
                onClick={() => onNavigate ? onNavigate('hrm-role-permissions') : setActiveTab('role-permissions')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'role-permissions' || activeTab === 'hrm-role-permissions'
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <ShieldCheck size={18} />
                Role Permissions
              </button>
            )}

            {/* Attendance Policy Link for Admins */}
            {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin') && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[DEBUG] Attendance Policy clicked');
                  if (onNavigate && typeof onNavigate === 'function') {
                    onNavigate('hrm-attendance-policy');
                    console.log('[DEBUG] onNavigate called with hrm-attendance-policy');
                  } else {
                    console.log('[DEBUG] Calling setActiveTab with attendance-policy');
                    setActiveTab('attendance-policy');
                    console.log('[DEBUG] setActiveTab called, activeTab will update async');
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeTab === 'attendance-policy' || activeTab === 'hrm-attendance-policy'
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <Clock size={18} />
                Attendance Policy
              </button>
            )}
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div className="flex-1 min-w-0">

          {/* ── Role Permissions Tab ── */}
          {(activeTab === 'role-permissions' || activeTab === 'hrm-role-permissions') && (
            <div className="animate-fade-in">
              <HrmPermissionsPage />
            </div>
          )}

          {/* ── Attendance Policy Tab ── */}
          {(activeTab === 'attendance-policy' || activeTab === 'hrm-attendance-policy') && (
            <div className="animate-fade-in">
              <AttendancePolicySettings />
            </div>
          )}

          {/* ── Employees Tab ── */}
          {activeTab === 'employees' && canViewEmployees && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    placeholder="Search employees..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <DataTable
                columns={employeeColumns}
                data={filteredEmployees}
                emptyText="No employees found."
                loading={loading}
              />
            </div>
          )}

          {/* ── Attendance Tab ── */}
          {activeTab === 'attendance' && canViewAttendance && (
            <div className="space-y-4 animate-fade-in">
              {/* Header with Policy Button */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Attendance Management</h3>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('attendance-policy')}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Settings size={16} />
                    Policy Settings
                  </Button>
                )}
              </div>

              {/* Simple Date Filter */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] p-2 rounded-lg">
                  <Calendar size={18} className="text-[var(--text-muted)]" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-36 h-8 border-0 bg-transparent"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="text-xs"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedDate('')}
                  className="text-xs"
                >
                  All Dates
                </Button>
                {!isAttendanceOwnScope && (
                  <div className="relative flex-1 max-w-xs ml-auto">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <Input
                      placeholder="Search employee..."
                      value={attendanceSearch}
                      onChange={(e) => setAttendanceSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                )}
                <Button variant="outline" onClick={fetchAttendance} className="flex items-center gap-2">
                  <RefreshCw size={14} /> Refresh
                </Button>
              </div>

              {/* Simple Stats Row */}
              {!isAttendanceOwnScope && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="glass-card p-3 text-center border-l-4 border-emerald-500">
                    <p className="text-2xl font-bold text-emerald-500">
                      {attendance.filter(a => {
                        const date = selectedDate || new Date().toISOString().split('T')[0];
                        const recordDate = new Date(a.date).toISOString().split('T')[0];
                        return recordDate === date && a.checkIn;
                      }).length}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Present</p>
                  </div>
                  <div className="glass-card p-3 text-center border-l-4 border-red-500">
                    <p className="text-2xl font-bold text-red-500">
                      {employees.length - attendance.filter(a => {
                        const date = selectedDate || new Date().toISOString().split('T')[0];
                        const recordDate = new Date(a.date).toISOString().split('T')[0];
                        return recordDate === date && a.checkIn;
                      }).length}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Absent</p>
                  </div>
                  <div className="glass-card p-3 text-center border-l-4 border-blue-500">
                    <p className="text-2xl font-bold text-blue-500">
                      {attendance.filter(a => {
                        const date = selectedDate || new Date().toISOString().split('T')[0];
                        const recordDate = new Date(a.date).toISOString().split('T')[0];
                        return recordDate === date && a.checkOut;
                      }).length}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Checked Out</p>
                  </div>
                  <div className="glass-card p-3 text-center border-l-4 border-purple-500">
                    <p className="text-2xl font-bold text-purple-500">
                      {attendance.filter(a => {
                        const date = selectedDate || new Date().toISOString().split('T')[0];
                        const recordDate = new Date(a.date).toISOString().split('T')[0];
                        return recordDate === date && a.checkIn && !a.checkOut;
                      }).length}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Working</p>
                  </div>
                </div>
              )}

              {/* All Employees Attendance List */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    {selectedDate ? format(new Date(selectedDate), 'dd MMM yyyy') : 'All Dates'} - {isAttendanceOwnScope ? 'My Attendance' : 'Employee Attendance'}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">{filteredAttendance.length} records</p>
                </div>

                <div className="space-y-2">
                  {filteredAttendance.length === 0 ? (
                    <p className="text-center text-[var(--text-muted)] py-8">No records found</p>
                  ) : (
                    (!isAttendanceOwnScope ? employees : employees.filter(e => e._id === user?.id)).map(emp => {
                      const date = selectedDate || new Date().toISOString().split('T')[0];
                      const record = attendance.find(a => {
                        const recordDate = new Date(a.date).toISOString().split('T')[0];
                        return (a.employeeId?._id === emp._id || a.employeeId === emp._id) && recordDate === date;
                      });

                      // Status Badge
                      let statusBadge;
                      let statusColor;
                      if (!record) {
                        statusBadge = <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">Absent</span>;
                        statusColor = 'border-l-red-500';
                      } else if (record.checkOut) {
                        statusBadge = <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Completed</span>;
                        statusColor = 'border-l-emerald-500';
                      } else {
                        statusBadge = <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">Working</span>;
                        statusColor = 'border-l-blue-500';
                      }

                      return (
                        <div
                          key={emp._id}
                          className={`flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg border-l-4 ${statusColor} cursor-pointer hover:bg-[var(--bg-hover)] transition-colors`}
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setShowViewEmployeeModal(true);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white flex items-center justify-center font-bold text-sm">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                              <p className="text-xs text-[var(--text-muted)]">{emp.employeeId} • {emp.department || 'No Dept'}</p>
                            </div>
                            <div className="ml-2">{statusBadge}</div>
                          </div>

                          <div className="flex items-center gap-4">
                            {record ? (
                              <div className="text-right">
                                {record.checkIn && (
                                  <p className="text-sm text-emerald-600 font-medium">
                                    In: {format(new Date(record.checkIn), 'hh:mm a')}
                                  </p>
                                )}
                                {record.checkOut && (
                                  <p className="text-sm text-blue-600 font-medium">
                                    Out: {format(new Date(record.checkOut), 'hh:mm a')}
                                  </p>
                                )}
                                {record.totalHours > 0 && (
                                  <p className="text-xs text-[var(--text-muted)]">{record.totalHours} hrs</p>
                                )}
                              </div>
                            ) : null}

                            {record && !record.checkOut && ((canCheckIn || canCheckOut) || canManageAttendance) ? (
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCheckOut(emp._id);
                                }}
                                className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10 text-xs flex items-center gap-1"
                              >
                                <LogOut size={12} /> Check Out
                              </Button>
                            ) : !record && ((canCheckIn || canCheckOut) || canManageAttendance) ? (
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAttendanceForm({ employeeId: emp._id, type: 'office', notes: '' });
                                  setShowAttendanceModal(true);
                                }}
                                className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 text-xs flex items-center gap-1"
                              >
                                <LogIn size={12} /> Check In
                              </Button>
                            ) : record?.checkOut ? (
                              <span className="px-2 py-1 text-xs text-emerald-600 bg-emerald-500/10 rounded">Done</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Attendance History Table */}
              {!isAttendanceOwnScope && (
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Attendance History</h3>
                    <p className="text-sm text-[var(--text-muted)]">{filteredAttendance.length} records</p>
                  </div>
                  <DataTable
                    columns={[
                      {
                        key: 'employeeId',
                        header: 'Employee',
                        render: (val) => (
                          <div>
                            <p className="font-medium text-sm">{val?.firstName} {val?.lastName}</p>
                            <p className="text-xs text-[var(--text-muted)]">{val?.employeeId}</p>
                          </div>
                        ),
                      },
                      {
                        key: 'date',
                        header: 'Date',
                        render: (val) => format(new Date(val), 'dd MMM yyyy'),
                      },
                      {
                        key: 'checkIn',
                        header: 'Check In',
                        render: (val) => val ? format(new Date(val), 'hh:mm a') : '-',
                      },
                      {
                        key: 'checkOut',
                        header: 'Check Out',
                        render: (val) => val ? format(new Date(val), 'hh:mm a') : '-',
                      },
                      {
                        key: 'totalHours',
                        header: 'Hours',
                        render: (val) => <span className="font-medium">{val || 0} hrs</span>,
                      },
                      {
                        key: 'type',
                        header: 'Type',
                        render: (val) => (
                          <span className="px-2 py-1 rounded-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                            {val || 'office'}
                          </span>
                        ),
                      },
                    ]}
                    data={filteredAttendance}
                    emptyText="No attendance records found."
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Leaves Tab ── */}
          {activeTab === 'leaves' && canViewLeaves && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    placeholder="Search leaves..."
                    value={leaveSearch}
                    onChange={(e) => setLeaveSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select
                  value={leaveStatusFilter}
                  onChange={(e) => setLeaveStatusFilter(e.target.value)}
                  className="w-32 h-9"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Select>
                <p className="text-sm text-[var(--text-muted)]">
                  {filteredLeaves.length} of {leaves.length} records
                </p>
                <Button variant="outline" onClick={fetchLeaves} className="ml-auto">
                  <RefreshCw size={14} /> Refresh
                </Button>
              </div>
              <DataTable
                columns={leaveColumns}
                data={filteredLeaves}
                emptyText="No leave records found."
              />
            </div>
          )}

          {/* ── Payroll Tab ── */}
          {activeTab === 'payroll' && canViewPayroll && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    placeholder="Search payroll..."
                    value={payrollSearch}
                    onChange={(e) => setPayrollSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {filteredPayrolls.length} of {payrolls.length} records
                </p>
                <Button variant="outline" onClick={fetchPayrolls} className="ml-auto">
                  <RefreshCw size={14} /> Refresh
                </Button>
              </div>
              <DataTable
                columns={payrollColumns}
                data={filteredPayrolls}
                emptyText="No payroll records found."
              />
            </div>
          )}

          {/* ── Increments Tab ── */}
          {activeTab === 'increments' && canViewIncrements && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    placeholder="Search increments..."
                    value={incrementSearch}
                    onChange={(e) => setIncrementSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <DataTable
                columns={incrementColumns}
                data={filteredIncrements}
                emptyText="No increment records found."
              />
            </div>
          )}

          {/* ── Departments Tab ── */}
          {activeTab === 'departments' && canViewDepartments && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    placeholder="Search departments..."
                    value={departmentSearch}
                    onChange={(e) => setDepartmentSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <DataTable
                columns={departmentColumns}
                data={filteredDepartments}
                emptyText="No departments found."
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Employee Modal ── */}
      {showEmployeeModal && (
        <Modal
          open={showEmployeeModal}
          onClose={() => {
            setShowEmployeeModal(false);
            setSelectedEmployee(null);
          }}
          title={selectedEmployee ? 'Edit Employee' : 'Add Employee'}
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEmployeeModal(false);
                  setSelectedEmployee(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={selectedEmployee ? handleUpdateEmployee : handleCreateEmployee}
                disabled={!employeeForm.employeeId || !employeeForm.firstName || !employeeForm.lastName || !employeeForm.email || !employeeForm.password || !employeeForm.phone || !employeeForm.roleId}
              >
                <Plus size={13} /> {selectedEmployee ? 'Update' : 'Create'}
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Employee ID">
              <Input
                value={employeeForm.employeeId}
                onChange={(e) => setEmployeeForm({ ...employeeForm, employeeId: e.target.value })}
                placeholder="EMP001"
              />
            </FormField>
            <FormField label="Joining Date">
              <Input
                type="date"
                value={employeeForm.joiningDate}
                onChange={(e) => setEmployeeForm({ ...employeeForm, joiningDate: e.target.value })}
              />
            </FormField>
            <FormField label="First Name">
              <Input
                value={employeeForm.firstName}
                onChange={(e) => setEmployeeForm({ ...employeeForm, firstName: e.target.value })}
                placeholder="John"
              />
            </FormField>
            <FormField label="Last Name">
              <Input
                value={employeeForm.lastName}
                onChange={(e) => setEmployeeForm({ ...employeeForm, lastName: e.target.value })}
                placeholder="Doe"
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                placeholder="john@example.com"
              />
            </FormField>
            <FormField label="Password *">
              <Input
                type="password"
                value={employeeForm.password}
                onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                placeholder="Set password..."
              />
            </FormField>
            <FormField label="Phone">
              <Input
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </FormField>
            <FormField label="Department">
              <Select
                value={employeeForm.department}
                onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>
                    {dept.name} {dept.code ? `(${dept.code})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Roles *">
              <Select
                value={employeeForm.roleId}
                onChange={(e) => setEmployeeForm({ ...employeeForm, roleId: e.target.value })}
                required
              >
                <option value="">Select Role</option>
                {hrmRoles?.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Address" className="mt-3">
            <Textarea
              value={employeeForm.address}
              onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
              placeholder="Full address..."
              rows={2}
            />
          </FormField>
          <FormField label="Status" className="mt-3">
            <Select
              value={employeeForm.status}
              onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </Select>
          </FormField>
        </Modal>
      )}

      {/* ── View Employee Modal ── */}
      {showViewEmployeeModal && selectedEmployee && (
        <Modal
          open={showViewEmployeeModal}
          onClose={() => {
            setShowViewEmployeeModal(false);
            setSelectedEmployee(null);
          }}
          title={null}
          size="lg"
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowViewEmployeeModal(false);
                  setSelectedEmployee(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowViewEmployeeModal(false);
                  openEditEmployee(selectedEmployee);
                }}
              >
                <Edit2 size={13} /> Edit Employee
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Profile Card Header */}
            <div className="relative bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl p-6 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

              <div className="relative flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-3xl font-bold">
                  {selectedEmployee.profilePhoto ? (
                    <img src={selectedEmployee.profilePhoto} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                  <p className="text-white/80">{selectedEmployee.employeeId}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedEmployee.status === 'active' ? 'bg-emerald-400/30 text-emerald-100' : 'bg-gray-400/30 text-gray-100'}`}>
                      {(selectedEmployee.status || 'active').toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                      {(() => {
                        const val = selectedEmployee.roleId;
                        const customRole = Array.isArray(customRoles) ? customRoles.find(r => r.id === val || r._id === val) : null;
                        if (customRole) return customRole.name || customRole.label;
                        const hrmRole = Array.isArray(hrmRoles) ? hrmRoles.find(r => r._id === val || r.id === val) : null;
                        if (hrmRole) return hrmRole.label || hrmRole.name;
                        const allRole = Array.isArray(allRoles) ? allRoles.find(r => r.id === val || r._id === val) : null;
                        if (allRole) return allRole.name || allRole.label;
                        return val || 'No Role';
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Cards Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Department</p>
                <p className="font-semibold text-[var(--text-primary)]">{selectedEmployee.department || '-'}</p>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Join Date</p>
                {console.log('[DEBUG Join Date Card] joiningDate value:', selectedEmployee?.joiningDate)}
                {console.log('[DEBUG Join Date Card] has joiningDate?', !!selectedEmployee?.joiningDate)}
                <p className="font-semibold text-[var(--text-primary)]">
                  {selectedEmployee.joiningDate ? format(new Date(selectedEmployee.joiningDate), 'dd MMM yyyy') : '-'}
                </p>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Salary</p>
                <p className="font-semibold text-emerald-600">
                  {selectedEmployee.salary ? `₹${Number(selectedEmployee.salary).toLocaleString()}` : '-'}
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Email</p>
                  <p className="font-medium text-sm">{selectedEmployee.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Phone</p>
                  <p className="font-medium text-sm">{selectedEmployee.phone || '-'}</p>
                </div>
              </div>
            </div>

            {/* Address */}
            {selectedEmployee.address && (
              <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Address</p>
                    <p className="font-medium">{selectedEmployee.address}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Section */}
            <div className="border-t border-[var(--border-color)] pt-4">
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <FileText size={16} className="text-[var(--primary)]" />
                Documents & IDs
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {selectedEmployee.aadharNumber && (
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">Ad</div>
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Aadhar</p>
                        <p className="font-medium text-sm">{selectedEmployee.aadharNumber}</p>
                      </div>
                    </div>
                  </div>
                )}
                {selectedEmployee.panNumber && (
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">PAN</div>
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">PAN</p>
                        <p className="font-medium text-sm">{selectedEmployee.panNumber}</p>
                      </div>
                    </div>
                  </div>
                )}
                {selectedEmployee.esicNumber && (
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">ES</div>
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">ESIC</p>
                        <p className="font-medium text-sm">{selectedEmployee.esicNumber}</p>
                      </div>
                    </div>
                  </div>
                )}
                {selectedEmployee.pfNumber && (
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">PF</div>
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">PF</p>
                        <p className="font-medium text-sm">{selectedEmployee.pfNumber}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Details */}
            {(selectedEmployee.bankName || selectedEmployee.accountNumber || selectedEmployee.ifscCode) && (
              <div className="border-t border-[var(--border-color)] pt-4">
                <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Wallet size={16} className="text-[var(--primary)]" />
                  Bank Details
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)]">Bank</p>
                    <p className="font-medium">{selectedEmployee.bankName || '-'}</p>
                  </div>
                  <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)]">Account No</p>
                    <p className="font-medium">{selectedEmployee.accountNumber || '-'}</p>
                  </div>
                  <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)]">IFSC</p>
                    <p className="font-medium">{selectedEmployee.ifscCode || '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            {(selectedEmployee.emergencyContactName || selectedEmployee.emergencyContactPhone) && (
              <div className="border-t border-[var(--border-color)] pt-4">
                <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  Emergency Contact
                </h4>
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedEmployee.emergencyContactName || '-'}</p>
                      <p className="text-sm text-[var(--text-muted)]">{selectedEmployee.emergencyContactRelation || 'Contact'}</p>
                    </div>
                    <div className="flex items-center gap-2 text-red-600">
                      <Phone size={16} />
                      <span className="font-semibold">{selectedEmployee.emergencyContactPhone || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Leave Modal ── */}
      {showLeaveModal && (
        <Modal
          open={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          title="Apply for Leave"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowLeaveModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleApplyLeave}>
                <Plus size={13} /> Apply
              </Button>
            </div>
          }
        >
          <FormField label="Employee">
            <Select
              value={leaveForm.employeeId}
              onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Leave Type" className="mt-3">
            <Select
              value={leaveForm.leaveType}
              onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
            >
              <option value="paid">Paid Leave</option>
              <option value="unpaid">Unpaid Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="earned">Earned Leave</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FormField label="Start Date">
              <Input
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
              />
            </FormField>
            <FormField label="End Date">
              <Input
                type="date"
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Reason" className="mt-3">
            <Textarea
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="Reason for leave..."
              rows={3}
            />
          </FormField>
        </Modal>
      )}

      {/* ── Payroll Modal ── */}
      {showPayrollModal && (
        <Modal
          open={showPayrollModal}
          onClose={() => setShowPayrollModal(false)}
          title="Generate Payroll"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowPayrollModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGeneratePayroll}
                disabled={!payrollForm.employeeId || !payrollForm.baseSalary}
              >
                <Plus size={13} /> Generate
              </Button>
            </div>
          }
        >
          <FormField label="Employee">
            <Select
              value={payrollForm.employeeId}
              onChange={(e) => setPayrollForm({ ...payrollForm, employeeId: e.target.value })}
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FormField label="Month">
              <Select
                value={payrollForm.month}
                onChange={(e) => setPayrollForm({ ...payrollForm, month: parseInt(e.target.value) })}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Year">
              <Input
                type="number"
                value={payrollForm.year}
                onChange={(e) => setPayrollForm({ ...payrollForm, year: parseInt(e.target.value) })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FormField label="Base Salary (₹)">
              <Input
                type="number"
                value={payrollForm.baseSalary}
                onChange={(e) => setPayrollForm({ ...payrollForm, baseSalary: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="Allowances (₹)">
              <Input
                type="number"
                value={payrollForm.allowances}
                onChange={(e) => setPayrollForm({ ...payrollForm, allowances: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="Deductions (₹)">
              <Input
                type="number"
                value={payrollForm.deductions}
                onChange={(e) => setPayrollForm({ ...payrollForm, deductions: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="Bonus (₹)">
              <Input
                type="number"
                value={payrollForm.bonus}
                onChange={(e) => setPayrollForm({ ...payrollForm, bonus: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[var(--bg-elevated)]">
            <p className="text-sm text-[var(--text-muted)]">Net Salary Preview</p>
            <p className="text-2xl font-bold text-[var(--accent)]">
              {fmt(payrollForm.baseSalary + payrollForm.allowances + payrollForm.bonus - payrollForm.deductions)}
            </p>
          </div>
        </Modal>
      )}

      {/* ── Attendance Modal ── */}
      {showAttendanceModal && (
        <Modal
          open={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
          title="Mark Attendance"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAttendanceModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCheckIn} disabled={!attendanceForm.employeeId}>
                <Clock size={13} /> Check In
              </Button>
            </div>
          }
        >
          <FormField label="Employee">
            {isAttendanceOwnScope ? (
              <Input
                value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || user?.email || 'Current User'}
                disabled
              />
            ) : (
              <Select
                value={attendanceForm.employeeId}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, employeeId: e.target.value })}
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Attendance Type" className="mt-3">
            <Select
              value={attendanceForm.type}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, type: e.target.value })}
            >
              <option value="office">Office</option>
              <option value="site">Site</option>
              <option value="remote">Remote</option>
            </Select>
          </FormField>
          <FormField label="Notes (Optional)" className="mt-3">
            <Textarea
              value={attendanceForm.notes}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
              placeholder="Any notes about today..."
              rows={2}
            />
          </FormField>
        </Modal>
      )}

      {/* ── Increment Modal ── */}
      {showIncrementModal && (
        <Modal
          open={showIncrementModal}
          onClose={() => setShowIncrementModal(false)}
          title="Add Salary Increment"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowIncrementModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateIncrement}
                disabled={!incrementForm.employeeId || !incrementForm.previousSalary || !incrementForm.newSalary}
              >
                <Plus size={13} /> Add
              </Button>
            </div>
          }
        >
          <FormField label="Employee">
            <Select
              value={incrementForm.employeeId}
              onChange={(e) => setIncrementForm({ ...incrementForm, employeeId: e.target.value })}
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FormField label="Previous Salary (₹)">
              <Input
                type="number"
                value={incrementForm.previousSalary}
                onChange={(e) => {
                  const prev = parseFloat(e.target.value) || 0;
                  const percent = incrementForm.incrementPercentage;
                  const newSal = prev + (prev * percent / 100);
                  setIncrementForm({
                    ...incrementForm,
                    previousSalary: prev,
                    newSalary: Math.round(newSal),
                  });
                }}
              />
            </FormField>
            <FormField label="Increment %">
              <Input
                type="number"
                value={incrementForm.incrementPercentage}
                onChange={(e) => {
                  const percent = parseFloat(e.target.value) || 0;
                  const prev = incrementForm.previousSalary;
                  const newSal = prev + (prev * percent / 100);
                  setIncrementForm({
                    ...incrementForm,
                    incrementPercentage: percent,
                    newSalary: Math.round(newSal),
                  });
                }}
              />
            </FormField>
          </div>
          <FormField label="New Salary (₹)" className="mt-3">
            <Input
              type="number"
              value={incrementForm.newSalary}
              onChange={(e) => setIncrementForm({ ...incrementForm, newSalary: parseFloat(e.target.value) || 0 })}
            />
          </FormField>
          <FormField label="Effective From" className="mt-3">
            <Input
              type="date"
              value={incrementForm.effectiveFrom}
              onChange={(e) => setIncrementForm({ ...incrementForm, effectiveFrom: e.target.value })}
            />
          </FormField>
          <FormField label="Reason" className="mt-3">
            <Textarea
              value={incrementForm.reason}
              onChange={(e) => setIncrementForm({ ...incrementForm, reason: e.target.value })}
              placeholder="Reason for increment..."
              rows={2}
            />
          </FormField>
        </Modal>
      )}

      {/* ── Department Modal ── */}
      {showDepartmentModal && (
        <Modal
          open={showDepartmentModal}
          onClose={() => setShowDepartmentModal(false)}
          title="Add Department"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowDepartmentModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateDepartment}
                disabled={!departmentForm.name}
              >
                <Plus size={13} /> Create
              </Button>
            </div>
          }
        >
          <FormField label="Department Name *">
            <Input
              value={departmentForm.name}
              onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
              placeholder="Engineering"
            />
          </FormField>
          <FormField label="Department Code" className="mt-3">
            <Input
              value={departmentForm.code}
              onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })}
              placeholder="ENG"
            />
          </FormField>
          <FormField label="Description" className="mt-3">
            <Textarea
              value={departmentForm.description}
              onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
              placeholder="Department description..."
              rows={3}
            />
          </FormField>
        </Modal>
      )}
    </div>
  );
};

export default HRMPage;

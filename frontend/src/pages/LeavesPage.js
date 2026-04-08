import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import KpiCards from '../components/hrm/KpiCards';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { Calendar, Plus, Search, RefreshCw, Check, X, Trash2, Edit, Clock, CheckCircle, XCircle, User, FileText, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { leaveApi, employeeApi } from '../services/hrmApi';
import { usePermissions } from '../hooks/usePermissions';
import { api } from '../lib/apiClient';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

// ── Leave Detail View Modal ────────────────────────────────────────────────
const LeaveViewModal = ({ leave, onClose, onApprove, onReject, inline = false }) => {
  if (!leave) return null;
  const emp = leave.employeeId || {};
  const initial = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase() || 'L';
  const days = leave.startDate && leave.endDate
    ? Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const statusMap = {
    pending:  { cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20',   icon: Clock,         label: 'Pending'  },
    approved: { cls: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20', icon: CheckCircle, label: 'Approved' },
    rejected: { cls: 'bg-red-500/10 text-red-500 border-red-500/20',          icon: XCircle,       label: 'Rejected' },
  };
  const st = statusMap[leave.status] || statusMap.pending;
  const leaveTypeColor = { paid: 'bg-[var(--blue-bg)] text-[var(--blue)]', unpaid: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]', sick: 'bg-[var(--amber-bg)] text-[var(--amber)]', casual: 'bg-[var(--primary)]/10 text-[var(--primary)]', earned: 'bg-[var(--primary)]/10 text-[var(--primary)]' };

  const content = (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl mb-4 p-5 bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent border border-[var(--border-base)]">
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-blue-500/10 -translate-y-6 translate-x-6" />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">{initial}</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{emp.firstName} {emp.lastName}</h2>
            <p className="text-xs text-[var(--text-muted)]">{emp.employeeId} · {emp.department}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${st.cls} flex items-center gap-1`}><st.icon size={11} />{st.label}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${leaveTypeColor[leave.leaveType] || 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>{leave.leaveType || 'paid'}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-500">{days}</p>
            <p className="text-xs text-[var(--text-faint)]">day{days !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
      {/* Date & Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Start Date', value: leave.startDate ? format(new Date(leave.startDate), 'dd MMM yyyy') : '—', color: 'bg-[var(--green)]/10 border-[var(--green)]/20' },
          { label: 'End Date',   value: leave.endDate   ? format(new Date(leave.endDate),   'dd MMM yyyy') : '—', color: 'bg-red-500/10 border-red-500/20' },
        ].map(item => (
          <div key={item.label} className={`p-3 rounded-xl border ${item.color}`}>
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] font-medium">{item.label}</p>
            <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{item.value}</p>
          </div>
        ))}
      </div>
      {/* Reason */}
      {leave.reason && (
        <div className="glass-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-faint)] font-medium mb-1.5 flex items-center gap-1"><FileText size={11} /> Reason</p>
          <p className="text-sm text-[var(--text-primary)]">{leave.reason}</p>
        </div>
      )}
    </>
  );

  // Inline mode — render without Modal wrapper
  if (inline) {
    return (
      <div>
        {content}
        {leave.status === 'pending' && (
          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[var(--border-muted)]">
            <button onClick={() => { onReject(leave._id); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20"><XCircle size={13} /> Reject</button>
            <button onClick={() => { onApprove(leave._id); onClose(); }} className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-[var(--green)] text-white hover:bg-[var(--green)]"><CheckCircle size={13} /> Approve</button>
          </div>
        )}
      </div>
    );
  }

  // Modal mode
  return (
    <Modal open={!!leave} onClose={onClose} title="" size="md" footer={
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><X size={13} /> Close</button>
        {leave.status === 'pending' && (
          <div className="flex gap-2">
            <button onClick={() => { onReject(leave._id); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20"><XCircle size={13} /> Reject</button>
            <button onClick={() => { onApprove(leave._id); onClose(); }} className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-[var(--green)] text-white hover:bg-[var(--green)]"><CheckCircle size={13} /> Approve</button>
          </div>
        )}
      </div>
    }>
      {content}
    </Modal>
  );
};

// ── Leave KPI List Modal ───────────────────────────────────────────────────
const LeaveKpiModal = ({ title, leaves, onClose, onViewLeave }) => (
  <Modal open={true} onClose={onClose} title={title} size="md"
    footer={<button onClick={onClose} className="px-4 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">Close</button>}
  >
    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
      {leaves.length === 0 ? <p className="text-sm text-[var(--text-muted)] text-center py-8">No leaves found</p> : leaves.map(l => {
        const emp = l.employeeId || {};
        const days = l.startDate && l.endDate ? Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / (1000*60*60*24)) + 1 : 0;
        const stCls = { pending: 'bg-amber-500/10 text-amber-500', approved: 'bg-[var(--green)]/10 text-[var(--green)]', rejected: 'bg-red-500/10 text-red-500' };
        return (
          <div key={l._id} onClick={() => onViewLeave(l)} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] cursor-pointer border border-[var(--border-muted)] hover:border-[var(--primary)]/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">{emp.firstName?.[0]}{emp.lastName?.[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--text-primary)]">{emp.firstName} {emp.lastName}</p>
              <p className="text-xs text-[var(--text-muted)]">{l.startDate ? format(new Date(l.startDate), 'dd MMM') : ''} – {l.endDate ? format(new Date(l.endDate), 'dd MMM yyyy') : ''} · {l.leaveType}</p>
            </div>
            <div className="text-right">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${stCls[l.status] || stCls.pending}`}>{l.status}</span>
              <p className="text-xs text-[var(--text-faint)] mt-1">{days}d</p>
            </div>
          </div>
        );
      })}
    </div>
  </Modal>
);

const LeavesPage = () => {
  const { user } = useAuth();
  
  // Get permissions for leaves module
  const { 
    can,
    canView, 
    canCreate, 
    canEdit, 
    canDelete, 
    canApprove,
    columns 
  } = usePermissions('leaves');

  const canApplyLeave = canCreate() || can('apply');
  
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const calendarRef = useRef(null);
  // View modal states
  const [viewLeave, setViewLeave] = useState(null);
  // KPI filter state - shows filtered data in table instead of modal
  const [kpiFilter, setKpiFilter] = useState(null); // 'pending' | 'approved' | 'rejected' | null

  // Dashboard metrics for new KpiCards component
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

  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'paid',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Functions defined before useEffect
  const fetchEmployees = async () => {
    try {
      console.log('[DEBUG] Fetching employees from API...');
      const response = await employeeApi.getAll();
      console.log('[DEBUG] Employee API response:', response);
      const data = response.data?.data || response.data || [];
      console.log('[DEBUG] Setting employees:', data.length, 'employees');
      setEmployees(data);
    } catch (error) {
      console.error('[DEBUG] Error fetching employees:', error);
      console.error('[DEBUG] Error details:', error.response?.data || error.message);
      toast.error('Failed to fetch employees');
    }
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await leaveApi.getAll();
      const leavesData = response.data?.data || response.data || [];
      setLeaves(leavesData);
    } catch (error) {
      toast.error('Failed to fetch leaves');
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchLeaves();
    fetchEmployees();
    fetchDashboardMetrics();
  }, []);

  if (!mounted) return null;

  const handleApplyLeave = async () => {
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (editingLeave) {
        await leaveApi.update(editingLeave._id, leaveForm);
        toast.success('Leave updated successfully');
      } else {
        await leaveApi.create(leaveForm);
        toast.success('Leave application submitted');
      }
      setShowLeaveModal(false);
      setEditingLeave(null);
      fetchLeaves();
      setLeaveForm({
        employeeId: '',
        leaveType: 'paid',
        startDate: '',
        endDate: '',
        reason: '',
      });
    } catch (error) {
      toast.error(editingLeave ? 'Failed to update leave' : 'Failed to apply leave');
    }
  };

  const handleApproveLeave = async (leaveId) => {
    console.log('[DEBUG] Approving leave:', leaveId);
    console.log('[DEBUG] User:', user);

    const approverId = user?._id || user?.id;
    if (!approverId) {
      toast.error('User not authenticated. Please login again.');
      return;
    }

    try {
      const response = await leaveApi.approve(leaveId, approverId);
      console.log('[DEBUG] Approve response:', response);
      toast.success('Leave approved successfully');
      fetchLeaves();
    } catch (error) {
      console.error('[DEBUG] Approve error:', error);
      console.error('[DEBUG] Error response:', error.response);
      toast.error(error.response?.data?.message || error.message || 'Failed to approve leave');
    }
  };

  const handleRejectLeave = async (leaveId) => {
    console.log('[DEBUG] Rejecting leave:', leaveId);
    try {
      const response = await leaveApi.reject(leaveId, {
        status: 'rejected',
        rejectionReason: 'Rejected by admin'
      });
      console.log('[DEBUG] Reject response:', response);
      toast.success('Leave rejected successfully');
      fetchLeaves();
    } catch (error) {
      console.error('[DEBUG] Reject error:', error);
      console.error('[DEBUG] Error response:', error.response);
      toast.error(error.response?.data?.message || error.message || 'Failed to reject leave');
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to delete this leave?')) {
      return;
    }
    try {
      await leaveApi.delete(leaveId);
      toast.success('Leave deleted successfully');
      fetchLeaves();
    } catch (error) {
      console.error('[DEBUG] Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete leave');
    }
  };

  const filteredLeaves = leaves.filter(leave => {
    const matchesSearch = leaveSearch === '' ||
      `${leave.employeeId?.firstName || ''} ${leave.employeeId?.lastName || ''}`.toLowerCase().includes(leaveSearch.toLowerCase());
    
    // KPI filter takes precedence over manual status filter
    let matchesStatus = true;
    if (kpiFilter) {
      matchesStatus = leave.status === kpiFilter;
    } else {
      matchesStatus = leaveStatusFilter === 'all' || leave.status === leaveStatusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  const kpis = [
    {
      label: 'Pending Leaves',
      value: leaves.filter(l => l.status === 'pending').length,
      icon: Calendar,
      color: '#f59e0b'
    },
    {
      label: 'Approved Leaves',
      value: leaves.filter(l => l.status === 'approved').length,
      icon: Calendar,
      color: '#22c55e'
    },
    {
      label: 'Rejected Leaves',
      value: leaves.filter(l => l.status === 'rejected').length,
      icon: Calendar,
      color: '#ef4444'
    },
    {
      label: 'Total Leaves',
      value: leaves.length,
      icon: Calendar,
      color: '#3b82f6'
    },
  ].filter(Boolean);

  // Build columns dynamically based on permissions
  const tableColumns = [
    columns.employee && {
      key: 'employeeId',
      header: 'Employee',
      render: (val) => (
        <div>
          <p className="font-medium text-sm">{val?.firstName} {val?.lastName}</p>
          <p className="text-xs text-[var(--text-muted)]">{val?.employeeId}</p>
        </div>
      ),
    },
    columns.leaveType && {
      key: 'leaveType',
      header: 'Leave Type',
      render: (val) => (
        <span className="px-2 py-1 rounded-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-color)] capitalize">
          {val || 'paid'}
        </span>
      ),
    },
    columns.startDate && {
      key: 'startDate',
      header: 'Start Date',
      render: (val) => format(new Date(val), 'dd MMM yyyy'),
    },
    columns.endDate && {
      key: 'endDate',
      header: 'End Date',
      render: (val) => format(new Date(val), 'dd MMM yyyy'),
    },
    columns.days && {
      key: 'days',
      header: 'Days',
      render: (_, row) => {
        const start = new Date(row.startDate);
        const end = new Date(row.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return <span className="font-medium">{days}</span>;
      },
    },
    columns.status && {
      key: 'status',
      header: 'Status',
      render: (val) => {
        const colors = {
          pending: 'bg-amber-500/10 text-amber-500',
          approved: 'bg-[var(--green)]/10 text-[var(--green)]',
          rejected: 'bg-red-500/10 text-red-500',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${colors[val] || colors.pending} capitalize`}>
            {val || 'pending'}
          </span>
        );
      },
    },
    columns.actions && (canEdit() || canDelete() || canApprove()) && {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {canEdit() && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingLeave(row);
                setLeaveForm({
                  employeeId: row.employeeId?._id || row.employeeId,
                  leaveType: row.leaveType || 'paid',
                  startDate: row.startDate ? row.startDate.split('T')[0] : '',
                  endDate: row.endDate ? row.endDate.split('T')[0] : '',
                  reason: row.reason || '',
                });
                setShowLeaveModal(true);
              }}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit"
            >
              <Edit size={16} />
            </button>
          )}
          {canDelete() && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteLeave(row._id);
              }}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
          {row.status === 'pending' && canApprove() && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproveLeave(row._id);
                }}
                className="p-1.5 text-[var(--green)] hover:bg-[var(--green)]/10 rounded transition-colors"
                title="Approve"
              >
                <Check size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRejectLeave(row._id);
                }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Reject"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ].filter(Boolean);

  const renderExpanded = (leave) => (
    <div className="p-4 border-t border-[var(--border-muted)]">
      <LeaveViewModal 
        leave={leave} 
        onClose={() => setViewLeave(null)} 
        onApprove={canApprove() ? handleApproveLeave : null}
        onReject={canApprove() ? handleRejectLeave : null}
        inline 
      />
    </div>
  );

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header with Apply Leave + Calendar Button */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="Leave Management"
          subtitle="Manage employee leave applications and approvals"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCalendarModal(true)}
            className="h-9 px-3"
          >
            <Calendar size={16} className="mr-1.5" /> View Calendar
          </Button>
          {canApplyLeave && (
            <Button
              variant="primary"
              onClick={() => {
                setEditingLeave(null);
                setLeaveForm({
                  employeeId: '',
                  leaveType: 'paid',
                  startDate: '',
                  endDate: '',
                  reason: '',
                });
                setShowLeaveModal(true);
              }}
            >
              <Plus size={16} className="mr-1.5" /> Apply Leave
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards - Dynamic Role-Based */}
      <KpiCards 
        role={isAdmin ? 'admin' : 'employee'} 
        metrics={dashboardMetrics} 
      />

      {/* Calendar Modal with FullCalendar */}
      {showCalendarModal && (
        <Modal
          open={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          title="Leave Calendar"
          size="xl"
        >
          <div className="p-4">
            {/* Month/Year Filter Controls */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--border-base)]">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Month:</label>
                <Select
                  value={calendarMonth}
                  onChange={(e) => {
                    const newMonth = parseInt(e.target.value);
                    setCalendarMonth(newMonth);
                    if (calendarRef.current) {
                      calendarRef.current.getApi().gotoDate(new Date(calendarYear, newMonth, 1));
                    }
                  }}
                  className="w-32 h-9"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                    <option key={idx} value={idx}>{month}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Year:</label>
                <Select
                  value={calendarYear}
                  onChange={(e) => {
                    const newYear = parseInt(e.target.value);
                    setCalendarYear(newYear);
                    if (calendarRef.current) {
                      calendarRef.current.getApi().gotoDate(new Date(newYear, calendarMonth, 1));
                    }
                  }}
                  className="w-24 h-9"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Select>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-[var(--text-muted)]">
                  {leaves.filter(leave => {
                    const start = new Date(leave.startDate);
                    return start.getMonth() === calendarMonth && start.getFullYear() === calendarYear;
                  }).length} leaves this month
                </span>
              </div>
            </div>

            <style>{`
              .fc {
                font-family: inherit;
              }
              .fc .fc-toolbar-title {
                font-size: 1.5rem;
                font-weight: 600;
                color: #22c55e;
              }
              .fc .fc-button {
                background: #f3f4f6;
                border: 1px solid #d1d5db;
                color: #374151;
                font-weight: 500;
                padding: 0.375rem 0.75rem;
                border-radius: 0.375rem;
              }
              .fc .fc-button:hover {
                background: #e5e7eb;
              }
              .fc .fc-button-primary {
                background: #22c55e;
                border-color: #22c55e;
                color: white;
              }
              .fc .fc-button-primary:hover {
                background: #16a34a;
                border-color: #16a34a;
              }
              .fc .fc-button-primary:disabled {
                background: #22c55e;
                border-color: #22c55e;
                opacity: 0.6;
              }
              .fc .fc-col-header-cell {
                padding: 0.75rem 0;
                font-weight: 600;
                color: #374151;
              }
              .fc .fc-col-header-cell.fc-day-sun {
                color: #ef4444;
              }
              .fc .fc-daygrid-day {
                border: 1px solid #e5e7eb;
              }
              .fc .fc-daygrid-day-number {
                font-size: 0.875rem;
                color: #6b7280;
                padding: 0.5rem;
              }
              .fc .fc-day-today {
                background: #fef3c7 !important;
              }
              .fc .fc-event {
                background: #bfdbfe;
                border: 1px solid #60a5fa;
                color: #1e40af;
                font-size: 0.75rem;
                padding: 0.125rem 0.25rem;
                border-radius: 0.25rem;
                cursor: pointer;
              }
              .fc .fc-event:hover {
                background: #93c5fd;
              }
              .fc .fc-event.fc-event-start {
                border-left-width: 4px;
              }
              .fc .fc-h-event .fc-event-main {
                color: #1e40af;
              }
              .fc .fc-daygrid-event-harness {
                margin: 1px 0;
              }
            `}</style>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={new Date(calendarYear, calendarMonth, 1)}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
              }}
              views={{
                dayGridMonth: { buttonText: 'month' },
                timeGridWeek: { buttonText: 'week' },
                timeGridDay: { buttonText: 'day' },
                listWeek: { buttonText: 'list' }
              }}
              datesSet={(dateInfo) => {
                setCalendarMonth(dateInfo.view.currentStart.getMonth());
                setCalendarYear(dateInfo.view.currentStart.getFullYear());
              }}
              events={leaves.map(leave => ({
                id: leave._id,
                title: `${leave.employeeId?.firstName || ''} ${leave.employeeId?.lastName || ''} - ${leave.leaveType || 'Leave'}`,
                start: leave.startDate?.split('T')[0],
                end: leave.endDate?.split('T')[0],
                allDay: true,
                backgroundColor: leave.leaveType === 'paid' ? '#86efac' :
                  leave.leaveType === 'unpaid' ? '#fca5a5' :
                    leave.leaveType === 'sick' ? '#fde68a' :
                      leave.leaveType === 'casual' ? '#bfdbfe' :
                        leave.leaveType === 'earned' ? '#ddd6fe' : '#e5e7eb',
                borderColor: leave.leaveType === 'paid' ? '#22c55e' :
                  leave.leaveType === 'unpaid' ? '#ef4444' :
                    leave.leaveType === 'sick' ? '#f59e0b' :
                      leave.leaveType === 'casual' ? '#3b82f6' :
                        leave.leaveType === 'earned' ? '#8b5cf6' : '#9ca3af',
                textColor: leave.leaveType === 'paid' ? '#166534' :
                  leave.leaveType === 'unpaid' ? '#991b1b' :
                    leave.leaveType === 'sick' ? '#92400e' :
                      leave.leaveType === 'casual' ? '#1e40af' :
                        leave.leaveType === 'earned' ? '#5b21b6' : '#374151',
                extendedProps: {
                  status: leave.status,
                  leaveType: leave.leaveType,
                  employee: `${leave.employeeId?.firstName || ''} ${leave.employeeId?.lastName || ''}`
                }
              }))}
              height="auto"
              dayMaxEvents={3}
              eventClick={(info) => {
                const eventDate = info.event.start;
                setSelectedCalendarDate(eventDate);
              }}
              dateClick={(info) => {
                setSelectedCalendarDate(info.date);
              }}
            />

            {/* Selected Date Leaves List */}
            {selectedCalendarDate && (
              <div className="mt-4 border-t border-[var(--border-base)] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold">
                    Leaves on {format(selectedCalendarDate, 'dd MMM yyyy')}
                  </h4>
                  <button
                    onClick={() => setSelectedCalendarDate(null)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Clear
                  </button>
                </div>

                {/* Stats Summary */}
                {(() => {
                  const dayLeaves = leaves.filter(leave => {
                    const start = new Date(leave.startDate);
                    const end = new Date(leave.endDate);
                    const current = new Date(selectedCalendarDate);
                    return current >= start && current <= end;
                  });

                  if (dayLeaves.length === 0) {
                    return <p className="text-sm text-[var(--text-muted)]">No leaves on this date</p>;
                  }

                  const approved = dayLeaves.filter(l => l.status === 'approved').length;
                  const rejected = dayLeaves.filter(l => l.status === 'rejected').length;
                  const pending = dayLeaves.filter(l => l.status === 'pending').length;
                  const paid = dayLeaves.filter(l => l.leaveType === 'paid').length;
                  const unpaid = dayLeaves.filter(l => l.leaveType === 'unpaid').length;
                  const sick = dayLeaves.filter(l => l.leaveType === 'sick').length;
                  const casual = dayLeaves.filter(l => l.leaveType === 'casual').length;

                  return (
                    <>
                      {/* Status Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-[var(--green)]/10 border border-[var(--green)]/20 rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-[var(--green)]">{approved}</p>
                          <p className="text-xs text-[var(--green)]">Approved</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-red-600">{rejected}</p>
                          <p className="text-xs text-red-600">Rejected</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-amber-600">{pending}</p>
                          <p className="text-xs text-amber-600">Pending</p>
                        </div>
                      </div>

                      {/* Leave Type Stats */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-blue-600">{paid}</p>
                          <p className="text-[10px] text-blue-600">Paid</p>
                        </div>
                        <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-[var(--text-secondary)]">{unpaid}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">Unpaid</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-purple-600">{sick}</p>
                          <p className="text-[10px] text-purple-600">Sick</p>
                        </div>
                        <div className="bg-pink-50 border border-pink-200 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-pink-600">{casual}</p>
                          <p className="text-[10px] text-pink-600">Casual</p>
                        </div>
                      </div>

                      {/* Employee List */}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Total: {dayLeaves.length} employee(s)</p>
                        {dayLeaves.map((leave, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                              {leave.employeeId?.firstName?.[0]}{leave.employeeId?.lastName?.[0]}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold">{leave.employeeId?.firstName} {leave.employeeId?.lastName}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {format(new Date(leave.startDate), 'dd MMM')} - {format(new Date(leave.endDate), 'dd MMM')} • {leave.leaveType}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${leave.status === 'approved' ? 'bg-[var(--green)]/10 text-[var(--green)]' :
                              leave.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                'bg-amber-100 text-amber-600'
                              }`}>
                              {leave.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Default Upcoming Leaves List (shown when no date selected) */}
            {!selectedCalendarDate && (
              <div className="mt-6 border-t border-[var(--border-base)] pt-4">
                <h4 className="text-sm font-bold mb-3">Upcoming Leaves</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {leaves.filter(leave => {
                    const start = new Date(leave.startDate);
                    return start >= new Date();
                  }).slice(0, 10).map((leave, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                        {leave.employeeId?.firstName?.[0]}{leave.employeeId?.lastName?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{leave.employeeId?.firstName} {leave.employeeId?.lastName}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {format(new Date(leave.startDate), 'dd MMM')} - {format(new Date(leave.endDate), 'dd MMM')} • {leave.leaveType}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${leave.status === 'approved' ? 'bg-[var(--green)]/10 text-[var(--green)]' :
                        leave.status === 'rejected' ? 'bg-red-100 text-red-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                        {leave.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
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
        <Button variant="outline" onClick={fetchLeaves} className="ml-auto">
          <RefreshCw size={16} className="mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={tableColumns.filter(Boolean)}
        data={filteredLeaves}
        total={filteredLeaves.length}
        rowKey="_id"
        emptyText={kpiFilter ? `No ${kpiFilter} leaves found.` : "No leaves found."}
        loading={loading}
        onRowClick={(row) => setViewLeave(row)}
        expandedRowKey={viewLeave?._id}
        renderExpanded={renderExpanded}
      />

      {/* Add/Edit Leave Modal */}
      {showLeaveModal && (
        <Modal
          open={showLeaveModal}
          onClose={() => {
            setShowLeaveModal(false);
            setEditingLeave(null);
          }}
          title={editingLeave ? "Edit Leave Application" : "Apply for Leave"}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => {
                setShowLeaveModal(false);
                setEditingLeave(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleApplyLeave} disabled={!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate}>
                {editingLeave ? 'Save Changes' : 'Submit Application'}
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
            <textarea
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="Reason for leave..."
              rows={3}
              className="w-full p-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)]"
            />
          </FormField>
        </Modal>
      )}
    </div>
  );
};

export default LeavesPage;

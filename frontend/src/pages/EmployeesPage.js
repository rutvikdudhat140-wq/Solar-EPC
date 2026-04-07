import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { PageHeader } from '../components/ui/PageHeader';
import KpiCards from '../components/hrm/KpiCards';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { 
  Search, RefreshCw, Plus, Edit, Trash2, Download,
  Mail, Phone, Briefcase, Calendar, DollarSign, MapPin,
  User, Building, Shield, Star, X
} from 'lucide-react';
import { employeeApi, departmentApi } from '../services/hrmApi';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';

// ── Employee Detail View Modal ─────────────────────────────────────────────
const EmployeeViewModal = ({ employee, onClose, onEdit, inline = false }) => {
  if (!employee) return null;
  const initial = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
  const statusColor = employee.status === 'active' ? 'text-[var(--green)] bg-[var(--green)]/10' : 'text-red-500 bg-red-500/10';
  const InfoRow = ({ icon: Icon, label, value, accent }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border-muted)] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-[var(--text-muted)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-wide font-medium">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 truncate ${accent || 'text-[var(--text-primary)]'}`}>{value || '—'}</p>
      </div>
    </div>
  );

  const content = (
    <div className="space-y-0">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl mb-5 p-6 bg-gradient-to-br from-[var(--primary)]/20 via-[var(--primary)]/5 to-transparent border border-[var(--border-base)]">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[var(--primary)]/10 -translate-y-8 translate-x-8" />
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white flex items-center justify-center font-bold text-xl shadow-lg">{initial}</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{employee.firstName} {employee.lastName}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{employee.roleId || 'Employee'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>{employee.status || 'active'}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-muted)]">{employee.employeeId}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[var(--primary)]">₹{Number(employee.salary || 0).toLocaleString()}</p>
            <p className="text-xs text-[var(--text-faint)]">Monthly Salary</p>
          </div>
        </div>
      </div>
      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div className="glass-card p-4">
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5"><User size={13} /> Personal Info</h3>
          <InfoRow icon={Mail} label="Email" value={employee.email} />
          <InfoRow icon={Phone} label="Phone" value={employee.phone} />
          <InfoRow icon={MapPin} label="Address" value={employee.address} />
        </div>
        <div className="glass-card p-4">
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Building size={13} /> Work Info</h3>
          <InfoRow icon={Briefcase} label="Department" value={employee.department} accent="text-[var(--primary)]" />
          <InfoRow icon={Shield} label="Role" value={employee.roleId} />
          <InfoRow icon={Calendar} label="Joining Date" value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
        </div>
      </div>
      {/* Emergency Contact */}
      {(employee.emergencyContact || employee.emergencyPhone) && (
        <div className="glass-card p-4 mt-4">
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Star size={13} /> Emergency Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={User} label="Contact Name" value={employee.emergencyContact} />
            <InfoRow icon={Phone} label="Contact Phone" value={employee.emergencyPhone} />
          </div>
        </div>
      )}
    </div>
  );

  // Inline mode — render without Modal wrapper
  if (inline) {
    return (
      <div>
        {content}
        {onEdit && (
          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[var(--border-muted)]">
            <button onClick={() => { onClose(); onEdit(employee); }} className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"><Edit size={13} /> Edit Employee</button>
          </div>
        )}
      </div>
    );
  }

  // Modal mode
  return (
    <Modal open={!!employee} onClose={onClose} title="" size="lg" footer={
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"><X size={13} /> Close</button>
        {onEdit && (
          <button onClick={() => { onClose(); onEdit(employee); }} className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"><Edit size={13} /> Edit Employee</button>
        )}
      </div>
    }>
      {content}
    </Modal>
  );
};

const EmployeesPage = () => {
  const { customRoles } = useSettings();
  
  // Get permissions for employees module
  const { 
    canView, 
    canCreate, 
    canEdit, 
    canDelete, 
    canExport, 
    columns,
    permissions,
    userRole
  } = usePermissions('employees');
  
  // Debug permissions
  useEffect(() => {
    console.log('[DEBUG] usePermissions result:', { 
      userRole, 
      permissions, 
      canEdit: canEdit(),
      canCreate: canCreate(),
      canDelete: canDelete()
    });
  }, [permissions, userRole]);
  
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewEmployee, setViewEmployee] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    employeeId: '',
    department: '',
    roleId: '',
    joiningDate: '',
    salary: '',
    status: 'active',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    departments: 0
  });

  // KPI filter state - shows filtered data in table instead of modal
  const [kpiFilter, setKpiFilter] = useState(null); // 'all' | 'active' | 'inactive' | null

  // Dashboard metrics for new KpiCards component
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin' || user?.isSuperAdmin === true;

  const fetchDashboardMetrics = async () => {
    try {
      const response = await api.get('/hrm/dashboard-metrics');
      console.log('[DEBUG] Dashboard metrics API response:', response.data);
      // Handle both { data: {...} } and direct {...} response formats
      const metrics = response.data?.data || response.data;
      console.log('[DEBUG] Extracted metrics:', metrics);
      setDashboardMetrics(metrics || null);
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
      // Set fallback data so UI doesn't look broken
      setDashboardMetrics({
        attendance: { percentage: 0, presentToday: 0, totalToday: 0 },
        leaves: { pending: 0 },
        payroll: { totalPayroll: 0, unpaidCount: 0 },
        employees: { atRiskCount: 0 }
      });
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchDashboardMetrics();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      console.log('[DEBUG] Fetching employees...');
      const response = await employeeApi.getAll();
      console.log('[DEBUG] Employee API response:', response);
      const data = response?.data || response || [];
      console.log('[DEBUG] Extracted employee data:', data);
      setEmployees(data);

      // Calculate stats
      const active = data.filter(e => e.status === 'active').length;
      const inactive = data.filter(e => e.status === 'inactive').length;
      const uniqueDepts = [...new Set(data.map(e => e.department))].filter(Boolean);

      setStats({
        total: data.length,
        active,
        inactive,
        departments: uniqueDepts.length
      });
    } catch (error) {
      console.error('[DEBUG] Error fetching employees:', error);
      console.error('[DEBUG] Error response:', error.response);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAll();
      const data = response?.data || response || [];
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments');
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.firstName?.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!formData.lastName?.trim()) {
      toast.error('Last name is required');
      return;
    }
    if (!formData.employeeId?.trim()) {
      toast.error('Employee ID is required');
      return;
    }
    if (!formData.email?.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!formData.phone?.trim()) {
      toast.error('Phone is required');
      return;
    }
    if (!editingEmployee && !formData.password) {
      toast.error('Password is required for new employees');
      return;
    }
    if (!formData.joiningDate) {
      toast.error('Join date is required');
      return;
    }

    // Prepare data - convert salary to number
    const submitData = {
      ...formData,
      salary: formData.salary ? Number(formData.salary) : undefined,
    };

    console.log('[DEBUG] Submitting employee data:', submitData);
    console.log('[DEBUG] Form data roleId:', formData.roleId); // Add debug log for roleId
    console.log('[DEBUG] Custom roles:', customRoles); // Add debug log for customRoles
    try {
      if (editingEmployee) {
        // Remove password when updating
        const { password, ...updateData } = submitData;
        await employeeApi.update(editingEmployee._id, updateData);
        toast.success('Employee updated successfully');
      } else {
        await employeeApi.create(submitData);
        toast.success('Employee created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error('[DEBUG] Employee save error:', error);
      console.error('[DEBUG] Error response:', error.response?.data);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to save employee');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await employeeApi.delete(id);
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      password: '',
      employeeId: employee.employeeId || '',
      department: employee.department || '',
      roleId: employee.roleId || '',
      joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
      salary: employee.salary || '',
      status: employee.status || 'active',
      address: employee.address || '',
      emergencyContact: employee.emergencyContact || '',
      emergencyPhone: employee.emergencyPhone || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      employeeId: '',
      department: '',
      roleId: '',
      joiningDate: '',
      salary: '',
      status: 'active',
      address: '',
      emergencyContact: '',
      emergencyPhone: '',
    });
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
    
    // KPI filter takes precedence over manual status filter
    let matchesStatus = true;
    if (kpiFilter) {
      matchesStatus = emp.status === kpiFilter;
    } else {
      matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    }

    return matchesSearch && matchesDept && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['Employee ID', 'Name', 'Email', 'Phone', 'Department', 'Role', 'Join Date', 'Status', 'Salary'];
    const rows = filteredEmployees.map(emp => [
      emp.employeeId,
      `${emp.firstName} ${emp.lastName}`,
      emp.email,
      emp.phone,
      emp.department,
      emp.roleId,
      emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : '',
      emp.status,
      emp.salary
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Employees exported successfully');
  };

  // Build columns dynamically based on permissions
  const tableColumns = [
    columns.employee && {
      key: 'employee',
      header: 'Employee',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white flex items-center justify-center font-bold text-sm">
            {row.firstName?.[0]}{row.lastName?.[0]}
          </div>
          <div>
            <p className="font-semibold text-sm">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-[var(--text-muted)]">{row.employeeId}</p>
          </div>
        </div>
      ),
    },
    columns.contact && {
      key: 'contact',
      header: 'Contact',
      render: (_, row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-[var(--text-muted)]" />
            <span>{row.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone size={14} className="text-[var(--text-muted)]" />
            <span>{row.phone}</span>
          </div>
        </div>
      ),
    },
    columns.department && {
      key: 'department',
      header: 'Department',
      render: (val) => (
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-[var(--text-muted)]" />
          <span className="text-sm">{val || '-'}</span>
        </div>
      ),
    },
    columns.role && {
      key: 'roleId',
      header: 'Role',
      render: (val) => {
        // customRoles is an object/dictionary: { roleId: { id, label, ... } }
        const role = customRoles?.[val];
        if (role) {
          return <span className="text-sm">{role.label || role.name || val}</span>;
        }
        // Fallback: try array search if customRoles is array
        const roleFromArray = Array.isArray(customRoles) 
          ? customRoles.find(r => (r._id || r.id) === val)
          : null;
        return <span className="text-sm">{roleFromArray?.label || roleFromArray?.name || val || '-'}</span>;
      },
    },
    columns.joinDate && {
      key: 'joiningDate',
      header: 'Join Date',
      render: (val) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--text-muted)]" />
          <span className="text-sm">{val ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
        </div>
      ),
    },
    columns.salary && {
      key: 'salary',
      header: 'Salary',
      render: (val) => (
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-[var(--text-muted)]" />
          <span className="text-sm font-medium">{val ? `₹${Number(val).toLocaleString()}` : '-'}</span>
        </div>
      ),
    },
    columns.status && {
      key: 'status',
      header: 'Status',
      render: (val) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${val === 'active'
          ? 'bg-[var(--green)]/10 text-[var(--green)]'
          : 'bg-red-500/10 text-red-600'
          }`}>
          {val}
        </span>
      ),
    },
    columns.actions && (canEdit() || canDelete()) && {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {canEdit() && (
            <button
              onClick={() => handleEdit(row)}
              className="p-1.5 rounded hover:bg-blue-500/10 text-blue-600"
              title="Edit"
            >
              <Edit size={16} />
            </button>
          )}
          {canDelete() && (
            <button
              onClick={() => handleDelete(row._id)}
              className="p-1.5 rounded hover:bg-red-500/10 text-red-600"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Employee Management"
        subtitle="Manage all employees and their details"
        actions={
          <div className="flex items-center gap-2">
            {canExport() && (
              <Button variant="outline" onClick={exportToCSV} className="flex items-center gap-2">
                <Download size={16} />
                Export CSV
              </Button>
            )}
            {canCreate() && (
              <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
                <Plus size={16} />
                Add Employee
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards - Dynamic Role-Based */}
      <KpiCards 
        role={isAdmin ? 'admin' : 'employee'} 
        metrics={dashboardMetrics} 
      />

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder="Search by name, ID or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          <Select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-44 h-10"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept.name}>{dept.name}</option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-36 h-10"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>

          <Button variant="outline" onClick={fetchEmployees} className="flex items-center gap-2">
            <RefreshCw size={16} />
            Refresh
          </Button>

          {canCreate() && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 ml-auto">
              <Plus size={16} />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-card p-4">
        <DataTable
          columns={tableColumns}
          data={filteredEmployees}
          emptyText={kpiFilter ? `No ${kpiFilter} employees found.` : "No employees found."}
          loading={loading}
          onRowClick={(row) => setViewEmployee(row)}
          expandedRowKey={viewEmployee?._id}
          renderExpanded={(emp) => (
            <div className="p-4 border-t border-[var(--border-muted)] bg-gradient-to-b from-white to-[var(--bg-elevated)]">
              <EmployeeViewModal employee={emp} onClose={() => setViewEmployee(null)} onEdit={canEdit() ? handleEdit : null} inline />
            </div>
          )}
        />
      </div>

      {/* Employee Detail Modal (Popup) */}
      {viewEmployee && (
        <Modal
          open={!!viewEmployee}
          onClose={() => setViewEmployee(null)}
          title="Employee Details"
          size="lg"
          footer={
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setViewEmployee(null)}>
                Close
              </Button>
              {canEdit() && (
                <Button onClick={() => { setViewEmployee(null); handleEdit(viewEmployee); }}>
                  Edit Employee
                </Button>
              )}
            </div>
          }
        >
          <EmployeeViewModal 
            employee={viewEmployee} 
            onClose={() => setViewEmployee(null)} 
            onEdit={canEdit() ? handleEdit : null} 
            inline 
          />
        </Modal>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
        size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingEmployee ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="First Name *">
            <Input
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Enter first name"
            />
          </FormField>

          <FormField label="Last Name *">
            <Input
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Enter last name"
            />
          </FormField>

          <FormField label="Employee ID *">
            <Input
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              placeholder="e.g., EMP001"
            />
          </FormField>

          <FormField label="Email *">
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </FormField>

          <FormField label="Phone *">
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              required
            />
          </FormField>

          {!editingEmployee && (
            <FormField label="Password *">
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                required
              />
            </FormField>
          )}

          <FormField label="Department">
            <Select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept.name}>{dept.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Role *">
            <Select
              value={formData.roleId}
              onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              required
            >
              <option value="">Select Role</option>
              {Object.values(customRoles || {}).map((role) => (
                <option key={role._id || role.id} value={role._id || role.id}>
                  {role.label || role.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Join Date *">
            <Input
              type="date"
              value={formData.joiningDate}
              onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Salary">
            <Input
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              placeholder="Enter salary"
            />
          </FormField>

          <FormField label="Status">
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>

          <FormField label="Address" className="md:col-span-2">
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter address"
              rows={2}
            />
          </FormField>

          <FormField label="Emergency Contact Name">
            <Input
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              placeholder="Emergency contact name"
            />
          </FormField>

          <FormField label="Emergency Contact Phone">
            <Input
              value={formData.emergencyPhone}
              onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
              placeholder="Emergency contact phone"
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeesPage;

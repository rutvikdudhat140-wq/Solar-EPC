import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import KpiCards from '../components/hrm/KpiCards';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { Search, RefreshCw, Plus, Building, X, Users, User, Calendar, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { departmentApi, employeeApi } from '../services/hrmApi';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';

// †â€™†â€™Department Detail View Modal †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const DepartmentViewModal = ({ department, employees, onClose, onEdit }) => {
 if (!department) return null;
 const deptEmployees = employees.filter(e => e.department === department.name);
 const manager = null; // Removed manager feature
 const active = deptEmployees.filter(e => e.status === 'active').length;
 return (
 <Modal open={!!department} onClose={onClose} title="" size="lg" footer={
 <div className="flex items-center justify-between">
 <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><X size={13} /> Close</button>
 <button onClick={() => { onClose(); onEdit(department); }} className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-[var(--primary)] text-white hover:opacity-90"><Building size={13} /> Edit Department</button>
 </div>
 }>
 {/* Hero */}
 <div className="relative overflow-hidden rounded-xl mb-4 p-5 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-[var(--border-base)]">
 <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-amber-500/10 -translate-y-6 translate-x-6" />
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg"><Building size={26} /></div>
 <div className="flex-1">
 <h2 className="text-xl font-bold text-[var(--text-primary)]">{department.name}</h2>
 {department.code && <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-muted)] mt-1 inline-block">{department.code}</span>}
 <div className="flex items-center gap-2 mt-2">
 <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${department.isActive !== false ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'bg-red-500/10 text-red-500'}`}>{department.isActive !== false ? 'Active' : 'Inactive'}</span>
 </div>
 </div>
 <div className="text-right">
 <p className="text-3xl font-bold text-amber-500">{deptEmployees.length}</p>
 <p className="text-xs text-[var(--text-faint)]">Total Employees</p>
 </div>
 </div>
 </div>
 {/* Stats */}
 <div className="grid grid-cols-3 gap-3 mb-4">
 {[
 { label: 'Total', value: deptEmployees.length, color: 'bg-blue-500/10 border-blue-500/20 text-blue-500' },
 { label: 'Active', value: active, color: 'bg-[var(--green)]/10 border-[var(--green)]/20 text-[var(--green)]' },
 { label: 'Inactive', value: deptEmployees.length - active, color: 'bg-red-500/10 border-red-500/20 text-red-500' },
 ].map(s => (
 <div key={s.label} className={`p-3 rounded-xl border text-center ${s.color}`}>
 <p className="text-2xl font-bold">{s.value}</p>
 <p className="text-[10px] uppercase tracking-wide opacity-70 font-medium mt-0.5">{s.label}</p>
 </div>
 ))}
 </div>
 {/* Manager */}
 {manager && (
 <div className="glass-card p-4 mb-4">
 <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5"><Shield size={12} /> Manager</p>
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white flex items-center justify-center font-bold text-sm">{manager.firstName?.[0]}{manager.lastName?.[0]}</div>
 <div>
 <p className="font-semibold text-sm text-[var(--text-primary)]">{manager.firstName} {manager.lastName}</p>
 <p className="text-xs text-[var(--text-muted)]">{manager.employeeId} †â€™…Â¡Â· {manager.roleId}</p>
 </div>
 </div>
 </div>
 )}
 {/* Description */}
 {department.description && (
 <div className="glass-card p-4 mb-4">
 <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Description</p>
 <p className="text-sm text-[var(--text-primary)]">{department.description}</p>
 </div>
 )}
 {/* Employees List */}
 {deptEmployees.length > 0 && (
 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Users size={12} /> Team Members</p>
 <div className="space-y-2 max-h-48 overflow-y-auto">
 {deptEmployees.map(emp => (
 <div key={emp._id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-elevated)]">
 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white flex items-center justify-center font-bold text-xs">{emp.firstName?.[0]}{emp.lastName?.[0]}</div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{emp.firstName} {emp.lastName}</p>
 <p className="text-[10px] text-[var(--text-muted)]">{emp.roleId || 'Employee'}</p>
 </div>
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${emp.status === 'active' ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'bg-red-500/10 text-red-500'}`}>{emp.status}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </Modal>
 );
};

const DepartmentsPage = () => {
 const [mounted, setMounted] = useState(false);
 const [employees, setEmployees] = useState([]);
 const [departments, setDepartments] = useState([]);
 const [loading, setLoading] = useState(false);
 const [departmentSearch, setDepartmentSearch] = useState('');
 const [showDepartmentModal, setShowDepartmentModal] = useState(false);
 const [editingDepartment, setEditingDepartment] = useState(null);
 const [viewDepartment, setViewDepartment] = useState(null);
 // KPI filter state - shows filtered data in table instead of modal
 const [kpiFilter, setKpiFilter] = useState(null); // 'all' | 'active' | 'with_employees' | null
 const [departmentForm, setDepartmentForm] = useState({
 name: '',
 code: '',
 description: '',
 });

 // Dashboard metrics for new KpiCards component
 const [dashboardMetrics, setDashboardMetrics] = useState(null);
 const { user } = useAuth();
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

 // Get permissions for departments module
 const { 
 canView, 
 canCreate, 
 canEdit, 
 canDelete, 
 canExport, 
 canAssign,
 columns 
 } = usePermissions('departments');

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

 const fetchDepartments = async () => {
 try {
 setLoading(true);
 const response = await departmentApi.getAll();
 const departmentData = response.data?.data || response.data || [];
 setDepartments(departmentData);
 } catch (error) {
 toast.error('Failed to fetch departments');
 setDepartments([]);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 setMounted(true);
 if (canView()) {
 fetchDepartments();
 fetchEmployees();
 fetchDashboardMetrics();
 }
 }, []);

 if (!mounted) return null;

 const handleCreateDepartment = async () => {
 if (!departmentForm.name) {
 toast.error('Department name is required');
 return;
 }
 try {
 if (editingDepartment) {
 await departmentApi.update(editingDepartment._id, departmentForm);
 toast.success('Department updated successfully');
 } else {
 await departmentApi.create(departmentForm);
 toast.success('Department created successfully');
 }
 setShowDepartmentModal(false);
 setEditingDepartment(null);
 fetchDepartments();
 setDepartmentForm({
 name: '',
 code: '',
 description: '',
 });
 } catch (error) {
 toast.error(editingDepartment ? 'Failed to update department' : 'Failed to create department');
 }
 };

 const handleUpdateDepartment = async (id, data) => {
 try {
 await departmentApi.update(id, data);
 toast.success('Department updated successfully');
 fetchDepartments();
 } catch (error) {
 toast.error('Failed to update department');
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

 const filteredDepartments = departments.filter(dept => {
 // KPI filter
 if (kpiFilter) {
 if (kpiFilter === 'active' && dept.isActive === false) return false;
 if (kpiFilter === 'with_employees' && (!deptStats[dept.name] || deptStats[dept.name] === 0)) return false;
 }
 
 // Search filter
 if (departmentSearch === '') return true;
 const search = departmentSearch.toLowerCase();
 return (
 dept.name.toLowerCase().includes(search) ||
 dept.code?.toLowerCase().includes(search) ||
 dept.description?.toLowerCase().includes(search)
 );
 });

 const getDepartmentStats = () => {
 const deptCounts = {};
 employees.forEach(emp => {
 if (emp.department) {
 deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
 }
 });
 return deptCounts;
 };

 const deptStats = getDepartmentStats();

 const kpis = [
 {
 label: 'Total Departments',
 value: departments.length,
 icon: Building,
 variant: 'emerald',
 onClick: () => {
 setKpiFilter(null);
 // Auto-expand first department
 setTimeout(() => {
 if (filteredDepartments.length > 0) {
 setViewDepartment(filteredDepartments[0]);
 } else {
 setViewDepartment(null);
 }
 }, 100);
 },
 },
 {
 label: 'Active Departments',
 value: departments.filter(d => d.isActive !== false).length,
 icon: Building,
 variant: 'blue',
 onClick: () => {
 setKpiFilter('active');
 // Auto-expand first active department
 setTimeout(() => {
 const firstActive = departments.find(d => d.isActive !== false);
 setViewDepartment(firstActive || null);
 }, 100);
 },
 },
 {
 label: 'Employees in Depts',
 value: Object.keys(deptStats).length,
 icon: Building,
 variant: 'amber',
 onClick: () => {
 setKpiFilter('with_employees');
 // Auto-expand first department with employees
 setTimeout(() => {
 const firstWithEmployees = departments.find(d => deptStats[d.name] && deptStats[d.name] > 0);
 setViewDepartment(firstWithEmployees || null);
 }, 100);
 },
 },
 {
 label: 'Avg Team Size',
 value: departments.length > 0 ? Math.round(employees.length / departments.length) : 0,
 icon: Building,
 variant: 'purple',
 },
 ];

 // Build columns dynamically based on permissions
 const tableColumns = [
 columns.departmentName && {
 key: 'name',
 header: 'Department Name',
 render: (val) => (
 <div>
 <p className="font-medium text-sm">{val}</p>
 </div>
 ),
 },
 columns.code && {
 key: 'code',
 header: 'Code',
 render: (val) => (
 <span className="px-2 py-1 rounded-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-color)]">
 {val || '-'}
 </span>
 ),
 },
 columns.employees && {
 key: 'employeeCount',
 header: 'Employees',
 render: (_, row) => {
 const count = deptStats[row.name] || 0;
 return <span className="font-medium">{count}</span>;
 },
 },
 columns.description && {
 key: 'description',
 header: 'Description',
 render: (val) => (
 <div className="max-w-xs truncate" title={val}>
 {val || '-'}
 </div>
 ),
 },
 columns.status && {
 key: 'isActive',
 header: 'Status',
 render: (val) => (
 <span className={`px-2 py-1 rounded-full text-xs ${val !== false ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'bg-red-500/10 text-red-500'
 }`}>
 {val !== false ? 'Active' : 'Inactive'}
 </span>
 ),
 },
 columns.created && {
 key: 'createdAt',
 header: 'Created',
 render: (val) => format(new Date(val), 'dd MMM yyyy'),
 },
 columns.actions && (canEdit() || canDelete()) && {
 key: 'actions',
 header: 'Actions',
 render: (_, row) => (
 <div className="flex gap-1">
 {canEdit() && (
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setEditingDepartment(row);
 setDepartmentForm({
 name: row.name,
 code: row.code || '',
 description: row.description || '',
 });
 setShowDepartmentModal(true);
 }}
 >
 Edit
 </Button>
 )}
 {canDelete() && (
 <Button
 size="sm"
 variant="outline"
 onClick={() => handleDeleteDepartment(row._id)}
 className="text-red-600 border-red-600/30 hover:bg-red-600/10"
 >
 Delete
 </Button>
 )}
 </div>
 ),
 },
 ].filter(Boolean);

 return (
 <div className="animate-fade-in space-y-5">
 <PageHeader
 title="Departments"
 subtitle="Manage organizational departments and teams"
 actions={canCreate() ? [
 {
 type: 'button',
 label: 'Add Department',
 icon: Plus,
 variant: 'primary',
 onClick: () => {
 setEditingDepartment(null);
 setDepartmentForm({
 name: '',
 code: '',
 description: '',
 });
 setShowDepartmentModal(true);
 },
 },
 ] : []}
 />

 {/* KPI Cards - Dynamic Role-Based */}
 <KpiCards 
 role={isAdmin ? 'admin' : 'employee'} 
 metrics={dashboardMetrics} 
 />

 {/* Filters */}
 <div className="flex items-center gap-3 flex-wrap">
 <div className="relative flex-1 max-w-sm">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
 <Input
 placeholder="Search departments..."
 value={departmentSearch}
 onChange={(e) => setDepartmentSearch(e.target.value)}
 className="pl-9 h-9"
 />
 </div>
 <p className="text-sm text-[var(--text-muted)]">
 {filteredDepartments.length} of {departments.length} departments
 </p>
 <Button
 variant="outline"
 onClick={canView() ? fetchDepartments : undefined}
 disabled={!canView()}
 className="ml-auto flex items-center gap-2"
 >
 <RefreshCw size={14} /> Refresh
 </Button>
 </div>

 {/* Departments Table */}
 <DataTable
 columns={tableColumns}
 data={filteredDepartments}
 emptyText={
 kpiFilter === 'active' ? 'No active departments found.' :
 kpiFilter === 'with_employees' ? 'No departments with employees found.' :
 'No departments found.'
 }
 loading={loading}
 onRowClick={(row) => setViewDepartment(row)}
 expandedRowKey={viewDepartment?._id}
 renderExpanded={(dept) => (
 <div className="p-4 border-t border-[var(--border-muted)] bg-gradient-to-b from-white to-[var(--bg-elevated)]">
 <DepartmentViewModal 
 department={dept} 
 employees={employees} 
 onClose={() => setViewDepartment(null)} 
 onEdit={canEdit() ? (d) => { 
 setEditingDepartment(d);
 setDepartmentForm({ name: d.name, code: d.code || '', description: d.description || '' }); 
 setShowDepartmentModal(true); 
 } : () => {}} 
 inline 
 />
 </div>
 )}
 />

 {/* KPI List Modal - REMOVED, now filters table instead */}

 {/* Add/Edit Department Modal */}
 {showDepartmentModal && (
 <Modal
 open={showDepartmentModal}
 onClose={() => {
 setShowDepartmentModal(false);
 setEditingDepartment(null);
 }}
 title={editingDepartment ? "Edit Department" : "Add Department"}
 footer={
 <div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => {
 setShowDepartmentModal(false);
 setEditingDepartment(null);
 }}>
 Cancel
 </Button>
 <Button onClick={handleCreateDepartment} disabled={!departmentForm.name}>
 {editingDepartment ? 'Save Changes' : <><Plus size={13} /> Create</>}
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
 <textarea
 value={departmentForm.description}
 onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
 placeholder="Department description..."
 rows={3}
 className="w-full p-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)]"
 />
 </FormField>
 </Modal>
 )}
 </div>
 );
};

export default DepartmentsPage;

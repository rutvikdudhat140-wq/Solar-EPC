import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import KpiCards from '../components/hrm/KpiCards';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { Search, RefreshCw, Plus, Wallet, X, User, Calendar, TrendingUp, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { payrollApi, employeeApi } from '../services/hrmApi';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';

// †€™†€™Payroll Detail View Modal †€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™†€™
const PayrollViewModal = ({ payroll, onClose }) => {
 if (!payroll) return null;
 const emp = payroll.employeeId || {};
 const initial = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase() || 'P';
 const monthName = new Date(2000, (payroll.month || 1) - 1, 1).toLocaleString('default', { month: 'long' });
 const net = payroll.netSalary || (payroll.baseSalary + (payroll.allowances||0) + (payroll.bonus||0) - (payroll.deductions||0));
 const stCls = { pending: 'bg-amber-500/10 text-amber-500', paid: 'bg-[var(--green)]/10 text-[var(--green)]', failed: 'bg-red-500/10 text-red-500' };
 const BreakItem = ({ label, value, color, bold }) => (
 <div className={`flex items-center justify-between py-2.5 border-b border-[var(--border-muted)] last:border-0 ${bold ? 'font-bold' : ''}`}>
 <span className="text-sm text-[var(--text-secondary)]">{label}</span>
 <span className={`text-sm font-semibold ${color || 'text-[var(--text-primary)]'}`}>†€™{Number(value||0).toLocaleString()}</span>
 </div>
 );
 return (
 <Modal open={!!payroll} onClose={onClose} title="" size="md" footer={
 <button onClick={onClose} className="px-4 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><X size={13} className="inline mr-1" />Close</button>
 }>
 {/* Hero */}
 <div className="relative overflow-hidden rounded-xl mb-4 p-5 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-[var(--border-base)]">
 <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-[var(--green)]/10 -translate-y-6 translate-x-6" />
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">{initial}</div>
 <div className="flex-1">
 <h2 className="text-lg font-bold text-[var(--text-primary)]">{emp.firstName} {emp.lastName}</h2>
 <p className="text-xs text-[var(--text-muted)]">{emp.employeeId} †€™…¡· {emp.department}</p>
 <div className="flex items-center gap-2 mt-2">
 <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${stCls[payroll.paymentStatus] || stCls.pending}`}>{payroll.paymentStatus || 'pending'}</span>
 <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-muted)]">{monthName} {payroll.year}</span>
 </div>
 </div>
 <div className="text-right">
 <p className="text-2xl font-bold text-[var(--green)]">†€™{Number(net).toLocaleString()}</p>
 <p className="text-xs text-[var(--text-faint)]">Net Salary</p>
 </div>
 </div>
 </div>
 {/* Salary Breakdown */}
 <div className="glass-card p-4">
 <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Wallet size={13} /> Salary Breakdown</h3>
 <BreakItem label="Base Salary" value={payroll.baseSalary} />
 <BreakItem label="Allowances" value={payroll.allowances} color="text-blue-500" />
 <BreakItem label="Bonus" value={payroll.bonus} color="text-purple-500" />
 <BreakItem label="Deductions" value={payroll.deductions} color="text-red-500" />
 <div className="mt-2 pt-2 flex items-center justify-between border-t-2 border-[var(--border-base)]">
 <span className="text-sm font-bold text-[var(--text-primary)]">Net Salary</span>
 <span className="text-xl font-bold text-[var(--green)]">†€™{Number(net).toLocaleString()}</span>
 </div>
 </div>
 {payroll.createdAt && (
 <p className="text-xs text-[var(--text-faint)] text-center mt-3">Generated on {format(new Date(payroll.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
 )}
 </Modal>
 );
};

const PayrollPage = () => {
 const [mounted, setMounted] = useState(false);
 
 // Get permissions for payroll module
 const { 
 canView, 
 canCreate, 
 canEdit, 
 canDelete, 
 canExport, 
 canGenerate,
 columns 
 } = usePermissions('payroll');
 
 const [employees, setEmployees] = useState([]);
 const [payrolls, setPayrolls] = useState([]);
 const [loading, setLoading] = useState(false);
 const [payrollSearch, setPayrollSearch] = useState('');
 const [showPayrollModal, setShowPayrollModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [editingPayroll, setEditingPayroll] = useState(null);
 const [viewPayroll, setViewPayroll] = useState(null);
 const [payrollForm, setPayrollForm] = useState({
 employeeId: '',
 month: new Date().getMonth() + 1,
 year: new Date().getFullYear(),
 baseSalary: 0,
 allowances: 0,
 deductions: 0,
 bonus: 0,
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
 console.error('[DEBUG] Error response:', error.response);
 console.error('[DEBUG] Error config:', error.config);
 console.error('[DEBUG] Error request:', error.request);
 toast.error('Failed to fetch employees');
 }
 };

 const fetchPayrolls = async () => {
 try {
 setLoading(true);
 const response = await payrollApi.getAll();
 const payrollData = response.data?.data || response.data || [];
 setPayrolls(payrollData);
 } catch (error) {
 toast.error('Failed to fetch payrolls');
 setPayrolls([]);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 setMounted(true);
 fetchPayrolls();
 fetchEmployees();
 fetchDashboardMetrics();
 }, []);

 if (!mounted) return null;

 const handleGeneratePayroll = async () => {
 if (!payrollForm.employeeId || !payrollForm.baseSalary) {
 toast.error('Please fill all required fields');
 return;
 }
 console.log('[DEBUG] Generating payroll with data:', payrollForm);

 // Ensure all numeric values are proper numbers
 const data = {
 employeeId: payrollForm.employeeId,
 month: Number(payrollForm.month),
 year: Number(payrollForm.year),
 baseSalary: Number(payrollForm.baseSalary),
 allowances: Number(payrollForm.allowances),
 deductions: Number(payrollForm.deductions),
 bonus: Number(payrollForm.bonus),
 };

 console.log('[DEBUG] Cleaned data:', data);

 try {
 const response = await payrollApi.create(data);
 console.log('[DEBUG] Payroll created:', response);
 toast.success('Payroll generated successfully');
 setShowPayrollModal(false);
 fetchPayrolls();
 setPayrollForm({
 employeeId: '',
 month: new Date().getMonth() + 1,
 year: new Date().getFullYear(),
 baseSalary: 0,
 allowances: 0,
 deductions: 0,
 bonus: 0,
 });
 } catch (error) {
 console.error('[DEBUG] Payroll error:', error);
 console.error('[DEBUG] Error response:', error.response);
 toast.error(error.response?.data?.message || error.message || 'Failed to generate payroll');
 }
 };

 const handleUpdatePayroll = async () => {
 if (!editingPayroll) return;
 
 const data = {
 baseSalary: Number(payrollForm.baseSalary),
 allowances: Number(payrollForm.allowances),
 deductions: Number(payrollForm.deductions),
 bonus: Number(payrollForm.bonus),
 };

 try {
 await payrollApi.update(editingPayroll._id, data);
 toast.success('Payroll updated successfully');
 setShowEditModal(false);
 setEditingPayroll(null);
 fetchPayrolls();
 } catch (error) {
 toast.error(error.response?.data?.message || 'Failed to update payroll');
 }
 };

 const handleDeletePayroll = async (id) => {
 if (!window.confirm('Are you sure you want to delete this payroll record?')) return;
 try {
 await payrollApi.delete(id);
 toast.success('Payroll record deleted');
 fetchPayrolls();
 } catch (error) {
 toast.error('Failed to delete payroll record');
 }
 };

 const filteredPayrolls = payrolls.filter(payroll => {
 if (payrollSearch === '') return true;
 const search = payrollSearch.toLowerCase();
 const empName = `${payroll.employeeId?.firstName || ''} ${payroll.employeeId?.lastName || ''}`.toLowerCase();
 return empName.includes(search);
 });

 const totalNetSalary = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

 const kpis = [
 {
 label: 'Total Payroll',
 value: `†€™${totalNetSalary.toLocaleString()}`,
 icon: Wallet,
 variant: 'emerald'
 },
 {
 label: 'This Month',
 value: payrolls.filter(p => {
 const payrollMonth = new Date(p.createdAt).getMonth() + 1;
 const payrollYear = new Date(p.createdAt).getFullYear();
 return payrollMonth === new Date().getMonth() + 1 && payrollYear === new Date().getFullYear();
 }).length,
 icon: Wallet,
 variant: 'blue'
 },
 {
 label: 'Employees Paid',
 value: new Set(payrolls.map(p => p.employeeId?._id || p.employeeId)).size,
 icon: Wallet,
 variant: 'amber'
 },
 {
 label: 'Total Records',
 value: payrolls.length,
 icon: Wallet,
 variant: 'purple'
 },
 ];

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
 columns.month && {
 key: 'month',
 header: 'Month',
 render: (val) => new Date(2000, val - 1, 1).toLocaleString('default', { month: 'long' }),
 },
 columns.year && {
 key: 'year',
 header: 'Year',
 render: (val) => val,
 },
 columns.baseSalary && {
 key: 'baseSalary',
 header: 'Base Salary',
 render: (val) => `†€™${val?.toLocaleString() || 0}`,
 },
 columns.allowances && {
 key: 'allowances',
 header: 'Allowances',
 render: (val) => `†€™${val?.toLocaleString() || 0}`,
 },
 columns.deductions && {
 key: 'deductions',
 header: 'Deductions',
 render: (val) => `†€™${val?.toLocaleString() || 0}`,
 },
 columns.netSalary && {
 key: 'netSalary',
 header: 'Net Salary',
 render: (val) => <span className="font-bold text-[var(--green)]">†€™{val?.toLocaleString() || 0}</span>,
 },
 columns.status && {
 key: 'paymentStatus',
 header: 'Status',
 render: (val) => {
 const colors = {
 pending: 'bg-amber-500/10 text-amber-500',
 paid: 'bg-[var(--green)]/10 text-[var(--green)]',
 failed: 'bg-red-500/10 text-red-500',
 };
 return (
 <span className={`px-2 py-1 rounded-full text-xs ${colors[val] || colors.pending} capitalize`}>
 {val || 'pending'}
 </span>
 );
 },
 },
 columns.actions && (canEdit() || canDelete()) && {
 key: 'actions',
 header: 'Actions',
 render: (_, record) => (
 <div className="flex items-center gap-2">
 {canEdit() && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 setEditingPayroll(record);
 setPayrollForm({
 employeeId: record.employeeId?._id || record.employeeId,
 month: record.month,
 year: record.year,
 baseSalary: record.baseSalary,
 allowances: record.allowances,
 deductions: record.deductions,
 bonus: record.bonus,
 });
 setShowEditModal(true);
 }}
 className="p-1.5 rounded-lg hover:bg-blue-500/10 text-[var(--text-muted)] hover:text-blue-500 transition-colors"
 title="Edit"
 >
 <RefreshCw size={14} />
 </button>
 )}
 {canDelete() && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDeletePayroll(record._id);
 }}
 className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors"
 title="Delete"
 >
 <X size={14} />
 </button>
 )}
 </div>
 ),
 },
 ].filter(Boolean);

 return (
 <div className="animate-fade-in space-y-5">
 <PageHeader
 title="Payroll Management"
 subtitle="Generate and manage employee payroll"
 actions={canCreate() || canGenerate() ? [
 {
 type: 'button',
 label: 'Generate Payroll',
 icon: Plus,
 variant: 'primary',
 onClick: () => {
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

 {/* Payroll Table */}
 <DataTable
 columns={tableColumns}
 data={filteredPayrolls}
 total={filteredPayrolls.length}
 rowKey="_id"
 emptyText="No payroll records found."
 loading={loading}
 onRowClick={(row) => setViewPayroll(row)}
 />

 <PayrollViewModal payroll={viewPayroll} onClose={() => setViewPayroll(null)} />

 {/* Generate Payroll Modal */}
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
 <Button onClick={handleGeneratePayroll} disabled={!payrollForm.employeeId || !payrollForm.baseSalary}>
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
 <FormField label="Base Salary (†€™)">
 <Input
 type="number"
 value={payrollForm.baseSalary}
 onChange={(e) => setPayrollForm({ ...payrollForm, baseSalary: parseFloat(e.target.value) || 0 })}
 />
 </FormField>
 <FormField label="Allowances (†€™)">
 <Input
 type="number"
 value={payrollForm.allowances}
 onChange={(e) => setPayrollForm({ ...payrollForm, allowances: parseFloat(e.target.value) || 0 })}
 />
 </FormField>
 <FormField label="Deductions (†€™)">
 <Input
 type="number"
 value={payrollForm.deductions}
 onChange={(e) => setPayrollForm({ ...payrollForm, deductions: parseFloat(e.target.value) || 0 })}
 />
 </FormField>
 <FormField label="Bonus (†€™)">
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
 †€™{(payrollForm.baseSalary + payrollForm.allowances + payrollForm.bonus - payrollForm.deductions).toLocaleString()}
 </p>
 </div>
 </Modal>
 )}

 {/* Edit Payroll Modal */}
 {showEditModal && (
 <Modal
 open={showEditModal}
 onClose={() => {
 setShowEditModal(false);
 setEditingPayroll(null);
 }}
 title="Edit Payroll Record"
 footer={
 <div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => setShowEditModal(false)}>
 Cancel
 </Button>
 <Button onClick={handleUpdatePayroll}>
 <RefreshCw size={13} /> Update
 </Button>
 </div>
 }
 >
 <div className="mb-4 p-3 rounded-lg bg-[var(--bg-elevated)]">
 <p className="text-xs text-[var(--text-muted)]">Employee</p>
 <p className="font-medium">{editingPayroll?.employeeId?.firstName} {editingPayroll?.employeeId?.lastName}</p>
 <p className="text-xs text-[var(--text-muted)] mt-1">Period: {new Date(2000, editingPayroll?.month - 1, 1).toLocaleString('default', { month: 'long' })} {editingPayroll?.year}</p>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <FormField label="Base Salary (†€™)">
 <Input
 type="number"
 value={payrollForm.baseSalary}
 onChange={(e) => setPayrollForm({ ...payrollForm, baseSalary: parseFloat(e.target.value) || 0 })}
 />
 </FormField>
 <FormField label="Allowances (†€™)">
 <Input
 type="number"
 value={payrollForm.allowances}
 onChange={(e) => setPayrollForm({ ...payrollForm, allowances: parseFloat(e.target.value) || 0 })}
 />
 </FormField>
 <FormField label="Deductions (†€™)">
 <Input
 type="number"
 value={payrollForm.deductions}
 onChange={(e) => setPayrollForm({ ...payrollForm, deductions: parseFloat(e.target.value) || 0 })}
 />
 </FormField>
 <FormField label="Bonus (†€™)">
 <Input
 type="number"
 value={payrollForm.bonus}
 onChange={(e) => setPayrollForm({ ...payrollForm, bonus: parseFloat(e.target.value) || 0 })}
 />
 </FormField>
 </div>
 <div className="mt-4 p-3 rounded-lg bg-[var(--bg-elevated)] border-t-2 border-[var(--primary)]">
 <p className="text-sm text-[var(--text-muted)]">Updated Net Salary</p>
 <p className="text-2xl font-bold text-[var(--green)]">
 †€™{(payrollForm.baseSalary + payrollForm.allowances + payrollForm.bonus - payrollForm.deductions).toLocaleString()}
 </p>
 </div>
 </Modal>
 )}
 </div>
 );
};

export default PayrollPage;


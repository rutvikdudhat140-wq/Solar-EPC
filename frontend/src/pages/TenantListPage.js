import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
 Building2, Users, Package, FolderKanban, TrendingUp, 
 Plus, Search, Filter, MoreVertical, Edit2, Trash2, 
 CheckCircle, XCircle, Clock, AlertCircle
} from 'lucide-react';
import { api } from '../../lib/apiClient';
import CanCreate from '../../components/CanAccess';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const PLAN_OPTIONS = [
 { value: 'free', label: 'Free' },
 { value: 'basic', label: 'Basic' },
 { value: 'professional', label: 'Professional' },
 { value: 'enterprise', label: 'Enterprise' },
];

const STATUS_OPTIONS = [
 { value: 'active', label: 'Active' },
 { value: 'pending', label: 'Pending' },
 { value: 'suspended', label: 'Suspended' },
 { value: 'expired', label: 'Expired' },
];

const TenantListPage = () => {
 const navigate = useNavigate();
 const [tenants, setTenants] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState('');
 const [planFilter, setStatusPlan] = useState('');
 const [selectedTenant, setSelectedTenant] = useState(null);
 const [showAddModal, setShowAddModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [formData, setFormData] = useState({
 name: '',
 slug: '',
 companyName: '',
 description: '',
 adminEmail: '',
 adminName: '',
 adminPassword: '',
 plan: 'free',
 status: 'pending',
 limits: {
 maxUsers: 10,
 maxProjects: 50,
 maxLeads: 100,
 storageGB: 5,
 },
 settings: {
 timezone: 'Asia/Kolkata',
 currency: 'INR',
 language: 'en',
 dateFormat: 'DD/MM/YYYY',
 },
 });

 // Fetch all tenants
 const fetchTenants = async () => {
 try {
 setLoading(true);
 const response = await api.get('/superadmin/tenants');
 setTenants(response.data || []);
 } catch (err) {
 console.error('Failed to fetch tenants:', err);
 toast.error(err.message || 'Failed to load tenants');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchTenants();
 }, []);

 // Create new tenant
 const handleCreateTenant = async () => {
 try {
 await api.post('/superadmin/tenants', formData);
 toast.success('Tenant created successfully! Admin user has been created.');
 setShowAddModal(false);
 fetchTenants();
 resetForm();
 } catch (err) {
 toast.error(err.message || 'Failed to create tenant');
 }
 };

 // Update tenant
 const handleUpdateTenant = async () => {
 try {
 await api.patch(`/superadmin/tenants/${selectedTenant._id}`, formData);
 toast.success('Tenant updated successfully');
 setShowEditModal(false);
 fetchTenants();
 resetForm();
 } catch (err) {
 toast.error(err.message || 'Failed to update tenant');
 }
 };

 // Delete tenant
 const handleDeleteTenant = async (tenant) => {
 if (!window.confirm(`Are you sure you want to delete tenant "${tenant.name}"? This will delete all associated data!`)) {
 return;
 }
 try {
 await api.delete(`/superadmin/tenants/${tenant._id}`);
 toast.success('Tenant deleted successfully');
 fetchTenants();
 } catch (err) {
 toast.error(err.message || 'Failed to delete tenant');
 }
 };

 // Update tenant status
 const handleUpdateStatus = async (tenant, status) => {
 try {
 await api.patch(`/superadmin/tenants/${tenant._id}/status`, { status });
 toast.success(`Tenant ${status} successfully`);
 fetchTenants();
 } catch (err) {
 toast.error(err.message || 'Failed to update status');
 }
 };

 const resetForm = () => {
 setFormData({
 name: '',
 slug: '',
 companyName: '',
 description: '',
 adminEmail: '',
 adminName: '',
 adminPassword: '',
 plan: 'free',
 status: 'pending',
 limits: {
 maxUsers: 10,
 maxProjects: 50,
 maxLeads: 100,
 storageGB: 5,
 },
 settings: {
 timezone: 'Asia/Kolkata',
 currency: 'INR',
 language: 'en',
 dateFormat: 'DD/MM/YYYY',
 },
 });
 };

 const openEditModal = (tenant) => {
 setSelectedTenant(tenant);
 setFormData({
 name: tenant.name,
 slug: tenant.slug,
 companyName: tenant.companyName,
 description: tenant.description || '',
 adminEmail: tenant.adminEmail,
 adminName: tenant.adminName,
 adminPassword: '',
 plan: tenant.plan,
 status: tenant.status,
 limits: tenant.limits || {
 maxUsers: 10,
 maxProjects: 50,
 maxLeads: 100,
 storageGB: 5,
 },
 settings: tenant.settings || {
 timezone: 'Asia/Kolkata',
 currency: 'INR',
 language: 'en',
 dateFormat: 'DD/MM/YYYY',
 },
 });
 setShowEditModal(true);
 };

 // Filter tenants
 const filteredTenants = tenants.filter(tenant => {
 if (search && !tenant.name.toLowerCase().includes(search.toLowerCase()) &&
 !tenant.companyName.toLowerCase().includes(search.toLowerCase()) &&
 !tenant.adminEmail.toLowerCase().includes(search.toLowerCase())) {
 return false;
 }
 if (statusFilter && tenant.status !== statusFilter) return false;
 if (planFilter && tenant.plan !== planFilter) return false;
 return true;
 });

 // Stats
 const stats = {
 total: tenants.length,
 active: tenants.filter(t => t.status === 'active').length,
 pending: tenants.filter(t => t.status === 'pending').length,
 suspended: tenants.filter(t => t.status === 'suspended').length,
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tenant Management</h1>
 <p className="text-sm text-[var(--text-muted)] mt-1">Manage all tenants and their subscriptions</p>
 </div>
 <CanCreate module="superadmin">
 <Button onClick={() => setShowAddModal(true)}>
 <Plus size={16} /> Add Tenant
 </Button>
 </CanCreate>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="glass-card p-4">
 <div className="flex items-center justify-between">
 <div>
 <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Total Tenants</div>
 <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.total}</div>
 </div>
 <Building2 size={32} className="text-[var(--primary)]" />
 </div>
 </div>
 <div className="glass-card p-4">
 <div className="flex items-center justify-between">
 <div>
 <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Active</div>
 <div className="text-2xl font-bold text-green-500 mt-1">{stats.active}</div>
 </div>
 <CheckCircle size={32} className="text-green-500" />
 </div>
 </div>
 <div className="glass-card p-4">
 <div className="flex items-center justify-between">
 <div>
 <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Pending</div>
 <div className="text-2xl font-bold text-amber-500 mt-1">{stats.pending}</div>
 </div>
 <Clock size={32} className="text-amber-500" />
 </div>
 </div>
 <div className="glass-card p-4">
 <div className="flex items-center justify-between">
 <div>
 <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Suspended</div>
 <div className="text-2xl font-bold text-red-500 mt-1">{stats.suspended}</div>
 </div>
 <XCircle size={32} className="text-red-500" />
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="flex items-center gap-3">
 <div className="flex-1">
 <Input
 placeholder="Search by name, company, or email..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 icon={<Search size={16} />}
 />
 </div>
 <Select
 value={statusFilter}
 onChange={setStatusFilter}
 options={[{ value: '', label: 'All Status' }, ...STATUS_OPTIONS]}
 className="w-40"
 />
 <Select
 value={planFilter}
 onChange={setStatusPlan}
 options={[{ value: '', label: 'All Plans' }, ...PLAN_OPTIONS]}
 className="w-40"
 />
 </div>

 {/* Tenant List */}
 <div className="glass-card overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
 <tr>
 <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Tenant</th>
 <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Admin</th>
 <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Plan</th>
 <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
 <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Users</th>
 <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Created</th>
 <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase">Actions</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr>
 <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
 Loading tenants...
 </td>
 </tr>
 ) : filteredTenants.length === 0 ? (
 <tr>
 <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
 No tenants found
 </td>
 </tr>
 ) : (
 filteredTenants.map((tenant) => (
 <tr key={tenant._id} className="border-b border-[var(--border-base)] hover:bg-[var(--bg-hover)]">
 <td className="px-4 py-3">
 <div>
 <div className="font-medium text-[var(--text-primary)]">{tenant.name}</div>
 <div className="text-xs text-[var(--text-muted)]">{tenant.companyName}</div>
 </div>
 </td>
 <td className="px-4 py-3">
 <div>
 <div className="text-sm text-[var(--text-secondary)]">{tenant.adminName}</div>
 <div className="text-xs text-[var(--text-muted)]">{tenant.adminEmail}</div>
 </div>
 </td>
 <td className="px-4 py-3">
 <Badge variant={tenant.plan === 'enterprise' ? 'primary' : 'secondary'}>
 {tenant.plan}
 </Badge>
 </td>
 <td className="px-4 py-3">
 <Badge variant={
 tenant.status === 'active' ? 'success' :
 tenant.status === 'suspended' ? 'danger' :
 tenant.status === 'pending' ? 'warning' : 'secondary'
 }>
 {tenant.status}
 </Badge>
 </td>
 <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
 {tenant.stats?.totalUsers || 1}
 </td>
 <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
 {new Date(tenant.createdAt).toLocaleDateString()}
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center justify-end gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => openEditModal(tenant)}
 >
 <Edit2 size={14} />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDeleteTenant(tenant)}
 >
 <Trash2 size={14} className="text-red-500" />
 </Button>
 {tenant.status !== 'active' && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleUpdateStatus(tenant, 'active')}
 title="Activate tenant"
 >
 <CheckCircle size={14} className="text-green-500" />
 </Button>
 )}
 {tenant.status === 'active' && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleUpdateStatus(tenant, 'suspended')}
 title="Suspend tenant"
 >
 <XCircle size={14} className="text-red-500" />
 </Button>
 )}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Add Tenant Modal */}
 <Modal
 open={showAddModal}
 onClose={() => { setShowAddModal(false); resetForm(); }}
 title="Create New Tenant"
 size="lg"
 footer={
 <div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => { setShowAddModal(false); resetForm(); }}>Cancel</Button>
 <Button onClick={handleCreateTenant}>
 <Plus size={16} /> Create Tenant
 </Button>
 </div>
 }
 >
 <TenantForm formData={formData} setFormData={setFormData} />
 </Modal>

 {/* Edit Tenant Modal */}
 {selectedTenant && (
 <Modal
 open={showEditModal}
 onClose={() => { setShowEditModal(false); setSelectedTenant(null); }}
 title={`Edit Tenant: ${selectedTenant.name}`}
 size="lg"
 footer={
 <div className="flex gap-2 justify-end">
 <Button variant="ghost" onClick={() => { setShowEditModal(false); setSelectedTenant(null); }}>Cancel</Button>
 <Button onClick={handleUpdateTenant}>
 <Edit2 size={16} /> Update Tenant
 </Button>
 </div>
 }
 >
 <TenantForm formData={formData} setFormData={setFormData} isEdit />
 </Modal>
 )}
 </div>
 );
};

// Tenant Form Component
const TenantForm = ({ formData, setFormData, isEdit = false }) => {
 const updateField = (field, value) => {
 setFormData(prev => ({ ...prev, [field]: value }));
 };

 const updateLimits = (field, value) => {
 setFormData(prev => ({ ...prev, limits: { ...prev.limits, [field]: parseInt(value) || 0 } }));
 };

 const updateSettings = (field, value) => {
 setFormData(prev => ({ ...prev, settings: { ...prev.settings, [field]: value } }));
 };

 return (
 <div className="space-y-6">
 {/* Basic Info */}
 <div className="space-y-4">
 <h3 className="text-sm font-semibold text-[var(--text-primary)]">Basic Information</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Tenant Name *</label>
 <Input
 value={formData.name}
 onChange={(e) => updateField('name', e.target.value)}
 placeholder="My Company"
 />
 </div>
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Slug *</label>
 <Input
 value={formData.slug}
 onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
 placeholder="my-company"
 />
 </div>
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Company Name *</label>
 <Input
 value={formData.companyName}
 onChange={(e) => updateField('companyName', e.target.value)}
 placeholder="My Company Pvt Ltd"
 />
 </div>
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Description</label>
 <Input
 value={formData.description}
 onChange={(e) => updateField('description', e.target.value)}
 placeholder="Brief description"
 />
 </div>
 </div>
 </div>

 {/* Admin User */}
 <div className="space-y-4">
 <h3 className="text-sm font-semibold text-[var(--text-primary)]">Admin User Credentials</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Admin Name *</label>
 <Input
 value={formData.adminName}
 onChange={(e) => updateField('adminName', e.target.value)}
 placeholder="John Doe"
 />
 </div>
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Admin Email *</label>
 <Input
 type="email"
 value={formData.adminEmail}
 onChange={(e) => updateField('adminEmail', e.target.value)}
 placeholder="admin@company.com"
 />
 </div>
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Admin Password *</label>
 <Input
 type="password"
 value={formData.adminPassword}
 onChange={(e) => updateField('adminPassword', e.target.value)}
 placeholder="†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™"
 disabled={isEdit && !formData.adminPassword}
 />
 {isEdit && (
 <p className="text-xs text-[var(--text-muted)] mt-1">Leave blank to keep current password</p>
 )}
 </div>
 </div>
 </div>

 {/* Plan & Status */}
 <div className="space-y-4">
 <h3 className="text-sm font-semibold text-[var(--text-primary)]">Subscription</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Plan</label>
 <Select
 value={formData.plan}
 onChange={(value) => updateField('plan', value)}
 options={PLAN_OPTIONS}
 />
 </div>
 {!isEdit && (
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Status</label>
 <Select
 value={formData.status}
 onChange={(value) => updateField('status', value)}
 options={STATUS_OPTIONS}
 />
 </div>
 )}
 </div>
 </div>

 {/* Limits */}
 <div className="space-y-4">
 <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tenant Limits</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Max Users</label>
 <Input
 type="number"
 value={formData.limits.maxUsers}
 onChange={(e) => updateLimits('maxUsers', e.target.value)}
 />
 </div>
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Max Projects</label>
 <Input
 type="number"
 value={formData.limits.maxProjects}
 onChange={(e) => updateLimits('maxProjects', e.target.value)}
 />
 </div>
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Max Leads</label>
 <Input
 type="number"
 value={formData.limits.maxLeads}
 onChange={(e) => updateLimits('maxLeads', e.target.value)}
 />
 </div>
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Storage (GB)</label>
 <Input
 type="number"
 value={formData.limits.storageGB}
 onChange={(e) => updateLimits('storageGB', e.target.value)}
 />
 </div>
 </div>
 </div>

 {/* Settings */}
 <div className="space-y-4">
 <h3 className="text-sm font-semibold text-[var(--text-primary)]">Default Settings</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Timezone</label>
 <Select
 value={formData.settings.timezone}
 onChange={(value) => updateSettings('timezone', value)}
 options={[
 { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
 { value: 'America/New_York', label: 'America/New_York (EST)' },
 { value: 'Europe/London', label: 'Europe/London (GMT)' },
 { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
 ]}
 />
 </div>
 <div>
 <label className="text-xs text-[var(--text-muted)] mb-1 block">Currency</label>
 <Select
 value={formData.settings.currency}
 onChange={(value) => updateSettings('currency', value)}
 options={[
 { value: 'INR', label: 'INR - Indian Rupee' },
 { value: 'USD', label: 'USD - US Dollar' },
 { value: 'EUR', label: 'EUR - Euro' },
 { value: 'GBP', label: 'GBP - British Pound' },
 { value: 'AED', label: 'AED - UAE Dirham' },
 ]}
 />
 </div>
 </div>
 </div>
 </div>
 );
};

export default TenantListPage;

import React, { useState, useEffect, useCallback } from 'react';
import {
 Building2, Plus, Search, Users, UserPlus, UserMinus, Edit2, Trash2,
 ChevronLeft, ChevronRight, X, CheckCircle, AlertCircle, Crown,
 RefreshCw, ChevronDown, ChevronUp, Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TeamManagementService from '../services/teamManagementApi';
import UserManagementService from '../services/userManagementApi';
import { useAuth } from '../context/AuthContext';

// Modal Component
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
 if (!isOpen) return null;
 const sizeClasses = {
 sm: 'max-w-md',
 md: 'max-w-lg',
 lg: 'max-w-2xl',
 xl: 'max-w-4xl'
 };
 return (
 <AnimatePresence>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
 onClick={onClose}
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 className={`glass-card w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
 >
 <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-base)' }}>
 <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
 <button onClick={onClose} className="btn-icon">
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="p-4">
 {children}
 </div>
 </motion.div>
 </motion.div>
 </AnimatePresence>
 );
};

// Statistics Card Component
const StatCard = ({ icon: Icon, label, value, color }) => (
 <div className="glass-card p-4 flex items-center gap-4">
 <div 
 className="w-12 h-12 rounded-xl flex items-center justify-center"
 style={{ backgroundColor: `var(--${color}-100)` }}
 >
 <Icon className="w-6 h-6" style={{ color: `var(--${color})` }} />
 </div>
 <div>
 <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
 <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
 </div>
 </div>
);

// Department Form Component
const DepartmentForm = ({ department, onSubmit, onCancel, loading }) => {
 const [formData, setFormData] = useState({
 name: '',
 code: '',
 description: '',
 headId: '',
 isActive: true,
 ...department
 });

 const handleSubmit = (e) => {
 e.preventDefault();
 onSubmit(formData);
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
 Department Name <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 required
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border bg-transparent"
 style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
 placeholder="e.g., Engineering"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
 Department Code
 </label>
 <input
 type="text"
 value={formData.code}
 onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
 className="w-full px-3 py-2 rounded-lg border bg-transparent"
 style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
 placeholder="e.g., ENG"
 />
 </div>
 <div>
 <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
 Status
 </label>
 <select
 value={formData.isActive}
 onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
 className="w-full px-3 py-2 rounded-lg border bg-transparent"
 style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
 >
 <option value="true">Active</option>
 <option value="false">Inactive</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
 Description
 </label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border bg-transparent h-20 resize-none"
 style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
 placeholder="Enter department description..."
 />
 </div>

 <div className="flex justify-end gap-3 pt-4">
 <button type="button" onClick={onCancel} className="btn-secondary">
 Cancel
 </button>
 <button type="submit" disabled={loading} className="btn-primary">
 {loading ? 'Saving...' : department ? 'Update Department' : 'Create Department'}
 </button>
 </div>
 </form>
 );
};

// Assign Users Modal
const AssignUsersModal = ({ department, isOpen, onClose, onAssign, loading }) => {
 const [availableUsers, setAvailableUsers] = useState([]);
 const [selectedUsers, setSelectedUsers] = useState([]);
 const [searchQuery, setSearchQuery] = useState('');
 const [fetching, setFetching] = useState(false);

 useEffect(() => {
 if (isOpen && department) {
 fetchAvailableUsers();
 }
 }, [isOpen, department, searchQuery]);

 const fetchAvailableUsers = async () => {
 try {
 setFetching(true);
 const response = await TeamManagementService.getAvailableUsers(
 department._id,
 searchQuery
 );
 if (response.success) {
 setAvailableUsers(response.data);
 }
 } catch (error) {
 console.error('Error fetching available users:', error);
 } finally {
 setFetching(false);
 }
 };

 const toggleUserSelection = (email) => {
 setSelectedUsers(prev => 
 prev.includes(email) 
 ? prev.filter(e => e !== email)
 : [...prev, email]
 );
 };

 const handleAssign = () => {
 onAssign(selectedUsers);
 setSelectedUsers([]);
 };

 return (
 <Modal isOpen={isOpen} onClose={onClose} title={`Assign Users to ${department?.name}`} size="lg">
 <div className="space-y-4">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
 <input
 type="text"
 placeholder="Search users..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent"
 style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
 />
 </div>

 <div className="max-h-[400px] overflow-y-auto">
 {fetching ? (
 <div className="flex flex-col items-center py-8">
 <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-base)', borderTopColor: 'var(--primary)' }} />
 </div>
 ) : availableUsers.length === 0 ? (
 <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
 No available users found
 </p>
 ) : (
 <div className="space-y-2">
 {availableUsers.map((user) => (
 <div
 key={user._id}
 onClick={() => toggleUserSelection(user.email)}
 className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
 selectedUsers.includes(user.email) 
 ? 'border-blue-500 bg-blue-50' 
 : 'hover:bg-[var(--bg-elevated)]'
 }`}
 style={{ borderColor: selectedUsers.includes(user.email) ? 'var(--primary)' : 'var(--border-base)' }}
 >
 <div className={`w-5 h-5 rounded border flex items-center justify-center ${
 selectedUsers.includes(user.email) ? 'bg-blue-500 border-blue-500' : ''
 }`}>
 {selectedUsers.includes(user.email) && <CheckCircle className="w-4 h-4 text-white" />}
 </div>
 <div 
 className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
 style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary)' }}
 >
 {user.firstName?.[0] || user.email?.[0]?.toUpperCase()}
 </div>
 <div className="flex-1">
 <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
 {user.firstName} {user.lastName}
 </p>
 <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-base)' }}>
 <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
 {selectedUsers.length} users selected
 </p>
 <div className="flex gap-3">
 <button onClick={onClose} className="btn-secondary">
 Cancel
 </button>
 <button 
 onClick={handleAssign} 
 disabled={selectedUsers.length === 0 || loading}
 className="btn-primary"
 >
 {loading ? 'Assigning...' : 'Assign Users'}
 </button>
 </div>
 </div>
 </div>
 </Modal>
 );
};

// Department Card Component
const DepartmentCard = ({ 
 department, 
 onEdit, 
 onDelete, 
 onAssignUsers,
 onRemoveUser,
 onSetHead,
 expanded,
 onToggleExpand
}) => {
 return (
 <div className="glass-card overflow-hidden">
 <div 
 className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 transition-colors"
 onClick={onToggleExpand}
 >
 <div className="flex items-center gap-4">
 <div 
 className="w-12 h-12 rounded-xl flex items-center justify-center"
 style={{ backgroundColor: 'var(--blue-100)' }}
 >
 <Building2 className="w-6 h-6" style={{ color: 'var(--blue)' }} />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
 {department.name}
 </h3>
 {department.code && (
 <span 
 className="px-2 py-0.5 rounded text-xs font-medium"
 style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
 >
 {department.code}
 </span>
 )}
 <span 
 className={`px-2 py-0.5 rounded text-xs font-medium ${
 department.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
 }`}
 >
 {department.isActive ? 'Active' : 'Inactive'}
 </span>
 </div>
 <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
 {department.memberCount || 0} members
 {department.head && (
 <span className="ml-2">
 †â€™„¢Â žÂ¢†â€™…Â¡Ã†â€™„¢Ã†â€™†â€™…Â¡Ã†â€™„¢Ã†â€™…Â¡Head: {department.head.firstName} {department.head.lastName}
 <Crown className="inline-block w-3 h-3 ml-1" style={{ color: 'var(--amber)' }} />
 </span>
 )}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button 
 onClick={(e) => { e.stopPropagation(); onAssignUsers(department); }}
 className="btn-icon"
 title="Assign Users"
 >
 <UserPlus className="w-4 h-4" style={{ color: 'var(--green)' }} />
 </button>
 <button 
 onClick={(e) => { e.stopPropagation(); onEdit(department); }}
 className="btn-icon"
 title="Edit"
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button 
 onClick={(e) => { e.stopPropagation(); onDelete(department); }}
 className="btn-icon"
 title="Delete"
 >
 <Trash2 className="w-4 h-4" style={{ color: 'var(--red)' }} />
 </button>
 {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
 </div>
 </div>

 <AnimatePresence>
 {expanded && department.members && department.members.length > 0 && (
 <motion.div
 initial={{ height: 0 }}
 animate={{ height: 'auto' }}
 exit={{ height: 0 }}
 className="border-t overflow-hidden"
 style={{ borderColor: 'var(--border-base)' }}
 >
 <div className="p-4">
 <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
 Department Members
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {department.members.map((member) => (
 <div 
 key={member._id}
 className="flex items-center gap-3 p-3 rounded-lg border"
 style={{ borderColor: 'var(--border-base)' }}
 >
 <div 
 className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
 style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary)' }}
 >
 {member.firstName?.[0] || member.email?.[0]?.toUpperCase()}
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
 {member.firstName} {member.lastName}
 </p>
 <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
 {member.email}
 </p>
 </div>
 <div className="flex items-center gap-1">
 <button
 onClick={() => onSetHead(department._id, member._id)}
 className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
 title="Set as Department Head"
 >
 <Crown className="w-4 h-4" style={{ color: department.headId === member._id ? 'var(--amber)' : 'var(--text-muted)' }} />
 </button>
 <button
 onClick={() => onRemoveUser(department._id, member.email)}
 className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
 title="Remove from Department"
 >
 <UserMinus className="w-4 h-4" style={{ color: 'var(--red)' }} />
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, departmentName, loading }) => (
 <Modal isOpen={isOpen} onClose={onClose} title="Confirm Delete" size="sm">
 <div className="text-center py-4">
 <div 
 className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
 style={{ backgroundColor: 'var(--red-100)' }}
 >
 <AlertCircle className="w-8 h-8" style={{ color: 'var(--red)' }} />
 </div>
 <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
 Delete Department?
 </p>
 <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
 Are you sure you want to delete <strong>{departmentName}</strong>? 
 This will remove all members from this department.
 </p>
 <div className="flex justify-center gap-3">
 <button onClick={onClose} className="btn-secondary">
 Cancel
 </button>
 <button 
 onClick={onConfirm} 
 disabled={loading}
 className="px-4 py-2 rounded-lg font-medium text-white"
 style={{ backgroundColor: 'var(--red)' }}
 >
 {loading ? 'Deleting...' : 'Delete'}
 </button>
 </div>
 </div>
 </Modal>
);

// Main Team Management Page
const TeamManagementPage = () => {
 const { user: currentUser } = useAuth();
 const [departments, setDepartments] = useState([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState('');
 const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
 const [statistics, setStatistics] = useState(null);
 const [expandedDept, setExpandedDept] = useState(null);
 
 // Modals
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
 const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
 const [selectedDepartment, setSelectedDepartment] = useState(null);
 const [actionLoading, setActionLoading] = useState(false);

 // Fetch departments
 const fetchDepartments = useCallback(async () => {
 try {
 setLoading(true);
 const response = await TeamManagementService.getDepartments({
 page: pagination.page,
 limit: pagination.limit,
 search: searchQuery,
 isActive: statusFilter,
 });
 
 if (response.success) {
 setDepartments(response.data);
 setPagination(response.pagination);
 }
 } catch (error) {
 console.error('Error fetching departments:', error);
 } finally {
 setLoading(false);
 }
 }, [pagination.page, pagination.limit, searchQuery, statusFilter]);

 // Fetch statistics
 const fetchStatistics = useCallback(async () => {
 try {
 const response = await TeamManagementService.getStatistics();
 if (response.success) {
 setStatistics(response.data);
 }
 } catch (error) {
 console.error('Error fetching statistics:', error);
 }
 }, []);

 useEffect(() => {
 fetchDepartments();
 fetchStatistics();
 }, [fetchDepartments, fetchStatistics]);

 // Create department
 const handleCreateDepartment = async (formData) => {
 try {
 setActionLoading(true);
 const response = await TeamManagementService.createDepartment(formData);
 if (response.success) {
 setIsCreateModalOpen(false);
 fetchDepartments();
 fetchStatistics();
 }
 } catch (error) {
 console.error('Error creating department:', error);
 alert(error.response?.data?.message || 'Failed to create department');
 } finally {
 setActionLoading(false);
 }
 };

 // Update department
 const handleUpdateDepartment = async (formData) => {
 try {
 setActionLoading(true);
 const response = await TeamManagementService.updateDepartment(selectedDepartment._id, formData);
 if (response.success) {
 setIsEditModalOpen(false);
 setSelectedDepartment(null);
 fetchDepartments();
 fetchStatistics();
 }
 } catch (error) {
 console.error('Error updating department:', error);
 alert(error.response?.data?.message || 'Failed to update department');
 } finally {
 setActionLoading(false);
 }
 };

 // Delete department
 const handleDeleteDepartment = async () => {
 try {
 setActionLoading(true);
 const response = await TeamManagementService.deleteDepartment(selectedDepartment._id);
 if (response.success) {
 setIsDeleteModalOpen(false);
 setSelectedDepartment(null);
 fetchDepartments();
 fetchStatistics();
 }
 } catch (error) {
 console.error('Error deleting department:', error);
 alert(error.response?.data?.message || 'Failed to delete department');
 } finally {
 setActionLoading(false);
 }
 };

 // Assign users to department
 const handleAssignUsers = async (emails) => {
 try {
 setActionLoading(true);
 const response = await TeamManagementService.assignUsersToDepartment(
 selectedDepartment._id,
 emails
 );
 if (response.success) {
 setIsAssignModalOpen(false);
 setSelectedDepartment(null);
 fetchDepartments();
 fetchStatistics();
 }
 } catch (error) {
 console.error('Error assigning users:', error);
 alert(error.response?.data?.message || 'Failed to assign users');
 } finally {
 setActionLoading(false);
 }
 };

 // Remove user from department
 const handleRemoveUser = async (departmentId, email) => {
 if (!window.confirm('Are you sure you want to remove this user from the department?')) return;
 
 try {
 const response = await TeamManagementService.removeUsersFromDepartment(departmentId, [email]);
 if (response.success) {
 fetchDepartments();
 fetchStatistics();
 }
 } catch (error) {
 console.error('Error removing user:', error);
 alert(error.response?.data?.message || 'Failed to remove user');
 }
 };

 // Set department head
 const handleSetHead = async (departmentId, userId) => {
 try {
 const response = await TeamManagementService.setDepartmentHead(departmentId, userId);
 if (response.success) {
 fetchDepartments();
 }
 } catch (error) {
 console.error('Error setting department head:', error);
 alert(error.response?.data?.message || 'Failed to set department head');
 }
 };

 const openEditModal = (department) => {
 setSelectedDepartment(department);
 setIsEditModalOpen(true);
 };

 const openDeleteModal = (department) => {
 setSelectedDepartment(department);
 setIsDeleteModalOpen(true);
 };

 const openAssignModal = (department) => {
 setSelectedDepartment(department);
 setIsAssignModalOpen(true);
 };

 const toggleExpand = (deptId) => {
 setExpandedDept(expandedDept === deptId ? null : deptId);
 };

 if (!currentUser?.isSuperAdmin) {
 return (
 <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-page)' }}>
 <div className="glass-card p-8 text-center max-w-md">
 <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--red)' }} />
 <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
 Access Denied
 </h2>
 <p style={{ color: 'var(--text-muted)' }}>
 Only Super Administrators can access Team Management.
 </p>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-page)' }}>
 {/* Header */}
 <div className="page-header mb-6">
 <div>
 <h1 className="heading-page mb-1">Team Management</h1>
 <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
 Manage departments, teams, and user assignments
 </p>
 </div>
 <button 
 onClick={() => setIsCreateModalOpen(true)}
 className="btn-primary"
 >
 <Plus className="w-4 h-4" />
 <span>Add Department</span>
 </button>
 </div>

 {/* Statistics */}
 {statistics && (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
 <StatCard
 icon={Building2}
 label="Total Departments"
 value={statistics.totalDepartments}
 color="blue"
 />
 <StatCard
 icon={CheckCircle}
 label="Active Departments"
 value={statistics.activeDepartments}
 color="green"
 />
 <StatCard
 icon={Crown}
 label="With Department Head"
 value={statistics.departmentsWithHead}
 color="purple"
 />
 <StatCard
 icon={Users}
 label="Total Employees"
 value={statistics.totalEmployees}
 color="amber"
 />
 </div>
 )}

 {/* Filters */}
 <div className="glass-card p-4 mb-6">
 <div className="flex flex-wrap gap-4">
 <div className="flex-1 min-w-[200px]">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
 <input
 type="text"
 placeholder="Search departments..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent"
 style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
 />
 </div>
 </div>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-4 py-2 rounded-lg border bg-transparent"
 style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
 >
 <option value="">All Status</option>
 <option value="true">Active</option>
 <option value="false">Inactive</option>
 </select>
 <button 
 onClick={fetchDepartments}
 className="btn-icon"
 title="Refresh"
 >
 <RefreshCw className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* Departments List */}
 <div className="space-y-4">
 {loading ? (
 <div className="glass-card p-8">
 <div className="flex flex-col items-center gap-2">
 <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-base)', borderTopColor: 'var(--primary)' }} />
 <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading departments...</span>
 </div>
 </div>
 ) : departments.length === 0 ? (
 <div className="glass-card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
 No departments found
 </div>
 ) : (
 departments.map((department) => (
 <DepartmentCard
 key={department._id}
 department={department}
 onEdit={openEditModal}
 onDelete={openDeleteModal}
 onAssignUsers={openAssignModal}
 onRemoveUser={handleRemoveUser}
 onSetHead={handleSetHead}
 expanded={expandedDept === department._id}
 onToggleExpand={() => toggleExpand(department._id)}
 />
 ))
 )}
 </div>

 {/* Pagination */}
 {pagination.pages > 1 && (
 <div className="flex items-center justify-between mt-6 glass-card p-4">
 <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
 Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} departments
 </p>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
 disabled={pagination.page === 1}
 className="btn-icon"
 >
 <ChevronLeft className="w-5 h-5" />
 </button>
 <span className="px-3 py-1 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--bg-elevated)' }}>
 {pagination.page} / {pagination.pages}
 </span>
 <button
 onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
 disabled={pagination.page === pagination.pages}
 className="btn-icon"
 >
 <ChevronRight className="w-5 h-5" />
 </button>
 </div>
 </div>
 )}

 {/* Create Modal */}
 <Modal
 isOpen={isCreateModalOpen}
 onClose={() => setIsCreateModalOpen(false)}
 title="Create New Department"
 >
 <DepartmentForm
 onSubmit={handleCreateDepartment}
 onCancel={() => setIsCreateModalOpen(false)}
 loading={actionLoading}
 />
 </Modal>

 {/* Edit Modal */}
 <Modal
 isOpen={isEditModalOpen}
 onClose={() => { setIsEditModalOpen(false); setSelectedDepartment(null); }}
 title="Edit Department"
 >
 {selectedDepartment && (
 <DepartmentForm
 department={selectedDepartment}
 onSubmit={handleUpdateDepartment}
 onCancel={() => { setIsEditModalOpen(false); setSelectedDepartment(null); }}
 loading={actionLoading}
 />
 )}
 </Modal>

 {/* Delete Modal */}
 <DeleteConfirmModal
 isOpen={isDeleteModalOpen}
 onClose={() => { setIsDeleteModalOpen(false); setSelectedDepartment(null); }}
 onConfirm={handleDeleteDepartment}
 departmentName={selectedDepartment?.name}
 loading={actionLoading}
 />

 {/* Assign Users Modal */}
 <AssignUsersModal
 department={selectedDepartment}
 isOpen={isAssignModalOpen}
 onClose={() => { setIsAssignModalOpen(false); setSelectedDepartment(null); }}
 onAssign={handleAssignUsers}
 loading={actionLoading}
 />
 </div>
 );
};

export default TeamManagementPage;

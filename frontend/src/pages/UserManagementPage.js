import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Filter, MoreHorizontal, Edit2, Trash2,
  UserCheck, UserX, Shield, Mail, Phone, Calendar, RefreshCw,
  ChevronLeft, ChevronRight, X, CheckCircle, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UserManagementService from '../services/userManagementApi';
import { useAuth } from '../context/AuthContext';

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
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
          className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto"
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

// User Form Component
const UserForm = ({ user, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'employee',
    phone: '',
    isActive: true,
    isSuperAdmin: false,
    ...user
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            First Name
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-transparent"
            style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
            placeholder="Enter first name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Last Name
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-transparent"
            style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
            placeholder="Enter last name"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border bg-transparent"
          style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
          placeholder="Enter email address"
        />
      </div>

      {!user && (
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            required={!user}
            minLength={6}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-transparent"
            style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
            placeholder="Enter password (min 6 characters)"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Role
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-transparent"
            style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-transparent"
            style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
            placeholder="Enter phone number"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-4 h-4 rounded border"
            style={{ accentColor: 'var(--primary)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isSuperAdmin}
            onChange={(e) => setFormData({ ...formData, isSuperAdmin: e.target.checked })}
            className="w-4 h-4 rounded border"
            style={{ accentColor: 'var(--primary)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Super Admin</span>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, userName, loading }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Confirm Delete">
    <div className="text-center py-4">
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: 'var(--red-100)' }}
      >
        <AlertCircle className="w-8 h-8" style={{ color: 'var(--red)' }} />
      </div>
      <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        Delete User?
      </p>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Are you sure you want to delete <strong>{userName}</strong>? This action cannot be undone.
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

// Main User Management Page
const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [statistics, setStatistics] = useState(null);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await UserManagementService.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery,
        role: roleFilter,
        isActive: statusFilter,
      });
      
      if (response.success) {
        setUsers(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, roleFilter, statusFilter]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await UserManagementService.getStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchStatistics();
  }, [fetchUsers, fetchStatistics]);

  // Create user
  const handleCreateUser = async (formData) => {
    try {
      setActionLoading(true);
      const response = await UserManagementService.createUser(formData);
      if (response.success) {
        setIsCreateModalOpen(false);
        fetchUsers();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error.response?.data?.message || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  // Update user
  const handleUpdateUser = async (formData) => {
    try {
      setActionLoading(true);
      const response = await UserManagementService.updateUser(selectedUser._id, formData);
      if (response.success) {
        setIsEditModalOpen(false);
        setSelectedUser(null);
        fetchUsers();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert(error.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    try {
      setActionLoading(true);
      const response = await UserManagementService.deleteUser(selectedUser._id);
      if (response.success) {
        setIsDeleteModalOpen(false);
        setSelectedUser(null);
        fetchUsers();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user) => {
    try {
      const response = await UserManagementService.toggleUserActive(user._id);
      if (response.success) {
        fetchUsers();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert(error.response?.data?.message || 'Failed to toggle status');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  if (!currentUser?.isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-page)' }}>
        <div className="glass-card p-8 text-center max-w-md">
          <Shield className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--red)' }} />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Access Denied
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Only Super Administrators can access User Management.
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
          <h1 className="heading-page mb-1">User Management</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Manage system users, roles, and permissions
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Users}
            label="Total Users"
            value={statistics.totalUsers}
            color="blue"
          />
          <StatCard
            icon={UserCheck}
            label="Active Users"
            value={statistics.activeUsers}
            color="green"
          />
          <StatCard
            icon={UserX}
            label="Inactive Users"
            value={statistics.inactiveUsers}
            color="amber"
          />
          <StatCard
            icon={Shield}
            label="Super Admins"
            value={statistics.superAdmins}
            color="purple"
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
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-transparent"
                style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border bg-transparent"
            style={{ borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
          >
            <option value="">All Roles</option>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
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
            onClick={fetchUsers}
            className="btn-icon"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-base)' }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>User</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Role</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Phone</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Created</th>
                <th className="text-center p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-base)', borderTopColor: 'var(--primary)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr 
                    key={user._id} 
                    className="hover:bg-black/5 transition-colors"
                    style={{ borderBottom: '1px solid var(--border-base)' }}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                          style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary)' }}
                        >
                          {user.firstName?.[0] || user.email?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {user.firstName} {user.lastName}
                            {user.isSuperAdmin && (
                              <Shield className="inline-block w-4 h-4 ml-2" style={{ color: 'var(--purple)' }} />
                            )}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: user.role === 'admin' ? 'var(--purple-100)' : user.role === 'manager' ? 'var(--blue-100)' : 'var(--green-100)',
                          color: user.role === 'admin' ? 'var(--purple)' : user.role === 'manager' ? 'var(--blue)' : 'var(--green)'
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          user.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-4" style={{ color: 'var(--text-secondary)' }}>
                      {user.phone || '-'}
                    </td>
                    <td className="p-4" style={{ color: 'var(--text-muted)' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(user)}
                          className="btn-icon"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(user)}
                          className="btn-icon"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: 'var(--red)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between p-4" style={{ borderTop: '1px solid var(--border-base)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
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
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New User"
      >
        <UserForm
          onSubmit={handleCreateUser}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={actionLoading}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
        title="Edit User"
      >
        {selectedUser && (
          <UserForm
            user={selectedUser}
            onSubmit={handleUpdateUser}
            onCancel={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
            loading={actionLoading}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedUser(null); }}
        onConfirm={handleDeleteUser}
        userName={selectedUser?.firstName || selectedUser?.email}
        loading={actionLoading}
      />
    </div>
  );
};

export default UserManagementPage;

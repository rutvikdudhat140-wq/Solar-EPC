import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, RefreshCw, CheckCircle, XCircle, Clock, Calendar,
  MoreVertical, Edit, Trash2, User, Check, X, Filter,
  ClipboardList, TrendingUp, CheckSquare, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { tasksApi } from '../services/tasksApi';
import { useAuth } from '../context/AuthContext';
import CanAccess, { CanCreate, CanEdit, CanDelete } from '../components/CanAccess';

// Status configuration
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: '#f59e0b',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/20',
    icon: Clock,
  },
  'in-progress': {
    label: 'In Progress',
    color: '#3b82f6',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/20',
    icon: CheckCircle,
  },
  completed: {
    label: 'Completed',
    color: '#22c55e',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/20',
    icon: CheckSquare,
  },
};

// Task View Modal
const TaskViewModal = ({ task, onClose, onEdit, onDelete, isAdmin }) => {
  if (!task) return null;
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const assignedTo = task.assignedTo || {};
  const createdBy = task.createdBy || {};

  return (
    <Modal open={!!task} onClose={onClose} title="Task Details" size="md" footer={
      <div className="flex items-center justify-between w-full">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
        >
          <X size={13} /> Close
        </button>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => { onDelete(task); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20"
              >
                <Trash2 size={13} /> Delete
              </button>
              <button
                onClick={() => { onEdit(task); onClose(); }}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-[var(--primary)] text-white hover:opacity-90"
              >
                <Edit size={13} /> Edit
              </button>
            </>
          )}
        </div>
      </div>
    }>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl mb-4 p-5 bg-gradient-to-br from-[var(--primary)]/15 via-[var(--primary)]/5 to-transparent border border-[var(--border-base)]">
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-[var(--primary)]/10 -translate-y-6 translate-x-6" />
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] text-white flex items-center justify-center font-bold text-lg shadow-lg">
            <ClipboardList size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)] break-words">{task.title}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Created by {createdBy.firstName || createdBy.email?.split('@')[0] || 'Unknown'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.bgColor} ${status.textColor} ${status.borderColor} flex items-center gap-1`}>
                <StatusIcon size={11} /> {status.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="glass-card p-4 mb-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-faint)] font-medium mb-2">Description</p>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] font-medium mb-1">Assigned To</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-medium">
              {(assignedTo.firstName?.[0] || assignedTo.email?.[0] || '?').toUpperCase()}
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {assignedTo.firstName && assignedTo.lastName
                ? `${assignedTo.firstName} ${assignedTo.lastName}`
                : assignedTo.email?.split('@')[0] || 'Unknown'}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] font-medium mb-1">Due Date</p>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[var(--primary)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {task.dueDate ? format(new Date(task.dueDate), 'dd MMM yyyy') : 'No due date'}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Create/Edit Task Modal
const TaskFormModal = ({ task, onClose, onSave, isEdit, assignees }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assignedTo: task?.assignedTo?._id || '',
    status: task?.status || 'pending',
    dueDate: task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.assignedTo) {
      toast.error('Please assign the task to someone');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEdit ? 'Edit Task' : 'Create New Task'}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X size={13} /> Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Title *" required>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter task title"
            required
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter task description"
            rows={3}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Assign To *" required>
            <Select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              required
            >
              <option value="">Select user...</option>
              {assignees.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Due Date">
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </FormField>
        </div>

        {isEdit && (
          <FormField label="Status">
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </Select>
          </FormField>
        )}
      </form>
    </Modal>
  );
};

// Main Tasks Page
const TasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewTask, setViewTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [assignees, setAssignees] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === 'admin' || 
                  user?.role?.toLowerCase() === 'superadmin' ||
                  user?.isSuperAdmin;

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      
      const response = await tasksApi.getAll(params);
      if (response.success) {
        setTasks(response.data || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await tasksApi.getStats();
      if (response.success) {
        setStats(response.data || { total: 0, pending: 0, inProgress: 0, completed: 0 });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  // Fetch assignees (for admin only)
  const fetchAssignees = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await tasksApi.getAssignees();
      if (response.success) {
        setAssignees(response.data || []);
      }
    } catch (err) {
      console.error('Failed to load assignees:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchTasks();
    fetchStats();
    fetchAssignees();
  }, [fetchTasks, fetchStats, fetchAssignees]);

  // Create task
  const handleCreate = async (formData) => {
    console.log('[DEBUG] Form Data from modal:', formData);
    
    // Find the selected user's email
    const selectedUser = assignees.find(u => u.id === formData.assignedTo);
    console.log('[DEBUG] Selected user:', selectedUser);
    
    const dataToSend = {
      title: formData.title,
      description: formData.description,
      assignedTo: selectedUser?.email || formData.assignedTo, // Send email as string
      status: formData.status || 'pending',
      dueDate: formData.dueDate,
    };
    console.log('[DEBUG] Data to send to API:', dataToSend);
    
    const response = await tasksApi.create(dataToSend);
    console.log('[DEBUG] API Response:', response);
    
    if (response.success) {
      toast.success('Task created successfully');
      fetchTasks();
      fetchStats();
    } else {
      throw new Error(response.message || 'Failed to create task');
    }
  };

  // Update task
  const handleUpdate = async (formData) => {
    const response = await tasksApi.update(editTask._id, formData);
    if (response.success) {
      toast.success('Task updated successfully');
      fetchTasks();
      fetchStats();
      setEditTask(null);
    } else {
      throw new Error(response.message || 'Failed to update task');
    }
  };

  // Delete task
  const handleDelete = async (task) => {
    const response = await tasksApi.delete(task._id);
    if (response.success) {
      toast.success('Task deleted successfully');
      fetchTasks();
      fetchStats();
      setDeleteConfirm(null);
    } else {
      toast.error(response.message || 'Failed to delete task');
    }
  };

  // Employee can update status
  const handleStatusUpdate = async (task, newStatus) => {
    const response = await tasksApi.update(task._id, { status: newStatus });
    if (response.success) {
      toast.success('Status updated');
      fetchTasks();
      fetchStats();
    } else {
      toast.error(response.message || 'Failed to update status');
    }
  };

  // Table columns
  const columns = [
    {
      key: 'title',
      label: 'Task',
      render: (titleValue, task) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] text-white flex items-center justify-center flex-shrink-0">
            <ClipboardList size={14} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-[var(--text-primary)] truncate">{task?.title || 'No Title'}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {task?.description || 'No description'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      render: (assignedToValue, task) => {
        // assignedToUserId is populated with user details
        const user = task?.assignedToUserId;
        const email = task?.assignedTo || '';
        
        // Get name from populated user or fallback to email
        let name = 'Unknown';
        let role = 'Employee';
        
        if (user?.firstName || user?.lastName) {
          name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          role = user.role || 'Employee';
        } else if (email) {
          name = email.split('@')[0];
        }
        
        const firstLetter = name.charAt(0).toUpperCase();
        
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-medium">
              {firstLetter}
            </div>
            <span className="text-sm text-[var(--text-primary)]">
              {name} <span className="text-[var(--text-muted)]">({role})</span>
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (statusValue, task) => {
        const status = STATUS_CONFIG[task?.status] || STATUS_CONFIG.pending;
        const StatusIcon = status.icon;
        
        // Employee can update status inline
        if (!isAdmin) {
          return (
            <Select
              value={task?.status}
              onChange={(e) => handleStatusUpdate(task, e.target.value)}
              className={`text-xs py-1 px-2 rounded-full border ${status.bgColor} ${status.textColor} ${status.borderColor}`}
            >
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </Select>
          );
        }
        
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 w-fit ${status.bgColor} ${status.textColor} ${status.borderColor}`}>
            <StatusIcon size={12} /> {status.label}
          </span>
        );
      },
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (dueDateValue, task) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {task?.dueDate ? format(new Date(task.dueDate), 'dd MMM yyyy') : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (actionsValue, task) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewTask(task)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
            title="View"
          >
            <MoreVertical size={14} />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setEditTask(task)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                title="Edit"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => setDeleteConfirm(task)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Tasks"
        subtitle={isAdmin ? "Manage and assign tasks to your team" : "View your assigned tasks"}
        actions={
          isAdmin ? [
            {
              type: 'button',
              label: 'Create Task',
              icon: Plus,
              variant: 'primary',
              onClick: () => setShowCreate(true)
            }
          ] : []
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Total Tasks"
          value={stats.total}
          icon={ClipboardList}
          variant="indigo"
        />
        <KPICard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          variant="amber"
        />
        <KPICard
          title="In Progress"
          value={stats.inProgress}
          icon={TrendingUp}
          variant="blue"
        />
        <KPICard
          title="Completed"
          value={stats.completed}
          icon={CheckSquare}
          variant="emerald"
        />
      </div>

      {/* Filters */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={16} className="text-[var(--text-faint)]" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[var(--text-faint)]" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </Select>
        </div>
        <button
          onClick={fetchTasks}
          className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tasks Table */}
      <DataTable
        columns={columns}
        data={tasks}
        loading={loading}
        emptyMessage={
          <div className="text-center py-8">
            <ClipboardList size={48} className="mx-auto text-[var(--text-faint)] mb-3" />
            <p className="text-[var(--text-muted)]">
              {isAdmin ? "No tasks found. Create your first task!" : "No tasks assigned to you yet."}
            </p>
          </div>
        }
      />

      {/* View Modal */}
      {viewTask && (
        <TaskViewModal
          task={viewTask}
          onClose={() => setViewTask(null)}
          onEdit={setEditTask}
          onDelete={setDeleteConfirm}
          isAdmin={isAdmin}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <TaskFormModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
          isEdit={false}
          assignees={assignees}
        />
      )}

      {/* Edit Modal */}
      {editTask && (
        <TaskFormModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={handleUpdate}
          isEdit={true}
          assignees={assignees}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Modal
          open={true}
          onClose={() => setDeleteConfirm(null)}
          title="Confirm Delete"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-3 py-1.5 text-xs rounded-xl bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          }
        >
          <p className="text-sm text-[var(--text-secondary)]">
            Are you sure you want to delete <strong>{deleteConfirm.title}</strong>?
            <br />This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default TasksPage;

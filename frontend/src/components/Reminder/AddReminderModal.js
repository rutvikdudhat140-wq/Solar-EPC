import React, { useEffect, useMemo, useState } from 'react';
import { X, Bell, Volume2, Smartphone, Plus, Loader2 } from 'lucide-react';
import { useReminders } from '../../context/ReminderContext';
import { useAuth } from '../../context/AuthContext';
import reminderApi from '../../lib/reminderApi';
import { REMINDER_MODULES } from './reminderModules';

const getDefaultDate = () => new Date().toISOString().slice(0, 10);
const getDefaultTime = () => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(11, 16);

const buildReminderPayload = (formData, currentUserId) => {
  const dueDate = new Date(`${formData.dueDate}T${formData.dueTime}`);
  const triggerType = formData.recurring ? 'recurring' : 'date';

  return {
    title: formData.title.trim(),
    description: formData.description.trim(),
    module: formData.module,
    type: 'custom',
    priority: formData.priority,
    dueDate,
    remindAt: dueDate,
    assignedTo: formData.assignedTo,
    createdBy: currentUserId,
    isCustom: true,
    triggerType,
    recurringPattern: formData.recurring ? formData.recurringPattern : undefined,
    notificationChannels: formData.notificationChannels,
    metadata: {
      subtype: formData.subtype,
      ...formData.metadata,
    },
  };
};

const AddReminderModal = ({ isOpen, onClose }) => {
  const { addReminder, fetchReminders } = useReminders();
  const { user } = useAuth();
  const currentUserId = String(user?.id || user?._id || '');
  const currentUserEmail = String(user?.email || '');

  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    module: 'crm',
    priority: 'medium',
    subtype: 'task',
    dueDate: getDefaultDate(),
    dueTime: getDefaultTime(),
    assignedTo: currentUserId,
    notificationChannels: ['in-app'],
    recurring: false,
    recurringPattern: 'daily',
    metadata: {},
  });

  useEffect(() => {
    if (!isOpen) return;

    setFormData((prev) => ({
      ...prev,
      assignedTo: currentUserId,
    }));

    const loadUsers = async () => {
      setLoadingUsers(true);
      setError('');
      try {
        const response = await reminderApi.getAssignableUsers();
        const users = Array.isArray(response?.data) ? response.data : [];
        const normalizedUsers = users.map((entry) => ({
          id: String(entry.id || entry._id),
          name: entry.name || entry.email,
          email: entry.email || '',
          role: entry.role || 'User',
        }));
        if (currentUserId && !normalizedUsers.some((entry) => entry.id === currentUserId)) {
          normalizedUsers.unshift({
            id: currentUserId,
            name: currentUserEmail || 'Current User',
            email: currentUserEmail,
            role: user?.role || 'User',
          });
        }
        setAssignableUsers(normalizedUsers);
      } catch (loadError) {
        console.error('[Reminders] Failed to load assignable users:', loadError);
        const fallbackUsers = currentUserId
          ? [{
              id: currentUserId,
              name: currentUserEmail || 'Current User',
              email: currentUserEmail,
              role: user?.role || 'User',
            }]
          : [];
        setAssignableUsers(fallbackUsers);
        if (!fallbackUsers.length) {
          setError('Unable to load assignable users.');
        }
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [currentUserEmail, currentUserId, isOpen, user?.role]);

  const supportedModules = useMemo(
    () => REMINDER_MODULES.filter((module) => module.supportsManual),
    [],
  );

  const handleChannelToggle = (channel) => {
    setFormData((prev) => ({
      ...prev,
      notificationChannels: prev.notificationChannels.includes(channel)
        ? prev.notificationChannels.filter((entry) => entry !== channel)
        : [...prev.notificationChannels, channel],
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      module: 'crm',
      priority: 'medium',
      subtype: 'task',
      dueDate: getDefaultDate(),
      dueTime: getDefaultTime(),
      assignedTo: currentUserId,
      notificationChannels: ['in-app'],
      recurring: false,
      recurringPattern: 'daily',
      metadata: {},
    });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentUserId) {
      setError('Current user context is missing.');
      return;
    }
    if (!formData.assignedTo) {
      setError('Please choose an assignee.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = buildReminderPayload(formData, currentUserId);
      await addReminder(payload);
      await fetchReminders();
      resetForm();
      onClose();
    } catch (submitError) {
      console.error('[Reminders] Failed to create reminder:', submitError);
      setError(submitError?.message || 'Failed to create reminder.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border-base)] bg-[var(--bg-elevated)]">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Create New Reminder</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
                  placeholder="Enter reminder title"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
                  placeholder="Enter reminder description"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Module</label>
                  <select
                    value={formData.module}
                    onChange={(event) => setFormData((prev) => ({ ...prev, module: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    {supportedModules.map((module) => (
                      <option key={module.id} value={module.id}>{module.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(event) => setFormData((prev) => ({ ...prev, priority: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Reminder Type</label>
                  <select
                    value={formData.subtype}
                    onChange={(event) => setFormData((prev) => ({ ...prev, subtype: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="task">Task</option>
                    <option value="followup">Follow-up</option>
                    <option value="deadline">Deadline</option>
                    <option value="approval">Approval</option>
                    <option value="payment">Payment</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="stock-alert">Stock Alert</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Assigned To</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(event) => setFormData((prev) => ({ ...prev, assignedTo: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                    disabled={loadingUsers}
                  >
                    {!assignableUsers.length && <option value="">No users available</option>}
                    {assignableUsers.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} {entry.email ? `(${entry.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Schedule</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(event) => setFormData((prev) => ({ ...prev, dueDate: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Due Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.dueTime}
                    onChange={(event) => setFormData((prev) => ({ ...prev, dueTime: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.recurring}
                    onChange={(event) => setFormData((prev) => ({ ...prev, recurring: event.target.checked }))}
                    className="h-4 w-4 rounded border-[var(--border-base)] bg-[var(--bg-base)] text-[var(--primary)]"
                  />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Recurring reminder</span>
                </label>

                {formData.recurring && (
                  <div className="mt-2">
                    <select
                      value={formData.recurringPattern}
                      onChange={(event) => setFormData((prev) => ({ ...prev, recurringPattern: event.target.value }))}
                      className="rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Notification Channels</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleChannelToggle('in-app')}
                  className={`rounded-lg border p-3 transition-all ${formData.notificationChannels.includes('in-app')
                    ? 'border-[var(--primary)] bg-[var(--primary)]20 text-[var(--primary)]'
                    : 'border-[var(--border-base)] bg-[var(--bg-base)] text-[var(--text-muted)]'}`}
                >
                  <Bell size={20} className="mx-auto mb-1" />
                  <div className="text-xs font-medium">In-App</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChannelToggle('voice')}
                  className={`rounded-lg border p-3 transition-all ${formData.notificationChannels.includes('voice')
                    ? 'border-[var(--primary)] bg-[var(--primary)]20 text-[var(--primary)]'
                    : 'border-[var(--border-base)] bg-[var(--bg-base)] text-[var(--text-muted)]'}`}
                >
                  <Volume2 size={20} className="mx-auto mb-1" />
                  <div className="text-xs font-medium">Voice</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChannelToggle('sms')}
                  className={`rounded-lg border p-3 transition-all ${formData.notificationChannels.includes('sms')
                    ? 'border-[var(--primary)] bg-[var(--primary)]20 text-[var(--primary)]'
                    : 'border-[var(--border-base)] bg-[var(--bg-base)] text-[var(--text-muted)]'}`}
                >
                  <Smartphone size={20} className="mx-auto mb-1" />
                  <div className="text-xs font-medium">SMS</div>
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 border-t border-[var(--border-base)] pt-6">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="rounded-lg border border-[var(--border-base)] bg-[var(--bg-overlay)] px-4 py-2 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || loadingUsers}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Reminder
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddReminderModal;

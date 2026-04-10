import React, { useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle,
  Clock,
  RotateCcw,
  Search,
  Trash2,
  Volume2,
  Smartphone,
  Plus,
} from 'lucide-react';
import { useReminders } from '../context/ReminderContext';
import AddReminderModal from '../components/Reminder/AddReminderModal';
import { getReminderModuleInfo, REMINDER_MODULES } from '../components/Reminder/reminderModules';

const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b7280',
};

const formatDateTime = (date) => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(date));

const getTimeStatus = (dueDate, status) => {
  const now = new Date();
  const timeDiff = dueDate - now;

  if (status === 'completed') return { text: 'Completed', color: '#10b981' };
  if (timeDiff < 0) return { text: 'Overdue', color: '#ef4444' };
  if (timeDiff < 60 * 60 * 1000) return { text: 'Due Soon', color: '#f59e0b' };
  return { text: 'Upcoming', color: '#6b7280' };
};

const RemindersPage = () => {
  const {
    reminders,
    activeNotifications,
    settings,
    deleteReminder,
    markComplete,
    snoozeReminder,
    dismissNotification,
    dismissAllNotifications,
    getUpcomingReminders,
    getOverdueReminders,
    getRemindersByPriority,
    updateSettings,
    upcomingCount,
    overdueCount,
    criticalCount,
    totalReminders,
    getUserLabel,
  } = useReminders();

  const [activeTab, setActiveTab] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const filteredReminders = useMemo(() => {
    let filtered = reminders;

    if (activeTab === 'upcoming') {
      filtered = getUpcomingReminders();
    } else if (activeTab === 'overdue') {
      filtered = getOverdueReminders();
    } else if (activeTab === 'critical') {
      filtered = getRemindersByPriority('critical');
    } else if (activeTab === 'completed') {
      filtered = reminders.filter((reminder) => reminder.status === 'completed');
    }

    if (filterModule !== 'all') {
      filtered = filtered.filter((reminder) => reminder.module === filterModule);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter((reminder) => reminder.priority === filterPriority);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((reminder) =>
        reminder.title.toLowerCase().includes(query)
        || String(reminder.description || '').toLowerCase().includes(query),
      );
    }

    return [...filtered].sort((left, right) => left.dueDate - right.dueDate);
  }, [activeTab, filterModule, filterPriority, getOverdueReminders, getRemindersByPriority, getUpcomingReminders, reminders, searchQuery]);

  return (
    <div className="space-y-6">
      <section className="glass-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reminder Center</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Live reminders from all modules with manual creation and API-backed actions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings((prev) => !prev)}
              className="rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
            >
              Notification Settings
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              New Reminder
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: 'Total', value: totalReminders, color: 'var(--primary)' },
            { label: 'Upcoming', value: upcomingCount, color: 'var(--success)' },
            { label: 'Overdue', value: overdueCount, color: 'var(--error)' },
            { label: 'Critical', value: criticalCount, color: '#f97316' },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-[var(--border-base)] bg-[var(--bg-base)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{card.label}</p>
              <p className="mt-2 text-3xl font-black" style={{ color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      {showSettings && (
        <section className="glass-card p-5">
          <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">Notification Settings</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { key: 'inAppNotifications', label: 'In-App Notifications' },
              { key: 'notificationSound', label: 'Notification Sound' },
              { key: 'voiceAlerts', label: 'Voice Alerts' },
              { key: 'smsNotifications', label: 'SMS Notifications' },
            ].map((setting) => (
              <label key={setting.key} className="flex items-center justify-between rounded-xl border border-[var(--border-base)] bg-[var(--bg-base)] px-4 py-3">
                <span className="text-sm font-medium text-[var(--text-primary)]">{setting.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings[setting.key])}
                  onChange={(event) => updateSettings({ [setting.key]: event.target.checked })}
                />
              </label>
            ))}
          </div>
        </section>
      )}

      {activeNotifications.length > 0 && (
        <section className="glass-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Active Alerts</h2>
            <button onClick={dismissAllNotifications} className="text-sm font-medium text-red-400 hover:text-red-300">
              Dismiss All
            </button>
          </div>
          <div className="space-y-3">
            {activeNotifications.map((notification) => (
              <div key={notification.id} className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <Bell size={18} className="text-red-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{notification.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{notification.description}</p>
                </div>
                <button onClick={() => dismissNotification(notification.id)} className="text-sm font-medium text-red-400 hover:text-red-300">
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="glass-card p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search reminders..."
              className="w-full rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterModule}
              onChange={(event) => setFilterModule(event.target.value)}
              className="rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="all">All Modules</option>
              {REMINDER_MODULES.map((module) => (
                <option key={module.id} value={module.id}>{module.label}</option>
              ))}
            </select>

            <select
              value={filterPriority}
              onChange={(event) => setFilterPriority(event.target.value)}
              className="rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="all">All Priorities</option>
              {Object.keys(PRIORITY_COLORS).map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'critical', label: 'Critical' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredReminders.map((reminder) => {
            const moduleInfo = getReminderModuleInfo(reminder.module);
            const ModuleIcon = moduleInfo.icon;
            const timeStatus = getTimeStatus(reminder.dueDate, reminder.status);
            const priorityColor = PRIORITY_COLORS[reminder.priority] || '#6b7280';

            return (
              <article key={reminder.id} className="rounded-xl border border-[var(--border-base)] bg-[var(--bg-base)] p-4 transition-colors hover:border-[var(--border-hover)]">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg p-2" style={{ backgroundColor: `${moduleInfo.color}20`, color: moduleInfo.color }}>
                      <ModuleIcon size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">{reminder.title}</h3>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">{moduleInfo.label} · {reminder.metadata?.subtype || reminder.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: priorityColor }} />
                    <span
                      className="rounded-md px-2 py-1 text-xs font-bold"
                      style={{ color: timeStatus.color, backgroundColor: `${timeStatus.color}20` }}
                    >
                      {timeStatus.text}
                    </span>
                  </div>
                </div>

                <p className="mb-3 text-sm text-[var(--text-secondary)]">{reminder.description}</p>

                <div className="mb-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Clock size={12} />
                  <span>Due: {formatDateTime(reminder.dueDate)}</span>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                  {reminder.notificationChannels?.includes('in-app') && <Bell size={12} />}
                  {reminder.notificationChannels?.includes('voice') && <Volume2 size={12} />}
                  {reminder.notificationChannels?.includes('sms') && <Smartphone size={12} />}
                  {reminder.assignedTo && <span>Assigned: {getUserLabel(reminder.assignedTo)}</span>}
                </div>

                <div className="flex items-center gap-2 border-t border-[var(--border-base)] pt-3">
                  {reminder.status === 'pending' && (
                    <>
                      <button
                        onClick={() => markComplete(reminder.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--success)] px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                      >
                        <CheckCircle size={12} />
                        Complete
                      </button>
                      <button
                        onClick={() => snoozeReminder(reminder.id, 30)}
                        className="flex items-center gap-1 rounded-lg border border-[var(--border-base)] bg-[var(--bg-overlay)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        <RotateCcw size={12} />
                        30m
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => deleteReminder(reminder.id)}
                    className="rounded-lg bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {filteredReminders.length === 0 && (
          <div className="py-12 text-center">
            <Bell size={24} className="mx-auto mb-3 text-[var(--text-faint)]" />
            <p className="text-sm text-[var(--text-muted)]">No reminders match the current filters.</p>
          </div>
        )}
      </section>

      <AddReminderModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
};

export default RemindersPage;

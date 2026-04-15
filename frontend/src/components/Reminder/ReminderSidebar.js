import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  Clock,
  Pause,
  Plus,
  Search,
  Trash2,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useReminders } from '../../context/ReminderContext';
import { getReminderModuleInfo, REMINDER_MODULES } from './reminderModules';
import AddReminderModal from './AddReminderModal';

const PRIORITIES = [
  { id: 'critical', label: 'Critical', color: '#ef4444' },
  { id: 'high', label: 'High', color: '#f97316' },
  { id: 'medium', label: 'Medium', color: '#f59e0b' },
  { id: 'low', label: 'Low', color: '#3b82f6' },
];

const formatTimeRemaining = (dueDate) => {
  const now = new Date();
  const diff = dueDate - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (diff < 0) {
    return `Overdue by ${Math.abs(hours)}h ${Math.abs(minutes)}m`;
  }
  if (hours > 24) {
    return `${Math.floor(hours / 24)} days left`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${Math.max(minutes, 0)}m left`;
};

const ReminderSidebar = ({ isOpen, onClose }) => {
  const {
    reminders,
    activeNotifications,
    markComplete,
    deleteReminder,
    snoozeReminder,
    dismissNotification,
    dismissAllNotifications,
    getUpcomingReminders,
    getOverdueReminders,
    settings,
    updateSettings,
    totalReminders,
    upcomingCount,
    overdueCount,
    criticalCount,
    getUserLabel,
  } = useReminders();

  const [activeTab, setActiveTab] = useState('upcoming');
  const [filterModule, setFilterModule] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedReminder, setExpandedReminder] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(settings.notificationSound);

  const filteredReminders = useMemo(() => {
    let filtered = reminders;

    if (activeTab === 'upcoming') {
      filtered = getUpcomingReminders();
    } else if (activeTab === 'overdue') {
      filtered = getOverdueReminders();
    } else if (activeTab === 'all') {
      filtered = reminders.filter((reminder) => reminder.status !== 'completed');
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
  }, [activeTab, filterModule, filterPriority, getOverdueReminders, getUpcomingReminders, reminders, searchQuery]);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    updateSettings({ notificationSound: nextState });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <div className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--border-base)] bg-[var(--bg-elevated)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border-base)] bg-gradient-to-r from-[var(--primary)]/10 to-transparent px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/20">
                <Bell size={20} className="text-[var(--primary)]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Reminders</h2>
                <p className="text-[10px] text-[var(--text-muted)]">{upcomingCount} upcoming   {overdueCount} overdue</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSound}
                className={`rounded-lg p-2 transition-colors ${soundEnabled
                  ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                  : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}
                title={soundEnabled ? 'Sound On' : 'Sound Off'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="rounded-lg bg-[var(--primary)]/20 p-2 text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/30"
                title="Add Reminder"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {activeNotifications.length > 0 && (
            <div className="border-b border-red-500/20 bg-red-500/10 px-3 py-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-red-400">
                  Active Alerts ({activeNotifications.length})
                </span>
                <button onClick={dismissAllNotifications} className="text-[9px] text-red-400 hover:text-red-300">
                  Dismiss All
                </button>
              </div>
              <div className="space-y-1">
                {activeNotifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="flex items-center gap-2 rounded-lg border border-red-500/10 bg-red-500/5 p-2">
                    <AlertTriangle size={14} className="shrink-0 text-red-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-[var(--text-primary)]">{notification.title}</p>
                      <p className="text-[9px] text-red-400">{notification.timeToGo}</p>
                    </div>
                    <button
                      onClick={() => dismissNotification(notification.id)}
                      className="rounded p-1 text-red-400 hover:bg-red-500/10"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 border-b border-[var(--border-base)] px-3 py-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search reminders..."
                className="w-full rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] py-2 pl-9 pr-3 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterModule}
                onChange={(event) => setFilterModule(event.target.value)}
                className="flex-1 rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
              >
                <option value="all">All Modules</option>
                {REMINDER_MODULES.map((module) => (
                  <option key={module.id} value={module.id}>{module.label}</option>
                ))}
              </select>

              <select
                value={filterPriority}
                onChange={(event) => setFilterPriority(event.target.value)}
                className="flex-1 rounded-lg border border-[var(--border-base)] bg-[var(--bg-base)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
              >
                <option value="all">All Priorities</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority.id} value={priority.id}>{priority.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex border-b border-[var(--border-base)]">
            {[
              { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
              { id: 'overdue', label: 'Overdue', count: overdueCount },
              { id: 'all', label: 'All', count: totalReminders },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 py-2.5 text-[11px] font-medium transition-colors ${activeTab === tab.id
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] ${tab.id === 'overdue'
                    ? 'bg-red-500/20 text-red-400'
                    : activeTab === tab.id
                      ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                      : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {filteredReminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-hover)]">
                  <Bell size={24} className="text-[var(--text-faint)]" />
                </div>
                <p className="text-[12px] text-[var(--text-muted)]">No reminders found</p>
                <p className="mt-1 text-[10px] text-[var(--text-faint)]">
                  {searchQuery ? 'Try adjusting your search' : 'Add a new reminder to get started'}
                </p>
              </div>
            ) : (
              filteredReminders.map((reminder) => {
                const isExpanded = expandedReminder === reminder.id;
                const moduleInfo = getReminderModuleInfo(reminder.module);
                const priority = PRIORITIES.find((entry) => entry.id === reminder.priority);

                return (
                  <div
                    key={reminder.id}
                    className={`group rounded-xl border transition-all ${reminder.status === 'overdue'
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-[var(--border-base)] bg-[var(--bg-base)] hover:border-[var(--primary)]/30'}`}
                  >
                    <div
                      className="cursor-pointer p-3"
                      onClick={() => setExpandedReminder(isExpanded ? null : reminder.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-h-[40px] w-1 shrink-0 rounded-full" style={{ backgroundColor: priority?.color || '#6b7280' }} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="truncate text-[12px] font-semibold text-[var(--text-primary)]">{reminder.title}</h3>
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                              style={{ backgroundColor: `${moduleInfo.color}20`, color: moduleInfo.color }}
                            >
                              {moduleInfo.label}
                            </span>
                          </div>

                          <p className="mt-1 line-clamp-2 text-[11px] text-[var(--text-muted)]">{reminder.description}</p>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock size={12} className={reminder.status === 'overdue' ? 'text-red-400' : 'text-[var(--text-faint)]'} />
                              <span className={`text-[10px] ${reminder.status === 'overdue' ? 'font-medium text-red-400' : 'text-[var(--text-muted)]'}`}>
                                {formatTimeRemaining(reminder.dueDate)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  snoozeReminder(reminder.id, 15);
                                }}
                                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                                title="Snooze 15 min"
                              >
                                <Pause size={12} />
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  markComplete(reminder.id);
                                }}
                                className="rounded-lg p-1.5 text-green-500 hover:bg-green-500/10"
                                title="Mark Complete"
                              >
                                <Check size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[var(--border-base)] px-3 pb-3 pt-2">
                        <div className="space-y-2">
                          {reminder.assignedTo && (
                            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                              <User size={12} />
                              <span>Assigned to: {getUserLabel(reminder.assignedTo)}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                            <Calendar size={12} />
                            <span>Due: {reminder.dueDate.toLocaleString()}</span>
                          </div>

                          {reminder.recurringPattern && (
                            <div className="flex items-center gap-2 text-[11px] text-[var(--primary)]">
                              <Clock size={12} />
                              <span>Recurring: {reminder.recurringPattern}</span>
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-1 border-t border-[var(--border-base)] pt-2">
                            <button
                              onClick={() => markComplete(reminder.id)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-[11px] font-medium text-green-500 transition-colors hover:bg-green-500/20"
                            >
                              <Check size={14} />
                              Complete
                            </button>
                            <button
                              onClick={() => snoozeReminder(reminder.id, 15)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--bg-hover)] px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--border-base)]"
                            >
                              <Pause size={14} />
                              Snooze
                            </button>
                            <button
                              onClick={() => deleteReminder(reminder.id)}
                              className="rounded-lg bg-red-500/10 p-2 text-red-500 transition-colors hover:bg-red-500/20"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-[var(--bg-hover)] px-4 py-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-[var(--primary)]">{upcomingCount}</p>
                <p className="text-[9px] text-[var(--text-muted)]">Upcoming</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">{overdueCount}</p>
                <p className="text-[9px] text-[var(--text-muted)]">Overdue</p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-500">{criticalCount}</p>
                <p className="text-[9px] text-[var(--text-muted)]">Critical</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddReminderModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
      />
    </>
  );
};

export default ReminderSidebar;

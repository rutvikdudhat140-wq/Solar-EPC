// ReminderWidget.js — Embeddable reminder widget for dashboards
import React, { useState } from 'react';
import { Bell, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { useReminders } from '../../context/ReminderContext';
import { getReminderModuleInfo } from './reminderModules';

const ReminderWidget = ({ onNavigateToReminders }) => {
    const {
        getUpcomingReminders,
        getOverdueReminders,
        markComplete,
        snoozeReminder,
        upcomingCount,
        overdueCount,
        activeNotifications
    } = useReminders();

    const [showAll, setShowAll] = useState(false);

    const upcomingReminders = getUpcomingReminders().slice(0, showAll ? 10 : 3);
    const overdueReminders = getOverdueReminders().slice(0, showAll ? 10 : 3);
    const allDisplayReminders = [...overdueReminders, ...upcomingReminders];

    const formatTimeRemaining = (dueDate) => {
        const now = new Date();
        const timeDiff = dueDate - now;

        if (timeDiff < 0) return 'Overdue';

        const minutes = Math.floor(timeDiff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return 'Now';
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return '#ef4444';
            case 'high': return '#f59e0b';
            case 'medium': return '#3b82f6';
            case 'low': return '#6b7280';
            default: return '#6b7280';
        }
    };

    return (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bell size={16} className="text-[var(--primary)]" />
                    <h3 className="font-bold text-[var(--text-primary)]">Reminders</h3>
                    {activeNotifications.length > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {activeNotifications.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        {showAll ? 'Show Less' : 'View All'}
                    </button>
                    <button
                        onClick={onNavigateToReminders}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-r from-[var(--success)]20 to-[var(--success)]10 border border-[var(--success)]30">
                    <div className="flex items-center gap-2">
                        <Clock size={14} style={{ color: 'var(--success)' }} />
                        <span className="text-xs font-medium text-[var(--text-muted)]">Upcoming</span>
                    </div>
                    <p className="text-lg font-black tabular-nums" style={{ color: 'var(--success)' }}>
                        {upcomingCount}
                    </p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-[var(--error)]20 to-[var(--error)]10 border border-[var(--error)]30">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={14} style={{ color: 'var(--error)' }} />
                        <span className="text-xs font-medium text-[var(--text-muted)]">Overdue</span>
                    </div>
                    <p className="text-lg font-black tabular-nums" style={{ color: 'var(--error)' }}>
                        {overdueCount}
                    </p>
                </div>
            </div>

            {/* Active Notifications */}
            {activeNotifications.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-[var(--warning)]20 to-[var(--error)]20 border-l-4 border-[var(--warning)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Bell size={12} className="text-[var(--warning)]" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">Live Alerts</span>
                    </div>
                    <div className="space-y-1">
                        {activeNotifications.slice(0, 2).map(notification => (
                            <div key={notification.id} className="text-xs text-[var(--text-secondary)]">
                                <span className="font-medium">{notification.title}</span>
                                <span className="text-[var(--text-muted)] ml-2">• {notification.timeToGo}</span>
                            </div>
                        ))}
                        {activeNotifications.length > 2 && (
                            <div className="text-xs text-[var(--text-muted)]">
                                +{activeNotifications.length - 2} more alerts
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reminder List */}
            <div className="space-y-3">
                {allDisplayReminders.length === 0 ? (
                    <div className="text-center py-6">
                        <div className="w-12 h-12 rounded-full bg-[var(--bg-overlay)] flex items-center justify-center mx-auto mb-2">
                            <Bell size={16} className="text-[var(--text-muted)]" />
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">No pending reminders</p>
                    </div>
                ) : (
                    allDisplayReminders.map(reminder => {
                        const isOverdue = reminder.dueDate < new Date();
                        const priorityColor = getPriorityColor(reminder.priority);
                        const moduleInfo = getReminderModuleInfo(reminder.module);
                        const moduleColor = moduleInfo.color;

                        return (
                            <div
                                key={reminder.id}
                                className={`p-3 rounded-lg border transition-all hover:border-[var(--border-hover)] ${isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-[var(--bg-base)] border-[var(--border-base)]'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
                                            {reminder.title}
                                        </h4>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                                            {reminder.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: priorityColor }}
                                            title={`${reminder.priority} priority`}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="text-xs font-medium px-2 py-1 rounded-md capitalize"
                                            style={{
                                                backgroundColor: moduleColor + '20',
                                                color: moduleColor
                                            }}
                                        >
                                            {moduleInfo.label}
                                        </span>
                                        <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : 'text-[var(--text-muted)]'}`}>
                                            {formatTimeRemaining(reminder.dueDate)}
                                        </span>
                                    </div>

                                    {reminder.status === 'pending' && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => snoozeReminder(reminder.id, 30)}
                                                className="text-xs px-2 py-1 rounded bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
                                                title="Snooze 30min"
                                            >
                                                30m
                                            </button>
                                            <button
                                                onClick={() => markComplete(reminder.id)}
                                                className="text-xs px-2 py-1 rounded bg-[var(--success)] text-white hover:opacity-90 transition-opacity"
                                                title="Mark complete"
                                            >
                                                ✓
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Actions */}
            {(upcomingCount > 3 || overdueCount > 3) && !showAll && (
                <div className="mt-3 pt-3 border-t border-[var(--border-base)] text-center">
                    <button
                        onClick={onNavigateToReminders}
                        className="text-xs font-bold text-[var(--primary)] hover:underline"
                    >
                        View All {upcomingCount + overdueCount} Reminders →
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReminderWidget;

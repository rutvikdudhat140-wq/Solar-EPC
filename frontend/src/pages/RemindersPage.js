// RemindersPage.js — Comprehensive reminder management interface
import React, { useState, useMemo } from 'react';
import {
    Bell, Plus, Filter, Search, Clock, AlertTriangle, CheckCircle,
    Settings, Calendar, Users, DollarSign, Package, Wrench,
    Volume2, MessageSquare, Smartphone, Eye, EyeOff, Play,
    Pause, RotateCcw, Trash2, Archive, Star, MapPin, FileText
} from 'lucide-react';
import { useReminders } from '../context/ReminderContext';
import AddReminderModal from '../components/Reminder/AddReminderModal';

const MODULE_ICONS = {
    sales: Users,
    survey: MapPin,
    design: FileText,
    finance: DollarSign,
    procurement: Package,
    service: Wrench,
    inventory: Package,
    installation: Wrench,
    project: Calendar
};

const MODULE_COLORS = {
    sales: '#3b82f6',
    survey: '#10b981',
    design: '#8b5cf6',
    finance: '#f59e0b',
    procurement: '#06b6d4',
    service: '#ef4444',
    inventory: '#84cc16',
    installation: '#f97316',
    project: '#6366f1'
};

const PRIORITY_COLORS = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#6b7280'
};

const RemindersPage = () => {
    const {
        reminders,
        activeNotifications,
        settings,
        addReminder,
        updateReminder,
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
        totalReminders
    } = useReminders();

    const [activeTab, setActiveTab] = useState('all');
    const [filterModule, setFilterModule] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [selectedReminder, setSelectedReminder] = useState(null);

    // Filter and search reminders
    const filteredReminders = useMemo(() => {
        let filtered = reminders;

        // Filter by tab
        if (activeTab === 'upcoming') {
            filtered = getUpcomingReminders();
        } else if (activeTab === 'overdue') {
            filtered = getOverdueReminders();
        } else if (activeTab === 'critical') {
            filtered = getRemindersByPriority('critical');
        } else if (activeTab === 'completed') {
            filtered = reminders.filter(r => r.status === 'completed');
        }

        // Filter by module
        if (filterModule !== 'all') {
            filtered = filtered.filter(r => r.module === filterModule);
        }

        // Filter by priority
        if (filterPriority !== 'all') {
            filtered = filtered.filter(r => r.priority === filterPriority);
        }

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(r =>
                r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    }, [reminders, activeTab, filterModule, filterPriority, searchQuery, getUpcomingReminders, getOverdueReminders, getRemindersByPriority]);

    const formatDateTime = (date) => {
        return new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(date));
    };

    const getTimeStatus = (dueDate, status) => {
        const now = new Date();
        const timeDiff = dueDate - now;

        if (status === 'completed') return { text: 'Completed', color: '#10b981' };
        if (timeDiff < 0) return { text: 'Overdue', color: '#ef4444' };
        if (timeDiff < 60 * 60 * 1000) return { text: 'Due Soon', color: '#f59e0b' };
        return { text: 'Upcoming', color: '#6b7280' };
    };

    const ReminderCard = ({ reminder }) => {
        const ModuleIcon = MODULE_ICONS[reminder.module] || Bell;
        const moduleColor = MODULE_COLORS[reminder.module] || '#6b7280';
        const priorityColor = PRIORITY_COLORS[reminder.priority] || '#6b7280';
        const timeStatus = getTimeStatus(reminder.dueDate, reminder.status);

        return (
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl p-4 hover:border-[var(--border-hover)] transition-all duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: moduleColor + '20', color: moduleColor }}>
                            <ModuleIcon size={16} />
                        </div>
                        <div>
                            <h3 className="font-bold text-[var(--text-primary)] text-sm leading-tight">{reminder.title}</h3>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5 capitalize">{reminder.module} • {reminder.type}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: priorityColor }}
                            title={`${reminder.priority} priority`}
                        />
                        <span
                            className="text-xs font-bold px-2 py-1 rounded-md"
                            style={{
                                color: timeStatus.color,
                                backgroundColor: timeStatus.color + '20'
                            }}
                        >
                            {timeStatus.text}
                        </span>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                    {reminder.description}
                </p>

                {/* Due Date */}
                <div className="flex items-center gap-2 mb-3 text-xs text-[var(--text-muted)]">
                    <Clock size={12} />
                    <span>Due: {formatDateTime(reminder.dueDate)}</span>
                </div>

                {/* Metadata */}
                {reminder.metadata && (
                    <div className="mb-3 p-2 bg-[var(--bg-base)] rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(reminder.metadata).map(([key, value]) => (
                                <div key={key}>
                                    <span className="text-[var(--text-muted)] capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}: </span>
                                    <span className="text-[var(--text-primary)] font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notification Channels */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-[var(--text-muted)]">Alerts:</span>
                    {reminder.notificationChannels?.includes('in-app') && (
                        <Bell size={12} className="text-[var(--text-muted)]" />
                    )}
                    {reminder.notificationChannels?.includes('voice') && (
                        <Volume2 size={12} className="text-[var(--text-muted)]" />
                    )}
                    {reminder.notificationChannels?.includes('sms') && (
                        <Smartphone size={12} className="text-[var(--text-muted)]" />
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-base)]">
                    {reminder.status === 'pending' && (
                        <>
                            <button
                                onClick={() => markComplete(reminder.id)}
                                className="flex-1 px-3 py-2 bg-[var(--success)] text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                            >
                                <CheckCircle size={12} />
                                Complete
                            </button>
                            <button
                                onClick={() => snoozeReminder(reminder.id, 30)}
                                className="px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1"
                            >
                                <RotateCcw size={12} />
                                30m
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setSelectedReminder(reminder)}
                        className="px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        <Eye size={12} />
                    </button>
                </div>
            </div>
        );
    };

    const StatsCard = ({ label, value, icon: Icon, color, onClick, isActive }) => (
        <div
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${isActive
                    ? 'border-[var(--primary)] bg-[var(--primary)]10'
                    : 'border-[var(--border-base)] bg-[var(--bg-elevated)] hover:border-[var(--border-hover)]'
                }`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
                    <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: color + '20', color }}>
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-[var(--text-primary)]">Reminder Center</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Centralized notification and reminder management system
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        <Settings size={18} />
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Reminder
                    </button>
                </div>
            </div>

            {/* Active Notifications */}
            {activeNotifications.length > 0 && (
                <div className="bg-gradient-to-r from-[var(--warning)]20 to-[var(--error)]20 border-l-4 border-[var(--warning)] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Bell size={16} className="text-[var(--warning)]" />
                            Active Notifications ({activeNotifications.length})
                        </h3>
                        <button
                            onClick={dismissAllNotifications}
                            className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Dismiss All
                        </button>
                    </div>
                    <div className="space-y-2">
                        {activeNotifications.slice(0, 3).map(notification => (
                            <div key={notification.id} className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg">
                                <div>
                                    <p className="font-medium text-sm text-[var(--text-primary)]">{notification.title}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{notification.timeToGo} • {notification.module}</p>
                                </div>
                                <button
                                    onClick={() => dismissNotification(notification.id)}
                                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    label="Total"
                    value={totalReminders}
                    icon={Bell}
                    color="#6366f1"
                    onClick={() => setActiveTab('all')}
                    isActive={activeTab === 'all'}
                />
                <StatsCard
                    label="Upcoming"
                    value={upcomingCount}
                    icon={Clock}
                    color="#10b981"
                    onClick={() => setActiveTab('upcoming')}
                    isActive={activeTab === 'upcoming'}
                />
                <StatsCard
                    label="Overdue"
                    value={overdueCount}
                    icon={AlertTriangle}
                    color="#ef4444"
                    onClick={() => setActiveTab('overdue')}
                    isActive={activeTab === 'overdue'}
                />
                <StatsCard
                    label="Critical"
                    value={criticalCount}
                    icon={Star}
                    color="#f59e0b"
                    onClick={() => setActiveTab('critical')}
                    isActive={activeTab === 'critical'}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-base)]">
                <div className="flex items-center gap-2">
                    <Search size={16} className="text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search reminders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                    />
                </div>

                <select
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                >
                    <option value="all">All Modules</option>
                    <option value="sales">Sales</option>
                    <option value="survey">Survey</option>
                    <option value="design">Design</option>
                    <option value="finance">Finance</option>
                    <option value="procurement">Procurement</option>
                    <option value="service">Service</option>
                    <option value="inventory">Inventory</option>
                    <option value="installation">Installation</option>
                </select>

                <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
            </div>

            {/* Reminders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredReminders.map(reminder => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
            </div>

            {filteredReminders.length === 0 && (
                <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center text-4xl mx-auto mb-4">
                        🔔
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No reminders found</h3>
                    <p className="text-sm text-[var(--text-muted)]">
                        {searchQuery || filterModule !== 'all' || filterPriority !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first reminder to get started'}
                    </p>
                </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--bg-elevated)] rounded-xl p-6 w-full max-w-md mx-4 border border-[var(--border-base)]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Notification Settings</h3>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Voice Alerts</label>
                                <button
                                    onClick={() => updateSettings({ voiceAlerts: !settings.voiceAlerts })}
                                    className={`w-12 h-6 rounded-full transition-colors ${settings.voiceAlerts ? 'bg-[var(--primary)]' : 'bg-[var(--bg-overlay)]'
                                        }`}
                                >
                                    <div className={`w-5 h-5 bg-[var(--bg-surface)] rounded-full transition-transform ${settings.voiceAlerts ? 'translate-x-6' : 'translate-x-0.5'
                                        }`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-[var(--text-primary)]">SMS Notifications</label>
                                <button
                                    onClick={() => updateSettings({ smsNotifications: !settings.smsNotifications })}
                                    className={`w-12 h-6 rounded-full transition-colors ${settings.smsNotifications ? 'bg-[var(--primary)]' : 'bg-[var(--bg-overlay)]'
                                        }`}
                                >
                                    <div className={`w-5 h-5 bg-[var(--bg-surface)] rounded-full transition-transform ${settings.smsNotifications ? 'translate-x-6' : 'translate-x-0.5'
                                        }`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Notification Sound</label>
                                <button
                                    onClick={() => updateSettings({ notificationSound: !settings.notificationSound })}
                                    className={`w-12 h-6 rounded-full transition-colors ${settings.notificationSound ? 'bg-[var(--primary)]' : 'bg-[var(--bg-overlay)]'
                                        }`}
                                >
                                    <div className={`w-5 h-5 bg-[var(--bg-surface)] rounded-full transition-transform ${settings.notificationSound ? 'translate-x-6' : 'translate-x-0.5'
                                        }`} />
                                </button>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
                                    Reminder Interval: {settings.reminderInterval} minutes
                                </label>
                                <input
                                    type="range"
                                    min="5"
                                    max="60"
                                    step="5"
                                    value={settings.reminderInterval}
                                    onChange={(e) => updateSettings({ reminderInterval: parseInt(e.target.value) })}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Reminder Modal */}
            <AddReminderModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
            />
        </div>
    );
};

export default RemindersPage;

// ProjectManagerDashboard.js ""  Professional Project Management Control Center
import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, ComposedChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell
} from 'recharts';
import {
    Briefcase, CheckCircle, Clock, AlertTriangle, Users, Calendar,
    TrendingUp, Target, Star, Activity, Zap, RefreshCw,
    Download, ArrowUpRight, MapPin, Wrench
} from 'lucide-react';
import { useRoleDashboard } from './RoleDashboardProvider';
import ReminderWidget from '../Reminder/ReminderWidget';
import {
    StatCard, ChartCard, Grid2, Grid3,
    DashboardLoading, DashTooltip,
    fmtPct, chartAxisStyle, ROLE_COLORS
} from './DashboardShell';

const COLORS = {
    primary: '#6366f1',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
};

const ProjectManagerDashboard = ({ onNavigate }) => {
    const [selectedTimeRange, setSelectedTimeRange] = useState('6M');
    const [refreshing, setRefreshing] = useState(false);

    const { data, loading } = useRoleDashboard();
    if (loading) return <DashboardLoading />;

    const C = ROLE_COLORS.pm;

    const PROJECT_OVERVIEW = {
        activeProjects: 35,
        completedProjects: 186,
        totalProjects: 221,
        onTimeDelivery: 94.2,
        projectSuccessRate: 96.3,
        teamUtilization: 87.5,
        avgProjectDuration: 45,
        budgetVariance: -2.1,
        qualityScore: 4.8,
        customerSatisfaction: 4.7,
        milestonesCompleted: 342,
        pendingApprovals: 12,
        criticalTasks: 8,
        teamMembers: 24
    };

    const projectKPIs = [
        {
            label: 'Active Projects',
            value: PROJECT_OVERVIEW.activeProjects.toString(),
            icon: Briefcase,
            accent: C.primary,
            trend: '+5 this month',
            trendUp: true
        },
        {
            label: 'On-Time Delivery',
            value: `${PROJECT_OVERVIEW.onTimeDelivery}%`,
            icon: CheckCircle,
            accent: '#10b981',
            trend: '+2.1% improved',
            trendUp: true
        },
        {
            label: 'Team Utilization',
            value: `${PROJECT_OVERVIEW.teamUtilization}%`,
            icon: Users,
            accent: C.secondary,
            trend: '+4.3% efficient',
            trendUp: true
        },
        {
            label: 'Budget Performance',
            value: `${Math.abs(PROJECT_OVERVIEW.budgetVariance)}%`,
            icon: Target,
            accent: '#f59e0b',
            trend: 'Under budget',
            trendUp: true
        },
    ];

    const { projects = {}, milestones = {}, installation = {}, commissioning = {}, timeline = [] } = data || {};

    const projectStatusPie = [
        { name: 'Active', value: PROJECT_OVERVIEW.activeProjects, color: C.primary },
        { name: 'Completed', value: PROJECT_OVERVIEW.completedProjects, color: '#10b981' },
        { name: 'Planning', value: 12, color: '#f59e0b' },
        { name: 'On Hold', value: 4, color: '#ef4444' },
    ];

    const milestoneData = [
        { phase: 'Design Approval', completed: 89, total: 95, pct: 93.7 },
        { phase: 'Material Procurement', completed: 76, total: 85, pct: 89.4 },
        { phase: 'Installation', completed: 67, total: 75, pct: 89.3 },
        { phase: 'Commissioning', completed: 45, total: 50, pct: 90.0 },
        { phase: 'Handover', completed: 42, total: 48, pct: 87.5 },
    ];

    const projectTimelineData = [
        { month: 'Jan', planned: 28, actual: 26, efficiency: 92.9 },
        { month: 'Feb', planned: 32, actual: 30, efficiency: 93.8 },
        { month: 'Mar', planned: 35, actual: 35, efficiency: 100.0 },
        { month: 'Apr', planned: 38, actual: 36, efficiency: 94.7 },
        { month: 'May', planned: 42, actual: 39, efficiency: 92.9 },
        { month: 'Jun', planned: 45, actual: 44, efficiency: 97.8 },
    ];


    // Recent Projects
    const recentProjects = [
        { name: 'P7767 - Lavji Badshah', customer: 'Gopin Surat', site: 'Surat', progress: 20, status: 'Survey', daysLeft: 45, priority: 'Normal' },
        { name: 'P9134 - Pintu Sharma', customer: 'Pune Mumbai', site: 'Mumbai', progress: 60, status: 'Quotation', daysLeft: 30, priority: 'High' },
        { name: 'P7244 - Srikant Mehta', customer: 'Ahmedabad', site: 'Ahmedabad', progress: 0, status: 'Installation', daysLeft: 60, priority: 'Normal' },
        { name: 'P0327 - Karan Johr', customer: 'Vesu Surat', site: 'Surat', progress: 20, status: 'Procurement', daysLeft: 90, priority: 'Low' },
    ];

    // Team Members
    const teamMembers = [
        { name: 'Neha Gupta', role: 'Project Manager', tasks: 12, avatar: 'NG', status: 'online' },
        { name: 'Jethalal Gada', role: 'Site Engineer', tasks: 8, avatar: 'JG', status: 'busy' },
        { name: 'Harish Mehta', role: 'Technical Lead', tasks: 15, avatar: 'HM', status: 'online' },
        { name: 'Dinesh Trivedi', role: 'Installer', tasks: 6, avatar: 'DT', status: 'away' },
    ];

    // Charts Data
    const statusData = [
        { name: 'Active', value: 35, color: COLORS.primary },
        { name: 'Completed', value: 186, color: COLORS.success },
        { name: 'Planning', value: 12, color: COLORS.warning },
        { name: 'On Hold', value: 4, color: COLORS.danger },
    ];

    const performanceData = [
        { subject: 'Design', A: 93, fullMark: 100 },
        { subject: 'Procurement', A: 89, fullMark: 100 },
        { subject: 'Installation', A: 89, fullMark: 100 },
        { subject: 'Commissioning', A: 90, fullMark: 100 },
        { subject: 'Handover', A: 88, fullMark: 100 },
    ];

    const timelineData = [
        { month: 'Jan', planned: 28, actual: 26, efficiency: 92.9 },
        { month: 'Feb', planned: 32, actual: 30, efficiency: 93.8 },
        { month: 'Mar', planned: 35, actual: 35, efficiency: 100.0 },
        { month: 'Apr', planned: 38, actual: 36, efficiency: 94.7 },
        { month: 'May', planned: 42, actual: 39, efficiency: 92.9 },
        { month: 'Jun', planned: 45, actual: 44, efficiency: 97.8 },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[var(--bg-base)] via-[var(--bg-subtle)] to-[var(--bg-muted)] p-6">
            {/* Professional Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--primary)] via-[var(--primary-hover)] to-[var(--primary-active)] p-6 text-white shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
                    <Briefcase size={256} />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[var(--bg-surface)]/20 backdrop-blur-sm border border-white/30">
                            <Briefcase size={28} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-white">Project Control Center</h1>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--bg-surface)]/20 border border-white/30 backdrop-blur-sm">
                                    PROJECT MANAGER
                                </span>
                            </div>
                            <p className="text-white/80 text-sm">
                                Project Tracking " Team Management " Milestone Monitoring
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)]/20 backdrop-blur-sm border border-white/30">
                            <Calendar size={16} className="text-white/80" />
                            <select
                                value={selectedTimeRange}
                                onChange={(e) => setSelectedTimeRange(e.target.value)}
                                className="bg-transparent text-sm font-medium text-white border-0 focus:ring-0 pr-6 cursor-pointer"
                            >
                                <option value="1M" className="text-slate-900">1 Month</option>
                                <option value="3M" className="text-slate-900">3 Months</option>
                                <option value="6M" className="text-slate-900">6 Months</option>
                                <option value="1Y" className="text-slate-900">1 Year</option>
                            </select>
                        </div>
                        <button
                            onClick={() => setRefreshing(!refreshing)}
                            className={`p-3 rounded-xl bg-[var(--bg-surface)]/20 backdrop-blur-sm border border-white/30 hover:bg-[var(--bg-surface)]/30 transition-all ${refreshing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw size={16} className="text-white" />
                        </button>
                        <button className="p-3 rounded-xl bg-[var(--bg-surface)]/20 backdrop-blur-sm border border-white/30 hover:bg-[var(--bg-surface)]/30 transition-all">
                            <Download size={16} className="text-white" />
                        </button>
                    </div>
                </div>

                <div className="relative z-10 mt-4 flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-white/90">All Projects On Track</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={12} className="text-white/70" />
                        <span className="text-white/70">{PROJECT_OVERVIEW.criticalTasks} Critical Tasks</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="text-white/70" />
                        <span className="text-white/70">{PROJECT_OVERVIEW.pendingApprovals} Approvals Pending</span>
                    </div>
                </div>
            </div>

            {/* Executive KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {projectKPIs.map((kpi) => (
                    <div key={kpi.label} className="relative">
                        <StatCard {...kpi} />
                        <div className="absolute top-4 right-4 opacity-50">
                            <kpi.icon size={18} style={{ color: kpi.accent }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Project Analytics */}
            <Grid2>
                {/* Project Timeline Performance */}
                <ChartCard 
                    title="Project Timeline Performance" 
                    subtitle="Planned vs actual project completion"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={projectTimelineData}>
                            <defs>
                                <linearGradient id="projectGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="month" {...chartAxisStyle} />
                            <YAxis yAxisId="projects" orientation="left" {...chartAxisStyle} />
                            <YAxis yAxisId="efficiency" orientation="right" tickFormatter={(v) => `${v}%`} {...chartAxisStyle} />
                            <Tooltip content={<DashTooltip />} />
                            <Legend />
                            <Bar yAxisId="projects" dataKey="planned" name="Planned" fill="#e5e7eb" />
                            <Area yAxisId="projects" type="monotone" dataKey="actual" name="Actual" stroke={C.primary} strokeWidth={2} fill="url(#projectGradient)" />
                            <Line yAxisId="efficiency" type="monotone" dataKey="efficiency" name="Efficiency %" stroke="#10b981" strokeWidth={3} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Project Status Distribution */}
                <ChartCard 
                    title="Project Portfolio Status" 
                    subtitle="Current project distribution"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <div className="flex items-center justify-between">
                        <ResponsiveContainer width="60%" height={200}>
                            <PieChart>
                                <Pie
                                    data={projectStatusPie}
                                    cx="50%" cy="50%"
                                    outerRadius={70}
                                    innerRadius={40}
                                    dataKey="value"
                                    paddingAngle={3}
                                >
                                    {projectStatusPie.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<DashTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="flex-1 space-y-3 pl-4">
                            {projectStatusPie.map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-bold tabular-nums" style={{ color: item.color }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </ChartCard>
            </Grid2>

            {/* Milestone Progress Tracking */}
            <ChartCard 
                title="Milestone Progress Tracking" 
                subtitle="Phase-wise completion status across all projects"
                headerRight={
                    <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                        {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                            <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                        ))}
                    </div>
                }
            >
                <div className="space-y-4">
                    {milestoneData.map((milestone) => (
                        <div key={milestone.phase} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-semibold text-sm">{milestone.phase}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold" style={{ color: C.primary }}>
                                        {milestone.completed}/{milestone.total}
                                    </span>
                                    <span className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded-md">
                                        {milestone.pct}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${milestone.pct}%`,
                                            backgroundColor: milestone.pct > 90 ? '#10b981' : milestone.pct > 70 ? C.primary : '#f59e0b'
                                        }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums min-w-12">
                                    {milestone.pct}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </ChartCard>

            {/* Reminders Section */}
            <div className="mt-6">
                <ReminderWidget onNavigateToReminders={() => { }} />
            </div>

            {/* Quick Action Items */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Critical Tasks', count: PROJECT_OVERVIEW.criticalTasks, icon: AlertTriangle, color: '#ef4444', urgent: true },
                    { label: 'Pending Approvals', count: PROJECT_OVERVIEW.pendingApprovals, icon: Clock, color: '#f59e0b' },
                    { label: 'Site Inspections', count: 6, icon: MapPin, color: C.primary },
                    { label: 'Team Meetings', count: 3, icon: Users, color: '#10b981' },
                ].map(({ label, count, icon: Icon, color, urgent }) => (
                    <button key={label} className={`glass-card p-4 text-left hover:shadow-lg transition-all group ${urgent ? 'ring-2 ring-red-200 dark:ring-red-800' : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: color + '15', border: `1px solid ${color}30` }}>
                                <Icon size={16} style={{ color }} />
                            </div>
                            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold tabular-nums mb-1 ${urgent ? 'animate-pulse' : ''}`} style={{ color }}>{count}</p>
                            <p className="text-xs text-[var(--text-muted)]">{label}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ProjectManagerDashboard;

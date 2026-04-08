// TechnicianDashboard.js Ã¢â‚¬â€ Technician role dashboard (redesigned)
import React from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Wrench, CheckCircle, Clock, AlertTriangle, Zap,
    Battery, Settings, Calendar, Activity
} from 'lucide-react';
import { useRoleDashboard } from './RoleDashboardProvider';
import ReminderWidget from '../Reminder/ReminderWidget';
import {
    StatCard, ChartCard, SectionHeader, ActivityItem, ProgressRow,
    Grid4, Grid2, Grid3,
    DashboardLoading, DashTooltip,
    fmtPct, CHART_COLORS, chartAxisStyle, ROLE_COLORS
} from './DashboardShell';

const C = ROLE_COLORS.technician;

const TechnicianDashboard = () => {
    const { data, loading } = useRoleDashboard();
    if (loading) return <DashboardLoading />;

    const { tasks = {}, fieldWork = [], checklists = {}, serviceLogs = [] } = data || {};

    const taskPie = [
        { name: 'Completed', value: tasks.completed || 0, color: '#10b981' },
        { name: 'In Progress', value: tasks.inProgress || 0, color: C.primary },
        { name: 'Pending', value: tasks.pending || 0, color: '#f59e0b' },
    ];

    const checklistData = Object.entries(checklists || {}).map(([key, val]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        completed: val.completed || 0,
        total: val.total || 0,
        pct: val.total ? Math.round((val.completed / val.total) * 100) : 0,
    }));

    const radarData = [
        { skill: 'Installation', value: 94 },
        { skill: 'Electrical', value: 88 },
        { skill: 'Commissioning', value: 85 },
        { skill: 'Maintenance', value: 91 },
        { skill: 'Safety', value: 97 },
        { skill: 'Documentation', value: 78 },
    ];

    const serviceLogData = (serviceLogs || []);

    return (
        <div className="space-y-5 p-5">
            {/* Global Date Filter Bar */}
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-base)] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Filter by Date:</span>
                    <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                        {['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'All Time', 'Custom Range'].map((filter) => (
                            <button 
                                key={filter} 
                                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                                    filter === 'All Time' 
                                        ? 'bg-orange-500 text-white' 
                                        : 'text-[var(--text-secondary)] hover:text-gray-900 hover:bg-gray-200'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
                <span className="text-sm text-[var(--text-muted)]">Showing All Data</span>
            </div>

            <SectionHeader
                title="Technician Dashboard"
                subtitle="Field tasks Ã‚Â· Installation progress Ã‚Â· Service activities"
                icon={Wrench}
                accent={C.primary}
                badge="Field Ops"
            />

            {/* KPIs */}
            <Grid4>
                <StatCard label="Tasks Assigned" value={tasks.assigned || 0} icon={Calendar} accent={C.primary} />
                <StatCard label="Completion Rate" value={fmtPct(tasks.completionRate)} icon={CheckCircle} accent="#10b981" trend="+5.3% this week" trendUp />
                <StatCard label="In Progress" value={tasks.inProgress || 0} icon={Activity} accent={C.secondary} />
                <StatCard label="Pending Tasks" value={tasks.pending || 0} icon={Clock} accent="#f59e0b" sub="Needs attention" />
            </Grid4>

            {/* Task pie + Skill radar */}
            <Grid2>
                <ChartCard 
                    title="Task Status Breakdown" 
                    subtitle="Current workload distribution"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={210}>
                        <PieChart>
                            <Pie data={taskPie} cx="50%" cy="50%" outerRadius={85} innerRadius={48}
                                dataKey="value" paddingAngle={3}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {taskPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={<DashTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {taskPie.map(({ name, value, color }) => (
                            <div key={name} className="text-center p-2 rounded-lg border border-[var(--border-base)]">
                                <p className="text-[16px] font-extrabold tabular-nums" style={{ color }}>{value}</p>
                                <p className="text-[9px] text-[var(--text-muted)] mt-0.5 font-bold uppercase tracking-wide leading-tight">{name}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard 
                    title="Skills Radar" 
                    subtitle="Technical proficiency scores"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={260}>
                        <RadarChart data={radarData} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                            <PolarGrid stroke="var(--chart-grid)" />
                            <PolarAngleAxis dataKey="skill" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-faint)', fontSize: 9 }} />
                            <Radar name="Proficiency" dataKey="value" stroke={C.primary} fill={C.primary} fillOpacity={0.25} strokeWidth={2} />
                            <Tooltip content={<DashTooltip formatter={(v) => `${v}%`} />} />
                        </RadarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </Grid2>

            {/* Field work + Checklists + Checklist bar */}
            <Grid3>
                <ChartCard title="Active Field Work" subtitle="Current site assignments">
                    <div className="space-y-3 mt-1">
                        {(fieldWork || []).map((w, i) => (
                            <div key={i} className="p-3 rounded-xl border border-[var(--border-base)] space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[12.5px] font-semibold text-[var(--text-primary)]">{w.site}</p>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border"
                                        style={{
                                            color: w.progress === 100 ? '#10b981' : C.primary,
                                            borderColor: (w.progress === 100 ? '#10b981' : C.primary) + '40',
                                            backgroundColor: (w.progress === 100 ? '#10b981' : C.primary) + '12',
                                        }}>
                                        {w.task}
                                    </span>
                                </div>
                                <ProgressRow label="" value={w.progress} accent={CHART_COLORS[i % CHART_COLORS.length]} />
                                <p className="text-[10px] text-[var(--text-muted)]">Due: {w.dueDate}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Checklist Completion" subtitle="Safety & quality compliance">
                    <div className="space-y-4 mt-1">
                        {checklistData.map((c, i) => (
                            <div key={i}>
                                <ProgressRow
                                    label={c.name}
                                    value={c.completed}
                                    max={c.total}
                                    accent={c.pct === 100 ? '#10b981' : CHART_COLORS[i % CHART_COLORS.length]}
                                />
                            </div>
                        ))}
                    </div>
                    <ResponsiveContainer width="100%" height={140} className="mt-4">
                        <BarChart data={checklistData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                            <XAxis dataKey="name" {...chartAxisStyle} />
                            <YAxis {...chartAxisStyle} domain={[0, 100]} />
                            <Tooltip content={<DashTooltip formatter={(v) => `${v}%`} />} />
                            <Bar dataKey="pct" name="Completion %" radius={[4, 4, 0, 0]}>
                                {checklistData.map((c, i) => <Cell key={i} fill={c.pct === 100 ? '#10b981' : CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Performance Stats" subtitle="This month">
                    <div className="space-y-3 mt-1">
                        <ProgressRow label="Task Completion" value={tasks.completionRate || 0} accent="#10b981" />
                        <ProgressRow label="On-Time Rate" value={91} accent={C.primary} />
                        <ProgressRow label="Safety Score" value={97} accent="#f59e0b" />
                        <ProgressRow label="Quality Rating" value={89} accent="#8b5cf6" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {[
                            { l: 'Assigned', v: tasks.assigned || 0, c: C.primary },
                            { l: 'Done', v: tasks.completed || 0, c: '#10b981' },
                        ].map(({ l, v, c }) => (
                            <div key={l} className="text-center p-3 rounded-xl border border-[var(--border-base)]">
                                <p className="text-[20px] font-extrabold tabular-nums" style={{ color: c }}>{v}</p>
                                <p className="label-muted mt-0.5">{l}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </Grid3>

            {/* Service log */}
            <ChartCard title="Recent Service Log" subtitle="Last field activities">
                {serviceLogData.length > 0 ? serviceLogData.map((log, i) => (
                    <ActivityItem
                        key={i}
                        icon={Wrench}
                        accent={log.status === 'Resolved' || log.status === 'Completed' ? '#10b981' : C.primary}
                        title={`${log.issue} Ã¢â‚¬â€ ${log.site}`}
                        meta={log.date}
                        status={log.status}
                        statusColor={log.status === 'Resolved' || log.status === 'Completed' ? '#10b981' : C.primary}
                    />
                )) : (
                    <p className="text-[12px] text-[var(--text-muted)] py-4 text-center">No recent logs</p>
                )}
                {/* Static fallback logs */}
                {serviceLogData.length === 0 && [
                    { icon: Zap, title: 'Inverter fault resolved: Site A', meta: 'Grid sync issue Ã¢â‚¬â€ replaced fuse', time: '2h ago', status: 'Resolved', statusColor: '#10b981' },
                    { icon: Battery, title: 'Panel cleaning done: Site B', meta: '40 panels cleaned, efficiency +8%', time: '4h ago', status: 'Done', statusColor: '#10b981' },
                    { icon: AlertTriangle, title: 'Mounting issue flagged: Site C', meta: 'Corrosion on clamps Ã¢â‚¬â€ ordered parts', time: '6h ago', status: 'Pending', statusColor: '#f59e0b' },
                    { icon: Settings, title: 'MPPT calibration: Factory D', meta: 'Optimized for summer irradiance', time: '1d ago', status: 'Done', statusColor: '#10b981' },
                ].map((item, i) => (
                    <ActivityItem key={i} {...item} accent={item.statusColor} />
                ))}
            </ChartCard>

            {/* Reminders Section */}
            <div className="mt-6">
                <ReminderWidget onNavigateToReminders={() => { }} />
            </div>
        </div>
    );
};

export default TechnicianDashboard;

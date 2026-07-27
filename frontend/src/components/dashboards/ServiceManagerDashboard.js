// ServiceManagerDashboard.js a "  Service Manager role dashboard (redesigned)
import React from 'react';
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    Shield, CheckCircle, AlertTriangle,
    Star, Zap, Award, Headphones
} from 'lucide-react';
import { useRoleDashboard } from './RoleDashboardProvider';
import ReminderWidget from '../Reminder/ReminderWidget';
import {
    StatCard, ChartCard, SectionHeader, ActivityItem,
    Grid4, Grid2, Grid3,
    DashboardLoading, DashTooltip,
    fmtCurrency, fmtPct, chartAxisStyle, ROLE_COLORS
} from './DashboardShell';

const C = ROLE_COLORS.service;

const ServiceManagerDashboard = () => {
    const { data, loading } = useRoleDashboard();
    if (loading) return <DashboardLoading />;

    const { amcContracts = {}, tickets = {}, performance = {}, commissioning = [] } = data || {};

    const commissioningList = (commissioning || []);

    const ticketPie = [
        { name: 'Resolved', value: tickets.resolved || 0, color: '#10b981' },
        { name: 'In Progress', value: tickets.inProgress || 0, color: C.primary },
        { name: 'Open', value: tickets.open || 0, color: '#ef4444' },
    ];

    const amcData = [
        { name: 'Active', value: amcContracts.active || 0, fill: '#10b981' },
        { name: 'Expiring', value: amcContracts.expiring || 0, fill: '#f59e0b' },
        { name: 'Renewal', value: amcContracts.renewals || 0, fill: C.primary },
    ];

    const performanceMetrics = [
        { metric: 'Uptime %', value: performance.uptime || 0, accent: '#10b981', pct: performance.uptime || 0 },
        { metric: 'First Call Resolution', value: `${performance.firstCallResolution || 0}%`, accent: C.primary, pct: performance.firstCallResolution || 0 },
        { metric: 'Avg Response Time', value: `${performance.responseTime || 0}h`, accent: '#f59e0b', pct: Math.max(0, 100 - (performance.responseTime || 0) * 20) },
        { metric: 'Client Satisfaction', value: `${tickets.satisfaction || 0}/5`, accent: '#f59e0b', pct: (tickets.satisfaction || 0) * 20 },
    ];

    // Build monthly tickets chart from static fallback
    const monthlyTickets = [
        { month: 'Jan', open: 28, resolved: 22, inProgress: 8 },
        { month: 'Feb', open: 32, resolved: 28, inProgress: 6 },
        { month: 'Mar', open: 24, resolved: 30, inProgress: 5 },
        { month: 'Apr', open: 18, resolved: 26, inProgress: 7 },
        { month: 'May', open: 22, resolved: 35, inProgress: 4 },
        { month: 'Jun', open: 16, resolved: 40, inProgress: 3 },
    ];

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
                title="Service Manager Dashboard"
                subtitle="AMC contracts  . Service tickets  . Team performance  . Commissioning"
                icon={Shield}
                accent={C.primary}
                badge="Service Hub"
            />

            {/* KPIs */}
            <Grid4>
                <StatCard label="Active AMC Contracts" value={amcContracts.active || 0} icon={Shield} accent={C.primary} />
                <StatCard label="AMC Revenue" value={fmtCurrency(amcContracts.totalValue || 0)} icon={Award} accent="#10b981" trend="+6.2% YoY" trendUp />
                <StatCard label="Open Tickets" value={tickets.open || 0} icon={Headphones} accent="#ef4444" sub={`${tickets.inProgress || 0} in progress`} />
                <StatCard label="Satisfaction Score" value={`${tickets.satisfaction || 0}/5`} icon={Star} accent="#f59e0b" sub={`Resolution: ${fmtPct(performance.firstCallResolution)}`} />
            </Grid4>

            {/* Monthly tickets + Ticket pie */}
            <Grid2>
                <ChartCard 
                    title="Monthly Ticket Trend" 
                    subtitle="Open vs resolved vs in-progress"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={monthlyTickets} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="svcResolved" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="svcOpen" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="month" {...chartAxisStyle} />
                            <YAxis {...chartAxisStyle} />
                            <Tooltip content={<DashTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2.5} fill="url(#svcResolved)" />
                            <Area type="monotone" dataKey="open" name="Open" stroke="#ef4444" strokeWidth={2} fill="url(#svcOpen)" />
                            <Area type="monotone" dataKey="inProgress" name="In Progress" stroke={C.primary} strokeWidth={2} fill="none" strokeDasharray="4 3" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard 
                    title="Ticket Status Distribution" 
                    subtitle="Current service queue"
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
                            <Pie data={ticketPie} cx="50%" cy="50%" outerRadius={85} innerRadius={48}
                                dataKey="value" paddingAngle={3}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {ticketPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={<DashTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {ticketPie.map(({ name, value, color }) => (
                            <div key={name} className="text-center p-2 rounded-lg border border-[var(--border-base)]">
                                <p className="text-[16px] font-extrabold tabular-nums" style={{ color }}>{value}</p>
                                <p className="text-[9px] text-[var(--text-muted)] mt-0.5 font-bold uppercase tracking-wide leading-tight">{name}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </Grid2>

            {/* AMC + Performance + Commissioning */}
            <Grid3>
                <ChartCard 
                    title="AMC Contract Status" 
                    subtitle={`Total value: ${fmtCurrency(amcContracts.totalValue || 0)}`}
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={amcData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                            <XAxis dataKey="name" {...chartAxisStyle} />
                            <YAxis {...chartAxisStyle} />
                            <Tooltip content={<DashTooltip />} />
                            <Bar dataKey="value" name="Contracts" radius={[6, 6, 0, 0]}>
                                {amcData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 pt-3 border-t border-[var(--border-base)] flex justify-between text-[12px]">
                        <span className="text-[var(--text-muted)]">Expiring soon</span>
                        <span className="font-bold" style={{ color: '#f59e0b' }}>{amcContracts.expiring || 0} contracts</span>
                    </div>
                </ChartCard>

                <ChartCard title="Performance Metrics" subtitle="Service quality KPIs">
                    <div className="space-y-4 mt-1">
                        {performanceMetrics.map((m, i) => (
                            <div key={i} className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[12px] text-[var(--text-secondary)]">{m.metric}</span>
                                    <span className="text-[13px] font-bold tabular-nums" style={{ color: m.accent }}>{m.value}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, m.pct)}%`, backgroundColor: m.accent }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Commissioning Projects" subtitle="System handover status">
                    <div className="space-y-2 mt-1">
                        {commissioningList.map((c, i) => (
                            <div key={i} className={`p-3 rounded-xl border transition-all
                ${c.status === 'Completed' ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-[var(--border-base)]'}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">{c.project}</p>
                                    <span className="text-[11px] font-bold shrink-0" style={{
                                        color: c.status === 'Completed' ? '#10b981' : C.primary,
                                    }}>
                                        {c.status}
                                    </span>
                                </div>
                                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                                    <span>{c.date}</span>
                                    <span className="font-semibold text-[var(--text-primary)]">{c.capacity}</span>
                                </div>
                            </div>
                        ))}
                        {commissioningList.length === 0 && (
                            <p className="text-[12px] text-[var(--text-muted)] text-center py-4">No active commissioning projects</p>
                        )}
                    </div>
                </ChartCard>
            </Grid3>

            {/* Avg resolution time metric */}
            <Grid2>
                <ChartCard title="Resolution Stats" subtitle="Ticket closure performance">
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        {[
                            { l: 'Total Resolved', v: tickets.resolved || 0, c: '#10b981' },
                            { l: 'Avg Resolution', v: `${tickets.avgResolutionTime || 0}h`, c: C.primary },
                            { l: 'Repeat Issues', v: `${performance.repeatIssues || 0}%`, c: '#f59e0b' },
                            { l: 'System Uptime', v: `${performance.uptime || 0}%`, c: '#10b981' },
                        ].map(({ l, v, c }) => (
                            <div key={l} className="text-center p-4 rounded-xl border border-[var(--border-base)]">
                                <p className="text-[22px] font-extrabold tabular-nums" style={{ color: c }}>{v}</p>
                                <p className="label-muted mt-1">{l}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Recent Service Activity" subtitle="Latest ticket updates">
                    {[
                        { icon: CheckCircle, title: 'Ticket #1082 resolved: Inverter fault', meta: 'Client: Modi Textiles a "  1h response', time: '1h ago', status: 'Resolved', statusColor: '#10b981' },
                        { icon: Headphones, title: 'New AMC enquiry: Patel Residency', meta: '5-year contract a "  200kW system', time: '3h ago', status: 'New', statusColor: C.primary },
                        { icon: AlertTriangle, title: 'High priority: Grid sync failure', meta: 'Site: SolarMax Industrial a "  escalated', time: '4h ago', status: 'Urgent', statusColor: '#ef4444' },
                        { icon: Star, title: '5-star review: Green Valley Apartments', meta: 'Fast response, professional team', time: '1d ago', status: 'Review', statusColor: '#f59e0b' },
                        { icon: Zap, title: 'Commissioning completed: Rajkot 500kW', meta: 'All systems operational', time: '1d ago', status: 'Completed', statusColor: '#10b981' },
                    ].map((item, i) => (
                        <ActivityItem key={i} {...item} accent={item.statusColor} />
                    ))}
                </ChartCard>
            </Grid2>

            {/* Reminders Section */}
            <div className="mt-6">
                <ReminderWidget onNavigateToReminders={() => { }} />
            </div>
        </div>
    );
};

export default ServiceManagerDashboard;

// DesignEngineerDashboard.js "" Design Engineer role dashboard (redesigned)
import React from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
    Layers, CheckCircle, Clock, AlertCircle,
    Zap, Calculator, PenTool, Archive, TrendingUp, Award, FileText
} from 'lucide-react';
import { useRoleDashboard } from './RoleDashboardProvider';
import ReminderWidget from '../Reminder/ReminderWidget';
import {
    StatCard, ChartCard, SectionHeader, ActivityItem, ProgressRow,
    DashTable, Grid4, Grid2, Grid3,
    DashboardLoading, DashTooltip,
    fmtCurrency, fmtPct, CHART_COLORS, chartAxisStyle, ROLE_COLORS
} from './DashboardShell';

const C = ROLE_COLORS.design;

const DesignEngineerDashboard = () => {
    const { data, loading } = useRoleDashboard();
    if (loading) return <DashboardLoading />;

    const { designs = {}, boq = {}, cadApproval = {}, performance = {}, systemTypes = [] } = data || {};

    const designStatusPie = [
        { name: 'In Progress', value: designs.inProgress || 0, color: '#f59e0b' },
        { name: 'Completed', value: designs.completed || 0, color: '#10b981' },
        { name: 'Under Revision', value: designs.revision || 0, color: '#ef4444' },
        { name: 'Approved', value: designs.approved || 0, color: C.primary },
    ];

    const boqData = [
        { name: 'Generated', value: boq.generated || 0, fill: '#10b981' },
        { name: 'Pending', value: boq.pending || 0, fill: '#f59e0b' },
        { name: 'Approved', value: boq.approved || 0, fill: C.primary },
    ];

    const cadData = [
        { name: 'Approved', value: cadApproval.approved || 0, fill: '#10b981' },
        { name: 'Pending', value: cadApproval.pending || 0, fill: '#f59e0b' },
        { name: 'Rejected', value: cadApproval.rejected || 0, fill: '#ef4444' },
    ];

    const performanceData = (performance?.monthly || []).map(m => ({ ...m }));

    const systemCapacityData = (systemTypes || []).map(s => ({ ...s }));

    const radarData = [
        { metric: 'Design Speed', value: 88 },
        { metric: 'Accuracy', value: 94 },
        { metric: 'BOQ Precision', value: 90 },
        { metric: 'CAD Quality', value: 86 },
        { metric: 'Client Rating', value: Math.round((performance.clientSatisfaction || 4.5) * 20) },
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
                title="Design Engineer Dashboard"
                subtitle="System design •· BOQ generation •· CAD approval workflow"
                icon={PenTool}
                accent={C.primary}
                badge="Design Studio"
            />

            {/* KPIs */}
            <Grid4>
                <StatCard label="Total Designs" value={designs.total || 0} icon={Layers} accent={C.primary} />
                <StatCard label="CAD Approval Rate" value={fmtPct(cadApproval.approvalRate)} icon={CheckCircle} accent="#10b981" trend="+3.5% this month" trendUp />
                <StatCard label="BOQ Generated" value={boq.generated || 0} icon={Calculator} accent="#f59e0b" sub={`Avg value: ${fmtCurrency(boq.avgValue || 0)}`} />
                <StatCard label="Avg Design Time" value={`${performance.avgDesignTime || 0}d`} icon={Clock} accent={C.secondary} sub={`Revision rate: ${fmtPct(performance.revisionRate)}`} />
            </Grid4>

            {/* Design status + Performance */}
            <Grid2>
                <ChartCard 
                    title="Design Status Breakdown" 
                    subtitle="Current design portfolio"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={designStatusPie} cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                                dataKey="value" paddingAngle={3}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {designStatusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={<DashTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                        {designStatusPie.map(({ name, value, color }) => (
                            <div key={name} className="text-center p-2 rounded-lg border border-[var(--border-base)]">
                                <p className="text-[16px] font-extrabold tabular-nums" style={{ color }}>{value}</p>
                                <p className="text-[9px] text-[var(--text-muted)] mt-0.5 font-semibold uppercase tracking-wide leading-tight">{name}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Performance Radar" subtitle="Engineering quality metrics">
                    <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={radarData} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                            <PolarGrid stroke="var(--chart-grid)" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-faint)', fontSize: 9 }} />
                            <Radar name="Score" dataKey="value" stroke={C.primary} fill={C.primary} fillOpacity={0.25} strokeWidth={2} />
                            <Tooltip content={<DashTooltip formatter={(v) => `${v}%`} />} />
                        </RadarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </Grid2>

            {/* BOQ + CAD + System Types */}
            <Grid3>
                <ChartCard title="BOQ Status" subtitle="Bill of quantities pipeline">
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={boqData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                            <XAxis dataKey="name" {...chartAxisStyle} />
                            <YAxis {...chartAxisStyle} />
                            <Tooltip content={<DashTooltip />} />
                            <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                                {boqData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 pt-3 border-t border-[var(--border-base)] flex justify-between text-[11px]">
                        <span className="text-[var(--text-muted)]">Avg BOQ value</span>
                        <span className="font-bold text-[var(--text-primary)]">{fmtCurrency(boq.avgValue || 0)}</span>
                    </div>
                </ChartCard>

                <ChartCard title="CAD Approval Pipeline" subtitle={`Approval rate: ${fmtPct(cadApproval.approvalRate)}`}>
                    <div className="space-y-3 mt-1">
                        <ProgressRow label="Approved" value={cadApproval.approved || 0} max={cadApproval.submitted || 1} accent="#10b981" />
                        <ProgressRow label="Pending" value={cadApproval.pending || 0} max={cadApproval.submitted || 1} accent="#f59e0b" />
                        <ProgressRow label="Rejected" value={cadApproval.rejected || 0} max={cadApproval.submitted || 1} accent="#ef4444" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        {cadData.map(({ name, value, fill }) => (
                            <div key={name} className="p-2 rounded-xl border border-[var(--border-base)]">
                                <p className="text-[18px] font-extrabold tabular-nums" style={{ color: fill }}>{value}</p>
                                <p className="label-muted mt-0.5">{name}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="System Types" subtitle="Design capacity by category">
                    <div className="space-y-3 mt-1">
                        {(systemTypes || []).map((s, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-base)]">
                                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <div className="flex-1">
                                    <p className="text-[12.5px] font-semibold text-[var(--text-primary)]">{s.type}</p>
                                    <p className="text-[10px] text-[var(--text-muted)]">{s.count} systems •· {s.capacity} kWp total</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[14px] font-bold tabular-nums" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{s.count}</p>
                                    <p className="text-[10px] text-[var(--text-muted)]">designs</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </Grid3>

            {/* Monthly performance trend */}
            {performanceData.length > 0 && (
                <ChartCard title="Monthly Performance Trend" subtitle="Design time & efficiency tracking">
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={performanceData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="month" {...chartAxisStyle} />
                            <YAxis {...chartAxisStyle} />
                            <Tooltip content={<DashTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="efficiency" name="Efficiency %" stroke={C.primary} strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="designTime" name="Avg Days" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}

            {/* Activity */}
            <ChartCard title="Recent Activity" subtitle="Design workflow updates">
                {[
                    { icon: CheckCircle, title: 'CAD approved: Rajkot 100kW Industrial', meta: 'Client: TexTile Pvt Ltd', time: '1h ago', status: 'Approved', statusColor: '#10b981' },
                    { icon: PenTool, title: 'Design started: Surat Rooftop 50kW', meta: 'Residential system design', time: '3h ago', status: 'In Progress', statusColor: C.primary },
                    { icon: Calculator, title: 'BOQ generated: Vadodara Factory 200kW', meta: 'Total value: ₹18.5L', time: '5h ago', status: 'Sent', statusColor: '#f59e0b' },
                    { icon: AlertCircle, title: 'Revision requested: Ahmedabad Mall', meta: 'Client requested panel layout', time: '1d ago', status: 'Revision', statusColor: '#ef4444' },
                    { icon: Archive, title: 'Design archived: Gandhinagar 25kW', meta: 'Project completed & closed', time: '2d ago', status: 'Closed', statusColor: 'var(--text-muted)' },
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

export default DesignEngineerDashboard;

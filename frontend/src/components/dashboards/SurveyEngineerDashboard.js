// SurveyEngineerDashboard.js ""  Survey Engineer role dashboard (redesigned)
import React from 'react';
import {
    BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Radar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';
import {
    MapPin, Camera, FileText, CheckCircle, Clock, Sun,
    Ruler, Target, AlertTriangle
} from 'lucide-react';
import { useRoleDashboard } from './RoleDashboardProvider';
import ReminderWidget from '../Reminder/ReminderWidget';
import {
    StatCard, ChartCard, SectionHeader, ActivityItem, ProgressRow,
    DashTable, Grid4, Grid2, Grid3,
    DashboardLoading, DashTooltip,
    fmtPct, CHART_COLORS, chartAxisStyle, ROLE_COLORS
} from './DashboardShell';

const C = ROLE_COLORS.survey;

const SurveyEngineerDashboard = () => {
    const { data, loading } = useRoleDashboard();
    if (loading) return <DashboardLoading />;

    const { surveys = {}, feasibility = {}, shadowAnalysis = {} } = data || {};

    const feasibilityReports = feasibility?.reports || [];

    const surveyStatusPie = [
        { name: 'Completed', value: surveys.completed || 0, color: '#10b981' },
        { name: 'In Progress', value: surveys.inProgress || 0, color: C.primary },
        { name: 'Pending', value: surveys.pending || 0, color: '#ef4444' },
    ];

    const shadingData = [
        { type: 'Optimal', count: shadowAnalysis.optimal || 0, fill: '#10b981' },
        { type: 'Moderate', count: shadowAnalysis.moderate || 0, fill: C.primary },
        { type: 'Poor', count: shadowAnalysis.poor || 0, fill: '#ef4444' },
    ];

    const radarData = [
        { metric: 'Completion', value: surveys.completionRate || 0 },
        { metric: 'On-Time', value: 82 },
        { metric: 'Accuracy', value: 91 },
        { metric: 'Client Sat', value: 87 },
        { metric: 'Safety', value: 98 },
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
                title="Survey Engineer Dashboard"
                subtitle="Site feasibility    Shadow analysis    Field reports"
                icon={MapPin}
                accent={C.primary}
                badge="Field Mode"
            />

            {/* KPIs */}
            <Grid4>
                <StatCard label="Surveys Assigned" value={surveys.assigned || 0} icon={Ruler} accent={C.primary} />
                <StatCard label="Completed" value={surveys.completed || 0} icon={CheckCircle} accent="#10b981" trend="+3 this week" trendUp />
                <StatCard label="Completion Rate" value={fmtPct(surveys.completionRate)} icon={Target} accent={C.secondary} trend="+4.2%" trendUp />
                <StatCard label="Shadow Studies" value={shadowAnalysis.completed || 0} icon={Sun} accent="#f59e0b" sub={`Avg shading: ${shadowAnalysis.avgShading || 0}%`} />
            </Grid4>

            {/* Charts row 1 */}
            <Grid2>
                <ChartCard 
                    title="Performance Radar" 
                    subtitle="Multi-dimensional quality score"
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
                            <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-faint)', fontSize: 9 }} />
                            <Radar name="Score" dataKey="value" stroke={C.primary} fill={C.primary} fillOpacity={0.25} strokeWidth={2} />
                            <Tooltip content={<DashTooltip formatter={(v) => `${v}%`} />} />
                        </RadarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard 
                    title="Survey Status" 
                    subtitle="Current queue breakdown"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={surveyStatusPie} cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                                dataKey="value" paddingAngle={3}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {surveyStatusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={<DashTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                        {surveyStatusPie.map(({ name, value, color }) => (
                            <div key={name}>
                                <p className="text-[18px] font-extrabold tabular-nums" style={{ color }}>{value}</p>
                                <p className="label-muted mt-0.5">{name}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </Grid2>

            {/* Shadow analysis + Site metrics */}
            <Grid3>
                <ChartCard 
                    title="Shadow Analysis Results" 
                    subtitle="Site shading categories"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={shadingData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                            <XAxis dataKey="type" {...chartAxisStyle} />
                            <YAxis {...chartAxisStyle} />
                            <Tooltip content={<DashTooltip />} />
                            <Bar dataKey="count" name="Sites" radius={[6, 6, 0, 0]}>
                                {shadingData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 flex justify-between text-[11px] text-[var(--text-muted)] border-t border-[var(--border-base)] pt-3">
                        <span>Avg shading: <strong className="text-[var(--text-primary)]">{shadowAnalysis.avgShading || 0}%</strong></span>
                        <span>Total studies: <strong className="text-[var(--text-primary)]">{shadowAnalysis.completed || 0}</strong></span>
                    </div>
                </ChartCard>

                <ChartCard 
                    title="Feasibility Scores" 
                    subtitle="Recent site assessments"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <div className="space-y-3 mt-1">
                        {feasibilityReports.map((r, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">{r.site}</p>
                                    <p className="text-[10px] text-[var(--text-muted)]">{r.status}</p>
                                </div>
                                {r.feasibility != null ? (
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-20 h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${r.feasibility}%`, backgroundColor: r.feasibility >= 85 ? '#10b981' : r.feasibility >= 70 ? '#f59e0b' : '#ef4444' }} />
                                        </div>
                                        <span className="text-[11px] font-bold text-[var(--text-primary)] w-8 tabular-nums">{r.feasibility}%</span>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-[var(--text-muted)] italic">Pending</span>
                                )}
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Field Progress" subtitle="Survey pipeline stats">
                    <div className="space-y-4 mt-1">
                        <ProgressRow label="Completion Rate" value={surveys.completionRate || 0} accent={C.primary} />
                        <ProgressRow label="On-Time Rate" value={82} accent="#10b981" />
                        <ProgressRow label="Report Accuracy" value={91} accent="#8b5cf6" />
                        <ProgressRow label="Safety Score" value={98} accent="#f59e0b" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-[var(--border-base)] grid grid-cols-2 gap-3">
                        {[
                            { l: 'In Progress', v: surveys.inProgress || 0, c: C.primary },
                            { l: 'Pending', v: surveys.pending || 0, c: '#f59e0b' },
                        ].map(({ l, v, c }) => (
                            <div key={l} className="text-center p-3 rounded-xl border border-[var(--border-base)]">
                                <p className="text-[20px] font-extrabold tabular-nums" style={{ color: c }}>{v}</p>
                                <p className="label-muted mt-0.5">{l}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </Grid3>

            {/* Feasibility report table */}
            <ChartCard title="Feasibility Reports" subtitle="All site assessments">
                <DashTable
                    columns={['Site', 'Status', 'Feasibility', 'Action']}
                    rows={feasibilityReports.map(r => [
                        <span className="font-medium text-[var(--text-primary)]">{r.site}</span>,
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                            style={{
                                color: r.status === 'Completed' ? '#10b981' : r.status === 'In Progress' ? C.primary : '#f59e0b',
                                borderColor: (r.status === 'Completed' ? '#10b981' : r.status === 'In Progress' ? C.primary : '#f59e0b') + '40',
                                backgroundColor: (r.status === 'Completed' ? '#10b981' : r.status === 'In Progress' ? C.primary : '#f59e0b') + '12',
                            }}>
                            {r.status}
                        </span>,
                        r.feasibility != null
                            ? <span className="font-bold tabular-nums" style={{ color: r.feasibility >= 85 ? '#10b981' : '#f59e0b' }}>{r.feasibility}%</span>
                            : <span className="text-[var(--text-muted)] italic text-[11px]">"" </span>,
                        <button className="text-[11px] text-[var(--primary)] hover:underline">View Report</button>,
                    ])}
                />
            </ChartCard>

            {/* Activity */}
            <ChartCard title="Recent Field Activity" subtitle="Latest survey updates">
                {[
                    { icon: MapPin, title: 'Site survey completed: Rajkot Factory', meta: 'Feasibility: 92% ""  Optimal', time: '1h ago', status: 'Done', statusColor: '#10b981' },
                    { icon: Camera, title: 'Photos uploaded: Green Valley Residency', meta: '48 images    shadow analysis', time: '3h ago', status: 'Review', statusColor: C.primary },
                    { icon: AlertTriangle, title: 'Obstruction found: West Wing Complex', meta: 'Adjacent building shadows', time: '5h ago', status: 'Issue', statusColor: '#ef4444' },
                    { icon: FileText, title: 'Report submitted: Surat Commercial Hub', meta: '85% feasibility approved', time: '1d ago', status: 'Approved', statusColor: '#10b981' },
                    { icon: Clock, title: 'Survey scheduled: Vadodara Warehouse', meta: 'Tomorrow 10:00 AM', time: '1d ago', status: 'Scheduled', statusColor: '#8b5cf6' },
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

export default SurveyEngineerDashboard;

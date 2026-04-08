// StoreManagerDashboard.js Ã¢â‚¬â€ Store Manager role dashboard (redesigned)
import React from 'react';
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    Package, AlertTriangle, Truck, Archive,
    RefreshCw, ShoppingBag, Layers, ArrowUpRight
} from 'lucide-react';
import { useRoleDashboard } from './RoleDashboardProvider';
import ReminderWidget from '../Reminder/ReminderWidget';
import {
    StatCard, ChartCard, SectionHeader, ActivityItem, ProgressRow,
    Grid4, Grid2, Grid3,
    DashboardLoading, DashTooltip,
    fmtCurrency, fmtNum, CHART_COLORS, chartAxisStyle, ROLE_COLORS
} from './DashboardShell';

const C = ROLE_COLORS.store;

const StoreManagerDashboard = () => {
    const { data, loading } = useRoleDashboard();
    if (loading) return <DashboardLoading />;

    const { inventory = {}, stockAlerts = [], activity = [], usage = {} } = data || {};

    const usageData = (usage?.monthly || []).map(m => ({ ...m }));
    const alertsData = (stockAlerts || []);
    const activityData = (activity || []);

    const stockStatusPie = [
        { name: 'OK', value: (inventory.totalItems || 0) - (inventory.lowStock || 0) - (inventory.outOfStock || 0), color: '#10b981' },
        { name: 'Low Stock', value: inventory.lowStock || 0, color: '#f59e0b' },
        { name: 'Out of Stock', value: inventory.outOfStock || 0, color: '#ef4444' },
    ];

    const topItems = usage?.topItems || [];

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
                title="Store Manager Dashboard"
                subtitle="Inventory Ã‚Â· Stock alerts Ã‚Â· Warehouse movement"
                icon={Package}
                accent={C.primary}
                badge="Warehouse"
            />

            {/* KPIs */}
            <Grid4>
                <StatCard label="Total SKUs" value={fmtNum(inventory.totalItems || 0)} icon={Archive} accent={C.primary} />
                <StatCard label="Inventory Value" value={fmtCurrency(inventory.totalValue || 0)} icon={ShoppingBag} accent="#f59e0b" trend="+3.2% vs last month" trendUp />
                <StatCard label="Low Stock Alerts" value={inventory.lowStock || 0} icon={AlertTriangle} accent="#f59e0b" sub="Items below minimum" />
                <StatCard label="Out of Stock" value={inventory.outOfStock || 0} icon={Layers} accent="#ef4444" sub="Needs urgent reorder" />
            </Grid4>

            {/* Material usage + stock pie */}
            <Grid2>
                <ChartCard 
                    title="Material Flow" 
                    subtitle="Monthly inbound vs outbound (INR)"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={usageData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="storeIn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="storeOut" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="month" {...chartAxisStyle} />
                            <YAxis tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <Tooltip content={<DashTooltip formatter={(v) => fmtCurrency(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area type="monotone" dataKey="inbound" name="Inbound" stroke={C.primary} strokeWidth={2.5} fill="url(#storeIn)" />
                            <Area type="monotone" dataKey="outbound" name="Outbound" stroke="#f59e0b" strokeWidth={2} fill="url(#storeOut)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard 
                    title="Stock Health Overview" 
                    subtitle="Current inventory status"
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
                            <Pie data={stockStatusPie} cx="50%" cy="50%" outerRadius={85} innerRadius={48}
                                dataKey="value" paddingAngle={3}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {stockStatusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={<DashTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {stockStatusPie.map(({ name, value, color }) => (
                            <div key={name} className="text-center p-2 rounded-lg border border-[var(--border-base)]">
                                <p className="text-[16px] font-extrabold tabular-nums" style={{ color }}>{value}</p>
                                <p className="text-[9px] text-[var(--text-muted)] mt-0.5 font-bold uppercase tracking-wide leading-tight">{name}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </Grid2>

            {/* Stock alerts + Top items + Activity */}
            <Grid3>
                <ChartCard title="Stock Alerts" subtitle="Items needing attention">
                    <div className="space-y-2 mt-1">
                        {alertsData.map((a, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                ${a.status === 'out' ? 'border-red-500/30 bg-red-500/5' : a.status === 'low' ? 'border-amber-500/30 bg-amber-500/5' : 'border-[var(--border-base)]'}`}>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">{a.item}</p>
                                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Min: {a.minimum} units</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[16px] font-extrabold tabular-nums" style={{
                                        color: a.status === 'out' ? '#ef4444' : a.status === 'low' ? '#f59e0b' : '#10b981'
                                    }}>{a.current}</p>
                                    <p className="text-[9px] font-bold uppercase" style={{
                                        color: a.status === 'out' ? '#ef4444' : a.status === 'low' ? '#f59e0b' : '#10b981'
                                    }}>{a.status === 'out' ? 'OUT' : a.status === 'low' ? 'LOW' : 'OK'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Top Moving Items" subtitle="High-demand materials">
                    <div className="space-y-3 mt-1">
                        {topItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '20', color: CHART_COLORS[i % CHART_COLORS.length] }}>
                                    #{i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-medium text-[var(--text-primary)] truncate">{item.item}</p>
                                    <ProgressRow label="" value={item.usage} accent={CHART_COLORS[i % CHART_COLORS.length]} showBar />
                                </div>
                                <span className="text-[11px] font-bold shrink-0"
                                    style={{ color: item.trend?.startsWith('+') ? '#10b981' : '#ef4444' }}>
                                    {item.trend}
                                </span>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Recent Transactions" subtitle="Inbound / outbound / transfers">
                    <div className="space-y-1 mt-1">
                        {activityData.map((a, i) => (
                            <ActivityItem
                                key={i}
                                icon={a.type === 'Inbound' ? ArrowUpRight : a.type === 'Transfer' ? RefreshCw : Truck}
                                accent={a.type === 'Inbound' ? '#10b981' : a.type === 'Transfer' ? C.primary : '#f59e0b'}
                                title={`${a.type}: ${a.item}`}
                                meta={`Qty: ${a.quantity} units`}
                                time={a.date}
                                status={a.type}
                                statusColor={a.type === 'Inbound' ? '#10b981' : a.type === 'Transfer' ? C.primary : '#f59e0b'}
                            />
                        ))}
                    </div>
                </ChartCard>
            </Grid3>

            {/* Item usage bar chart */}
            {topItems.length > 0 && (
                <ChartCard title="Top Item Usage" subtitle="Units issued this quarter">
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={topItems} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                            <XAxis dataKey="item" {...chartAxisStyle} />
                            <YAxis {...chartAxisStyle} />
                            <Tooltip content={<DashTooltip />} />
                            <Bar dataKey="usage" name="Usage %" radius={[6, 6, 0, 0]}>
                                {topItems.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}
            {/* Reminders Section */}
            <div className="mt-6">
                <ReminderWidget onNavigateToReminders={() => { }} />
            </div>
        </div>
    );
};

export default StoreManagerDashboard;

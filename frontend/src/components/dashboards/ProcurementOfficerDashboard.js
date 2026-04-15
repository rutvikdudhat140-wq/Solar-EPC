// ProcurementOfficerDashboard.js ""  Procurement Officer role dashboard (redesigned)
import React from 'react';
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    ShoppingCart, Truck, CheckCircle, Clock, DollarSign,
    Star, TrendingDown, Package, AlertTriangle, BarChart3
} from 'lucide-react';
import { useRoleDashboard } from './RoleDashboardProvider';
import ReminderWidget from '../Reminder/ReminderWidget';
import {
    StatCard, ChartCard, SectionHeader, ActivityItem, ProgressRow,
    DashTable, Grid4, Grid2, Grid3,
    DashboardLoading, DashTooltip,
    fmtCurrency, fmtPct, CHART_COLORS, chartAxisStyle, ROLE_COLORS
} from './DashboardShell';

const C = ROLE_COLORS.procurement;

const ProcurementOfficerDashboard = () => {
    const { data, loading } = useRoleDashboard();
    if (loading) return <DashboardLoading />;

    const { purchaseOrders = {}, vendors = [], logistics = {}, costAnalysis = {} } = data || {};

    const costData = (costAnalysis?.categories || []).map(c => ({ ...c }));
    const monthlyData = (costAnalysis?.monthly || []).map(m => ({ ...m }));
    const topVendors = (vendors || []).slice(0, 5);

    const poStatusPie = [
        { name: 'Delivered', value: purchaseOrders.delivered || 0, color: '#10b981' },
        { name: 'Approved', value: (purchaseOrders.approved || 0) - (purchaseOrders.delivered || 0), color: C.primary },
        { name: 'Pending', value: purchaseOrders.pending || 0, color: '#f59e0b' },
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
                title="Procurement Officer Dashboard"
                subtitle="Purchase orders    Vendor management    Cost optimization"
                icon={ShoppingCart}
                accent={C.primary}
                badge="Procurement Hub"
            />

            {/* KPIs */}
            <Grid4>
                <StatCard label="Total POs" value={purchaseOrders.total || 0} icon={ShoppingCart} accent={C.primary} />
                <StatCard label="PO Value" value={fmtCurrency(purchaseOrders.totalValue || 0)} icon={DollarSign} accent="#f59e0b" />
                <StatCard label="Savings Achieved" value={fmtCurrency(costAnalysis.savingsAchieved || 0)} icon={TrendingDown} accent="#10b981" trend="vs budget" trendUp />
                <StatCard label="In Transit" value={logistics.inTransit || 0} icon={Truck} accent={C.secondary} sub={`${logistics.delayed || 0} delayed`} />
            </Grid4>

            {/* Cost analysis + PO status */}
            <Grid2>
                <ChartCard 
                    title="Monthly Cost Analysis" 
                    subtitle="Budget vs actual spend (INR)"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="procBudget" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="procActual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="month" {...chartAxisStyle} />
                            <YAxis tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <Tooltip content={<DashTooltip formatter={(v) => fmtCurrency(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area type="monotone" dataKey="budget" name="Budget" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={2} fill="url(#procBudget)" />
                            <Area type="monotone" dataKey="actual" name="Actual" stroke={C.primary} strokeWidth={2.5} fill="url(#procActual)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard 
                    title="PO Status Distribution" 
                    subtitle="Purchase order pipeline"
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
                            <Pie data={poStatusPie} cx="50%" cy="50%" outerRadius={85} innerRadius={48}
                                dataKey="value" paddingAngle={3}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {poStatusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={<DashTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {poStatusPie.map(({ name, value, color }) => (
                            <div key={name} className="text-center p-2 rounded-lg border border-[var(--border-base)]">
                                <p className="text-[16px] font-extrabold tabular-nums" style={{ color }}>{value}</p>
                                <p className="text-[9px] text-[var(--text-muted)] mt-0.5 font-bold uppercase tracking-wide leading-tight">{name}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </Grid2>

            {/* Vendors + Category budget + Logistics */}
            <Grid3>
                <ChartCard 
                    title="Top Vendors" 
                    subtitle="Performance ratings"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <div className="space-y-2 mt-1">
                        {topVendors.map((v, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-base)] hover:border-[var(--border-active)] transition-all">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '20', color: CHART_COLORS[i % CHART_COLORS.length] }}>
                                    #{i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">{v.name}</p>
                                    <p className="text-[10px] text-[var(--text-muted)]">{v.orders} orders    {v.onTime}% on-time</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Star size={11} style={{ color: '#f59e0b' }} />
                                    <span className="text-[12px] font-bold text-[var(--text-primary)]">{v.rating}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard 
                    title="Category Budget vs Actual" 
                    subtitle="Cost variance by category"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={costData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                            <XAxis dataKey="category" {...chartAxisStyle} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                            <YAxis tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <Tooltip content={<DashTooltip formatter={(v) => fmtCurrency(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="budget" name="Budget" fill="#f59e0b" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="actual" name="Actual" fill={C.primary} fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard 
                    title="Logistics Status" 
                    subtitle="Delivery performance"
                    headerRight={
                        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <div className="space-y-3 mt-1">
                        {[
                            { label: 'Delivered', value: logistics.delivered || 0, color: '#10b981' },
                            { label: 'In Transit', value: logistics.inTransit || 0, color: C.primary },
                            { label: 'Delayed', value: logistics.delayed || 0, color: '#ef4444' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-base)]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
                                </div>
                                <span className="text-[18px] font-extrabold tabular-nums" style={{ color }}>{value}</span>
                            </div>
                        ))}
                        <div className="mt-2 pt-2 border-t border-[var(--border-base)] flex justify-between text-[12px]">
                            <span className="text-[var(--text-muted)]">Avg delivery time</span>
                            <span className="font-bold text-[var(--text-primary)]">{logistics.avgDeliveryTime || 0} days</span>
                        </div>
                    </div>
                    <div className="mt-3 p-3 rounded-xl border border-[var(--border-base)] bg-[var(--bg-raised)]">
                        <ProgressRow label="Negotiation Success" value={costAnalysis.negotiationSuccess || 0} accent="#10b981" />
                    </div>
                </ChartCard>
            </Grid3>

            {/* Vendor table */}
            <ChartCard title="Vendor Performance Summary" subtitle="All registered suppliers">
                <DashTable
                    columns={['Vendor', 'Orders', 'On-Time %', 'Rating', 'Status']}
                    rows={topVendors.map(v => [
                        <span className="font-medium text-[var(--text-primary)]">{v.name}</span>,
                        <span className="font-bold tabular-nums">{v.orders}</span>,
                        <span className="font-bold tabular-nums" style={{ color: v.onTime >= 95 ? '#10b981' : v.onTime >= 85 ? '#f59e0b' : '#ef4444' }}>{v.onTime}%</span>,
                        <div className="flex items-center gap-1">
                            <Star size={11} style={{ color: '#f59e0b' }} />
                            <span className="font-bold">{v.rating}</span>
                        </div>,
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                            style={{ color: '#10b981', borderColor: '#10b98140', backgroundColor: '#10b98112' }}>Active</span>,
                    ])}
                />
            </ChartCard>

            {/* Reminders Section */}
            <div className="mt-6">
                <ReminderWidget onNavigateToReminders={() => { }} />
            </div>
        </div>
    );
};

export default ProcurementOfficerDashboard;

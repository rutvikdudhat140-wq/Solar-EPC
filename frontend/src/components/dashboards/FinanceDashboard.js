// FinanceDashboard.js — Finance role dashboard (redesigned)
import React, { useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    ComposedChart, RadialBarChart, RadialBar, ScatterChart, Scatter
} from 'recharts';
import {
    DollarSign, TrendingUp, TrendingDown, FileText, CheckCircle,
    AlertTriangle, Clock, Shield, BarChart3, ArrowUpRight, Target,
    Calculator, Layers, Activity, PieChart as PieChartIcon, Zap
} from 'lucide-react';
import { getPaidAmount } from '../../lib/financeApi';
import { useRoleDashboard } from './RoleDashboardProvider';
import ReminderWidget from '../Reminder/ReminderWidget';
import {
    StatCard, ChartCard, SectionHeader, ActivityItem, ProgressRow,
    DashTable, Grid4, Grid2, Grid3,
    DashboardLoading, DashTooltip,
    fmtCurrency, fmtPct, CHART_COLORS, chartAxisStyle, ROLE_COLORS
} from './DashboardShell';

const C = ROLE_COLORS.finance;

const FinanceDashboard = ({ 
    isOpen, 
    onClose, 
    dashboardStats,
    payables = [],
    invoices = [],
    payments = [],
    manualAdjustments = [],
    monthlyRevenue = [],
    cashFlow = [],
    totalCollected = 0,
    manualBalance = 0,
    cashPosition = 0,
    transactionAnalytics = null,
    adjustmentTrend = [],
    calendarFilterYear = new Date().getFullYear().toString(),
    calendarFilterMonth,
    calendarFilterDay
}) => {
    // Calculate cashFlow from filtered invoices - MUST match totalCollected exactly
    const cashFlowData = useMemo(() => {
        if (!invoices || !Array.isArray(invoices) || invoices.length === 0) return [];
        
        // Filter invoices by calendar (MUST match exactly what totalCollected uses)
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = now.getMonth();
        
        const filteredInvoices = invoices.filter(inv => {
            const invDate = new Date(inv.invoiceDate || inv.createdAt);
            
            if (calendarFilterYear === 'all') return true;
            if (invDate.getFullYear().toString() !== calendarFilterYear) return false;
            if (calendarFilterMonth !== undefined && invDate.getMonth() !== calendarFilterMonth) return false;
            if (calendarFilterDay !== undefined && invDate.getDate() !== calendarFilterDay) return false;
            
            return true;
        });
        
        console.log('📊 CashFlow Filter:', { 
            calendarFilterYear, 
            calendarFilterMonth, 
            invoiceCount: filteredInvoices.length,
            totalInvoices: invoices.length 
        });
        
        // Group by month and calculate inflow
        const monthlyMap = new Map();
        let calculatedTotal = 0;
        
        filteredInvoices.forEach(inv => {
            const invDate = new Date(inv.invoiceDate || inv.createdAt);
            const monthKey = invDate.toLocaleString('default', { month: 'short' });
            
            if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, { month: monthKey, inflow: 0, outflow: 0, net: 0 });
            }
            
            const monthData = monthlyMap.get(monthKey);
            const paidAmount = getPaidAmount(inv, manualAdjustments);
            calculatedTotal += paidAmount;
            monthData.inflow += paidAmount;
            monthData.net = monthData.inflow - monthData.outflow;
            
            console.log('  Invoice:', inv.id || inv._id, '| Amount:', paidAmount, '| Month:', monthKey);
        });
        
        console.log('💰 CashFlow Calculated Total:', calculatedTotal);
        console.log('🎯 Expected Total (totalCollected prop):', totalCollected);
        console.log('📊 Difference:', calculatedTotal - totalCollected);
        
        return Array.from(monthlyMap.values());
    }, [invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay, totalCollected]);

    const invoiceStatusPie = [
        { name: 'Paid', value: invoices.paid || 0, color: '#10b981' },
        { name: 'Pending', value: invoices.pending || 0, color: '#f59e0b' },
        { name: 'Overdue', value: invoices.overdue || 0, color: '#ef4444' },
    ];

    const arData = [
        { name: 'Current', value: receivables.current || 0, fill: '#10b981' },
        { name: 'Overdue', value: receivables.overdue || 0, fill: '#ef4444' },
    ];

    const apData = [
        { name: 'Current', value: payables.current || 0, fill: '#10b981' },
        { name: 'Overdue', value: payables.overdue || 0, fill: '#ef4444' },
        { name: 'Upcoming', value: payables.upcoming || 0, fill: '#f59e0b' },
    ];

    // Advanced chart data
    const profitTrendData = [
        { month: 'Oct', gross: 2800000, net: 1400000, margin: 50 },
        { month: 'Nov', gross: 3200000, net: 1760000, margin: 55 },
        { month: 'Dec', gross: 4100000, net: 2460000, margin: 60 },
        { month: 'Jan', gross: 3800000, net: 2090000, margin: 55 },
        { month: 'Feb', gross: 4500000, net: 2700000, margin: 60 },
        { month: 'Mar', gross: 5200000, net: 3380000, margin: 65 },
    ];

    const budgetVarianceData = [
        { department: 'Sales', budgeted: 1200000, actual: 1150000, variance: -50000 },
        { department: 'Operations', budgeted: 2800000, actual: 3100000, variance: 300000 },
        { department: 'Marketing', budgeted: 800000, actual: 750000, variance: -50000 },
        { department: 'R&D', budgeted: 600000, actual: 680000, variance: 80000 },
        { department: 'Admin', budgeted: 400000, actual: 420000, variance: 20000 },
    ];

    const financialRatiosData = [
        { ratio: 'Current Ratio', value: 1.85, target: 2.0, status: 'warning' },
        { ratio: 'Quick Ratio', value: 1.32, target: 1.0, status: 'good' },
        { ratio: 'Debt-to-Equity', value: 0.45, target: 0.5, status: 'good' },
        { ratio: 'ROE', value: 18.5, target: 15.0, status: 'excellent' },
        { ratio: 'ROA', value: 12.8, target: 10.0, status: 'excellent' },
        { ratio: 'Gross Margin', value: 62.3, target: 60.0, status: 'excellent' },
    ];

    const expenseHeatmapData = [
        { category: 'Materials', Q1: 1800000, Q2: 2100000, Q3: 2400000, Q4: 2200000 },
        { category: 'Labor', Q1: 950000, Q2: 1050000, Q3: 1150000, Q4: 1100000 },
        { category: 'Utilities', Q1: 180000, Q2: 220000, Q3: 280000, Q4: 240000 },
        { category: 'Marketing', Q1: 320000, Q2: 280000, Q3: 340000, Q4: 380000 },
        { category: 'Admin', Q1: 150000, Q2: 160000, Q3: 170000, Q4: 165000 },
    ];

    const cashFlowForecastData = [
        { month: 'Mar', historical: 3380000, forecast: null, confidence: null },
        { month: 'Apr', historical: null, forecast: 3850000, confidence: 85 },
        { month: 'May', historical: null, forecast: 4200000, confidence: 78 },
        { month: 'Jun', historical: null, forecast: 4600000, confidence: 72 },
        { month: 'Jul', historical: null, forecast: 5100000, confidence: 68 },
        { month: 'Aug', historical: null, forecast: 5400000, confidence: 60 },
    ];

    const liquidityAnalysisData = [
        { name: 'Cash', value: 2800000, fill: '#10b981' },
        { name: 'Short-term Investments', value: 1200000, fill: '#3b82f6' },
        { name: 'Accounts Receivable', value: 3400000, fill: '#f59e0b' },
        { name: 'Inventory', value: 1800000, fill: '#8b5cf6' },
    ];

    const revenueCompositionData = [
        { segment: 'Residential Solar', revenue: 18500000, percentage: 45, growth: 12.5 },
        { segment: 'Commercial Solar', revenue: 14800000, percentage: 36, growth: 18.2 },
        { segment: 'Industrial Solar', revenue: 6200000, percentage: 15, growth: 22.8 },
        { segment: 'Maintenance', revenue: 1640000, percentage: 4, growth: 8.5 },
    ];

    return (
        <div className="space-y-6 p-6">
            {/* Global Date Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600">Filter by Date:</span>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        {['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'All Time', 'Custom Range'].map((filter) => (
                            <button 
                                key={filter} 
                                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                                    filter === 'All Time' 
                                        ? 'bg-orange-500 text-white' 
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
                <span className="text-sm text-gray-500">Showing All Data</span>
            </div>

            <SectionHeader
                title="Finance Dashboard"
                subtitle="Cash flow · Invoicing · Payables · Compliance"
                icon={DollarSign}
                accent={C.primary}
                badge="Financial Hub"
            />

            {/* KPIs */}
            <Grid4>
                <StatCard label="Invoice Value" value={fmtCurrency(invoices.totalValue || 0)} icon={FileText} accent={C.primary} />
                <StatCard label="Cash Inflow (Proj)" value={fmtCurrency(cashFlow.projected || 0)} icon={TrendingUp} accent="#10b981" trend="+9.2% MoM" trendUp />
                <StatCard label="Overdue Invoices" value={invoices.overdue || 0} icon={AlertTriangle} accent="#ef4444" sub="Needs follow-up" />
                <StatCard label="Collection Rate" value={fmtPct(receivables.collections)} icon={CheckCircle} accent={C.secondary} trend="+1.5% this month" trendUp />
            </Grid4>

            {/* Advanced Financial KPIs */}
            <Grid4>
                <StatCard label="Net Profit Margin" value="62.3%" icon={Target} accent="#10b981" trend="+2.1% YoY" trendUp />
                <StatCard label="Return on Equity" value="18.5%" icon={Calculator} accent="#3b82f6" trend="+0.8% QoQ" trendUp />
                <StatCard label="Current Ratio" value="1.85" icon={Layers} accent="#f59e0b" sub="Liquidity health" />
                <StatCard label="EBITDA" value={fmtCurrency(8750000)} icon={Activity} accent="#8b5cf6" trend="+15.2% YoY" trendUp />
            </Grid4>

            {/* Cash flow chart + Invoice pie */}
            <Grid2>
                <ChartCard 
                    title="Cash Flow Analysis" 
                    subtitle="Monthly inflow vs outflow vs net (INR)"
                    headerRight={
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={cashFlowData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="finIn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="finOut" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="finNet" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="month" {...chartAxisStyle} />
                            <YAxis tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <Tooltip content={<DashTooltip formatter={(v) => fmtCurrency(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area type="monotone" dataKey="inflow" name="Inflow" stroke={C.primary} strokeWidth={2.5} fill="url(#finIn)" />
                            <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#ef4444" strokeWidth={2} fill="url(#finOut)" />
                            <Area type="monotone" dataKey="net" name="Net" stroke="#f59e0b" strokeWidth={2} fill="url(#finNet)" strokeDasharray="4 3" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard 
                    title="Invoice Status" 
                    subtitle="Billing portfolio breakdown"
                    headerRight={
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={210}>
                        <PieChart>
                            <Pie data={invoiceStatusPie} cx="50%" cy="50%" outerRadius={85} innerRadius={48}
                                dataKey="value" paddingAngle={3}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {invoiceStatusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={<DashTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {invoiceStatusPie.map(({ name, value, color }) => (
                            <div key={name} className="text-center p-2 rounded-lg border border-[var(--border-base)]">
                                <p className="text-[16px] font-extrabold tabular-nums" style={{ color }}>{value}</p>
                                <p className="text-[9px] text-[var(--text-muted)] mt-0.5 font-bold uppercase tracking-wide leading-tight">{name}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </Grid2>

            {/* AR + AP + Compliance */}
            <Grid3>
                <ChartCard 
                    title="Accounts Receivable" 
                    subtitle="Outstanding collections"
                    headerRight={
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={arData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                            <XAxis dataKey="name" {...chartAxisStyle} />
                            <YAxis tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <Tooltip content={<DashTooltip formatter={(v) => fmtCurrency(v)} />} />
                            <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
                                {arData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 pt-3 border-t border-[var(--border-base)] flex justify-between text-[12px]">
                        <span className="text-[var(--text-muted)]">Collection Rate</span>
                        <span className="font-bold" style={{ color: '#10b981' }}>{fmtPct(receivables.collections)}</span>
                    </div>
                </ChartCard>

                <ChartCard 
                    title="Accounts Payable" 
                    subtitle="Vendor payment obligations"
                    headerRight={
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <div className="space-y-3 mt-1">
                        {apData.map((a) => (
                            <div key={a.name} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-base)]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.fill }} />
                                    <span className="text-[12px] text-[var(--text-secondary)]">{a.name}</span>
                                </div>
                                <span className="text-[15px] font-extrabold tabular-nums" style={{ color: a.fill }}>{fmtCurrency(a.value)}</span>
                            </div>
                        ))}
                    </div>
                    <ProgressRow
                        className="mt-3"
                        label="Budget variance"
                        value={Math.abs(cashFlow.projected - cashFlow.actual || 0) / (cashFlow.projected || 1) * 100}
                        accent={C.primary}
                    />
                </ChartCard>

                <ChartCard 
                    title="Compliance Status" 
                    subtitle="GST · TDS · Audit filings"
                    headerRight={
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <div className="space-y-3 mt-1">
                        {[
                            { label: 'GST Returns Filed', v: compliance?.gstReturns?.filed || 0, total: (compliance?.gstReturns?.filed || 0) + (compliance?.gstReturns?.pending || 0), pending: compliance?.gstReturns?.pending || 0, color: '#10b981' },
                            { label: 'TDS Returns Filed', v: compliance?.tdsReturns?.filed || 0, total: (compliance?.tdsReturns?.filed || 0) + (compliance?.tdsReturns?.pending || 0), pending: compliance?.tdsReturns?.pending || 0, color: '#10b981' },
                        ].map(({ label, v, total, pending, color }) => (
                            <div key={label} className="p-3 rounded-xl border border-[var(--border-base)]">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</span>
                                    <span className="text-[12px] font-bold text-[var(--text-primary)] tabular-nums">{v}/{total}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: total ? `${(v / total) * 100}%` : '100%', backgroundColor: pending > 0 ? '#f59e0b' : color }} />
                                </div>
                                {pending > 0 && <p className="text-[10px] text-amber-400 mt-1">{pending} pending</p>}
                            </div>
                        ))}
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-base)]">
                            <Shield size={16} style={{ color: compliance?.auditStatus === 'Completed' ? '#10b981' : '#f59e0b' }} />
                            <div className="flex-1">
                                <p className="text-[12px] font-medium text-[var(--text-secondary)]">Audit Status</p>
                                <p className="text-[11px] font-bold" style={{ color: compliance?.auditStatus === 'Completed' ? '#10b981' : '#f59e0b' }}>
                                    {compliance?.auditStatus || 'Unknown'}
                                </p>
                            </div>
                        </div>
                    </div>
                </ChartCard>
            </Grid3>

            {/* Profit & Loss Trend Analysis */}
            <Grid2>
                <ChartCard 
                    title="Profit & Margin Trends" 
                    subtitle="Monthly gross vs net profit with margin %"
                    headerRight={
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={profitTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="month" {...chartAxisStyle} />
                            <YAxis yAxisId="profit" orientation="left" tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <YAxis yAxisId="margin" orientation="right" tickFormatter={(v) => `${v}%`} {...chartAxisStyle} width={40} />
                            <Tooltip content={<DashTooltip formatter={(v, name) => name === 'margin' ? `${v}%` : fmtCurrency(v)} />} />
                            <Legend />
                            <Area yAxisId="profit" type="monotone" dataKey="gross" name="Gross Profit" stroke="#3b82f6" strokeWidth={2} fill="url(#grossGradient)" />
                            <Area yAxisId="profit" type="monotone" dataKey="net" name="Net Profit" stroke="#10b981" strokeWidth={2} fill="url(#netGradient)" />
                            <Line yAxisId="margin" type="monotone" dataKey="margin" name="Margin %" stroke="#f59e0b" strokeWidth={3} strokeDasharray="4 4" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard 
                    title="Budget vs Actual Analysis" 
                    subtitle="Department-wise variance tracking"
                    headerRight={
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all">{filter}</button>
                            ))}
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={budgetVarianceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="department" {...chartAxisStyle} />
                            <YAxis yAxisId="amount" orientation="left" tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <YAxis yAxisId="variance" orientation="right" tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <Tooltip content={<DashTooltip formatter={fmtCurrency} />} />
                            <Legend />
                            <Bar yAxisId="amount" dataKey="budgeted" name="Budgeted" fill="#94a3b8" fillOpacity={0.7} />
                            <Bar yAxisId="amount" dataKey="actual" name="Actual" fill="#3b82f6" />
                            <Line yAxisId="variance" type="monotone" dataKey="variance" name="Variance" stroke="#ef4444" strokeWidth={3} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartCard>
            </Grid2>

            {/* Financial Ratios & Liquidity Analysis */}
            <Grid2>
                <ChartCard title="Key Financial Ratios" subtitle="Performance vs target benchmarks">
                    <div className="space-y-3">
                        {financialRatiosData.map((ratio) => {
                            const achievement = (ratio.value / ratio.target) * 100;
                            const statusColor =
                                ratio.status === 'excellent' ? '#10b981' :
                                    ratio.status === 'good' ? '#3b82f6' :
                                        ratio.status === 'warning' ? '#f59e0b' : '#ef4444';

                            return (
                                <div key={ratio.ratio} className="p-3 rounded-xl border border-[var(--border-base)]">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[13px] font-medium text-[var(--text-secondary)]">{ratio.ratio}</span>
                                        <div className="text-right">
                                            <span className="text-[15px] font-bold tabular-nums" style={{ color: statusColor }}>
                                                {ratio.ratio.includes('Ratio') || ratio.ratio.includes('ROE') || ratio.ratio.includes('ROA') || ratio.ratio.includes('Margin') ?
                                                    `${ratio.value}${ratio.ratio.includes('Margin') || ratio.ratio.includes('ROE') || ratio.ratio.includes('ROA') ? '%' : ''}` :
                                                    ratio.value}
                                            </span>
                                            <span className="text-[11px] text-[var(--text-muted)] ml-1">/ {ratio.target}{ratio.ratio.includes('Margin') || ratio.ratio.includes('ROE') || ratio.ratio.includes('ROA') ? '%' : ''}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(achievement, 100)}%`,
                                                backgroundColor: statusColor,
                                                boxShadow: achievement > 100 ? `0 0 8px ${statusColor}40` : 'none'
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-[var(--text-muted)]">Target: {ratio.target}{ratio.ratio.includes('Margin') || ratio.ratio.includes('ROE') || ratio.ratio.includes('ROA') ? '%' : ''}</span>
                                        <span className="text-[10px] font-semibold" style={{ color: statusColor }}>
                                            {achievement.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ChartCard>

                <ChartCard title="Liquidity Analysis" subtitle="Current asset composition">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={liquidityAnalysisData}
                                cx="50%" cy="50%"
                                outerRadius={80}
                                innerRadius={45}
                                dataKey="value"
                                paddingAngle={2}
                                label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}
                                labelLine={false}
                            >
                                {liquidityAnalysisData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<DashTooltip formatter={fmtCurrency} />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        {liquidityAnalysisData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border-base)]">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-[var(--text-muted)] truncate">{item.name}</p>
                                    <p className="text-[13px] font-bold tabular-nums" style={{ color: item.fill }}>{fmtCurrency(item.value)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </Grid2>

            {/* Revenue Composition & Cash Flow Forecast */}
            <Grid2>
                <ChartCard title="Revenue Composition & Growth" subtitle="Segment-wise performance analysis">
                    <div className="space-y-3">
                        {revenueCompositionData.map((segment, index) => (
                            <div key={segment.segment} className="p-3 rounded-xl border border-[var(--border-base)]">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[12px] font-medium text-[var(--text-secondary)]">{segment.segment}</span>
                                    <div className="text-right">
                                        <span className="text-[14px] font-bold tabular-nums text-[var(--text-primary)]">{fmtCurrency(segment.revenue)}</span>
                                        <span className="text-[11px] text-[var(--text-muted)] ml-2">({segment.percentage}%)</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 h-2 rounded-full bg-[var(--bg-overlay)] overflow-hidden mr-3">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${segment.percentage}%`,
                                                backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <TrendingUp size={12} className="text-green-500" />
                                        <span className="text-[11px] font-semibold text-green-500">{segment.growth}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Cash Flow Forecast" subtitle="6-month projection with confidence intervals">
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={cashFlowForecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="month" {...chartAxisStyle} />
                            <YAxis yAxisId="cashflow" orientation="left" tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <YAxis yAxisId="confidence" orientation="right" tickFormatter={(v) => `${v}%`} {...chartAxisStyle} width={40} />
                            <Tooltip content={<DashTooltip formatter={(v, name) => name === 'confidence' ? `${v}%` : fmtCurrency(v)} />} />
                            <Legend />
                            <Area yAxisId="cashflow" type="monotone" dataKey="historical" name="Historical" stroke="#10b981" strokeWidth={2} fill="url(#historicalGradient)" connectNulls={false} />
                            <Area yAxisId="cashflow" type="monotone" dataKey="forecast" name="Forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" fill="url(#forecastGradient)" connectNulls={false} />
                            <Line yAxisId="confidence" type="monotone" dataKey="confidence" name="Confidence %" stroke="#f59e0b" strokeWidth={2} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartCard>
            </Grid2>

            {/* Expense Heatmap & Advanced Metrics */}
            <Grid2>
                <ChartCard title="Quarterly Expense Heatmap" subtitle="Spending patterns across quarters">
                    <div className="space-y-2">
                        {expenseHeatmapData.map((expense) => (
                            <div key={expense.category} className="flex items-center gap-2">
                                <div className="w-20 text-[11px] font-medium text-[var(--text-secondary)]">{expense.category}</div>
                                <div className="flex-1 flex gap-1">
                                    {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => {
                                        const value = expense[quarter];
                                        const maxValue = Math.max(...expenseHeatmapData.flatMap(e => [e.Q1, e.Q2, e.Q3, e.Q4]));
                                        const intensity = value / maxValue;
                                        return (
                                            <div
                                                key={quarter}
                                                className="flex-1 h-8 rounded flex items-center justify-center relative group"
                                                style={{
                                                    backgroundColor: `rgba(239, 68, 68, ${intensity * 0.8 + 0.1})`,
                                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                                }}
                                            >
                                                <span className="text-[10px] font-bold text-white drop-shadow-sm">{quarter}</span>
                                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                                    {fmtCurrency(value)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="w-16 text-right">
                                    <span className="text-[11px] font-bold tabular-nums text-[var(--text-primary)]">
                                        {fmtCurrency(expense.Q1 + expense.Q2 + expense.Q3 + expense.Q4)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-[var(--border-base)]">
                        <span className="text-[11px] text-[var(--text-muted)]">Intensity Scale</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] text-[var(--text-muted)]">Low</span>
                            <div className="w-12 h-2 rounded" style={{ background: 'linear-gradient(to right, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.9))' }} />
                            <span className="text-[9px] text-[var(--text-muted)]">High</span>
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="Advanced Financial Metrics" subtitle="Real-time performance indicators">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl border border-[var(--border-base)] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={16} className="text-blue-600" />
                                <span className="text-[12px] font-medium text-blue-700 dark:text-blue-300">EBITDA Margin</span>
                            </div>
                            <p className="text-[20px] font-extrabold text-blue-700 dark:text-blue-200 tabular-nums">28.4%</p>
                            <p className="text-[10px] text-blue-600 dark:text-blue-400">+3.2% vs last quarter</p>
                        </div>

                        <div className="p-3 rounded-xl border border-[var(--border-base)] bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Target size={16} className="text-green-600" />
                                <span className="text-[12px] font-medium text-green-700 dark:text-green-300">Working Capital</span>
                            </div>
                            <p className="text-[18px] font-extrabold text-green-700 dark:text-green-200 tabular-nums">{fmtCurrency(5200000)}</p>
                            <p className="text-[10px] text-green-600 dark:text-green-400">Optimal range</p>
                        </div>

                        <div className="p-3 rounded-xl border border-[var(--border-base)] bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10">
                            <div className="flex items-center gap-2 mb-2">
                                <PieChartIcon size={16} className="text-purple-600" />
                                <span className="text-[12px] font-medium text-purple-700 dark:text-purple-300">Asset Turnover</span>
                            </div>
                            <p className="text-[20px] font-extrabold text-purple-700 dark:text-purple-200 tabular-nums">1.42x</p>
                            <p className="text-[10px] text-purple-600 dark:text-purple-400">Efficient utilization</p>
                        </div>

                        <div className="p-3 rounded-xl border border-[var(--border-base)] bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 size={16} className="text-orange-600" />
                                <span className="text-[12px] font-medium text-orange-700 dark:text-orange-300">Interest Cover</span>
                            </div>
                            <p className="text-[20px] font-extrabold text-orange-700 dark:text-orange-200 tabular-nums">12.8x</p>
                            <p className="text-[10px] text-orange-600 dark:text-orange-400">Strong coverage</p>
                        </div>
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-300">Financial Health Score</span>
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-2 rounded-full bg-indigo-200 dark:bg-indigo-800 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: '87%' }} />
                                </div>
                                <span className="text-[14px] font-bold text-indigo-700 dark:text-indigo-200">87/100</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">Excellent - All key metrics performing above benchmarks</p>
                    </div>
                </ChartCard>
            </Grid2>

            {/* Cash flow summary table */}
            <ChartCard title="Cash Flow Summary" subtitle="Month-by-month breakdown">
                <DashTable
                    columns={['Month', 'Inflow', 'Outflow', 'Net', 'Status']}
                    rows={cashFlowData.map(m => [
                        <span className="font-medium text-[var(--text-primary)]">{m.month}</span>,
                        <span className="font-bold tabular-nums" style={{ color: C.primary }}>{fmtCurrency(m.inflow)}</span>,
                        <span className="font-bold tabular-nums" style={{ color: '#ef4444' }}>{fmtCurrency(m.outflow)}</span>,
                        <span className="font-bold tabular-nums" style={{ color: m.net >= 0 ? '#10b981' : '#ef4444' }}>{fmtCurrency(m.net)}</span>,
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                            style={{ color: m.net >= 0 ? '#10b981' : '#ef4444', borderColor: (m.net >= 0 ? '#10b981' : '#ef4444') + '40', backgroundColor: (m.net >= 0 ? '#10b981' : '#ef4444') + '12' }}>
                            {m.net >= 0 ? 'Positive' : 'Deficit'}
                        </span>,
                    ])}
                />
            </ChartCard>

            {/* Enhanced Cash Flow & Transaction Analysis */}
            <Grid2>
                <ChartCard title="Expense Breakdown Analysis" subtitle="Category-wise spending with trend indicators">
                    <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart
                            data={[
                                { category: 'Materials', amount: 5600000, trend: 8.5, target: 5200000 },
                                { category: 'Labor', amount: 3100000, trend: -2.1, target: 3200000 },
                                { category: 'Overheads', amount: 1900000, trend: 12.3, target: 1800000 },
                                { category: 'Marketing', amount: 980000, trend: -5.8, target: 1100000 },
                                { category: 'Miscellaneous', amount: 450000, trend: 15.2, target: 400000 },
                            ]}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="category" {...chartAxisStyle} />
                            <YAxis yAxisId="amount" orientation="left" tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <YAxis yAxisId="trend" orientation="right" tickFormatter={(v) => `${v}%`} {...chartAxisStyle} width={40} />
                            <Tooltip content={<DashTooltip formatter={(v, name) => name === 'trend' ? `${v}%` : fmtCurrency(v)} />} />
                            <Legend />
                            <Bar yAxisId="amount" dataKey="target" name="Target" fill="#94a3b8" fillOpacity={0.5} />
                            <Bar yAxisId="amount" dataKey="amount" name="Actual" fill="#ef4444" />
                            <Line yAxisId="trend" type="monotone" dataKey="trend" name="Trend %" stroke="#f59e0b" strokeWidth={3} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Recent Transactions & Alerts" subtitle="Latest entries with risk indicators">
                    <div className="space-y-2 mb-4">
                        {[
                            { date: '2026-02-28', type: 'Invoice', amount: 420000, status: 'Paid', risk: 'low', client: 'Sharma Residency' },
                            { date: '2026-02-27', type: 'Payment', amount: 180000, status: 'Cleared', risk: 'none', client: 'ABC Corp' },
                            { date: '2026-02-25', type: 'Invoice', amount: 610000, status: 'Overdue', risk: 'high', client: 'Delhi Industries' },
                            { date: '2026-02-24', type: 'Refund', amount: 50000, status: 'Processed', risk: 'low', client: 'Gupta Solar' },
                            { date: '2026-02-22', type: 'Expense', amount: 230000, status: 'Posted', risk: 'medium', client: 'Vendor Pay' },
                        ].map((transaction, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-base)] hover:bg-[var(--bg-overlay)] transition-colors">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                            backgroundColor:
                                                transaction.risk === 'high' ? '#ef4444' :
                                                    transaction.risk === 'medium' ? '#f59e0b' :
                                                        transaction.risk === 'low' ? '#10b981' : '#6b7280'
                                        }}
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[12px] font-medium text-[var(--text-primary)]">{transaction.type}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--bg-overlay)] text-[var(--text-muted)]">{transaction.date}</span>
                                        </div>
                                        <span className="text-[10px] text-[var(--text-muted)]">{transaction.client}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[13px] font-bold tabular-nums text-[var(--text-primary)]">{fmtCurrency(transaction.amount)}</span>
                                    <div className="text-[10px] font-semibold" style={{
                                        color:
                                            transaction.status === 'Paid' || transaction.status === 'Cleared' || transaction.status === 'Processed' ? '#10b981' :
                                                transaction.status === 'Overdue' ? '#ef4444' : '#f59e0b'
                                    }}>
                                        {transaction.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-base)]">
                        <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">High Risk</p>
                            <p className="text-[15px] font-bold text-red-700 dark:text-red-300">2</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                            <p className="text-[11px] text-yellow-600 dark:text-yellow-400 font-semibold">Medium Risk</p>
                            <p className="text-[15px] font-bold text-yellow-700 dark:text-yellow-300">3</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                            <p className="text-[11px] text-green-600 dark:text-green-400 font-semibold">Low Risk</p>
                            <p className="text-[15px] font-bold text-green-700 dark:text-green-300">8</p>
                        </div>
                    </div>
                </ChartCard>
            </Grid2>

            {/* Reminders Section */}
            <div className="mt-6">
                <ReminderWidget onNavigateToReminders={() => { }} />
            </div>
        </div>
    );
};

export default FinanceDashboard;

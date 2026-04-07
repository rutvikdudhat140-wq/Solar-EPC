import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, IndianRupee, Clock,
  FileText, CheckCircle, AlertCircle, BarChart3, PieChart,
  Users, Building2, ArrowUpRight, ArrowDownRight, Activity,
  Wallet, CreditCard, TrendingUp as TrendIcon,
  Layers
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line, PieChart as RePieChart, Pie, Cell
} from 'recharts';

const fmt = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatL = (value) => {
  if (!value || isNaN(value)) return '₹0';
  // For values less than 1 Lakh, show in thousands with K suffix
  if (value >= 1000 && value < 100000) {
    const thousands = Math.round(value / 1000);
    return `₹${thousands}K`;
  } else if (value < 1000) {
    // For very small values, show as is
    return `₹${Math.round(value)}`;
  }
  // For values 1 Lakh and above, show in Lakhs
  const lakhs = Math.round(value / 100000);
  return `₹${lakhs}L`;
};

const formatAxisCurrency = (value) => {
  if (!value || isNaN(value)) return '₹0';
  // Always show in thousands (K) for Y-axis
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(0)}K`;
  } else {
    return `₹${value}`;
  }
};

// Animated Number Counter
const AnimatedNumber = ({ value, duration = 1500, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef(null);

  useEffect(() => {
    startTime.current = null;
    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = value * easeOutQuart;
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span className={className}>{fmt(displayValue)}</span>;
};

const AnimatedPercentage = ({ value, duration = 1500, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    const animate = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(value * easeOutQuart));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span className={className}>{displayValue}%</span>;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-lg p-3 shadow-xl">
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-[11px]" style={{ color: entry.color }}>
          {entry.name}: {entry.name?.includes('Rate') ? `${entry.value}%` : fmt(entry.value)}
        </p>
      ))}
    </div>
  );
};

// Section 1: Financial Overview Cards with Animations
const FinancialOverview = ({ dashboardStats, payablesTotal, manualBalance, cashPosition, onInvoicesClick, onPayablesClick, onReceivablesClick, onCashPositionClick, invoices, totalCollected }) => {
  // Compute totalRevenue from filtered invoices passed in
  const revenueCurrent = (invoices || []).reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  
  // Use totalCollected from parent component - respects calendar filters
  const collectedAmount = totalCollected || 0;
  
  // Helper to get paid amount from invoice
  const getPaidAmount = (inv) => {
    if (inv.status === 'Paid') return Number(inv.amount || 0);
    if (inv.status === 'Partial') return Number(inv.paid || inv.amountPaid || 0);
    return Number(inv.paid || 0);
  };
  
  // Helper to get balance from invoice
  const getBalance = (inv) => {
    if (inv.status === 'Paid') return 0;
    const amount = Number(inv.amount || 0);
    const paid = getPaidAmount(inv);
    return amount - paid;
  };
  
  // Calculate receivables from invoices - sum of outstanding balance only
  const receivables = useMemo(() => {
    return (invoices || []).reduce((sum, inv) => sum + getBalance(inv), 0);
  }, [invoices]);
  
  // Use passed cashPosition (already calendar-filtered in FinancePage)
  const cashPositionVal = cashPosition !== undefined ? cashPosition : manualBalance;

  const cards = [
    {
      label: 'Total Revenue',
      value: revenueCurrent,
      sub: 'From invoices',
      icon: TrendingUp,
      accentColor: '#22c55e',
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      trend: '+12%',
      onClick: onInvoicesClick,
    },
    {
      label: 'Cash Position',
      value: cashPositionVal,
      sub: 'Collected - Payables',
      icon: IndianRupee,
      accentColor: '#3b82f6',
      gradient: 'from-blue-500/20 to-blue-500/5',
      trend: cashPositionVal >= 0 ? '+8%' : '-5%',
      onClick: onCashPositionClick,
    },
    {
      label: 'Receivables',
      value: receivables,
      sub: 'Outstanding',
      icon: Clock,
      accentColor: '#f59e0b',
      gradient: 'from-amber-500/20 to-amber-500/5',
      trend: '-3%',
      onClick: onReceivablesClick,
    },
    {
      label: 'Payables',
      value: payablesTotal,
      sub: 'Due to vendors',
      icon: TrendingDown,
      accentColor: '#ef4444',
      gradient: 'from-red-500/20 to-red-500/5',
      trend: '+15%',
      onClick: onPayablesClick,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${card.gradient} border border-[var(--border-muted)] shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-500 group animate-fade-in ${card.onClick ? 'cursor-pointer' : ''}`}
          style={{ animationDelay: `${index * 100}ms` }}
          onClick={card.onClick}
        >
          <div className="absolute top-0 right-0 w-24 h-24 opacity-10 group-hover:opacity-20 transition-opacity">
            <div
              className="w-full h-full rounded-full blur-2xl"
              style={{ backgroundColor: card.accentColor }}
            />
          </div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div
              className="p-3 rounded-xl shadow-md"
              style={{ backgroundColor: `${card.accentColor}30` }}
            >
              <card.icon size={22} style={{ color: card.accentColor }} />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-bold text-[var(--text-primary)] mb-1 tracking-tight">
              <AnimatedNumber value={card.value} />
            </div>
            <div className="text-sm font-medium text-[var(--text-primary)] mb-0.5">
              {card.label}
            </div>
            <div className="text-xs text-[var(--text-muted)]">{card.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Section 2: Cashflow Summary Cards
const CashflowSummary = ({ dashboardStats, collectionRate, invoices, totalRevenue, onCollectedClick, onInvoicedClick, onOutstandingClick }) => {
  // Helper to get paid amount from invoice
  const getPaidAmount = (inv) => {
    if (inv.status === 'Paid') return Number(inv.amount || 0);
    if (inv.status === 'Partial') return Number(inv.paid || inv.amountPaid || 0);
    return Number(inv.paid || 0);
  };
  
  // Helper to get balance from invoice
  const getBalance = (inv) => {
    if (inv.status === 'Paid') return 0;
    const amount = Number(inv.amount || 0);
    const paid = getPaidAmount(inv);
    return amount - paid;
  };
  
  // Calculate collected from invoices - sum of paid amounts
  const collected = useMemo(() => {
    return (invoices || []).reduce((sum, inv) => sum + getPaidAmount(inv), 0);
  }, [invoices]);
  // Calculate outstanding from invoices
  const outstanding = useMemo(() => {
    return (invoices || []).reduce((sum, inv) => sum + getBalance(inv), 0);
  }, [invoices]);
  const cards = [
    {
      label: 'Total Invoiced',
      value: totalRevenue,
      icon: FileText,
      color: '#64748b',
      clickable: true,
    },
    {
      label: 'Collected',
      value: collected,
      icon: CheckCircle,
      color: '#22c55e',
      clickable: true,
    },
    {
      label: 'Outstanding',
      value: outstanding,
      icon: Clock,
      color: '#f59e0b',
      clickable: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`glass-card p-4 text-center rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 animate-fade-in ${card.clickable ? 'cursor-pointer' : ''}`}
          style={{ animationDelay: `${index * 75}ms` }}
          onClick={card.clickable ? (card.label === 'Collected' ? onCollectedClick : card.label === 'Outstanding' ? onOutstandingClick : onInvoicedClick) : undefined}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <card.icon size={18} style={{ color: card.color }} />
            <span className="text-[11px] text-[var(--text-muted)] font-medium">{card.label}</span>
          </div>
          <div className="text-xl font-bold" style={{ color: card.color }}>
            <AnimatedNumber value={card.value} />
          </div>
        </div>
      ))}
      <div
        className="glass-card p-4 text-center rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 animate-fade-in"
        style={{ animationDelay: '225ms' }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <BarChart3 size={18} className="text-cyan-400" />
          <span className="text-[11px] text-[var(--text-muted)] font-medium">Collection Rate</span>
        </div>
        <div className="text-xl font-bold text-cyan-400">
          <AnimatedPercentage value={collectionRate} />
        </div>
      </div>
    </div>
  );
};

// Helper: build last 6 month buckets from current or selected date
const buildMonthBuckets = (calendarFilterYear, calendarFilterMonth) => {
  const months = [];
  
  // If specific month selected, show weekly buckets within that month for better visualization
  if (calendarFilterYear && calendarFilterYear !== 'all' && calendarFilterMonth !== undefined) {
    const year = parseInt(calendarFilterYear);
    const daysInMonth = new Date(year, calendarFilterMonth + 1, 0).getDate();
    
    // Create 4 weekly buckets within the month
    const weeks = [];
    const daysPerWeek = Math.ceil(daysInMonth / 4);
    
    for (let w = 0; w < 4; w++) {
      const startDay = w * daysPerWeek + 1;
      const endDay = Math.min((w + 1) * daysPerWeek, daysInMonth);
      const start = new Date(year, calendarFilterMonth, startDay);
      const end = new Date(year, calendarFilterMonth, endDay + 1);
      
      weeks.push({
        label: `Week ${w + 1}`,
        key: `${year}-${String(calendarFilterMonth + 1).padStart(2, '0')}-W${w + 1}`,
        start,
        end,
      });
    }
    return weeks;
  }
  
  // If full year selected or no specific month, show all 12 months of the year
  if (calendarFilterYear && calendarFilterYear !== 'all') {
    const year = parseInt(calendarFilterYear);
    for (let m = 0; m < 12; m++) {
      const start = new Date(year, m, 1);
      const end = new Date(year, m + 1, 1);
      months.push({
        label: start.toLocaleString('en-IN', { month: 'short' }),
        key: `${year}-${String(m + 1).padStart(2, '0')}`,
        start,
        end,
      });
    }
    return months;
  }
  
  // Default: last 6 months
  const now = new Date();
  let endYear = now.getFullYear();
  let endMonth = now.getMonth();
  for (let i = 5; i >= 0; i--) {
    let y = endYear;
    let m = endMonth - i;
    while (m < 0) { m += 12; y--; }
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);
    months.push({
      label: start.toLocaleString('en-IN', { month: 'short' }),
      key: `${y}-${String(m + 1).padStart(2, '0')}`,
      start,
      end,
    });
  }
  return months;
};

// Helper: compute revenue+cost series from filtered invoices and adjustments
const computeRevenueCostSeries = (invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay) => {
  // If Today mode (day selected), return single day data
  if (calendarFilterDay !== undefined && calendarFilterYear !== 'all') {
    const year = parseInt(calendarFilterYear);
    const month = calendarFilterMonth;
    const day = calendarFilterDay;
    const start = new Date(year, month, day, 0, 0, 0, 0);
    const end = new Date(year, month, day, 23, 59, 59, 999);
    const revenue = (invoices || []).reduce((sum, inv) => {
      const dt = new Date(inv.invoiceDate || inv.createdAt);
      if (dt < start || dt > end) return sum;
      return sum + Number(inv.amount || 0);
    }, 0);
    const cost = (manualAdjustments || []).filter(a => a.type === 'debit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < start || dt > end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    return [{ month: 'Today', revenue, cost }];
  }
  // Monthly mode
  const months = buildMonthBuckets(calendarFilterYear, calendarFilterMonth);
  return months.map(m => {
    const revenue = (invoices || []).reduce((sum, inv) => {
      const dt = new Date(inv.invoiceDate || inv.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(inv.amount || 0);
    }, 0);
    const cost = (manualAdjustments || []).filter(a => a.type === 'debit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    return { month: m.label, revenue, cost };
  });
};

// Helper: compute cashflow series
const computeCashFlowSeries = (invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay) => {
  // If Today mode (day selected), return single day data
  if (calendarFilterDay !== undefined && calendarFilterYear !== 'all') {
    const year = parseInt(calendarFilterYear);
    const month = calendarFilterMonth;
    const day = calendarFilterDay;
    const start = new Date(year, month, day, 0, 0, 0, 0);
    const end = new Date(year, month, day, 23, 59, 59, 999);
    const inflow = (invoices || []).reduce((sum, inv) => {
      let dt = inv.paidDate ? new Date(inv.paidDate) : null;
      if (!dt && inv.status === 'Paid') dt = new Date(inv.invoiceDate || inv.createdAt);
      if (!dt || dt < start || dt > end) return sum;
      const paid = Number(inv.paid || 0);
      const amount = Number(inv.amount || 0);
      return sum + ((paid === 0 && inv.status === 'Paid') ? amount : paid);
    }, 0) + (manualAdjustments || []).filter(a => a.type === 'credit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < start || dt > end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    const outflow = (manualAdjustments || []).filter(a => a.type === 'debit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < start || dt > end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    return [{ month: 'Today', inflow, outflow }];
  }
  // Monthly mode
  const months = buildMonthBuckets(calendarFilterYear, calendarFilterMonth);
  return months.map(m => {
    const inflow = (invoices || []).reduce((sum, inv) => {
      let dt = inv.paidDate ? new Date(inv.paidDate) : null;
      if (!dt && inv.status === 'Paid') dt = new Date(inv.invoiceDate || inv.createdAt);
      if (!dt || dt < m.start || dt >= m.end) return sum;
      const paid = Number(inv.paid || 0);
      const amount = Number(inv.amount || 0);
      return sum + ((paid === 0 && inv.status === 'Paid') ? amount : paid);
    }, 0) + (manualAdjustments || []).filter(a => a.type === 'credit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    const outflow = (manualAdjustments || []).filter(a => a.type === 'debit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    return { month: m.label, inflow, outflow };
  });
};

// Helper: compute adjustment trend
const computeAdjustmentTrend = (manualAdjustments, calendarFilterYear, calendarFilterMonth) => {
  const months = buildMonthBuckets(calendarFilterYear, calendarFilterMonth);
  return months.map(m => {
    const income = (manualAdjustments || []).filter(a => a.type === 'credit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    const expense = (manualAdjustments || []).filter(a => a.type === 'debit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    return { month: m.label, income, expense };
  });
};

// Helper: compute transaction analytics (income/expense by category)
const computeTransactionAnalytics = (manualAdjustments) => {
  const incomeMap = {};
  const expenseMap = {};
  (manualAdjustments || []).forEach(adj => {
    const cat = adj.category || adj.categoryName || (adj.type === 'credit' ? 'Other Income' : 'Other Expense');
    const amt = Number(adj.amount || 0);
    if (adj.type === 'credit') {
      incomeMap[cat] = (incomeMap[cat] || 0) + amt;
    } else {
      expenseMap[cat] = (expenseMap[cat] || 0) + amt;
    }
  });
  return {
    incomeByCategory: Object.entries(incomeMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    expenseByCategory: Object.entries(expenseMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
  };
};

// Chart 1: Revenue vs Cost
const RevenueVsCostChart = ({ monthlyRevenue }) => {
  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-emerald-500/10 hover:scale-[1.02] transition-all duration-500 animate-fade-in group relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-lime-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-lime-400 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2 transition-colors">
        <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg group-hover:shadow-emerald-500/50 transition-shadow duration-300">
          <BarChart3 size={16} className="text-white group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-[var(--text-primary)] group-hover:bg-gradient-to-r group-hover:from-emerald-400 group-hover:via-lime-400 group-hover:to-green-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-700 font-bold">Revenue vs Cost</span>
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={monthlyRevenue} barSize={32} barGap={8} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
              <stop offset="50%" stopColor="#22c55e" stopOpacity={1} />
              <stop offset="100%" stopColor="#15803d" stopOpacity={0.9} />
            </linearGradient>
            <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
            </linearGradient>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatL}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Bar
            dataKey="revenue"
            fill="url(#revenueGrad)"
            radius={[6, 6, 0, 0]}
            name="Revenue"
            animationDuration={1500}
            animationBegin={0}
            className="hover:opacity-90 transition-opacity hover:scale-[1.02]"
            style={{ filter: 'url(#shadow)' }}
          />
          <Bar
            dataKey="cost"
            fill="url(#costGrad)"
            radius={[6, 6, 0, 0]}
            name="Cost"
            animationDuration={1500}
            animationBegin={300}
            className="hover:opacity-90 transition-opacity hover:scale-[1.02]"
            style={{ filter: 'url(#shadow)' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Chart 2: Cash Flow Trend
const CashFlowTrendChart = ({ cashFlow }) => {
  // Calculate net flow (inflow - outflow) for each month
  const chartData = useMemo(() => {
    if (!cashFlow || cashFlow.length === 0) return [];
    return cashFlow.map(item => ({
      ...item,
      netFlow: (item.inflow || 0) - (item.outflow || 0),
    }));
  }, [cashFlow]);

  return (
    <div className="glass-card p-6 rounded-2xl shadow-2xl hover:shadow-cyan-500/30 hover:scale-[1.02] transition-all duration-500 animate-fade-in group relative overflow-hidden" style={{ animationDelay: '100ms' }}>
      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-amber-500/10 to-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none animate-pulse" style={{ animationDelay: '1000ms' }}></div>
      
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 transition-colors">
            <div className="p-2 bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 rounded-xl shadow-lg group-hover:shadow-cyan-500/50 transition-shadow duration-300">
              <Activity size={16} className="text-white group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[var(--text-primary)] group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:via-sky-400 group-hover:to-blue-500 group-hover:bg-clip-text group-hover:text-transparent bg-[length:200%_100%] transition-all duration-700 font-bold">Cash Flow Trend</span>
          </h3>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/50"></div>
              <span className="text-xs font-semibold text-cyan-600">Inflow</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></div>
              <span className="text-xs font-semibold text-amber-600">Outflow</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4 ml-12">Monitor your cash movement over time</p>
        
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 15, right: 20, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                <stop offset="35%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="65%" stopColor="#06b6d4" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                <stop offset="35%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="65%" stopColor="#f59e0b" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" vertical={false} className="opacity-40" />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: 'var(--chart-grid)', strokeWidth: 1.5 }}
              tickLine={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }}
              tickMargin={10}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={65}
            />
            <YAxis
              tickFormatter={formatL}
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}
              axisLine={{ stroke: 'var(--chart-grid)', strokeWidth: 1.5 }}
              tickLine={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }}
              tickMargin={10}
              width={55}
              domain={[0, 5000000]}
              ticks={[0, 1000000, 2000000, 3000000, 4000000, 5000000]}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(6, 182, 212, 0.1)', stroke: 'rgba(6, 182, 212, 0.5)', strokeWidth: 2, strokeDasharray: '5 3' }}
            />
            <Legend 
              iconSize={14} 
              wrapperStyle={{ 
                fontSize: 12, 
                paddingTop: 20,
                fontWeight: 700
              }} 
              iconType="circle"
              verticalAlign="top"
            />
            <Area
              type="monotone"
              dataKey="inflow"
              stroke="url(#inflowStroke)"
              fill="url(#inflowGrad)"
              strokeWidth={5}
              dot={{ 
                fill: '#06b6d4', 
                r: 6,
                strokeWidth: 3,
                stroke: '#fff',
                filter: 'drop-shadow(0 3px 6px rgba(6, 182, 212, 0.4))'
              }}
              activeDot={{ 
                r: 9,
                fill: '#06b6d4',
                stroke: '#fff',
                strokeWidth: 4,
                filter: 'drop-shadow(0 5px 10px rgba(6, 182, 212, 0.6))'
              }}
              name="Inflow"
              animationDuration={3000}
              animationBegin={0}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Area
              type="monotone"
              dataKey="outflow"
              stroke="url(#outflowStroke)"
              fill="url(#outflowGrad)"
              strokeWidth={5}
              dot={{ 
                fill: '#f59e0b', 
                r: 6,
                strokeWidth: 3,
                stroke: '#fff',
                filter: 'drop-shadow(0 3px 6px rgba(245, 158, 11, 0.4))'
              }}
              activeDot={{ 
                r: 9,
                fill: '#f59e0b',
                stroke: '#fff',
                strokeWidth: 4,
                filter: 'drop-shadow(0 5px 10px rgba(245, 158, 11, 0.6))'
              }}
              name="Outflow"
              animationDuration={3000}
              animationBegin={500}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Chart 3: Invoice Status Distribution (Pie)
const InvoiceStatusChart = ({ invoices }) => {
  const data = useMemo(() => {
    const statusCounts = { Draft: 0, Sent: 0, Partial: 0, Paid: 0, Overdue: 0 };
    invoices.forEach((inv) => {
      // Map "Pending" to "Sent" as per UI convention
      const status = inv.status === 'Pending' ? 'Sent' : inv.status;
      if (statusCounts[status] !== undefined) {
        statusCounts[status] += 1;
      } else {
        // Handle any other unknown statuses by counting them as Draft
        statusCounts.Draft += 1;
      }
    });
    return [
      { name: 'Draft', value: statusCounts.Draft, color: '#64748b' },
      { name: 'Sent', value: statusCounts.Sent, color: '#3b82f6' },
      { name: 'Partial', value: statusCounts.Partial, color: '#f59e0b' },
      { name: 'Paid', value: statusCounts.Paid, color: '#22c55e' },
      { name: 'Overdue', value: statusCounts.Overdue, color: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [invoices]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="glass-card p-5 rounded-2xl shadow-lg h-[320px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">No invoice data</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-[1.02] transition-all duration-500 animate-fade-in group relative overflow-hidden" style={{ animationDelay: '200ms' }}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-violet-300 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2 transition-colors">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg group-hover:shadow-purple-500/50 transition-shadow duration-300">
          <PieChart size={16} className="text-white group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-[var(--text-primary)] group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:via-violet-300 group-hover:to-fuchsia-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-700 font-bold">Invoice Status Distribution</span>
        <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1">(</span>
        <span className="text-[10px] text-[var(--text-primary)] font-bold tabular-nums">{invoices.length}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-normal ml-0">total)</span>
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <RePieChart>
          <defs>
            <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
            </filter>
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={30}
            paddingAngle={3}
            dataKey="value"
            animationDuration={1500}
            animationBegin={0}
            filter="url(#pieShadow)"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
                stroke="var(--bg-surface)" 
                strokeWidth={2} 
                className="hover:opacity-80 transition-opacity"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </RePieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-[10px] group/item hover:scale-105 transition-transform cursor-pointer">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[var(--text-muted)]">{item.name}</span>
            <span className="font-semibold text-[var(--text-primary)]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Chart 4: Receivable Aging (Enhanced Compact UI)
const ReceivableAgingChart = ({ invoices }) => {
  const data = useMemo(() => {
    const now = new Date();
    console.log('=== RECEIVABLE AGING DEBUG ===');
    console.log('Current Date:', now.toISOString());
    console.log('Total Invoices:', invoices?.length || 0);
    
    const buckets = {
      '0-30 Days': 0,
      '31-60 Days': 0,
      '61-90 Days': 0,
      '90+ Days': 0,
    };

    // Helper to safely parse date string or Date object
    const parseDate = (dateValue) => {
      if (!dateValue) return null;
      const d = new Date(dateValue);
      return isNaN(d.getTime()) ? null : d;
    };

    invoices
      .filter(inv => inv.status !== 'Paid' && inv.balance > 0)
      .forEach((inv) => {
        // Try to get a valid date - prioritize dueDate, then invoiceDate, then createdAt
        let dueDate = null;
        
        if (inv.dueDate) {
          dueDate = parseDate(inv.dueDate);
          console.log(`\nInvoice ${inv.invoiceNumber || 'N/A'}:`);
          console.log(`  Raw dueDate from DB:`, inv.dueDate);
        } 
        if (!dueDate && inv.invoiceDate) {
          dueDate = parseDate(inv.invoiceDate);
          console.log(`\nInvoice ${inv.invoiceNumber || 'N/A'} (using invoiceDate):`);
          console.log(`  Raw invoiceDate from DB:`, inv.invoiceDate);
        }
        if (!dueDate && inv.createdAt) {
          dueDate = parseDate(inv.createdAt);
          console.log(`\nInvoice ${inv.invoiceNumber || 'N/A'} (using createdAt):`);
          console.log(`  Raw createdAt from DB:`, inv.createdAt);
        }
        
        // If no valid date found, skip this invoice
        if (!dueDate || isNaN(dueDate.getTime())) {
          console.warn(`  ❌ No valid date found! Skipping.`);
          return;
        }
        
        console.log(`  Parsed Due Date:`, dueDate.toISOString());
        console.log(`  Balance: ₹${inv.balance}`);
        
        // Calculate days from the due/invoice date to NOW
        const timeDiff = now.getTime() - dueDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        
        console.log(`  Time Diff (ms):`, timeDiff.toLocaleString());
        console.log(`  Days Diff:`, daysDiff);
        
        // Categorize based on days since due/invoice date
        if (daysDiff < 0) {
          buckets['0-30 Days'] += inv.balance;
          console.log(`  📦 Bucket: 0-30 Days (FUTURE DATE - ${Math.abs(daysDiff)} days ahead)`);
        } else if (daysDiff <= 30) {
          buckets['0-30 Days'] += inv.balance;
          console.log(`  📦 Bucket: 0-30 Days (${daysDiff} days overdue)`);
        } else if (daysDiff <= 60) {
          buckets['31-60 Days'] += inv.balance;
          console.log(`  ⏰ Bucket: 31-60 Days (${daysDiff} days overdue)`);
        } else if (daysDiff <= 90) {
          buckets['61-90 Days'] += inv.balance;
          console.log(`  ⚠️ Bucket: 61-90 Days (${daysDiff} days overdue)`);
        } else {
          buckets['90+ Days'] += inv.balance;
          console.log(`  🔴 Bucket: 90+ Days (${daysDiff} days overdue)`);
        }
      });
    
    console.log('\n=== FINAL BUCKETS ===');
    console.log('0-30 Days:', fmt(buckets['0-30 Days']));
    console.log('31-60 Days:', fmt(buckets['31-60 Days']));
    console.log('61-90 Days:', fmt(buckets['61-90 Days']));
    console.log('90+ Days:', fmt(buckets['90+ Days']));
    console.log('========================\n');

    return [
      { bucket: '0-30 Days', amount: buckets['0-30 Days'], color: '#10b981', gradientStart: '#10b981', gradientEnd: '#059669', icon: '📊' },
      { bucket: '31-60 Days', amount: buckets['31-60 Days'], color: '#3b82f6', gradientStart: '#3b82f6', gradientEnd: '#2563eb', icon: '⏰' },
      { bucket: '61-90 Days', amount: buckets['61-90 Days'], color: '#f59e0b', gradientStart: '#f59e0b', gradientEnd: '#d97706', icon: '⚠️' },
      { bucket: '90+ Days', amount: buckets['90+ Days'], color: '#ef4444', gradientStart: '#ef4444', gradientEnd: '#dc2626', icon: '🔴' },
    ];
  }, [invoices]);

  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="glass-card p-5 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-amber-500/20 hover:scale-[1.02] transition-all duration-300 animate-fade-in group relative overflow-hidden" style={{ animationDelay: '300ms' }}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Header with total badge */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 transition-colors">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 backdrop-blur-sm border border-amber-500/30 shadow-lg group-hover:shadow-amber-500/50 transition-shadow duration-300">
            <Clock size={16} className="text-white" />
          </div>
          <span className="text-[var(--text-primary)] group-hover:bg-gradient-to-r group-hover:from-amber-400 group-hover:via-yellow-300 group-hover:to-orange-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-700 font-bold">Receivable Aging</span>
        </h3>
        <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 backdrop-blur-sm">
          <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold block text-center">Outstanding</span>
          <span className="text-xs font-black text-amber-400 tabular-nums">{fmt(data.reduce((sum, item) => sum + item.amount, 0))}</span>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3.5 relative z-10">
        {data.map((item, index) => (
          <div key={item.bucket} className="group/item cursor-pointer">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <span 
                  className="text-base transition-transform duration-300 group-hover/item:scale-125 group-hover/item:rotate-12 filter drop-shadow-md"
                  style={{ filter: `drop-shadow(0 0 4px ${item.color}80)` }}
                >
                  {item.icon}
                </span>
                <span className="text-[var(--text-muted)] font-medium group-hover/item:text-[var(--text-primary)] transition-colors text-xs">
                  {item.bucket}
                </span>
              </div>
              <span className="font-bold text-[var(--text-primary)] tabular-nums text-xs">{fmt(item.amount)}</span>
            </div>
            
            {/* Progress bar container with subtle glow */}
            <div className="h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden shadow-inner relative group-hover/item:bg-[var(--bg-overlay)] transition-colors duration-300">
              {/* Gradient progress bar */}
              <div
                className="h-full rounded-full transition-all duration-700 ease-out group-hover/item:brightness-125 relative overflow-hidden flex items-center justify-end pr-1"
                style={{
                  width: `${(item.amount / maxAmount) * 100}%`,
                  background: `linear-gradient(90deg, ${item.gradientStart} 0%, ${item.gradientEnd} 50%, ${item.color} 100%)`,
                  boxShadow: `0 2px 8px ${item.color}80, inset 0 1px 0 rgba(255,255,255,0.4)`,
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/item:translate-x-full transition-transform duration-700 ease-in-out" />
                
                {/* Striped pattern overlay */}
                <div 
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px)',
                    backgroundSize: '16px 16px',
                  }}
                />
                
                {/* Subtle pulse dot at end of bar */}
                <div 
                  className="w-1.5 h-1.5 rounded-full bg-white opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 animate-pulse"
                  style={{ boxShadow: `0 0 6px ${item.color}` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with legend */}
      <div className="mt-4 pt-3 border-t border-[var(--border-base)] relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Status:</span>
            <div className="flex gap-1">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] text-emerald-400 font-bold">Good</span>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[8px] text-red-400 font-bold">Risk</span>
              </div>
            </div>
          </div>
          <div className="text-[9px] text-[var(--text-muted)] font-medium">
            Updated just now
          </div>
        </div>
      </div>
    </div>
  );
};

// Chart 5: Vendor Payables Breakdown (Pie)
const VendorPayablesChart = ({ payables }) => {
  const data = useMemo(() => {
    return payables
      .slice(0, 6)
      .map((vendor, index) => ({
        name: vendor.vendorName?.substring(0, 15) || 'Unknown',
        value: vendor.outstandingAmount,
        color: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][index % 6],
      }))
      .filter(item => item.value > 0);
  }, [payables]);

  if (data.length === 0) {
    return (
      <div className="glass-card p-5 rounded-2xl shadow-lg h-[320px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">No payables data</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-rose-500/10 hover:scale-[1.02] transition-all duration-500 animate-fade-in group relative overflow-hidden" style={{ animationDelay: '400ms' }}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-pink-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 via-pink-300 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2 transition-colors">
        <div className="p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg shadow-lg group-hover:shadow-rose-500/50 transition-shadow duration-300">
          <Users size={16} className="text-white group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-[var(--text-primary)] group-hover:bg-gradient-to-r group-hover:from-rose-400 group-hover:via-pink-300 group-hover:to-red-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-700 font-bold">Vendor Payables Breakdown</span>
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <RePieChart>
          <defs>
            <filter id="pieShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.4"/>
            </filter>
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={35}
            paddingAngle={3}
            dataKey="value"
            animationDuration={1500}
            animationBegin={200}
            stroke="var(--bg-surface)"
            strokeWidth={3}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
                className="hover:opacity-75 transition-all duration-300 hover:scale-105"
                style={{ filter: 'url(#pieShadow)' }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </RePieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {data.map((item) => (
          <div 
            key={item.name} 
            className="flex items-center gap-2 text-[10px] hover:scale-105 transition-transform cursor-pointer glass-card px-2 py-1.5 rounded-lg hover:bg-white/10"
          >
            <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: item.color, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
            <span className="text-[var(--text-muted)] truncate font-medium">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Chart 6: Collection Performance
const MonthlyCollectionChart = ({ invoices, payments, calendarFilterYear, calendarFilterMonth, calendarFilterDay, totalRevenue, totalCollected }) => {
  const data = useMemo(() => {
    // If calendarFilterDay is set, we're in "Today" mode - show single day data
    if (calendarFilterDay !== undefined) {
      // For Today view, show total revenue as Invoices Created
      const invoiceTotal = totalRevenue || 0;
      
      // Use totalCollected directly for today's payments
      const paymentTotal = totalCollected || 0;
      
      return [{ month: 'Today', invoices: invoiceTotal, payments: paymentTotal }];
    }
    
    // Normal month-based calculation
    const months = buildMonthBuckets(calendarFilterYear, calendarFilterMonth);
    return months.map(m => {
      // Calculate invoice total from invoice date
      const invoiceTotal = (invoices || []).reduce((sum, inv) => {
        const dt = new Date(inv.invoiceDate || inv.createdAt);
        if (dt < m.start || dt >= m.end) return sum;
        return sum + Number(inv.amount || 0);
      }, 0);
      
      // Calculate payment received - use invoice paidAmount based on invoice date
      const paymentTotal = (invoices || []).reduce((sum, inv) => {
        const dt = new Date(inv.invoiceDate || inv.createdAt);
        if (dt < m.start || dt >= m.end) return sum;
        
        // Get paid amount from invoice
        let paidAmount = 0;
        if (inv.status === 'Paid') {
          paidAmount = Number(inv.paid || inv.amountPaid || inv.amount || 0);
        } else if (inv.status === 'Partial') {
          paidAmount = Number(inv.paid || inv.amountPaid || 0);
        }
        
        return sum + paidAmount;
      }, 0);
      
      return { month: m.label, invoices: invoiceTotal, payments: paymentTotal };
    });
  }, [invoices, calendarFilterYear, calendarFilterMonth, calendarFilterDay, totalRevenue, totalCollected]);

  // Dynamic title based on calendar filter
  const getDynamicTitle = () => {
    if (calendarFilterDay !== undefined) return 'Today Collection';
    if (calendarFilterMonth !== undefined && calendarFilterYear !== 'all') {
      const monthName = new Date(parseInt(calendarFilterYear), calendarFilterMonth).toLocaleString('en-IN', { month: 'long' });
      return `${monthName} ${calendarFilterYear} Collection`;
    }
    if (calendarFilterYear !== 'all') return `${calendarFilterYear} Collection`;
    return 'Collection Performance';
  };

  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 hover:scale-[1.02] transition-all duration-500 animate-fade-in group relative overflow-hidden" style={{ animationDelay: '500ms' }}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-violet-300 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2 transition-colors">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg group-hover:shadow-indigo-500/50 transition-shadow duration-300">
          <TrendIcon size={16} className="text-white group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-[var(--text-primary)] group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:via-violet-300 group-hover:to-purple-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-700 font-bold">{getDynamicTitle()}</span>
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="invoiceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="paymentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6ee7b7" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
            </linearGradient>
            <filter id="lineShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.4"/>
            </filter>
            <linearGradient id="dotGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#fff" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatL}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, Math.max(100000, 'dataMax + 50000')]}
            allowDecimals={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Area
            type="monotone"
            dataKey="invoices"
            stroke="#8b5cf6"
            strokeWidth={3}
            fill="url(#invoiceGrad)"
            dot={{ 
              fill: '#8b5cf6', 
              r: 5,
              stroke: '#fff',
              strokeWidth: 2,
              style: { filter: 'url(#lineShadow)' }
            }}
            activeDot={{ 
              r: 7,
              stroke: '#fff',
              strokeWidth: 3,
              style: { filter: 'url(#lineShadow)' }
            }}
            name="Invoices Created"
            animationDuration={2000}
            animationBegin={0}
            style={{ filter: 'url(#lineShadow)' }}
            className="hover:opacity-90 transition-opacity"
          />
          <Area
            type="monotone"
            dataKey="payments"
            stroke="#22c55e"
            strokeWidth={3}
            fill="url(#paymentGrad)"
            dot={{ 
              fill: '#22c55e', 
              r: 5,
              stroke: '#fff',
              strokeWidth: 2,
              style: { filter: 'url(#lineShadow)' }
            }}
            activeDot={{ 
              r: 7,
              stroke: '#fff',
              strokeWidth: 3,
              style: { filter: 'url(#lineShadow)' }
            }}
            name="Payments Received"
            animationDuration={2000}
            animationBegin={300}
            style={{ filter: 'url(#lineShadow)' }}
            className="hover:opacity-90 transition-opacity"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Chart 7: Income by Category (Enhanced Donut Chart)
const IncomeByCategoryChart = ({ transactionAnalytics }) => {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const data = useMemo(() => {
    if (!transactionAnalytics?.incomeByCategory?.length) return [];
    const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857'];
    return transactionAnalytics.incomeByCategory.map((item, index) => ({
      name: item.category,
      value: item.amount,
      color: colors[index % colors.length],
      gradientStart: colors[index % colors.length],
      gradientEnd: colors[(index + 1) % colors.length],
    }));
  }, [transactionAnalytics]);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const topCategory = data.length > 0 ? data.reduce((max, item) => item.value > max.value ? item : max, data[0]) : null;

  if (data.length === 0) {
    return (
      <div className="glass-card p-5 rounded-2xl shadow-lg h-[320px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">No income data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.02] transition-all duration-500 animate-fade-in group relative overflow-hidden" style={{ animationDelay: '500ms' }}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-green-300 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Header with total */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 transition-colors">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 backdrop-blur-sm border border-emerald-500/30 shadow-lg group-hover:shadow-emerald-500/50 transition-shadow duration-300">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="text-[var(--text-primary)] group-hover:bg-gradient-to-r group-hover:from-emerald-400 group-hover:via-green-300 group-hover:to-teal-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-700 font-bold">Income by Category</span>
        </h3>
        <div className="text-right">
          <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Total Income</p>
          <p className="text-xs font-black text-emerald-400 tabular-nums">{fmt(total)}</p>
        </div>
      </div>

      {/* Enhanced Donut Chart */}
        <ResponsiveContainer width="100%" height={220}>
          <RePieChart>
            <defs>
              {/* Gradient definitions for each segment */}
              {data.map((item, index) => (
                <linearGradient key={`grad-${index}`} id={`incomeGrad${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={item.gradientStart} stopOpacity={1} />
                  <stop offset="100%" stopColor={item.gradientEnd} stopOpacity={0.8} />
                </linearGradient>
              ))}
              {/* Shadow filter */}
              <filter id="donutShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.25"/>
              </filter>
              {/* Glow filter */}
              <filter id="donutGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
                <feColorMatrix type="matrix" values="0 0 0 0 0.125  0 0 0 0 0.741  0 0 0 0 0.525  0 0 0 0.4 0" />
              </filter>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              animationDuration={1800}
              animationBegin={0}
              stroke="var(--bg-surface)"
              strokeWidth={3}
              filter="url(#donutShadow)"
              onMouseEnter={(_, index) => setHoveredSlice(index)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#incomeGrad${index})`}
                  stroke="var(--bg-surface)" 
                  strokeWidth={3}
                  className="hover:opacity-90 transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0];
                const percentage = ((item.value / total) * 100).toFixed(1);
                return (
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-xl p-3 shadow-2xl backdrop-blur-sm">
                    <p className="text-xs font-bold text-[var(--text-primary)] mb-1">{item.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                      <p className="text-xs font-black text-emerald-400 tabular-nums">{fmt(item.value)}</p>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{percentage}% of total</p>
                  </div>
                );
              }}
            />
          </RePieChart>
        </ResponsiveContainer>

        {/* Center badge showing number of categories */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none transition-opacity duration-200 ${hoveredSlice !== null ? 'opacity-0' : 'opacity-100'}`} style={{ marginTop: '-10px' }}>
          <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Categories</p>
          <p className="text-lg font-black text-[var(--text-primary)] tabular-nums">{data.length}</p>
        </div>

        {/* Enhanced Legend Grid */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border-base)]">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div 
                key={item.name} 
                className="group/legend flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-overlay)] transition-all duration-300 cursor-pointer hover:scale-105"
              >
                <div 
                  className="w-3 h-3 rounded-full shadow-lg relative overflow-hidden flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${item.gradientStart}, ${item.gradientEnd})`,
                    boxShadow: `0 2px 4px ${item.color}80`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/legend:translate-x-full transition-transform duration-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-[var(--text-muted)] truncate group-hover/legend:text-[var(--text-primary)] transition-colors">
                    {item.name.length > 18 ? item.name.substring(0, 18) + '...' : item.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[9px] font-bold text-[var(--text-primary)] tabular-nums">{fmt(item.value)}</p>
                    <span className="text-[8px] text-[var(--text-muted)]">({percentage}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
};

// Chart 8: Expense by Category (Bar Chart)
const ExpenseByCategoryChart = ({ transactionAnalytics }) => {
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const data = useMemo(() => {
    if (!transactionAnalytics?.expenseByCategory?.length) return [];
    const colors = [
      { from: '#f87171', to: '#ef4444', glow: '#ef4444' },
      { from: '#fb923c', to: '#f97316', glow: '#f97316' },
      { from: '#fbbf24', to: '#f59e0b', glow: '#f59e0b' },
      { from: '#a3e635', to: '#84cc16', glow: '#84cc16' },
      { from: '#34d399', to: '#10b981', glow: '#10b981' },
      { from: '#22d3ee', to: '#06b6d4', glow: '#06b6d4' },
      { from: '#60a5fa', to: '#3b82f6', glow: '#3b82f6' },
      { from: '#a78bfa', to: '#8b5cf6', glow: '#8b5cf6' },
    ];
    return transactionAnalytics.expenseByCategory.map((item, index) => ({
        category: item.category.length > 15 ? item.category.substring(0, 15) + '...' : item.category,
        amount: item.amount,
        color: colors[index % colors.length],
        originalCategory: item.category,
      }));
  }, [transactionAnalytics]);

  const total = useMemo(() => {
    return transactionAnalytics?.expenseByCategory?.reduce((sum, item) => sum + item.amount, 0) || 0;
  }, [transactionAnalytics]);

  const minXAxis = useMemo(() => {
    if (!data.length) return 0;
    const minAmount = Math.min(...data.map(item => item.amount));
    // Return the actual minimum value, ensuring it's never 0
    return minAmount > 0 ? minAmount : 1000;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="glass-card p-5 rounded-2xl shadow-lg h-[320px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">No expense data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-red-500/20 hover:scale-[1.02] transition-all duration-500 animate-fade-in group relative overflow-hidden" style={{ animationDelay: '600ms' }}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 via-orange-300 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Header with total */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 transition-colors">
          <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 backdrop-blur-sm border border-red-500/30 shadow-lg group-hover:shadow-red-500/50 transition-shadow duration-300">
            <TrendingDown size={16} className="text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[var(--text-primary)] group-hover:bg-gradient-to-r group-hover:from-red-400 group-hover:via-orange-300 group-hover:to-rose-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-700 font-bold">Expense by Category</span>
        </h3>
        <div className="text-right">
          <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Total Expenses</p>
          <p className="text-xs font-black text-red-400 tabular-nums">{fmt(total)}</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" barSize={28} margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <defs>
            {/* Dynamic gradients for each bar */}
            {data.map((item, index) => (
              <linearGradient key={`grad-${index}`} id={`expenseGrad${index}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={item.color.from} stopOpacity={1} />
                <stop offset="100%" stopColor={item.color.to} stopOpacity={0.9} />
              </linearGradient>
            ))}
            {/* Glow filter */}
            <filter id="barGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
              <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.2  0 0 0 0 0.2  0 0 0 0.3 0" />
            </filter>
            {/* Shadow filter */}
            <filter id="enhancedBarShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="3" dy="3" stdDeviation="4" floodOpacity="0.3"/>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} opacity={0.5} />
          <XAxis
            type="number"
            tickFormatter={formatL}
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={({ x, y, payload, index }) => (
              <text 
                x={x - 5} 
                y={y} 
                textAnchor="end" 
                fill={hoveredCategory === index ? 'var(--text-primary)' : 'var(--text-muted)'}
                fontSize={hoveredCategory === index ? 11 : 10}
                fontWeight={hoveredCategory === index ? 600 : 400}
                className="transition-all duration-200"
              >
                {payload.value}
              </text>
            )}
            axisLine={false}
            tickLine={false}
            width={75}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0];
              const percentage = ((item.value / total) * 100).toFixed(1);
              return (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-xl p-3 shadow-2xl backdrop-blur-sm">
                  <p className="text-xs font-bold text-[var(--text-primary)] mb-1">{data[item.payload.index]?.originalCategory || item.name}</p>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <p className="text-xs font-black text-red-400 tabular-nums">{fmt(item.value)}</p>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">{percentage}% of total expenses</p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="amount"
            animationDuration={1500}
            animationBegin={200}
            radius={[0, 8, 8, 0]}
            label={({ value }) => `₹${(value / 1000).toFixed(1)}L`}
            labelPosition="right"
            onMouseEnter={(_, index) => setHoveredCategory(index)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#expenseGrad${index})`}
                style={{ 
                  filter: hoveredCategory === index ? 'url(#barGlow)' : 'url(#enhancedBarShadow)',
                  transform: hoveredCategory === index ? 'scaleX(1.02)' : 'scaleX(1)',
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Enhanced Legend Grid */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border-base)]">
        {data.map((item, index) => {
          const percentage = ((item.amount / total) * 100).toFixed(1);
          return (
            <div 
              key={item.category} 
              className="group/legend flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-overlay)] transition-all duration-300 cursor-pointer hover:scale-105"
              onMouseEnter={() => setHoveredCategory(index)}
              onMouseLeave={() => setHoveredCategory(null)}
            >
              <div 
                className="w-3 h-3 rounded-full shadow-lg relative overflow-hidden flex-shrink-0"
                style={{ 
                  background: `linear-gradient(135deg, ${item.color.from}, ${item.color.to})`,
                  boxShadow: `0 2px 4px ${item.color.glow}80`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/legend:translate-x-full transition-transform duration-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-[var(--text-muted)] truncate group-hover/legend:text-[var(--text-primary)] transition-colors">
                  {item.originalCategory || item.category}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[9px] font-bold text-[var(--text-primary)] tabular-nums">{fmt(item.amount)}</p>
                  <span className="text-[8px] text-[var(--text-muted)]">({percentage}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Chart 9: Income vs Expense Trend
const IncomeExpenseTrendChart = ({ adjustmentTrend }) => {
  const data = useMemo(() => {
    if (!adjustmentTrend || adjustmentTrend.length === 0) return [];
    return adjustmentTrend.map(item => ({
      label: item.month,
      income: item.income || 0,
      expense: item.expense || 0,
    }));
  }, [adjustmentTrend]);

  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-5 rounded-2xl shadow-lg h-[360px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">No trend data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] transition-all duration-500 animate-fade-in group relative overflow-hidden" style={{ animationDelay: '700ms' }}>
      {/* Decorative background gradient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-green-500/5 to-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-sky-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-sky-300 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2 transition-colors">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
            <Activity size={16} className="text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[var(--text-primary)] group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:via-sky-300 group-hover:to-purple-500 group-hover:bg-clip-text group-hover:text-transparent transition-all font-bold">Income vs Expense</span>
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4 ml-12">Track your financial performance over time</p>
        
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="incomeTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="expenseTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} className="opacity-50" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}
              axisLine={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }}
              tickLine={false}
              tickMargin={8}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis
              tickFormatter={formatL}
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}
              axisLine={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }}
              tickLine={false}
              tickMargin={8}
              width={50}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: 'rgba(59, 130, 246, 0.3)', strokeWidth: 2, strokeDasharray: '4 4' }}
            />
            <Legend 
              iconSize={12} 
              wrapperStyle={{ 
                fontSize: 12, 
                paddingTop: 15,
                fontWeight: 600
              }} 
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#10b981"
              fill="url(#incomeTrendGrad)"
              strokeWidth={4}
              dot={{ 
                fill: '#10b981', 
                r: 5,
                strokeWidth: 2,
                stroke: '#fff',
                filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3))'
              }}
              activeDot={{ 
                r: 7,
                fill: '#10b981',
                stroke: '#fff',
                strokeWidth: 3,
                filter: 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.5))'
              }}
              name="Income"
              animationDuration={2500}
              animationBegin={0}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#ef4444"
              fill="url(#expenseTrendGrad)"
              strokeWidth={4}
              dot={{ 
                fill: '#ef4444', 
                r: 5,
                strokeWidth: 2,
                stroke: '#fff',
                filter: 'drop-shadow(0 2px 4px rgba(239, 68, 68, 0.3))'
              }}
              activeDot={{ 
                r: 7,
                fill: '#ef4444',
                stroke: '#fff',
                strokeWidth: 3,
                filter: 'drop-shadow(0 4px 8px rgba(239, 68, 68, 0.5))'
              }}
              name="Expense"
              animationDuration={2500}
              animationBegin={400}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Section 8: Recent Finance Activity
const RecentActivity = ({ invoices, payments, manualAdjustments }) => {
  const activities = useMemo(() => {
    const items = [];

    // Add recent invoices
    invoices.slice(0, 5).forEach((inv) => {
      items.push({
        date: inv.invoiceDate || inv.createdAt,
        type: 'New Invoice',
        entity: inv.invoiceNumber || inv.id,
        amount: inv.amount,
        status: inv.status,
        icon: FileText,
        color: 'text-blue-400',
      });
    });

    // Add recent payments
    payments.slice(0, 5).forEach((payment) => {
      items.push({
        date: payment.paymentDate || payment.createdAt,
        type: payment.paymentType === 'Customer Payment' ? 'Payment Received' : 'Vendor Payment',
        entity: payment.referenceId,
        amount: payment.amount,
        status: 'Completed',
        icon: payment.paymentType === 'Customer Payment' ? Wallet : CreditCard,
        color: payment.paymentType === 'Customer Payment' ? 'text-emerald-400' : 'text-amber-400',
      });
    });

    // Add manual adjustments
    manualAdjustments.slice(0, 5).forEach((adj) => {
      items.push({
        date: adj.date || adj.createdAt,
        type: 'Amount Adjusted',
        entity: adj.reason || adj.type,
        amount: adj.amount,
        status: adj.type,
        icon: Activity,
        color: adj.type === 'credit' ? 'text-emerald-400' : 'text-red-400',
      });
    });

    // Sort by date descending
    return items
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 8);
  }, [invoices, payments, manualAdjustments]);

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Activity size={16} className="text-cyan-400" />
        Recent Finance Activity
      </h3>
      <div className="space-y-2">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-muted)]"
          >
            <div className={`p-1.5 rounded-md bg-[var(--bg-primary)] ${activity.color}`}>
              <activity.icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {activity.type}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {activity.date ? new Date(activity.date).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">
                {activity.entity}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xs font-semibold ${activity.color}`}>
                {fmt(activity.amount)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {activity.status}
              </div>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No recent activity
          </p>
        )}
      </div>
    </div>
  );
};

// Main Dashboard Component
const FinanceDashboard = ({
  isOpen,
  onClose,
  dashboardStats,
  payables,
  invoices,
  payments,
  manualAdjustments,
  monthlyRevenue,
  cashFlow,
  totalCollected,
  manualBalance,
  cashPosition,
  transactionAnalytics,
  adjustmentTrend,
  calendarFilterYear,
  calendarFilterMonth,
  calendarFilterDay,
  onInvoicesClick,
  onPayablesClick,
  onCollectedClick,
  onReceivablesClick,
  onOutstandingClick,
  onCashPositionClick,
  onStatusClick,
}) => {
  // Helper functions for calculations
  const getPaidAmount = (inv) => {
    if (inv.status === 'Paid') return Number(inv.amount || 0);
    if (inv.status === 'Partial') return Number(inv.paid || inv.amountPaid || 0);
    return Number(inv.paid || 0);
  };

  // Calculate total revenue from FILTERED invoices
  const totalRevenue = (invoices || []).reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    
  // Use totalCollected from parent component (FinancePage) - respects calendar filters
  const collectedAmount = totalCollected || 0;
    
  // Calculate collection rate from invoices
  const collectionRate = totalRevenue > 0
    ? Math.round((collectedAmount / totalRevenue) * 100)
    : 0;

  const payablesTotal = (payables || []).reduce((sum, p) => sum + (p.outstandingAmount || 0), 0);

  // Compute all chart data from filtered data (hooks must be before any early return)
  const computedMonthlyRevenue = useMemo(
    () => computeRevenueCostSeries(invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay),
    [invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay]
  );
  const computedCashFlow = useMemo(
    () => computeCashFlowSeries(invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay),
    [invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay]
  );
  const computedAdjustmentTrend = useMemo(
    () => computeAdjustmentTrend(manualAdjustments, calendarFilterYear, calendarFilterMonth),
    [manualAdjustments, calendarFilterYear, calendarFilterMonth]
  );
  const computedTransactionAnalytics = useMemo(
    () => computeTransactionAnalytics(manualAdjustments),
    [manualAdjustments]
  );

  // Early return AFTER all hooks
  if (!isOpen) return null;

  return (
    <div className="space-y-6 pb-6">
      {/* Section 1: Financial Overview */}
      <section className="animate-fade-in">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Financial Overview
        </h2>
        <FinancialOverview
          dashboardStats={dashboardStats}
          payablesTotal={payablesTotal}
          manualBalance={manualBalance}
          cashPosition={cashPosition !== undefined ? cashPosition : manualBalance}
          onInvoicesClick={onInvoicesClick}
          onPayablesClick={onPayablesClick}
          onReceivablesClick={onReceivablesClick}
          onCashPositionClick={onCashPositionClick}
          invoices={invoices}
          totalCollected={collectedAmount}
        />
      </section>

      {/* Section 2: Cashflow Summary */}
      <section className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Cashflow Summary
        </h2>
        <CashflowSummary
          dashboardStats={dashboardStats}
          collectionRate={collectionRate}
          totalRevenue={totalRevenue}
          invoices={invoices}
          onCollectedClick={onCollectedClick}
          onInvoicedClick={onInvoicesClick}
          onOutstandingClick={onOutstandingClick}
        />
      </section>

      {/* Section 3: Financial Analytics (Income vs Expense) */}
      <section className="animate-fade-in" style={{ animationDelay: '150ms' }}>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Financial Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <IncomeByCategoryChart transactionAnalytics={computedTransactionAnalytics} />
          <ExpenseByCategoryChart transactionAnalytics={computedTransactionAnalytics} />
          <IncomeExpenseTrendChart adjustmentTrend={computedAdjustmentTrend} />
        </div>
      </section>

      {/* Charts Grid - Row 1 */}
      <section className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Financial Trends
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RevenueVsCostChart monthlyRevenue={computedMonthlyRevenue} />
          <CashFlowTrendChart cashFlow={computedCashFlow} />
        </div>
      </section>

      {/* Charts Grid - Row 2 */}
      <section className="animate-fade-in" style={{ animationDelay: '300ms' }}>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Invoice Analysis
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <InvoiceStatusChart invoices={invoices} />
          <ReceivableAgingChart invoices={invoices} />
        </div>
      </section>

      {/* Charts Grid - Row 3 */}
      <section className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Payables & Collections
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <VendorPayablesChart payables={payables} />
          <MonthlyCollectionChart 
            invoices={invoices} 
            payments={payments} 
            calendarFilterYear={calendarFilterYear} 
            calendarFilterMonth={calendarFilterMonth} 
            calendarFilterDay={calendarFilterDay} 
            totalRevenue={totalRevenue} 
            totalCollected={totalCollected} 
          />
        </div>
      </section>
    </div>
  );
};

export default FinanceDashboard;

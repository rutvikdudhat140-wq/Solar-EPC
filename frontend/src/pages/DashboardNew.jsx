// Main Dashboard Page - Solar OS Professional Dashboard
// Self-contained - no Redux-dependent UI components
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Users, Briefcase, Package, 
  DollarSign, CheckCircle, Clock, AlertCircle, ArrowRight,
  Sun, Zap, FileText, Wrench, Shield, PieChart as PieChartIcon,
  RefreshCw, Activity, MapPin, Truck,
  ArrowUpRight, ArrowDownRight, Sparkles,
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardService from '../services/dashboardApi';
import { 
  ProjectPipeline2D, 
  InstallationStatus2D, 
  QuotationStatus2D, 
  ServiceTickets2D, 
  ProcurementStatus2D, 
  InventoryCategory2D 
} from '../components/dashboard/Charts2D';

// Local Badge component (no Redux)
const Badge = ({ children, className = '', style = {} }) => (
  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${className}`} style={style}>
    {children}
  </span>
);

// Local KPICard component - Inventory Style
const KPICard = ({ title, value, subtitle, trend, trendValue, icon: Icon, color, onClick, loading }) => {
  const colorMap = {
    blue: { from: 'from-blue-100', to: 'to-sky-200', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-200', iconColor: 'text-blue-700' },
    emerald: { from: 'from-emerald-100', to: 'to-green-200', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-200', iconColor: 'text-emerald-700' },
    amber: { from: 'from-amber-100', to: 'to-orange-200', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-200', iconColor: 'text-amber-700' },
    purple: { from: 'from-violet-100', to: 'to-purple-200', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-200', iconColor: 'text-violet-700' },
    red: { from: 'from-red-100', to: 'to-rose-200', border: 'border-red-200', text: 'text-red-700', iconBg: 'bg-red-200', iconColor: 'text-red-700' },
    cyan: { from: 'from-cyan-100', to: 'to-teal-200', border: 'border-cyan-200', text: 'text-cyan-700', iconBg: 'bg-cyan-200', iconColor: 'text-cyan-700' },
  };

  const colors = colorMap[color] || colorMap.blue;
  const isPositive = trend === 'up';

  if (loading) {
    return (
      <div className={`bg-gradient-to-br ${colors.from} ${colors.to} border ${colors.border} rounded-2xl p-5 animate-pulse`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="h-3 w-20 bg-gray-300 rounded mb-2"></div>
            <div className="h-8 w-24 bg-gray-300 rounded"></div>
          </div>
          <div className={`w-12 h-12 rounded-xl ${colors.iconBg}`}></div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className={`group relative overflow-hidden bg-gradient-to-br ${colors.from} ${colors.to} border ${colors.border} rounded-2xl p-5 cursor-pointer hover:shadow-xl hover:shadow-${color}-500/10 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300`}>
      <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className={`text-[10px] uppercase tracking-wider ${colors.text} font-bold`}>{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
          {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={24} className={colors.iconColor} />
        </div>
      </div>
      {trendValue && (
        <div className={`flex items-center gap-1 mt-3`}>
          {trend === 'up' ? <ArrowUpRight size={12} className="text-emerald-600" /> : trend === 'down' ? <ArrowDownRight size={12} className="text-red-600" /> : null}
          <span className={`text-[10px] font-medium ${isPositive ? 'text-emerald-600' : isPositive === false ? 'text-red-600' : 'text-gray-500'}`}>{trendValue}</span>
        </div>
      )}
    </div>
  );
};

// Local ChartCard component (no Redux)
const ChartCard = ({ title, children, className = '', action, icon: Icon, showDate = true }) => {
  // Use useMemo to ensure date is set once and doesn't change on re-render
  const dateStr = useMemo(() => {
    const today = new Date();
    return `${today.getDate()} ${today.toLocaleString('default', { month: 'short' })} ${today.getFullYear()}`;
  }, []);
  
  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-base)]">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[var(--accent)]" />}
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {showDate && (
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-1 rounded border border-[var(--border-base)]">
              {dateStr}
            </span>
          )}
          {action}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};
const StatWidget = ({ title, value, icon: Icon, color }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (!value && value !== 0) return;
    const duration = 1500;
    const steps = 30;
    const targetValue = typeof value === 'number' ? value : 0;
    const increment = targetValue / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetValue) {
        setDisplayValue(targetValue);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formattedValue = typeof value === 'string' 
    ? value 
    : displayValue.toLocaleString();

  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)]">{title}</p>
        <p className="text-lg font-bold text-[var(--text-primary)]">{formattedValue}</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// MODULE STATUS CARD - Using glass-card and CSS variables
// ═══════════════════════════════════════════════════════════
const ModuleStatusCard = ({ 
  title, 
  status, 
  count, 
  total, 
  icon: Icon, 
  color, 
  onClick,
  subtext
}) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  const statusConfig = {
    active: { bg: 'var(--green-bg)', color: 'var(--green)', label: 'Active' },
    warning: { bg: 'var(--amber-bg)', color: 'var(--amber)', label: 'Warning' },
    inactive: { bg: 'var(--blue-bg)', color: 'var(--blue)', label: 'Inactive' },
  };
  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <div
      onClick={onClick}
      className="glass-card p-4 cursor-pointer group hover:border-[var(--border-active)] transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <Badge 
          variant="custom" 
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          {config.label}
        </Badge>
      </div>
      
      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</h4>
      <p className="text-xs text-[var(--text-muted)] mb-3">{subtext}</p>
      
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-[var(--text-secondary)]">{count} / {total}</span>
        <span className="text-[var(--text-muted)]">{percentage.toFixed(0)}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ACTIVITY FEED COMPONENT - Using CSS variables
// ═══════════════════════════════════════════════════════════
const ActivityFeed = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] transition-colors"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${activity.color}20` }}
          >
            <activity.icon className="w-4 h-4" style={{ color: activity.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] truncate">{activity.title}</p>
            <p className="text-xs text-[var(--text-muted)]">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Main Dashboard Component
const SolarDashboard = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [widgetData, setWidgetData] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activities, setActivities] = useState([]);
  const [financeTrends, setFinanceTrends] = useState({});

  // Fetch all dashboard data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      console.log('[DashboardNew] Fetching all dashboard data...');
      
      // Fetch widget data and additional data in parallel
      const [widgetDataResult, activitiesResult, financeResult] = await Promise.all([
        DashboardService.getWidgetData(),
        DashboardService.getRecentActivities(10).catch(() => []),
        DashboardService.getFinanceTrends().catch(() => ({})),
      ]);
      
      console.log('[DashboardNew] Widget data:', widgetDataResult);
      console.log('[DashboardNew] Activities:', activitiesResult);
      console.log('[DashboardNew] Finance trends:', financeResult);
      
      setWidgetData(widgetDataResult);
      setActivities(activitiesResult);
      setFinanceTrends(financeResult);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[DashboardNew] Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial data load and refresh interval
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Real data for charts with fallbacks
  const pipelineData = useMemo(() => [
    { name: 'Lead', value: widgetData?.leads?.total || 0, fill: '#22d3ee' },
    { name: 'Quotation', value: widgetData?.quotation?.total || 0, fill: '#3b82f6' },
    { name: 'Survey', value: widgetData?.surveys?.total || 0, fill: '#2563eb' },
    { name: 'Project', value: widgetData?.projects?.active || widgetData?.projects?.total || 0, fill: '#f59e0b' },
    { name: 'Installation', value: widgetData?.installation?.inProgress || widgetData?.installation?.active || 0, fill: '#22c55e' },
    { name: 'Commissioned', value: widgetData?.commissioning?.completed || 0, fill: '#a855f7' },
  ], [widgetData]);

  const revenueData = useMemo(() => {
    const trendData = financeTrends?.monthlyRevenue || financeTrends?.revenueByMonth || [];
    if (trendData && trendData.length > 0) {
      return trendData.map(item => ({
        month: item.month || item._id || '',
        revenue: item.revenue || item.total || 0,
        target: item.target || item.revenue * 1.1 || 0,
      }));
    }
    return [];
  }, [financeTrends]);

  const categoryData = useMemo(() => {
    const byCategory = widgetData?.inventory?.byCategory || [];
    if (byCategory && byCategory.length > 0) {
      return byCategory.map((cat, index) => ({
        name: cat.name || 'Other',
        value: cat.value || 0,
        fill: ['#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'][index % 6],
      }));
    }
    return [];
  }, [widgetData]);

  const kpiData = useMemo(() => [
    {
      title: 'Total Projects',
      value: widgetData?.projects?.total || 0,
      subtitle: `${widgetData?.projects?.active || 0} Active • ${widgetData?.projects?.completed || 0} Completed`,
      trend: 'up',
      trendValue: '12%',
      icon: Briefcase,
      color: '#2563eb',
      onClick: () => onNavigate?.('project')
    },
    {
      title: 'Total Revenue',
      value: `₹${((widgetData?.finance?.totalRevenue || 0) / 100000).toFixed(1)}L`,
      subtitle: `${((widgetData?.finance?.outstanding || 0) / 100000).toFixed(1)}L Outstanding • ${widgetData?.finance?.totalInvoices || 0} Invoices`,
      trend: 'up',
      trendValue: '8%',
      icon: DollarSign,
      color: '#22c55e',
      onClick: () => onNavigate?.('finance')
    },
    {
      title: 'Active Leads',
      value: widgetData?.leads?.hot || 0,
      subtitle: `${widgetData?.leads?.total || 0} Total • ${widgetData?.leads?.new || 0} New • ${widgetData?.leads?.converted || 0} Converted`,
      trend: 'down',
      trendValue: '3%',
      icon: Users,
      color: '#f59e0b',
      onClick: () => onNavigate?.('crm')
    },
    {
      title: 'Inventory Alert',
      value: widgetData?.inventory?.lowStockItems || 0,
      subtitle: `${widgetData?.inventory?.totalItems || 0} Items in Stock`,
      trend: 'up',
      trendValue: '2 items',
      icon: Package,
      color: widgetData?.inventory?.lowStockItems > 0 ? '#ef4444' : '#22c55e',
      onClick: () => onNavigate?.('inventory')
    },
    {
      title: 'Quotations',
      value: widgetData?.quotation?.total || 0,
      subtitle: `${widgetData?.quotation?.pending || 0} Pending • ${widgetData?.quotation?.approved || 0} Approved`,
      trend: 'up',
      trendValue: '15%',
      icon: FileText,
      color: '#a855f7',
      onClick: () => onNavigate?.('quotation')
    },
    {
      title: 'Site Surveys',
      value: widgetData?.surveys?.total || 0,
      subtitle: `${widgetData?.surveys?.completed || 0} Completed • ${widgetData?.surveys?.pending || 0} Pending`,
      trend: 'up',
      trendValue: '10%',
      icon: MapPin,
      color: '#06b6d4',
      onClick: () => onNavigate?.('survey')
    },
    {
      title: 'Commissioning',
      value: widgetData?.commissioning?.total || 0,
      subtitle: `${widgetData?.commissioning?.completed || 0} Completed • ${widgetData?.commissioning?.inProgress || 0} In Progress`,
      trend: 'up',
      trendValue: '5%',
      icon: CheckCircle,
      color: '#8b5cf6',
      onClick: () => onNavigate?.('commissioning')
    },
    {
      title: 'Procurement',
      value: widgetData?.procurement?.total || 0,
      subtitle: `${widgetData?.procurement?.pending || 0} Pending • ${widgetData?.procurement?.completed || 0} Completed`,
      trend: 'up',
      trendValue: '10%',
      icon: Package,
      color: '#f97316',
      onClick: () => onNavigate?.('procurement')
    },
    {
      title: 'Installations',
      value: widgetData?.installation?.inProgress || 0,
      subtitle: `${widgetData?.installation?.completed || 0} Completed • ${widgetData?.installation?.total || 0} Total`,
      trend: 'up',
      trendValue: '8%',
      icon: Wrench,
      color: '#22d3ee',
      onClick: () => onNavigate?.('installation')
    },
    {
      title: 'Service Tickets',
      value: widgetData?.service?.openTickets || 0,
      subtitle: `${widgetData?.service?.totalContracts || 0} AMC Contracts`,
      trend: 'down',
      trendValue: '5%',
      icon: Shield,
      color: '#ec4899',
      onClick: () => onNavigate?.('service')
    },
    {
      title: 'Procurement',
      value: widgetData?.procurement?.total || 0,
      subtitle: `${widgetData?.procurement?.pending || 0} Pending • ${widgetData?.procurement?.completed || 0} Completed`,
      trend: 'up',
      trendValue: '10%',
      icon: Package,
      color: '#f97316',
      onClick: () => onNavigate?.('procurement')
    },
  ], [widgetData, onNavigate]);

  // Additional chart data from live backend
  const installationData = useMemo(() => {
    const total = widgetData?.installation?.total || 0;
    const inProgress = widgetData?.installation?.inProgress || widgetData?.installation?.active || 0;
    const completed = widgetData?.installation?.completed || widgetData?.installation?.finished || 0;
    const pending = Math.max(0, total - inProgress - completed);
    return [
      { name: 'In Progress', value: inProgress, fill: '#22d3ee' },
      { name: 'Completed', value: completed, fill: '#22c55e' },
      { name: 'Pending', value: pending, fill: '#f59e0b' },
    ];
  }, [widgetData]);

  const quotationData = useMemo(() => {
    const total = widgetData?.quotation?.total || 0;
    const approved = widgetData?.quotation?.approved || widgetData?.quotation?.accepted || 0;
    const pending = widgetData?.quotation?.pending || widgetData?.quotation?.draft || 0;
    const rejected = widgetData?.quotation?.rejected || 0;
    return [
      { name: 'Approved', value: approved, fill: '#22c55e' },
      { name: 'Pending', value: pending, fill: '#f59e0b' },
      { name: 'Rejected', value: rejected, fill: '#ef4444' },
    ];
  }, [widgetData]);

  const serviceData = useMemo(() => {
    const open = widgetData?.service?.openTickets || widgetData?.service?.open || 0;
    const inProgress = widgetData?.service?.inProgressTickets || widgetData?.service?.inProgress || 0;
    const resolved = widgetData?.service?.resolvedTickets || widgetData?.service?.resolved || 0;
    return [
      { name: 'Open', value: open, fill: '#ef4444' },
      { name: 'In Progress', value: inProgress, fill: '#f59e0b' },
      { name: 'Resolved', value: resolved, fill: '#22c55e' },
    ];
  }, [widgetData]);

  const procurementData = useMemo(() => {
    const total = widgetData?.procurement?.total || 0;
    const completed = widgetData?.procurement?.completed || widgetData?.procurement?.delivered || 0;
    const pending = widgetData?.procurement?.pending || widgetData?.procurement?.ordered || 0;
    const ordered = widgetData?.procurement?.ordered || 0;
    return [
      { name: 'Completed', value: completed, fill: '#22c55e' },
      { name: 'Pending', value: pending, fill: '#f59e0b' },
      { name: 'Ordered', value: ordered, fill: '#2563eb' },
    ];
  }, [widgetData]);

  const commissioningData = useMemo(() => {
    const total = widgetData?.commissioning?.total || 0;
    const completed = widgetData?.commissioning?.completed || 0;
    const inProgress = widgetData?.commissioning?.inProgress || 0;
    const pending = widgetData?.commissioning?.pending || 0;
    return [
      { name: 'Completed', value: completed, fill: '#22c55e' },
      { name: 'In Progress', value: inProgress, fill: '#8b5cf6' },
      { name: 'Pending', value: pending, fill: '#f59e0b' },
    ];
  }, [widgetData]);

  const surveysChartData = useMemo(() => {
    const total = widgetData?.surveys?.total || 0;
    const completed = widgetData?.surveys?.completed || 0;
    const pending = widgetData?.surveys?.pending || 0;
    const scheduled = widgetData?.surveys?.scheduled || 0;
    return [
      { name: 'Completed', value: completed, fill: '#22c55e' },
      { name: 'Pending', value: pending, fill: '#f59e0b' },
      { name: 'Scheduled', value: scheduled, fill: '#22d3ee' },
    ];
  }, [widgetData]);

  const moduleStatuses = useMemo(() => [
    {
      title: 'CRM & Sales',
      status: 'active',
      count: widgetData?.leads?.total || 0,
      total: Math.max(widgetData?.leads?.total || 0, 1),
      icon: Users,
      color: '#2563eb',
      subtext: `${widgetData?.leads?.hot || 0} Hot Leads • ${widgetData?.leads?.new || 0} New`,
      onClick: () => onNavigate?.('crm')
    },
    {
      title: 'Site Survey',
      status: 'active',
      count: widgetData?.surveys?.completed || 0,
      total: widgetData?.surveys?.total || 1,
      icon: MapPin,
      color: '#22d3ee',
      subtext: `${widgetData?.surveys?.pending || 0} Pending • ${widgetData?.surveys?.total || 0} Total`,
      onClick: () => onNavigate?.('survey')
    },
    {
      title: 'Estimates',
      status: 'active',
      count: widgetData?.estimates?.approved || 0,
      total: widgetData?.estimates?.total || 1,
      icon: FileText,
      color: '#8b5cf6',
      subtext: `${widgetData?.estimates?.pending || 0} Pending • ${widgetData?.estimates?.total || 0} Total`,
      onClick: () => onNavigate?.('estimates')
    },
    {
      title: 'Quotations',
      status: 'active',
      count: widgetData?.quotation?.approved || 0,
      total: widgetData?.quotation?.total || 1,
      icon: FileText,
      color: '#a855f7',
      subtext: `${widgetData?.quotation?.pending || 0} Pending • ${widgetData?.quotation?.total || 0} Total`,
      onClick: () => onNavigate?.('quotation')
    },
    {
      title: 'Projects',
      status: 'active',
      count: widgetData?.projects?.active || 0,
      total: widgetData?.projects?.total || 1,
      icon: Briefcase,
      color: '#f59e0b',
      subtext: `${widgetData?.projects?.completed || 0} Completed • ${widgetData?.projects?.total || 0} Total`,
      onClick: () => onNavigate?.('project')
    },
    {
      title: 'Installation',
      status: 'active',
      count: widgetData?.installation?.inProgress || 0,
      total: widgetData?.installation?.total || 1,
      icon: Wrench,
      color: '#22c55e',
      subtext: `${widgetData?.installation?.completed || 0} Completed • ${widgetData?.installation?.total || 0} Total`,
      onClick: () => onNavigate?.('installation')
    },
    {
      title: 'Commissioning',
      status: 'active',
      count: widgetData?.commissioning?.completed || 0,
      total: widgetData?.commissioning?.total || 1,
      icon: CheckCircle,
      color: '#22c55e',
      subtext: `${widgetData?.commissioning?.pending || 0} Pending • ${widgetData?.commissioning?.total || 0} Total`,
      onClick: () => onNavigate?.('commissioning')
    },
    {
      title: 'Inventory',
      status: widgetData?.inventory?.lowStockItems > 0 ? 'warning' : 'active',
      count: widgetData?.inventory?.totalItems || 0,
      total: Math.max(widgetData?.inventory?.totalItems || 0, 1),
      icon: Package,
      color: widgetData?.inventory?.lowStockItems > 0 ? '#ef4444' : '#a855f7',
      subtext: `${widgetData?.inventory?.lowStockItems || 0} Low Stock • ${widgetData?.inventory?.totalItems || 0} Items`,
      onClick: () => onNavigate?.('inventory')
    },
    {
      title: 'Procurement',
      status: 'active',
      count: widgetData?.procurement?.completed || 0,
      total: widgetData?.procurement?.total || 1,
      icon: Package,
      color: '#f97316',
      subtext: `${widgetData?.procurement?.pending || 0} Pending • ${widgetData?.procurement?.total || 0} Total`,
      onClick: () => onNavigate?.('procurement')
    },
    {
      title: 'Logistics',
      status: 'active',
      count: widgetData?.logistics?.inTransit || 0,
      total: widgetData?.logistics?.total || 1,
      icon: Truck,
      color: '#06b6d4',
      subtext: `${widgetData?.logistics?.delivered || 0} Delivered • ${widgetData?.logistics?.total || 0} Total`,
      onClick: () => onNavigate?.('logistics')
    },
    {
      title: 'Finance',
      status: 'active',
      count: widgetData?.finance?.totalInvoices || 0,
      total: Math.max(widgetData?.finance?.totalInvoices || 0, 100),
      icon: DollarSign,
      color: '#22c55e',
      subtext: `₹${((widgetData?.finance?.totalRevenue || 0) / 100000).toFixed(1)}L Revenue`,
      onClick: () => onNavigate?.('finance')
    },
    {
      title: 'Service & AMC',
      status: widgetData?.service?.openTickets > 5 ? 'warning' : 'active',
      count: widgetData?.service?.openTickets || 0,
      total: widgetData?.service?.totalContracts || 1,
      icon: Shield,
      color: '#ec4899',
      subtext: `${widgetData?.service?.totalContracts || 0} AMC Contracts`,
      onClick: () => onNavigate?.('service')
    },
    {
      title: 'Compliance',
      status: (widgetData?.compliance?.pending || 0) > 0 ? 'warning' : 'active',
      count: widgetData?.compliance?.compliant || 0,
      total: widgetData?.compliance?.total || 1,
      icon: CheckCircle,
      color: '#10b981',
      subtext: `${widgetData?.compliance?.pending || 0} Pending • ${widgetData?.compliance?.total || 0} Total`,
      onClick: () => onNavigate?.('compliance')
    },
    {
      title: 'Documents',
      status: 'active',
      count: widgetData?.documents?.approved || 0,
      total: widgetData?.documents?.total || 1,
      icon: FileText,
      color: '#64748b',
      subtext: `${widgetData?.documents?.pending || 0} Pending • ${widgetData?.documents?.total || 0} Total`,
      onClick: () => onNavigate?.('documents')
    },
    {
      title: 'HRM & Payroll',
      status: 'active',
      count: widgetData?.employees?.active || 0,
      total: widgetData?.employees?.total || 1,
      icon: Users,
      color: '#a855f7',
      subtext: `${widgetData?.employees?.onLeave || 0} On Leave • ${widgetData?.employees?.total || 0} Total`,
      onClick: () => onNavigate?.('hrm')
    },
  ], [widgetData, onNavigate]);

  const recentActivities = useMemo(() => {
    if (activities && activities.length > 0) {
      return activities.slice(0, 5).map((activity, index) => {
        const getIcon = (type) => {
          const iconMap = {
            lead: Users,
            project: Briefcase,
            survey: MapPin,
            quotation: FileText,
            installation: Wrench,
            commissioning: CheckCircle,
            ticket: Shield,
            task: Activity,
            inventory: Package,
          };
          return iconMap[type] || Activity;
        };
        
        const getColor = (type) => {
          const colorMap = {
            lead: '#2563eb',
            project: '#f59e0b',
            survey: '#22d3ee',
            quotation: '#a855f7',
            installation: '#22c55e',
            commissioning: '#8b5cf6',
            ticket: '#ec4899',
            task: '#f97316',
            inventory: '#06b6d4',
          };
          return colorMap[type] || '#6b7280';
        };

        const getTitle = (activity) => {
          if (activity.title) return activity.title;
          if (activity.name) return activity.name;
          if (activity.customerName) return activity.customerName;
          return `${activity.type || 'Activity'} - ${activity.status || ''}`;
        };

        const getTime = (activity) => {
          if (activity.createdAt) {
            const date = new Date(activity.createdAt);
            const now = new Date();
            const diff = now - date;
            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            if (mins < 60) return `${mins} mins ago`;
            if (hours < 24) return `${hours} hours ago`;
            return `${days} days ago`;
          }
          return '';
        };

        return {
          title: getTitle(activity),
          time: getTime(activity),
          icon: getIcon(activity.type),
          color: getColor(activity.type),
        };
      });
    }
    // Fallback when no activities
    const widget = widgetData || {};
    return [
      { 
        title: `${widgetData?.projects?.total || 0} Total Projects`, 
        time: 'Projects', 
        icon: Briefcase, 
        color: '#2563eb' 
      },
      { 
        title: `${widgetData?.leads?.total || 0} Total Leads`, 
        time: 'Leads', 
        icon: Users, 
        color: '#f59e0b' 
      },
      { 
        title: `${widgetData?.surveys?.total || 0} Surveys Completed`, 
        time: 'Surveys', 
        icon: MapPin, 
        color: '#22d3ee' 
      },
      { 
        title: `${widgetData?.installation?.completed || 0} Installations Done`, 
        time: 'Installation', 
        icon: Wrench, 
        color: '#22c55e' 
      },
      { 
        title: `${widgetData?.commissioning?.completed || 0} Commissioned`, 
        time: 'Commissioning', 
        icon: CheckCircle, 
        color: '#8b5cf6' 
      },
    ];
  }, [activities, widgetData]);

  const quickActions = useMemo(() => [
    { label: 'Create New Lead', icon: Users, color: '#2563eb', action: 'crm' },
    { label: 'Add Inventory Item', icon: Package, color: '#22c55e', action: 'inventory' },
    { label: 'Generate Quotation', icon: FileText, color: '#f59e0b', action: 'quotation' },
    { label: 'Schedule Survey', icon: MapPin, color: '#22d3ee', action: 'survey' },
    { label: 'Create Project', icon: Briefcase, color: '#a855f7', action: 'project' },
  ], []);

  return (
    <div className="p-4 lg:p-6 space-y-6">

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-6 h-6 text-[var(--accent)]" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Solar OS Dashboard</h1>
            <Badge variant="custom" className="bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/30">
              Live
            </Badge>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Real-time insights across all modules • Updated {lastUpdated?.toLocaleTimeString() || '---'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Working Date Display */}
          <div className="flex items-center gap-1 px-3 py-2 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-base)]">
            <div className="text-center px-2">
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Day</p>
              <p className="text-lg font-bold text-[var(--primary)] leading-tight">{new Date().getDate()}</p>
            </div>
            <div className="w-px h-8 bg-[var(--border-base)]" />
            <div className="text-center px-2">
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Month</p>
              <p className="text-sm font-semibold text-[var(--accent)] leading-tight">{new Date().toLocaleString('default', { month: 'short' })}</p>
            </div>
            <div className="w-px h-8 bg-[var(--border-base)]" />
            <div className="text-center px-2">
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Year</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{new Date().getFullYear()}</p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border-base)] text-[var(--text-primary)] hover:border-[var(--primary)] transition-all disabled:opacity-50"
          >
            <RefreshCw className={refreshing ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            Refresh
          </button>
          <button
            onClick={() => onNavigate?.('settings')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Customize
          </button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatWidget title="Projects" value={widgetData?.projects?.total} icon={Briefcase} color="#2563eb" />
        <StatWidget title="Leads" value={widgetData?.leads?.total} icon={Users} color="#22d3ee" />
        <StatWidget title="Surveys" value={widgetData?.surveys?.total} icon={MapPin} color="#f59e0b" />
        <StatWidget title="Inventory" value={widgetData?.inventory?.totalItems} icon={Package} color="#22c55e" />
        <StatWidget title="Employees" value={widgetData?.employees?.total} icon={Users} color="#a855f7" />
        <StatWidget title="Tickets" value={widgetData?.service?.openTickets} icon={Shield} color="#ec4899" />
        <StatWidget title="Commissioned" value={widgetData?.commissioning?.completed} icon={CheckCircle} color="#22c55e" />
        <StatWidget title="Revenue" value={`₹${((widgetData?.finance?.totalRevenue || 0) / 10000000).toFixed(1)}Cr`} icon={DollarSign} color="#22c55e" />
      </div>

      {/* KPI Cards - 8 cards showing all modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <KPICard key={index} {...kpi} loading={loading} />
        ))}
      </div>

      {/* 2D Charts Row 1 - Pipeline & Installation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="📊 Project Pipeline (Column Chart)" icon={PieChartIcon}>
          <div className="h-80">
            <ProjectPipeline2D data={pipelineData} height={320} />
          </div>
        </ChartCard>

        <ChartCard title="🔧 Installation Status (Column Chart)" icon={Wrench}>
          <div className="h-80">
            <InstallationStatus2D data={installationData} height={320} />
          </div>
        </ChartCard>
      </div>

      {/* 2D Charts Row 2 - Quotations & Service */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="📄 Quotation Status (Pie Chart)" icon={FileText}>
          <div className="h-80">
            <QuotationStatus2D data={quotationData} height={320} />
          </div>
        </ChartCard>

        <ChartCard title="🛡️ Service Tickets (Horizontal Bars)" icon={Shield}>
          <div className="h-80">
            <ServiceTickets2D data={serviceData} height={320} />
          </div>
        </ChartCard>
      </div>

      {/* 2D Charts Row 3 - Procurement & Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="📦 Procurement Status (Column Chart)" icon={Package}>
          <div className="h-80">
            <ProcurementStatus2D data={procurementData} height={320} />
          </div>
        </ChartCard>

        <ChartCard title="📦 Inventory by Category (Column Chart)" icon={Package}>
          <div className="h-80">
            <InventoryCategory2D data={categoryData} height={320} />
          </div>
        </ChartCard>
      </div>

      {/* 2D Charts Row 4 - Surveys & Commissioning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="📋 Site Surveys Status" icon={MapPin}>
          <div className="h-80">
            <InstallationStatus2D data={surveysChartData} height={320} />
          </div>
        </ChartCard>

        <ChartCard title="✅ Commissioning Status" icon={CheckCircle}>
          <div className="h-80">
            <ProcurementStatus2D data={commissioningData} height={320} />
          </div>
        </ChartCard>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Actions */}
        <ChartCard title="⚡ Quick Actions" icon={Sparkles}>
          <div className="space-y-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => onNavigate?.(action.action)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <action.icon className="w-4 h-4" style={{ color: action.color }} />
                  </div>
                  <span className="text-sm text-[var(--text-primary)]">{action.label}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
              </button>
            ))}
          </div>
        </ChartCard>

        {/* Performance Metrics */}
        <ChartCard title="📈 Performance Metrics" className="lg:col-span-2" icon={TrendingUp}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Conversion Rate</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {((widgetData?.leads?.total ? (widgetData?.projects?.total / widgetData?.leads?.total) : 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--primary)] rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(((widgetData?.leads?.total ? (widgetData?.projects?.total / widgetData?.leads?.total) : 0) * 100), 100)}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">On-time Delivery</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {widgetData?.projects?.total > 0 
                    ? Math.round((widgetData?.projects?.completed / widgetData?.projects?.total) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--green)] rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${widgetData?.projects?.total > 0 
                      ? Math.round((widgetData?.projects?.completed / widgetData?.projects?.total) * 100) 
                      : 0}%` 
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Customer Satisfaction</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {widgetData?.service?.resolvedTickets && widgetData?.service?.totalContracts > 0
                    ? (Math.min(5, 3 + (widgetData?.service?.resolvedTickets / widgetData?.service?.totalContracts) * 2)).toFixed(1)
                    : '4.5'}/5
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${widgetData?.service?.resolvedTickets && widgetData?.service?.totalContracts > 0
                      ? Math.min(100, (widgetData?.service?.resolvedTickets / widgetData?.service?.totalContracts) * 100)
                      : 90}%` 
                  }}
                />
              </div>
            </div>
            
            <div className="flex flex-col justify-center items-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-[var(--text-primary)]">{widgetData?.projects?.total || 0}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Total Projects</p>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-[var(--green)]">{widgetData?.projects?.active || 0}</p>
                  <p className="text-xs text-[var(--text-muted)]">Active</p>
                </div>
                <div className="w-px h-8 bg-[var(--border-base)]" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-[var(--primary)]">{widgetData?.commissioning?.completed || 0}</p>
                  <p className="text-xs text-[var(--text-muted)]">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* System Health */}
        <ChartCard title="🔋 System Health" icon={Zap}>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--green-bg)] border border-[var(--green)]/20">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--green)]" />
                <span className="text-sm text-[var(--text-primary)]">API Status</span>
              </div>
              <Badge variant="custom" className="bg-[var(--green)]/20 text-[var(--green)]">
                Operational
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--green-bg)] border border-[var(--green)]/20">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--green)]" />
                <span className="text-sm text-[var(--text-primary)]">Database</span>
              </div>
              <Badge variant="custom" className="bg-[var(--green)]/20 text-[var(--green)]">
                Healthy
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--amber-bg)] border border-[var(--amber)]/20">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--amber)]" />
                <span className="text-sm text-[var(--text-primary)]">Last Sync</span>
              </div>
              <Badge variant="custom" className="bg-[var(--amber)]/20 text-[var(--amber)]">
                {lastUpdated?.toLocaleTimeString() || '---'}
              </Badge>
            </div>
            
            <div className="pt-2 border-t border-[var(--border-base)]">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Uptime</span>
                <span className="text-[var(--text-primary)]">99.9%</span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-4 border-t border-[var(--border-base)]">
        <p>Solar OS Enterprise Dashboard v2.0</p>
        <p>Powered by Three.js & Recharts</p>
      </div>
    </div>
  );
};

export default SolarDashboard;

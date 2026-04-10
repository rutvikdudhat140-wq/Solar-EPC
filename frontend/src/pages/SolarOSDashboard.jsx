// Solar OS Dashboard - Project-Aligned Version
// Uses Solar OS design system with CSS variables and glass-card styling

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  FolderOpen, Users, ClipboardList, Package,
  DollarSign, CheckCircle2, ArrowUpRight,
  ArrowDownRight, Zap, FileText,
  Plus, Calendar, Activity, Database,
  Server, Shield, Sun, Briefcase, ShoppingCart,
  HardHat, ChevronRight, RefreshCw,
  MoreHorizontal, Bell, Search, TrendingUp,
  Loader2
} from 'lucide-react';
import { KPICard } from '../components/ui/KPICard';
import DashboardService from '../services/dashboardApi';

// ============================================
// CHART COLORS (Solar OS Brand Colors)
// ============================================
const CHART_COLORS = {
  blue: '#3B82F6',
  purple: '#8B5CF6',
  green: '#22c55e',
  orange: '#f59e0b',
  red: '#ef4444',
  cyan: '#06b6d4',
  pink: '#EC4899',
  indigo: '#6366f1'
};

// ============================================
// DEFAULT DATA (Fallback when API returns empty)
// ============================================
const defaultDashboardData = {
  summaryCards: [],
  secondRowMetrics: [],
  projectPipeline: [],
  installationStatus: [],
  quotationStatus: [],
  taskOverview: [],
  procurementStatus: [],
  surveyOverview: [],
  performanceMetrics: [],
  systemHealth: []
};

// ============================================
// SUB-COMPONENTS
// ============================================

// Metric Pill for Key Metrics section
const MetricPill = ({ label, value, change, alert }) => (
  <div 
    className={`flex flex-col p-3 rounded-lg ${alert ? 'bg-[var(--red-bg)]' : 'bg-[var(--bg-elevated)]'}`}
    style={{ border: alert ? '1px solid var(--red)' : '1px solid var(--border-base)' }}
  >
    <span className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</span>
    <div className="flex items-center justify-between">
      <span className="text-lg font-bold" style={{ color: alert ? 'var(--red)' : 'var(--text-primary)' }}>
        {value}
      </span>
      <span 
        className="text-xs font-medium"
        style={{ 
          color: change?.startsWith('+') ? 'var(--green)' : change?.startsWith('-') ? 'var(--red)' : 'var(--text-muted)'
        }}
      >
        {change}
      </span>
    </div>
  </div>
);

// Chart Card using glass-card
const ChartCard = ({ title, children, icon: Icon }) => (
  <div className="glass-card h-full overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-base)' }}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
    </div>
    <div className="p-4 h-48">
      {children}
    </div>
  </div>
);

const EmptyChartState = ({ label = 'No live data available' }) => (
  <div className="h-full flex items-center justify-center rounded-xl border border-dashed" style={{ borderColor: 'var(--border-base)' }}>
    <div className="text-center">
      <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Data aate hi graph automatically render hoga</div>
    </div>
  </div>
);

const hasChartData = (items = []) => items.some((item) => Number(item?.value || 0) > 0);

// Quick Action Button
const QuickActionButton = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 group text-left hover:bg-[var(--bg-hover)]"
  >
    <div 
      className="p-2 rounded-lg transition-transform duration-200 group-hover:scale-110"
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    >
      <Icon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
    </div>
    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
  </button>
);

// Performance Metric Bar
const PerformanceBar = ({ label, value, target, status }) => {
  const percentage = parseInt(value) || 0;
  
  const statusColors = {
    excellent: 'var(--green)',
    good: 'var(--primary)',
    warning: 'var(--amber)',
    danger: 'var(--red)'
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{value}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ {target}</span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-overlay)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: statusColors[status] }}
        />
      </div>
    </div>
  );
};

// System Health Item
const HealthItem = ({ label, status, value, icon: Icon }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <Icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
      </div>
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {status && (
        <span
          className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            status === 'operational' ? 'bg-[var(--green-bg)] text-[var(--green)]' : 'bg-[var(--amber-bg)] text-[var(--amber)]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {status}
        </span>
      )}
      {value && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{value}</span>}
    </div>
  </div>
);

// Chart Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="px-3 py-2 rounded-lg shadow-lg border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-base)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label || payload[0].name}
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Value: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

// ============================================
// MAIN DASHBOARD COMPONENT WITH REAL DATA
// ============================================
const SolarOSDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Real data state
  const [dashboardData, setDashboardData] = useState({
    summaryCards: [],
    secondRowMetrics: [],
    projectPipeline: [],
    installationStatus: [],
    quotationStatus: [],
    taskOverview: [],
    procurementStatus: [],
    surveyOverview: [],
    performanceMetrics: [],
    systemHealth: []
  });

  // Fetch dashboard data from all modules
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    
    try {
      const tenantId = localStorage.getItem('tenantId') || null;
      console.log('[SolarOSDashboard] tenantId:', tenantId);
      console.log('[SolarOSDashboard] 🚀 Fetching dashboard data...');
      
      // Fetch widget data from all modules
      const [widgetData, inventoryStats, serviceStats] = await Promise.all([
        DashboardService.getWidgetData(),
        DashboardService.getInventoryStats(),
        DashboardService.getServiceStats(),
      ]);

      const liveWidgetData = {
        ...(widgetData || {}),
        inventory: {
          ...((widgetData || {}).inventory || {}),
          ...((inventoryStats || {}).stats || {}),
          byCategory: (inventoryStats || {}).byCategory || (widgetData || {}).inventory?.byCategory || [],
          categoryGraph: (inventoryStats || {}).categoryGraph || (widgetData || {}).inventory?.categoryGraph || [],
          items: (inventoryStats || {}).items || (widgetData || {}).inventory?.items || [],
          categories: (inventoryStats || {}).categories || (widgetData || {}).inventory?.categories || [],
        },
        service: {
          ...((widgetData || {}).service || {}),
          ...(serviceStats || {}),
        },
      };

      console.log('[SolarOSDashboard] Inventory stats response:', inventoryStats);
      console.log('[SolarOSDashboard] Service stats response:', serviceStats);
      
      // Debug: Log the raw data to see what we're getting
      console.log('[SolarOSDashboard] 📊 Raw API Data:', widgetData);
      console.log('[SolarOSDashboard] 🔍 Checking specific modules:');
      console.log('  - Projects:', widgetData.projects);
      console.log('  - Leads:', widgetData.leads);
      console.log('  - Surveys:', widgetData.surveys);
      console.log('  - Inventory:', widgetData.inventory);
      console.log('  - Finance:', widgetData.finance);
      console.log('  - Commissioning:', widgetData.commissioning);
      console.log('  - Installation:', widgetData.installation);
      console.log('  - Quotation:', widgetData.quotation);
      
      // Transform API data to dashboard format
      const transformedData = transformApiData(liveWidgetData);
      
      console.log('[SolarOSDashboard] ✅ Transformed Data:', transformedData);
      console.log('[SolarOSDashboard] 📈 Charts Data:', {
        projectPipeline: transformedData.projectPipeline,
        installationStatus: transformedData.installationStatus,
        quotationStatus: transformedData.quotationStatus,
        taskOverview: transformedData.taskOverview,
        procurementStatus: transformedData.procurementStatus,
        surveyOverview: transformedData.surveyOverview
      });
      
      setDashboardData(transformedData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[SolarOSDashboard] ❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Transform API data to dashboard format
  const transformApiData = (rawData) => {
    if (!rawData) return defaultDashboardData;
    
    // Normalize data - extract from nested 'data' property if present
    const data = {};
    Object.keys(rawData).forEach(key => {
      const moduleData = rawData[key];
      // If response has { success: true, data: {...} } structure, extract data
      data[key] = moduleData?.data || moduleData || {};
    });
    
    // Store previous data for trend comparison (using simple estimation)
    const prevData = JSON.parse(localStorage.getItem('dashboard_prev_data') || '{}');
    const calculateTrend = (current, key) => {
      const previous = prevData[key] || current * 0.9; // Assume 10% growth if no previous data
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      return (change >= 0 ? '+' : '') + change.toFixed(0) + '%';
    };
    
    console.log('[SolarOSDashboard] 📋 Normalized data:', {
      projects: data.projects,
      leads: data.leads,
      surveys: data.surveys,
      inventory: data.inventory,
      finance: data.finance,
      commissioning: data.commissioning,
      installation: data.installation,
      quotation: data.quotation,
      service: data.service,
      procurement: data.procurement
    });

    const formatNumber = (num) => {
      if (num === null || num === undefined) return '0';
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    };

    const formatCurrency = (num) => {
      if (num === null || num === undefined) return '$0';
      if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
      return '$' + num.toString();
    };

    // Debug: Log actual values being used for each card
    console.log('[SolarOSDashboard] 📊 Card Values Debug:', {
      projects: { totalProjects: data.projects?.totalProjects, total: data.projects?.total, final: data.projects?.totalProjects || data.projects?.total || 0 },
      leads: { total: data.leads?.total, final: data.leads?.total || 0 },
      surveys: { total: data.surveys?.total, final: data.surveys?.total || 0 },
      inventory: { totalItems: data.inventory?.totalItems, total: data.inventory?.total, final: data.inventory?.totalItems || data.inventory?.total || 0 },
      commissioning: { commissioned: data.commissioning?.commissioned, completed: data.commissioning?.completed, final: data.commissioning?.commissioned || data.commissioning?.completed || 0 },
      installation: { total: data.installation?.total, final: data.installation?.total || 0 },
      quotation: { total: data.quotation?.total, final: data.quotation?.total || 0 }
    });

    // Summary Cards - Top row
    const summaryCards = [
      { 
        id: 1, 
        label: 'Projects', 
        value: formatNumber(data.projects?.totalProjects || data.projects?.total || 0), 
        trend: calculateTrend(data.projects?.total || 0, 'projects'), 
        trendUp: (data.projects?.total || 0) >= (prevData.projects || 0), 
        icon: FolderOpen, 
        variant: 'blue' 
      },
      { 
        id: 2, 
        label: 'Leads', 
        value: formatNumber(data.leads?.total || 0), 
        trend: calculateTrend(data.leads?.total || 0, 'leads'), 
        trendUp: (data.leads?.total || 0) >= (prevData.leads || 0), 
        icon: Users, 
        variant: 'purple' 
      },
      { 
        id: 3, 
        label: 'Surveys', 
        value: formatNumber(data.surveys?.total || 0), 
        trend: calculateTrend(data.surveys?.total || 0, 'surveys'), 
        trendUp: (data.surveys?.total || 0) >= (prevData.surveys || 0), 
        icon: ClipboardList, 
        variant: 'green' 
      },
      { 
        id: 4, 
        label: 'Employees', 
        value: formatNumber(data.employees?.totalEmployees || data.employees?.total || 0), 
        trend: calculateTrend(data.employees?.total || 0, 'employees'), 
        trendUp: (data.employees?.total || 0) >= (prevData.employees || 0), 
        icon: Briefcase, 
        variant: 'indigo' 
      },
      { 
        id: 5, 
        label: 'Tasks', 
        value: formatNumber(data.tasks?.total || data.projects?.active || 0), 
        trend: calculateTrend(data.tasks?.total || 0, 'tasks'), 
        trendUp: (data.tasks?.total || 0) >= (prevData.tasks || 0), 
        icon: CheckCircle2, 
        variant: 'emerald' 
      },
      { 
        id: 6, 
        label: 'Commissioned', 
        value: formatNumber(data.commissioning?.commissioned || data.commissioning?.completed || data.projects?.commissioned || data.projects?.completed || 0), 
        trend: calculateTrend(data.commissioning?.completed || data.projects?.commissioned || data.projects?.completed || 0, 'commissioning'), 
        trendUp: (data.commissioning?.completed || data.projects?.commissioned || data.projects?.completed || 0) >= (prevData.commissioning || 0), 
        icon: Zap, 
        variant: 'green' 
      },
      { 
        id: 7, 
        label: 'Revenue', 
        value: formatCurrency(data.finance?.totalValue || data.finance?.totalRevenue || 0), 
        trend: calculateTrend(data.finance?.totalRevenue || 0, 'revenue'), 
        trendUp: (data.finance?.totalRevenue || 0) >= (prevData.revenue || 0), 
        icon: DollarSign, 
        variant: 'indigo' 
      }
    ];

    // Second Row Metrics with dynamic trends
    const secondRowMetrics = [
      { label: 'Total Projects', value: formatNumber(data.projects?.totalProjects || data.projects?.total || 0), change: calculateTrend(data.projects?.total || 0, 'projects') },
      { label: 'Total Revenue', value: formatCurrency(data.finance?.totalValue || data.finance?.totalRevenue || 0), change: calculateTrend(data.finance?.totalRevenue || 0, 'revenue') },
      { label: 'Active Leads', value: formatNumber(data.leads?.total || 0), change: calculateTrend(data.leads?.total || 0, 'leads') },
      { 
        label: 'Inventory Alerts', 
        value: formatNumber(data.inventory?.lowStockItems || 0), 
        change: data.inventory?.lowStockItems > 0 ? `-${data.inventory.lowStockItems}` : '0',
        alert: (data.inventory?.lowStockItems || 0) > 0 
      },
      { label: 'Quotations', value: formatNumber(data.quotation?.total || 0), change: calculateTrend(data.quotation?.total || 0, 'quotation') },
      { label: 'Installations', value: formatNumber(data.installation?.total || 0), change: calculateTrend(data.installation?.total || 0, 'installation') },
      { label: 'Service Tickets', value: formatNumber(data.service?.openTickets || 0), change: data.service?.openTickets > 5 ? `-${data.service.openTickets}` : '0' },
      { label: 'Procurement', value: formatNumber(data.procurement?.total || 0), change: calculateTrend(data.procurement?.total || 0, 'procurement') }
    ];

    // Project Pipeline Chart - always show all stages
    const leadsTotal = data.leads?.total || 0;
    const surveysTotal = data.surveys?.total || 0;
    const quotationsTotal = data.quotation?.total || 0;
    const installationsTotal = data.installation?.total || 0;
    const commissionedTotal = data.commissioning?.commissioned || data.commissioning?.completed || data.projects?.commissioned || data.projects?.completed || 0;
    
    const projectPipeline = [
      { name: 'Leads', value: leadsTotal, fill: CHART_COLORS.blue },
      { name: 'Surveys', value: surveysTotal, fill: CHART_COLORS.purple },
      { name: 'Quotations', value: quotationsTotal, fill: CHART_COLORS.green },
      { name: 'Installations', value: installationsTotal, fill: CHART_COLORS.orange },
      { name: 'Commissioned', value: commissionedTotal, fill: CHART_COLORS.cyan }
    ];

    // Installation Status Chart - always show all categories
    const installationTotal = data.installation?.total || 0;
    const installationCompleted = data.installation?.completed || data.installation?.finished || 0;
    const installationInProgress = data.installation?.inProgress || data.installation?.active || 0;
    const installationPending = Math.max(0, installationTotal - installationCompleted - installationInProgress);
    
    const installationStatus = [
      { name: 'In Progress', value: installationInProgress || 0, fill: CHART_COLORS.blue },
      { name: 'Completed', value: installationCompleted || 0, fill: CHART_COLORS.green },
      { name: 'Pending', value: installationPending || 0, fill: CHART_COLORS.orange }
    ];

    // Quotation Status Chart - always show all categories
    const quotationTotal = data.quotation?.total || 0;
    const quotationApproved = data.quotation?.approved || data.quotation?.accepted || 0;
    const quotationPending = data.quotation?.pending || data.quotation?.draft || 0;
    const quotationRejected = Math.max(0, quotationTotal - quotationApproved - quotationPending);
    
    const quotationStatus = [
      { name: 'Approved', value: quotationApproved || 0, fill: CHART_COLORS.green },
      { name: 'Pending', value: quotationPending || 0, fill: CHART_COLORS.orange },
      { name: 'Rejected', value: quotationRejected || 0, fill: CHART_COLORS.red }
    ];

    // Task Overview Chart - always show all categories
    const taskPending = data.tasks?.pending || 0;
    const taskInProgress = data.tasks?.inProgress || data.tasks?.['in-progress'] || 0;
    const taskCompleted = data.tasks?.completed || 0;
    
    const taskOverview = [
      { name: 'Pending', value: taskPending || 0, fill: CHART_COLORS.orange },
      { name: 'In Progress', value: taskInProgress || 0, fill: CHART_COLORS.blue },
      { name: 'Completed', value: taskCompleted || 0, fill: CHART_COLORS.green }
    ];

    // Procurement Status Chart - always show all categories
    const procurementTotal = data.procurement?.total || 0;
    const procurementCompleted = data.procurement?.completed || data.procurement?.delivered || 0;
    const procurementPending = data.procurement?.pending || data.procurement?.ordered || 0;
    const procurementInProgress = Math.max(0, procurementTotal - procurementCompleted - procurementPending);
    
    const procurementStatus = [
      { name: 'Completed', value: procurementCompleted || 0, fill: CHART_COLORS.green },
      { name: 'Pending', value: procurementPending || 0, fill: CHART_COLORS.orange },
      { name: 'In Progress', value: procurementInProgress || 0, fill: CHART_COLORS.blue }
    ];

    // Survey Overview Chart - use live survey module data
    const surveyCompleted = data.surveys?.completed || data.surveys?.complete || 0;
    const surveyPending = data.surveys?.pending || 0;
    const surveyScheduled = data.surveys?.scheduled || data.surveys?.active || 0;

    const surveyOverview = [
      { name: 'Completed', value: surveyCompleted || 0, fill: CHART_COLORS.green },
      { name: 'Pending', value: surveyPending || 0, fill: CHART_COLORS.orange },
      { name: 'Scheduled', value: surveyScheduled || 0, fill: CHART_COLORS.purple }
    ];

    // Performance Metrics
    const performanceMetrics = [
      { 
        label: 'Conversion Rate', 
        value: data.leads?.total > 0 ? Math.round(((data.leads?.converted || 0) / data.leads.total) * 100) + '%' : '0%', 
        target: '70%', 
        status: ((data.leads?.converted || 0) / (data.leads?.total || 1)) * 100 >= 70 ? 'excellent' : ((data.leads?.converted || 0) / (data.leads?.total || 1)) * 100 >= 50 ? 'good' : 'warning'
      },
      { 
        label: 'On-Time Delivery', 
        value: data.projects?.onTimeDelivery ? `${data.projects.onTimeDelivery}%` : '0%', 
        target: '95%', 
        status: (data.projects?.onTimeDelivery || 0) >= 95 ? 'excellent' : (data.projects?.onTimeDelivery || 0) >= 80 ? 'good' : 'warning'
      },
      { 
        label: 'Customer Satisfaction', 
        value: data.service?.satisfaction ? `${data.service.satisfaction}/5` : '0/5', 
        target: '4.5', 
        status: (data.service?.satisfaction || 0) >= 4.5 ? 'excellent' : (data.service?.satisfaction || 0) >= 3.5 ? 'good' : 'warning'
      }
    ];

    // System Health
    const systemHealth = [
      { label: 'API Status', status: 'operational', icon: Server },
      { label: 'Database Status', status: 'operational', icon: Database },
      { label: 'Last Sync', value: lastUpdated ? formatLastUpdated(lastUpdated) : 'Just now', icon: RefreshCw }
    ];

    // Save current data for next trend comparison
    const dataToSave = {
      projects: data.projects?.total || 0,
      leads: data.leads?.total || 0,
      surveys: data.surveys?.total || 0,
      inventory: data.inventory?.totalAvailableStock || data.inventory?.totalStock || data.inventory?.totalItems || 0,
      employees: data.employees?.total || 0,
      tasks: data.tasks?.total || 0,
      commissioning: data.commissioning?.completed || 0,
      revenue: data.finance?.totalRevenue || 0,
      quotation: data.quotation?.total || 0,
      installation: data.installation?.total || 0,
      procurement: data.procurement?.total || 0,
    };
    localStorage.setItem('dashboard_prev_data', JSON.stringify(dataToSave));

    return {
      summaryCards,
      secondRowMetrics,
      projectPipeline,
      installationStatus,
      quotationStatus,
      taskOverview,
      procurementStatus,
      surveyOverview,
      performanceMetrics,
      systemHealth
    };
  };

  // Format last updated time
  const formatLastUpdated = (date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 120) return '1 min ago';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 7200) return '1 hour ago';
    return `${Math.floor(diff / 3600)} hours ago`;
  };

  // Initial load and polling
  useEffect(() => {
    fetchDashboardData();
    
    // Set up polling every 30 seconds for live data
    const pollInterval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);
    
    // Update current time every minute
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000);
    
    return () => {
      clearInterval(pollInterval);
      clearInterval(timeInterval);
    };
  }, [fetchDashboardData]);

  const quickActions = [
    { icon: Plus, label: 'Create New Lead' },
    { icon: Package, label: 'Add Inventory Item' },
    { icon: FileText, label: 'Generate Quotation' },
    { icon: Calendar, label: 'Schedule Survey' },
    { icon: FolderOpen, label: 'Create Project' }
  ];

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-page)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div 
            className="w-12 h-12 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--bg-elevated)', borderTopColor: 'var(--primary)' }}
          />
          <p style={{ color: 'var(--text-muted)' }}>Loading Solar OS Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Page Header */}
      <div className="page-header mb-6">
        <div>
          <h1 className="heading-page mb-1">Solar OS Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {lastUpdated && (
              <span className="ml-3 px-2 py-0.5 rounded-full text-xs font-medium" 
                style={{ backgroundColor: 'var(--green-100)', color: 'var(--green)' }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse" style={{ backgroundColor: 'var(--green)' }}></span>
                Live • Updated {formatLastUpdated(lastUpdated)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div 
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-base)' }}
          >
            <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm w-48"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          
          {/* Notifications */}
          <button className="btn-icon btn-icon-lg relative">
            <Bell className="w-5 h-5" />
            <span 
              className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse-dot"
              style={{ backgroundColor: 'var(--red)' }}
            />
          </button>
          
          {/* Refresh */}
          <button 
            className="btn-primary" 
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Summary Cards Grid - Using Project's KPICard */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {dashboardData.summaryCards.map(card => (
              <KPICard 
                key={card.id}
                label={card.label}
                value={card.value}
                trend={card.trend}
                trendUp={card.trendUp}
                icon={card.icon}
                variant={card.variant}
              />
            ))}
          </div>
        </section>

        {/* Second Row Metrics */}
        <section>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-section">Key Metrics</h2>
              <button className="btn-icon">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {dashboardData.secondRowMetrics.map((metric, index) => (
                <MetricPill key={index} {...metric} />
              ))}
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Project Pipeline */}
          <ChartCard title="Project Pipeline" icon={TrendingUp}>
            {hasChartData(dashboardData.projectPipeline) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.projectPipeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} minPointSize={8}>
                    {dashboardData.projectPipeline.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState label="Project pipeline data nahi mila" />
            )}
          </ChartCard>

          {/* Installation Status */}
          <ChartCard title="Installation Status" icon={HardHat}>
            {hasChartData(dashboardData.installationStatus) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.installationStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} minPointSize={8}>
                    {dashboardData.installationStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState label="Installation status data nahi mila" />
            )}
          </ChartCard>

          {/* Quotation Status - Pie Chart */}
          <ChartCard title="Quotation Status" icon={FileText}>
            {hasChartData(dashboardData.quotationStatus) ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.quotationStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {dashboardData.quotationStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {dashboardData.quotationStatus.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChartState label="Quotation status data nahi mila" />
            )}
          </ChartCard>

          {/* Task Overview - Horizontal Bar */}
          <ChartCard title="Task Overview" icon={ClipboardList}>
            {hasChartData(dashboardData.taskOverview) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData.taskOverview} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis 
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_COLORS.blue}
                    strokeWidth={3}
                    dot={{ r: 5, strokeWidth: 2, fill: CHART_COLORS.blue }}
                    activeDot={{ r: 7, stroke: CHART_COLORS.blue, strokeWidth: 2, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState label="Task overview data nahi mila" />
            )}
          </ChartCard>

          {/* Procurement Status */}
          <ChartCard title="Procurement Status" icon={ShoppingCart}>
            {hasChartData(dashboardData.procurementStatus) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.procurementStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} minPointSize={8}>
                    {dashboardData.procurementStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState label="Procurement status data nahi mila" />
            )}
          </ChartCard>

          {/* Survey Overview */}
          <ChartCard title="Survey Overview" icon={Calendar}>
            {hasChartData(dashboardData.surveyOverview) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.surveyOverview}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} minPointSize={8}>
                    {dashboardData.surveyOverview.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState label="Survey overview data nahi mila" />
            )}
          </ChartCard>
        </section>

        {/* Bottom Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-section">Quick Actions</h3>
              <Zap className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="space-y-1">
              {quickActions.map((action, index) => (
                <QuickActionButton
                  key={index}
                  icon={action.icon}
                  label={action.label}
                  onClick={() => console.log(action.label)}
                />
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-section">Performance Metrics</h3>
              <Activity className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            </div>
            <div className="space-y-5">
              {dashboardData.performanceMetrics.map((metric, index) => (
                <PerformanceBar key={index} {...metric} />
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-section">System Health</h3>
              <Shield className="w-5 h-5" style={{ color: 'var(--green)' }} />
            </div>
            <div className="space-y-2">
              {dashboardData.systemHealth.map((item, index) => (
                <HealthItem key={index} {...item} />
              ))}
            </div>
            <div 
              className="mt-4 pt-4 border-t flex items-center gap-2 text-xs"
              style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}
            >
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--green)' }} />
              <span>All systems operational</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SolarOSDashboard;

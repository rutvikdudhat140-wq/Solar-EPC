import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  Sun,
  Zap,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Users,
  FileText,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  MapPin,
  Battery,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// KPI Card Component - Inventory Style
const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color }) => {
  const colorMap = {
    blue: { from: 'from-blue-100', to: 'to-sky-200', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-200', iconColor: 'text-blue-700', tagBg: 'bg-blue-100', tagText: 'text-blue-700' },
    emerald: { from: 'from-emerald-100', to: 'to-green-200', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-200', iconColor: 'text-emerald-700', tagBg: 'bg-emerald-100', tagText: 'text-emerald-700' },
    amber: { from: 'from-amber-100', to: 'to-orange-200', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-200', iconColor: 'text-amber-700', tagBg: 'bg-amber-100', tagText: 'text-amber-700' },
    purple: { from: 'from-violet-100', to: 'to-purple-200', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-200', iconColor: 'text-violet-700', tagBg: 'bg-violet-100', tagText: 'text-violet-700' },
    rose: { from: 'from-red-100', to: 'to-rose-200', border: 'border-red-200', text: 'text-red-700', iconBg: 'bg-red-200', iconColor: 'text-red-700', tagBg: 'bg-red-100', tagText: 'text-red-700' },
    cyan: { from: 'from-cyan-100', to: 'to-teal-200', border: 'border-cyan-200', text: 'text-cyan-700', iconBg: 'bg-cyan-200', iconColor: 'text-cyan-700', tagBg: 'bg-cyan-100', tagText: 'text-cyan-700' },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className={`group relative overflow-hidden bg-gradient-to-br ${colors.from} ${colors.to} border ${colors.border} rounded-2xl p-4 cursor-pointer hover:shadow-xl hover:shadow-${color}-500/10 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300`}>
      <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className={`text-[10px] uppercase tracking-wider ${colors.text} font-bold`}>{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2`}>
              {trend === 'up' ? <ArrowUpRight size={12} className="text-emerald-600" /> : trend === 'down' ? <ArrowDownRight size={12} className="text-red-600" /> : null}
              <span className={`text-[10px] font-medium ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={20} className={colors.iconColor} />
        </div>
      </div>
    </div>
  );
};

// Chart Card Component
const ChartCard = ({ title, subtitle, children, headerRight }) => (
  <div className="rounded-xl shadow-sm p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-base)' }}>
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {headerRight && <div>{headerRight}</div>}
    </div>
    {children}
  </div>
);

// AI Insight Card
const AIInsightCard = ({ insights }) => (
  <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
    <div className="flex items-center gap-2 mb-4">
      <div className="p-2 bg-white/20 rounded-lg">
        <Zap className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-lg font-semibold">AI Insights</h3>
    </div>

    <div className="space-y-3">
      {insights.map((insight, idx) => (
        <div key={idx} className="flex items-start gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
          <div className={`mt-0.5 w-2 h-2 rounded-full ${insight.type === 'warning' ? 'bg-amber-400' : insight.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
          <p className="text-sm text-white/90 flex-1">{insight.message}</p>
        </div>
      ))}
    </div>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusStyles = {
    'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Active': 'bg-blue-100 text-blue-700 border-blue-200',
    'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
    'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
    'Cancelled': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles['Pending']}`}>
      {status}
    </span>
  );
};

// Data Table Component
const DataTable = ({ data, columns, onRowClick, searchTerm, onSearch, filters, onFilter }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Search and Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filters.status}
            onChange={(e) => onFilter({ ...filters, status: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>

          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable && handleSort(column.key)}
                  className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${column.sortable ? 'cursor-pointer hover:text-gray-700' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {column.title}
                    {column.sortable && sortConfig.key === column.key && (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick?.(row)}
                className="hover:bg-gray-50/80 transition-colors cursor-pointer"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} projects
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                  ? 'bg-blue-500 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const CommissioningDashboard = ({ data, systems, onProjectClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: 'All' });
  const [dateRange, setDateRange] = useState('6m');

  // Calculate KPI data
  const kpiData = useMemo(() => {
    const total = systems?.length || 0;
    const completed = systems?.filter(s => s.status === 'Completed').length || 0;
    const active = systems?.filter(s => s.status === 'Active').length || 0;
    const pending = systems?.filter(s => s.status === 'Pending').length || 0;
    const inProgress = systems?.filter(s => s.status === 'In Progress').length || 0;

    const avgPR = systems?.length > 0
      ? (systems.reduce((sum, s) => sum + (s.pr || 0), 0) / systems.filter(s => s.pr > 0).length || 0).toFixed(1)
      : 0;

    const totalCapacity = systems?.reduce((sum, s) => sum + (s.systemSize || 0), 0) || 0;

    // Calculate warranty expiring soon (within 90 days)
    const now = new Date();
    const warrantyExpiring = systems?.filter(s => {
      if (!s.warrantyPanel) return false;
      const warrantyDate = new Date(s.warrantyPanel);
      const daysUntilExpiry = Math.floor((warrantyDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
    }).length || 0;

    return {
      total,
      completed,
      active,
      pending,
      inProgress,
      avgPR,
      totalCapacity,
      warrantyExpiring,
    };
  }, [systems]);

  // Chart data preparation
  const statusChartData = [
    { name: 'Completed', value: kpiData.completed, color: '#10b981' },
    { name: 'Active', value: kpiData.active, color: '#3b82f6' },
    { name: 'Pending', value: kpiData.pending, color: '#f59e0b' },
    { name: 'In Progress', value: kpiData.inProgress, color: '#8b5cf6' },
  ];

  // Monthly trend data
  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();

    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const monthName = months[d.getMonth()];
      const monthSystems = systems?.filter(s => {
        if (!s.commissionDate) return false;
        const date = new Date(s.commissionDate);
        return date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear();
      }) || [];

      return {
        name: monthName,
        completed: monthSystems.filter(s => s.status === 'Completed').length,
        active: monthSystems.filter(s => s.status === 'Active').length,
        pending: monthSystems.filter(s => s.status === 'Pending').length,
      };
    });
  }, [systems]);

  // Performance data by PR ranges
  const performanceData = [
    { range: '90-100%', count: systems?.filter(s => s.pr >= 90).length || 0, fill: '#10b981' },
    { range: '80-89%', count: systems?.filter(s => s.pr >= 80 && s.pr < 90).length || 0, fill: '#3b82f6' },
    { range: '70-79%', count: systems?.filter(s => s.pr >= 70 && s.pr < 80).length || 0, fill: '#f59e0b' },
    { range: '<70%', count: systems?.filter(s => s.pr > 0 && s.pr < 70).length || 0, fill: '#ef4444' },
  ];

  // Capacity by site
  const capacityBySite = useMemo(() => {
    const siteMap = {};
    systems?.forEach(s => {
      if (s.site) {
        siteMap[s.site] = (siteMap[s.site] || 0) + (s.systemSize || 0);
      }
    });
    return Object.entries(siteMap)
      .map(([site, capacity]) => ({ site, capacity }))
      .sort((a, b) => b.capacity - a.capacity)
      .slice(0, 6);
  }, [systems]);

  // AI Insights
  const aiInsights = useMemo(() => {
    const insights = [];

    // Low PR projects
    const lowPRProjects = systems?.filter(s => s.pr > 0 && s.pr < 70) || [];
    if (lowPRProjects.length > 0) {
      insights.push({
        type: 'warning',
        message: `${lowPRProjects.length} projects have PR below 70%. Consider inspection for ${lowPRProjects[0]?.customer || 'these sites'}.`,
      });
    }

    // Pending projects
    if (kpiData.pending > 0) {
      insights.push({
        type: 'info',
        message: `${kpiData.pending} projects are pending commissioning. Average wait time: 5 days.`,
      });
    }

    // Warranty alerts
    if (kpiData.warrantyExpiring > 0) {
      insights.push({
        type: 'warning',
        message: `${kpiData.warrantyExpiring} projects have panel warranty expiring within 90 days.`,
      });
    }

    // Top performer
    const topSite = capacityBySite[0];
    if (topSite) {
      insights.push({
        type: 'success',
        message: `${topSite.site} leads with ${topSite.capacity} kW installed capacity.`,
      });
    }

    return insights;
  }, [systems, kpiData, capacityBySite]);

  // Table columns
  const tableColumns = [
    { key: 'customer', title: 'Customer', sortable: true },
    { key: 'projectId', title: 'Project ID', sortable: true, render: (v) => <span className="font-mono text-sm text-gray-600">{v}</span> },
    {
      key: 'site', title: 'Site', sortable: true, render: (v) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPin className="w-3.5 h-3.5" />
          {v}
        </div>
      )
    },
    { key: 'systemSize', title: 'Size (kW)', sortable: true, render: (v) => <span className="font-semibold">{v} kW</span> },
    {
      key: 'pr', title: 'PR %', sortable: true, render: (v, row) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${v >= 80 ? 'bg-emerald-500' : v >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(v || 0, 100)}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${v >= 80 ? 'text-emerald-600' : v >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
            {v ? `${v}%` : 'N/A'}
          </span>
        </div>
      )
    },
    {
      key: 'commissionDate', title: 'Commissioned', sortable: true, render: (v) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Calendar className="w-3.5 h-3.5" />
          {v ? new Date(v).toLocaleDateString() : '—'}
        </div>
      )
    },
    {
      key: 'warrantyPanel', title: 'Warranty', sortable: true, render: (v) => (
        <div className="flex items-center gap-1 text-sm">
          <Shield className="w-3.5 h-3.5 text-gray-400" />
          {v ? new Date(v).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
        </div>
      )
    },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
  ];

  // Filtered systems for table
  const filteredSystems = useMemo(() => {
    return systems?.filter(s => {
      const matchesSearch = !searchTerm ||
        s.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.projectId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.site?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filters.status === 'All' || s.status === filters.status;

      return matchesSearch && matchesStatus;
    }) || [];
  }, [systems, searchTerm, filters]);

  if (!systems || systems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Sun className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">No commissioning data available</p>
        <p className="text-sm mt-1">Add commissioning records to see the dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        <span className="text-sm text-gray-500">Showing {kpiData.total} of {kpiData.total} Commissionings</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KPICard
          title="Total Projects"
          value={kpiData.total}
          subtitle="All time"
          icon={Sun}
          color="blue"
          trend="up"
          trendValue="12% vs last month"
        />
        <KPICard
          title="Completed"
          value={kpiData.completed}
          subtitle={`${kpiData.total > 0 ? ((kpiData.completed / kpiData.total) * 100).toFixed(0) : 0}% completion`}
          icon={CheckCircle}
          color="emerald"
          trend="up"
          trendValue="8 new"
        />
        <KPICard
          title="Active"
          value={kpiData.active}
          subtitle="In service"
          icon={Activity}
          color="purple"
          trend="up"
          trendValue="Ongoing"
        />
        <KPICard
          title="Pending"
          value={kpiData.pending}
          subtitle="Awaiting"
          icon={Clock}
          color="amber"
          trend="down"
          trendValue="3 resolved"
        />
        <KPICard
          title="In Progress"
          value={kpiData.inProgress}
          subtitle="Active work"
          icon={TrendingUp}
          color="cyan"
          trend="neutral"
          trendValue="Ongoing"
        />
        <KPICard
          title="Avg PR %"
          value={`${kpiData.avgPR}%`}
          subtitle="Performance"
          icon={Zap}
          color="purple"
          trend={kpiData.avgPR >= 78 ? 'up' : 'down'}
          trendValue={kpiData.avgPR >= 78 ? 'Above target' : 'Below target'}
        />
        <KPICard
          title="Capacity"
          value={`${kpiData.totalCapacity}`}
          subtitle="kW installed"
          icon={Battery}
          color="cyan"
          trend="up"
          trendValue="All sites"
        />
        <KPICard
          title="Warranty"
          value={kpiData.warrantyExpiring}
          subtitle="Expiring <90 days"
          icon={AlertTriangle}
          color="rose"
          trend={kpiData.warrantyExpiring > 0 ? 'up' : 'neutral'}
          trendValue={kpiData.warrantyExpiring > 0 ? 'Action needed' : 'OK'}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Commissioning Trends"
          subtitle="Monthly commissioning over last 6 months"
          headerRight={
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all">{filter}</button>
              ))}
            </div>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-overlay)', borderRadius: '8px', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
                <Area type="monotone" dataKey="active" name="Active" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="#3b82f620" />
                <Area type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPending)" />
                <Area type="monotone" dataKey="inProgress" name="In Progress" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="#8b5cf620" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Status Distribution"
          subtitle="Current project status breakdown"
          headerRight={
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all">{filter}</button>
              ))}
            </div>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-overlay)', borderRadius: '8px', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}
                />
                <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {statusChartData.map((item) => (
              <div key={item.name} className="text-center">
                <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.name}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Performance Ratio Distribution"
          subtitle="Projects by PR performance ranges"
          headerRight={
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all">{filter}</button>
              ))}
            </div>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="range" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-overlay)', borderRadius: '8px', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}
                  formatter={(value) => [`${value} projects`, 'Count']}
                />
                <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Installed Capacity by Site"
          subtitle="Top sites by total kW installed"
          headerRight={
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all">{filter}</button>
              ))}
            </div>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capacityBySite} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis dataKey="site" type="category" stroke="var(--text-muted)" fontSize={11} width={80} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-overlay)', borderRadius: '8px', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}
                  formatter={(value) => [`${value} kW`, 'Capacity']}
                />
                <Bar dataKey="capacity" name="Capacity (kW)" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default CommissioningDashboard;

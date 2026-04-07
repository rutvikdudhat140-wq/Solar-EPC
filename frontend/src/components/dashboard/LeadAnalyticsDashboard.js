import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Users, DollarSign, Download, RefreshCw,
  ArrowUpRight, ArrowDownRight, CheckCircle2, Sparkles,
  AlertCircle, Zap, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Target, Activity, UserCheck,
  Clock, XCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import { leadsApi } from '../../services/leadsApi';

const fmt = (val) => {
  if (!val || val === 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val.toLocaleString()}`;
};

const formatNumber = (num) => {
  if (!num || num === 0) return '0';
  return num.toLocaleString();
};

const titleCase = (s) => {
  if (!s) return '';
  return String(s).split(/\s|_/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

// eslint-disable-next-line no-unused-vars
const STAGE_COLORS = {
  new: { color: '#3B82F6', gradient: 'from-blue-500 to-blue-600' },
  contacted: { color: '#6366F1', gradient: 'from-indigo-500 to-indigo-600' },
  qualified: { color: '#8B5CF6', gradient: 'from-violet-500 to-violet-600' },
  proposal: { color: '#A855F7', gradient: 'from-purple-500 to-purple-600' },
  negotiation: { color: '#F59E0B', gradient: 'from-amber-500 to-amber-600' },
  won: { color: '#22C55E', gradient: 'from-emerald-500 to-emerald-600' },
  lost: { color: '#EF4444', gradient: 'from-red-500 to-red-600' },
  followup: { color: '#14B8A6', gradient: 'from-teal-500 to-teal-600' },
  customer: { color: '#10B981', gradient: 'from-green-500 to-green-600' }
};

// Live Indicator Component
const LiveIndicator = ({ isLive }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
    <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
    <span className="text-xs font-semibold text-emerald-700">{isLive ? 'Live Data' : 'Offline'}</span>
  </div>
);

// Loading skeleton for cards
const SkeletonCard = () => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="w-12 h-12 rounded-lg bg-gray-200" />
      <div className="w-16 h-5 rounded bg-gray-200" />
    </div>
    <div className="mt-4 space-y-2">
      <div className="w-24 h-3 rounded bg-gray-200" />
      <div className="w-20 h-7 rounded bg-gray-200" />
    </div>
  </div>
);

// Loading skeleton for charts
const SkeletonChart = () => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="w-40 h-5 rounded bg-gray-200 mb-6" />
    <div className="h-64 bg-gray-200 rounded-lg" />
  </div>
);

// KPI Card Component with live data indicator
const KPICard = ({ title, value, change, trend, icon: Icon, color, loading, subtitle, onClick }) => {
  if (loading) return <SkeletonCard />;

  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;
  const trendColor = trend === 'up' ? 'text-emerald-500' : 'text-red-500';
  const trendBg = trend === 'up' ? 'bg-emerald-50' : 'bg-red-50';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:border-blue-300' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={24} style={{ color }} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trendBg}`}>
            <TrendIcon size={14} className={trendColor} />
            <span className={`text-xs font-semibold ${trendColor}`}>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

// Chart Date Filter Component (for individual charts)
const ChartDateFilter = ({ dateRange, onDateRangeChange, size = 'sm' }) => {
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year', label: 'Year' },
  ];

  const baseClasses = size === 'sm'
    ? 'px-2 py-1 text-xs'
    : 'px-3 py-1.5 text-sm';

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onDateRangeChange(filter.key)}
          className={`${baseClasses} rounded-md font-medium transition-all ${dateRange === filter.key
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

// Error State
// eslint-disable-next-line no-unused-vars
const ErrorState = ({ onRetry }) => (
  <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
    <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
      <AlertCircle size={40} className="text-red-500" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Data</h3>
    <p className="text-gray-500 mb-6">
      There was an error loading the dashboard data. Please try again.
    </p>
    {onRetry && (
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw size={16} className="mr-2" /> Retry
      </Button>
    )}
  </div>
);

// Empty State
const EmptyState = () => (
  <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
      <Users size={40} className="text-gray-400" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Leads Available</h3>
    <p className="text-gray-500 mb-6 max-w-md mx-auto">
      Import or add leads to see analytics. Once you have leads, this dashboard will show your sales funnel, pipeline value, and conversion metrics.
    </p>
  </div>
);

// Filter leads by date range
const filterLeadsByDateRange = (leads, dateRange) => {
  if (!leads || !Array.isArray(leads) || dateRange === 'all') return leads;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getStartDate = () => {
    switch (dateRange) {
      case 'today':
        return today;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return weekStart;
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return null;
    }
  };

  const startDate = getStartDate();
  if (!startDate) return leads;

  return leads.filter(lead => {
    const leadDate = new Date(lead.createdAt || lead.created_at || lead.date || lead.created);
    return leadDate >= startDate;
  });
};

// Sales Funnel 2D Bar Chart with Individual Date Filter
const FunnelChart = ({ data, loading, leads = [] }) => {
  const [dateRange, setDateRange] = useState('all');

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return data;
    if (dateRange === 'all' || !leads.length) return data;

    const filteredLeads = filterLeadsByDateRange(leads, dateRange);
    const stageCounts = {};
    filteredLeads.forEach(lead => {
      const stage = lead.statusKey || lead.status || 'new';
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });

    return data.map(stage => ({
      ...stage,
      count: stageCounts[stage.stage] || 0
    })).filter(s => s.count > 0);
  }, [data, leads, dateRange]);

  if (loading) return <SkeletonChart />;

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Sales Funnel</h3>
          <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">No funnel data available</p>
        </div>
      </div>
    );
  }

  const chartData = filteredData.map((stage, index) => ({
    name: titleCase(stage.stage),
    leads: stage.count || 0,
    value: stage.value || 0,
    fill: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#22c55e', '#ef4444'][index % 7]
  }));

  const totalLeads = chartData.reduce((sum, d) => sum + d.leads, 0);
  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sales Funnel</h3>
          <p className="text-sm text-gray-500 mt-1">{totalLeads} leads · {fmt(totalValue)}</p>
        </div>
        <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: '#374151' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              cursor={{ fill: '#f3f4f6' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                      <p className="font-semibold text-gray-900">{data.name}</p>
                      <p className="text-sm text-gray-600">Leads: {data.leads}</p>
                      <p className="text-sm text-gray-600">Value: {fmt(data.value)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="leads" radius={[0, 4, 4, 0]} barSize={28}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
        {chartData.slice(0, 3).map((stage, idx) => (
          <div key={idx} className="text-center">
            <p className="text-xs text-gray-500">{stage.name}</p>
            <p className="text-lg font-bold" style={{ color: stage.fill }}>{stage.leads}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Lead Sources 2D Chart with Individual Date Filter
const SourceChart = ({ data, loading, leads = [] }) => {
  const [dateRange, setDateRange] = useState('all');

  const filteredData = useMemo(() => {
    if (!leads || !Array.isArray(leads)) return data;
    if (dateRange === 'all') return data;

    const filteredLeads = filterLeadsByDateRange(leads, dateRange);
    const sourceCounts = {};
    filteredLeads.forEach(lead => {
      const source = lead.source || 'Unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    return Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      leads: count
    }));
  }, [data, leads, dateRange]);

  if (loading) return <SkeletonChart />;

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Lead Sources</h3>
          <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">No source data available</p>
        </div>
      </div>
    );
  }

  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'];

  const chartData = filteredData.map((item, index) => ({
    name: titleCase(item.source || 'Unknown'),
    leads: item.leads || item.count || 0,
    fill: colors[index % colors.length]
  }));

  const total = chartData.reduce((sum, d) => sum + d.leads, 0);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Lead Sources</h3>
          <p className="text-sm text-gray-500 mt-1">{total} total leads</p>
        </div>
        <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      <div className="flex items-center gap-6">
        <div className="w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="leads"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    const pct = total > 0 ? Math.round((data.value / total) * 100) : 0;
                    return (
                      <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-100">
                        <p className="font-semibold text-sm">{data.name}</p>
                        <p className="text-xs text-gray-600">{data.value} leads ({pct}%)</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {chartData.map((source, index) => {
            const pct = total > 0 ? Math.round((source.leads / total) * 100) : 0;
            return (
              <div key={index} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.fill }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{source.name}</span>
                    <span className="text-sm font-semibold text-gray-900">{source.leads}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: source.fill }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-8">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Monthly Trend 2D Area Chart with Individual Date Filter
const TrendChart = ({ data, loading }) => {
  const [dateRange, setDateRange] = useState('all');

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return data;
    if (dateRange === 'all') return data;

    // eslint-disable-next-line no-unused-vars
    const now = new Date();
    let monthsToShow = 12;

    switch (dateRange) {
      case 'today':
      case 'week':
      case 'month':
        monthsToShow = 1;
        break;
      case 'quarter':
        monthsToShow = 3;
        break;
      case 'year':
        monthsToShow = 12;
        break;
      default:
        monthsToShow = 12;
    }

    return data.slice(-monthsToShow);
  }, [data, dateRange]);

  if (loading) return <SkeletonChart />;

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Trend</h3>
          <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">No trend data available</p>
        </div>
      </div>
    );
  }

  const chartData = filteredData.map(item => ({
    month: item.month || '',
    created: item.created || 0,
    won: item.won || 0,
  }));

  const totalCreated = chartData.reduce((sum, d) => sum + d.created, 0);
  const totalWon = chartData.reduce((sum, d) => sum + d.won, 0);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Monthly Trend</h3>
          <p className="text-sm text-gray-500 mt-1">{totalCreated} new · {totalWon} won</p>
        </div>
        <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
            <Area
              type="monotone"
              dataKey="created"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorCreated)"
              strokeWidth={2}
              name="New Leads"
            />
            <Area
              type="monotone"
              dataKey="won"
              stroke="#22c55e"
              fillOpacity={1}
              fill="url(#colorWon)"
              strokeWidth={2}
              name="Won"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Top Performers Component with Individual Date Filter
const AgentLeaderboard = ({ data, loading, leads = [] }) => {
  const [dateRange, setDateRange] = useState('all');

  const agents = useMemo(() => {
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      const list = Array.isArray(data) ? data : [];
      return list
        .map((a) => ({
          id: a?.id ?? a?._id ?? a?.userId ?? a?.email ?? a?.name,
          name: a?.name ?? a?.fullName ?? a?.email ?? 'Unknown',
          leads: Number(a?.leadsHandled ?? a?.leadsAssigned ?? a?.leads ?? 0),
          converted: Number(a?.converted ?? a?.leadsConverted ?? a?.won ?? 0),
          rate: Number(a?.conversionRate ?? 0)
        }))
        .filter(a => a.leads > 0)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);
    }

    const filteredLeads = filterLeadsByDateRange(leads, dateRange);
    const agentStats = {};
    filteredLeads.forEach(lead => {
      const agentId = lead.assignedTo?._id || lead.assignedTo || lead.createdBy?._id || lead.createdBy || 'unassigned';
      const agentName = lead.assignedTo?.name || lead.assignedTo?.firstName || lead.createdBy?.name || lead.createdBy?.firstName || 'Unknown';

      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          id: agentId,
          name: agentName,
          leads: 0,
          converted: 0
        };
      }

      agentStats[agentId].leads++;

      const status = (lead.statusKey || lead.status || '').toLowerCase();
      if (status === 'won' || status === 'customer' || status === 'converted') {
        agentStats[agentId].converted++;
      }
    });

    return Object.values(agentStats)
      .map(agent => ({
        ...agent,
        rate: agent.leads > 0 ? Math.round((agent.converted / agent.leads) * 100) : 0
      }))
      .filter(a => a.leads > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
  }, [data, leads, dateRange]);

  if (loading) return <SkeletonChart />;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
          <p className="text-sm text-gray-500 mt-1">By conversion rate</p>
        </div>
        <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {agents.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">No performer data available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent, index) => {
            const rankColors = [
              'bg-amber-100 text-amber-700',
              'bg-gray-100 text-gray-700',
              'bg-orange-100 text-orange-700'
            ];
            const rankClass = index < 3 ? rankColors[index] : 'bg-gray-50 text-gray-500';
            const initial = agent.name.charAt(0).toUpperCase();

            return (
              <div key={agent.id || index} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rankClass}`}>
                  {index + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                  {initial}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(agent.rate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{agent.rate.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{agent.converted}</p>
                  <p className="text-xs text-gray-500">won</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Calendar Component - With Quick Date Filter
const LeadCalendar = ({ leads, loading }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [quickFilter, setQuickFilter] = useState('all'); // 'all', 'today', 'week', 'month'

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Calculate date range based on quick filter
  const getDateRangeFromFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (quickFilter) {
      case 'today':
        return { start: today, end: new Date(today) };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return { start: weekStart, end: weekEnd };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: monthStart, end: monthEnd };
      default:
        return { start: null, end: null };
    }
  };

  const { start: filterStart, end: filterEnd } = getDateRangeFromFilter();

  const leadsByDate = useMemo(() => {
    if (!leads || !Array.isArray(leads)) return {};
    const grouped = {};
    leads.forEach(lead => {
      const date = lead.createdAt || lead.created_at || lead.date;
      if (date) {
        const dateObj = new Date(date);
        
        // Apply quick filter if set
        if (filterStart && filterEnd) {
          if (dateObj < filterStart || dateObj > filterEnd) {
            return; // Skip leads outside filter range
          }
        }
        
        const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(lead);
      }
    });
    return grouped;
  }, [leads, filterStart, filterEnd]);

  const getLeadsForDate = (day) => {
    const dateKey = `${year}-${month}-${day}`;
    return leadsByDate[dateKey] || [];
  };

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  // Handle quick filter change
  const handleQuickFilterChange = (e) => {
    const filterValue = e.target.value;
    setQuickFilter(filterValue);
    
    // If filtering by month, update calendar to show that month
    if (filterValue === 'month') {
      const now = new Date();
      setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  };

  const totalLeadsThisMonth = useMemo(() => {
    return Object.values(leadsByDate).flat().filter(lead => {
      const date = new Date(lead.createdAt || lead.created_at || lead.date);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length;
  }, [leadsByDate, month, year]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="w-32 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
          {Array(35).fill(0).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-20 bg-gray-50 rounded-lg" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateLeads = getLeadsForDate(day);
    const hasLeads = dateLeads.length > 0;
    const isSelected = selectedDate === day;
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

    days.push(
      <div
        key={day}
        className={`h-20 p-2 rounded-lg border-2 cursor-pointer transition-all overflow-hidden ${isSelected ? 'border-blue-500 bg-blue-50' :
          isToday ? 'border-orange-400 bg-orange-50' :
            hasLeads ? 'border-amber-300 bg-amber-50 hover:border-amber-400' :
              'border-gray-200 bg-white hover:border-gray-300'
          }`}
        onClick={() => setSelectedDate(isSelected ? null : day)}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-bold ${isToday ? 'text-orange-600' :
            hasLeads ? 'text-amber-700' : 'text-gray-700'
            }`}>
            {day}
          </span>
          {hasLeads && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
              {dateLeads.length}
            </span>
          )}
        </div>

        <div className="space-y-0.5">
          {dateLeads.slice(0, 2).map((lead, idx) => (
            <div key={idx} className="text-xs truncate text-gray-600 bg-white/80 px-1 py-0.5 rounded">
              {lead.name || lead.customerName || 'Lead'}
            </div>
          ))}
          {dateLeads.length > 2 && (
            <div className="text-xs text-gray-500 px-1">
              +{dateLeads.length - 2} more
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedDateLeads = selectedDate ? getLeadsForDate(selectedDate) : [];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Quick Filter Dropdown */}
          <select
            value={quickFilter}
            onChange={handleQuickFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <span className="text-sm text-gray-500">
            {totalLeadsThisMonth} records this month
          </span>
        </div>

        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-orange-500">
            {monthNames[month]} {year}
          </h3>
          {quickFilter !== 'all' && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              {quickFilter === 'today' ? 'Today' : quickFilter === 'week' ? 'This Week' : 'This Month'}
            </span>
          )}
          <div className="flex gap-1 ml-4">
            <button
              onClick={prevMonth}
              className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="h-10 flex items-center justify-center text-sm font-bold text-gray-600 bg-gray-100 rounded-lg">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days}
      </div>

      {selectedDate && selectedDateLeads.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-bold text-gray-900 mb-3">
            Leads on {monthNames[month]} {selectedDate}, {year} ({selectedDateLeads.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedDateLeads.map((lead, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                    {(lead.name || lead.customerName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {lead.name || lead.customerName || 'Unknown Lead'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {lead.statusKey || lead.status || 'new'} • {lead.phone || lead.mobile || 'No phone'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {fmt(lead.value || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Smart Insights Component
const SmartInsights = ({ insights, loading, finalKpis }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-amber-500" />
          <h3 className="text-base font-semibold text-gray-900">Smart Insights</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Pending Leads',
      value: finalKpis?.pendingLeads || 0,
      icon: Clock,
      color: 'from-amber-500 to-orange-600'
    },
    {
      label: 'Dead Leads',
      value: finalKpis?.deadLeads || 0,
      icon: XCircle,
      color: 'from-red-500 to-rose-600'
    },
    {
      label: 'Avg Deal Size',
      value: fmt(finalKpis?.avgDealSize || 0),
      icon: Target,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      label: 'Response Time',
      value: '< 2h',
      icon: Activity,
      color: 'from-violet-500 to-purple-600'
    },
    {
      label: 'Active Agents',
      value: formatNumber(finalKpis?.activeAgents || 0),
      icon: UserCheck,
      color: 'from-amber-500 to-orange-600'
    }
  ];

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-amber-500" />
        <h3 className="text-base font-semibold text-gray-900">Smart Insights</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
              <stat.icon size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-sm font-bold text-gray-900 truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Dashboard Component with Live Data, Calendar and Individual Chart Filters
const LeadAnalyticsDashboard = ({ onNavigate, onFilter, onFilterChange, dateFilter }) => {
  console.log('[DASHBOARD COMPONENT] Render with dateFilter:', dateFilter);
  
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCards, setShowCards] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const queryOpts = {
    refetchInterval: false, // Disable auto-refresh
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes (prevent constant refetches)
    cacheTime: 10 * 60 * 1000, // Cache data for 10 minutes
    refetchOnWindowFocus: true, // Refetch on window focus
    refetchOnMount: true, // Refetch on mount
    keepPreviousData: true, // CRITICAL: Prevent UI flicker during refetch
  };

  // Shared helper to convert dateFilter to start/end dates
  const getDateRangeFromPreset = useCallback((preset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate, endDate;

    switch (preset) {
      case 'all':
        return { startDate: null, endDate: null };
      case 'today':
        startDate = today;
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek': // ROLLING 7 DAYS (today - 6 days to today)
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last7days':
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last30days':
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (dateFilter?.startDate && dateFilter?.endDate) {
          startDate = new Date(dateFilter.startDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(dateFilter.endDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        return { startDate: null, endDate: null };
    }

    return { startDate, endDate };
  }, [dateFilter]);

  // Debug: Log dateFilter changes
  useEffect(() => {
    console.log('[DATE FILTER] Changed:', dateFilter);
  }, [dateFilter]);

  // ============================================
  // UNIFIED DASHBOARD API - Single call for all data
  // ============================================
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading, 
    error: dashboardError,
    refetch: refetchDashboard 
  } = useQuery({
    queryKey: ['leads-dashboard', 'unified', dateFilter],
    queryFn: async () => {
      const params = {};
      
      if (dateFilter) {
        // If startDate and endDate are already provided, use them directly
        if (dateFilter.startDate && dateFilter.endDate) {
          const startDate = new Date(dateFilter.startDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(dateFilter.endDate);
          endDate.setHours(23, 59, 59, 999);
          params.startDate = startDate.toISOString();
          params.endDate = endDate.toISOString();
        } else {
          // Otherwise, calculate from preset type
          const { startDate, endDate } = getDateRangeFromPreset(dateFilter.type || dateFilter);
          if (startDate && endDate) {
            params.startDate = startDate.toISOString();
            params.endDate = endDate.toISOString();
          }
        }
      }
      
      // Add cache-busting timestamp
      params._t = Date.now();
      
      console.log('[UNIFIED API CALL] Sending dates:', params);
      const response = await leadsApi.getDashboard(params);
      console.log('[UNIFIED API CALL] Response:', response);
      
      // Return the data object which contains all dashboard sections
      return response?.data || response;
    },
    ...queryOpts,
  });

  // Extract data sections from unified response
  const kpis = dashboardData?.kpis || {};
  const funnel = dashboardData?.funnel || {};
  const sources = dashboardData?.sources || {};
  const monthly = dashboardData?.monthly || {};
  const performers = dashboardData?.topPerformers || {};

  // Fetch leads for calendar and filtering (separate call)
  const { data: leadsRaw, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads-dashboard', 'all-leads', dateFilter],
    queryFn: async () => {
      const params = { limit: 1000 };

      if (dateFilter) {
        // If startDate and endDate are already provided, use them directly
        if (dateFilter.startDate && dateFilter.endDate) {
          const startDate = new Date(dateFilter.startDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(dateFilter.endDate);
          endDate.setHours(23, 59, 59, 999);
          params.startDate = startDate.toISOString();
          params.endDate = endDate.toISOString();
        } else {
          // Otherwise, calculate from preset type
          const { startDate, endDate } = getDateRangeFromPreset(dateFilter.type || dateFilter);
          if (startDate && endDate) {
            params.startDate = startDate.toISOString();
            params.endDate = endDate.toISOString();
          }
        }
      }

      params._t = Date.now();

      console.log('[API CALL] All Leads - Sending dates:', params);
      const response = await leadsApi.getAll(params);
      console.log('[API CALL] All Leads - Response count:', response?.data?.length || response?.length || 0);
      return response?.data || response || [];
    },
    ...queryOpts,
  });

  // Update last updated time when data refreshes
  useEffect(() => {
    if (dashboardData) {
      setLastUpdated(new Date());
      setIsLive(true);
    }
  }, [dashboardData]);

  const leads = leadsRaw || [];

  // Calculate pending and dead leads from leads data
  console.log('[DEBUG] All leads:', leads.map(l => ({ name: l.name, status: l.status, statusKey: l.statusKey })));

  const pendingLeads = leads.filter(lead => {
    const status = (lead.statusKey || lead.status || '').toLowerCase();
    console.log('[DEBUG] Lead:', lead.name, 'Status:', status, 'Is Pending:', status === 'pending' || status === 'normal');
    return status === 'pending' || status === 'normal';
  }).length;

  const deadLeads = leads.filter(lead => {
    const status = (lead.statusKey || lead.status || '').toLowerCase();
    console.log('[DEBUG] Lead:', lead.name, 'Status:', status, 'Is Dead:', status === 'dead' || status === 'failure');
    return status === 'dead' || status === 'failure';
  }).length;

  console.log('[DEBUG] Final counts - Pending:', pendingLeads, 'Dead:', deadLeads);

  // Override KPI values with calculated ones
  const finalKpis = {
    ...kpis,
    pendingLeads,
    deadLeads
  };

  const isLoading = dashboardLoading || leadsLoading;
  const hasNoLeads = !finalKpis.totalLeads || finalKpis.totalLeads === 0;

  const handleRefresh = () => {
    refetchDashboard();
    setLastUpdated(new Date());
  };

  // Export functionality - ASYNC BACKGROUND JOB
  const handleExport = useCallback(async () => {
    try {
      setExportLoading(true);
      console.log('[EXPORT] Starting async background export');
      
      // Prepare filters to send to backend
      const exportFilters = {};
      
      // Check if date filter is applied (not default)
      const hasDateFilter = dateFilter && dateFilter.type !== 'last7days';
      
      if (hasDateFilter) {
        const { startDate, endDate } = getDateRangeFromPreset(dateFilter.type || dateFilter);
        if (startDate && endDate) {
          exportFilters.startDate = startDate.toISOString();
          exportFilters.endDate = endDate.toISOString();
          console.log('[EXPORT] Applying date filter:', { startDate, endDate });
        }
      } else {
        console.log('[EXPORT] No filters - exporting ALL data from backend');
      }
      
      console.log('[EXPORT] Sending filters to backend:', exportFilters);
      
      // Create background export job
      const response = await leadsApi.exportCSV([], exportFilters);
      const { jobId } = response.data || response;
      
      if (!jobId) {
        toast.error('Failed to create export job');
        setExportLoading(false);
        return;
      }
      
      toast.info('Export started! We\'ll notify you when it\'s ready.', { id: 'export-start' });
      
      // Poll for job status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await leadsApi.getExportStatus(jobId);
          const { status, progress, filename, error } = statusResponse.data || statusResponse;
          
          console.log('[EXPORT POLL] Status:', status, 'Progress:', progress);
          
          if (status === 'completed') {
            clearInterval(pollInterval);
            
            // Trigger download
            const downloadUrl = `/api/v1/leads/export/${jobId}/download`;
            window.open(downloadUrl, '_blank');
            
            toast.success('Export completed! Download started.', { id: 'export-complete' });
            setExportLoading(false);
          } else if (status === 'failed') {
            clearInterval(pollInterval);
            toast.error(`Export failed: ${error || 'Unknown error'}`, { id: 'export-failed' });
            setExportLoading(false);
          }
        } catch (pollError) {
          console.error('[EXPORT POLL] Error:', pollError);
        }
      }, 2000); // Poll every 2 seconds
      
      // Stop polling after 5 minutes (timeout)
      setTimeout(() => {
        clearInterval(pollInterval);
        toast.error('Export timeout. Please try again.', { id: 'export-timeout' });
        setExportLoading(false);
      }, 300000);
      
    } catch (error) {
      console.error('[EXPORT] Failed to create job:', error);
      toast.error('Failed to start export');
      setExportLoading(false);
    }
  }, [dateFilter, getDateRangeFromPreset]);

  // Prepare KPI data
  const kpiData = [
    {
      title: 'Total Leads',
      value: formatNumber(finalKpis.totalLeads || 0),
      change: finalKpis.deltas?.totalLeadsPct,
      trend: (finalKpis.deltas?.totalLeadsPct || 0) >= 0 ? 'up' : 'down',
      icon: Users,
      color: '#3b82f6',
      subtitle: 'All time leads',
      filterType: 'all'
    },
    {
      title: 'New Today',
      value: formatNumber(finalKpis.newLeads || 0),
      change: undefined,
      trend: 'up',
      icon: Sparkles,
      color: '#8b5cf6',
      subtitle: "Today's new leads",
      filterType: 'today'
    },
    {
      title: 'Converted',
      value: formatNumber(finalKpis.convertedLeads || 0),
      change: finalKpis.deltas?.convertedLeadsPct,
      trend: (finalKpis.deltas?.convertedLeadsPct || 0) >= 0 ? 'up' : 'down',
      icon: CheckCircle2,
      color: '#22c55e',
      subtitle: `${finalKpis.conversionRate || 0}% conversion rate`,
      filterType: 'converted'
    },
    {
      title: 'Pending Leads',
      value: finalKpis?.pendingLeads || 0,
      change: undefined,
      trend: 'neutral',
      icon: Clock,
      color: '#f59e0b',
      subtitle: 'Awaiting response',
      filterType: 'pending'
    },
    {
      title: 'Dead Leads',
      value: finalKpis?.deadLeads || 0,
      change: undefined,
      trend: 'down',
      icon: XCircle,
      color: '#ef4444',
      subtitle: 'Lost opportunities',
      filterType: 'dead'
    }
  ];

  if (hasNoLeads && !isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time sales analytics</p>
          </div>
          <LiveIndicator isLive={isLive} />
        </div>

        <EmptyState />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCards(!showCards)}
          >
            {showCards ? 'Hide Cards' : 'Show Cards'}
          </Button>
          <LiveIndicator isLive={isLive} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalendar(true)}
          >
            <CalendarIcon size={14} className="mr-2" />
            Calendar View
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw size={14} className="mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exportLoading || isLoading}>
            <Download size={14} className="mr-2" />
            {exportLoading ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Calendar Modal */}
      <Modal
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
        title="Lead Calendar"
        size="xl"
      >
        <LeadCalendar
          leads={leads}
          loading={leadsLoading}
        />
      </Modal>

      {showCards && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {isLoading
              ? Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)
              : kpiData.map((kpi, index) => (
                <KPICard
                  key={index}
                  {...kpi}
                  loading={false}
                  onClick={() => onFilter?.(kpi.filterType)}
                />
              ))
            }
          </div>

          {/* Smart Insights - only shown when data is available */}
          {!isLoading && leads.length > 0 && (
            <SmartInsights
              insights={[]}
              loading={isLoading}
              finalKpis={{
                ...finalKpis,
                avgDealSize: finalKpis?.avgDealSize || (leads.length > 0
                  ? leads.reduce((sum, l) => sum + (l.value || 0), 0) / leads.length
                  : 0),
                activeAgents: finalKpis?.activeAgents || performers?.performers?.length || 0
              }}
            />
          )}
        </>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelChart data={funnel.stages} loading={dashboardLoading} leads={leads} />
        <SourceChart data={sources.sources} loading={dashboardLoading} leads={leads} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart data={monthly.months} loading={dashboardLoading} />
        <AgentLeaderboard data={performers.performers} loading={dashboardLoading} leads={leads} />
      </div>
    </div>
  );
};

export default LeadAnalyticsDashboard;

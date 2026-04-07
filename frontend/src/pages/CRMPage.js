
// Solar OS – Lead Management Module (Premium Enterprise Edition)
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Phone, Mail, MapPin, TrendingUp, Users, Zap, Eye,
  BarChart2, Search, Download, Filter, MoreVertical, AlertCircle,
  X, MessageSquare, Calendar, Flame, Thermometer, Snowflake,
  Building2, DollarSign, LayoutDashboard, List, Bell,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Target,
  Edit2, Trash2, SortAsc, SortDesc, ChevronsUpDown, CheckCircle2,
  XCircle, Clock, Star, Activity, Tag, RefreshCw, Lead,
  Funnel, TrendingDown, UserCheck, AlertTriangle, Award, PieChart as PieChartIcon,
  CalendarDays, FileText, MessageSquareQuote, PhoneCall, Video,
  MailOpen, Send, CheckSquare, Square, ArrowRight, Sparkles,
  Brain, ZapOff, BatteryCharging, Wind, Sun, Moon, Cloud,
  Gauge, Targeted, FilterX, SearchX, UserPlus, UserMinus,
  Save, GitCommit, ChevronDown, Info, LayoutGrid, Package,
  HardHat, Wrench
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Treemap, ComposedChart, ScatterChart, Scatter
} from 'recharts';
import { USERS } from '../data/mockData';
import { leadsApi } from '../services/leadsApi';
import { projectsApi } from '../services/projectsApi';
import { inventoryApi } from '../services/inventoryApi';
import { surveysApi } from '../services/surveysApi';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { format, subMonths } from 'date-fns';
import FilterSystem from '../components/ui/FilterSystem';
import ImportExport from '../components/ui/ImportExport';
import LeadTracker from '../components/LeadTracker';
import { useAuditLog } from '../hooks/useAuditLog';
import { usePermissions } from '../hooks/usePermissions';
import { useDashboardFilters, useLeadFilters } from '../hooks/useDashboardFilters';
import { useAuth } from '../context/AuthContext';
import { CURRENCY } from '../config/app.config';
import CanAccess, { CanCreate, CanEdit, CanDelete, CanView } from '../components/CanAccess';
import { toast } from '../components/ui/Toast';
import LeadAnalyticsDashboard from '../components/dashboard/LeadAnalyticsDashboard.js';

// Helper function for formatting currency

// UserSelect component for lead assignment
const UserSelect = ({ value, onChange, placeholder }) => {
  const { users } = useAuth();

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder || 'Select user...'}</option>
      {(users || []).map(user => (
        <option key={user.id} value={user.id}>
          {user.name} ({user.role})
        </option>
      ))}
    </Select>
  );
};

const fmt = CURRENCY.format;

const SOURCES = ['All', 'Website', 'Referral', 'Campaign', 'Ads', 'Walk-in', 'Cold Call', 'Partner', 'Event', 'Social Media'];
const CITIES = ['All', 'Ahmedabad', 'Surat', 'Rajkot', 'Baroda', 'Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Chennai'];
const LEAD_SCORE_FACTORS = {
  budget: { high: 25, medium: 15, low: 5 },
  timeline: { urgent: 20, normal: 10, delayed: 5 },
  authority: { decision_maker: 20, influencer: 10, user: 5 },
  need: { critical: 25, important: 15, nice_to_have: 10 },
  competition: { low: 15, medium: 10, high: 5 }
};

const avatarColor = (name = '') => {
  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e', '#06b6d4', '#ec4899'];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
};

// ── Advanced Dashboard Components ──────────────────────────────────────────────
const EmptyState = ({ onAddLead }) => (
  <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
    <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center mb-4">
      <Users size={24} className="text-[var(--text-muted)]" />
    </div>
    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">No Leads Available</h3>
    <p className="text-xs text-[var(--text-muted)] mb-4 max-w-sm">
      Import or add leads to see analytics. Once you have leads, this dashboard will show your sales funnel, pipeline value, and conversion metrics.
    </p>
    <div className="flex items-center gap-2">
      <CanCreate module="crm">
        <Button variant="outline" onClick={onAddLead}>
          <Plus size={14} className="mr-1" /> Add Lead
        </Button>
      </CanCreate>
    </div>
  </div>
);

// ── Standardized KPI Card using KPICard component ─────────────────────────────
const DashboardKPI = ({ title, value, change, icon: Icon, color, subtitle, trend }) => {
  // Map color hex to variant names
  const colorMap = {
    '#22c55e': 'emerald',
    '#3b82f6': 'blue',
    '#f59e0b': 'amber',
    '#ef4444': 'red',
    '#8b5cf6': 'purple',
    '#06b6d4': 'indigo'
  };
  const variant = colorMap[color] || 'blue';

  return (
    <KPICard
      label={title}
      value={value}
      sub={subtitle}
      icon={Icon}
      variant={variant}
      trend={change !== undefined ? `${Math.abs(change)}%` : undefined}
      trendUp={change >= 0}
    />
  );
};

const ScoreDistributionChart = ({ buckets }) => {
  const data = (buckets || []).map(b => ({ score: b.bucket, count: b.count }));
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Score Distribution</h3>
        <Brain size={16} className="text-[var(--text-muted)]" />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="score" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px',
            }}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const FunnelChart = ({ stages }) => {
  const stageLabel = (k) => {
    const map = {
      new: 'New',
      contacted: 'Contacted',
      qualified: 'Qualified',
      proposal: 'Proposal',
      negotiation: 'Negotiation',
      won: 'Won',
      lost: 'Lost',
    };
    return map[k] || k;
  };

  const max = Math.max(1, ...(stages || []).map(s => s.count || 0));
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Sales Funnel</h3>
        <Funnel size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-2">
        {(stages || []).map((s) => {
          const pct = Math.round(((s.count || 0) / max) * 100);
          return (
            <div key={s.stage} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--text-primary)]">{stageLabel(s.stage)}</span>
                <span className="text-xs font-bold text-[var(--accent)]">{s.count}</span>
              </div>
              <div className="w-full bg-[var(--bg-elevated)] rounded-full h-6 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SourcePerformanceChart = ({ sources }) => {
  const data = (sources || []).map(s => ({ source: s.source, leads: s.leads, value: s.value }));
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Lead Sources</h3>
        <PieChartIcon size={16} className="text-[var(--text-muted)]" />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="source" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px',
            }}
          />
          <Bar yAxisId="left" dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const TrendCharts = ({ months }) => {
  const data = months || [];
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Leads & Pipeline Trend (Last 12 months)</h3>
        <TrendingUp size={16} className="text-[var(--green)]" />
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px',
            }}
          />
          <Bar yAxisId="left" dataKey="leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Area yAxisId="right" type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const ConversionFunnel = () => {
  const data = [
    { stage: 'Leads', count: 450, conversion: 100 },
    { stage: 'Qualified', count: 280, conversion: 62 },
    { stage: 'Proposal', count: 165, conversion: 37 },
    { stage: 'Negotiation', count: 95, conversion: 21 },
    { stage: 'Closed Won', count: 58, conversion: 13 }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Conversion Funnel</h3>
        <Funnel size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={item.stage} className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]">{item.stage}</span>
              <span className="text-xs font-bold text-[var(--accent)]">{item.count} ({item.conversion}%)</span>
            </div>
            <div className="w-full bg-[var(--bg-elevated)] rounded-full h-6 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{
                  width: `${item.conversion}%`,
                  background: `linear-gradient(90deg, #3b82f6, #8b5cf6)`,
                  opacity: 1 - (index * 0.15)
                }}
              >
                <span className="text-[10px] font-bold text-white">{item.conversion}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LeadSourceAnalytics = () => {
  const data = [
    { source: 'Website', leads: 145, value: 2400000, conversion: 18 },
    { source: 'Referral', leads: 89, value: 1800000, conversion: 32 },
    { source: 'Campaign', leads: 76, value: 1200000, conversion: 12 },
    { source: 'Ads', leads: 65, value: 980000, conversion: 8 },
    { source: 'Partner', leads: 42, value: 1500000, conversion: 28 },
    { source: 'Event', leads: 33, value: 780000, conversion: 22 }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Lead Source Performance</h3>
        <PieChartIcon size={16} className="text-[var(--text-muted)]" />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="source" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px'
            }}
          />
          <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="conversion" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const SalesPipelineChart = () => {
  const data = [
    { month: 'Jan', qualified: 45, proposal: 28, negotiation: 15, closed: 8 },
    { month: 'Feb', qualified: 52, proposal: 32, negotiation: 18, closed: 12 },
    { month: 'Mar', qualified: 48, proposal: 35, negotiation: 22, closed: 15 },
    { month: 'Apr', qualified: 61, proposal: 42, negotiation: 28, closed: 18 },
    { month: 'May', qualified: 58, proposal: 38, negotiation: 25, closed: 22 },
    { month: 'Jun', qualified: 72, proposal: 48, negotiation: 32, closed: 28 }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Sales Pipeline Trend</h3>
        <TrendingUp size={16} className="text-[var(--green)]" />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px'
            }}
          />
          <Area type="monotone" dataKey="qualified" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
          <Area type="monotone" dataKey="proposal" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
          <Area type="monotone" dataKey="negotiation" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
          <Area type="monotone" dataKey="closed" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const LeadScoreDistribution = () => {
  const data = [
    { score: '0-20', count: 45, color: '#ef4444' },
    { score: '21-40', count: 78, color: '#f59e0b' },
    { score: '41-60', count: 124, color: '#eab308' },
    { score: '61-80', count: 156, color: '#22c55e' },
    { score: '81-100', count: 47, color: '#3b82f6' }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Lead Score Distribution</h3>
        <Brain size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.score} className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--text-muted)] w-12">{item.score}</span>
            <div className="flex-1 bg-[var(--bg-elevated)] rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.count / 156) * 100}%`,
                  backgroundColor: item.color
                }}
              />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] w-8 text-right">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActivityHeatmap = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['9AM', '11AM', '1PM', '3PM', '5PM', '7PM'];

  const data = hours.map(hour => ({
    hour,
    ...days.reduce((acc, day) => ({
      ...acc,
      [day]: Math.floor(Math.random() * 100)
    }), {})
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Activity Heatmap</h3>
        <Activity size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-2">
        {data.map((row) => (
          <div key={row.hour} className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)] w-8">{row.hour}</span>
            <div className="flex gap-1 flex-1">
              {days.map((day) => (
                <div
                  key={day}
                  className="flex-1 h-6 rounded"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${row[day] / 100})`,
                    opacity: row[day] > 0 ? 1 : 0.1
                  }}
                  title={`${day} ${row.hour}: ${row[day]} activities`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3">
        {days.map((day) => (
          <span key={day} className="text-[9px] text-[var(--text-muted)]">{day[0]}</span>
        ))}
      </div>
    </div>
  );
};

// ── Comprehensive Reports Components ───────────────────────────────────────────
const PerformanceReport = () => {
  const { data: overviewRaw } = useQuery({
    queryKey: ['leads-dashboard-overview', 'reports'],
    queryFn: async () => {
      const res = await leadsApi.getDashboardOverview();
      return res?.data?.data || res?.data || res;
    },
    staleTime: 30000, // 30 seconds - data is fresh for 30s
    cacheTime: 300000, // 5 minutes - keep in cache for 5min
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: false, // Don't auto-refetch (use window focus instead)
  });

  const overview = overviewRaw;
  const totalLeads = Number(overview?.totalLeads || 0);
  const conversionRate = Number(overview?.conversionRate || 0);
  const pipelineValue = Number(overview?.pipelineValue || 0);
  const convertedLeads = Number(overview?.convertedLeads || 0);

  const avgDealSize = totalLeads > 0 ? Math.round(pipelineValue / totalLeads) : 0;
  const winRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const data = [
    { metric: 'Total Leads', current: totalLeads, previous: totalLeads, change: 0, target: Math.max(totalLeads, 1) },
    { metric: 'Conversion Rate', current: conversionRate, previous: conversionRate, change: 0, target: 30 },
    { metric: 'Avg Deal Size', current: avgDealSize, previous: avgDealSize, change: 0, target: Math.max(avgDealSize, 1) },
    { metric: 'Pipeline Value', current: pipelineValue, previous: pipelineValue, change: 0, target: Math.max(pipelineValue, 1) },
    { metric: 'Sales Cycle', current: 0, previous: 0, change: 0, target: 35 },
    { metric: 'Win Rate', current: winRate, previous: winRate, change: 0, target: 35 }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Performance Overview</h3>
        <BarChart2 size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.metric} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)]">
            <div className="flex-1">
              <p className="text-xs font-medium text-[var(--text-primary)]">{item.metric}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {item.metric.includes('Rate') || item.metric.includes('Size') || item.metric.includes('Value') ?
                    (item.metric.includes('Rate') ? `${item.current}%` : fmt(item.current)) :
                    item.current}
                </span>
                <span className={`text-[10px] font-bold ${item.change >= 0 ? 'text-[var(--green)]' : 'text-red-500'}`}>
                  {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[var(--text-muted)]">Target</p>
              <p className="text-xs font-bold text-[var(--accent)]">
                {item.metric.includes('Rate') || item.metric.includes('Size') || item.metric.includes('Value') ?
                  (item.metric.includes('Rate') ? `${item.target}%` : fmt(item.target)) :
                  item.target}
              </p>
            </div>
            <div className="ml-3">
              <div className="w-12 h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${(item.current / item.target) >= 0.9 ? 'bg-[var(--green)]' :
                    (item.current / item.target) >= 0.7 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                  style={{ width: `${Math.min((item.current / item.target) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MonthlyLeadsChart = () => (
  <div className="glass-card p-5">
    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Monthly Lead Trend</h3>
    <div className="h-40 flex items-end gap-2">
      {[18, 24, 31, 27, 42, 38, 51, 45, 62, 55, 70, 80].map((v, i) => (
        <div key={i} className="flex-1 rounded-t-lg" style={{ height: `${(v / 80) * 100}%`, background: 'linear-gradient(to top, #3b82f620, #3b82f6)' }} />
      ))}
    </div>
    <div className="flex justify-between text-[9px] text-[var(--text-faint)] mt-2 font-medium">
      {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map(m => <span key={m}>{m}</span>)}
    </div>
  </div>
);

const SLADot = ({ breached }) => (
  <div className={`w-2 h-2 rounded-full ${breached ? 'bg-red-500 animate-pulse' : 'bg-[var(--green)]'}`} title={breached ? 'SLA Breached' : 'On Time'} />
);

const StagePill = ({ stageId, stageMap }) => {
  const s = stageMap?.[stageId] || { label: stageId, color: '#94a3b8' };
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}25` }}>{s.label}</span>;
};

const SourceBadge = ({ source }) => (
  <span className="px-1.5 py-0.5 rounded-md text-[11px] font-normal bg-[#F3F4F6] text-[#374151]">{source}</span>
);

const ScoreBadge = ({ score }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${score >= 75 ? 'text-[var(--green)] bg-[var(--green)]/10' : score >= 50 ? 'text-amber-500 bg-amber-500/10' : 'text-red-500 bg-red-500/10'}`}>{score ?? 0}pts</span>
);

const LeadTrendReport = () => {
  const { data: trendRaw } = useQuery({
    queryKey: ['leads-dashboard-trend', 'reports'],
    queryFn: async () => {
      const res = await leadsApi.getDashboardTrend();
      return res?.data?.data || res?.data || res;
    },
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  const monthlyData = (trendRaw?.months || []).map((m) => ({
    month: m.month,
    leads: m.leads || 0,
    converted: 0,
    value: m.value || 0,
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Lead Generation Trends</h3>
        <TrendingUp size={16} className="text-[var(--green)]" />
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px'
            }}
          />
          <Bar yAxisId="left" dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="converted" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const SourcePerformanceReport = () => {
  const { data: sourceRaw } = useQuery({
    queryKey: ['leads-dashboard-source', 'reports'],
    queryFn: async () => {
      const res = await leadsApi.getDashboardSource();
      return res?.data?.data || res?.data || res;
    },
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  const data = (sourceRaw?.sources || []).map((s) => ({
    source: s.source,
    leads: s.leads || 0,
    conversion: 0,
    cost: 0,
    roi: 0,
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Source Performance Analysis</h3>
        <PieChartIcon size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.source} className="p-3 rounded-lg bg-[var(--bg-elevated)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">{item.source}</span>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.roi > 1000 ? 'bg-[var(--green)]/10 text-[var(--green)]' :
                item.roi > 500 ? 'bg-amber-500/10 text-amber-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                {item.roi}% ROI
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">Leads</p>
                <p className="text-xs font-bold text-[var(--text-primary)]">{item.leads}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">Conv.</p>
                <p className="text-xs font-bold text-[var(--green)]">{item.conversion}%</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">Cost</p>
                <p className="text-xs font-bold text-red-500">{fmt(item.cost)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">Revenue</p>
                <p className="text-xs font-bold text-[var(--green)]">{fmt(item.cost * item.roi / 100)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SalesTeamReport = () => {
  const { data: trendRaw } = useQuery({
    queryKey: ['leads-dashboard-trend', 'reports', 'agents'],
    queryFn: async () => {
      const res = await leadsApi.getDashboardTrend();
      return res?.data?.data || res?.data || res;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const teamData = (trendRaw?.agents || []).map((a) => ({
    name: a.name,
    leads: a.leadsAssigned || 0,
    converted: a.leadsConverted || 0,
    value: 0,
    score: Math.round(a.conversionRate || 0),
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Sales Team Performance</h3>
        <Users size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-3">
        {teamData.map((member, index) => (
          <div key={member.name} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hovered)] transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {member.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)]">{member.name}</p>
              <p className="text-[9px] text-[var(--text-muted)]">{member.leads} leads • {member.converted} converted</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[var(--accent)]">{fmt(member.value)}</p>
              <div className="flex items-center gap-1 justify-end">
                <Brain size={8} className="text-[var(--text-muted)]" />
                <span className="text-[9px] font-bold text-[var(--green)]">{member.score}pts</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-[var(--text-muted)]">Rank</p>
              <p className="text-xs font-black text-[var(--green)]">#{index + 1}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CRMPage = ({ onNavigate }) => {
  const [view, setView] = useState('dashboard');
  const [activeLeads, setActiveLeads] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalLeads, setTotalLeads] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTrackerDrawer, setShowTrackerDrawer] = useState(false);
  const [trackerLeadId, setTrackerLeadId] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [activityData, setActivityData] = useState([]);

  const editingLeadOriginalRef = useRef(null);

  // Lead Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningLeadIds, setAssigningLeadIds] = useState([]);
  const [selectedAssignUser, setSelectedAssignUser] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  // Customers State
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customersPage, setCustomersPage] = useState(1);
  const [customersPageSize, setCustomersPageSize] = useState(25);
  const [customersSearch, setCustomersSearch] = useState('');

  // Project Creation Modal State
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [selectedCustomerForProject, setSelectedCustomerForProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    status: 'planning',
    startDate: '',
    endDate: '',
    budget: 0,
    siteAddress: '',
    boqTemplate: 'residential_5kw',
    createTransfer: true,
    assignedTo: '',
    department: ''
  });
  const [boqTemplates, setBoqTemplates] = useState([
    { id: 'residential_5kw', name: 'Residential 5kW System', items: [
      { itemId: 'solar-panel-550w', name: 'Solar Panel 550W', quantity: 10, unit: 'pcs' },
      { itemId: 'inverter-5kw', name: 'Inverter 5kW', quantity: 1, unit: 'pcs' },
      { itemId: 'mounting-structure', name: 'Mounting Structure', quantity: 1, unit: 'set' },
      { itemId: 'dc-cable-4mm', name: 'DC Cable 4mm', quantity: 100, unit: 'm' },
      { itemId: 'ac-cable-10mm', name: 'AC Cable 10mm', quantity: 20, unit: 'm' },
      { itemId: 'mc4-connector', name: 'MC4 Connector', quantity: 20, unit: 'pairs' },
      { itemId: 'earthing-kit', name: 'Earthing Kit', quantity: 1, unit: 'set' },
      { itemId: 'surge-protector', name: 'Surge Protector', quantity: 1, unit: 'pcs' }
    ]},
    { id: 'residential_10kw', name: 'Residential 10kW System', items: [
      { itemId: 'solar-panel-550w', name: 'Solar Panel 550W', quantity: 20, unit: 'pcs' },
      { itemId: 'inverter-10kw', name: 'Inverter 10kW', quantity: 1, unit: 'pcs' },
      { itemId: 'mounting-structure', name: 'Mounting Structure', quantity: 1, unit: 'set' },
      { itemId: 'dc-cable-4mm', name: 'DC Cable 4mm', quantity: 200, unit: 'm' },
      { itemId: 'ac-cable-16mm', name: 'AC Cable 16mm', quantity: 30, unit: 'm' },
      { itemId: 'mc4-connector', name: 'MC4 Connector', quantity: 40, unit: 'pairs' },
      { itemId: 'earthing-kit', name: 'Earthing Kit', quantity: 2, unit: 'set' },
      { itemId: 'surge-protector', name: 'Surge Protector', quantity: 2, unit: 'pcs' }
    ]},
    { id: 'commercial_50kw', name: 'Commercial 50kW System', items: [
      { itemId: 'solar-panel-550w', name: 'Solar Panel 550W', quantity: 100, unit: 'pcs' },
      { itemId: 'inverter-50kw', name: 'Inverter 50kW', quantity: 1, unit: 'pcs' },
      { itemId: 'mounting-structure', name: 'Mounting Structure', quantity: 5, unit: 'set' },
      { itemId: 'dc-cable-6mm', name: 'DC Cable 6mm', quantity: 800, unit: 'm' },
      { itemId: 'ac-cable-35mm', name: 'AC Cable 35mm', quantity: 100, unit: 'm' },
      { itemId: 'mc4-connector', name: 'MC4 Connector', quantity: 200, unit: 'pairs' },
      { itemId: 'earthing-kit', name: 'Earthing Kit', quantity: 5, unit: 'set' },
      { itemId: 'surge-protector', name: 'Surge Protector', quantity: 5, unit: 'pcs' },
      { itemId: 'dcdb', name: 'DC Distribution Box', quantity: 1, unit: 'pcs' },
      { itemId: 'acdb', name: 'AC Distribution Box', quantity: 1, unit: 'pcs' }
    ]},
    { id: 'industrial_100kw', name: 'Industrial 100kW System', items: [
      { itemId: 'solar-panel-550w', name: 'Solar Panel 550W', quantity: 200, unit: 'pcs' },
      { itemId: 'inverter-100kw', name: 'Inverter 100kW', quantity: 1, unit: 'pcs' },
      { itemId: 'mounting-structure', name: 'Mounting Structure', quantity: 10, unit: 'set' },
      { itemId: 'dc-cable-6mm', name: 'DC Cable 6mm', quantity: 1500, unit: 'm' },
      { itemId: 'ac-cable-70mm', name: 'AC Cable 70mm', quantity: 150, unit: 'm' },
      { itemId: 'mc4-connector', name: 'MC4 Connector', quantity: 400, unit: 'pairs' },
      { itemId: 'earthing-kit', name: 'Earthing Kit', quantity: 10, unit: 'set' },
      { itemId: 'surge-protector', name: 'Surge Protector', quantity: 10, unit: 'pcs' },
      { itemId: 'dcdb', name: 'DC Distribution Box', quantity: 2, unit: 'pcs' },
      { itemId: 'acdb', name: 'AC Distribution Box', quantity: 2, unit: 'pcs' }
    ]}
  ]);
  const [projectCreateLoading, setProjectCreateLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [hrmEmployees, setHrmEmployees] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [filteredHrmEmployees, setFilteredHrmEmployees] = useState([]);

  const normalizeStageKey = (lead) => (lead?.statusKey || lead?.status || 'new').toString().toLowerCase();
  const getLeadId = (lead) => String(lead?._id || lead?.id || '');
  const dragRef = useRef(null);
  const removeById = (arr, id) => {
    const targetId = String(id);
    let removed = null;
    const next = [];
    for (const item of arr || []) {
      if (!removed && getLeadId(item) === targetId) {
        removed = item;
        continue;
      }
      next.push(item);
    }
    return { next, removed };
  };
  const insertAt = (arr, index, item) => {
    const list = Array.isArray(arr) ? arr : [];
    const i = Math.max(0, Math.min(Number.isFinite(index) ? index : list.length, list.length));
    return [...list.slice(0, i), item, ...list.slice(i)];
  };
  const reorderLeadInActiveLeads = ({ prev, leadId, destStageKey, destIndex, destStageLeadIds }) => {
    const { next: withoutDragged, removed } = removeById(prev || [], leadId);
    if (!removed) return prev;

    const updated = { ...removed, statusKey: destStageKey, status: destStageKey };

    const ids = Array.isArray(destStageLeadIds) ? destStageLeadIds : [];
    const beforeId = ids[destIndex];

    if (beforeId) {
      const insertBeforeIdx = withoutDragged.findIndex((l) => getLeadId(l) === String(beforeId));
      if (insertBeforeIdx !== -1) {
        return insertAt(withoutDragged, insertBeforeIdx, updated);
      }
    }

    let lastIdxInStage = -1;
    for (let i = 0; i < withoutDragged.length; i++) {
      if (normalizeStageKey(withoutDragged[i]) === String(destStageKey).toLowerCase()) lastIdxInStage = i;
    }
    return insertAt(withoutDragged, lastIdxInStage === -1 ? withoutDragged.length : lastIdxInStage + 1, updated);
  };
  const [actionLoading, setActionLoading] = useState(false);
  const [showScoreEditModal, setShowScoreEditModal] = useState(false);
  const [scoreEditingLead, setScoreEditingLead] = useState(null);
  const [newScore, setNewScore] = useState('');

  // Score Boost Modal State
  const [showScoreBoostModal, setShowScoreBoostModal] = useState(false);
  const [scoreBoostLeadIds, setScoreBoostLeadIds] = useState([]);
  const [scoreBoostValue, setScoreBoostValue] = useState(10);
  const [scoreBoostLoading, setScoreBoostLoading] = useState(false);

  // Dashboard queries removed - handled by LeadAnalyticsDashboard component
  // to avoid duplicate API calls
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [dashboardQuickFilter, setDashboardQuickFilter] = useState('all'); // 'all', 'today', 'thisWeek', 'thisMonth', 'custom' - FOR DASHBOARD ONLY
  const sortDropdownRef = useRef(null);
  const columnsDropdownRef = useRef(null);

  // Initialize independent filter hooks - COMPLETE ISOLATION
  const {
    dateRangeFilter: dashboardDateRangeFilter,
    setDateRangeFilter: setDashboardDateRangeFilter,
    resetDateRangeFilter: resetDashboardDateRangeFilter
  } = useDashboardFilters();

  console.log('[CRM PAGE] Dashboard filter state:', dashboardDateRangeFilter);

  const {
    dateRangeFilter: leadsDateRangeFilter,
    setDateRangeFilter: setLeadsDateRangeFilter,
    resetDateRangeFilter: resetLeadsDateRangeFilter
  } = useLeadFilters();

  console.log('[CRM PAGE] Leads filter state:', leadsDateRangeFilter);

  const [showDateRangeDropdown, setShowDateRangeDropdown] = useState(false);
  const dateRangeRef = useRef(null);
  const [showDateRangeInfo, setShowDateRangeInfo] = useState(false);
  const dateRangeInfoRef = useRef(null);
  // Kanban drag-to-scroll state
  const kanbanScrollRef = useRef(null);
  const [isKanbanDragging, setIsKanbanDragging] = useState(false);
  const [kanbanDragStartX, setKanbanDragStartX] = useState(0);
  const [kanbanScrollStartX, setKanbanScrollStartX] = useState(0);
  // Date range preset options
  const dateRangeOptions = [
    { id: 'all', label: 'All Time', days: null },
    { id: 'today', label: 'Today', days: 0 },
    { id: 'yesterday', label: 'Yesterday', days: 1 },
    { id: 'last7days', label: 'Last 7 Days', days: 7 },
    { id: 'last30days', label: 'Last 30 Days', days: 30 },
    { id: 'thisMonth', label: 'This Month', days: null },
    { id: 'lastMonth', label: 'Last Month', days: null },
    { id: 'custom', label: 'Custom Range', days: null },
  ];

  const [automationRules, setAutomationRules] = useState([
    { id: 1, name: 'High Value Alert', condition: 'value > 500000', action: 'notify_manager', enabled: true },
    { id: 2, name: 'SLA Follow-up', condition: 'days_inactive > 3', action: 'send_email', enabled: true },
    { id: 3, name: 'Score Boost', condition: 'source == referral', action: 'add_10_points', enabled: false }
  ]);

  const [activeFilters, setActiveFilters] = useState([]);
  const [quickFilter, setQuickFilter] = useState(null); // FOR LEADS TABLE FILTERING - separate from dashboardQuickFilter

  // Advanced filter states - arrays for multiple values
  const [filterStages, setFilterStages] = useState([]); // multiple stages
  const [filterScoreRanges, setFilterScoreRanges] = useState([]); // multiple score ranges
  const [filterValueRanges, setFilterValueRanges] = useState([]); // multiple value ranges
  const [filterSources, setFilterSources] = useState([]); // multiple sources

  // Temp states for adding new values
  const [tempStage, setTempStage] = useState('');
  const [tempScoreMin, setTempScoreMin] = useState('');
  const [tempScoreMax, setTempScoreMax] = useState('');
  const [tempValueMin, setTempValueMin] = useState('');
  const [tempValueMax, setTempValueMax] = useState('');
  const [tempSource, setTempSource] = useState('');

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    statusKey: true,
    score: true,
    value: true,
    automation: true,
    source: true
  });

  const { logCreate, logUpdate, logDelete } = useAuditLog('CRM');
  const crmPerms = usePermissions('crm');
  const can = crmPerms.can;

  // DEBUG: Log permission checks
  useEffect(() => {
    console.log('[DEBUG] CRM Permissions:', {
      canView: crmPerms.canView,
      canCreate: crmPerms.canCreate,
      canEdit: crmPerms.canEdit,
      canDelete: crmPerms.canDelete,
      canAssign: crmPerms.canAssign,
      canExport: crmPerms.canExport,
    });
    console.log('[DEBUG] Permission checks:', {
      'crm edit': can('crm', 'edit'),
      'crm assign': can('crm', 'assign'),
      'crm delete': can('crm', 'delete'),
    });
  }, [crmPerms, can]);
  const { user } = useAuth();

  useEffect(() => {
    if (!showDateRangeInfo) return;
    const onDocClick = (e) => {
      const el = dateRangeInfoRef.current;
      if (!el) return;
      if (!el.contains(e.target)) {
        setShowDateRangeInfo(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showDateRangeInfo]);

  // CRITICAL FIX: Close date range dropdown when clicking outside
  useEffect(() => {
    if (!showDateRangeDropdown) return;
    const onDocClick = (e) => {
      const el = dateRangeRef.current;
      if (!el) return;
      if (!el.contains(e.target)) {
        setShowDateRangeDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showDateRangeDropdown]);

  const isAdminLike = useMemo(() => {
    const role = String(user?.role || '').toLowerCase();
    return role === 'admin' || role === 'superadmin' || user?.isSuperAdmin === true;
  }, [user?.role, user?.isSuperAdmin]);

  // Get user's data scope for visibility indicator
  const userDataScope = user?.dataScope || 'ASSIGNED';

  const statusMap = useMemo(() => {
    const map = {};
    console.log('[DEBUG] Status options raw:', statusOptions);
    (statusOptions || []).forEach(s => {
      let label = s.label;
      let key = s.key;

      console.log('[DEBUG] Processing status:', { key, label });

      // Transform status labels
      if (key === 'normal' || label === 'Normal') {
        label = 'Pending';
      } else if (key === 'failure' || label === 'Failure') {
        label = 'Dead';
      }

      map[key] = { label, color: s.color };
    });
    console.log('[DEBUG] Final statusMap:', map);
    return map;
  }, [statusOptions]);

  const crmFields = useMemo(() => {
    return [
      { id: 'name', label: 'Lead Name', type: 'text', required: true },
      { id: 'company', label: 'Company', type: 'text' },
      { id: 'email', label: 'Email', type: 'email' },
      { id: 'phone', label: 'Phone', type: 'tel' },
      { id: 'statusKey', label: 'Stage', type: 'select', options: (statusOptions || []).map(s => ({ id: s.key, label: s.label, color: s.color })) },
      { id: 'value', label: 'Deal Value', type: 'number' },
      { id: 'source', label: 'Source', type: 'select', options: ['Website', 'Referral', 'Campaign', 'Ads'] },
    ];
  }, [statusOptions]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[DEBUG] Fetching status options...');
        const res = await leadsApi.getStatusOptions();
        console.log('[DEBUG] Status options response:', res);
        const list = res?.data?.data || res?.data || [];
        console.log('[DEBUG] Extracted list:', list);
        if (!mounted) return;
        setStatusOptions(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error('[DEBUG] Error fetching status options:', e);
        if (!mounted) return;
        setStatusOptions([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Helper function to get date range based on preset - MUST be defined before fetchLeads
  const getDateRangeFromPreset = useCallback((preset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate, endDate;

    switch (preset) {
      case 'all':
        // No date restriction - return all leads
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
        endDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of current month
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (leadsDateRangeFilter.startDate && leadsDateRangeFilter.endDate) {
          startDate = new Date(leadsDateRangeFilter.startDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(leadsDateRangeFilter.endDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // If custom selected but dates not set, return all (no date restriction)
          return { startDate: null, endDate: null };
        }
        break;
      default:
        // Default to all time (no date restriction)
        return { startDate: null, endDate: null };
    }

    return { startDate, endDate };
  }, [leadsDateRangeFilter.startDate, leadsDateRangeFilter.endDate]);

  // Fetch leads from API with filters
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pageSize,
        search: debouncedSearch,
      };

      // Wire existing UI filters to backend where supported (single-value)
      if (Array.isArray(filterStages) && filterStages.length === 1) {
        params.statusKey = filterStages[0];
      }
      if (Array.isArray(filterSources) && filterSources.length === 1) {
        params.source = filterSources[0];
      }
      if (Array.isArray(filterScoreRanges) && filterScoreRanges.length === 1) {
        const r = filterScoreRanges[0];
        if (r?.min !== '' && r?.min !== undefined) params.minScore = r.min;
        if (r?.max !== '' && r?.max !== undefined) params.maxScore = r.max;
      }
      if (Array.isArray(filterValueRanges) && filterValueRanges.length === 1) {
        const r = filterValueRanges[0];
        if (r?.min !== '' && r?.min !== undefined) params.minValue = r.min;
        if (r?.max !== '' && r?.max !== undefined && r?.max !== '∞') params.maxValue = r.max;
      }

      // Add date range filter
      console.log('[FILTER DEBUG] leadsDateRangeFilter:', leadsDateRangeFilter);
      const type = String(leadsDateRangeFilter.type || 'all');
      if (type !== 'all') {
        const presetRange = getDateRangeFromPreset(type);
        const start = leadsDateRangeFilter.startDate || (presetRange?.startDate ? presetRange.startDate.toISOString() : null);
        const end = leadsDateRangeFilter.endDate || (presetRange?.endDate ? presetRange.endDate.toISOString() : null);
        if (start && end) {
          params.startDate = start;
          params.endDate = end;
          console.log('[FILTER DEBUG] Sending dates to API:', { startDate: params.startDate, endDate: params.endDate });
        } else {
          console.log('[FILTER DEBUG] Date preset selected but range missing - fallback to all');
        }
      } else {
        console.log('[FILTER DEBUG] All time selected - showing all leads');
      }

      // Only add sort params if sort key is valid
      if (sort.key) {
        params.sortBy = sort.key;
        params.sortOrder = sort.dir;
      }
      // Add quick filter
      if (quickFilter) {
        params.quickFilter = quickFilter;
      }
      const result = await leadsApi.getAll(params);

      // Backend returns: { success, data: [], total, page, pages }
      const leadsData = Array.isArray(result?.data) ? result.data : (result?.data?.data || result?.data || []);
      console.log('[DEBUG] Raw leads from API:', leadsData.slice(0, 3).map(l => ({ name: l.name, status: l.status, statusKey: l.statusKey })));
      const totalCount = Number(result?.total || result?.data?.total || 0);
      const currentPage = Number(result?.page || page || 1);
      const totalPages = Number(result?.pages || 1);

      if (currentPage > totalPages && totalPages > 0) {
        setPage(totalPages);
        return;
      }

      setActiveLeads(leadsData);
      setTotalLeads(totalCount);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setError('Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, sort.key, sort.dir, quickFilter, leadsDateRangeFilter.type, leadsDateRangeFilter.startDate, leadsDateRangeFilter.endDate, filterStages, filterSources, filterScoreRanges, filterValueRanges]);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const params = {
        page: customersPage,
        limit: customersPageSize,
        search: customersSearch,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await leadsApi.getCustomers(params);

      console.log('[DEBUG] getCustomers API response:', result);

      const customersData = Array.isArray(result?.data) ? result.data : (result?.data?.data || result?.data || []);

      console.log('[DEBUG] Raw customers data count:', customersData.length);
      console.log('[DEBUG] First customer sample:', customersData[0]);

      // SAFETY FILTER: Only show leads with status="customer" (defense-in-depth)
      const verifiedCustomers = customersData.filter(l => {
        const status = (l.status || l.statusKey || l.stage || '').toString().toLowerCase();
        console.log(`[DEBUG] Customer ${l.name} status:`, status, '| Fields:', { status: l.status, statusKey: l.statusKey, stage: l.stage });
        return status === 'customer';
      });

      console.log('[DEBUG] Verified customers count:', verifiedCustomers.length);

      const totalCount = verifiedCustomers.length;
      const currentPage = Number(result?.page || customersPage || 1);
      const totalPages = Math.max(1, Math.ceil(totalCount / customersPageSize));

      if (currentPage > totalPages && totalPages > 0) {
        setCustomersPage(totalPages);
        return;
      }

      setCustomers(verifiedCustomers);
      setCustomersTotal(totalCount);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      toast.error('Failed to load customers. Please try again.');
    } finally {
      setCustomersLoading(false);
    }
  }, [customersPage, customersPageSize, customersSearch]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (view === 'customers') {
      fetchCustomers();
    }
  }, [view, fetchCustomers]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Row Actions with real API calls
  const handleViewLead = (lead) => {
    // Reset previous selection first to prevent stale data
    setSelectedLead(null);
    // Then set new lead after a micro-task to ensure clean render
    setTimeout(() => {
      setSelectedLead(lead);
    }, 0);
  };

  const handleViewTracker = (lead) => {
    setTrackerLeadId(lead._id);
    setShowTrackerDrawer(true);
  };

  // Project Creation Handlers
  const handleOpenCreateProjectModal = (customer) => {
    setSelectedCustomerForProject(customer);
    setProjectForm({
      name: `${customer.name} - Solar Project`,
      description: `Solar installation project for ${customer.company || customer.name}`,
      status: 'planning',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      budget: 0,
      siteAddress: customer.address || '',
      boqTemplate: 'residential_5kw',
      createTransfer: true,
      assignedTo: '',
      department: ''
    });
    setSelectedDepartment('');
    setFilteredHrmEmployees([]);
    setShowCreateProjectModal(true);

    // Load departments and employees from HRM
    fetchHrmDepartmentsAndEmployees();
  };

  const fetchHrmDepartmentsAndEmployees = async () => {
    try {
      // Fetch departments from HRM API
      const deptsResult = await leadsApi.getHrmDepartments();
      const deptsData = deptsResult?.data?.data || deptsResult?.data || [];
      setDepartments(Array.isArray(deptsData) ? deptsData : []);

      // Fetch employees from HRM API
      const empsResult = await leadsApi.getHrmEmployees();
      const empsData = empsResult?.data?.data || empsResult?.data || [];
      setHrmEmployees(Array.isArray(empsData) ? empsData : []);
    } catch (err) {
      console.error('[PROJECT] Failed to fetch HRM data:', err);
      setDepartments([]);
      setHrmEmployees([]);
    }
  };

  const handleDepartmentChange = (deptId) => {
    setSelectedDepartment(deptId);
    setProjectForm(prev => ({ ...prev, department: deptId, assignedTo: '' }));

    // Filter employees by selected department
    if (deptId) {
      const filtered = hrmEmployees.filter(emp => {
        // Handle various department field formats
        const empDeptId = emp.department?._id || emp.department?.id || emp.departmentId || emp.department_id || emp.department;
        // Also check if department is a string (department name)
        if (typeof emp.department === 'string') {
          // Find department name from departments list
          const dept = departments.find(d => d._id === deptId || d.id === deptId);
          return dept && emp.department.toLowerCase() === dept.name?.toLowerCase();
        }
        return empDeptId === deptId;
      });
      setFilteredHrmEmployees(filtered);
    } else {
      setFilteredHrmEmployees([]);
    }
  };

  const handleCloseCreateProjectModal = () => {
    setShowCreateProjectModal(false);
    setSelectedCustomerForProject(null);
    setProjectForm({
      name: '',
      description: '',
      status: 'planning',
      startDate: '',
      endDate: '',
      budget: 0,
      siteAddress: '',
      boqTemplate: 'residential_5kw',
      createTransfer: true,
      assignedTo: '',
      department: ''
    });
    setSelectedDepartment('');
    setFilteredHrmEmployees([]);
    setDepartments([]);
    setHrmEmployees([]);
  };

  const handleCreateProject = async () => {
    if (!selectedCustomerForProject) return;

    try {
      setProjectCreateLoading(true);

      const normalizedStatus = (() => {
        const s = String(projectForm.status || '').toLowerCase();
        if (s === 'planning') return 'Survey';
        if (s === 'accepted') return 'Procurement';
        if (s === 'in_progress') return 'Installation';
        if (s === 'on_hold') return 'On Hold';
        if (s === 'completed') return 'Commissioned';
        if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
        return projectForm.status;
      })();

      // Get selected BOQ template items
      const selectedTemplate = boqTemplates.find(t => t.id === projectForm.boqTemplate);
      const boqItems = selectedTemplate ? selectedTemplate.items : [];

      // Create project data
      const projectData = {
        name: projectForm.name,
        description: projectForm.description,
        customerId: selectedCustomerForProject._id || selectedCustomerForProject.id,
        customerName: selectedCustomerForProject.name,
        customerEmail: selectedCustomerForProject.email,
        customerPhone: selectedCustomerForProject.phone,
        siteAddress: projectForm.siteAddress,
        status: normalizedStatus,
        startDate: projectForm.startDate,
        endDate: projectForm.endDate,
        budget: Number(projectForm.budget) || 0,
        boqItems: boqItems,
        boqTemplate: projectForm.boqTemplate,
        source: 'crm',
        assignedTo: projectForm.assignedTo,
        department: projectForm.department
      };

      console.log('[PROJECT] Creating project:', projectData);

      // Create project via API
      const projectResult = await projectsApi.create(projectData);
      const createdProject = projectResult?.data?.data || projectResult?.data || projectResult;

      console.log('[PROJECT] Project created:', createdProject);

      // If status is 'accepted' and createTransfer is true, trigger stock transfer
      if (projectForm.status === 'accepted' && projectForm.createTransfer && boqItems.length > 0) {
        console.log('[PROJECT] Status is accepted - triggering stock transfer');
        await handleStockTransferForProject(createdProject, boqItems);
      }

      toast.success(`Project "${projectForm.name}" created successfully`);
      handleCloseCreateProjectModal();

      // Navigate to projects page if onNavigate is available
      if (onNavigate) {
        onNavigate('projects');
      }

    } catch (err) {
      console.error('[PROJECT] Failed to create project:', err);
      toast.error(err?.response?.data?.message || 'Failed to create project');
    } finally {
      setProjectCreateLoading(false);
    }
  };

  // Handle stock transfer for accepted projects
  const handleStockTransferForProject = async (project, boqItems) => {
    try {
      console.log('[TRANSFER] Starting stock transfer for project:', project._id || project.id);

      const transferPromises = boqItems.map(async (item) => {
        try {
          // Transfer from Main Warehouse to On-Site Warehouse
          const transferData = {
            itemId: item.itemId,
            itemName: item.name,
            fromWarehouse: 'Main Warehouse',
            toWarehouse: 'On-Site Warehouse',
            quantity: item.quantity,
            unit: item.unit,
            projectId: project._id || project.id,
            projectName: project.name,
            reference: `Project: ${project.name}`,
            referenceType: 'PROJECT_TRANSFER',
            remarks: `Auto-transfer for accepted project - ${item.name}`
          };

          console.log('[TRANSFER] Transferring item:', transferData);

          // Call inventory transfer API
          await inventoryApi.transferStock(transferData);

          return { success: true, item: item.name };
        } catch (itemErr) {
          console.error(`[TRANSFER] Failed to transfer item ${item.name}:`, itemErr);
          return { success: false, item: item.name, error: itemErr.message };
        }
      });

      const results = await Promise.all(transferPromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(`${successCount} items transferred from Main Warehouse to On-Site Warehouse`);
      }

      if (failCount > 0) {
        const failedItems = results.filter(r => !r.success).map(r => r.item).join(', ');
        toast.warning(`Failed to transfer ${failCount} items: ${failedItems}`);
      }

      console.log('[TRANSFER] Transfer results:', results);

    } catch (err) {
      console.error('[TRANSFER] Stock transfer failed:', err);
      toast.error('Failed to transfer stock for project');
    }
  };

  const handleEditLead = async (lead) => {
    try {
      // Fetch fresh lead data to ensure we have latest status
      const freshLead = await leadsApi.getById(lead._id || lead.id);
      console.log('[EDIT] Raw API response:', freshLead);

      const leadData = freshLead?.data?.data || freshLead?.data || freshLead;
      console.log('[EDIT] Extracted lead data:', leadData);
      console.log('[EDIT] statusKey from API:', leadData?.statusKey);
      console.log('[EDIT] status from API:', leadData?.status);
      console.log('[EDIT] statusKey from table:', lead?.statusKey);

      // Use statusKey from API, or fallback to table data, or status field, or default to 'new'
      // Handle null/undefined properly - API might return statusKey: null
      const apiStatusKey = leadData?.statusKey;
      const tableStatusKey = lead?.statusKey;
      const apiStatus = leadData?.status;
      const tableStatus = lead?.status;

      const finalStatusKey = apiStatusKey != null ? apiStatusKey :
        (tableStatusKey != null ? tableStatusKey :
          (apiStatus != null ? apiStatus :
            (tableStatus != null ? tableStatus : 'new')));
      console.log('[EDIT] Final statusKey:', finalStatusKey);

      // Merge fresh data with preserved statusKey
      const normalizedLeadData = {
        ...leadData,
        statusKey: finalStatusKey,
        status: finalStatusKey
      };

      if (leadData) {
        editingLeadOriginalRef.current = normalizedLeadData;
        setEditingLead(normalizedLeadData);
      } else {
        // Fallback to passed lead if API fails
        editingLeadOriginalRef.current = lead;
        setEditingLead(lead);
      }
    } catch (err) {
      console.error('[EDIT] Failed to fetch fresh lead data:', err);
      // Fallback to passed lead
      editingLeadOriginalRef.current = lead;
      setEditingLead(lead);
    }
    // Open modal AFTER setting editingLead state
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLead) return;
    try {
      setActionLoading(true);

      const originalAssignedTo = (editingLeadOriginalRef.current || {})?.assignedTo;

      // Handle lead assignment if changed
      if (editingLead.assignedTo && editingLead.assignedTo !== originalAssignedTo) {
        await leadsApi.assignLead(editingLead._id, editingLead.assignedTo);
      }

      // Build update data with custom fields
      const updateData = {
        name: editingLead.name,
        company: editingLead.company,
        email: editingLead.email,
        phone: editingLead.phone,
        source: editingLead.source,
        city: editingLead.city,
        statusKey: editingLead.statusKey,
        value: editingLead.value,
        notes: editingLead.notes,
        customFields: editingLead.customFields || {}
      };
      await leadsApi.update(editingLead._id, updateData);
      logUpdate(editingLead);
      setShowEditModal(false);
      setEditingLead(null);
      fetchLeads(); // Refresh list
      // If detail modal is open, refresh it
      if (selectedLead && selectedLead._id === editingLead._id) {
        const updated = await leadsApi.getById(editingLead._id);
        setSelectedLead(updated?.data?.data || updated?.data || updated);
      }
    } catch (err) {
      console.error('Failed to update lead:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update lead');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicateLead = async (lead) => {
    try {
      setActionLoading(true);
      const duplicated = await leadsApi.duplicate(lead._id);
      logCreate(duplicated?.data?.data || duplicated?.data || duplicated);
      fetchLeads(); // Refresh list
    } catch (err) {
      console.error('Failed to duplicate lead:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveLead = async (lead) => {
    try {
      setActionLoading(true);
      await leadsApi.archive(lead._id);
      logUpdate({ ...lead, archived: true });
      fetchLeads(); // Refresh list
      if (selectedLead && selectedLead._id === lead._id) {
        setSelectedLead(null); // Close detail modal
      }
    } catch (err) {
      console.error('Failed to archive lead:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLead = async (lead) => {
    try {
      setActionLoading(true);
      await leadsApi.delete(lead._id);
      logDelete(lead);
      toast.success(`Lead "${lead.name}" deleted successfully`);
      setActiveLeads((prev) => (Array.isArray(prev) ? prev.filter((l) => l?._id !== lead._id) : prev));
      setTotalLeads((prev) => Math.max(0, Number(prev || 0) - 1));
      fetchLeads(); // Refresh list
      if (selectedLead && selectedLead._id === lead._id) {
        setSelectedLead(null); // Close detail modal
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
      toast.error(err?.response?.data?.message || 'Failed to delete lead');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecalculateScore = async (lead) => {
    setScoreEditingLead(lead);
    setNewScore(String(lead.score || 0));
    setShowScoreEditModal(true);
  };

  const handleSaveScore = async () => {
    if (!scoreEditingLead) return;
    try {
      setActionLoading(true);
      const scoreValue = parseInt(newScore) || 0;
      // Include all required fields for MongoDB validation
      const response = await leadsApi.update(scoreEditingLead._id, {
        score: scoreValue,
        name: scoreEditingLead.name,
        leadId: scoreEditingLead.leadId,
        phone: scoreEditingLead.phone || '',
        email: scoreEditingLead.email || '',
        source: scoreEditingLead.source || '',
        statusKey: scoreEditingLead.statusKey || 'new'
      });
      console.log('[handleSaveScore] Update response:', response);
      logUpdate({ ...scoreEditingLead, score: scoreValue });
      setScoreEditingLead(null);
      setShowScoreEditModal(false);
      await fetchLeads(); // Refresh and wait
      console.log('[handleSaveScore] Leads refreshed');
    } catch (err) {
      console.error('Failed to update score:', err);
      setScoreEditingLead(null);
      setShowScoreEditModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Flip action - Move lead to survey stage (use existing stage from Lead Status Builder)
  const handleFlipToSurvey = async (lead) => {
    try {
      setActionLoading(true);

      // Update lead stage to 'survey' (this uses the existing 'survey' status from Lead Status Builder)
      console.log('[FLIP] Calling updateStage for lead:', lead._id, 'with stage: survey');
      const updateResult = await leadsApi.updateStage(lead._id || lead.id, 'survey');
      console.log('[FLIP] updateStage response:', updateResult);

      logUpdate({ ...lead, stage: 'survey' });

      // Wait and fetch fresh data
      console.log('[FLIP] Fetching leads after flip...');
      await fetchLeads();
      console.log('[FLIP] Leads refreshed, activeLeads:', activeLeads);

      toast.success(`Lead "${lead.name}" flipped to Site Survey`);
    } catch (err) {
      console.error('[FLIP] Failed to flip lead:', err);
      console.error('[FLIP] Error response:', err?.response?.data);
      toast.error('Failed to flip lead: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewTimeline = async (lead) => {
    try {
      setActionLoading(true);
      const result = await leadsApi.getTimeline(lead._id);
      setTimelineData(result.data || result || []);
      setShowTimelineModal(true);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewActivity = async (lead) => {
    try {
      setActionLoading(true);
      setActivityLeadId(lead._id);
      const result = await leadsApi.getTimeline(lead._id);
      setActivityData(result.data || result || []);
      setShowActivityModal(true);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle save new activity
  const handleSaveActivity = async () => {
    if (!newActivityNote.trim() || !activityLeadId) return;
    try {
      setActionLoading(true);
      await leadsApi.addActivity(activityLeadId, {
        type: 'note',
        note: newActivityNote.trim(),
        by: 'User'
      });
      setNewActivityNote('');
      // Refresh activity data
      const result = await leadsApi.getTimeline(activityLeadId);
      setActivityData(result.data || result || []);
    } catch (err) {
      console.error('Failed to add activity:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Actions
  const handleBulkExport = async (selectedIds) => {
    if (!guardExport()) return;
    if (!selectedIds || selectedIds.length === 0) {
      toast.error('Please select leads to export');
      return;
    }
    try {
      setActionLoading(true);
      toast.loading('Exporting leads...', { id: 'export' });

      const result = await leadsApi.exportCSV(selectedIds);
      const { csv, filename } = result.data || result;

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${selectedIds.length} leads exported successfully`, { id: 'export' });
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to export leads', { id: 'export' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async (selectedIds) => {
    try {
      setActionLoading(true);
      await leadsApi.bulkDelete(selectedIds);
      logDelete({ ids: selectedIds });
      toast.success(`${selectedIds.length} leads deleted successfully`);
      setActiveLeads((prev) => (Array.isArray(prev) ? prev.filter((l) => !selectedIds.includes(l?._id)) : prev));
      setTotalLeads((prev) => Math.max(0, Number(prev || 0) - Number(selectedIds?.length || 0)));
      fetchLeads();
      setSelected(new Set());
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      toast.error(err?.response?.data?.message || 'Failed to delete leads');
    } finally {
      setActionLoading(false);
    }
  };

  // Lead Assignment Handlers
  const handleOpenAssignModal = async (leadIds) => {
    setAssigningLeadIds(Array.isArray(leadIds) ? leadIds : [leadIds]);
    setSelectedAssignUser('');
    setSelectedRole('');
    setFilteredUsers([]);
    setShowAssignModal(true);

    // Load roles and employees when modal opens
    try {
      setRolesLoading(true);

      console.log('[ASSIGN] Opening Assign Leads modal...');

      // Fetch all roles
      const rolesResult = await leadsApi.getRoles();
      console.log('[ASSIGN] Roles API raw response:', rolesResult);
      console.log('[ASSIGN] Roles response.data:', rolesResult.data);

      // apiClient interceptor returns response.data already.
      // Expected body: { success: true, data: [...] }
      const rolesBody = rolesResult?.data ?? rolesResult;
      const rolesPayload = rolesBody?.success === true && rolesBody?.data != null ? rolesBody.data : rolesBody;
      const rawRoles = Array.isArray(rolesPayload)
        ? rolesPayload
        : rolesPayload && typeof rolesPayload === 'object'
          ? Object.values(rolesPayload)
          : [];

      const rolesData = (Array.isArray(rawRoles) ? rawRoles : [])
        .map((r) => {
          const id = r?._id || r?.id || r?.roleId;
          const name = r?.name || r?.label;
          if (!id || !name) return null;
          return { ...r, _id: id, name };
        })
        .filter(Boolean);

      console.log('[ASSIGN] Fetched roles:', rolesData);
      console.log('[ASSIGN] Roles count:', rolesData.length);
      setRoles(rolesData);

      // Fetch all employees upfront
      const employeesResult = await leadsApi.getAllEmployees();
      const employeesBody = employeesResult?.data ?? employeesResult;
      const employeesPayload = employeesBody?.success === true && employeesBody?.data != null ? employeesBody.data : employeesBody;
      const employeesData = employeesPayload?.data ?? employeesPayload ?? [];
      console.log('[ASSIGN] Fetched employees:', employeesData);
      setAllEmployees(Array.isArray(employeesData) ? employeesData : []);

      if (rolesData.length === 0) {
        console.warn('[ASSIGN] No roles found in system');
      }

    } catch (err) {
      console.error('Failed to fetch roles/employees:', err);
      setRoles([]);
      setAllEmployees([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setAssigningLeadIds([]);
    setSelectedAssignUser('');
    setSelectedRole('');
    setFilteredUsers([]);
    setAllEmployees([]);
  };

  // Score Boost Handlers
  const handleOpenScoreBoostModal = (leadIds) => {
    setScoreBoostLeadIds(Array.isArray(leadIds) ? leadIds : [leadIds]);
    setScoreBoostValue(10);
    setShowScoreBoostModal(true);
  };

  const handleCloseScoreBoostModal = () => {
    setShowScoreBoostModal(false);
    setScoreBoostLeadIds([]);
    setScoreBoostValue(10);
  };

  const handleScoreBoost = async () => {
    if (!scoreBoostValue || scoreBoostLeadIds.length === 0) return;

    try {
      setScoreBoostLoading(true);
      await leadsApi.bulkScore(scoreBoostLeadIds, scoreBoostValue);
      toast.success(`${scoreBoostLeadIds.length} leads boosted by ${scoreBoostValue} points`);
      fetchLeads();
      handleCloseScoreBoostModal();
    } catch (err) {
      console.error('Failed to boost scores:', err);
      toast.error(err?.response?.data?.message || 'Failed to boost scores');
    } finally {
      setScoreBoostLoading(false);
    }
  };

  const handleRoleChange = async (roleId) => {
    console.log('[ASSIGN] Role selected:', roleId);

    setSelectedRole(roleId);
    setSelectedAssignUser('');
    setFilteredUsers([]);

    if (!roleId) return;

    // Filter employees by selected role ID
    try {
      setUsersLoading(true);

      console.log('[ASSIGN] All employees:', allEmployees);
      console.log('[ASSIGN] Filtering employees for roleId:', roleId);

      const selectedRoleLower = String(roleId || '').toLowerCase();
      const selectedRoleObj = Array.isArray(roles)
        ? roles.find((r) => String(r?._id || r?.id || '').toLowerCase() === selectedRoleLower)
        : null;
      const selectedRoleNameLower = String(selectedRoleObj?.name || selectedRoleObj?.label || '').toLowerCase();

      // Build dropdown-ready list of employees whose role matches the selected role
      const filtered = allEmployees.reduce((acc, emp) => {
        const empRoleRaw = emp?.roleId;
        const candidates = new Set(
          [
            empRoleRaw,
            empRoleRaw?._id,
            empRoleRaw?.id,
            empRoleRaw?.roleId,
            empRoleRaw?.label,
            empRoleRaw?.name,
          ]
            .filter(Boolean)
            .map((v) => String(v).toLowerCase())
        );

        const matches =
          candidates.has(selectedRoleLower) ||
          (selectedRoleNameLower ? candidates.has(selectedRoleNameLower) : false);

        const empName = `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() || emp?.email;
        console.log(
          `[ASSIGN] Employee: ${empName}, emp.roleId: ${JSON.stringify(empRoleRaw)}, matches: ${matches}`
        );

        if (!matches) return acc;

        const empId = emp?._id || emp?.id;
        if (!empId) return acc;

        acc.push({ ...emp, _id: empId, name: empName });
        return acc;
      }, []);

      console.log(`[ASSIGN] Filtered ${filtered.length} employees for role ID "${roleId}"`);
      console.log('[ASSIGN] Filtered employees:', filtered);

      if (filtered.length === 0) {
        console.warn(`[ASSIGN] No employees found with roleId: ${roleId}`);
      }

      setFilteredUsers(filtered);

    } catch (err) {
      console.error('Failed to filter employees by role:', err);
      setFilteredUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleAssignLeads = async () => {
    if (!selectedAssignUser || assigningLeadIds.length === 0) return;

    try {
      setAssignLoading(true);

      if (assigningLeadIds.length === 1) {
        // Single lead assignment
        await leadsApi.assignLead(assigningLeadIds[0], selectedAssignUser);
        toast.success('Lead assigned successfully');
      } else {
        // Bulk assignment
        await leadsApi.bulkAssign(assigningLeadIds, selectedAssignUser);
        toast.success(`${assigningLeadIds.length} leads assigned successfully`);
      }

      // Refresh leads table
      fetchLeads();

      // Clear selection if bulk assign
      if (assigningLeadIds.length > 1) {
        setSelected(new Set());
      }

      handleCloseAssignModal();
    } catch (err) {
      console.error('Failed to assign leads:', err);
      toast.error(err?.response?.data?.message || 'Failed to assign leads');
    } finally {
      setAssignLoading(false);
    }
  };

  // Add Lead
  const [newLead, setNewLead] = useState({
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    source: '',
    city: '',
    notes: '',
    statusKey: 'new'
  });

  // Reset newLead when Add Lead modal opens
  useEffect(() => {
    if (showAddModal) {
      setNewLead({
        firstName: '',
        lastName: '',
        company: '',
        email: '',
        phone: '',
        source: '',
        city: '',
        notes: '',
        statusKey: 'new'
      });
    }
  }, [showAddModal]);

  const handleCreateLead = async () => {
    try {
      setActionLoading(true);
      // Combine first and last name into name field
      const leadData = {
        name: `${newLead.firstName} ${newLead.lastName}`.trim(),
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        company: newLead.company,
        email: newLead.email,
        phone: newLead.phone,
        source: newLead.source,
        city: newLead.city,
        notes: newLead.notes,
        statusKey: newLead.statusKey
      };
      const created = await leadsApi.create(leadData);
      const newLeadData = created.data || created;
      logCreate(newLeadData);
      toast.success(`Lead "${leadData.name}" created successfully`);
      setShowAddModal(false);
      setNewLead({ firstName: '', lastName: '', company: '', email: '', phone: '', source: '', city: '', notes: '', statusKey: 'new' });
      fetchLeads(); // Refresh list
    } catch (err) {
      console.error('Failed to create lead:', err);
      toast.error(err?.response?.data?.message || 'Failed to create lead');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper function to format time as "X HRS AGO" or "JUST NOW"
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'JUST NOW';
    if (diffMins < 60) return `${diffMins} MINS AGO`;
    if (diffHours < 24) return `${diffHours} HRS AGO`;
    if (diffDays < 7) return `${diffDays} DAYS AGO`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const [newActivityNote, setNewActivityNote] = useState('');
  const [activityLeadId, setActivityLeadId] = useState(null);
  const handleCallLead = (lead) => {
    if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    } else {
      // Alert removed as per user request - no alerts on lead pages
    }
  };

  const guardDelete = () => {
    if (!(isAdminLike || can('crm', 'delete'))) {
      toast.error('Permission denied: Cannot delete leads');
      return false;
    }
    return true;
  };

  const guardEdit = () => {
    if (!(isAdminLike || can('crm', 'edit'))) {
      toast.error('Permission denied: Cannot edit leads');
      return false;
    }
    return true;
  };

  const guardExport = () => {
    if (!(isAdminLike || can('crm', 'export'))) {
      toast.error('Permission denied: Cannot export leads');
      return false;
    }
    return true;
  };

  const rowSelectionActions = [() => {
    if (!can('crm', 'export')) {
      toast.error('Permission denied: Cannot export leads');
      return false;
    }
    return true;
  }];

  // Apply automation rules
  const applyAutomationRules = useCallback((lead) => {
    const results = [];

    automationRules.forEach(rule => {
      if (!rule.enabled) return;

      let conditionMet = false;

      if (rule.condition.includes('value >')) {
        const threshold = parseInt(rule.condition.split(' > ')[1]);
        conditionMet = lead.value > threshold;
      } else if (rule.condition.includes('days_inactive >')) {
        const threshold = parseInt(rule.condition.split(' > ')[1]);
        const lastActivity = lead.activities?.[0]?.timestamp;
        if (lastActivity) {
          const daysSince = Math.floor((new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
          conditionMet = daysSince > threshold;
        }
      } else if (rule.condition.includes('source ==')) {
        const source = rule.condition.split(' == ')[1].replace(/'/g, '');
        conditionMet = lead.source === source;
      }

      if (conditionMet) {
        results.push(rule);
      }
    });

    return results;
  }, [automationRules]);

  // Advanced lead scoring algorithm
  const calculateLeadScore = (lead) => {
    let score = 0;

    // Budget scoring
    if (lead.value >= 500000) score += LEAD_SCORE_FACTORS.budget.high;
    else if (lead.value >= 200000) score += LEAD_SCORE_FACTORS.budget.medium;
    else score += LEAD_SCORE_FACTORS.budget.low;

    // Timeline scoring
    const daysSinceCreated = Math.floor((new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated <= 7) score += LEAD_SCORE_FACTORS.timeline.urgent;
    else if (daysSinceCreated <= 30) score += LEAD_SCORE_FACTORS.timeline.normal;
    else score += LEAD_SCORE_FACTORS.timeline.delayed;

    // Source scoring
    if (lead.source === 'Referral') score += 15;
    else if (lead.source === 'Partner') score += 12;
    else if (lead.source === 'Website') score += 8;

    // Engagement scoring
    if (lead.activities && lead.activities.length > 0) {
      const recentActivities = lead.activities.filter(a => {
        const activityDate = new Date(a.timestamp);
        const daysSince = Math.floor((new Date() - activityDate) / (1000 * 60 * 60 * 24));
        return daysSince <= 7;
      });
      score += Math.min(recentActivities.length * 5, 20);
    }

    return Math.min(score, 100);
  };

  // Enhanced leads with scores and automation
  const enhancedLeads = useMemo(() => {
    const unique = new Map();
    for (const lead of activeLeads || []) {
      unique.set(String(lead._id || lead.id), lead);
    }
    return Array.from(unique.values()).map(lead => ({
      ...lead,
      // Ensure statusKey is set - use backend statusKey, status, or default to 'new'
      statusKey: lead.statusKey || lead.status || 'new',
      // Use backend score if available, otherwise calculate
      score: lead.score !== undefined ? lead.score : calculateLeadScore(lead),
      automation: applyAutomationRules(lead),
      slaBreached: lead.activities?.[0] ?
        Math.floor((new Date() - new Date(lead.activities[0].timestamp)) / (1000 * 60 * 60 * 24)) > 3 : false,
      // Ensure customFields is always an object
      customFields: (lead.customFields && typeof lead.customFields === 'object' && !Array.isArray(lead.customFields))
        ? lead.customFields
        : {}
    }));
  }, [activeLeads, applyAutomationRules]);

  // Apply filters to leads
  const filteredLeads = useMemo(() => {
    let result = enhancedLeads;

    // Quick filter
    if (quickFilter) {
      switch (quickFilter) {
        case 'highScore':
          result = result.filter(l => l.score > 75);
          break;
        case 'slaBreached':
          result = result.filter(l => l.slaBreached);
          break;
        case 'highValue':
          result = result.filter(l => l.value > 500000);
          break;
        case 'referral':
          result = result.filter(l => l.source === 'Referral');
          break;
        case 'automation':
          result = result.filter(l => l.automation && l.automation.length > 0);
          break;
        case 'recent':
          result = result.filter(l => {
            const daysSince = Math.floor((new Date() - new Date(l.createdAt)) / (1000 * 60 * 60 * 24));
            return daysSince <= 7;
          });
          break;
      }
    }

    // Multiple Stage filters (OR logic)
    if (filterStages.length > 0) {
      result = result.filter(lead => {
        const leadStatus = (lead.statusKey || lead.status || 'new').toString().toLowerCase();
        return filterStages.some(stage => leadStatus === stage.toLowerCase());
      });
    }

    // Multiple Score ranges (OR logic)
    if (filterScoreRanges.length > 0) {
      result = result.filter(lead => {
        const score = Number(lead.score) || 0;
        return filterScoreRanges.some(range => {
          const min = range.min !== '' ? Number(range.min) : -Infinity;
          const max = range.max !== '' ? Number(range.max) : Infinity;
          return score >= min && score <= max;
        });
      });
    }

    // Multiple Value ranges (OR logic)
    if (filterValueRanges.length > 0) {
      result = result.filter(lead => {
        const value = Number(lead.value) || 0;
        return filterValueRanges.some(range => {
          const min = range.min !== '' ? Number(range.min) : -Infinity;
          const max = range.max !== '' ? Number(range.max) : Infinity;
          return value >= min && value <= max;
        });
      });
    }

    // Multiple Source filters (OR logic)
    if (filterSources.length > 0) {
      result = result.filter(lead =>
        filterSources.some(source =>
          lead.source?.toLowerCase() === source.toLowerCase()
        )
      );
    }

    return result;
  }, [enhancedLeads, quickFilter, filterStages, filterScoreRanges, filterValueRanges, filterSources]);

  // Sort handler for DataTable
  const handleSort = useCallback(({ key, dir }) => {
    setSort({ key, dir });
  }, []);

  // Multi-value filter management
  const addStageFilter = () => {
    if (tempStage && !filterStages.includes(tempStage)) {
      setFilterStages([...filterStages, tempStage]);
      setTempStage('');
    }
  };
  const removeStageFilter = (stage) => setFilterStages(filterStages.filter(s => s !== stage));

  const addScoreRange = () => {
    if (tempScoreMin || tempScoreMax) {
      const newRange = { min: tempScoreMin || '0', max: tempScoreMax || '100', id: Date.now() };
      setFilterScoreRanges([...filterScoreRanges, newRange]);
      setTempScoreMin('');
      setTempScoreMax('');
    }
  };
  const removeScoreRange = (id) => setFilterScoreRanges(filterScoreRanges.filter(r => r.id !== id));

  const addValueRange = () => {
    if (tempValueMin || tempValueMax) {
      const newRange = { min: tempValueMin || '0', max: tempValueMax || '∞', id: Date.now() };
      setFilterValueRanges([...filterValueRanges, newRange]);
      setTempValueMin('');
      setTempValueMax('');
    }
  };
  const removeValueRange = (id) => setFilterValueRanges(filterValueRanges.filter(r => r.id !== id));

  const addSourceFilter = () => {
    if (tempSource && !filterSources.includes(tempSource)) {
      setFilterSources([...filterSources, tempSource]);
      setTempSource('');
    }
  };
  const removeSourceFilter = (source) => setFilterSources(filterSources.filter(s => s !== source));

  const clearAllFilters = () => {
    setFilterStages([]);
    setFilterScoreRanges([]);
    setFilterValueRanges([]);
    setFilterSources([]);
  };

  // Get formatted date range for display
  const getDateRangeLabel = useCallback(() => {
    const option = dateRangeOptions.find(opt => opt.id === leadsDateRangeFilter.type);
    if (option) {
      if (leadsDateRangeFilter.type === 'custom' && leadsDateRangeFilter.startDate && leadsDateRangeFilter.endDate) {
        return `${format(new Date(leadsDateRangeFilter.startDate), 'MMM dd')} - ${format(new Date(leadsDateRangeFilter.endDate), 'MMM dd')}`;
      }
      return option.label;
    }
    return 'Last 7 Days';
  }, [leadsDateRangeFilter, dateRangeOptions]);

  // Reset date range filter (for leads view)
  const resetDateRangeFilter = () => {
    console.log('[LEADS RESET] Triggering leads reset');
    resetLeadsDateRangeFilter();
    setPage(1);
  };
  const sortedLeads = useMemo(() => {
    // Sorting is handled by backend via `fetchLeads` params.
    // Keep local list order as received.
    return filteredLeads;
  }, [filteredLeads]);

  const columns = useMemo(() => {
    // Collect all unique custom field keys from all leads
    const allCustomFieldKeys = new Set();
    activeLeads.forEach(lead => {
      if (lead.customFields && typeof lead.customFields === 'object') {
        Object.keys(lead.customFields).forEach(key => allCustomFieldKeys.add(key));
      }
    });
    const customFieldColumns = Array.from(allCustomFieldKeys).sort();

    const allColumns = [
      {
        key: 'name', header: 'Lead', sortable: true, width: '220px',
        render: (val, row) => (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-[11px] shrink-0">
              {val[0]}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[13px] text-[var(--text-primary)] truncate">{val}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{row.company || 'Individual'}</p>
            </div>
          </div>
        )
      },
      { key: 'email', header: 'Email', sortable: true, width: '180px' },
      {
        key: 'statusKey', header: 'Stage', sortable: true, width: '120px',
        render: (val, row) => {
          // Handle legacy data that might have 'stage' instead of 'statusKey'
          const statusValue = val || row.stage || 'new';
          const stage = statusMap?.[statusValue] || { label: statusValue, color: '#94a3b8' };
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ color: stage.color, background: `${stage.color}15`, border: `1px solid ${stage.color}25` }}>
              {stage.label || 'New'}
            </span>
          );
        }
      },
      {
        key: 'score', header: 'Score', sortable: true, width: '80px',
        render: (val) => {
          const clampedScore = Math.min(100, Math.max(0, val || 0));
          return (
            <span className={`text-[11px] font-bold ${clampedScore >= 75 ? 'text-[var(--green)]' :
              clampedScore >= 50 ? 'text-amber-500' : 'text-red-500'
              }`}>{clampedScore}pts</span>
          );
        }
      },
      {
        key: 'value', header: 'Value', sortable: true, width: '100px',
        render: (val) => <span className="font-semibold text-[13px] text-[var(--accent)]">{fmt(val || 0)}</span>
      },
      {
        key: 'automation', header: 'Auto', sortable: false, width: '70px',
        render: (val) => (
          val && val.length > 0 ? (
            <span className="text-[10px] text-amber-500 font-medium">{val.length} Active</span>
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">—</span>
          )
        )
      },
      { key: 'source', header: 'Source', width: '100px' },
      {
        key: 'assignedTo',
        header: 'Assigned To',
        width: '120px',
        render: (val, row) => {
          // Show assigned user name or 'Unassigned'
          const assignedName = val?.name || val || row.assignedToName || 'Unassigned';
          return (
            <span className="text-[11px] text-[var(--text-secondary)] truncate">
              {assignedName}
            </span>
          );
        }
      },
      {
        key: 'createdAtDate',
        sortKey: 'createdAt',
        header: 'Date',
        sortable: true,
        width: '100px',
        render: (_val, row) => {
          const raw = row?.createdAt;
          if (!raw) return <span className="text-[11px] text-[var(--text-muted)]">—</span>;
          const date = new Date(raw);
          return (
            <span className="text-[11px] text-[var(--text-secondary)]">
              {format(date, 'dd/MM/yyyy')}
            </span>
          );
        }
      },
      {
        key: 'createdAtTime',
        sortKey: 'createdAt',
        header: 'Time',
        sortable: true,
        width: '80px',
        render: (_val, row) => {
          const raw = row?.createdAt;
          if (!raw) return <span className="text-[11px] text-[var(--text-muted)]">—</span>;
          const date = new Date(raw);
          return (
            <span className="text-[11px] text-[var(--text-secondary)]">
              {format(date, 'HH:mm')}
            </span>
          );
        }
      },
      // Dynamic custom field columns
      ...customFieldColumns.map(key => ({
        key: `customFields.${key}`,
        header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Convert snake_case to Title Case
        width: '100px',
        render: (val, row) => {
          const customValue = row.customFields?.[key];
          return (
            <span className="text-[11px] text-[var(--text-secondary)] truncate">
              {customValue !== undefined && customValue !== null ? customValue : '—'}
            </span>
          );
        }
      }))
    ];
    return allColumns.filter(col => visibleColumns[col.key] !== false);
  }, [visibleColumns, statusMap, activeLeads]);

  const handleImport = async ({ file, mapping }) => {
    if (!file) {
      toast.error('Please select a file to import');
      return;
    }

    try {
      setActionLoading(true);
      toast.info('Importing leads...');

      // Use backend API for import
      const result = await leadsApi.importLeads(file);
      const payload = result?.data?.data || result?.data || result;
      const { inserted, updated, failed, errors } = payload || {};

      // Log import activity
      logCreate({ id: 'import', name: `Imported ${inserted || 0} leads from ${file.name}` });

      // Show result
      if ((failed || 0) === 0) {
        toast.success(`${inserted || 0} leads imported, ${updated || 0} updated successfully`, { id: 'import' });
      } else {
        toast.success(`${inserted || 0} imported, ${updated || 0} updated, ${failed || 0} skipped`, { id: 'import' });
        if (errors && errors.length > 0) {
          console.error('Import errors:', errors);
          // Show detailed error message for first few failures
          const errorSummary = errors.slice(0, 5).map(e => `Row ${e.row}: ${e.reason}`).join('\n');
          const remainingErrors = errors.length - 5;
          const fullErrorMessage = `${errorSummary}${remainingErrors > 0 ? `\n... and ${remainingErrors} more errors` : ''}`;
          console.log('Detailed import errors:\n', fullErrorMessage);
        }
      }

      const wasPageOne = page === 1;
      setPage(1);
      if (wasPageOne) {
        await fetchLeads();
      }
    } catch (err) {
      console.error('Import failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to import leads', { id: 'import' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = (format) => {
    const dataToExport = sortedLeads;
    const headers = ['Name', 'Company', 'Email', 'Phone', 'Stage', 'Source', 'Value', 'Score', 'City'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(lead => [
        `"${lead.name || ''}"`,
        `"${lead.company || ''}"`,
        `"${lead.email || ''}"`,
        `"${lead.phone || ''}"`,
        `"${statusMap?.[lead.statusKey]?.label || lead.statusKey || ''}"`,
        `"${lead.source || ''}"`,
        lead.value || 0,
        lead.score || 0,
        `"${lead.city || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Alert removed as per user request - no alerts on lead pages
  };

  const toggleColumn = (colKey) => {
    setVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const applySort = (key) => {
    setSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
    setShowSortDropdown(false);
  };

  const crmFeatures = useMemo(() => {
    return {
      kanban: crmPerms.feature('kanban_view'),
      analytics: crmPerms.feature('analytics_view'),
      importCsv: crmPerms.feature('import_csv') || crmPerms.feature('csv_import'),
      bulkActions: crmPerms.feature('bulk_actions'),
    };
  }, [crmPerms]);

  return (
    <div className="animate-fade-in space-y-5">
      {/* ── Header ── */}
      <PageHeader
        title="CRM Module"
        subtitle="Rulebook Compliant Lead Management"
        tabs={[
          ...(crmFeatures.analytics ? [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
          { id: 'leads', label: 'Leads', icon: List },
          ...(crmFeatures.kanban ? [{ id: 'kanban', label: 'Kanban', icon: LayoutGrid }] : []),
          { id: 'customers', label: 'Customers', icon: Users },
        ]}
        activeTab={view}
        onTabChange={setView}
      />

      {/* ── Date Filters ── */}
      {view === 'dashboard' && crmFeatures.analytics && (
        <div className="glass-card p-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Quick Filter:</span>
              <Select
                value={dashboardQuickFilter}
                onChange={e => {
                  const filterType = e.target.value;
                  setDashboardQuickFilter(filterType);
                  const now = new Date();
                  
                  // Calculate dates based on quick filter
                  let startDate, endDate;
                  
                  if (filterType === 'all') {
                    setDateRange({ start: '', end: '' });
                    setDashboardDateRangeFilter({ type: 'all', startDate: null, endDate: null });
                    return;
                  }

                  if (filterType === 'today') {
                    // Today: 00:00:00 to 23:59:59
                    startDate = format(now, 'yyyy-MM-dd');
                    endDate = startDate;
                    setDashboardDateRangeFilter({ type: filterType, startDate, endDate });
                  } else if (filterType === 'thisWeek') {
                    // This Week = Last 7 Days (rolling)
                    // endDate = today (end of day)
                    // startDate = today - 6 days (start of day)
                    endDate = format(now, 'yyyy-MM-dd');
                    const sevenDaysAgo = new Date(now);
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
                    startDate = format(sevenDaysAgo, 'yyyy-MM-dd');
                    setDashboardDateRangeFilter({ type: filterType, startDate, endDate });
                  } else if (filterType === 'thisMonth') {
                    // This Month: 1st to last day of current month
                    startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
                    endDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
                    setDashboardDateRangeFilter({ type: filterType, startDate, endDate });
                  }
                }}
                className="h-7 text-xs w-32"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Date Range:</span>
              <Input
                type="date"
                value={dashboardDateRangeFilter.startDate || dateRange.start}
                onChange={e => {
                  const newDate = e.target.value;
                  const endDateVal = dashboardDateRangeFilter.endDate || dateRange.end || newDate;
                  
                  setDateRange(prev => ({ ...prev, start: newDate }));
                  setDashboardDateRangeFilter({
                    type: 'custom',
                    startDate: newDate,
                    endDate: endDateVal
                  });
                  setDashboardQuickFilter(null); // Clear quick filter when manually selecting date
                }}
                className="h-7 text-xs w-32"
              />
              <span className="text-xs text-[var(--text-muted)]">to</span>
              <Input
                type="date"
                value={dashboardDateRangeFilter.endDate || dateRange.end}
                onChange={e => {
                  const newDate = e.target.value;
                  const startDateVal = dashboardDateRangeFilter.startDate || dateRange.start || newDate;
                  
                  setDateRange(prev => ({ ...prev, end: newDate }));
                  setDashboardDateRangeFilter({
                    type: 'custom',
                    startDate: startDateVal,
                    endDate: newDate
                  });
                  setDashboardQuickFilter(null); // Clear quick filter when manually selecting date
                }}
                className="h-7 text-xs w-32"
              />
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDashboardQuickFilter('all');
                  setDateRange({ start: '', end: '' });
                  setDashboardDateRangeFilter({ type: 'all', startDate: null, endDate: null });
                }}
              >
                <RefreshCw size={12} /> Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced Dashboard ── */}
      {view === 'dashboard' && crmFeatures.analytics && (
        <LeadAnalyticsDashboard
          onNavigate={(nextView) => {
            console.log('[DASHBOARD] Navigate to:', nextView);
            setView(nextView);
          }}
          dateFilter={dashboardDateRangeFilter}
          onFilterChange={(newFilter) => {
            console.log('[DASHBOARD] Filter change received:', newFilter);
            // Update dashboard filter only
            setDashboardDateRangeFilter(newFilter);
          }}
          onFilter={(filterType) => {
            if (!filterType) return;
            // Navigate to leads view
            setView('leads');
            // Reset pagination to first page
            setPage(1);
            // Apply appropriate filter based on KPI clicked
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            switch (filterType) {
              case 'today': {
                // Clear all other filters first, then set date to today
                setFilterStages([]);
                setFilterSources([]);
                setFilterScoreRanges([]);
                setFilterValueRanges([]);
                // Calculate today's dates
                const startDate = new Date(today);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                setLeadsDateRangeFilter({ 
                  type: 'today', 
                  startDate: startDate.toISOString(), 
                  endDate: endDate.toISOString() 
                });
                break;
              }
              case 'converted':
                // Clear all other filters first, then set stage to converted
                setFilterSources([]);
                setFilterScoreRanges([]);
                setFilterValueRanges([]);
                setLeadsDateRangeFilter({ type: 'all', startDate: null, endDate: null });
                setFilterStages(['won', 'customer', 'converted']);
                break;
              case 'all':
              default:
                // Clear all filters to show all leads
                setFilterStages([]);
                setFilterSources([]);
                setFilterScoreRanges([]);
                setFilterValueRanges([]);
                setLeadsDateRangeFilter({ type: 'all', startDate: null, endDate: null });
                break;
            }
          }}
        />
      )}

      {/* ── Customers View ── */}
      {view === 'customers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Customers</h3>
              <span className="text-xs text-[var(--text-muted)]">{customersTotal} total customers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <Input
                  placeholder="Search customers..."
                  value={customersSearch}
                  onChange={(e) => {
                    setCustomersSearch(e.target.value);
                    setCustomersPage(1);
                  }}
                  className="pl-8 h-8 w-64 text-sm"
                />
              </div>
            </div>
          </div>

          {customersLoading ? (
            <div className="glass-card p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center mb-4">
                <Users size={24} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">No Customers Yet</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md">
                When leads are converted to customers (status = "customer"), they will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-lg border border-[var(--border-base)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Customer Name</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Phone</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">City</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Source</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Assigned To</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Created Date</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {customers.map((customer) => (
                      <tr key={customer._id || customer.id} className="hover:bg-[var(--bg-hovered)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-semibold text-[11px] shrink-0">
                              {customer.name?.[0] || 'C'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[13px] text-[var(--text-primary)] truncate">{customer.name}</p>
                              <p className="text-[10px] text-[var(--text-muted)] truncate">{customer.company || 'Individual'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-[var(--text-secondary)]">{customer.email || '—'}</td>
                        <td className="px-4 py-3 text-[11px] text-[var(--text-secondary)]">{customer.phone || '—'}</td>
                        <td className="px-4 py-3 text-[11px] text-[var(--text-secondary)]">{customer.city || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                            {customer.source || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-[var(--text-secondary)]">
                          {(() => {
                            // Handle populated assignedTo object
                            if (customer.assignedTo) {
                              if (typeof customer.assignedTo === 'object') {
                                return customer.assignedTo.name ||
                                  `${customer.assignedTo.firstName || ''} ${customer.assignedTo.lastName || ''}`.trim() ||
                                  customer.assignedTo.email ||
                                  'Unassigned';
                              }
                              return customer.assignedTo;
                            }
                            return customer.assignedToName || 'Unassigned';
                          })()}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-[var(--text-secondary)]">
                          {customer.createdAt ? format(new Date(customer.createdAt), 'MMM dd, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleViewLead(customer);
                              }}
                              title="View Lead"
                            >
                              <Eye size={12} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {customersTotal > customersPageSize && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-base)]">
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Showing {(customersPage - 1) * customersPageSize + 1} to {Math.min(customersPage * customersPageSize, customersTotal)} of {customersTotal} customers
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomersPage(p => Math.max(1, p - 1))}
                      disabled={customersPage === 1}
                    >
                      <ChevronLeft size={12} />
                    </Button>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Page {customersPage}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomersPage(p => p + 1)}
                      disabled={customersPage * customersPageSize >= customersTotal}
                    >
                      <ChevronRight size={12} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Kanban Board View ── */}
      {view === 'kanban' && crmFeatures.kanban && (
        <div className="h-[calc(100vh-180px)] flex flex-col">
          {(() => { console.log('[KANBAN DEBUG] statusOptions:', statusOptions); console.log('[KANBAN DEBUG] enhancedLeads first 3:', enhancedLeads.slice(0, 3).map(l => ({ name: l.name, statusKey: l.statusKey, status: l.status }))); return null; })()}
          
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3 px-1 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Pipeline Kanban Board</h3>
              <span className="text-xs text-[var(--text-muted)]">{enhancedLeads.length} total leads</span>
            </div>
          </div>

          {/* Scrollable Kanban Area - with drag-to-scroll support */}
          <div 
            ref={kanbanScrollRef}
            className={`flex-1 overflow-x-auto overflow-y-hidden pb-2 ${isKanbanDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent', userSelect: 'none' }}
            onMouseDown={(e) => {
              // Only left mouse button and not on interactive elements
              if (e.button !== 0) return;
              const target = e.target;
              if (target.closest('[data-kanban-card="true"]') || 
                  target.closest('button') || 
                  target.closest('a') ||
                  target.closest('input') ||
                  target.closest('select')) {
                return;
              }
              setIsKanbanDragging(true);
              setKanbanDragStartX(e.pageX);
              setKanbanScrollStartX(e.currentTarget.scrollLeft);
            }}
            onMouseMove={(e) => {
              if (!isKanbanDragging) return;
              e.preventDefault();
              const x = e.pageX;
              const walk = (x - kanbanDragStartX) * 1.5; // Multiply for faster scroll
              e.currentTarget.scrollLeft = kanbanScrollStartX - walk;
            }}
            onMouseUp={() => {
              setIsKanbanDragging(false);
            }}
            onMouseLeave={() => {
              setIsKanbanDragging(false);
            }}
          >
            <div className="min-w-max h-full px-1">
              {/* Kanban Columns */}
              <div className="flex gap-4 h-full">
                {(statusOptions || []).map((stage, stageIndex) => {
                // Filter leads that match this stage's key
                // Also match survey-related keys to the same column
                const stageKeyLower = stage.key.toLowerCase();
                const isSurveyStage = stageKeyLower === 'survey' || stageKeyLower === 'site-survey' || stageKeyLower === 'site_survey' || stageKeyLower.includes('survey');

                const stageLeads = enhancedLeads.filter(lead => {
                  const leadStatus = normalizeStageKey(lead);

                  // Direct match
                  if (leadStatus === stageKeyLower) return true;

                  // Survey-related keys should match each other
                  if (isSurveyStage) {
                    const isLeadSurvey = leadStatus === 'survey' || leadStatus === 'site-survey' || leadStatus === 'site_survey' || leadStatus.includes('survey');
                    if (isLeadSurvey) return true;
                  }

                  return false;
                });
                const totalValue = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
                const stageLeadIds = stageLeads.map(l => getLeadId(l));

                return (
                  <div key={`stage-${stage.key || stageIndex}-${stageIndex}`}
                    className={`flex flex-col w-64 rounded-[14px] border border-[#F1F5F9] bg-[#F8FAFC] p-2.5 transition-colors h-full`}
                    onDragOver={e => { e.preventDefault(); }}
                    onDragEnter={() => {
                      if (!dragRef.current) return;
                      dragRef.current.destStageKey = stage.key;
                      dragRef.current.destIndex = stageLeadIds.length;
                    }}
                    onDrop={(e) => {
                      if (!(isAdminLike || can('crm', 'edit'))) {
                        toast.error('Permission denied: Cannot change lead status');
                        return;
                      }
                      const drag = dragRef.current;
                      const fallbackId = e.dataTransfer.getData('leadId');
                      const leadId = drag?.leadId || fallbackId;
                      if (!leadId) return;

                      const targetStageKey = drag?.destStageKey || stage.key;
                      let destIndex = Number.isFinite(drag?.destIndex) ? drag.destIndex : stageLeadIds.length;
                      destIndex = Math.max(0, Math.min(destIndex, stageLeadIds.length));

                      const sourceStageKey = drag?.sourceStageKey;
                      const sourceIndex = drag?.sourceIndex;
                      if (sourceStageKey && String(sourceStageKey).toLowerCase() === String(targetStageKey).toLowerCase()) {
                        if (Number.isFinite(sourceIndex) && sourceIndex < destIndex) {
                          destIndex = Math.max(0, destIndex - 1);
                        }
                      }

                      const snapshot = drag?.originalActiveLeads || activeLeads;
                      setActiveLeads((prev) =>
                        reorderLeadInActiveLeads({
                          prev,
                          leadId,
                          destStageKey: targetStageKey,
                          destIndex,
                          destStageLeadIds: stageLeadIds.filter((id) => String(id) !== String(leadId)),
                        })
                      );

                      // Send lowercase stage key to match backend normalization
                      leadsApi
                        .update(leadId, { statusKey: targetStageKey.toLowerCase() })
                        .then(() => {
                          logUpdate({ id: leadId, statusKey: targetStageKey });
                          dragRef.current = null;
                        })
                        .catch((err) => {
                          console.error('Stage update failed:', err);
                          toast.error('Stage update failed');
                          setActiveLeads(snapshot);
                          dragRef.current = null;
                          fetchLeads();
                        });
                    }}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border-base)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                        <span className="text-[13px] font-semibold text-[var(--text-secondary)]">{stage.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">{fmt(totalValue)}</span>
                        <span className="w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border-base)] text-[11px] font-semibold text-[var(--text-secondary)] flex items-center justify-center">{stageLeads.length}</span>
                      </div>
                    </div>
                    <div
                      className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1"
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!dragRef.current) return;
                        dragRef.current.destStageKey = stage.key;

                        const cards = Array.from(e.currentTarget.querySelectorAll('[data-kanban-card="true"]'));
                        const y = e.clientY;

                        let nextIndex = cards.length;
                        for (let i = 0; i < cards.length; i++) {
                          const rect = cards[i].getBoundingClientRect();
                          const midpoint = rect.top + rect.height / 2;
                          if (y < midpoint) {
                            nextIndex = i;
                            break;
                          }
                        }

                        dragRef.current.destIndex = nextIndex;
                      }}
                    >
                      {stageLeads.map((lead, idx) => (
                        <div
                          key={lead._id || lead.id || `lead-${Math.random()}`}
                          data-kanban-card="true"
                          draggable
                          onDragStart={(e) => {
                            const leadId = getLeadId(lead);
                            e.currentTarget.classList.add('opacity-95', 'scale-[1.02]');
                            dragRef.current = {
                              leadId,
                              sourceStageKey: stage.key,
                              sourceIndex: idx,
                              destStageKey: stage.key,
                              destIndex: idx,
                              originalActiveLeads: activeLeads,
                            };
                            e.dataTransfer.setData('leadId', leadId);
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.classList.remove('opacity-95', 'scale-[1.02]');
                          }}
                          onDragEnter={() => {
                            if (!dragRef.current) return;
                            dragRef.current.destStageKey = stage.key;
                            dragRef.current.destIndex = idx;
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (!dragRef.current) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const midpoint = rect.top + rect.height / 2;
                            const insertAfter = e.clientY > midpoint;
                            dragRef.current.destStageKey = stage.key;
                            dragRef.current.destIndex = insertAfter ? (idx + 1) : idx;
                          }}
                          className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] p-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:border-[var(--border-base)]"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[Kanban] Clicked lead:', lead._id || lead.id, lead.name);
                            handleViewLead(lead);
                          }}
                        >
                          {/* Lead ID & kW */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] text-[var(--text-muted)] font-medium">{lead.leadId || `P${lead._id?.slice(-4) || Math.floor(Math.random() * 1000)}`}</span>
                            <span className="text-[13px] font-bold text-orange-500">{lead.kw || lead.systemSize || '0'} kW</span>
                          </div>

                          {/* Lead Name */}
                          <h4 className="text-[15px] font-bold text-[var(--text-primary)] mb-1 leading-tight">{lead.name}</h4>

                          {/* Company */}
                          <p className="text-[12px] text-[var(--text-muted)] mb-3">{lead.company || 'Individual'}</p>

                          {/* Custom Fields - Show up to 2 important ones */}
                          {lead.customFields && Object.keys(lead.customFields).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {Object.entries(lead.customFields).slice(0, 2).map(([key, value]) => (
                                <span
                                  key={key}
                                  className="text-[10px] px-2 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium truncate max-w-[120px]"
                                  title={`${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}`}
                                >
                                  {key.replace(/_/g, ' ').substring(0, 10)}{value ? `: ${String(value).substring(0, 15)}` : ''}
                                </span>
                              ))}
                              {Object.keys(lead.customFields).length > 2 && (
                                <span className="text-[10px] px-2 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                                  +{Object.keys(lead.customFields).length - 2} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-[var(--text-muted)]">{lead.assignedTo?.name || lead.assignedTo || 'Unassigned'}</span>
                              <span className="text-[10px] text-[var(--text-muted)]">{lead.progress || 0}%</span>
                            </div>
                            <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${lead.progress || 0}%`,
                                  backgroundColor: stage.color || '#3b82f6'
                                }}
                              />
                            </div>
                          </div>

                          {/* Footer: Assigned & Date */}
                          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-base)]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[10px] font-medium text-[var(--text-secondary)]">
                                {(lead.assignedTo?.name || lead.assignedTo || 'U')[0].toUpperCase()}
                              </div>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {lead.nextFollowUp || lead.createdAt ? new Date(lead.nextFollowUp || lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                              </span>
                            </div>
                            {lead.slaBreached && (
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="SLA Breached" />
                            )}
                          </div>
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="flex-1 flex items-center justify-center min-h-[100px]">
                          <p className="text-[12px] text-[var(--text-muted)]">Drop here</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ── Leads Table View ── */}
      {view === 'leads' && (
        <div className="space-y-4">
          {/* Action Buttons & Filter Toggle */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={showAdvancedFilters ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : ''}
              >
                <Filter size={14} className="mr-1" />
                {showAdvancedFilters ? 'Hide Filters' : 'Advanced Filters'}
              </Button>

              {/* Date Range Picker */}
              <div className="relative" ref={dateRangeRef}>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDateRangeDropdown(!showDateRangeDropdown)}
                    className={showDateRangeDropdown ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : ''}
                  >
                    <Calendar size={14} className="mr-1" />
                    {getDateRangeLabel()}
                    <ChevronDown size={12} className="ml-1" />
                  </Button>
                  
                  {/* Info Icon - inline with date picker */}
                  {leadsDateRangeFilter.type !== 'custom' && (
                    <div className="relative" ref={dateRangeInfoRef}>
                      <button
                        type="button"
                        onClick={() => setShowDateRangeInfo(v => !v)}
                        className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/15 transition-colors flex items-center justify-center"
                        title="Info"
                      >
                        <Info size={14} />
                      </button>
                      {showDateRangeInfo && (
                        <div className="absolute left-0 top-10 w-72 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] shadow-lg p-3 text-xs text-[var(--text-secondary)] z-50">
                          <div className="font-semibold text-[var(--text-primary)] mb-1">Date Range</div>
                          <div>
                            Showing leads from <span className="font-semibold">{getDateRangeLabel()}</span>. Use the date filter to view older leads.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {showDateRangeDropdown && (
                  <div className="absolute left-0 top-full mt-2 w-56 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] shadow-lg z-50">
                    <div className="p-2">
                      <p className="text-[10px] text-[var(--text-muted)] px-2 py-1 uppercase tracking-wider">Date Range</p>
                      {dateRangeOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            // Calculate dates for the selected preset
                            const now = new Date();
                            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            let startDate = null;
                            let endDate = null;
                            
                            if (option.id !== 'custom' && option.id !== 'all') {
                              switch (option.id) {
                                case 'today':
                                  startDate = new Date(today);
                                  startDate.setHours(0, 0, 0, 0);
                                  endDate = new Date(today);
                                  endDate.setHours(23, 59, 59, 999);
                                  break;
                                case 'yesterday':
                                  startDate = new Date(today);
                                  startDate.setDate(startDate.getDate() - 1);
                                  startDate.setHours(0, 0, 0, 0);
                                  endDate = new Date(startDate);
                                  endDate.setHours(23, 59, 59, 999);
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
                                  endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                                  endDate.setHours(23, 59, 59, 999);
                                  break;
                                case 'lastMonth':
                                  startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                                  endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                                  endDate.setHours(23, 59, 59, 999);
                                  break;
                                default:
                                  break;
                              }
                            }
                            
                            setLeadsDateRangeFilter({
                              type: option.id,
                              startDate: startDate ? startDate.toISOString() : null,
                              endDate: endDate ? endDate.toISOString() : null
                            });
                            console.log('[FILTER DEBUG] Preset applied:', option.id, { startDate: startDate?.toISOString(), endDate: endDate?.toISOString() });
                            
                            // Don't close dropdown for custom - show date inputs
                            if (option.id !== 'custom') {
                              setShowDateRangeDropdown(false);
                              setPage(1); // Reset pagination
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-xs flex items-center justify-between hover:bg-[var(--bg-hovered)] ${leadsDateRangeFilter.type === option.id
                            ? 'text-[var(--primary)] font-bold bg-[var(--primary)]/10'
                            : 'text-[var(--text-secondary)]'
                            }`}
                        >
                          {option.label}
                          {leadsDateRangeFilter.type === option.id && <CheckCircle2 size={12} />}
                        </button>
                      ))}

                      {/* Custom Range Inputs */}
                      {leadsDateRangeFilter.type === 'custom' && (
                        <div className="mt-2 pt-2 border-t border-[var(--border-base)] px-2">
                          <p className="text-[10px] text-[var(--text-muted)] mb-2">Custom Range</p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--text-muted)] w-10">From:</span>
                              <Input
                                type="date"
                                value={leadsDateRangeFilter.startDate || ''}
                                onChange={(e) => setLeadsDateRangeFilter(prev => ({ ...prev, startDate: e.target.value }))}
                                className="h-7 text-xs flex-1"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--text-muted)] w-10">To:</span>
                              <Input
                                type="date"
                                value={leadsDateRangeFilter.endDate || ''}
                                onChange={(e) => setLeadsDateRangeFilter(prev => ({ ...prev, endDate: e.target.value }))}
                                className="h-7 text-xs flex-1"
                              />
                            </div>
                            <Button
                              size="sm"
                              className="w-full mt-1"
                              onClick={() => {
                                if (leadsDateRangeFilter.startDate && leadsDateRangeFilter.endDate) {
                                  setShowDateRangeDropdown(false);
                                  setPage(1);
                                }
                              }}
                              disabled={!leadsDateRangeFilter.startDate || !leadsDateRangeFilter.endDate}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Reset Filter Button */}
              {leadsDateRangeFilter.type !== 'all' && (
                <button
                  onClick={resetDateRangeFilter}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hovered)] transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Reset
                </button>
              )}

              {(filterStages.length > 0 || filterScoreRanges.length > 0 || filterValueRanges.length > 0 || filterSources.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hovered)] transition-colors flex items-center gap-1"
                >
                  <FilterX size={12} /> Clear All
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(isAdminLike || can('crm', 'create')) && (
                <Button variant="outline" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Lead</Button>
              )}
              <ImportExport
                moduleName="Leads"
                fields={crmFields}
                onImport={handleImport}
                onExport={handleExport}
                hideImport={!crmFeatures.importCsv || !(isAdminLike || can('crm', 'create'))}
                hideGuide={!crmFeatures.importCsv}
                hideExport={!(isAdminLike || can('crm', 'export'))}
              />
            </div>
          </div>

          {leadsDateRangeFilter.type === 'custom' && leadsDateRangeFilter.startDate && leadsDateRangeFilter.endDate && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20 text-xs text-[var(--green)]">
              <CheckCircle2 size={14} />
              <span>
                Showing leads from <strong>{format(new Date(leadsDateRangeFilter.startDate), 'MMM dd')} - {format(new Date(leadsDateRangeFilter.endDate), 'MMM dd')}</strong>
              </span>
            </div>
          )}

          {/* Advanced Filters Panel - Compact Single Row */}
          {showAdvancedFilters && (
            <div className="glass-card p-4 rounded-lg border border-[var(--border-base)] w-full">
              <div className="flex flex-wrap items-start gap-4">
                {/* Stage Filter */}
                <div className="space-y-1 flex-1 min-w-[220px]">
                  <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Stage</label>
                  <div className="flex items-center gap-1.5">
                    <Select value={tempStage} onChange={(e) => setTempStage(e.target.value)} className="flex-1 text-sm">
                      <option value="">Select</option>
                      {(statusOptions || []).map(s => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </Select>
                    <Button size="sm" className="px-2" onClick={addStageFilter} disabled={!tempStage}><Plus size={12} /></Button>
                  </div>
                  {filterStages.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filterStages.map(stage => (
                        <span key={stage} className="px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] flex items-center gap-1">
                          {statusMap[stage]?.label || stage}
                          <button onClick={() => removeStageFilter(stage)} className="hover:text-red-500"><X size={8} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Source Filter */}
                <div className="space-y-1 flex-1 min-w-[220px]">
                  <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Source</label>
                  <div className="flex items-center gap-1.5">
                    <Select value={tempSource} onChange={(e) => setTempSource(e.target.value)} className="flex-1 text-sm">
                      <option value="">Select</option>
                      {SOURCES.filter(s => s !== 'All').map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                    <Button size="sm" className="px-2" onClick={addSourceFilter} disabled={!tempSource}><Plus size={12} /></Button>
                  </div>
                  {filterSources.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filterSources.map(source => (
                        <span key={source} className="px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] flex items-center gap-1">
                          {source}
                          <button onClick={() => removeSourceFilter(source)} className="hover:text-red-500"><X size={8} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Score Range */}
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Score</label>
                  <div className="flex items-center gap-1.5">
                    <Input type="number" placeholder="Min" value={tempScoreMin} onChange={(e) => setTempScoreMin(e.target.value)} className="h-8 text-sm w-20 px-2" />
                    <span className="text-[var(--text-muted)] text-sm">-</span>
                    <Input type="number" placeholder="Max" value={tempScoreMax} onChange={(e) => setTempScoreMax(e.target.value)} className="h-8 text-sm w-20 px-2" />
                    <Button size="sm" className="px-2" onClick={addScoreRange} disabled={!tempScoreMin && !tempScoreMax}><Plus size={12} /></Button>
                  </div>
                  {filterScoreRanges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filterScoreRanges.map(range => (
                        <span key={range.id} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] flex items-center gap-1">
                          {range.min}-{range.max}
                          <button onClick={() => removeScoreRange(range.id)} className="hover:text-red-500"><X size={8} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Value Range */}
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Value ₹</label>
                  <div className="flex items-center gap-1.5">
                    <Input type="number" placeholder="Min" value={tempValueMin} onChange={(e) => setTempValueMin(e.target.value)} className="h-8 text-sm w-20 px-2" />
                    <span className="text-[var(--text-muted)] text-sm">-</span>
                    <Input type="number" placeholder="Max" value={tempValueMax} onChange={(e) => setTempValueMax(e.target.value)} className="h-8 text-sm w-20 px-2" />
                    <Button size="sm" className="px-2" onClick={addValueRange} disabled={!tempValueMin && !tempValueMax}><Plus size={12} /></Button>
                  </div>
                  {filterValueRanges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filterValueRanges.map(range => (
                        <span key={range.id} className="px-2 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)] text-[10px] flex items-center gap-1">
                          {range.min}-{range.max}
                          <button onClick={() => removeValueRange(range.id)} className="hover:text-red-500"><X size={8} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Results Count */}
              <div className="flex justify-end pt-2 mt-2 border-t border-[var(--border-base)]">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {totalLeads} leads found
                </span>
              </div>
            </div>
          )}
          <DataTable
            columns={columns}
            data={sortedLeads}
            rowKey="_id"
            total={totalLeads}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSort={handleSort}
            toolbar={(
              <div className="flex items-center gap-2">
                <div className="relative" ref={sortDropdownRef}>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className={`h-8 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-2 ${showSortDropdown ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-elevated)] border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-hovered)]'}`}
                  >
                    {sort.dir === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />}
                    Sort
                  </button>
                  {showSortDropdown && (
                    <div className="absolute left-0 top-full mt-2 w-48 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] shadow-lg z-50">
                      <div className="p-2">
                        <p className="text-[10px] text-[var(--text-muted)] px-2 py-1">Sort by</p>
                        {[
                          { key: 'name', label: 'Lead Name' },
                          { key: 'email', label: 'Email' },
                          { key: 'statusKey', label: 'Stage' },
                          { key: 'score', label: 'Lead Score' },
                          { key: 'value', label: 'Deal Value' },
                          { key: 'source', label: 'Source' }
                        ].map((col) => (
                          <button
                            key={col.key}
                            onClick={() => applySort(col.key)}
                            className={`w-full text-left px-3 py-2 rounded text-xs flex items-center justify-between hover:bg-[var(--bg-hovered)] ${sort.key === col.key ? 'text-[var(--primary)] font-bold' : 'text-[var(--text-secondary)]'}`}
                          >
                            {col.label}
                            {sort.key === col.key && (
                              sort.dir === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            onRowClick={(row) => { handleViewLead(row); }}
            search={search}
            onSearch={setSearch}
            selectedRows={selected}
            onSelectRows={setSelected}
            bulkActions={(crmFeatures.bulkActions || isAdminLike) ? [
              ...((isAdminLike || can('crm', 'export')) ? [{
                label: 'Export',
                icon: Download,
                onClick: (selectedIds) => {
                  if (guardExport()) handleBulkExport(selectedIds);
                }
              }] : []),
              ...((isAdminLike || can('crm', 'edit')) ? [{ label: 'Score Boost', icon: Brain, onClick: (selectedIds) => { if (guardEdit()) handleOpenScoreBoostModal(selectedIds); } }] : []),
              ...((isAdminLike || can('crm', 'assign')) ? [{ label: 'Assign', icon: UserCheck, onClick: (selectedIds) => handleOpenAssignModal(selectedIds) }] : []),
              ...((isAdminLike || can('crm', 'delete')) ? [{ label: 'Delete', icon: Trash2, onClick: (selectedIds) => { if (guardDelete()) handleBulkDelete(selectedIds); }, danger: true }] : []),
            ] : []}
            rowActions={[
              { label: 'View', icon: Eye, onClick: handleViewLead },
              { label: 'Lead Tracker', icon: Target, onClick: handleViewTracker },
              ...((isAdminLike || can('crm', 'edit')) ? [{ label: 'Edit', icon: Edit2, onClick: handleEditLead }] : []),
              ...((isAdminLike || can('crm', 'assign')) ? [{ label: 'Assign Lead', icon: UserCheck, onClick: (lead) => handleOpenAssignModal([lead._id || lead.id]) }] : []),
              { label: 'Score', icon: Brain, onClick: handleRecalculateScore },
              ...((isAdminLike || can('crm', 'delete')) ? [{ label: 'Delete', icon: Trash2, onClick: handleDeleteLead, danger: true }] : []),
              { label: 'Activity Log', icon: Activity, onClick: handleViewActivity },
            ]}
          />
        </div>
      )
      }
      {/* ADD LEAD MODAL */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Lead"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleCreateLead} disabled={actionLoading}>
              {actionLoading ? 'Creating...' : <><Plus size={13} /> Create Lead</>}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name">
              <Input
                placeholder="Enter first name"
                value={newLead.firstName || ''}
                onChange={(e) => setNewLead({ ...newLead, firstName: e.target.value })}
              />
            </FormField>
            <FormField label="Last Name">
              <Input
                placeholder="Enter last name"
                value={newLead.lastName || ''}
                onChange={(e) => setNewLead({ ...newLead, lastName: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Company">
            <Input
              placeholder="Company name (optional)"
              value={newLead.company}
              onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email">
              <Input
                type="email"
                placeholder="email@example.com"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              />
            </FormField>
            <FormField label="Phone">
              <Input
                placeholder="+91 98765 43210"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Source">
              <Select
                value={newLead.source}
                onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
              >
                <option value="">Select source</option>
                {SOURCES.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="City">
              <Select
                value={newLead.city}
                onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
              >
                <option value="">Select city</option>
                {CITIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea
              placeholder="Additional notes..."
              rows={3}
              value={newLead.notes}
              onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
            />
          </FormField>
          <FormField label="Status">
            <Select
              value={newLead.statusKey}
              onChange={(e) => setNewLead({ ...newLead, statusKey: e.target.value })}
            >
              {(statusOptions || []).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </FormField>
        </div>
      </Modal>

      {/* LEAD DETAIL MODAL */}
      {
        selectedLead && (
          <Modal
            open={!!selectedLead}
            onClose={() => setSelectedLead(null)}
            title={`Lead Details — ${selectedLead.name || 'Unknown'}`}
            footer={
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setSelectedLead(null)}>Close</Button>
                {(isAdminLike || can('crm', 'edit')) && (
                  <Button variant="outline" onClick={() => handleEditLead(selectedLead)}><Edit2 size={13} /> Edit</Button>
                )}
                <Button onClick={() => handleCallLead(selectedLead)}><Phone size={13} /> Call Lead</Button>
              </div>
            }
          >
            <div className="space-y-4">
              {/* Hero section */}
              <div className="flex items-start gap-4 pb-4 border-b border-[var(--border-base)]">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${avatarColor(selectedLead.name || '')}30, ${avatarColor(selectedLead.name || '')}10)`,
                    color: avatarColor(selectedLead.name || ''),
                    border: `2px solid ${avatarColor(selectedLead.name || '')}35`,
                  }}
                >
                  {(selectedLead.name || '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">{selectedLead.name || 'Unknown Lead'}</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                        <Building2 size={11} /> {selectedLead.company || 'Individual'}
                      </p>
                    </div>
                    <SLADot breached={selectedLead.slaBreached} />
                  </div>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <StagePill stageId={selectedLead.statusKey} stageMap={statusMap} />
                    <SourceBadge source={selectedLead.source} />
                    <ScoreBadge score={selectedLead.score} />
                  </div>
                  {selectedLead.tags && selectedLead.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Tag size={10} className="text-[var(--text-muted)]" />
                      {selectedLead.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-muted)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Info grid - STRICT field mapping from selectedLead */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['Email', selectedLead.email || '—', Mail, 'blue'],
                  ['Phone', selectedLead.phone || '—', Phone, 'emerald'],
                  ['City', `${selectedLead.city || '—'}${selectedLead.state ? `, ${selectedLead.state}` : ''}`, MapPin, 'purple'],
                  ['Source', selectedLead.source || '—', BarChart2, 'amber'],
                  ['Created Date', selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—', Calendar, 'green'],
                  ['Created Time', selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—', Clock, 'yellow'],
                ].map(([label, val, Icon, colorKey]) => {
                  const colorMap = { blue: '#3b82f6', emerald: '#10b981', purple: '#a855f7', amber: '#f59e0b', green: '#22c55e', yellow: '#eab308', cyan: '#06b6d4', pink: '#ec4899' };
                  const c = colorMap[colorKey] || '#3b82f6';
                  return (
                    <div key={label} className="rounded-xl p-3 border border-[var(--border-subtle)]" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${c}15` }}>
                          <Icon size={11} style={{ color: c }} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate" title={val}>{val}</p>
                    </div>
                  );
                })}
              </div>

              {/* Recent Activity - Display activities array from selectedLead */}
              {selectedLead?.activities && selectedLead.activities.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Recent Activity</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {(() => {
                      // Deduplicate activities by note + timestamp combination
                      const uniqueActivities = Array.from(
                        new Map(
                          selectedLead.activities.map((act, i) => {
                            // Create unique key from note, timestamp, and index as fallback
                            const uniqueKey = `${act.note || ''}-${act.ts || act.timestamp || ''}-${i}`;
                            return [uniqueKey, { ...act, _uniqueKey: uniqueKey }];
                          })
                        ).values()
                      );

                      return uniqueActivities.slice(0, 4).map((act, idx) => (
                        <div key={act._id || act._uniqueKey || `activity-${idx}`} className="flex gap-2.5 text-xs">
                          <div className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center shrink-0 mt-0.5">
                            {act.type === 'call' && <Phone size={10} className="text-[var(--green)]" />}
                            {act.type === 'email' && <Mail size={10} className="text-[var(--primary)]" />}
                            {act.type === 'whatsapp' && <MessageSquare size={10} className="text-[var(--green)]" />}
                            {act.type === 'note' && <Activity size={10} className="text-amber-400" />}
                            {act.type === 'stage_change' && <GitCommit size={10} className="text-purple-400" />}
                            {act.type === 'import' && <Download size={10} className="text-[var(--blue)]" />}
                            {act.type === 'created' && <Plus size={10} className="text-green-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text-secondary)] leading-relaxed">{act.note || 'No description'}</p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{act.ts || act.timestamp || '—'} · {act.by || 'System'}</p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Custom Information Section */}
              {selectedLead?.customFields && Object.keys(selectedLead.customFields).length > 0 && (
                <div className="border-t border-[var(--border-base)] pt-4">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Custom Information</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {Object.entries(selectedLead.customFields).map(([key, value]) => {
                      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      return (
                        <div key={key} className="rounded-xl p-3 border border-[var(--border-subtle)]" style={{ background: 'var(--bg-elevated)' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#8b5cf715' }}>
                              <Tag size={11} style={{ color: '#8b5cf7' }} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
                          </div>
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate" title={value}>{value !== undefined && value !== null ? value : '—'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )
      }

      {/* EDIT LEAD MODAL */}
      {showEditModal && editingLead && (
        <Modal
          open={showEditModal}
          onClose={() => { setShowEditModal(false); setEditingLead(null); }}
          title={`Edit Lead — ${editingLead.name}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setShowEditModal(false); setEditingLead(null); }}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : <><Save size={13} /> Save Changes</>}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Name">
                <Input
                  value={editingLead.name}
                  onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                />
              </FormField>
              <FormField label="Company">
                <Input
                  value={editingLead.company || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Email">
                <Input
                  type="email"
                  value={editingLead.email || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                />
              </FormField>
              <FormField label="Phone">
                <Input
                  value={editingLead.phone || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Stage">
                <Select
                  value={editingLead?.statusKey || editingLead?.status || 'new'}
                  onChange={(e) => setEditingLead({ ...editingLead, statusKey: e.target.value, status: e.target.value })}
                >
                  {(statusOptions || []).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Source">
                <Select
                  value={editingLead.source}
                  onChange={(e) => setEditingLead({ ...editingLead, source: e.target.value })}
                >
                  {SOURCES.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Value (₹)">
                <Input
                  type="number"
                  value={editingLead.value || 0}
                  onChange={(e) => setEditingLead({ ...editingLead, value: parseInt(e.target.value) || 0 })}
                />
              </FormField>
              <FormField label="City">
                <Input
                  value={editingLead.city || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                />
              </FormField>
            </div>
            <FormField label="Notes">
              <Textarea
                rows={3}
                value={editingLead.notes || ''}
                onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
              />
            </FormField>

            {/* Custom Fields Section */}
            {editingLead?.customFields && Object.keys(editingLead.customFields).length > 0 && (
              <div className="border-t border-[var(--border-base)] pt-4">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Custom Fields</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(editingLead.customFields).map(([key, value]) => (
                    <FormField key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
                      <Input
                        value={value !== undefined && value !== null ? value : ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setEditingLead(prev => ({
                            ...prev,
                            customFields: {
                              ...(prev.customFields || {}),
                              [key]: newValue
                            }
                          }));
                        }}
                      />
                    </FormField>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ACTIVITY LOG SIDEBAR DRAWER */}
      {showActivityModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => { setShowActivityModal(false); setNewActivityNote(''); setActivityLeadId(null); }}
          />
          {/* Sidebar Drawer */}
          <div className="fixed right-0 top-[36.5px] bottom-0 w-[450px] bg-[var(--bg-surface)] border-l border-[var(--border-base)] z-50 shadow-2xl flex flex-col" style={{ transform: 'translateX(0)', transition: 'transform 0.3s ease-out' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-base)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Activity Log</h3>
              <button
                onClick={() => { setShowActivityModal(false); setNewActivityNote(''); setActivityLeadId(null); }}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              >
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Activity Timeline */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {activityData.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-4">No activities found.</p>
                ) : (
                  activityData.map((event, idx) => (
                    <div key={idx} className="flex gap-3 text-sm border-l-2 border-[var(--border-subtle)] pl-3 py-1">
                      <div className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center shrink-0">
                        {event.type === 'call' && <Phone size={12} className="text-[var(--green)]" />}
                        {event.type === 'email' && <Mail size={12} className="text-[var(--primary)]" />}
                        {event.type === 'stage_change' && <GitCommit size={12} className="text-purple-400" />}
                        {event.type === 'created' && <UserPlus size={12} className="text-green-400" />}
                        {event.type === 'note' && <FileText size={12} className="text-amber-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-[var(--text-primary)]">{event.note}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{formatTimeAgo(event.timestamp)} · {event.by}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add New Activity Input */}
            <div className="border-t border-[var(--border-base)] p-4 bg-[var(--bg-elevated)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Add Activity</p>
              <div className="flex gap-2">
                <textarea
                  value={newActivityNote}
                  onChange={(e) => setNewActivityNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveActivity();
                    }
                  }}
                  placeholder="Enter Activity"
                  rows={3}
                  className="flex-1 px-3 py-2 text-sm bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                />
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  onClick={handleSaveActivity}
                  disabled={actionLoading || !newActivityNote.trim()}
                  size="sm"
                >
                  {actionLoading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* LEAD TRACKER SIDEBAR DRAWER */}
      {showTrackerDrawer && trackerLeadId && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/1 z-40 transition-opacity"
            onClick={() => { setShowTrackerDrawer(false); setTrackerLeadId(null); }}
          />
          {/* Sidebar Drawer */}
          <div className="fixed right-0 top-[36.5px] bottom-0 w-[450px] bg-[var(--bg-surface)] border-l border-[var(--border-base)] z-50 shadow-2xl flex flex-col" style={{ transform: 'translateX(0)', transition: 'transform 0.3s ease-out' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-base)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Lead Tracker</h3>
              <button
                onClick={() => { setShowTrackerDrawer(false); setTrackerLeadId(null); }}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              >
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Lead Tracker Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <LeadTracker
                key={trackerLeadId}
                leadId={trackerLeadId}
                statusOptions={statusOptions}
                onStageChange={fetchLeads}
                onNavigate={onNavigate}
              />
            </div>
          </div>
        </>
      )}

      {/* SCORE EDIT MODAL */}
      {showScoreEditModal && scoreEditingLead && (
        <Modal
          open={showScoreEditModal}
          onClose={() => { setShowScoreEditModal(false); setScoreEditingLead(null); }}
          title={`Edit Score — ${scoreEditingLead.name}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setShowScoreEditModal(false); setScoreEditingLead(null); }}>Cancel</Button>
              <Button onClick={handleSaveScore} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Update Score'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)]">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-lg">
                {scoreEditingLead.name[0]}
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{scoreEditingLead.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{scoreEditingLead.company || 'Individual'}</p>
              </div>
            </div>
            <FormField label="Score (0-100)">
              <Input
                type="number"
                min="0"
                max="100"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                placeholder="Enter score between 0 and 100"
              />
            </FormField>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setNewScore('0')}>0</Button>
              <Button variant="secondary" size="sm" onClick={() => setNewScore('25')}>25</Button>
              <Button variant="secondary" size="sm" onClick={() => setNewScore('50')}>50</Button>
              <Button variant="secondary" size="sm" onClick={() => setNewScore('75')}>75</Button>
              <Button variant="secondary" size="sm" onClick={() => setNewScore('100')}>100</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ASSIGN LEADS MODAL */}
      {showAssignModal && (
        <>
          {console.log('[ASSIGN MODAL RENDER] Roles state:', roles, 'Count:', roles.length)}
          <Modal
            open={showAssignModal}
            onClose={handleCloseAssignModal}
            title={`Assign Leads (${assigningLeadIds.length})`}
            footer={
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={handleCloseAssignModal}>Cancel</Button>
                <Button onClick={handleAssignLeads} disabled={assignLoading || !selectedAssignUser}>
                  {assignLoading ? 'Assigning...' : <><UserCheck size={13} /> Assign</>}
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Select a role and user to assign {assigningLeadIds.length === 1 ? 'this lead' : `these ${assigningLeadIds.length} leads`} to:
              </p>

              {/* Role Selection */}
              <FormField label="Role">
                <Select
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={rolesLoading}
                >
                  <option value="">{rolesLoading ? 'Loading roles...' : 'Select Role'}</option>
                  {roles.length === 0 && !rolesLoading && (
                    <option disabled>No roles available</option>
                  )}
                  {roles.map((role) => (
                    <option key={role._id || role.id} value={role._id || role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              {/* User Selection (filtered by role) */}
              <FormField label="User">
                <Select
                  value={selectedAssignUser}
                  onChange={(e) => setSelectedAssignUser(e.target.value)}
                  disabled={!selectedRole || usersLoading}
                >
                  <option value="">
                    {!selectedRole
                      ? 'Select role first'
                      : usersLoading
                        ? 'Loading users...'
                        : filteredUsers.length === 0
                          ? 'No users available for this role'
                          : 'Select User'
                    }
                  </option>
                  {filteredUsers.map((user) => (
                    <option key={user._id || user.id} value={user._id || user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </Modal>
        </>
      )}

      {/* SCORE BOOST MODAL */}
      {showScoreBoostModal && (
        <Modal
          open={showScoreBoostModal}
          onClose={handleCloseScoreBoostModal}
          title={`Score Boost (${scoreBoostLeadIds.length})`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={handleCloseScoreBoostModal}>Cancel</Button>
              <Button onClick={handleScoreBoost} disabled={scoreBoostLoading || !scoreBoostValue}>
                {scoreBoostLoading ? 'Boosting...' : <><Brain size={13} /> Boost Score</>}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Increase score by {scoreBoostValue} points for {scoreBoostLeadIds.length === 1 ? 'this lead' : `these ${scoreBoostLeadIds.length} leads`}:
            </p>
            <FormField label="Score Increase">
              <Input
                type="number"
                min="1"
                max="100"
                value={scoreBoostValue}
                onChange={(e) => setScoreBoostValue(parseInt(e.target.value) || 0)}
                placeholder="Enter score increase"
              />
            </FormField>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setScoreBoostValue(5)}>+5</Button>
              <Button variant="secondary" size="sm" onClick={() => setScoreBoostValue(10)}>+10</Button>
              <Button variant="secondary" size="sm" onClick={() => setScoreBoostValue(15)}>+15</Button>
              <Button variant="secondary" size="sm" onClick={() => setScoreBoostValue(20)}>+20</Button>
              <Button variant="secondary" size="sm" onClick={() => setScoreBoostValue(25)}>+25</Button>
            </div>
          </div>
        </Modal>
      )}
      {/* CREATE PROJECT MODAL */}
      {showCreateProjectModal && selectedCustomerForProject && (
        <Modal
          open={showCreateProjectModal}
          onClose={handleCloseCreateProjectModal}
          title={`Create Project — ${selectedCustomerForProject.name}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={handleCloseCreateProjectModal}>Cancel</Button>
              <Button
                onClick={handleCreateProject}
                disabled={projectCreateLoading || !projectForm.name}
                className="bg-[var(--green)] hover:bg-[var(--green)] text-white"
              >
                {projectCreateLoading ? 'Creating...' : <><Package size={14} /> Create Project</>}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Customer Info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20">
              <div className="w-10 h-10 rounded-full bg-[var(--green)] text-white flex items-center justify-center font-bold text-lg">
                {selectedCustomerForProject.name[0]}
              </div>
              <div>
                <p className="font-semibold text-[var(--green)]">{selectedCustomerForProject.name}</p>
                <p className="text-xs text-[var(--green)]">{selectedCustomerForProject.email} · {selectedCustomerForProject.phone}</p>
              </div>
            </div>

            {/* Project Name */}
            <FormField label="Project Name *">
              <Input
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="Enter project name"
              />
            </FormField>

            {/* Description */}
            <FormField label="Description">
              <Textarea
                rows={2}
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Project description"
              />
            </FormField>

            {/* Status & BOQ Template */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Status">
                <Select
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                >
                  <option value="planning">Planning</option>
                  <option value="accepted">Accepted (Auto-Transfer Stock)</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </FormField>
              <FormField label="BOQ Template">
                <Select
                  value={projectForm.boqTemplate}
                  onChange={(e) => setProjectForm({ ...projectForm, boqTemplate: e.target.value })}
                >
                  {boqTemplates.map(template => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </Select>
              </FormField>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Date">
                <Input
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                />
              </FormField>
              <FormField label="End Date">
                <Input
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                />
              </FormField>
            </div>

            {/* Budget & Site Address */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Budget (₹)">
                <Input
                  type="number"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm({ ...projectForm, budget: parseInt(e.target.value) || 0 })}
                  placeholder="Project budget"
                />
              </FormField>
              <FormField label="Site Address">
                <Input
                  value={projectForm.siteAddress}
                  onChange={(e) => setProjectForm({ ...projectForm, siteAddress: e.target.value })}
                  placeholder="Installation site address"
                />
              </FormField>
            </div>

            {/* Department & Assign Employee - Dynamic from HRM */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Department">
                <Select
                  value={selectedDepartment}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id || dept.id} value={dept._id || dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Assign Employee">
                <Select
                  value={projectForm.assignedTo}
                  onChange={(e) => setProjectForm({ ...projectForm, assignedTo: e.target.value })}
                  disabled={!selectedDepartment}
                >
                  <option value="">
                    {!selectedDepartment
                      ? 'Select department first'
                      : filteredHrmEmployees.length === 0
                        ? 'No employees in this dept'
                        : 'Select Employee'
                    }
                  </option>
                  {filteredHrmEmployees.map(emp => {
                    const firstName =
                      emp.firstName || emp.firstname || emp.first_name ||
                      emp.user?.firstName || emp.user?.firstname || emp.user?.first_name ||
                      emp.personalDetails?.firstName || emp.personalDetails?.firstname || emp.personalDetails?.first_name ||
                      '';
                    const lastName =
                      emp.lastName || emp.lastname || emp.last_name ||
                      emp.user?.lastName || emp.user?.lastname || emp.user?.last_name ||
                      emp.personalDetails?.lastName || emp.personalDetails?.lastname || emp.personalDetails?.last_name ||
                      '';
                    const name = emp.name || emp.fullName || emp.user?.name || emp.user?.fullName || '';
                    const fullName = `${firstName} ${lastName}`.trim() || name || 'Unnamed';
                    const empId =
                      emp.employeeId || emp.employee_id || emp.empId || emp.id ||
                      emp.user?.employeeId || emp.user?.employee_id || emp.user?.empId || emp.user?.id ||
                      'N/A';
                    return (
                      <option key={emp._id || emp.id} value={emp._id || emp.id}>
                        {fullName} ({empId})
                      </option>
                    );
                  })}
                </Select>
              </FormField>
            </div>

            {/* Auto-Transfer Option */}
            {projectForm.status === 'accepted' && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <Package size={18} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 text-sm">Stock Transfer Enabled</p>
                    <p className="text-xs text-amber-700 mt-1">
                      When status is &quot;Accepted&quot;, all BOQ items will be automatically transferred from
                      <strong> Main Warehouse</strong> to <strong>On-Site Warehouse</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* BOQ Items Preview */}
            <div className="border border-[var(--border-base)] rounded-lg overflow-hidden">
              <div className="bg-[var(--bg-elevated)] px-3 py-2 border-b border-[var(--border-base)]">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase">BOQ Items Preview</p>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {boqTemplates.find(t => t.id === projectForm.boqTemplate)?.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] last:border-0">
                    <div className="flex items-center gap-2">
                      <Wrench size={12} className="text-[var(--text-muted)]" />
                      <span className="text-sm text-[var(--text-primary)]">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--accent)]">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div >
  );
};



export default CRMPage;


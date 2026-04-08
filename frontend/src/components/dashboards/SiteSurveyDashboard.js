// Site Survey Advanced Dashboard - 3D Charts, Live Data, Real-time Updates
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3, PieChart, TrendingUp, Activity, Users, MapPin,
  Clock, CheckCircle, AlertCircle, Zap, Sun, Calendar,
  ArrowUpRight, ArrowDownRight, RefreshCw, Filter, Download,
  Eye, Target, Gauge, Battery, Leaf, Timer, MoreHorizontal
} from 'lucide-react';
import { format, subDays, isToday, isYesterday } from 'date-fns';

// Import Chart Libraries
import ReactApexChart from 'react-apexcharts';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart as RePieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Dashboard Component
const SiteSurveyDashboard = ({ surveys = [], loading = false, onRefresh }) => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [animatedStats, setAnimatedStats] = useState({ total: 0, pending: 0, active: 0, complete: 0 });

  // Colors
  const COLORS = {
    primary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899',
    cyan: '#06b6d4',
    orange: '#f97316'
  };

  const CHART_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.purple, COLORS.pink, COLORS.cyan];

  // Animate stats on load
  useEffect(() => {
    const stats = {
      total: surveys.length,
      pending: surveys.filter(s => s.status === 'pending').length,
      active: surveys.filter(s => s.status === 'active').length,
      complete: surveys.filter(s => s.status === 'complete').length
    };
    
    const duration = 1000;
    const steps = 30;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setAnimatedStats({
        total: Math.round(stats.total * progress),
        pending: Math.round(stats.pending * progress),
        active: Math.round(stats.active * progress),
        complete: Math.round(stats.complete * progress)
      });
      
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [surveys]);

  // Real-time updates simulation
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = surveys.length;
    const pending = surveys.filter(s => s.status === 'pending').length;
    const active = surveys.filter(s => s.status === 'active').length;
    const complete = surveys.filter(s => s.status === 'complete').length;
    
    const completionRate = total > 0 ? Math.round((complete / total) * 100) : 0;
    const avgCapacity = total > 0 
      ? (surveys.reduce((acc, s) => acc + (parseFloat(s.projectCapacity) || 0), 0) / total).toFixed(1)
      : 0;
    
    const todaySurveys = surveys.filter(s => isToday(new Date(s.createdAt))).length;
    const weekSurveys = surveys.filter(s => {
      const date = new Date(s.createdAt);
      return date >= subDays(new Date(), 7);
    }).length;

    return {
      total, pending, active, complete,
      completionRate, avgCapacity, todaySurveys, weekSurveys
    };
  }, [surveys]);

  // Chart Data Preparation
  const statusData = [
    { name: 'Pending', value: stats.pending, color: COLORS.warning },
    { name: 'Active', value: stats.active, color: COLORS.primary },
    { name: 'Completed', value: stats.complete, color: COLORS.success }
  ];

  const weeklyTrendData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, index) => {
      const daySurveys = surveys.filter(s => {
        const date = new Date(s.createdAt);
        return date.getDay() === (index + 1) % 7;
      });
      return {
        day,
        created: daySurveys.length,
        completed: daySurveys.filter(s => s.status === 'complete').length
      };
    });
  }, [surveys]);

  const capacityDistribution = useMemo(() => {
    const ranges = {
      '0-5 kW': 0,
      '5-10 kW': 0,
      '10-25 kW': 0,
      '25-50 kW': 0,
      '50+ kW': 0
    };
    
    surveys.forEach(s => {
      const cap = parseFloat(s.projectCapacity) || 0;
      if (cap <= 5) ranges['0-5 kW']++;
      else if (cap <= 10) ranges['5-10 kW']++;
      else if (cap <= 25) ranges['10-25 kW']++;
      else if (cap <= 50) ranges['25-50 kW']++;
      else ranges['50+ kW']++;
    });
    
    return Object.entries(ranges).map(([range, count]) => ({
      range, count, fullMark: Math.max(...Object.values(ranges)) + 5
    }));
  }, [surveys]);

  const cityData = useMemo(() => {
    const cityCounts = {};
    surveys.forEach(s => {
      cityCounts[s.city] = (cityCounts[s.city] || 0) + 1;
    });
    return Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [surveys]);

  // ApexCharts 3D Options - ENHANCED
  const pie3DOptions = {
    chart: {
      type: 'donut',
      background: 'transparent',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 1000,
        animateGradually: { enabled: true, delay: 150 },
        dynamicAnimation: { enabled: true, speed: 350 }
      },
      dropShadow: {
        enabled: true,
        top: 0,
        left: 0,
        blur: 3,
        opacity: 0.2
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { show: true, fontSize: '14px', color: 'var(--text-muted)' },
            value: { show: true, fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' },
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-muted)',
              formatter: () => stats.total.toString()
            }
          }
        },
        expandOnClick: true,
        offsetX: 0,
        offsetY: 0
      }
    },
    dataLabels: { enabled: false },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      fontFamily: 'inherit',
      labels: { colors: 'var(--text-muted)', useSeriesColors: true },
      markers: { width: 10, height: 10, radius: 12 },
      itemMargin: { horizontal: 15, vertical: 5 }
    },
    colors: [COLORS.warning, COLORS.primary, COLORS.success],
    labels: ['Pending', 'Active', 'Completed'],
    stroke: { show: true, colors: ['transparent'], width: 3 },
    tooltip: {
      theme: 'dark',
      y: { formatter: val => `${val} surveys` }
    }
  };

  const bar3DOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 1000,
        animateGradually: { enabled: true, delay: 150 },
        dynamicAnimation: { enabled: true, speed: 350 }
      },
      dropShadow: {
        enabled: true,
        top: 2,
        left: 2,
        blur: 4,
        opacity: 0.15
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '45%',
        borderRadius: 6,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'last',
        dataLabels: { position: 'top' },
        colors: {
          ranges: [
            { from: 0, to: 100, color: undefined }
          ],
          backgroundBarColors: ['#f3f4f6'],
          backgroundBarOpacity: 0.3,
          backgroundBarRadius: 6
        }
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -25,
      style: {
        fontSize: '12px',
        fontWeight: 600,
        colors: ['var(--text-primary)']
      },
      background: {
        enabled: true,
        foreColor: '#fff',
        padding: 4,
        borderRadius: 4
      }
    },
    xaxis: {
      categories: weeklyTrendData.map(d => d.day),
      labels: {
        style: {
          colors: 'var(--text-muted)',
          fontSize: '12px',
          fontWeight: 500
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      crosshairs: {
        show: true,
        fill: { type: 'gradient', gradient: { colorFrom: '#D8E3F0', colorTo: '#BED1E6', stops: [0, 100], opacityFrom: 0.4, opacityTo: 0.5 } }
      }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--text-muted)', fontSize: '11px' },
        formatter: val => Math.round(val)
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    colors: [COLORS.primary, COLORS.success],
    grid: {
      borderColor: 'var(--border-base)',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { top: 20, right: 20, bottom: 0, left: 10 }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      fontFamily: 'inherit',
      labels: { colors: 'var(--text-muted)' },
      markers: { width: 10, height: 10, radius: 12 },
      itemMargin: { horizontal: 15 }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.3,
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.8,
        stops: [0, 100]
      }
    },
    tooltip: {
      theme: 'light',
      shared: true,
      intersect: false,
      y: { formatter: val => `${val} surveys` }
    }
  };

  // Stat Card Component
  const StatCard = ({ icon: Icon, title, value, subtext, color, trend, delay = 0 }) => (
    <div
      className="glass-card p-5 relative overflow-hidden group animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">{title}</p>
          <h3 className="text-3xl font-bold mt-1 text-[var(--text-primary)]">{value}</h3>
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-[11px] ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend)}% from last week
            </div>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-1">{subtext}</p>
        </div>
        <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
          <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
      </div>
    </div>
  );

  // Activity Feed Component
  const ActivityFeed = () => {
    const recentActivity = useMemo(() => {
      return surveys
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(s => ({
          id: s._id || s.surveyId,
          client: s.clientName,
          city: s.city,
          status: s.status,
          time: s.createdAt,
          capacity: s.projectCapacity
        }));
    }, [surveys]);

    return (
      <div className="space-y-3">
        {recentActivity.map((activity, idx) => (
          <div
            key={activity.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer animate-fade-in"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className={`w-2 h-2 rounded-full ${
              activity.status === 'complete' ? 'bg-green-500' :
              activity.status === 'active' ? 'bg-blue-500' : 'bg-amber-500'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activity.client}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{activity.city} • {activity.capacity}</p>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">
              {isToday(new Date(activity.time)) ? 'Today' :
               isYesterday(new Date(activity.time)) ? 'Yesterday' :
               format(new Date(activity.time), 'dd MMM')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Survey Dashboard</h2>
          <p className="text-sm text-[var(--text-muted)]">Real-time insights & analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)]">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-xs text-[var(--text-muted)]">{isLive ? 'Live' : 'Paused'}</span>
            <button 
              onClick={() => setIsLive(!isLive)}
              className="ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {isLive ? <Timer size={14} /> : <Activity size={14} />}
            </button>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            Updated: {format(lastUpdated, 'HH:mm:ss')}
          </span>
          <button 
            onClick={onRefresh}
            className="p-2 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Status Donut Chart */}
        <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Survey Status</h3>
            <PieChart size={18} className="text-[var(--text-muted)]" />
          </div>
          <div className="h-64">
            <ReactApexChart
              options={pie3DOptions}
              series={[stats.pending, stats.active, stats.complete]}
              type="donut"
              height={250}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {statusData.map((item, idx) => (
              <div key={idx} className="text-center p-2 rounded-lg" style={{ backgroundColor: `${item.color}20` }}>
                <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{item.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Trend Bar Chart */}
        <div className="glass-card p-5 lg:col-span-2 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Weekly Activity Trend</h3>
            <TrendingUp size={18} className="text-[var(--text-muted)]" />
          </div>
          <div className="h-64">
            <ReactApexChart
              options={bar3DOptions}
              series={[
                { name: 'Created', data: weeklyTrendData.map(d => d.created) },
                { name: 'Completed', data: weeklyTrendData.map(d => d.completed) }
              ]}
              type="bar"
              height={250}
            />
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Distribution - ENHANCED */}
        <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Surveys by City</h3>
            <MapPin size={18} className="text-[var(--text-muted)]" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="cityGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-base)" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="var(--text-muted)" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="city" 
                  stroke="var(--text-muted)" 
                  fontSize={11}
                  width={70}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-elevated)', radius: 4 }}
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-surface)', 
                    border: '1px solid var(--border-base)', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    color: 'var(--text-primary)'
                  }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <Bar 
                  dataKey="count" 
                  fill="url(#cityGradient)" 
                  radius={[0, 6, 6, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capacity Distribution - ENHANCED */}
        <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Capacity Distribution</h3>
            <Gauge size={18} className="text-[var(--text-muted)]" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={capacityDistribution} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <defs>
                  <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.purple} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={COLORS.pink} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <PolarGrid 
                  stroke="var(--border-base)" 
                  radialLines={true}
                  gridType="polygon"
                />
                <PolarAngleAxis 
                  dataKey="range" 
                  stroke="#6b7280" 
                  fontSize={10}
                  tickLine={false}
                />
                <PolarRadiusAxis 
                  stroke="#d1d5db" 
                  fontSize={9}
                  tickCount={4}
                  axisLine={false}
                />
                <Radar
                  name="Surveys"
                  dataKey="count"
                  stroke={COLORS.purple}
                  strokeWidth={2}
                  fill="url(#radarGradient)"
                  fillOpacity={1}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255,255,255,0.95)', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row - Activity Feed & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Recent Activity</h3>
            <Activity size={18} className="text-[var(--text-muted)]" />
          </div>
          <ActivityFeed />
        </div>

        {/* Performance Metrics */}
        <div className="glass-card p-5 lg:col-span-2 animate-fade-in" style={{ animationDelay: '800ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Performance Overview</h3>
            <Battery size={18} className="text-[var(--text-muted)]" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200">
              <Sun size={24} className="text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-[var(--text-muted)]">Total Projects</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-200">
              <Leaf size={24} className="text-green-500 mb-2" />
              <p className="text-2xl font-bold">{stats.complete}</p>
              <p className="text-xs text-[var(--text-muted)]">Completed</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-200">
              <Clock size={24} className="text-amber-500 mb-2" />
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-[var(--text-muted)]">Pending</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-200">
              <Users size={24} className="text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-[var(--text-muted)]">Active</p>
            </div>
          </div>
          
          {/* Progress Bars */}
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Completion Rate</span>
                <span className="font-semibold">{stats.completionRate}%</span>
              </div>
              <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Active Progress</span>
                <span className="font-semibold">
                  {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteSurveyDashboard;

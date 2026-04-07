// Solar OS – EPC Edition — ProcurementPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShoppingCart, Plus, Truck, Package, CheckCircle, LayoutGrid, List, Calendar, Zap, Phone, Mail, Star, Edit, BarChart3,
  TrendingUp, PieChart, BarChart, Activity, Users, IndianRupee, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Avatar } from '../components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import { api } from '../lib/apiClient';
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import { toast } from '../components/ui/Toast';
import CanAccess, { CanCreate } from '../components/CanAccess';

const fmt = CURRENCY.format;
const fmtFull = CURRENCY.formatFull;

// ── PO Stage Kanban definitions ────────────────────────────────────────────────
const PO_KANBAN_STAGES = [
  { id: 'Draft', label: 'Draft', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  { id: 'Ordered', label: 'Ordered', color: '#7c5cfc', bg: 'rgba(124,92,252,0.12)' },
  { id: 'In Transit', label: 'In Transit', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { id: 'Delivered', label: 'Delivered', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'Cancelled', label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

const PO_COLUMNS = [
  { key: 'id', header: 'PO Number', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'vendorName', header: 'Vendor', sortable: true, render: (v, row) => <span className="text-xs font-semibold text-[var(--text-primary)] cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => row._onVendorClick && row._onVendorClick(v)}>{v}</span> },
  { key: 'items', header: 'Items', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'totalAmount', header: 'Amount', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{fmt(v)}</span> },
  { key: 'status', header: 'Status', render: v => <StatusBadge domain="purchaseOrder" value={v} /> },
  { key: 'orderedDate', header: 'Ordered', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'expectedDate', header: 'Expected', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'deliveredDate', header: 'Delivered', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
];

const PO_STATUS_FILTERS = ['All', 'Draft', 'Ordered', 'In Transit', 'Delivered', 'Cancelled'];

/* ── PO Kanban Card ── */
const POCard = ({ po, onDragStart, onClick }) => {
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{po.id}</span>
        <span className="text-[10px] font-bold text-[var(--text-primary)]">{fmt(po.totalAmount)}</span>
      </div>
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5 leading-tight">{po.vendorName}</p>
      <p className="text-[10px] text-[var(--text-muted)] mb-2 leading-relaxed line-clamp-2">{po.items}</p>
      <div className="flex items-center gap-1 text-[10px] text-[var(--text-faint)]">
        <Calendar size={9} />
        <span>Expected: {po.expectedDate}</span>
      </div>
      {po.deliveredDate && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-[var(--green)]">
          <CheckCircle size={9} />
          <span>Delivered: {po.deliveredDate}</span>
        </div>
      )}
    </div>
  );
};

/* ── PO Kanban Board ── */
const POKanbanBoard = ({ pos, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {PO_KANBAN_STAGES.map(stage => {
          const cards = pos.filter(p => p.status === stage.id);
          const total = cards.reduce((a, p) => a + p.totalAmount, 0);
          return (
            <div key={stage.id}
              className={`flex flex-col w-60 rounded-xl border transition-colors h-[530px] ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}>
              <div className="flex items-center justify-between p-3 border-b border-[var(--border-base)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {total > 0 && <span className="text-[10px] text-[var(--text-muted)]">{fmt(total).replace('₹', '₹')}</span>}
                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-2 h-[430px] overflow-y-auto">
                {cards.map(po => (
                  <POCard key={po.id} po={po}
                    onDragStart={() => { draggingId.current = po.id; }}
                    onClick={() => onCardClick(po)} />
                ))}
                {cards.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[11px] text-[var(--text-faint)]">Drop here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MONTHS = [
  { value: 'All', label: 'All Months' },
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' }
];

/* ── PO Visualization View ── */
const POVisualizationView = ({ pos, filterMonth, filterYear }) => {
  const [animateChart, setAnimateChart] = useState(false);
  
  // Calendar view states
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  
  useEffect(() => {
    // Trigger animation when component mounts or filters change
    setAnimateChart(false);
    setTimeout(() => setAnimateChart(true), 50);
  }, [filterMonth, filterYear]);

  // Filter POs based on month/year
  const filteredPOs = useMemo(() => {
    if (filterMonth === 'All') return pos;
    return pos.filter(p => {
      const date = p?.orderedDate || p?.createdAt;
      if (!date) return false;
      const d = new Date(date);
      const monthMatch = d.getMonth() === filterMonth;
      const yearMatch = d.getFullYear() === filterYear;
      return monthMatch && yearMatch;
    });
  }, [pos, filterMonth, filterYear]);

  // Calculate stats on filtered data
  const statusCounts = {
    Draft: filteredPOs.filter(p => p?.status === 'Draft').length,
    Ordered: filteredPOs.filter(p => p?.status === 'Ordered').length,
    'In Transit': filteredPOs.filter(p => p?.status === 'In Transit').length,
    Delivered: filteredPOs.filter(p => p?.status === 'Delivered').length,
    Cancelled: filteredPOs.filter(p => p?.status === 'Cancelled').length,
  };

  const total = filteredPOs.length || 1;
  const totalAmount = filteredPOs.reduce((a, p) => a + (p?.totalAmount || 0), 0);

  // Light aesthetic colors
  const statusColors = {
    Draft: '#94a3b8',      // slate-400
    Ordered: '#a78bfa',   // violet-400
    'In Transit': '#67e8f9', // cyan-300
    Delivered: '#86efac', // green-300
    Cancelled: '#fca5a5', // red-300
  };

  const statusGradients = {
    Draft: ['#cbd5e1', '#94a3b8'],
    Ordered: ['#ddd6fe', '#a78bfa'],
    'In Transit': ['#a5f3fc', '#67e8f9'],
    Delivered: ['#bbf7d0', '#86efac'],
    Cancelled: ['#fecaca', '#fca5a5'],
  };

  // Get top 5 vendors by PO count from filtered data
  const vendorData = useMemo(() => {
    const vendorCounts = {};
    filteredPOs.forEach(p => {
      const vendor = p?.vendorName || 'Unknown';
      vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
    });
    return Object.entries(vendorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredPOs]);
  const maxVendorCount = Math.max(...vendorData.map(v => v[1]), 1);

  // Get last 6 months actual data from filtered POs
  const monthlyData = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
        fullYear: d.getFullYear()
      });
    }
    return months.map(m => {
      const count = filteredPOs.filter(p => {
        const date = p?.orderedDate || p?.createdAt;
        if (!date) return false;
        const d = new Date(date);
        return d.getMonth() === m.monthIdx && d.getFullYear() === m.fullYear;
      }).length;
      return { ...m, count };
    });
  }, [filteredPOs]);
  const maxMonthly = Math.max(...monthlyData.map(d => d.count), 1);

  // Monthly spend data - actual calculation from filtered POs
  const monthlySpendData = useMemo(() => {
    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        monthIdx: d.getMonth(),
        fullYear: d.getFullYear()
      });
    }
    return months.map(m => {
      const amount = filteredPOs
        .filter(p => {
          const date = p?.orderedDate || p?.createdAt;
          if (!date) return false;
          const d = new Date(date);
          return d.getMonth() === m.monthIdx && d.getFullYear() === m.fullYear;
        })
        .reduce((a, p) => a + (p?.totalAmount || 0), 0);
      return { ...m, amount: amount / 100000 }; // Convert to lakhs
    });
  }, [filteredPOs]);
  const maxSpend = Math.max(...monthlySpendData.map(d => d.amount), 1);

  // Donut chart segments with animation
  const donutSegments = Object.entries(statusCounts).map(([status, count], idx, arr) => {
    const percentage = count / total;
    const circumference = 2 * Math.PI * 50;
    const prevSegments = arr.slice(0, idx);
    const offset = prevSegments.reduce((acc, entry) => {
      const prevCount = entry[1];
      return acc + (prevCount / total) * circumference;
    }, 0);
    return {
      status: status,
      count: count,
      percentage: percentage,
      dashArray: `${percentage * circumference} ${circumference}`,
      offset: -offset,
      color: statusColors[status],
    };
  });

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
    const days = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  }, [calendarMonth, calendarYear]);

  // Calendar data calculation - POs per day
  const calendarData = useMemo(() => {
    const data = [];
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayPOs = pos.filter(p => {
        const date = p?.orderedDate || p?.createdAt;
        if (!date) return false;
        const d = new Date(date);
        return d.getDate() === day && 
               d.getMonth() === calendarMonth && 
               d.getFullYear() === calendarYear;
      });
      
      const count = dayPOs.length;
      const amount = dayPOs.reduce((sum, p) => sum + (p?.totalAmount || 0), 0) / 100000;
      
      if (count > 0) {
        data.push({ day, count, amount });
      }
    }
    return data;
  }, [pos, calendarMonth, calendarYear]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">Visual analytics dashboard for purchase orders</p>
        {filterMonth !== 'All' && (
          <span className="text-xs text-[var(--accent-light)] bg-[var(--accent-light)]/10 px-2 py-1 rounded-full">
            Showing: {MONTHS.find(m => m.value === filterMonth)?.label} {filterYear}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Row 1: Top Vendors & Status Distribution */}
        {/* Card 1: Top Vendors Horizontal Bar Chart */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Users size={14} className="text-indigo-400" />
            Top Vendors (by PO Count)
          </h4>
          <div className="space-y-2">
            {vendorData.length === 0 ? (
              <p className="text-xs text-[var(--text-primary)] text-center py-4">No vendor data available</p>
            ) : (
              vendorData.map(([vendor, count], idx) => (
                <div key={vendor} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-primary)] font-medium w-20 truncate" title={vendor}>
                    {vendor.length > 12 ? vendor.substring(0, 12) + '...' : vendor}
                  </span>
                  <div className="flex-1 h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: animateChart ? `${(count / maxVendorCount) * 100}%` : '0%',
                        background: `linear-gradient(90deg, ${statusGradients['Ordered'][0]} 0%, ${statusGradients['Ordered'][1]} 100%)`
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-400 w-4 text-right">{count}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-[var(--border-base)] text-center">
            <span className="text-[10px] text-[var(--text-primary)]">Total Vendors: </span>
            <span className="text-sm font-bold text-indigo-400">{vendorData.length}</span>
          </div>
        </div>

        {/* Card 2: Animated Donut Chart - Status Distribution */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <PieChart size={14} className="text-violet-400" />
            Status Distribution
          </h4>
          <div className="flex items-center justify-center">
            <div className="relative w-36 h-36">
              <svg 
                className={`w-full h-full ${animateChart ? 'animate-spin-slow' : ''}`} 
                viewBox="0 0 120 120"
                style={{ animation: animateChart ? 'spin 2s ease-out' : 'none' }}
              >
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={seg.status}
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="14"
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={animateChart ? seg.offset : -314}
                    className="transition-all duration-1000 ease-out"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
                  />
                ))}
                {/* Inner circle for donut effect */}
                <circle cx="60" cy="60" r="32" fill="var(--bg-surface)" />
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{total}</span>
                <span className="text-[9px] text-[var(--text-muted)]">Total POs</span>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {Object.entries(statusCounts).filter((entry) => entry[1] > 0).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--bg-elevated)]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[status] }} />
                <span className="text-[9px] text-[var(--text-primary)] font-medium">{status} ({count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Monthly Spend & PO Status Pipeline */}
        {/* Card 3: Monthly Spend with Calendar View */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <IndianRupee size={14} className="text-[var(--green)]" />
              Monthly Spend (₹ Lakhs)
            </h4>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowCalendarView(false)}
                className={`p-1.5 rounded ${!showCalendarView ? 'bg-[var(--accent-light)]/20 text-[var(--accent-light)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                title="Bar Chart View"
              >
                <BarChart size={12} />
              </button>
              <button 
                onClick={() => setShowCalendarView(true)}
                className={`p-1.5 rounded ${showCalendarView ? 'bg-[var(--accent-light)]/20 text-[var(--accent-light)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                title="Calendar View"
              >
                <Calendar size={12} />
              </button>
            </div>
          </div>
          
          {showCalendarView ? (
            /* Calendar View */
            <div className="space-y-3">
              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setCalendarMonth(prev => prev === 0 ? 11 : prev - 1)}
                  className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {MONTHS.find(m => m.value === calendarMonth)?.label}
                </span>
                <button 
                  onClick={() => setCalendarMonth(prev => prev === 11 ? 0 : prev + 1)}
                  className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              
              {/* Year Navigation */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setCalendarYear(prev => prev - 1)}
                  className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-medium text-[var(--accent-light)]">
                  {calendarYear}
                </span>
                <button 
                  onClick={() => setCalendarYear(prev => prev + 1)}
                  className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-[9px] text-[var(--text-muted)] py-1">{day}</div>
                ))}
                {calendarDays.map((day, idx) => {
                  const dayData = calendarData.find(d => d.day === day);
                  const hasData = dayData && dayData.count > 0;
                  const isToday = new Date().toDateString() === new Date(calendarYear, calendarMonth, day).toDateString();
                  
                  return (
                    <div 
                      key={idx} 
                      className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] cursor-pointer transition-all ${
                        day === null 
                          ? 'invisible' 
                          : hasData 
                            ? 'bg-[var(--green)]/20 hover:bg-[var(--green)]/30' 
                            : 'bg-[var(--bg-elevated)] hover:bg-[var(--border-base)]'
                      } ${isToday ? 'ring-1 ring-[var(--accent-light)]' : ''}`}
                      title={hasData ? `₹${dayData.amount.toFixed(1)}L - ${dayData.count} POs` : 'No data'}
                    >
                      <span className={`font-medium ${hasData ? 'text-[var(--green)]' : 'text-[var(--text-muted)]'}`}>{day}</span>
                      {hasData && (
                        <span className="text-[8px] text-[var(--green)]">₹{dayData.amount.toFixed(0)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Calendar Summary */}
              <div className="pt-2 border-t border-[var(--border-base)] flex justify-between items-center">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {calendarData.reduce((sum, d) => sum + d.count, 0)} POs this month
                </span>
                <span className="text-sm font-bold text-[var(--green)]">
                  ₹{(calendarData.reduce((sum, d) => sum + d.amount, 0)).toFixed(1)}L
                </span>
              </div>
            </div>
          ) : (
            /* Bar Chart View */
            <div className="relative h-40">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[9px] text-[var(--text-primary)] font-medium">
                <span>₹{maxSpend.toFixed(0)}L</span>
                <span>₹{(maxSpend / 2).toFixed(0)}L</span>
                <span>₹0</span>
              </div>
              
              {/* Chart area */}
              <div className="absolute left-8 right-0 top-0 bottom-6 flex items-end justify-between gap-1">
                {monthlySpendData.map((data, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 group cursor-pointer">
                    <div className="relative w-full flex justify-center">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-all text-[9px] text-white bg-[var(--bg-elevated)] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 border border-[var(--border-base)]">
                        {data.month}: ₹{data.amount.toFixed(1)}L
                      </div>
                      
                      {/* Bar with gradient */}
                      <div
                        className="w-6 rounded-t-lg transition-all duration-1000 ease-out hover:opacity-80"
                        style={{
                          height: animateChart ? `${(data.amount / maxSpend) * 100}px` : '0px',
                          minHeight: data.amount > 0 ? '4px' : '0',
                          background: data.amount > 0 
                            ? `linear-gradient(180deg, #86efac 0%, #22c55e 100%)`
                            : 'transparent',
                          boxShadow: data.amount > 0 ? '0 -2px 8px rgba(34, 197, 94, 0.3)' : 'none'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* X-axis labels */}
              <div className="absolute left-8 right-0 bottom-0 flex justify-between text-[9px] text-[var(--text-primary)] font-medium">
                {monthlySpendData.map(d => <span key={d.month}>{d.month}</span>)}
              </div>
            </div>
          )}
          
          {!showCalendarView && (
            <div className="mt-2 pt-2 border-t border-[var(--border-base)] flex justify-between items-center">
              <span className="text-[10px] text-[var(--text-muted)]">Total Spend</span>
              <span className="text-sm font-bold text-[var(--green)]">₹{(totalAmount / 100000).toFixed(1)}L</span>
            </div>
          )}
        </div>

        {/* Card 4: PO Status Flow - Better Presentation */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Activity size={14} className="text-amber-400" />
            PO Status Pipeline
          </h4>
          <div className="space-y-3">
            {['Delivered', 'In Transit', 'Ordered', 'Draft'].map((status, idx) => {
              const count = statusCounts[status];
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={status} className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: statusGradients[status][0] }}
                  >
                    <span className="text-sm font-bold" style={{ color: statusColors[status] }}>{count}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-[var(--text-primary)]">{status}</span>
                      <span className="text-[10px] text-[var(--text-primary)] font-medium">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-2.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: animateChart ? `${percentage}%` : '0%',
                          backgroundColor: statusColors[status],
                          boxShadow: `0 0 8px ${statusColors[status]}40`
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Summary stats */}
          <div className="mt-4 pt-3 border-t border-[var(--border-base)] grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-[var(--green)]/10">
              <span className="text-[9px] text-[var(--green)] block">Done</span>
              <p className="text-lg font-bold text-[var(--green)]">{statusCounts.Delivered}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-blue-500/10">
              <span className="text-[9px] text-blue-400 block">Active</span>
              <p className="text-lg font-bold text-blue-400">{statusCounts['In Transit'] + statusCounts.Ordered}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-500/10">
              <span className="text-[9px] text-slate-400 block">Draft</span>
              <p className="text-lg font-bold text-slate-400">{statusCounts.Draft}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const ProcurementPage = () => {
  const { can } = usePermissions();
  const { logCreate, logUpdate, logDelete, logStatusChange } = useAuditLog('procurement');

  // Permission guard helpers
  const guardCreate = () => {
    if (!can('procurement', 'create')) {
      toast.error('Permission denied: Cannot create procurement items');
      return false;
    }
    return true;
  };

  const guardEdit = () => {
    if (!can('procurement', 'edit')) {
      toast.error('Permission denied: Cannot edit procurement');
      return false;
    }
    return true;
  };

  const guardDelete = () => {
    if (!can('procurement', 'delete')) {
      toast.error('Permission denied: Cannot delete procurement items');
      return false;
    }
    return true;
  };

  const [poView, setPoView] = useState('kanban');
  const [poSearch, setPoSearch] = useState('');
  const [poStatus, setPoStatus] = useState('All');
  const [poFilter, setPoFilter] = useState(null); // 'pending', 'active', etc.
  const [poPage, setPoPage] = useState(1);
  const [poPageSize, setPoPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showPO, setShowPO] = useState(false);
  const [showVendor, setShowVendor] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Month/Year filter for visualization
  const currentYear = new Date().getFullYear();
  const [vizMonth, setVizMonth] = useState('All');
  const [vizYear, setVizYear] = useState(currentYear);

  // Form states
  const [newPO, setNewPO] = useState({ 
    vendorId: '', 
    items: '', 
    totalAmount: '', 
    expectedDate: '', 
    relatedProjectId: '',
    categoryId: '',
    categoryName: '',
    itemId: '',
    itemName: '',
    unit: '',
    requiredQuantity: ''
  });
  const [newVendor, setNewVendor] = useState({ name: '', category: '', city: '', contact: '', phone: '', email: '' });

  // Inventory data states
  const [inventoryCategories, setInventoryCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryUnits, setInventoryUnits] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Vendors list for dropdown
  const [vendors, setVendors] = useState([]);

  // Projects list for dropdown
  const [projects, setProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectDropdownRef = useRef(null);

  // Vendor detail modal state
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Kanban hide cards state
  const [hidePOCards, setHidePOCards] = useState(false);

  // PO Edit state
  const [isEditingPO, setIsEditingPO] = useState(false);
  const [editedPO, setEditedPO] = useState(null);

  const handleUpdatePO = async () => {
    try {
      if (!editedPO) return;
      const payload = {
        items: editedPO.items,
        totalAmount: Number(editedPO.totalAmount),
        status: editedPO.status,
        expectedDate: editedPO.expectedDate,
        deliveredDate: editedPO.deliveredDate,
        relatedProjectId: editedPO.relatedProjectId,
        // Inventory fields
        categoryId: editedPO.categoryId,
        categoryName: editedPO.categoryName,
        itemId: editedPO.itemId,
        itemName: editedPO.itemName,
        unit: editedPO.unit,
        requiredQuantity: Number(editedPO.requiredQuantity),
      };
      await api.patch(`/procurement/purchase-orders/${editedPO.id}`, payload);
      await fetchData();
      setSelectedPO(null);
      setIsEditingPO(false);
      setEditedPO(null);
      toast.success('PO updated successfully');
    } catch (error) {
      console.error('Error updating PO:', error);
      toast.error('Failed to update PO');
    }
  };

  const handleDeletePO = async (po) => {
    if (!guardDelete()) return;
    if (!window.confirm(`Are you sure you want to delete PO ${po.id}?`)) return;
    try {
      await api.delete(`/procurement/purchase-orders/${po.id}`);
      await fetchData();
      setSelectedPO(null);
      toast.success('Purchase Order deleted successfully');
      logDelete('purchase_order', po.id);
    } catch (error) {
      console.error('Error deleting PO:', error);
      toast.error('Failed to delete Purchase Order: ' + (error.response?.data?.error?.message || error.message || 'Unknown error'));
    }
  };

  const startEditingPO = () => {
    setEditedPO({ ...selectedPO });
    setIsEditingPO(true);
  };

  const cancelEditingPO = () => {
    setIsEditingPO(false);
    setEditedPO(null);
    setSelectedPO(null);
  };
  const handleCallVendor = (vendor) => {
    if (vendor?.phone) {
      window.open(`tel:${vendor.phone}`, '_self');
    } else {
      alert('No phone number available');
    }
  };

  const handleEmailVendor = async (vendor) => {
    if (vendor?.email) {
      try {
        const subject = 'Procurement Inquiry';
        const text = `Dear ${vendor.name || vendor.contact || 'Vendor'},\n\nI hope this email finds you well. We are interested in discussing potential procurement services and would like to connect with you regarding our requirements.\n\nPlease let us know your availability for a brief discussion.\n\nBest regards,\nSolarOS Team`;

        const res = await api.post('/email/send', {
          to: vendor.email,
          subject,
          text
        });

        if (res.data?.success) {
          alert(`Email sent to ${vendor.email}`);
        } else {
          alert(`Email queued: ${res.data?.message || 'Will be sent shortly'}`);
        }
      } catch (error) {
        console.error('Error sending email:', error);
        alert('Failed to send email. Please try again later.');
      }
    } else {
      alert('No email address available');
    }
  };

  // Fetch inventory data when Create PO modal opens
  useEffect(() => {
    if (showPO) {
      fetchInventoryData();
    }
  }, [showPO]);

  // Fetch inventory data when PO Detail modal opens (for edit mode)
  useEffect(() => {
    if (selectedPO) {
      fetchInventoryData();
    }
  }, [selectedPO]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
    fetchVendors();
    fetchProjects();
  }, []);

  // Fetch inventory data from backend
  const fetchInventoryData = async () => {
    setInventoryLoading(true);
    try {
      const tenantId = localStorage.getItem('tenantId') || 'default';
      const [categoriesRes, itemsRes, unitsRes] = await Promise.all([
        api.get('/lookups/categories', { tenantId }),
        api.get('/items', { tenantId }),
        api.get('/lookups/units', { tenantId })
      ]);
      
      // Process categories
      const categoriesData = categoriesRes?.data ?? categoriesRes;
      const categories = Array.isArray(categoriesData) ? categoriesData : (categoriesData?.data || []);
      setInventoryCategories(categories.map(c => ({ id: c._id || c.id || c, name: c.name || c.code || c })).filter(c => c.name));
      
      // Process items - handle various response structures
      let itemsRaw = itemsRes?.data ?? itemsRes;
      // Handle wrapped response like { success: true, data: [...] }
      if (itemsRaw?.success && Array.isArray(itemsRaw.data)) {
        itemsRaw = itemsRaw.data;
      }
      const items = Array.isArray(itemsRaw) ? itemsRaw : (itemsRaw?.data || []);
      
      console.log('[PROCUREMENT] Raw items from API:', items);
      
      const processedItems = items.map(item => ({ 
        id: item.itemId || item._id || item.id || String(item._id), 
        name: item.description || item.name || item.itemName || 'Unknown Item',
        categoryId: item.categoryId || item.category || item.category_id,
        unit: item.unit || item.unitName || item.uom
      }));
      
      console.log('[PROCUREMENT] Processed items:', processedItems);
      setInventoryItems(processedItems);
      
      // Process units
      let unitsRaw = unitsRes?.data ?? unitsRes;
      if (unitsRaw?.success && Array.isArray(unitsRaw.data)) {
        unitsRaw = unitsRaw.data;
      }
      const units = Array.isArray(unitsRaw) ? unitsRaw : (unitsRaw?.data || []);
      setInventoryUnits(units.map(u => u.name || u.code || u.unit || u).filter(Boolean));
      
      console.log('[PROCUREMENT] Inventory data loaded:', { 
        categories: categories.length, 
        items: processedItems.length, 
        units: units.length 
      });
    } catch (err) {
      console.error('[PROCUREMENT] Failed to fetch inventory data:', err);
      toast.error('Failed to load inventory data');
    } finally {
      setInventoryLoading(false);
    }
  };

  // Click outside handler for project dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchVendors = async () => {
    try {
      // Fetch vendors from logistics_vendors collection
      const res = await api.get('/logistics/vendors');
      console.log('Logistics vendors API response:', res);
      
      // Handle response - API returns { success: true, data: [...] }
      let vendorsData = [];
      if (res && res.success && Array.isArray(res.data)) {
        vendorsData = res.data;
      } else if (Array.isArray(res)) {
        vendorsData = res;
      } else if (res && typeof res === 'object') {
        vendorsData = res.data || [];
      }
      
      console.log('Parsed logistics vendors:', vendorsData);
      setVendors(vendorsData);
    } catch (error) {
      console.error('Error fetching logistics vendors:', error);
      toast.error('Failed to load vendors');
      setVendors([]);
    }
  };

  const fetchProjects = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId') || 'default';
      const res = await api.get('/projects', { tenantId });
      const data = res?.data ?? res;
      console.log('Projects API response:', data);

      const projectsData = Array.isArray(data) ? data : (data?.data || []);
      console.log('Parsed projects:', projectsData);

      // If API returns empty data, use mock data for testing
      if (projectsData.length === 0) {
        console.log('API returned empty projects, using mock data');
        const mockProjects = [
          { id: 'P0134', projectId: 'P0134', customerName: 'Pintu Sharma', name: 'Pune Mumbai' },
          { id: 'P7244', projectId: 'P7244', customerName: 'Srikant Mehta', name: 'ahmedabad' },
          { id: 'P0327', projectId: 'P0327', customerName: 'Karan Johr', name: 'Vesu Surat' },
          { id: 'P5802', projectId: 'P5802', customerName: 'Manoj Patel', name: 'Station Surat' },
          { id: 'P0090', projectId: 'P0090', customerName: 'Deepika Shah', name: 'Shan Motors Vadodara' },
          { id: 'P0877', projectId: 'P0877', customerName: 'Harish Mehta', name: 'Anand Dairy' },
          { id: 'P0096', projectId: 'P0096', customerName: 'Nilesh Parakh', name: 'Morbi Ceramic Belt' },
          { id: 'P0085', projectId: 'P0085', customerName: 'Meena Patel', name: 'Morbi Factory' },
          { id: 'P0084', projectId: 'P0084', customerName: 'Dinesh Trivedi', name: 'Nadiad Plant' },
          { id: 'P0082', projectId: 'P0082', customerName: 'Suresh Bhatt', name: 'Vapi GIDC' },
          { id: 'P0081', projectId: 'P0081', customerName: 'Ramesh Joshi', name: 'GIDC Ahmedabad' },
        ];
        setProjects(mockProjects);
      } else {
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Use mock data as fallback when API fails
      const mockProjects = [
        { id: 'P0134', projectId: 'P0134', customerName: 'Pintu Sharma', name: 'Pune Mumbai' },
        { id: 'P7244', projectId: 'P7244', customerName: 'Srikant Mehta', name: 'ahmedabad' },
        { id: 'P0327', projectId: 'P0327', customerName: 'Karan Johr', name: 'Vesu Surat' },
        { id: 'P5802', projectId: 'P5802', customerName: 'Manoj Patel', name: 'Station Surat' },
        { id: 'P0090', projectId: 'P0090', customerName: 'Deepika Shah', name: 'Shan Motors Vadodara' },
        { id: 'P0877', projectId: 'P0877', customerName: 'Harish Mehta', name: 'Anand Dairy' },
        { id: 'P0096', projectId: 'P0096', customerName: 'Nilesh Parakh', name: 'Morbi Ceramic Belt' },
        { id: 'P0085', projectId: 'P0085', customerName: 'Meena Patel', name: 'Morbi Factory' },
        { id: 'P0084', projectId: 'P0084', customerName: 'Dinesh Trivedi', name: 'Nadiad Plant' },
        { id: 'P0082', projectId: 'P0082', customerName: 'Suresh Bhatt', name: 'Vapi GIDC' },
        { id: 'P0081', projectId: 'P0081', customerName: 'Ramesh Joshi', name: 'GIDC Ahmedabad' },
      ];
      console.log('Using mock projects:', mockProjects);
      setProjects(mockProjects);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [posRes, vendorsRes] = await Promise.all([
        api.get('/procurement/purchase-orders'),
        api.get('/procurement/vendors'),
      ]);
      // Handle API response - could be direct array or wrapped object
      let posData = [];

      if (Array.isArray(posRes.data)) {
        posData = posRes.data;
      } else if (posRes.data && typeof posRes.data === 'object') {
        posData = posRes.data.data || [];
      }

      setPos(posData);
    } catch (error) {
      console.error('Error fetching procurement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePOStageChange = async (id, newStatus) => {
    try {
      await api.patch(`/procurement/purchase-orders/${id}/status`, { status: newStatus });
      setPos(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (error) {
      console.error('Error updating PO status:', error);
    }
  };

  const handleCreateVendor = async () => {
    try {
      const res = await api.post('/procurement/vendors', newVendor);
      await fetchData();
      setShowVendor(false);
      setNewVendor({ name: '', category: '', city: '', contact: '', phone: '', email: '' });
    } catch (error) {
      console.error('Error creating vendor:', error);
    }
  };

  const handleCreatePO = async () => {
    try {
      console.log('Creating PO with data:', newPO);
      if (!newPO.vendorId) {
        toast.error('Please select a vendor');
        return;
      }
      if (!newPO.expectedDate) {
        toast.error('Please select an expected delivery date');
        return;
      }
      // Inventory fields validation
      if (!newPO.categoryId) {
        toast.error('Please select a category');
        return;
      }
      if (!newPO.itemId) {
        toast.error('Please select an item');
        return;
      }
      if (!newPO.unit) {
        toast.error('Please select a unit');
        return;
      }
      if (!newPO.requiredQuantity || Number(newPO.requiredQuantity) <= 0) {
        toast.error('Please enter a valid required quantity (must be greater than 0)');
        return;
      }
      
      console.log('[PROCUREMENT] Creating PO with newPO state:', newPO);
      console.log('[PROCUREMENT] Inventory fields check:', {
        categoryId: newPO.categoryId,
        itemId: newPO.itemId,
        unit: newPO.unit,
        requiredQuantity: newPO.requiredQuantity
      });
      
      const payload = {
        ...newPO,
        totalAmount: Number(newPO.totalAmount),
        requiredQuantity: Number(newPO.requiredQuantity),
      };
      console.log('[PROCUREMENT] Final payload:', JSON.stringify(payload, null, 2));
      const res = await api.post('/procurement/purchase-orders', payload);
      console.log('Create PO response:', res);
      // Refetch all data to ensure UI is in sync with backend
      await fetchData();
      setShowPO(false);
      setNewPO({ 
        vendorId: '', 
        items: '', 
        totalAmount: '', 
        expectedDate: '', 
        relatedProjectId: '',
        categoryId: '',
        categoryName: '',
        itemId: '',
        itemName: '',
        unit: '',
        requiredQuantity: ''
      });
      toast.success('Purchase Order created successfully');
      logCreate('purchase_order', res.data?.data?.id);
    } catch (error) {
      console.error('Error creating PO:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create Purchase Order';
      toast.error(errorMsg);
    }
  };

  // Helper function to get project display name - prioritizes customer names
  const getProjectDisplayName = (project) => {
    if (!project) return 'Unknown Customer';

    // Debug: log the full project object
    console.log('Project object:', JSON.stringify(project, null, 2));

    // List of fields to check for customer name (in priority order)
    const customerFields = ['customer', 'customerName', 'clientName', 'client', 'customerEmail', 'email'];

    // Check each field
    for (const field of customerFields) {
      const value = project[field];
      if (value && typeof value === 'string') {
        const clean = value.trim();
        // Skip empty or placeholder values
        if (clean &&
          clean.length > 0 &&
          !clean.toLowerCase().includes('project name') &&
          !clean.toLowerCase().includes('enter') &&
          !clean.toLowerCase().includes('type here') &&
          !clean.toLowerCase().includes('customer') &&
          clean !== '*' &&
          clean !== '-') {
          console.log(`Found customer name in field "${field}": ${clean}`);
          return clean;
        }
      }
    }

    // Check name field as fallback
    if (project.name && typeof project.name === 'string') {
      const cleanName = project.name.trim();
      if (cleanName &&
        !cleanName.toLowerCase().includes('project name') &&
        !cleanName.toLowerCase().includes('enter') &&
        !cleanName.includes('*')) {
        return cleanName;
      }
    }

    // Check title field
    if (project.title && typeof project.title === 'string' && project.title.trim()) {
      return project.title.trim();
    }

    // Last resort - show project ID
    return `Project ${project.id || project._id || 'Unknown'}`;
  };

  const filteredPOs = useMemo(() =>
    pos.filter(po => {
      if (!po) return false;
      
      // Handle special filter types from card clicks
      if (poFilter === 'pending') {
        return ['Draft', 'Ordered'].includes(po?.status);
      }
      if (poFilter === 'active') {
        return po?.status !== 'Delivered' && po?.status !== 'Cancelled';
      }
      
      // Default filtering by status and search
      const statusMatch = poStatus === 'All' || po?.status === poStatus;
      const searchMatch = po?.vendorName?.toLowerCase().includes(poSearch.toLowerCase());
      return statusMatch && searchMatch;
    }), [poSearch, poStatus, poFilter, pos]);

  const paginatedPOs = filteredPOs.slice((poPage - 1) * poPageSize, poPage * poPageSize);

  // Handle KPI card click to filter table data
  const handleCardClick = (filterType) => {
    // Switch to table view
    setPoView('table');
    setPoPage(1);
    setPoFilter(filterType);
    
    // Apply filter based on card type
    switch (filterType) {
      case 'pending':
        setPoStatus('All');
        setPoSearch('');
        break;
      case 'active':
        setPoStatus('All');
        setPoSearch('');
        break;
      case 'delivered':
        setPoStatus('Delivered');
        setPoSearch('');
        break;
      case 'inTransit':
        setPoStatus('In Transit');
        setPoSearch('');
        break;
      case 'totalSpend':
        setPoStatus('All');
        setPoSearch('');
        break;
      default:
        break;
    }
    
    // Scroll to table view after a short delay to allow render
    setTimeout(() => {
      const tableSection = document.getElementById('po-table-section');
      if (tableSection) {
        tableSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };
  const pendingPOs = pos.filter(p => p && ['Draft', 'Ordered'].includes(p?.status)).length;
  const activePOs = pos.filter(p => p && p?.status !== 'Delivered' && p?.status !== 'Cancelled').length;
  const totalSpend = pos.reduce((a, p) => a + (Number(p?.totalAmount) || 0), 0);
  const inTransit = pos.filter(p => p && p?.status === 'In Transit').length;
  const delivered = pos.filter(p => p && p?.status === 'Delivered').length;

  const PO_ACTIONS = [
    { label: 'View PO', icon: Package, onClick: row => setSelectedPO(row) },
    ...(can('procurement', 'edit') ? [{ label: 'Mark Delivered', icon: CheckCircle, onClick: (row) => handlePOStageChange(row.id, 'Delivered') }] : []),
    { label: 'Track Shipment', icon: Truck, onClick: () => { } },
    ...(can('procurement', 'delete') ? [{ label: 'Delete', icon: Trash2, onClick: (row) => handleDeletePO(row), variant: 'danger' }] : []),
  ];

  if (loading) {
    return <div className="animate-fade-in space-y-5"><p className="text-xs text-[var(--text-muted)]">Loading...</p></div>;
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="heading-page">Procurement</h1>
        </div>
        <div className="flex gap-2">
          <div className="view-toggle-pill mr-2">
            <button onClick={() => setPoView('kanban')} className={`view-toggle-btn ${poView === 'kanban' ? 'active' : ''}`} title="Kanban View"><LayoutGrid size={13} /></button>
            <button onClick={() => setPoView('table')} className={`view-toggle-btn ${poView === 'table' ? 'active' : ''}`} title="Table View"><List size={13} /></button>
            <button onClick={() => setPoView('visualization')} className={`view-toggle-btn ${poView === 'visualization' ? 'active' : ''}`} title="Visualization"><BarChart3 size={13} /></button>
          </div>
          {can('procurement', 'create') && (
            <Button onClick={() => setShowPO(true)}><Plus size={13} /> Create PO</Button>
          )}
          {poView === 'kanban' && (
            <button 
              onClick={() => setHidePOCards(!hidePOCards)}
              className="text-xs px-3 py-1.5 rounded-md bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-base)] transition-colors"
            >
              {hidePOCards ? 'Show Cards' : 'Hide Cards'}
            </button>
          )}
        </div>
      </div>
      {/* Procurement KPI Cards with Descriptive Label */}
      {!hidePOCards && (
        <div className="mb-2">
          <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
            <ShoppingCart size={12} className="text-[var(--accent-light)]" />
            <span>Procurement Overview - Purchase orders and spending tracking</span>
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div onClick={() => handleCardClick('pending')} className="cursor-pointer transition-transform hover:scale-105">
              <KPICard title="Total Pending Approvals" value={pendingPOs} icon={ShoppingCart} sub="Draft & ordered POs awaiting approval" variant="blue" />
            </div>
            <div onClick={() => handleCardClick('active')} className="cursor-pointer transition-transform hover:scale-105">
              <KPICard title="Total Active POs" value={activePOs} icon={Package} sub="All active purchase orders" variant="emerald" />
            </div>
            <div onClick={() => handleCardClick('delivered')} className="cursor-pointer transition-transform hover:scale-105">
              <KPICard title="Total POs Delivered" value={delivered} icon={CheckCircle} sub="Completed deliveries" variant="purple" />
            </div>
            <div onClick={() => handleCardClick('inTransit')} className="cursor-pointer transition-transform hover:scale-105">
              <KPICard title="Total POs In Transit" value={inTransit} icon={Truck} sub="On the way" variant="amber" />
            </div>
            <div onClick={() => handleCardClick('totalSpend')} className="cursor-pointer transition-transform hover:scale-105">
              <KPICard title="Total Spend" value={fmtFull(totalSpend)} icon={Package} sub="Total PO value" variant="cyan" />
            </div>
          </div>
        </div>
      )}

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">Procurement:</span>{' '}
          Manage purchase orders, track vendor deliveries, and monitor spending in real-time.
        </p>
      </div>

      <Tabs defaultValue="pos">
        <TabsList>
          <TabsTrigger value="pos">Purchase Orders ({pos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pos">
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
                {PO_STATUS_FILTERS.map(s => (
                  <button key={s} onClick={() => { setPoStatus(s); setPoFilter(null); setPoPage(1); }}
                    className={`filter-chip ${poStatus === s ? 'filter-chip-active' : ''}`}>{s}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input placeholder="Search POs…" value={poSearch}
                  onChange={e => { setPoSearch(e.target.value); setPoPage(1); }} className="h-8 text-xs w-44" />
              </div>
            </div>

            {poView === 'visualization' ? (
              <>
                <div className="flex items-center gap-3 mb-3 p-3 glass-card rounded-lg">
                  <span className="text-xs text-[var(--text-muted)]">Filter by:</span>
                  <Select 
                    value={vizMonth} 
                    onChange={e => setVizMonth(e.target.value === 'All' ? 'All' : parseInt(e.target.value))}
                    className="h-8 text-xs w-32"
                  >
                    {MONTHS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </Select>
                  <Select 
                    value={vizYear} 
                    onChange={e => setVizYear(parseInt(e.target.value))}
                    className="h-8 text-xs w-24"
                  >
                    {[currentYear, currentYear - 1, currentYear - 2].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Select>
                  {vizMonth !== 'All' && (
                    <button 
                      onClick={() => { setVizMonth('All'); setVizYear(currentYear); }}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-light)] underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <POVisualizationView pos={pos} filterMonth={vizMonth} filterYear={vizYear} />
              </>
            ) : poView === 'kanban' ? (
              <>
                <p className="text-xs text-[var(--text-muted)]">Drag POs between columns to update their status</p>
                <POKanbanBoard pos={filteredPOs} onStageChange={handlePOStageChange} onCardClick={setSelectedPO} />
              </>
            ) : (
              <div id="po-table-section">
                <DataTable columns={PO_COLUMNS} data={paginatedPOs.map(po => ({ 
                  ...po, 
                  _onVendorClick: (vendorName) => {
                    const vendor = vendors.find(v => v.name === vendorName);
                    if (vendor) {
                      setSelectedVendor(vendor);
                    } else {
                      alert('Vendor not found in system');
                    }
                  }
                }))} rowActions={PO_ACTIONS}
                  pagination={{ page: poPage, pageSize: poPageSize, total: filteredPOs.length, onChange: setPoPage, onPageSizeChange: setPoPageSize }}
                  emptyMessage="No purchase orders found." />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create PO Modal */}
      <Modal open={showPO} onClose={() => setShowPO(false)} title="Create Purchase Order"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowPO(false)}>Cancel</Button>
          <Button onClick={handleCreatePO}><Plus size={13} /> Create PO</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Vendor *">
            <Select value={newPO.vendorId} onChange={e => {
              console.log('Selected vendor:', e.target.value);
              setNewPO({ ...newPO, vendorId: e.target.value });
            }}>
              <option value="">{vendors.length === 0 ? 'No vendors available - Add vendors in Logistics tab' : 'Select a vendor'}</option>
              {vendors.map(v => {
                const vendorId = v._id || v.id;
                return (
                  <option key={vendorId} value={vendorId}>{v.name}</option>
                );
              })}
            </Select>
            {vendors.length === 0 && (
              <p className="text-xs text-red-400 mt-1">Please add vendors in Logistics → Vendors tab first</p>
            )}
          </FormField>
          <FormField label="Items Description">
            <Textarea value={newPO.items} onChange={e => setNewPO({ ...newPO, items: e.target.value })} placeholder="e.g. 200 x 400W Mono PERC Panels" rows={2} />
          </FormField>

          {/* Inventory Fields Section */}
          <div className="pt-3 border-t border-[var(--border-base)]">
            <p className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1">
              Inventory Details
              <span className="text-[10px] text-red-500">*</span>
            </p>
            {inventoryLoading && (
              <p className="text-xs text-[var(--text-muted)] mb-2">Loading inventory data...</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category *">
                <Select 
                  value={newPO.categoryId} 
                  onChange={e => {
                    const selectedCat = inventoryCategories.find(c => c.id === e.target.value);
                    setNewPO({ 
                      ...newPO, 
                      categoryId: e.target.value,
                      categoryName: selectedCat?.name || ''
                    });
                  }}
                >
                  <option value="">{inventoryCategories.length === 0 ? 'No categories' : 'Select Category'}</option>
                  {inventoryCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Select>
                {inventoryCategories.length === 0 && !inventoryLoading && (
                  <p className="text-[10px] text-amber-500 mt-1">No categories found in inventory</p>
                )}
              </FormField>
              <FormField label="Item *">
                <Select 
                  value={newPO.itemId} 
                  onChange={e => {
                    const selectedItem = inventoryItems.find(item => item.id === e.target.value);
                    console.log('[PROCUREMENT] Selected item:', selectedItem);
                    setNewPO({ 
                      ...newPO, 
                      itemId: e.target.value,
                      itemName: selectedItem?.name || '',
                      unit: selectedItem?.unit || newPO.unit
                    });
                  }}
                >
                  <option value="">{inventoryItems.length === 0 ? 'No items available' : 'Select Item'}</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </Select>
                {inventoryItems.length === 0 && !inventoryLoading && (
                  <p className="text-[10px] text-amber-500 mt-1">No items found in inventory</p>
                )}
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <FormField label="Unit *">
                <Select 
                  value={newPO.unit} 
                  onChange={e => setNewPO({ ...newPO, unit: e.target.value })}
                >
                  <option value="">{inventoryUnits.length === 0 ? 'No units' : 'Select Unit'}</option>
                  {inventoryUnits.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </Select>
                {inventoryUnits.length === 0 && !inventoryLoading && (
                  <p className="text-[10px] text-amber-500 mt-1">No units found in inventory</p>
                )}
              </FormField>
              <FormField label="Required Quantity *">
                <Input 
                  type="number" 
                  value={newPO.requiredQuantity} 
                  onChange={e => setNewPO({ ...newPO, requiredQuantity: e.target.value })} 
                  placeholder="e.g., 100"
                  min="1"
                />
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Total Amount (₹)">
              <Input type="number" value={newPO.totalAmount} onChange={e => setNewPO({ ...newPO, totalAmount: e.target.value })} placeholder="2900000" />
            </FormField>
            <FormField label="Expected Delivery">
              <Input type="date" value={newPO.expectedDate} onChange={e => setNewPO({ ...newPO, expectedDate: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Related Project">
            <div className="relative" ref={projectDropdownRef}>
              {/* Selected Project Display / Search Input */}
              <div
                onClick={() => setShowProjectDropdown(true)}
                className="w-full h-9 px-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-primary)] text-sm cursor-pointer flex items-center justify-between hover:border-[var(--primary)] transition-colors"
              >
                {newPO.relatedProjectId ? (
                  <span className="truncate flex items-center gap-2">
                    {(() => {
                      const project = projects.find(p => (p.id || p._id) === newPO.relatedProjectId);
                      const customerName = getProjectDisplayName(project);
                      return (
                        <>
                          <span className="font-medium">{customerName}</span>
                        </>
                      );
                    })()}
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)]">Select a Project</span>
                )}
                <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Dropdown with Search */}
              {showProjectDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg shadow-xl max-h-64 overflow-hidden">
                  {/* Search Input */}
                  <div className="p-2 border-b border-[var(--border-base)]">
                    <div className="relative">
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={e => setProjectSearch(e.target.value)}
                        className="w-full h-8 pl-9 pr-3 rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Filtered Projects List */}
                  <div className="overflow-y-auto max-h-48">
                    {projects.filter(p => {
                      const searchTerm = projectSearch.toLowerCase();
                      const projectId = (p.id || p._id || '').toLowerCase();
                      const customer = (p.customer || p.customerName || p.name || '').toLowerCase();
                      return projectId.includes(searchTerm) || customer.includes(searchTerm);
                    }).length === 0 ? (
                      <div className="p-3 text-sm text-[var(--text-muted)] text-center">
                        {projects.length === 0 ? 'No projects available' : 'No matching projects'}
                      </div>
                    ) : (
                      projects.filter(p => {
                        const searchTerm = projectSearch.toLowerCase();
                        const projectId = (p.id || p._id || '').toLowerCase();
                        const customer = (p.customer || p.customerName || p.name || '').toLowerCase();
                        return projectId.includes(searchTerm) || customer.includes(searchTerm);
                      }).map(p => (
                        <div
                          key={p.id || p._id}
                          onClick={() => {
                            setNewPO({ ...newPO, relatedProjectId: p.id || p._id });
                            setShowProjectDropdown(false);
                            setProjectSearch('');
                          }}
                          className={`px-3 py-2 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-base)] last:border-0 ${newPO.relatedProjectId === (p.id || p._id) ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30' : ''
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--text-primary)] truncate">
                              {getProjectDisplayName(p)}
                            </span>
                          </div>
                          {p.name && (
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">
                              {p.name}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {projects.length === 0 && (
              <p className="text-xs text-red-400 mt-1">No projects available. Please create projects first.</p>
            )}
          </FormField>
        </div>
      </Modal>

      {/* PO Detail Modal */}
      {selectedPO && (
        <Modal
          open={!!selectedPO}
          onClose={() => { setSelectedPO(null); setIsEditingPO(false); setEditedPO(null); }}
          title={isEditingPO ? `Edit PO — ${selectedPO.id}` : `PO — ${selectedPO.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              {isEditingPO ? (
                <>
                  <Button variant="ghost" onClick={cancelEditingPO}>Cancel</Button>
                  <Button onClick={handleUpdatePO}><CheckCircle size={13} /> Save Changes</Button>
                </>
              ) : (
                <>                  
                  <Button variant="ghost" onClick={() => setSelectedPO(null)}>Close</Button>
                  {can('procurement', 'delete') && (
                    <Button variant="danger" onClick={() => handleDeletePO(selectedPO)}><Trash2 size={13} /> Delete</Button>
                  )}
                  {can('procurement', 'edit') && (
                    <Button onClick={startEditingPO}><Edit size={13} /> Edit</Button>
                  )}
                </>
              )}
            </div>
          }>
          {isEditingPO && editedPO ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Vendor Name">
                  <Input value={editedPO.vendorName} onChange={e => setEditedPO({ ...editedPO, vendorName: e.target.value })} />
                </FormField>
                <FormField label="Status">
                  <Select value={editedPO.status} onChange={e => setEditedPO({ ...editedPO, status: e.target.value })}>
                    <option value="Draft">Draft</option>
                    <option value="Ordered">Ordered</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </Select>
                </FormField>
              </div>
              <FormField label="Items Description">
                <Textarea value={editedPO.items} onChange={e => setEditedPO({ ...editedPO, items: e.target.value })} rows={2} />
              </FormField>
              {/* Inventory Fields in Edit Mode */}
              <div className="pt-3 border-t border-[var(--border-base)]">
                <p className="text-xs text-[var(--text-muted)] mb-3">Inventory Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Category">
                    <Select value={editedPO.categoryId || ''} onChange={e => {
                      const selectedCat = inventoryCategories.find(c => c.id === e.target.value);
                      setEditedPO({ 
                        ...editedPO, 
                        categoryId: e.target.value,
                        categoryName: selectedCat?.name || ''
                      });
                    }}>
                      <option value="">{inventoryCategories.length === 0 ? 'No categories' : 'Select Category'}</option>
                      {inventoryCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Item">
                    <Select value={editedPO.itemId || ''} onChange={e => {
                      const selectedItem = inventoryItems.find(item => item.id === e.target.value);
                      setEditedPO({ 
                        ...editedPO, 
                        itemId: e.target.value,
                        itemName: selectedItem?.name || '',
                        unit: selectedItem?.unit || editedPO.unit
                      });
                    }}>
                      <option value="">{inventoryItems.length === 0 ? 'No items' : 'Select Item'}</option>
                      {inventoryItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </Select>
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <FormField label="Unit">
                    <Select value={editedPO.unit || ''} onChange={e => setEditedPO({ ...editedPO, unit: e.target.value })}>
                      <option value="">{inventoryUnits.length === 0 ? 'No units' : 'Select Unit'}</option>
                      {inventoryUnits.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Required Quantity">
                    <Input type="number" value={editedPO.requiredQuantity || ''} onChange={e => setEditedPO({ ...editedPO, requiredQuantity: e.target.value })} placeholder="Quantity" />
                  </FormField>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Total Amount (₹)">
                  <Input type="number" value={editedPO.totalAmount} onChange={e => setEditedPO({ ...editedPO, totalAmount: e.target.value })} />
                </FormField>
                <FormField label="Ordered Date">
                  <Input type="date" value={editedPO.orderedDate} onChange={e => setEditedPO({ ...editedPO, orderedDate: e.target.value })} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Expected Date">
                  <Input type="date" value={editedPO.expectedDate || ''} onChange={e => setEditedPO({ ...editedPO, expectedDate: e.target.value })} />
                </FormField>
                <FormField label="Delivered Date">
                  <Input type="date" value={editedPO.deliveredDate || ''} onChange={e => setEditedPO({ ...editedPO, deliveredDate: e.target.value })} />
                </FormField>
              </div>
              <div className="w-full">
                <FormField label="Related Project">
                  <div className="relative" ref={projectDropdownRef}>
                    {/* Selected Project Display */}
                    <div
                      onClick={() => setShowProjectDropdown(true)}
                      className="w-full h-9 px-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-primary)] text-sm cursor-pointer flex items-center justify-between hover:border-[var(--primary)] transition-colors"
                    >
                    {editedPO?.relatedProjectId ? (
                      <span className="truncate flex items-center gap-2">
                        {(() => {
                          const project = projects.find(p => (p.id || p._id) === editedPO.relatedProjectId);
                          const customerName = getProjectDisplayName(project);
                          return (
                            <>
                              <span className="font-medium">{customerName}</span>
                            </>
                          );
                        })()}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">Select a Project</span>
                    )}
                    <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Dropdown with Search */}
                  {showProjectDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg shadow-xl max-h-64 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-2 border-b border-[var(--border-base)]">
                        <div className="relative">
                          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search projects..."
                            value={projectSearch}
                            onChange={e => setProjectSearch(e.target.value)}
                            className="w-full h-8 pl-9 pr-3 rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Filtered Projects List */}
                      <div className="overflow-y-auto max-h-48">
                        {projects.filter(p => {
                          const searchTerm = projectSearch.toLowerCase();
                          const projectId = (p.id || p._id || '').toLowerCase();
                          const customer = (p.customer || p.customerName || p.name || '').toLowerCase();
                          return projectId.includes(searchTerm) || customer.includes(searchTerm);
                        }).length === 0 ? (
                          <div className="p-3 text-sm text-[var(--text-muted)] text-center">
                            {projects.length === 0 ? 'No projects available' : 'No matching projects'}
                          </div>
                        ) : (
                          projects.filter(p => {
                            const searchTerm = projectSearch.toLowerCase();
                            const projectId = (p.id || p._id || '').toLowerCase();
                            const customer = (p.customer || p.customerName || p.name || '').toLowerCase();
                            return projectId.includes(searchTerm) || customer.includes(searchTerm);
                          }).map(p => (
                            <div
                              key={p.id || p._id}
                              onClick={() => {
                                setEditedPO({ ...editedPO, relatedProjectId: p.id || p._id });
                                setShowProjectDropdown(false);
                                setProjectSearch('');
                              }}
                              className={`px-3 py-2 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-base)] last:border-0 ${editedPO?.relatedProjectId === (p.id || p._id) ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30' : ''
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-[var(--text-primary)] truncate">
                                  {getProjectDisplayName(p)}
                                </span>
                              </div>
                              {p.name && (
                                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                  {p.name}
                                </div>
                              )}
                            </div>
                          )))}
                        </div>
                      </div>
                    )}
                  </div>
                </FormField>
              </div>
            </div>
          ) : (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[['PO Number', selectedPO.id], ['Vendor', selectedPO.vendorName], ['Items Description', selectedPO.items],
                ['Ordered Date', selectedPO.orderedDate], ['Expected Date', selectedPO.expectedDate],
                ['Delivered Date', selectedPO.deliveredDate ?? '—'],
                ['Category', selectedPO.categoryName || '—'],
                ['Item Name', selectedPO.itemName || '—'],
                ['Unit', selectedPO.unit || '—'],
                ['Required Quantity', selectedPO.requiredQuantity || '—'],
                ['Related Project', (() => {
                  const project = projects.find(p => (p.id || p._id) === selectedPO.relatedProjectId);
                  if (!project) return selectedPO.relatedProjectId || '—';
                  const customerName = getProjectDisplayName(project);
                  return (
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{customerName}</span>
                    </span>
                  );
                })()],
              ].map(([k, v]) => (
                <div key={k} className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                  <div className="font-semibold text-[var(--text-primary)]">{v}</div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <Modal open={!!selectedVendor} onClose={() => setSelectedVendor(null)} title={`Vendor — ${selectedVendor.name}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSelectedVendor(null)}>Close</Button>
            <Button variant="secondary" onClick={() => handleCallVendor(selectedVendor)}><Phone size={13} /> Call</Button>
            <Button onClick={() => handleEmailVendor(selectedVendor)}><Mail size={13} /> Email</Button>
          </div>}>
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline ({pos.filter(p => p && (p?.vendorId?._id === selectedVendor?._id || p?.vendorName === selectedVendor?.name)).length})</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                {[
                  ['Vendor ID', selectedVendor.id], ['Company', selectedVendor.name], ['Category', selectedVendor.category],
                  ['Contact Person', selectedVendor.contact], ['Phone', selectedVendor.phone], ['Email', selectedVendor.email],
                  ['City', selectedVendor.city], ['Total Orders', selectedVendor.totalOrders],
                ].map(([k, v]) => (
                  <div key={k} className="glass-card p-2">
                    <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                    <div className="font-semibold text-[var(--text-primary)]">{v}</div>
                  </div>
                ))}
                <div className="glass-card p-2 col-span-2">
                  <div className="text-[var(--text-muted)] mb-1">Rating</div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className={i < selectedVendor.rating ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--border-base)]'} />
                    ))}
                    <span className="text-xs text-[var(--text-muted)] ml-1">{selectedVendor.rating}/5</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <div className="space-y-2 mt-3">
                {pos.filter(p => p && (p?.vendorId?._id === selectedVendor?._id || p?.vendorName === selectedVendor?.name))
                  .sort((a, b) => new Date(b?.orderedDate || 0) - new Date(a?.orderedDate || 0))
                  .map(po => (
                    <div key={po?.id || Math.random()} className="glass-card p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{po?.id}</div>
                        <div className="text-xs text-[var(--text-muted)]">{po?.items}</div>
                        <div className="text-xs mt-1">{fmt(po?.totalAmount)} • {po?.orderedDate}</div>
                      </div>
                      <StatusBadge domain="purchaseOrder" value={po?.status} />
                    </div>
                  ))}
                {pos.filter(p => p && (p?.vendorId?._id === selectedVendor?._id || p?.vendorName === selectedVendor?.name)).length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">No purchase orders found for this vendor.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <div className="space-y-2 mt-3">
                <div className="glass-card p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--green)]"></div>
                    <div className="text-xs font-semibold">Vendor Created</div>
                    <div className="text-xs text-[var(--text-muted)] ml-auto">{new Date(selectedVendor?.createdAt || Date.now()).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 ml-4">Vendor profile added to system</div>
                </div>
                {pos.filter(p => p && (p?.vendorId?._id === selectedVendor?._id || p?.vendorName === selectedVendor?.name))
                  .map(po => (
                    <div key={`activity-${po?.id || Math.random()}`} className="glass-card p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div className="text-xs font-semibold">PO {po?.id} - {po?.status}</div>
                        <div className="text-xs text-[var(--text-muted)] ml-auto">{po?.orderedDate}</div>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1 ml-4">{po?.items} • {fmt(po?.totalAmount)}</div>
                    </div>
                  ))}
                <div className="glass-card p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <div className="text-xs font-semibold">Last Updated</div>
                    <div className="text-xs text-[var(--text-muted)] ml-auto">{new Date(selectedVendor?.updatedAt || Date.now()).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 ml-4">Profile information last modified</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Modal>
      )}
    </div>
  );
};


export default ProcurementPage;

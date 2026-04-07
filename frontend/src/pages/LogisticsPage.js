// Solar OS – EPC Edition — LogisticsPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Truck, Plus, MapPin, Package, CheckCircle, Clock, Zap, Navigation, LayoutGrid, List, Phone, Mail, Star, Edit, Building2, Store, Tag, MapPinned, BarChart3, PieChart, TrendingUp, Users, IndianRupee, Calendar, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Avatar } from '../components/ui/Avatar';
import DataTable from '../components/ui/DataTable';
import { APP_CONFIG } from '../config/app.config';
import { api } from '../lib/apiClient';
import { usePermissions } from '../hooks/usePermissions';
import CanAccess from '../components/CanAccess';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';
const TENANT_ID = 'solarcorp';

// Local status map only (no data)
const DISPATCH_STATUS_MAP = {
  Delivered: { label: 'Delivered', color: 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30' },
  'In Transit': { label: 'In Transit', color: 'bg-[var(--blue)]/15 text-[var(--blue)] border-[var(--blue)]/30' },
  Scheduled: { label: 'Scheduled', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]' },
  Cancelled: { label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const DispatchBadge = ({ value }) => {
  const meta = DISPATCH_STATUS_MAP[value] ?? { label: value, color: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
};

// ── Kanban stage defs ─────────────────────────────────────────────────────────
const DISPATCH_STAGES = [
  { id: 'Scheduled', label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'In Transit', label: 'In Transit', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { id: 'Delivered', label: 'Delivered', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'Cancelled', label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

const COLUMNS = [
  { key: 'id', header: 'Dispatch ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'projectId', header: 'Project', render: v => <span className="text-xs font-mono text-[var(--text-secondary)]">{v}</span> },
  { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'items', header: 'Items', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'from', header: 'From', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'to', header: 'To', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'driver', header: 'Driver', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'vehicle', header: 'Vehicle', render: v => <span className="text-xs font-mono text-[var(--text-muted)]">{v}</span> },
  { key: 'dispatchDate', header: 'Dispatch Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'cost', header: 'Freight Cost', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">₹{v.toLocaleString('en-IN')}</span> },
  { key: 'status', header: 'Status', render: v => <DispatchBadge value={v} /> },
];

const VENDOR_COLUMNS = [
  { key: 'id', header: 'Vendor ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  {
    key: 'name', header: 'Vendor Name', sortable: true, render: (v, row) => (
      <div className="flex items-center gap-2 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => row._onVendorClick && row._onVendorClick(row)}>
        <Avatar name={v} size="xs" />
        <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span>
      </div>
    )
  },
  { key: 'category', header: 'Category', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'contact', header: 'Contact', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'phone', header: 'Phone', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'email', header: 'Email', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'city', header: 'City', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'totalOrders', header: 'Total Orders', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{v}</span> },
];

const STATUS_FILTERS = ['All', 'Scheduled', 'In Transit', 'Delivered', 'Cancelled'];

/* ── Dispatch Kanban Card ── */
const DispatchCard = ({ d, onDragStart, onClick }) => {
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{d.id}</span>
        <span className="text-[10px] font-mono text-[var(--text-secondary)]">{d.projectId}</span>
      </div>
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{d.customer}</p>
      <p className="text-[10px] text-[var(--text-muted)] mb-2 line-clamp-2">{d.items}</p>
      <div className="flex items-center gap-1 text-[10px] text-[var(--blue)] mb-1">
        <MapPin size={9} /> {d.from} → {d.to}
      </div>
      <div className="flex items-center justify-between text-[10px] text-[var(--text-faint)]">
        <span className="flex items-center gap-1"><Truck size={9} />{d.driver}</span>
        <span>{d.dispatchDate}</span>
      </div>
      <div className="mt-1.5 text-[10px] font-bold text-[var(--text-secondary)]">
        ₹{d.cost.toLocaleString('en-IN')}
      </div>
    </div>
  );
};

/* ── Kanban Board ── */
const DispatchKanbanBoard = ({ dispatches, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {DISPATCH_STAGES.map(stage => {
          const cards = dispatches.filter(d => d.status === stage.id);
          const totalCost = cards.reduce((a, d) => a + d.cost, 0);
          return (
            <div key={stage.id}
              className={`flex flex-col w-64 rounded-xl border transition-colors h-[530px] ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}>
              <div className="flex items-center justify-between p-3 border-b border-[var(--border-base)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {totalCost > 0 && <span className="text-[10px] text-[var(--text-muted)]">₹{totalCost.toLocaleString('en-IN')}</span>}
                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-2 h-[430px] overflow-y-auto">
                {cards.map(d => (
                  <DispatchCard key={d.id} d={d}
                    onDragStart={() => { draggingId.current = d.id; }}
                    onClick={() => onCardClick(d)} />
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

// ── Vendor Category Stages ─────────────────────────────────────────────────
const VENDOR_CATEGORIES = [
  { id: 'Panel', label: 'Panel', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Inverter', label: 'Inverter', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'Structure', label: 'Structure', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'Cable', label: 'Cable', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { id: 'Transport', label: 'Transport', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { id: 'Other', label: 'Other', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
];

/* ── Vendor Kanban Card ── */
const VendorCard = ({ vendor, onClick, onEdit }) => {
  const categoryMeta = VENDOR_CATEGORIES.find(c => c.id === vendor.category) || VENDOR_CATEGORIES[5];
  return (
    <div className="glass-card p-3 cursor-pointer hover:border-[var(--primary)]/40 transition-all group">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{vendor.id}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(vendor); }}
            className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-all"
            title="Edit Vendor"
          >
            <Edit size={12} />
          </button>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: categoryMeta.bg, color: categoryMeta.color }}>
            {vendor.category}
          </span>
        </div>
      </div>
      <div onClick={() => onClick(vendor)}>
        <div className="flex items-center gap-2 mb-2">
          <Avatar name={vendor.name} size="sm" />
          <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">{vendor.name}</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mb-1">
          <MapPinned size={9} /> {vendor.city}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] mb-1">
          <Store size={9} /> {vendor.contact}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-base)]">
          <span className="text-[10px] text-[var(--text-muted)]">Orders: <span className="font-semibold text-[var(--text-primary)]">{vendor.totalOrders || 0}</span></span>
        </div>
      </div>
    </div>
  );
};

/* ── Vendor Kanban Board ── */
const VendorKanbanBoard = ({ vendors, categories, onCardClick, onEditVendor }) => {
  console.log('VendorKanbanBoard received vendors:', vendors?.length, vendors, 'categories:', categories);
  // Build dynamic category list with colors from static config
  const categoryConfig = categories.map(catName => {
    const staticConfig = VENDOR_CATEGORIES.find(c => c.id === catName) || VENDOR_CATEGORIES[VENDOR_CATEGORIES.length - 1];
    return { id: catName, label: catName, color: staticConfig.color, bg: staticConfig.bg };
  });
  
  return (
    <div className="overflow-x-auto pb-3">
      {/* Clear Label: Vendors by Category */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Store size={16} className="text-[var(--accent-light)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)]">Vendors organized by Category</span>
        <span className="text-xs text-[var(--text-muted)]">({vendors?.length || 0} total vendors)</span>
      </div>
      <div className="flex gap-3 min-w-max">
        {categoryConfig.map(category => {
          const cards = vendors.filter(v => v.category === category.id || (category.id === 'Other' && !categoryConfig.some(c => c.id === v.category)));
          return (
            <div key={category.id}
              className="flex flex-col w-64 rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)]">
              <div className="flex items-center justify-between p-3 border-b border-[var(--border-base)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: category.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{category.label}</span>
                  <span className="text-xs text-[var(--text-muted)]">({cards.length} vendors)</span>
                </div>
                <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: category.bg, color: category.color }}>{cards.length}</span>
              </div>
              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[160px]">
                {cards.map(vendor => (
                  <VendorCard key={vendor.id} vendor={vendor} onClick={onCardClick} onEdit={onEditVendor} />
                ))}
                {cards.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[11px] text-[var(--text-faint)]">No vendors</p>
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

/* ── Vendor Visualization Component ── */
const VendorVisualizationView = ({ vendors }) => {
  const [animateChart, setAnimateChart] = useState(false);

  useEffect(() => {
    setAnimateChart(false);
    setTimeout(() => setAnimateChart(true), 50);
  }, [vendors]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts = {};
    vendors.forEach(v => {
      const category = v?.category || 'Unknown';
      counts[category] = (counts[category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [vendors]);

  // City data
  const cityData = useMemo(() => {
    const cityCounts = {};
    vendors.forEach(v => {
      const city = v?.city || 'Unknown';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });
    return Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [vendors]);
  const maxCityCount = Math.max(...cityData.map(c => c[1]), 1);

  // Top vendors by orders
  const topVendors = useMemo(() => {
    return vendors
      .map(v => ({
        name: v?.name || v?.contact || 'Unknown',
        orders: v?.totalOrders || 0
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);
  }, [vendors]);
  const maxOrders = Math.max(...topVendors.map(v => v.orders), 1);

  // Category colors
  const categoryColors = {
    'Panel': '#f59e0b',      // amber-500
    'Inverter': '#06b6d4',  // cyan-500
    'Structure': '#10b981',  // emerald-500
    'Cable': '#8b5cf6',      // violet-500
    'Battery': '#ec4899',    // pink-500
    'Unknown': '#6b7280',    // gray-500
  };

  const categoryGradients = {
    'Panel': ['#fcd34d', '#f59e0b'],
    'Inverter': ['#67e8f9', '#06b6d4'],
    'Structure': ['#86efac', '#10b981'],
    'Cable': ['#a78bfa', '#8b5cf6'],
    'Battery': ['#f472b6', '#ec4899'],
    'Unknown': ['#9ca3af', '#6b7280'],
  };

  const total = vendors.length || 1;
  const totalOrders = vendors.reduce((a, v) => a + (v?.totalOrders || 0), 0);

  // Donut chart segments for categories
  const donutSegments = useMemo(() => {
    const segments = [];
    let currentOffset = 0;
    
    categoryCounts.forEach(([category, count]) => {
      const percentage = (count / total) * 100;
      const circumference = 2 * Math.PI * 40;
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const rotation = (currentOffset / 100) * 360;
      
      segments.push({
        category,
        count,
        percentage,
        strokeDasharray,
        rotation,
        color: categoryColors[category] || '#6b7280'
      });
      
      currentOffset += percentage;
    });
    
    return segments;
  }, [categoryCounts, total]);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{vendors.length}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Total Vendors</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{categoryCounts.find(([c]) => c === 'Panel')?.[1] || 0}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Panel Vendors</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-[var(--blue)]">{categoryCounts.find(([c]) => c === 'Inverter')?.[1] || 0}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Inverter Vendors</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-[var(--green)]">{totalOrders}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Total Orders</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Top Cities */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <MapPin size={14} className="text-indigo-400" />
            Top Cities
          </h4>
          <div className="space-y-2">
            {cityData.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">No city data available</p>
            ) : (
              cityData.map(([city, count]) => (
                <div key={city} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-primary)] font-medium w-24 truncate" title={city}>
                    {city.length > 15 ? city.substring(0, 15) + '...' : city}
                  </span>
                  <div className="flex-1 h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: animateChart ? `${(count / maxCityCount) * 100}%` : '0%',
                        background: `linear-gradient(90deg, ${categoryGradients['Panel'][0]} 0%, ${categoryGradients['Panel'][1]} 100%)`
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-amber-400 w-4 text-right">{count}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-[var(--border-base)] text-center">
            <span className="text-[10px] text-[var(--text-muted)]">Total Cities: </span>
            <span className="text-sm font-bold text-amber-400">{cityData.length}</span>
          </div>
        </div>

        {/* Card 2: Category Distribution Donut */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <PieChart size={14} className="text-violet-400" />
            Category Distribution
          </h4>
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--bg-elevated)"
                  strokeWidth="12"
                />
                {/* Segments */}
                {donutSegments.map((segment) => (
                  <circle
                    key={segment.category}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="12"
                    strokeDasharray={segment.strokeDasharray}
                    strokeLinecap="round"
                    style={{
                      transformOrigin: 'center',
                      transform: `rotate(${segment.rotation}deg)`,
                      transition: 'all 0.5s ease-out'
                    }}
                  />
                ))}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-[var(--text-primary)]">{vendors.length}</span>
                <span className="text-[9px] text-[var(--text-muted)]">Total</span>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {categoryCounts.filter(([, count]) => count > 0).map(([category, count]) => (
              <div key={category} className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--bg-elevated)]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[category] || '#6b7280' }} />
                <span className="text-[9px] text-[var(--text-muted)]">{category} ({count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Top Vendors by Orders */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-amber-400" />
            Top Vendors by Orders
          </h4>
          <div className="space-y-2">
            {topVendors.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">No vendor data available</p>
            ) : (
              topVendors.map((vendor) => (
                <div key={vendor.name} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-primary)] font-medium w-28 truncate" title={vendor.name}>
                    {vendor.name.length > 18 ? vendor.name.substring(0, 18) + '...' : vendor.name}
                  </span>
                  <div className="flex-1 h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: animateChart ? `${(vendor.orders / maxOrders) * 100}%` : '0%',
                        background: `linear-gradient(90deg, ${categoryGradients['Inverter'][0]} 0%, ${categoryGradients['Inverter'][1]} 100%)`
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--blue)] w-6 text-right">{vendor.orders}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-[var(--border-base)] flex justify-between items-center">
            <span className="text-[10px] text-[var(--text-muted)]">Total Orders</span>
            <span className="text-sm font-bold text-[var(--blue)]">{totalOrders}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Dispatch Visualization Component ── */
const DispatchVisualizationView = ({ dispatches }) => {
  const [animateChart, setAnimateChart] = useState(false);
  
  // Calendar view states for Monthly Dispatches
  const [showDispatchCalendar, setShowDispatchCalendar] = useState(false);
  const [dispatchCalendarMonth, setDispatchCalendarMonth] = useState(new Date().getMonth());
  const [dispatchCalendarYear, setDispatchCalendarYear] = useState(new Date().getFullYear());
  
  // Calendar view states for Monthly Freight
  const [showFreightCalendar, setShowFreightCalendar] = useState(false);
  const [freightCalendarMonth, setFreightCalendarMonth] = useState(new Date().getMonth());
  const [freightCalendarYear, setFreightCalendarYear] = useState(new Date().getFullYear());
  
  useEffect(() => {
    setAnimateChart(false);
    setTimeout(() => setAnimateChart(true), 50);
  }, [dispatches]);

  // Calculate status counts
  const statusCounts = {
    'Scheduled': dispatches.filter(d => d?.status === 'Scheduled').length,
    'In Transit': dispatches.filter(d => d?.status === 'In Transit').length,
    'Delivered': dispatches.filter(d => d?.status === 'Delivered').length,
  };

  const total = dispatches.length || 1;
  const totalFreight = dispatches.reduce((a, d) => a + (d?.cost || 0), 0);

  // Status colors
  const statusColors = {
    'Scheduled': '#f59e0b',    // amber-500
    'In Transit': '#06b6d4',   // cyan-500
    'Delivered': '#10b981',    // emerald-500
  };

  const statusGradients = {
    'Scheduled': ['#fcd34d', '#f59e0b'],
    'In Transit': ['#67e8f9', '#06b6d4'],
    'Delivered': ['#86efac', '#10b981'],
  };

  // Top routes (from -> to)
  const routeData = useMemo(() => {
    const routeCounts = {};
    dispatches.forEach(d => {
      const route = `${d?.from || 'Unknown'} → ${d?.to || 'Unknown'}`;
      routeCounts[route] = (routeCounts[route] || 0) + 1;
    });
    return Object.entries(routeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [dispatches]);
  const maxRouteCount = Math.max(...routeData.map(r => r[1]), 1);

  // Monthly dispatch data
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
      const count = dispatches.filter(d => {
        const date = d?.dispatchDate;
        if (!date) return false;
        const d_obj = new Date(date);
        return d_obj.getMonth() === m.monthIdx && d_obj.getFullYear() === m.fullYear;
      }).length;
      return { ...m, count };
    });
  }, [dispatches]);
  const maxMonthly = Math.max(...monthlyData.map(d => d.count), 1);

  // Monthly freight cost data
  const monthlyFreightData = useMemo(() => {
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
      const amount = dispatches
        .filter(d => {
          const date = d?.dispatchDate;
          if (!date) return false;
          const d_obj = new Date(date);
          return d_obj.getMonth() === m.monthIdx && d_obj.getFullYear() === m.fullYear;
        })
        .reduce((sum, d) => sum + (d?.cost || 0), 0);
      return { ...m, amount: amount / 1000 }; // Convert to thousands
    });
  }, [dispatches]);
  const maxFreight = Math.max(...monthlyFreightData.map(d => d.amount), 1);

  // Calendar data for dispatches
  const dispatchCalendarData = useMemo(() => {
    const daysInMonth = new Date(dispatchCalendarYear, dispatchCalendarMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(dispatchCalendarYear, dispatchCalendarMonth, 1).getDay();
    const days = [];
    
    // Empty cells for days before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, count: 0 });
    }
    
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const count = dispatches.filter(d => {
        const date = d?.dispatchDate;
        if (!date) return false;
        const d_obj = new Date(date);
        return d_obj.getDate() === day && 
               d_obj.getMonth() === dispatchCalendarMonth && 
               d_obj.getFullYear() === dispatchCalendarYear;
      }).length;
      days.push({ day, count });
    }
    
    return days;
  }, [dispatches, dispatchCalendarMonth, dispatchCalendarYear]);

  // Calendar data for freight
  const freightCalendarData = useMemo(() => {
    const daysInMonth = new Date(freightCalendarYear, freightCalendarMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(freightCalendarYear, freightCalendarMonth, 1).getDay();
    const days = [];
    
    // Empty cells for days before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, amount: 0 });
    }
    
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const amount = dispatches
        .filter(d => {
          const date = d?.dispatchDate;
          if (!date) return false;
          const d_obj = new Date(date);
          return d_obj.getDate() === day && 
                 d_obj.getMonth() === freightCalendarMonth && 
                 d_obj.getFullYear() === freightCalendarYear;
        })
        .reduce((sum, d) => sum + (d?.cost || 0), 0) / 1000;
      days.push({ day, amount });
    }
    
    return days;
  }, [dispatches, freightCalendarMonth, freightCalendarYear]);

  // Donut chart segments
  const donutSegments = useMemo(() => {
    const segments = [];
    let currentOffset = 0;
    const validStatuses = Object.entries(statusCounts).filter(([, count]) => count > 0);
    
    validStatuses.forEach(([status, count]) => {
      const percentage = (count / total) * 100;
      const circumference = 2 * Math.PI * 40;
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const rotation = (currentOffset / 100) * 360;
      
      segments.push({
        status,
        count,
        percentage,
        strokeDasharray,
        rotation,
        color: statusColors[status]
      });
      
      currentOffset += percentage;
    });
    
    return segments;
  }, [statusCounts, total]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{dispatches.length}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Total Dispatches</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{statusCounts['Scheduled']}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Scheduled</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-[var(--blue)]">{statusCounts['In Transit']}</div>
          <div className="text-[10px] text-[var(--text-muted)]">In Transit</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-[var(--green)]">{statusCounts['Delivered']}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Delivered</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Top Routes */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <MapPinned size={14} className="text-indigo-400" />
            Top Routes
          </h4>
          <div className="space-y-2">
            {routeData.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">No route data available</p>
            ) : (
              routeData.map(([route, count]) => (
                <div key={route} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-primary)] font-medium w-32 truncate" title={route}>
                    {route.length > 20 ? route.substring(0, 20) + '...' : route}
                  </span>
                  <div className="flex-1 h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: animateChart ? `${(count / maxRouteCount) * 100}%` : '0%',
                        background: `linear-gradient(90deg, ${statusGradients['In Transit'][0]} 0%, ${statusGradients['In Transit'][1]} 100%)`
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--blue)] w-4 text-right">{count}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-[var(--border-base)] text-center">
            <span className="text-[10px] text-[var(--text-muted)]">Total Routes: </span>
            <span className="text-sm font-bold text-[var(--blue)]">{routeData.length}</span>
          </div>
        </div>

        {/* Card 2: Status Distribution Donut */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <PieChart size={14} className="text-violet-400" />
            Status Distribution
          </h4>
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--bg-elevated)"
                  strokeWidth="12"
                />
                {/* Segments */}
                {donutSegments.map((segment, idx) => (
                  <circle
                    key={segment.status}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="12"
                    strokeDasharray={segment.strokeDasharray}
                    strokeLinecap="round"
                    style={{
                      transformOrigin: 'center',
                      transform: `rotate(${segment.rotation}deg)`,
                      transition: 'all 0.5s ease-out'
                    }}
                  />
                ))}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-[var(--text-primary)]">{dispatches.length}</span>
                <span className="text-[9px] text-[var(--text-muted)]">Total</span>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {Object.entries(statusCounts).filter(([, count]) => count > 0).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--bg-elevated)]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[status] }} />
                <span className="text-[9px] text-[var(--text-muted)]">{status} ({count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Monthly Dispatches with Calendar View */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp size={14} className="text-amber-400" />
              Monthly Dispatches
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDispatchCalendar(!showDispatchCalendar)}
                className={`p-1.5 rounded-md transition-colors ${showDispatchCalendar ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                title="Toggle Calendar View"
              >
                <Calendar size={12} />
              </button>
            </div>
          </div>
          
          {showDispatchCalendar ? (
            <>
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => {
                    if (dispatchCalendarMonth === 0) {
                      setDispatchCalendarMonth(11);
                      setDispatchCalendarYear(dispatchCalendarYear - 1);
                    } else {
                      setDispatchCalendarMonth(dispatchCalendarMonth - 1);
                    }
                  }}
                  className="p-1 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {monthNames[dispatchCalendarMonth]} {dispatchCalendarYear}
                </span>
                <button
                  onClick={() => {
                    if (dispatchCalendarMonth === 11) {
                      setDispatchCalendarMonth(0);
                      setDispatchCalendarYear(dispatchCalendarYear + 1);
                    } else {
                      setDispatchCalendarMonth(dispatchCalendarMonth + 1);
                    }
                  }}
                  className="p-1 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-[9px] text-[var(--text-muted)] py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {dispatchCalendarData.map((data, idx) => (
                  <div
                    key={idx}
                    className={`aspect-square flex flex-col items-center justify-center rounded-md text-[9px] ${
                      data.day 
                        ? data.count > 0 
                          ? 'bg-amber-500/20 text-amber-400 font-semibold' 
                          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                        : ''
                    }`}
                  >
                    {data.day && (
                      <>
                        <span>{data.day}</span>
                        {data.count > 0 && (
                          <span className="text-[7px] text-amber-400">{data.count}</span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--border-base)] flex justify-between items-center">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Total for {monthNames[dispatchCalendarMonth]}
                </span>
                <span className="text-sm font-bold text-amber-400">
                  {dispatchCalendarData.reduce((sum, d) => sum + d.count, 0)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="relative h-40">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[9px] text-[var(--text-muted)]">
                  <span>{maxMonthly}</span>
                  <span>{Math.round(maxMonthly / 2)}</span>
                  <span>0</span>
                </div>
                
                {/* Chart area */}
                <div className="absolute left-8 right-0 top-0 bottom-6 flex items-end justify-between gap-1">
                  {monthlyData.map((data, i) => (
                    <div key={i} className="flex flex-col items-center flex-1 group cursor-pointer">
                      <div className="relative w-full flex justify-center">
                        {/* Tooltip on hover */}
                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-all text-[9px] text-white bg-[var(--bg-elevated)] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 border border-[var(--border-base)]">
                          {data.month}: {data.count} dispatches
                        </div>
                        
                        {/* Bar with gradient */}
                        <div
                          className="w-6 rounded-t-lg transition-all duration-1000 ease-out hover:opacity-80"
                          style={{
                            height: animateChart ? `${(data.count / maxMonthly) * 100}px` : '0px',
                            minHeight: data.count > 0 ? '4px' : '0',
                            background: data.count > 0 
                              ? `linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)`
                              : 'transparent',
                            boxShadow: data.count > 0 ? '0 -2px 8px rgba(245, 158, 11, 0.3)' : 'none'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* X-axis labels */}
                <div className="absolute left-8 right-0 bottom-0 flex justify-between text-[9px] text-[var(--text-muted)]">
                  {monthlyData.map(d => <span key={d.month}>{d.month}</span>)}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--border-base)] flex justify-between items-center">
                <span className="text-[10px] text-[var(--text-muted)]">Total Dispatches</span>
                <span className="text-sm font-bold text-amber-400">{dispatches.length}</span>
              </div>
            </>
          )}
        </div>

        {/* Card 4: Monthly Freight Cost with Calendar View */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <IndianRupee size={14} className="text-[var(--green)]" />
              Monthly Freight (₹ Thousands)
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFreightCalendar(!showFreightCalendar)}
                className={`p-1.5 rounded-md transition-colors ${showFreightCalendar ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                title="Toggle Calendar View"
              >
                <Calendar size={12} />
              </button>
            </div>
          </div>
          
          {showFreightCalendar ? (
            <>
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => {
                    if (freightCalendarMonth === 0) {
                      setFreightCalendarMonth(11);
                      setFreightCalendarYear(freightCalendarYear - 1);
                    } else {
                      setFreightCalendarMonth(freightCalendarMonth - 1);
                    }
                  }}
                  className="p-1 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {monthNames[freightCalendarMonth]} {freightCalendarYear}
                </span>
                <button
                  onClick={() => {
                    if (freightCalendarMonth === 11) {
                      setFreightCalendarMonth(0);
                      setFreightCalendarYear(freightCalendarYear + 1);
                    } else {
                      setFreightCalendarMonth(freightCalendarMonth + 1);
                    }
                  }}
                  className="p-1 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-[9px] text-[var(--text-muted)] py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {freightCalendarData.map((data, idx) => (
                  <div
                    key={idx}
                    className={`aspect-square flex flex-col items-center justify-center rounded-md text-[9px] ${
                      data.day 
                        ? data.amount > 0 
                          ? 'bg-[var(--green)]/20 text-[var(--green)] font-semibold' 
                          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                        : ''
                    }`}
                  >
                    {data.day && (
                      <>
                        <span>{data.day}</span>
                        {data.amount > 0 && (
                          <span className="text-[7px] text-[var(--green)]">₹{data.amount.toFixed(0)}K</span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--border-base)] flex justify-between items-center">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Total for {monthNames[freightCalendarMonth]}
                </span>
                <span className="text-sm font-bold text-[var(--green)]">
                  ₹{freightCalendarData.reduce((sum, d) => sum + d.amount, 0).toFixed(1)}K
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="relative h-40">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[9px] text-[var(--text-muted)]">
                  <span>₹{maxFreight.toFixed(0)}K</span>
                  <span>₹{(maxFreight / 2).toFixed(0)}K</span>
                  <span>₹0</span>
                </div>
                
                {/* Chart area */}
                <div className="absolute left-8 right-0 top-0 bottom-6 flex items-end justify-between gap-1">
                  {monthlyFreightData.map((data, i) => (
                    <div key={i} className="flex flex-col items-center flex-1 group cursor-pointer">
                      <div className="relative w-full flex justify-center">
                        {/* Tooltip on hover */}
                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-all text-[9px] text-white bg-[var(--bg-elevated)] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 border border-[var(--border-base)]">
                          {data.month}: ₹{data.amount.toFixed(1)}K
                        </div>
                        
                        {/* Bar with gradient */}
                        <div
                          className="w-6 rounded-t-lg transition-all duration-1000 ease-out hover:opacity-80"
                          style={{
                            height: animateChart ? `${(data.amount / maxFreight) * 100}px` : '0px',
                            minHeight: data.amount > 0 ? '4px' : '0',
                            background: data.amount > 0 
                              ? `linear-gradient(180deg, #86efac 0%, #10b981 100%)`
                              : 'transparent',
                            boxShadow: data.amount > 0 ? '0 -2px 8px rgba(16, 185, 129, 0.3)' : 'none'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* X-axis labels */}
                <div className="absolute left-8 right-0 bottom-0 flex justify-between text-[9px] text-[var(--text-muted)]">
                  {monthlyFreightData.map(d => <span key={d.month}>{d.month}</span>)}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--border-base)] flex justify-between items-center">
                <span className="text-[10px] text-[var(--text-muted)]">Total Freight</span>
                <span className="text-sm font-bold text-[var(--green)]">₹{(totalFreight / 1000).toFixed(1)}K</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const LogisticsPage = () => {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState('dispatches');
  const [view, setView] = useState('kanban');
  const [showVisualization, setShowVisualization] = useState(false);
  const [vendorView, setVendorView] = useState('kanban');
  const [showVendorVisualization, setShowVendorVisualization] = useState(false);
  const [search, setSearch] = useState(''); // For dispatches
  const [vendorSearch, setVendorSearch] = useState(''); // Separate search for vendors
  const [statusFilter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ delivered: 0, inTransit: 0, scheduled: 0, totalFreight: 0 });

  // Form state for new dispatch
  const [newDispatch, setNewDispatch] = useState({
    projectId: '',
    customer: '',
    items: '',
    from: '',
    to: '',
    dispatchDate: '',
    driver: '',
    vehicle: '',
    cost: '',
  });

  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [newVendor, setNewVendor] = useState({ 
    name: '', 
    city: '', 
    contact: '', 
    phone: '', 
    email: ''
  });

  // Inventory items and units for dropdowns
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryUnits, setInventoryUnits] = useState([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  // Categories state - loaded from Inventory API
  const [vendorCategories, setVendorCategories] = useState([]);

  // Warehouses state - fetch from API (same as InventoryPage)
  const [warehouses, setWarehouses] = useState([]);

  // Vendor delivery state
  const [showVendorDeliveryModal, setShowVendorDeliveryModal] = useState(false);
  const [vendorDeliveryData, setVendorDeliveryData] = useState({ itemName: '', quantity: '' });

  // Vendor edit state
  const [isEditingVendor, setIsEditingVendor] = useState(false);
  const [editedVendor, setEditedVendor] = useState(null);

  // Kanban hide cards state
  const [hideDispatchCards, setHideDispatchCards] = useState(false);
  const [hideVendorCards, setHideVendorCards] = useState(false);

  // Dispatch edit state
  const [isEditingDispatch, setIsEditingDispatch] = useState(false);
  const [editedDispatch, setEditedDispatch] = useState(null);

  // Project search state for dispatch modal
  const [projects, setProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState('');

  // Fetch data from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const [dispatchesRes, statsRes] = await Promise.all([
        api.get('/logistics/dispatches'),
        api.get('/logistics/stats'),
      ]);

      // Handle API response - interceptor returns data directly
      let dispatchesData = [];

      if (Array.isArray(dispatchesRes)) {
        dispatchesData = dispatchesRes;
      } else if (dispatchesRes && typeof dispatchesRes === 'object') {
        dispatchesData = dispatchesRes.data || [];
      }

      let statsData = { delivered: 0, inTransit: 0, scheduled: 0, totalFreight: 0 };

      if (statsRes && typeof statsRes === 'object') {
        statsData = statsRes.data || statsRes;
      }

      setDispatches(dispatchesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching logistics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects from backend (same as ProjectPage)
  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects', { tenantId: TENANT_ID });
      const data = res?.data ?? res;
      console.log('Projects API Response:', data);
      const projectsArray = Array.isArray(data) ? data : (data?.data || []);
      setProjects(projectsArray);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchProjects();
    fetchVendors();
    fetchVendorCategories();
    fetchInventoryItems();
    fetchInventoryUnits();
    fetchWarehouses();
  }, []);

  // Listen for storage changes to update warehouses dynamically from Inventory page
  useEffect(() => {
    const handleStorageChange = () => {
      // When dispatch modal opens or inventory data changes, refresh warehouses from API
      if (showAdd) {
        console.log('[LOGISTICS] Dispatch modal opened - refreshing warehouses from API');
        fetchWarehouses();
      }
    };
    
    handleStorageChange();
    
    // Also listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [showAdd]);

  // Fetch all dropdown data when vendor modal opens
  useEffect(() => {
    if (showVendorModal) {
      console.log('[LOGISTICS] Vendor modal opened - refreshing dropdown data from Inventory...');
      refreshDropdownData();
    }
  }, [showVendorModal]);

  // Function to refresh all dropdown data (called when vendor modal opens)
  const refreshDropdownData = async () => {
    setDropdownLoading(true);
    try {
      await Promise.all([
        fetchVendorCategories(),
        fetchInventoryItems(),
        fetchInventoryUnits(),
        fetchWarehouses()  // Also refresh warehouses when vendor modal opens
      ]);
      console.log('[LOGISTICS] All dropdown data refreshed');
    } catch (err) {
      console.error('Error refreshing dropdown data:', err);
    } finally {
      setDropdownLoading(false);
    }
  };
  const fetchVendorCategories = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId') || 'default';
      // Use /lookups/categories to get ALL categories from lookup collection
      const res = await api.get('/lookups/categories', { tenantId });
      const data = res?.data ?? res;
      const categoriesData = Array.isArray(data) ? data : (data?.data || []);
      // Extract category names from lookup objects
      const categories = categoriesData.map(c => c.name || c.code || c).filter(Boolean);
      console.log('[LOGISTICS] Fetched categories from lookups:', categories.length, categories);
      setVendorCategories(categories);
      if (categories.length === 0) {
        console.warn('[LOGISTICS] No categories returned from /lookups/categories API');
      }
    } catch (err) {
      console.error('[LOGISTICS] Failed to fetch categories:', err);
      setVendorCategories([]);
    }
  };

  // Fetch warehouses from Lookup API
  const fetchWarehouses = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId') || 'default';
      console.log('[LOGISTICS] Fetching warehouses from /lookups/warehouses API');
      const res = await api.get('/lookups/warehouses', { headers: { 'x-tenant-id': tenantId } });
      const data = res?.data ?? res;
      const warehousesData = Array.isArray(data) ? data : (data?.data || []);
      // Extract warehouse names from lookup objects
      const whNames = warehousesData.map(w => w.name || w.code || w).filter(Boolean);
      console.log('[LOGISTICS] Fetched warehouses from API:', whNames.length, whNames);
      setWarehouses(whNames);
      if (whNames.length === 0) {
        console.warn('[LOGISTICS] No warehouses returned from /lookups/warehouses API');
      }
    } catch (err) {
      console.error('[LOGISTICS] Failed to fetch warehouses:', err);
      setWarehouses([]);
    }
  };

  // Fetch inventory units from Lookup API
  const fetchInventoryUnits = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId') || 'default';
      // Use /lookups/units to get ALL units from lookup collection
      const res = await api.get('/lookups/units', { tenantId });
      const data = res?.data ?? res;
      const unitsData = Array.isArray(data) ? data : (data?.data || []);
      // Extract unit names from lookup objects
      const units = unitsData.map(u => u.name || u.code || u).filter(Boolean);
      console.log('[LOGISTICS] Fetched units from lookups:', units.length, units);
      setInventoryUnits(units);
      if (units.length === 0) {
        console.warn('[LOGISTICS] No units returned from /lookups/units API');
      }
    } catch (err) {
      console.error('[LOGISTICS] Failed to fetch units:', err);
      setInventoryUnits([]);
    }
  };

    // Fetch inventory items for dropdown - fetch from /items master data
  const fetchInventoryItems = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId') || 'default';
      console.log('[LOGISTICS] Fetching items from /items API with tenantId:', tenantId);
      const res = await api.get('/items', { tenantId });
      const data = res?.data ?? res;
      const items = Array.isArray(data) ? data : (data?.data || []);
      console.log('[LOGISTICS] Fetched items from /items API:', items.length, items);
      setInventoryItems(items);
      if (items.length === 0) {
        console.warn('[LOGISTICS] No items returned from /items API');
      }
    } catch (err) {
      console.error('[LOGISTICS] Failed to fetch items from /items API:', err);
      setInventoryItems([]);
    }
  };

  // Fetch vendors from backend
  const fetchVendors = async () => {
    try {
      const response = await api.get('/logistics/vendors');
      console.log('fetchVendors response:', response);
      // Response interceptor returns data directly, not wrapped in response object
      let vendorsData = [];
      if (Array.isArray(response)) {
        vendorsData = response;
      } else if (response && typeof response === 'object') {
        vendorsData = response.data || [];
      }
      console.log('Setting vendors:', vendorsData.length, 'records');
      setVendors(vendorsData);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    }
  };

  // Vendor action handlers
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
        const subject = 'Logistics Inquiry';
        const text = `Dear ${vendor.name || vendor.contact || 'Vendor'},\n\nI hope this email finds you well. We are interested in discussing potential logistics services and would like to connect with you regarding our requirements.\n\nPlease let us know your availability for a brief discussion.\n\nBest regards,\nSolarOS Team`;

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

  const handleCreateVendor = async () => {
    try {
      // Validation - Basic fields
      if (!newVendor.name || !newVendor.city || !newVendor.contact || !newVendor.phone || !newVendor.email) {
        alert('Please fill in all required fields');
        return;
      }
      
      console.log('Creating vendor with data:', newVendor);
      const res = await api.post('/logistics/vendors', newVendor);
      console.log('Vendor created response:', res);
      
      // Check if creation was successful
      if (res.success === false) {
        alert('Failed to create vendor: ' + (res.error || 'Unknown error'));
        return;
      }
      
      // Refresh vendors list immediately
      await fetchVendors();
      setShowVendorModal(false);
      setNewVendor({ 
        name: '', 
        city: '', 
        contact: '', 
        phone: '', 
        email: ''
      });
      setSearch(''); // Clear search to show new vendor
      alert('Vendor created successfully!');
    } catch (error) {
      console.error('Error creating vendor:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to create vendor: ' + (error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error'));
    }
  };

  const startEditingVendor = () => {
    setEditedVendor({ ...selectedVendor });
    setIsEditingVendor(true);
  };

  const cancelEditingVendor = () => {
    setIsEditingVendor(false);
    setEditedVendor(null);
  };

  const handleUpdateVendor = async () => {
    try {
      if (!editedVendor) return;
      
      const payload = {
        name: editedVendor.name,
        city: editedVendor.city,
        contact: editedVendor.contact,
        phone: editedVendor.phone,
        email: editedVendor.email
      };
      console.log('Updating vendor payload:', payload);
      const res = await api.patch(`/logistics/vendors/${editedVendor.id}`, payload);
      console.log('Vendor updated:', res);
      await fetchVendors();
      setSelectedVendor(null);
      setIsEditingVendor(false);
      setEditedVendor(null);
      alert('Vendor updated successfully!');
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Failed to update vendor: ' + (error.response?.data?.error?.message || error.message || 'Unknown error'));
    }
  };

  const handleVendorDelivery = async () => {
    try {
      if (!selectedVendor?.id) {
        alert('No vendor selected');
        return;
      }
      if (!vendorDeliveryData.itemName || !vendorDeliveryData.quantity) {
        alert('Please enter item name and quantity');
        return;
      }
      const quantity = Number(vendorDeliveryData.quantity);
      if (quantity <= 0) {
        alert('Quantity must be greater than 0');
        return;
      }
      console.log('Recording delivery from vendor:', selectedVendor.id, vendorDeliveryData);
      const res = await api.post(`/logistics/vendors/${selectedVendor.id}/delivery`, {
        itemName: vendorDeliveryData.itemName,
        quantity: quantity
      });
      console.log('Vendor delivery recorded:', res);
      alert(`Added ${quantity} units of ${vendorDeliveryData.itemName} to inventory`);
      setShowVendorDeliveryModal(false);
      setVendorDeliveryData({ itemName: '', quantity: '' });
      setSelectedVendor(null);
    } catch (error) {
      console.error('Error recording vendor delivery:', error);
      alert('Failed to record delivery: ' + (error.response?.data?.error?.message || error.message || 'Unknown error'));
    }
  };

  const handleStageChange = async (id, newStatus) => {
    try {
      // Update the dispatch status
      await api.patch(`/logistics/dispatches/${id}/status`, { status: newStatus });
      
      // If status changed to Delivered, create an installation record
      if (newStatus === 'Delivered') {
        const dispatch = dispatches.find(d => d.id === id);
        if (dispatch) {
          try {
            const installationData = {
              projectId: dispatch.projectId,
              customerName: dispatch.customer,
              site: dispatch.to, // Delivery location becomes installation site (field name must be 'site')
              dispatchId: dispatch.id, // Link to the dispatch
              status: 'Pending Assign',
              scheduledDate: new Date().toISOString(), // Required field - set to current date
              technicianId: null, // Required by schema but can be null for unassigned
              technicianName: 'Not Assigned', // Required field - placeholder until assigned
              progress: 0, // Default progress
              notes: `Auto-created from delivered dispatch ${dispatch.id}. Items: ${dispatch.items}`,
              tasks: [] // Will use default tasks from settings
            };
            
            console.log('Creating installation from delivered dispatch:', installationData);
            await api.post('/installations', installationData);
            console.log('Installation created successfully');
          } catch (installError) {
            console.error('Failed to create installation:', installError.response?.data || installError.message);
            // Don't fail the entire operation, just log the error
          }
        }
      }
      
      setDispatches(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
      // Clear cached stats so KPI cards recalculate from updated dispatches
      setStats({});
    } catch (error) {
      console.error('Error updating dispatch status:', error);
    }
  };

  const handleCreateDispatch = async () => {
    try {
      const payload = {
        ...newDispatch,
        cost: Number(newDispatch.cost),
        status: 'Scheduled',
      };
      await api.post('/logistics/dispatches', payload);
      await fetchData();
      setShowAdd(false);
      setNewDispatch({
        projectId: '',
        customer: '',
        items: '',
        from: '',
        to: '',
        dispatchDate: '',
        driver: '',
        vehicle: '',
        cost: '',
      });
    } catch (error) {
      console.error('Error creating dispatch:', error);
    }
  };

  const handleMarkDelivered = async (dispatch) => {
    try {
      // First, mark the dispatch as delivered
      await api.patch(`/logistics/dispatches/${dispatch.id}/status`, { status: 'Delivered' });
      
      // Then, create an installation record with "Pending Assign" status
      try {
        const installationData = {
          projectId: dispatch.projectId,
          customerName: dispatch.customer,
          site: dispatch.to, // Delivery location becomes installation site (field name must be 'site')
          dispatchId: dispatch.id, // Link to the dispatch
          status: 'Pending Assign',
          scheduledDate: new Date().toISOString(), // Required field - set to current date
          technicianId: null, // Required by schema but can be null for unassigned
          technicianName: 'Not Assigned', // Required field - placeholder until assigned
          progress: 0, // Default progress
          notes: `Auto-created from delivered dispatch ${dispatch.id}. Items: ${dispatch.items}`,
          tasks: [] // Will use default tasks from settings
        };
        
        console.log('Creating installation from delivered dispatch:', installationData);
        await api.post('/installations', installationData);
        console.log('Installation created successfully');
      } catch (installError) {
        console.error('Failed to create installation:', installError.response?.data || installError.message);
        // Don't fail the entire operation, just log the error
      }
      
      await fetchData();
      setSelected(null);
    } catch (error) {
      console.error('Error marking as delivered:', error);
      throw error; // Re-throw to handle in UI
    }
  };

  const startEditingDispatch = () => {
    setEditedDispatch({ ...selected });
    setIsEditingDispatch(true);
  };

  const cancelEditingDispatch = () => {
    setIsEditingDispatch(false);
    setEditedDispatch(null);
  };

  const handleDeleteDispatch = async (dispatch) => {
    if (!window.confirm(`Are you sure you want to delete dispatch ${dispatch.id}?`)) return;
    try {
      await api.delete(`/logistics/dispatches/${dispatch.id}`);
      // Optimistic update - remove from state immediately
      setDispatches(prev => prev.filter(d => d.id !== dispatch.id));
      setSelected(null);
      // Then refresh from backend to ensure sync
      await fetchData();
      alert('Dispatch deleted successfully!');
    } catch (error) {
      console.error('Error deleting dispatch:', error);
      // Refresh data on error to show latest state
      await fetchData();
      alert('Failed to delete dispatch: ' + (error.response?.data?.error?.message || error.message || 'Unknown error'));
    }
  };

  const handleUpdateDispatch = async () => {
    try {
      const payload = {
        projectId: editedDispatch.projectId,
        customer: editedDispatch.customer,
        items: editedDispatch.items,
        from: editedDispatch.from,
        to: editedDispatch.to,
        driver: editedDispatch.driver,
        vehicle: editedDispatch.vehicle,
        dispatchDate: editedDispatch.dispatchDate,
        cost: Number(editedDispatch.cost),
      };
      console.log('Updating dispatch payload:', payload);
      const res = await api.patch(`/logistics/dispatches/${editedDispatch.id}`, payload);
      console.log('Dispatch updated:', res);
      await fetchData();
      setSelected(null);
      setIsEditingDispatch(false);
      setEditedDispatch(null);
      alert('Dispatch updated successfully!');
    } catch (error) {
      console.error('Error updating dispatch:', error);
      alert('Failed to update dispatch: ' + (error.response?.data?.error?.message || error.message || 'Unknown error'));
    }
  };

  // Filter projects - show all by default, only selected after selection
  const filteredProjects = useMemo(() => {
    // If project is selected, show only selected project
    if (newDispatch.projectId) {
      const selectedProject = projects.find(p => p.projectId === newDispatch.projectId);
      return selectedProject ? [selectedProject] : [];
    }
    // Otherwise show all or search filtered
    if (!projectSearch.trim()) return projects;
    return projects.filter(p =>
      p.projectId?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.customerName?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.site?.toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch, newDispatch.projectId]);

  const filtered = useMemo(() =>
    dispatches.filter(d => d &&
      (statusFilter === 'All' || d.status === statusFilter) &&
      (d.customer?.toLowerCase().includes(search.toLowerCase()) ||
        d.items?.toLowerCase().includes(search.toLowerCase()))
    ), [search, statusFilter, dispatches]);

  // Handle KPI card click to filter table data and scroll
  const handleCardClick = (filterType) => {
    // Switch to table view
    setView('table');
    setShowVisualization(false);
    setPage(1);
    
    // Apply filter based on card type
    switch (filterType) {
      case 'inTransit':
        setFilter('In Transit');
        break;
      case 'scheduled':
        setFilter('Scheduled');
        break;
      case 'delivered':
        setFilter('Delivered');
        break;
      case 'totalFreight':
        setFilter('All');
        break;
      default:
        break;
    }
    
    // Scroll to table view after a short delay to allow render
    setTimeout(() => {
      const tableSection = document.getElementById('dispatch-table-section');
      if (tableSection) {
        tableSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const delivered = stats.delivered || dispatches.filter(d => d?.status === 'Delivered').length;
  const inTransit = stats.inTransit || dispatches.filter(d => d?.status === 'In Transit').length;
  const scheduled = stats.scheduled || dispatches.filter(d => d?.status === 'Scheduled').length;
  const totalFreight = stats.totalFreight || dispatches.reduce((a, d) => a + (d?.cost || 0), 0);

  const ROW_ACTIONS = [
    { label: 'View Details', icon: Package, onClick: row => setSelected(row) },
    { label: 'Track Shipment', icon: Navigation, onClick: () => { } },
    ...(can('logistics', 'edit') ? [{ label: 'Mark Delivered', icon: CheckCircle, onClick: (row) => handleMarkDelivered(row) }] : []),
    ...(can('logistics', 'delete') ? [{ label: 'Delete', icon: Trash2, onClick: (row) => handleDeleteDispatch(row), variant: 'danger' }] : []),
  ];

  const handleDeleteVendor = async (vendor) => {
    if (!window.confirm(`Are you sure you want to delete vendor ${vendor.name}?`)) return;
    try {
      await api.delete(`/logistics/vendors/${vendor.id}`);
      // Optimistic update - remove from state immediately
      setVendors(prev => prev.filter(v => v.id !== vendor.id));
      setSelectedVendor(null);
      // Then refresh from backend to ensure sync
      await fetchVendors();
      alert('Vendor deleted successfully!');
    } catch (error) {
      console.error('Error deleting vendor:', error);
      // Refresh data on error to show latest state
      await fetchVendors();
      alert('Failed to delete vendor: ' + (error.response?.data?.error?.message || error.message || 'Unknown error'));
    }
  };

  const VENDOR_ACTIONS = [
    { label: 'View Vendor', icon: Package, onClick: row => { setSelectedVendor(row); setIsEditingVendor(false); } },
    ...(can('logistics', 'edit') ? [{ label: 'Edit Vendor', icon: Edit, onClick: row => { setSelectedVendor(row); setEditedVendor({ ...row }); setIsEditingVendor(true); } }] : []),
    ...(can('logistics', 'create') ? [{ label: 'Record Delivery', icon: Plus, onClick: row => { setSelectedVendor(row); setShowVendorDeliveryModal(true); } }] : []),
    ...(can('logistics', 'delete') ? [{ label: 'Delete', icon: Trash2, onClick: (row) => handleDeleteVendor(row), variant: 'danger' }] : []),
    { label: 'Call Vendor', icon: Phone, onClick: row => handleCallVendor(row) },
    { label: 'Email Vendor', icon: Mail, onClick: row => handleEmailVendor(row) },
  ];

  if (loading) {
    return <div className="animate-fade-in space-y-5"><p className="text-xs text-[var(--text-muted)]">Loading...</p></div>;
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Logistics & Dispatch"
        subtitle="Material dispatch · delivery tracking · freight management"
        tabs={[
          { id: 'dispatches', label: 'Dispatches', icon: Truck },
          { id: 'vendors', label: 'Vendors', icon: Building2 }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        preTabsContent={activeTab === 'dispatches' ? (
          <>
            <button
              onClick={() => { setView('kanban'); setShowVisualization(false); }}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === 'kanban' && !showVisualization ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <LayoutGrid size={12} className="inline mr-1" /> Kanban
            </button>
            <button
              onClick={() => { setView('table'); setShowVisualization(false); }}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === 'table' && !showVisualization ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <List size={12} className="inline mr-1" /> Table
            </button>
            <button
              onClick={() => setShowVisualization(true)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${showVisualization ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              title="Visualization"
            >
              <BarChart3 size={12} />
            </button>
          </>
        ) : (
          /* Vendors Tab Buttons */
          <>
            <button
              onClick={() => { setVendorView('table'); setShowVendorVisualization(false); }}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${vendorView === 'table' && !showVendorVisualization ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <List size={12} className="inline mr-1" /> Table
            </button>
            <button
              onClick={() => setShowVendorVisualization(true)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${showVendorVisualization ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              title="Visualization"
            >
              <BarChart3 size={12} />
            </button>
          </>
        )}
        actions={[
          ...(can('logistics', 'create') ? [{ type: 'button', label: activeTab === 'dispatches' ? 'Schedule Dispatch' : 'Add Vendor', icon: Plus, variant: 'primary', onClick: () => activeTab === 'dispatches' ? setShowAdd(true) : setShowVendorModal(true) }] : []),
          // Hide Cards button - only in Kanban view
          ...(activeTab === 'dispatches' && view === 'kanban' ? [{ 
            type: 'button', 
            label: hideDispatchCards ? 'Show Cards' : 'Hide Cards', 
            icon: null, 
            variant: 'secondary', 
            onClick: () => setHideDispatchCards(!hideDispatchCards) 
          }] : []),
          ...(activeTab === 'vendors' && vendorView === 'kanban' ? [{ 
            type: 'button', 
            label: hideVendorCards ? 'Show Cards' : 'Hide Cards', 
            icon: null, 
            variant: 'secondary', 
            onClick: () => setHideVendorCards(!hideVendorCards) 
          }] : [])
        ]}
      />

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          {activeTab === 'dispatches'
            ? (inTransit > 0
              ? `${inTransit} shipment(s) currently in transit. ${scheduled > 0 ? `${scheduled} pending dispatch(es) need vehicle assignment.` : 'All dispatches are on track.'}`
              : scheduled > 0
                ? `${scheduled} dispatch(es) scheduled. Assign vehicles and drivers to proceed.`
                : 'All dispatches completed. No active shipments.')
            : `${vendors.length} vendors available for logistics operations.`
          }
        </p>
      </div>

      {activeTab === 'dispatches' ? (
        <>
          {/* Dispatch KPI Cards with Descriptive Labels */}
          {!hideDispatchCards && (
            <div className="mb-2">
              <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
                <Package size={12} className="text-[var(--accent-light)]" />
                <span>Dispatches Overview - Shipment tracking and delivery status</span>
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div onClick={() => handleCardClick('inTransit')} className="cursor-pointer transition-transform hover:scale-105">
                  <KPICard title="Total Shipments In Transit" value={inTransit} icon={Truck} sub="Shipments currently moving" variant="blue" />
                </div>
                <div onClick={() => handleCardClick('scheduled')} className="cursor-pointer transition-transform hover:scale-105">
                  <KPICard title="Total Dispatches Scheduled" value={scheduled} icon={Clock} sub="Dispatches awaiting pickup" variant="emerald" />
                </div>
                <div onClick={() => handleCardClick('delivered')} className="cursor-pointer transition-transform hover:scale-105">
                  <KPICard title="Total Deliveries Completed" value={delivered} icon={CheckCircle} sub={`${delivered} deliveries done this month`} variant="purple" />
                </div>
                <div onClick={() => handleCardClick('totalFreight')} className="cursor-pointer transition-transform hover:scale-105">
                  <KPICard title="Total Freight Cost" value={`₹${totalFreight.toLocaleString('en-IN')}`} icon={MapPin} sub="Total shipping expenses" variant="amber" />
                </div>
              </div>
            </div>
          )}

          {/* Active Shipments strip (kanban-only) */}
          {view === 'kanban' && inTransit > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Truck size={14} className="text-[var(--blue)]" /> Active Shipments ({inTransit})
              </h3>
              <div className="space-y-2">
                {dispatches.filter(d => d.status === 'In Transit').map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-muted)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--blue)]/20 flex items-center justify-center">
                        <Truck size={14} className="text-[var(--blue)]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{d.id} — {d.customer}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{d.items}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--blue)] font-medium">{d.from} → {d.to}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">Driver: {d.driver} · {d.vehicle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dispatches Section Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Input placeholder="Search dispatches…" value={search}
                onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-52" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Package size={14} className="text-[var(--accent-light)]" /> 
              {view === 'kanban' ? 'Dispatches by Status' : 'Dispatch List'}
            </h3>
          </div>

          {showVisualization ? (
            <DispatchVisualizationView dispatches={dispatches} />
          ) : view === 'kanban' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[var(--text-muted)]">Drag dispatches between columns to update status</p>
              </div>
              <DispatchKanbanBoard dispatches={filtered} onStageChange={handleStageChange} onCardClick={setSelected} />
            </>
          ) : (
            <div id="dispatch-table-section">
              <div className="flex flex-wrap gap-2 items-center mb-3">
                <span className="text-xs text-[var(--text-muted)] mr-1">Filter:</span>
                {STATUS_FILTERS.map(s => (
                  <button key={s} onClick={() => { setFilter(s); setPage(1); }}
                    className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}>{s}</button>
                ))}
              </div>
              <DataTable columns={COLUMNS} data={paginated} rowActions={ROW_ACTIONS}
                pagination={{ page, pageSize, total: filtered.length, onChange: setPage, onPageSizeChange: setPageSize }}
                emptyMessage="No dispatch records found." />
            </div>
          )}
        </>
      ) : (
        /* Vendors Tab */
        <>
          {/* Vendor Summary Cards with Descriptive Labels */}
          {!hideVendorCards && (
            <div className="mb-2">
              <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
                <Store size={12} className="text-[var(--accent-light)]" />
                <span>Vendors Overview - Summary statistics</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <KPICard 
                  title="Registered Vendors" 
                  value={vendors.length} 
                  icon={Store} 
                  sub="Total vendors in system"
                  variant="violet"
                />
                <KPICard 
                  title="Unique Cities" 
                  value={new Set(vendors.map(v => v.city).filter(Boolean)).size} 
                  icon={MapPin} 
                  sub="Cities with vendors"
                  variant="cyan"
                  gradient="bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20"
                  iconBgColor="bg-sky-100 dark:bg-sky-900/50"
                  iconColor="text-sky-600 dark:text-sky-400"
                />
              </div>
            </div>
          )}

          {/* Vendors Section Title */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Building2 size={14} className="text-[var(--accent-light)]" /> 
              {showVendorVisualization ? 'Vendor Analytics' : (vendorView === 'kanban' ? 'Vendors by Category' : 'Vendor List')}
            </h3>
            <div className="flex items-center gap-2">
              <Input placeholder="Search vendors…" value={vendorSearch}
                onChange={e => setVendorSearch(e.target.value)} className="h-8 text-xs w-52" />
            </div>
          </div>

          {showVendorVisualization ? (
            <VendorVisualizationView vendors={vendors} />
          ) : (
            <DataTable columns={VENDOR_COLUMNS} data={vendors.filter(v =>
              !vendorSearch || v.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
              v.city?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
              v.category?.toLowerCase().includes(vendorSearch.toLowerCase())
            ).map(v => ({ ...v, _onVendorClick: (row) => { setSelectedVendor(row); setIsEditingVendor(false); } }))} rowActions={VENDOR_ACTIONS}
              emptyMessage="No vendors found. Click Add Vendor to create one." />
          )}
        </>
      )}

      {/* Schedule Dispatch Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Schedule Dispatch"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={handleCreateDispatch}><Plus size={13} /> Schedule</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Project">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search projects by ID, name or site..."
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
                  className="h-9 text-xs pr-8"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto border border-[var(--border)] rounded-md bg-[var(--bg-elevated)]">
                {filteredProjects.length === 0 ? (
                  <div className="p-3 text-xs text-[var(--text-muted)] text-center">
                    {projects.length === 0 ? 'No projects available' : 'No matching projects found'}
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {filteredProjects.map(p => (
                      <div
                        key={p.projectId}
                        onClick={() => {
                          setNewDispatch({
                            ...newDispatch,
                            projectId: p.projectId,
                            customer: p.customerName || ''
                          });
                        }}
                        className={`p-2 cursor-pointer hover:bg-[var(--accent)]/10 transition-colors ${newDispatch.projectId === p.projectId ? 'bg-[var(--accent)]/20 border-l-2 border-[var(--accent)]' : ''
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--text-primary)]">{p.projectId}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">{p.site}</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{p.customerName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {newDispatch.projectId && (
                <div className="text-xs text-[var(--accent)]">
                  Selected: {newDispatch.projectId}
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Customer">
            <Input value={newDispatch.customer} onChange={e => setNewDispatch({ ...newDispatch, customer: e.target.value })} placeholder="Customer name" />
          </FormField>
          <FormField label="Items to Dispatch">
            <Input value={newDispatch.items} onChange={e => setNewDispatch({ ...newDispatch, items: e.target.value })} placeholder="e.g. 125 Panels, 1 Inverter" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From Warehouse">
              <Select value={newDispatch.from} onChange={e => setNewDispatch({ ...newDispatch, from: e.target.value })}>
                <option value="">Select Warehouse</option>
                {warehouses.map(wh => (
                  <option key={wh} value={wh}>{wh}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="To Location">
              <Input value={newDispatch.to} onChange={e => setNewDispatch({ ...newDispatch, to: e.target.value })} placeholder="Destination" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Dispatch Date">
              <Input type="date" value={newDispatch.dispatchDate} onChange={e => setNewDispatch({ ...newDispatch, dispatchDate: e.target.value })} />
            </FormField>
            <FormField label="Freight Cost (₹)">
              <Input type="number" value={newDispatch.cost} onChange={e => setNewDispatch({ ...newDispatch, cost: e.target.value })} placeholder="8500" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Driver Name">
              <Input value={newDispatch.driver} onChange={e => setNewDispatch({ ...newDispatch, driver: e.target.value })} placeholder="Driver name" />
            </FormField>
            <FormField label="Vehicle Number">
              <Input value={newDispatch.vehicle} onChange={e => setNewDispatch({ ...newDispatch, vehicle: e.target.value })} placeholder="GJ-01-AB-1234" />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal 
          open={!!selected} 
          onClose={() => { setSelected(null); setIsEditingDispatch(false); setEditedDispatch(null); }} 
          title={isEditingDispatch ? `Edit Dispatch — ${selected.id}` : `Dispatch — ${selected.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              {isEditingDispatch ? (
                <>
                  <Button variant="ghost" onClick={cancelEditingDispatch}>Cancel</Button>
                  <Button onClick={handleUpdateDispatch}><CheckCircle size={13} /> Save Changes</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
                  {can('logistics', 'delete') && (
                    <Button variant="danger" onClick={() => handleDeleteDispatch(selected)}><Trash2 size={13} /> Delete</Button>
                  )}
                  {can('logistics', 'edit') && (
                    <Button onClick={startEditingDispatch}><Edit size={13} /> Edit</Button>
                  )}
                  {can('logistics', 'edit') && selected.status !== 'Delivered' && (
                    <Button onClick={() => handleMarkDelivered(selected)}><CheckCircle size={13} /> Mark Delivered</Button>
                  )}
                </>
              )}
            </div>
          }>
          {isEditingDispatch && editedDispatch ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Project ID">
                  <Input value={editedDispatch.projectId} onChange={e => setEditedDispatch({...editedDispatch, projectId: e.target.value})} />
                </FormField>
                <FormField label="Customer">
                  <Input value={editedDispatch.customer} onChange={e => setEditedDispatch({...editedDispatch, customer: e.target.value})} />
                </FormField>
              </div>
              <FormField label="Items">
                <Input value={editedDispatch.items} onChange={e => setEditedDispatch({...editedDispatch, items: e.target.value})} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="From">
                  <Select value={editedDispatch.from} onChange={e => setEditedDispatch({...editedDispatch, from: e.target.value})}>
                    <option value="">Select Warehouse</option>
                    {warehouses.map(wh => (
                      <option key={wh} value={wh}>{wh}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="To">
                  <Input value={editedDispatch.to} onChange={e => setEditedDispatch({...editedDispatch, to: e.target.value})} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Driver">
                  <Input value={editedDispatch.driver} onChange={e => setEditedDispatch({...editedDispatch, driver: e.target.value})} />
                </FormField>
                <FormField label="Vehicle">
                  <Input value={editedDispatch.vehicle} onChange={e => setEditedDispatch({...editedDispatch, vehicle: e.target.value})} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Dispatch Date">
                  <Input type="date" value={editedDispatch.dispatchDate} onChange={e => setEditedDispatch({...editedDispatch, dispatchDate: e.target.value})} />
                </FormField>
                <FormField label="Freight Cost (₹)">
                  <Input type="number" value={editedDispatch.cost} onChange={e => setEditedDispatch({...editedDispatch, cost: e.target.value})} />
                </FormField>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ['Dispatch ID', selected.id], ['Project', selected.projectId], ['Customer', selected.customer],
                ['Items', selected.items], ['From', selected.from], ['To', selected.to],
                ['Driver', selected.driver], ['Vehicle', selected.vehicle],
                ['Dispatch Date', selected.dispatchDate], ['Freight Cost', `₹${selected.cost.toLocaleString('en-IN')}`],
                ['Status', <DispatchBadge value={selected.status} />],
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
      {/* Add Vendor Modal */}
      <Modal open={showVendorModal} onClose={() => setShowVendorModal(false)} title="Add Vendor"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowVendorModal(false)}>Cancel</Button>
          <Button onClick={handleCreateVendor}><Plus size={13} /> Add Vendor</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Vendor Name *">
            <Input value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} placeholder="e.g., ABC Logistics" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="City *">
              <Input value={newVendor.city} onChange={e => setNewVendor({ ...newVendor, city: e.target.value })} placeholder="e.g., Ahmedabad" />
            </FormField>
          </div>
          <FormField label="Contact Person *">
            <Input value={newVendor.contact} onChange={e => setNewVendor({ ...newVendor, contact: e.target.value })} placeholder="e.g., John Doe" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone *">
              <Input value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} placeholder="e.g., +91 98765 43210" />
            </FormField>
            <FormField label="Email *">
              <Input type="email" value={newVendor.email} onChange={e => setNewVendor({ ...newVendor, email: e.target.value })} placeholder="e.g., vendor@example.com" />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <Modal 
          open={!!selectedVendor} 
          onClose={() => { setSelectedVendor(null); setIsEditingVendor(false); setEditedVendor(null); }} 
          title={isEditingVendor ? `Edit Vendor — ${selectedVendor.name}` : `Vendor — ${selectedVendor.name}`}
          footer={
            <div className="flex flex-wrap gap-2 justify-between w-full items-center">
              {isEditingVendor ? (
                <>
                  <Button variant="ghost" onClick={cancelEditingVendor} className="text-xs px-3 py-1.5">Cancel</Button>
                  <Button onClick={handleUpdateVendor} className="text-xs px-3 py-1.5"><CheckCircle size={12} /> Save</Button>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => { setSelectedVendor(null); setIsEditingVendor(false); setEditedVendor(null); }} className="text-xs px-3 py-1.5">Close</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {can('logistics', 'delete') && (
                      <Button variant="danger" onClick={() => handleDeleteVendor(selectedVendor)} className="text-xs px-3 py-1.5"><Trash2 size={12} /> Delete</Button>
                    )}
                    {can('logistics', 'edit') && (
                      <Button onClick={startEditingVendor} className="text-xs px-3 py-1.5"><Edit size={12} /> Edit</Button>
                    )}
                    {can('logistics', 'create') && (
                      <Button onClick={() => { setShowVendorDeliveryModal(true); }} className="text-xs px-3 py-1.5"><Plus size={12} /> Delivery</Button>
                    )}
                    <Button onClick={() => handleCallVendor(selectedVendor)} className="text-xs px-3 py-1.5"><Phone size={12} /> Call</Button>
                    <Button onClick={() => handleEmailVendor(selectedVendor)} className="text-xs px-3 py-1.5"><Mail size={12} /> Email</Button>
                  </div>
                </>
              )}
            </div>
          }>
          {isEditingVendor && editedVendor ? (
            <div className="space-y-3">
              <FormField label="Vendor Name *">
                <Input value={editedVendor.name} onChange={e => setEditedVendor({...editedVendor, name: e.target.value})} placeholder="e.g., ABC Logistics" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="City *">
                  <Input value={editedVendor.city} onChange={e => setEditedVendor({...editedVendor, city: e.target.value})} placeholder="e.g., Ahmedabad" />
                </FormField>
              </div>
              <FormField label="Contact Person *">
                <Input value={editedVendor.contact} onChange={e => setEditedVendor({...editedVendor, contact: e.target.value})} placeholder="e.g., John Doe" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Phone *">
                  <Input value={editedVendor.phone} onChange={e => setEditedVendor({...editedVendor, phone: e.target.value})} placeholder="e.g., +91 98765 43210" />
                </FormField>
                <FormField label="Email *">
                  <Input type="email" value={editedVendor.email} onChange={e => setEditedVendor({...editedVendor, email: e.target.value})} placeholder="e.g., vendor@example.com" />
                </FormField>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[['Vendor ID', selectedVendor.id || selectedVendor._id || selectedVendor.vendorId], ['Name', selectedVendor.name], ['Contact', selectedVendor.contact], ['Phone', selectedVendor.phone], ['Email', selectedVendor.email], ['City', selectedVendor.city], ['Total Orders', selectedVendor.totalOrders || 0], ['Rating', selectedVendor.rating || 5], ['Status', selectedVendor.isActive !== false ? 'Active' : 'Inactive']].map(([k, v]) => (
                  <div key={k} className="glass-card p-2">
                    <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                    <div className="font-semibold text-[var(--text-primary)]">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Vendor Delivery Modal */}
      <Modal open={showVendorDeliveryModal} onClose={() => setShowVendorDeliveryModal(false)} title={`Record Delivery - ${selectedVendor?.name || 'Vendor'}`}
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowVendorDeliveryModal(false)}>Cancel</Button>
          <Button onClick={handleVendorDelivery}><Plus size={13} /> Add Stock</Button>
        </div>}>
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">
            Record stock delivery from vendor. This will add the quantity to inventory.
          </p>
          <FormField label="Item Name *">
            <Input value={vendorDeliveryData.itemName} onChange={e => setVendorDeliveryData({ ...vendorDeliveryData, itemName: e.target.value })} placeholder="e.g., 400W Solar Panels" />
          </FormField>
          <FormField label="Quantity *">
            <Input type="number" value={vendorDeliveryData.quantity} onChange={e => setVendorDeliveryData({ ...vendorDeliveryData, quantity: e.target.value })} placeholder="e.g., 100" />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};

export default LogisticsPage;

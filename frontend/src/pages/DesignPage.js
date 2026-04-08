// Solar OS †â€™“ EPC Edition †â€™DesignPage.js
// Project Type Adaptive Design Studio
import React, { useState, useMemo, useRef } from 'react';
import {
 Plus, Pencil, FileText, CheckCircle, Zap, Sun,
 Layers, Package, TrendingUp, Download, Eye,
 BarChart2, LayoutGrid, List,
 Home, Building2, Factory, AlertTriangle,
 Settings, Target, Box,
} from 'lucide-react';
import SolarSurveyStudio from '../components/SolarDesignStudio/SolarSurveyStudio';
import { DESIGNS } from '../data/mockData';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import {
 PROJECT_TYPES, PROJECT_TYPE_LIST,
 computeFinancials, generatePanelGrid,
} from '../config/projectTypes.config';
import { useSettings } from '../context/SettingsContext';
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import CanAccess, { CanCreate, CanEdit, CanDelete, CanView } from '../components/CanAccess';
import { toast } from '../components/ui/Toast';

const fmt = CURRENCY.format;

// †â€™†â€™Project type icon map †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const PT_ICON = {
 [PROJECT_TYPES.RESIDENTIAL]: Home,
 [PROJECT_TYPES.COMMERCIAL]: Building2,
 [PROJECT_TYPES.INDUSTRIAL]: Factory,
};

// †â€™†â€™Extended design data †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const TYPES_ARR = [PROJECT_TYPES.RESIDENTIAL, PROJECT_TYPES.COMMERCIAL, PROJECT_TYPES.INDUSTRIAL];
const DESIGNS_EXT = DESIGNS.map((d, i) => ({
 ...d,
 projectType: TYPES_ARR[i % 3],
 panelType: d.panels.includes('Bifacial') ? 'Bifacial' : 'Mono PERC',
 panelWatt: 400,
 panelCount: parseInt(d.panels),
 mountingType: 'Rooftop Fixed Tilt',
 acCapacity: d.systemSize,
 dcCapacity: Math.round(d.systemSize * 1.12 * 10) / 10,
 pr: d.status === 'Approved' ? 79.2 : null,
 annualYield: d.status === 'Approved' ? Math.round(d.systemSize * 1400) : null,
 tiltAngle: 20,
 azimuth: 180,
 estimatedCost: Math.round(d.systemSize * 4200),
 approvedBy: d.status === 'Approved' ? 'Neha Gupta' : null,
 approvedDate: d.status === 'Approved' ? '2026-02-24' : null,
}));

// Bill of Quantities templates
const BOQ_TEMPLATES = {
 'D001': [
 { sno: 1, description: '400W Mono PERC Solar Panel', unit: 'Nos', qty: 125, rate: 14500, amount: 1812500 },
 { sno: 2, description: '10kW String Inverter (Sungrow)', unit: 'Nos', qty: 1, rate: 65000, amount: 65000 },
 { sno: 3, description: 'GI Mounting Structure (Set)', unit: 'Set', qty: 5, rate: 12000, amount: 60000 },
 { sno: 4, description: '4mm†â€™…Â¡Â² DC Solar Cable', unit: 'Mtr', qty: 400, rate: 42, amount: 16800 },
 { sno: 5, description: 'MC4 Connector Pairs', unit: 'Nos', qty: 100, rate: 85, amount: 8500 },
 { sno: 6, description: 'AC Distribution Board', unit: 'Nos', qty: 1, rate: 8000, amount: 8000 },
 { sno: 7, description: 'Earthing & Lightning Arrester', unit: 'Lot', qty: 1, rate: 12000, amount: 12000 },
 { sno: 8, description: 'Installation & Civil Works', unit: 'Lot', qty: 1, rate: 18000, amount: 18000 },
 ],
 'D002': [
 { sno: 1, description: '440W Bifacial Half-Cut Panel', unit: 'Nos', qty: 250, rate: 15200, amount: 3800000 },
 { sno: 2, description: '50kW String Inverter (SMA)', unit: 'Nos', qty: 2, rate: 185000, amount: 370000 },
 { sno: 3, description: 'GI Mounting Structure (Set)', unit: 'Set', qty: 10, rate: 18000, amount: 180000 },
 { sno: 4, description: '4mm†â€™…Â¡Â² DC Solar Cable', unit: 'Mtr', qty: 1600, rate: 42, amount: 67200 },
 { sno: 5, description: 'MC4 Connector Pairs', unit: 'Nos', qty: 500, rate: 85, amount: 42500 },
 { sno: 6, description: 'AC Distribution Board', unit: 'Nos', qty: 2, rate: 12000, amount: 24000 },
 { sno: 7, description: 'Earthing & Lightning Arrester', unit: 'Lot', qty: 1, rate: 25000, amount: 25000 },
 { sno: 8, description: 'Installation & Civil Works', unit: 'Lot', qty: 1, rate: 65000, amount: 65000 },
 ],
 'D003': [
 { sno: 1, description: '545W TOPCon Bifacial Panel', unit: 'Nos', qty: 275, rate: 18500, amount: 5087500 },
 { sno: 2, description: '100kW Growatt Central Inverter', unit: 'Nos', qty: 2, rate: 320000, amount: 640000 },
 { sno: 3, description: 'Wide-Span GI Mounting (Industrial)', unit: 'Set', qty: 15, rate: 22000, amount: 330000 },
 { sno: 4, description: '6mm†â€™…Â¡Â² DC Solar Cable', unit: 'Mtr', qty: 3000, rate: 58, amount: 174000 },
 { sno: 5, description: 'MC4 Connector Pairs', unit: 'Nos', qty: 550, rate: 85, amount: 46750 },
 { sno: 6, description: 'HT AC Panel & Metering', unit: 'Nos', qty: 1, rate: 85000, amount: 85000 },
 { sno: 7, description: 'Earthing, LA & Surge Protection', unit: 'Lot', qty: 1, rate: 45000, amount: 45000 },
 { sno: 8, description: 'Installation, Civil & Commissioning', unit: 'Lot', qty: 1, rate: 150000, amount: 150000 },
 ],
};

// AI recommendations †â€™project-type-aware
const AI_RECS = {
 'D001': { rec: 'Residential (10kW) †â€™Approved, PR 79.2%. PM-KUSUM subsidy applicable; net customer cost after 40% subsidy †â€™ †â€™2.5L. Simple payback < 5 years. Cost optimisation achieved.', severity: 'success' },
 'D002': { rec: 'Commercial (100kW) †â€™Tilt 20†â€™…Â¡Ã†â€™¾Ã‚Â¢22†â€™…Â¡adds +8% yield. Bifacial upgrade adds 4% at marginal cost; ROI-positive Year 2. Accelerated depreciation saves †â€™3.2L in Y1 tax.', severity: 'warning' },
 'D003': { rec: 'Industrial (150kW) †â€™BOQ pending. Wide row spacing (3.5m) eliminates inter-row shadow loss. IRR projected 14.8% / 25 yrs. Confirm DISCOM HT single-point approval.', severity: 'info' },
};

// †â€™†â€™Table columns †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const COLUMNS = [
 {
 key: 'id', header: 'Design ID',
 render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span>
 },
 {
 key: 'projectName', header: 'Project', sortable: true,
 render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span>
 },
 {
 key: 'projectType', header: 'Type',
 render: v => {
 const def = PROJECT_TYPE_LIST.find(t => t.id === v);
 const Icon = PT_ICON[v] || Sun;
 return (
 <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: def?.color }}>
 <Icon size={11} /> {def?.label ?? v}
 </span>
 );
 }
 },
 {
 key: 'systemSize', header: 'DC/AC (kW)', sortable: true,
 render: (v, row) => (
 <div>
 <span className="text-xs font-bold text-[var(--text-primary)]">{row.dcCapacity} kWp</span>
 <span className="text-[10px] text-[var(--text-muted)]"> / {v} kW AC</span>
 </div>
 )
 },
 {
 key: 'panels', header: 'Panels',
 render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span>
 },
 {
 key: 'estimatedCost', header: 'Est. Cost',
 render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{fmt(v)}</span>
 },
 {
 key: 'boqGenerated', header: 'BOQ',
 render: v => v
 ? <span className="text-[11px] font-semibold text-[var(--green)]">†â€™…â€œÅ“ Generated</span>
 : <span className="text-[11px] font-semibold text-amber-400">†â€™³ Pending</span>
 },
 {
 key: 'status', header: 'Status',
 render: v => <StatusBadge domain="design" value={v} />
 },
];

// †â€™†â€™Kanban stage defs †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const DESIGN_STAGES = [
 { id: 'Draft', label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
 { id: 'In Review', label: 'In Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
 { id: 'Approved', label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
 { id: 'Rejected', label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

// †â€™†â€™Project Type Selector †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const ProjectTypeSelector = ({ value, onChange }) => {
 const { projectTypeConfig } = useSettings();
 
 // Merge defaults with overrides from settings
 const projectTypes = useMemo(() => {
 return PROJECT_TYPE_LIST.map(pt => {
 const override = projectTypeConfig[pt.id] || {};
 return { ...pt, ...override };
 });
 }, [projectTypeConfig]);

 return (
 <div className="flex gap-1.5 flex-wrap">
 {projectTypes.map(pt => {
 const Icon = PT_ICON[pt.id] || Home;
 const isActive = value === pt.id;
 return (
 <button
 key={pt.id}
 type="button"
 onClick={() => onChange(pt.id)}
 className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${isActive 
 ? "bg-[var(--accent)] text-black border-transparent shadow-lg shadow-[var(--accent)]/20" 
 : "text-[var(--text-muted)] bg-[var(--bg-elevated)] border-[var(--border-base)] hover:border-[var(--accent)]/50"}`}
 >
 <Icon size={14} />
 {pt.label}
 {isActive && <CheckCircle size={12} className="ml-1" />}
 </button>
 );
 })}
 </div>
 );
};

// †â€™†â€™Project Type Badge (inline small chip) †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const ProjectTypeBadge = ({ typeId }) => {
 const { projectTypeConfig } = useSettings();
 const def = useMemo(() => {
 const base = PROJECT_TYPE_LIST.find(t => t.id === typeId);
 if (!base) return null;
 const override = projectTypeConfig[typeId] || {};
 return { ...base, ...override };
 }, [typeId, projectTypeConfig]);

 if (!def) return null;
 const Icon = PT_ICON[typeId] || Sun;
 return (
 <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border font-bold"
 style={{ color: def.color, background: def.bg, borderColor: def.border }}>
 <Icon size={9} /> {def.shortLabel || def.label}
 </span>
 );
};

// †â€™†â€™2D Panel Grid Visualiser †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const PanelGridVisualiser = ({ cfg, systemSizeKw }) => {
 const kw = parseFloat(systemSizeKw) || 50;
 const roofW = Math.round(Math.sqrt(kw * 8));
 const roofL = Math.round((kw * 8) / roofW);
 const grid = generatePanelGrid(cfg, roofW, roofL);

 const cellSize = Math.max(4, Math.min(10, Math.floor(200 / Math.max(grid.cols, grid.rows))));
 const gap = Math.max(1, Math.round(cfg.rowSpacing * cellSize / 2));

 return (
 <div className="space-y-3">
 <div className="flex items-center justify-between text-[11px]">
 <span className="text-[var(--text-muted)]">
 {grid.cols} cols †â€™„¢{grid.rows} rows = <strong className="text-[var(--text-primary)]">{grid.totalPanels} panels</strong>
 </span>
 <span className="text-[var(--text-muted)]">
 Coverage: <strong style={{ color: cfg.color }}>{grid.coverageRatio}%</strong>
 </span>
 </div>
 <div className="rounded-xl border border-[var(--border-base)] bg-[var(--bg-raised)] p-3 overflow-auto" style={{ maxHeight: 200 }}>
 <svg width={grid.cols * (cellSize + gap)} height={grid.rows * (cellSize + gap)} style={{ display: 'block' }}>
 {Array.from({ length: grid.rows }).map((_, r) =>
 Array.from({ length: grid.cols }).map((_, c) => (
 <rect key={`${r}-${c}`}
 x={c * (cellSize + gap)} y={r * (cellSize + gap)}
 width={cellSize} height={cellSize * (cfg.gridPattern === 'landscape' ? 0.5 : 1)}
 rx={1} fill={cfg.color} opacity={0.75}
 />
 ))
 )}
 </svg>
 </div>
 <div className="grid grid-cols-3 gap-2 text-[10px]">
 {[
 { l: 'Spacing', v: `${cfg.panelSpacing * 100}cm` },
 { l: 'Row Gap', v: `${cfg.rowSpacing}m` },
 { l: 'Density', v: cfg.layoutDensity, color: cfg.color },
 ].map(i => (
 <div key={i.l} className="p-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-base)] text-center">
 <p className="text-[var(--text-muted)]">{i.l}</p>
 <p className="font-bold" style={i.color ? { color: i.color } : {}}>{i.v}</p>
 </div>
 ))}
 </div>
 </div>
 );
};

// †â€™†â€™Financial Summary (mode-adaptive) †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const FinancialSummary = ({ cfg, systemSizeKw }) => {
 const fin = computeFinancials(cfg, systemSizeKw);
 const mode = cfg.financialMode;

 const rows = [
 { l: 'System CAPEX', v: fmt(fin.capex), color: 'text-[var(--text-primary)]', show: true },
 { l: `Subsidy (${cfg.subsidyPct}%)`, v: fin.subsidyAmt > 0 ? `†â€™¾Ã‚Â¢ ${fmt(fin.subsidyAmt)}` : '†â€™', color: 'text-amber-400', show: true },
 { l: 'Net CAPEX', v: fmt(fin.netCapex), color: 'text-[var(--text-primary)]', show: true },
 { l: 'Annual Energy', v: `${(fin.annualGen / 1000).toFixed(0)}k kWh`, color: 'text-[var(--primary-light)]', show: true },
 { l: 'Annual Savings', v: fmt(fin.annualSave), color: 'text-[var(--green)]', show: true },
 { l: 'Simple Payback', v: `${fin.payback} yrs`, color: 'text-amber-400', show: ['payback', 'roi', 'irr'].includes(mode) },
 { l: 'Year-1 ROI', v: `${fin.roi1}%`, color: 'text-[var(--green)]', show: ['roi', 'irr'].includes(mode) },
 { l: '25-Year IRR', v: fin.irr25 ? `${fin.irr25}%` : '†â€™', color: 'text-[var(--green)]', show: mode === 'irr' },
 { l: 'Depreciation Benefit (Y1)', v: fin.depBenefit > 0 ? fmt(fin.depBenefit) : '†â€™', color: 'text-purple-400', show: ['roi', 'irr'].includes(mode) },
 { l: 'Monthly EMI', v: fin.emi > 0 ? fmt(fin.emi) : '†â€™', color: 'text-[var(--primary-light)]', show: true },
 { l: 'CO†â€™Offset/yr', v: `${fin.co2Saved} t`, color: 'text-[var(--blue)]', show: true },
 ].filter(r => r.show);

 return (
 <div className="space-y-3">
 <div className="flex items-center gap-2 mb-1">
 <Target size={13} style={{ color: cfg.color }} />
 <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.aiObjectiveLabel}</span>
 </div>
 <div className="grid grid-cols-2 gap-2">
 {rows.map(r => (
 <div key={r.l} className="p-2.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
 <p className="text-[9px] text-[var(--text-faint)] uppercase tracking-wide mb-0.5">{r.l}</p>
 <p className={`text-xs font-extrabold ${r.color}`}>{r.v}</p>
 </div>
 ))}
 </div>
 <div className="flex gap-2 p-2.5 rounded-xl border text-[10px]"
 style={{ background: cfg.bg, borderColor: cfg.border }}>
 <Zap size={12} style={{ color: cfg.color }} className="shrink-0 mt-0.5" />
 <p style={{ color: cfg.color }} className="leading-relaxed font-medium">{cfg.aiObjectiveDesc}</p>
 </div>
 </div>
 );
};

// †â€™†â€™Design card †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const DesignCard = ({ design, cfg, onDragStart, onClick }) => {
 const aiRec = AI_RECS[design.id];
 return (
 <div draggable onDragStart={() => onDragStart(design.id)} onClick={() => onClick(design)}
 className="glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all space-y-2"
 style={{ borderLeft: `2px solid ${cfg?.color ?? 'transparent'}` }}
 >
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-mono text-[var(--accent-light)]">{design.id}</span>
 <ProjectTypeBadge typeId={design.projectType} />
 </div>
 <StatusBadge domain="design" value={design.status} />
 </div>
 <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{design.projectName}</p>
 <div className="grid grid-cols-3 gap-1 text-[10px]">
 <div className="glass-card p-1 text-center">
 <p className="text-[var(--text-muted)]">DC</p>
 <p className="font-bold text-[var(--solar)]">{design.dcCapacity}kWp</p>
 </div>
 <div className="glass-card p-1 text-center">
 <p className="text-[var(--text-muted)]">AC</p>
 <p className="font-bold text-[var(--text-primary)]">{design.systemSize}kW</p>
 </div>
 <div className="glass-card p-1 text-center">
 <p className="text-[var(--text-muted)]">Cost</p>
 <p className="font-bold text-[var(--green)]">{fmt(design.estimatedCost)}</p>
 </div>
 </div>
 {aiRec && (
 <p className="text-[9px] text-[var(--text-muted)] line-clamp-2 leading-relaxed border-t border-[var(--border-muted)] pt-1.5">
 {aiRec.rec}
 </p>
 )}
 </div>
 );
};

// †â€™†â€™Kanban board †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const DesignKanbanBoard = ({ designs, onStageChange, onCardClick, getTypeCfg }) => {
 const draggingId = useRef(null);
 const [dragOver, setDragOver] = useState(null);
 return (
 <div className="overflow-x-auto pb-3">
 <div className="flex gap-3 min-w-max">
 {DESIGN_STAGES.map(stage => {
 const cards = designs.filter(d => d.status === stage.id);
 const stageKw = cards.reduce((a, d) => a + d.systemSize, 0);
 const stageCost = cards.reduce((a, d) => a + d.estimatedCost, 0);
 return (
 <div key={stage.id}
 className={`flex flex-col w-64 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
 onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
 onDragLeave={() => setDragOver(null)}
 onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}
 >
 <div className="p-2.5 border-b border-[var(--border-base)]">
 <div className="flex items-center justify-between mb-0.5">
 <div className="flex items-center gap-2">
 <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
 <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
 </div>
 <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
 style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
 </div>
 <div className="flex items-center gap-2 text-[9px] text-[var(--text-muted)] pl-4">
 <span>{stageKw} kW</span><span>†â€™…Â¡Â·</span><span>{fmt(stageCost)}</span>
 </div>
 </div>
 <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
 {cards.map(d => (
 <DesignCard key={d.id} design={d}
 cfg={getTypeCfg(d.projectType)}
 onDragStart={id => { draggingId.current = id; }}
 onClick={onCardClick}
 />
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

// †â€™†â€™Main Page Component †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const DesignPage = () => {
 const { getProjectTypeCfg } = useSettings();
 const { can } = usePermissions();
 const { logCreate, logUpdate, logDelete, logStatusChange } = useAuditLog('design');

 // Permission guard helpers
 const guardCreate = () => {
 if (!can('design', 'create')) {
 toast.error('Permission denied: Cannot create designs');
 return false;
 }
 return true;
 };

 const guardEdit = () => {
 if (!can('design', 'edit')) {
 toast.error('Permission denied: Cannot edit designs');
 return false;
 }
 return true;
 };

 const guardDelete = () => {
 if (!can('design', 'delete')) {
 toast.error('Permission denied: Cannot delete designs');
 return false;
 }
 return true;
 };

 const guardApprove = () => {
 if (!can('design', 'approve')) {
 toast.error('Permission denied: Cannot approve designs');
 return false;
 }
 return true;
 };

 const guardExport = () => {
 if (!can('design', 'export')) {
 toast.error('Permission denied: Cannot export designs');
 return false;
 }
 return true;
 };

 const [designs, setDesigns] = useState(DESIGNS_EXT);
 const [view, setView] = useState('kanban');
 const [search, setSearch] = useState('');
 const [statusFilter, setFilter] = useState('All');
 const [typeFilter, setTypeFilter] = useState('all');
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
 const [showAdd, setShowAdd] = useState(false);
 const [selected, setSelected] = useState(null);
 const [activeTab, setActiveTab] = useState('overview');
 const [studioDesign, setStudioDesign] = useState(null); // {projectName, designName}

 // New design form state
 const [newType, setNewType] = useState(PROJECT_TYPES.RESIDENTIAL);
 const [newKw, setNewKw] = useState('');

 const STATUS_FILTERS = ['All', 'Draft', 'In Review', 'Approved', 'Rejected'];

 const handleStageChange = (id, newStage) => {
 if (!can('design', 'edit')) {
 toast.error('Permission denied: Cannot change design status');
 return;
 }
 const design = designs.find(d => d.id === id);
 setDesigns(prev => prev.map(d => d.id === id ? { ...d, status: newStage } : d));
 logStatusChange(design, design.status, newStage);
 };

 const filtered = useMemo(() => designs.filter(d =>
 (statusFilter === 'All' || d.status === statusFilter) &&
 (typeFilter === 'all' || d.projectType === typeFilter) &&
 d.projectName.toLowerCase().includes(search.toLowerCase())
 ), [designs, search, statusFilter, typeFilter]);

 const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

 // KPI rollups
 const approved = designs.filter(d => d.status === 'Approved').length;
 const inReview = designs.filter(d => d.status === 'In Review').length;
 const boqGenerated = designs.filter(d => d.boqGenerated).length;
 const totalKw = designs.reduce((a, d) => a + d.systemSize, 0);
 const totalEstCost = designs.reduce((a, d) => a + d.estimatedCost, 0);

 // Selected design helpers
 const selectedCfg = selected ? getProjectTypeCfg(selected.projectType) : null;
 const boqRows = selected ? (BOQ_TEMPLATES[selected.id] ?? []) : [];
 const boqTotal = boqRows.reduce((a, r) => a + r.amount, 0);
 const sim = selected ? computeFinancials(selectedCfg, selected.systemSize) : null;

 const ROW_ACTIONS = [
 { label: 'View Design', icon: Eye, onClick: row => { setSelected(row); setActiveTab('overview'); } },
 { label: 'Open 3D Studio', icon: Box, onClick: row => setStudioDesign({ projectName: row.projectName, designName: row.id }) },
 { label: 'Layout Preview', icon: LayoutGrid, onClick: row => { setSelected(row); setActiveTab('layout'); } },
 { label: 'View BOQ', icon: FileText, onClick: row => { setSelected(row); setActiveTab('boq'); } },
 { label: 'Financial Analysis', icon: BarChart2, onClick: row => { setSelected(row); setActiveTab('financials'); } },
 { label: 'Generate BOQ', icon: Package, onClick: () => { if (guardEdit()) console.log('Generate BOQ'); } },
 { label: 'Approve Design', icon: CheckCircle, onClick: () => { if (guardApprove()) console.log('Approve Design'); } },
 ];

 return (
 <div className="animate-fade-in space-y-5">

 {/* †â€™†â€™Header †â€™†â€™*/}
 <PageHeader
 title="Design & BOQ"
 subtitle="Adaptive design studio †â€™panel layout †â€™…Â¡Â· BOQ †â€™…Â¡Â· financial engine †â€™…Â¡Â· AI optimisation"
 actions={[
 { type: 'button', label: '3D Studio', icon: Box, onClick: () => setStudioDesign({ projectName: 'New Project', designName: 'Design 1' }) },
 { type: 'button', label: 'New Design', icon: Plus, variant: 'primary', onClick: () => { if (guardCreate()) setShowAdd(true); } }
 ]}
 />

 {/* †â€™†â€™Project Type Selector Bar †â€™†â€™*/}
 <div className="glass-card px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
 <div className="shrink-0">
 <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-widest mb-1.5">Filter by Project Type</p>
 <div className="flex gap-1.5 flex-wrap">
 <button onClick={() => setTypeFilter('all')}
 className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${typeFilter === 'all' ? 'bg-[var(--accent)] text-black border-transparent' : 'text-[var(--text-muted)] bg-[var(--bg-elevated)] border-[var(--border-base)]'}`}>
 All Types
 </button>
 <ProjectTypeSelector value={typeFilter} onChange={v => { setTypeFilter(v); setPage(1); }} />
 </div>
 </div>
 {typeFilter !== 'all' && (() => {
 const cfg = getProjectTypeCfg(typeFilter);
 return (
 <>
 <div className="hidden sm:block w-px h-10 bg-[var(--border-base)] mx-2" />
 <div className="flex gap-4 flex-wrap text-[10px]">
 {[
 { l: 'Max Cap', v: `${cfg?.capacityMax} kW` },
 { l: 'Tilt', v: `${cfg?.tiltAngle}†â€™…Â¡` },
 { l: 'Row Spacing', v: `${cfg?.rowSpacing}m` },
 { l: 'Rate', v: `†â€™${cfg?.ratePerWp}/Wp` },
 { l: 'Tariff', v: `†â€™${cfg?.tariff}/kWh` },
 { l: 'AI Goal', v: cfg?.aiObjectiveLabel?.split(' ')[0] },
 ].map(i => (
 <div key={i.l}>
 <p className="text-[var(--text-faint)]">{i.l}</p>
 <p className="font-bold text-[var(--text-primary)]">{i.v}</p>
 </div>
 ))}
 </div>
 </>
 );
 })()}
 </div>

 {/* †â€™†â€™KPIs with descriptive labels †â€™†â€™*/}
 <div className="mb-2">
 <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
 <Pencil size={12} className="text-[var(--accent-light)]" />
 <span>Design Overview - Project designs and BOQ statistics</span>
 </p>
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 <KPICard label="Total Designs" value={designs.length} sub={`${totalKw} kW total capacity`} icon={Pencil} variant="indigo" />
 <KPICard label="Total Approved Designs" value={approved} sub="Ready for quotation" icon={CheckCircle} variant="emerald" />
 <KPICard label="Total Designs In Review" value={inReview} sub="Awaiting approval" icon={Layers} variant="amber" />
 <KPICard label="Total BOQs Generated" value={boqGenerated} sub={`${fmt(totalEstCost)} total value`} icon={FileText} variant="blue" />
 </div>
 </div>

 {/* †â€™†â€™Type breakdown †â€™†â€™*/}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {PROJECT_TYPE_LIST.map(pt => {
 const cfg = getProjectTypeCfg(pt.id);
 const ptDes = designs.filter(d => d.projectType === pt.id);
 const Icon = PT_ICON[pt.id];
 return (
 <div key={pt.id} className="glass-card p-4 flex items-start gap-3"
 style={{ borderLeft: `3px solid ${pt.color}` }}>
 <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
 style={{ background: pt.bg, border: `1px solid ${pt.border}` }}>
 <Icon size={15} style={{ color: pt.color }} />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-1">
 <p className="text-sm font-extrabold text-[var(--text-primary)]">{pt.label}</p>
 <span className="text-lg font-black" style={{ color: pt.color }}>{ptDes.length}</span>
 </div>
 <p className="text-[10px] text-[var(--text-muted)] mb-2 leading-relaxed">{pt.description}</p>
 <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
 <span className="text-[var(--text-faint)]">†â€™¤ <strong className="text-[var(--text-muted)]">{cfg?.capacityMax} kW</strong></span>
 <span className="text-[var(--text-faint)]">Tilt <strong className="text-[var(--text-muted)]">{cfg?.tiltAngle}†â€™…Â¡</strong></span>
 <span className="text-[var(--text-faint)]">†â€™<strong className="text-[var(--text-muted)]">{cfg?.ratePerWp}/Wp</strong></span>
 <span className="font-semibold" style={{ color: pt.color }}>{cfg?.financialMode?.toUpperCase()} focus</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* †â€™†â€™AI Banner †â€™†â€™*/}
 <div className="ai-banner">
 <div className="w-8 h-8 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-active)] flex items-center justify-center shrink-0">
 <Zap size={14} className="text-[var(--primary-light)]" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-bold text-[var(--primary-light)] mb-0.5">AI Design Optimisation †â€™Project Type Adaptive</p>
 <p className="text-xs text-[var(--text-muted)] leading-relaxed">
 <strong className="text-amber-400">Residential (D001)</strong> †â€™cost mode: PM-KUSUM saves †â€™2.5L, payback &lt;5 yrs.&nbsp;
 <strong className="text-[var(--primary-light)]">Commercial (D002)</strong> †â€™ROI mode: tilt +8% yield, depreciation †â€™3.2L Y1 benefit.&nbsp;
 <strong className="text-[var(--green)]">Industrial (D003)</strong> †â€™efficiency mode: wide row-spacing eliminates shadow loss, IRR 14.8%.
 </p>
 </div>
 </div>

 {/* †â€™†â€™Filters + View Toggle †â€™†â€™*/}
 <div className="flex flex-wrap gap-2 items-center">
 <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
 {STATUS_FILTERS.map(s => (
 <button key={s} onClick={() => { setFilter(s); setPage(1); }}
 className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}>{s}
 </button>
 ))}
 <div className="flex items-center gap-2 ml-auto">
 <Input placeholder="Search designs..." value={search}
 onChange={e => { setSearch(e.target.value); setPage(1); }}
 className="h-8 text-xs w-44" />
 <div className="view-toggle-pill">
 <button onClick={() => setView('kanban')}
 className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}
 title="Kanban view"><LayoutGrid size={13} /></button>
 <button onClick={() => setView('table')}
 className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}
 title="Table view"><List size={13} /></button>
 </div>
 </div>
 </div>

 {view === 'kanban' ? (
 <DesignKanbanBoard designs={filtered} onStageChange={handleStageChange}
 onCardClick={d => { setSelected(d); setActiveTab('overview'); }}
 getTypeCfg={getProjectTypeCfg}
 />
 ) : (
 <DataTable columns={COLUMNS} data={paginated} total={filtered.length}
 page={page} pageSize={pageSize}
 onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1); }}
 search={search} onSearch={v => { setSearch(v); setPage(1); }}
 rowActions={ROW_ACTIONS}
 />
 )}

 {/* †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
 NEW DESIGN MODAL †â€™type-adaptive form
 †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™*/}
 <Modal open={showAdd} onClose={() => setShowAdd(false)}
 title="New System Design"
 description="Select project type first †â€™form, rules, and financial model adapt automatically"
 size="lg"
 footer={
 <>
 <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
 <CanEdit module="design">
 <Button variant="outline" onClick={() => { if (guardEdit()) console.log('Save Draft'); }}>Save Draft</Button>
 </CanEdit>
 <CanCreate module="design">
 <Button onClick={() => { if (guardCreate()) { console.log('Create & Generate BOQ'); setShowAdd(false); } }}>Create &amp; Generate BOQ</Button>
 </CanCreate>
 </>
 }
 >
 {(() => {
 const cfg = getProjectTypeCfg(newType);
 const previewFin = newKw ? computeFinancials(cfg, parseFloat(newKw)) : null;
 return (
 <div className="space-y-4">
 {/* Mandatory project type selector */}
 <div>
 <p className="text-[11px] font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
 <Settings size={11} className="text-[var(--accent)]" />
 Project Type <span className="text-red-400">*</span>
 <span className="text-[9px] text-[var(--text-faint)] font-normal ml-1">(adapts design rules, financial model &amp; AI behaviour)</span>
 </p>
 <ProjectTypeSelector value={newType} onChange={setNewType} />
 {/* Live config summary strip */}
 <div className="mt-2 p-2.5 rounded-xl border text-[10px] flex flex-wrap gap-x-4 gap-y-1"
 style={{ background: cfg?.bg, borderColor: cfg?.border }}>
 <span className="font-bold w-full" style={{ color: cfg?.color }}>
 {cfg?.aiObjectiveLabel} †â€™…Â¡Â· {cfg?.financialMode?.toUpperCase()} financial model
 </span>
 <span className="text-[var(--text-muted)]">Cap: <b>†â€™¤{cfg?.capacityMax} kW</b></span>
 <span className="text-[var(--text-muted)]">Tilt: <b>{cfg?.tiltAngle}†â€™…Â¡</b></span>
 <span className="text-[var(--text-muted)]">Row spacing: <b>{cfg?.rowSpacing}m</b></span>
 <span className="text-[var(--text-muted)]">Rate: <b>†â€™{cfg?.ratePerWp}/Wp</b></span>
 <span className="text-[var(--text-muted)]">Subsidy: <b>{cfg?.subsidyLabel}</b></span>
 </div>
 </div>

 <div className="h-px bg-[var(--border-base)]" />

 <div className="grid grid-cols-2 gap-4">
 <FormField label="Survey Reference">
 <Select>
 <option value="">Select survey†â€™</option>
 <option>S001 †â€™Ramesh Joshi (10 kW Residential)</option>
 <option>S002 †â€™Malhotra Textiles (100 kW Commercial)</option>
 <option>S003 †â€™Parekh Ceramics (150 kW Industrial)</option>
 </Select>
 </FormField>
 <FormField label="Lead Designer">
 <Select>
 <option>Arjun Mehta</option>
 <option>Priya Patel</option>
 </Select>
 </FormField>

 <FormField label={`AC System Size (kW) †â€™max ${cfg?.capacityMax} kW`}>
 <Input type="number" placeholder={String(cfg?.capacityStep * 5)}
 min={cfg?.capacityMin} max={cfg?.capacityMax} step={cfg?.capacityStep}
 value={newKw} onChange={e => setNewKw(e.target.value)} />
 {parseFloat(newKw) > cfg?.capacityMax && (
 <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
 <AlertTriangle size={9} /> Exceeds {cfg?.capacityMax} kW limit for {cfg?.label}
 </p>
 )}
 </FormField>
 <FormField label={`DC/AC Ratio (default ${cfg?.dcAcRatio})`}>
 <Input type="number" placeholder={String(cfg?.dcAcRatio)} step="0.01" />
 </FormField>

 <FormField label="Recommended Panel">
 <Select>
 {cfg?.recommendedPanels?.map(p => <option key={p}>{p}</option>)
 }
 <option disabled>†â€™†â€™†â€™†â€™</option>
 <option>Other†â€™</option>
 </Select>
 </FormField>
 <FormField label="Recommended Inverter">
 <Select>
 {cfg?.recommendedInverters?.map(p => <option key={p}>{p}</option>)
 }
 <option disabled>†â€™†â€™†â€™†â€™</option>
 <option>Custom†â€™</option>
 </Select>
 </FormField>

 <FormField label={`Tilt Angle (†â€™…Â¡) †â€™default ${cfg?.tiltAngle}†â€™…Â¡`}>
 <Input type="number" placeholder={String(cfg?.tiltAngle)} min="0" max="45" />
 </FormField>
 <FormField label="Mounting Type">
 <Select>
 {cfg?.layoutDensity === 'wide'
 ? <><option>Ground Mount †â€™Fixed</option><option>Ground Mount †â€™Single-Axis Tracker</option></>
 : <><option>Rooftop Fixed Tilt (GI)</option><option>East-West Rooftop</option></>
 }
 </Select>
 </FormField>
 </div>

 {/* Live financial preview */}
 {previewFin && (
 <div className="p-3 rounded-xl border" style={{ background: cfg?.bg, borderColor: cfg?.border }}>
 <p className="text-[11px] font-bold mb-2.5 flex items-center gap-1.5" style={{ color: cfg?.color }}>
 <BarChart2 size={11} /> Live {cfg?.financialMode?.toUpperCase()} Preview
 </p>
 <div className="grid grid-cols-3 gap-2 text-[10px]">
 {[
 { l: 'Est. CAPEX', v: fmt(previewFin.capex) },
 { l: 'Net (post-sub)', v: fmt(previewFin.netCapex) },
 { l: 'Annual Save', v: fmt(previewFin.annualSave) },
 cfg?.financialMode === 'payback' ? { l: 'Payback', v: `${previewFin.payback} yrs` }
 : cfg?.financialMode === 'roi' ? { l: 'Y1 ROI', v: `${previewFin.roi1}%` }
 : { l: '25yr IRR', v: `${previewFin.irr25}%` },
 { l: 'Monthly EMI', v: fmt(previewFin.emi) },
 { l: 'CO†â€™Offset', v: `${previewFin.co2Saved} t/yr` },
 ].map(r => (
 <div key={r.l} className="p-2 rounded-lg bg-[var(--bg-overlay)] text-center">
 <p className="text-[var(--text-faint)]">{r.l}</p>
 <p className="font-bold text-[var(--text-primary)]">{r.v}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 <FormField label="Design Notes">
 <Textarea rows={2} placeholder={
 cfg?.shadowPriority === 'high'
 ? 'Industrial: inter-row shadow constraints, maintenance corridors, DISCOM HT connection details†â€™'
 : cfg?.financialMode === 'roi'
 ? 'Commercial: accelerated depreciation eligibility, net metering, ROI targets†â€™'
 : 'Residential: subsidy category, roof load limits, single-phase / 3-phase connection†â€™'
 } />
 </FormField>
 </div>
 );
 })()}
 </Modal>

 {/* †â€™†â€™DESIGN DETAIL MODAL footer †â€™add 3D Studio button †â€™†â€™*/}
 <Modal open={!!selected} onClose={() => setSelected(null)}
 title={selected ? `Design ${selected.id} †â€™${selected.projectName}` : ''}
 description={selected ? `${selected.systemSize} kW †â€™…Â¡Â· ${selected.designer} †â€™…Â¡Â· Created ${selected.created}` : ''}
 size="xl"
 footer={
 <>
 <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
 <Button
 variant="outline"
 onClick={() => {
 setStudioDesign({ projectName: selected.projectName, designName: selected.id });
 setSelected(null);
 }}
 >
 <Box size={13} /> Open 3D Studio
 </Button>
 <CanEdit module="design">
 <Button variant="outline" onClick={() => { if (guardExport()) console.log('Export BOQ'); }}><Download size={13} /> Export BOQ</Button>
 </CanEdit>
 {selected?.status === 'Draft' && (
 <CanEdit module="design">
 <Button variant="outline" onClick={() => { if (guardEdit()) console.log('Submit for Review'); }}>Submit for Review</Button>
 </CanEdit>
 )}
 {selected?.status === 'In Review' && (
 <CanAccess module="design" action="approve">
 <Button onClick={() => { if (guardApprove()) console.log('Approve Design'); }}>Approve Design</Button>
 </CanAccess>
 )}
 {selected?.status === 'Approved' && (
 <CanCreate module="quotation">
 <Button onClick={() => console.log('Create Quotation')}>Create Quotation</Button>
 </CanCreate>
 )}
 </>
 }
 >
 {selected && selectedCfg && (
 <div className="space-y-4">

 {/* Type context strip */}
 <div className="flex items-center gap-3 px-3 py-2 rounded-xl border flex-wrap"
 style={{ background: selectedCfg.bg, borderColor: selectedCfg.border }}>
 {(() => { const Icon = PT_ICON[selected.projectType]; return <Icon size={14} style={{ color: selectedCfg.color }} />; })()}
 <span className="text-xs font-bold" style={{ color: selectedCfg.color }}>{selectedCfg.label} Project</span>
 <span className="text-[10px] text-[var(--text-muted)]">†â€™…Â¡Â·</span>
 <span className="text-[10px] text-[var(--text-muted)]">{selectedCfg.aiObjectiveLabel}</span>
 <span className="text-[10px] text-[var(--text-muted)] ml-auto hidden sm:block">
 Max {selectedCfg.capacityMax} kW †â€™…Â¡Â· Row spacing {selectedCfg.rowSpacing}m †â€™…Â¡Â· Tilt {selectedCfg.tiltAngle}†â€™…Â¡
 </span>
 </div>

 {/* Tab bar */}
 <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
 {[
 { id: 'overview', label: 'Overview', icon: Layers },
 { id: 'layout', label: 'Layout', icon: LayoutGrid },
 { id: 'boq', label: 'BOQ', icon: FileText },
 { id: 'financials', label: 'Financials', icon: BarChart2 },
 ].map(({ id, label, icon: Ic }) => (
 <button key={id} onClick={() => setActiveTab(id)}
 className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === id ? 'text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
 }`}
 style={activeTab === id ? { background: selectedCfg.color } : {}}>
 <Ic size={11} /> {label}
 </button>
 ))}
 </div>

 {/* †â€™†â€™OVERVIEW †â€™†â€™*/}
 {activeTab === 'overview' && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-3">
 {[
 { l: 'Status', v: <StatusBadge domain="design" value={selected.status} /> },
 { l: 'Project Type', v: <ProjectTypeBadge typeId={selected.projectType} /> },
 { l: 'System DC', v: `${selected.dcCapacity} kWp` },
 { l: 'System AC', v: `${selected.systemSize} kW` },
 { l: 'Panel', v: selected.panels },
 { l: 'Inverter', v: selected.inverter },
 { l: 'Tilt / Azimuth', v: `${selected.tiltAngle}†â€™…Â¡/ ${selected.azimuth}†â€™…Â¡` },
 { l: 'Row Spacing', v: `${selectedCfg.rowSpacing} m` },
 { l: 'Layout Density', v: selectedCfg.layoutDensity },
 { l: 'Shadow Priority', v: selectedCfg.shadowPriority },
 { l: 'PR Target', v: `${selectedCfg.prTarget}%` },
 { l: 'Approved By', v: selected.approvedBy ?? '†â€™' },
 ].map(f => (
 <div key={f.l} className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
 <p className="label-muted mb-1">{f.l}</p>
 <div className="text-xs font-semibold text-[var(--text-primary)]">{f.v}</div>
 </div>
 ))}
 </div>
 {AI_RECS[selected.id] && (
 <div className="flex gap-3 p-3 rounded-xl border"
 style={{ background: selectedCfg.bg, borderColor: selectedCfg.border }}>
 <Zap size={14} style={{ color: selectedCfg.color }} className="shrink-0 mt-0.5" />
 <div>
 <p className="text-[11px] font-bold mb-0.5" style={{ color: selectedCfg.color }}>
 AI Insight †â€™{selectedCfg.aiObjectiveLabel}
 </p>
 <p className="text-xs text-[var(--text-muted)] leading-relaxed">{AI_RECS[selected.id].rec}</p>
 </div>
 </div>
 )}
 </div>
 )}

 {/* †â€™†â€™LAYOUT †â€™†â€™*/}
 {activeTab === 'layout' && (
 <div className="space-y-4">
 <div className="flex items-center gap-2">
 <LayoutGrid size={13} style={{ color: selectedCfg.color }} />
 <span className="text-xs font-bold text-[var(--text-primary)]">
 2D Panel Grid †â€™{selectedCfg.label} Layout Rules
 </span>
 </div>
 <PanelGridVisualiser cfg={selectedCfg} systemSizeKw={selected.systemSize} />
 <div className="grid grid-cols-2 gap-3">
 {[
 { l: 'Grid Pattern', v: selectedCfg.gridPattern },
 { l: 'Layout Density', v: selectedCfg.layoutDensity },
 { l: 'Panel Spacing', v: `${selectedCfg.panelSpacing * 100} cm` },
 { l: 'Row Spacing', v: `${selectedCfg.rowSpacing} m` },
 { l: 'Shadow Priority', v: selectedCfg.shadowPriority },
 { l: 'Maintenance', v: selectedCfg.maintenanceAccess },
 ].map(f => (
 <div key={f.l} className="p-2.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
 <p className="label-muted mb-0.5">{f.l}</p>
 <p className="text-xs font-bold text-[var(--text-primary)] capitalize">{f.v}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* †â€™†â€™BOQ †â€™†â€™*/}
 {activeTab === 'boq' && (
 <div className="space-y-3">
 {boqRows.length === 0 ? (
 <div className="flex flex-col items-center gap-3 py-8 text-[var(--text-muted)]">
 <Package size={32} className="opacity-30" />
 <p className="text-sm">BOQ not yet generated for this design.</p>
 <Button><Package size={13} /> Generate BOQ</Button>
 </div>
 ) : (
 <>
 <div className="overflow-x-auto rounded-xl border border-[var(--border-base)]">
 <table className="w-full text-xs">
 <thead>
 <tr className="bg-[var(--bg-raised)] border-b border-[var(--border-base)]">
 {['#', 'Description', 'Unit', 'Qty', 'Rate (†â€™)', 'Amount (†â€™)'].map(h => (
 <th key={h} className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase tracking-wide text-[10px]">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {boqRows.map(r => (
 <tr key={r.sno} className="border-b border-[var(--border-base)] hover:bg-[var(--bg-raised)] transition-colors">
 <td className="px-3 py-2 text-[var(--text-muted)]">{r.sno}</td>
 <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{r.description}</td>
 <td className="px-3 py-2 text-[var(--text-muted)]">{r.unit}</td>
 <td className="px-3 py-2 font-semibold">{r.qty.toLocaleString('en-IN')}</td>
 <td className="px-3 py-2 text-[var(--text-muted)]">{r.rate.toLocaleString('en-IN')}</td>
 <td className="px-3 py-2 font-bold text-[var(--text-primary)]">{r.amount.toLocaleString('en-IN')}</td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="border-t-2" style={{ background: selectedCfg.bg, borderColor: selectedCfg.border }}>
 <td colSpan={5} className="px-3 py-2 font-bold text-right uppercase tracking-wide text-[var(--text-primary)]">Total Material Cost</td>
 <td className="px-3 py-2 font-extrabold" style={{ color: selectedCfg.color }}>{boqTotal.toLocaleString('en-IN')}</td>
 </tr>
 </tfoot>
 </table>
 </div>
 <p className="text-[10px] text-[var(--text-faint)]">
 * Material cost only. GST @{selectedCfg.gstPct}% applicable. Installation & logistics charged separately.
 </p>
 </>
 )}
 </div>
 )}

 {/* †â€™†â€™FINANCIALS †â€™†â€™*/}
 {activeTab === 'financials' && sim && (
 <div className="space-y-4">
 <FinancialSummary cfg={selectedCfg} systemSizeKw={selected.systemSize} />
 <div className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
 <p className="text-[11px] font-bold text-[var(--text-primary)] mb-2">
 Simulation Assumptions †â€™{selectedCfg.label}
 </p>
 <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-[var(--text-muted)]">
 <div>Tariff: †â€™{selectedCfg.tariff}/kWh</div>
 <div>Irradiance: {selectedCfg.irradiance} kWh/kWp/yr</div>
 <div>Degradation: {selectedCfg.degradation}%/yr</div>
 <div>O&amp;M: †â€™{selectedCfg.omCostPerKwh}/kWh</div>
 <div>Project life: {selectedCfg.projectLife} yrs</div>
 <div>Inflation: {selectedCfg.inflationRate}% p.a.</div>
 {selectedCfg.depreciationPct > 0 && <div>Accl. Depreciation: {selectedCfg.depreciationPct}%</div>}
 {selectedCfg.corporateTaxPct > 0 && <div>Corp. Tax: {selectedCfg.corporateTaxPct}%</div>}
 </div>
 </div>
 <div className="flex gap-3 p-3 rounded-xl border"
 style={{ background: selectedCfg.bg, borderColor: selectedCfg.border }}>
 <TrendingUp size={14} style={{ color: selectedCfg.color }} className="shrink-0 mt-0.5" />
 <p className="text-xs text-[var(--text-muted)]">
 <strong style={{ color: selectedCfg.color }}>
 {selectedCfg.financialMode === 'payback' ? `Payback ${sim.payback} years`
 : selectedCfg.financialMode === 'roi' ? `Year-1 ROI ${sim.roi1}%`
 : `25-Year IRR ${sim.irr25}%`}
 </strong>
 {' '}†â€™{selectedCfg.aiObjectiveDesc}
 </p>
 </div>
 </div>
 )}

 </div>
 )}
 </Modal>

 {/* †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
 SOLAR 3D DESIGN STUDIO †â€™Full screen overlay
 †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™*/}
 {studioDesign && (
 <SolarSurveyStudio
 projectName={studioDesign.projectName}
 onClose={() => setStudioDesign(null)}
 />
 )}

 </div>
 );
};

export default DesignPage;

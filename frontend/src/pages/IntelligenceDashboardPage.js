// Solar OS �’� AI Intelligence Center
// Real-time AI-powered business intelligence & trade decision assistant UI. Pure frontend. No backend, no API calls.
// All intelligence derived from mock data via useIntelligenceStore.

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { KPICard } from '../components/ui/KPICard';
import {
 Brain, RefreshCw, TrendingUp, TrendingDown, AlertTriangle,
 CheckCircle, Users, MapPin, Pencil, FileText, FolderOpen,
 Wrench, DollarSign, Package, UserX, ShieldCheck, Sparkles,
 IndianRupee, Activity, Target, Zap, ArrowUpRight, ArrowDownRight,
 Clock, ChevronRight, Eye, CircleDot, Gauge,
} from 'lucide-react';
import { useIntelligenceStore } from '../hooks/useIntelligenceStore';
import { CURRENCY } from '../config/app.config';

const fmt = CURRENCY.format;

// �’�’�’ICON MAP (for dynamic icon lookup) �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const ICON_MAP = {
 Users, MapPin, Pencil, FileText, FolderOpen, Wrench, DollarSign,
 Package, UserX, ShieldCheck, Sparkles, IndianRupee, AlertTriangle,
 CheckCircle, TrendingUp, TrendingDown, Activity, Target,
 Brain, CircleDot,
};

const Ic = ({ name, size = 14, className = '', style }) => {
 const C = ICON_MAP[name] || CircleDot;
 return <C size={size} className={className} style={style} />;
};

// �’�’�’COLOUR HELPERS �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const scoreColor = s => s >= 75 ? 'text-[var(--green)]' : s >= 50 ? 'text-amber-400' : 'text-red-400';
const scoreBg = s => s >= 75 ? 'from-emerald-500 to-teal-400' : s >= 50 ? 'from-amber-500 to-orange-400' : 'from-red-500 to-rose-400';
const priorityBadge = p => p === 'High'
 ? 'bg-red-500/15 border-red-500/30 text-red-400'
 : p === 'Medium'
 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
 : 'bg-[var(--green)]/15 border-[var(--green)]/30 text-[var(--green)]';
const alertColor = c => ({
 red: 'border-red-500/25 bg-red-500/5',
 amber: 'border-amber-500/25 bg-amber-500/5',
 emerald: 'border-[var(--green)]/25 bg-[var(--green)]/5',
 blue: 'border-[var(--border-active)] bg-[var(--bg-hover)]',
}[c] || 'border-[var(--border-base)] bg-[var(--bg-raised)]');
const alertIconColor = c => ({
 red: 'text-red-400', amber: 'text-amber-400', emerald: 'text-[var(--green)]', blue: 'text-[var(--primary-light)]',
}[c] || 'text-[var(--accent)]');
const feedBadge = t => ({
 critical: 'bg-red-500/20 text-red-400',
 warning: 'bg-amber-500/20 text-amber-400',
 success: 'bg-[var(--green)]/20 text-[var(--green)]',
 info: 'bg-[var(--bg-hover)] text-[var(--primary-light)]',
}[t] || 'bg-[var(--bg-elevated)] text-[var(--text-muted)]');
const riskBadge = r => r === 'High'
 ? 'bg-red-500/15 border-red-500/30 text-red-400'
 : r === 'Medium'
 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
 : 'bg-[var(--green)]/15 border-[var(--green)]/30 text-[var(--green)]';

// �’�’�’ANIMATED COUNTER �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const AnimatedNumber = ({ to, prefix = '', suffix = '', duration = 1200 }) => {
 const [display, setDisplay] = useState(0);
 const frameRef = useRef(null);
 const startRef = useRef(null);
 const fromRef = useRef(0);

 useEffect(() => {
 const numTo = parseFloat(String(to).replace(/[^0-9.]/g, '')) || 0;
 fromRef.current = 0;
 startRef.current = null;

 const animate = (ts) => {
 if (!startRef.current) startRef.current = ts;
 const elapsed = ts - startRef.current;
 const progress = Math.min(elapsed / duration, 1);
 const eased = 1 - Math.pow(1 - progress, 3);
 setDisplay(fromRef.current + (numTo - fromRef.current) * eased);
 if (progress < 1) frameRef.current = requestAnimationFrame(animate);
 };
 frameRef.current = requestAnimationFrame(animate);
 return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
 }, [to, duration]);

 const formatted = typeof to === 'number'
 ? Math.round(display).toLocaleString('en-IN')
 : display.toFixed(1);

 return <span>{prefix}{formatted}{suffix}</span>;
};

// �’�’�’MINI PROGRESS BAR �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
// colorClass = Tailwind gradient classes (static), OR color = hex string for dynamic colors
const MiniBar = ({ value, colorClass, color }) => (
 <div className="w-full h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
 <div
 className={`h-full rounded-full transition-all duration-700 ${colorClass ? `bg-gradient-to-r ${colorClass}` : ''}`}
 style={{
 width: `${Math.min(100, Math.max(0, value))}%`,
 ...(color && !colorClass ? { background: `linear-gradient(90deg, ${color}cc, ${color})` } : {}),
 }}
 />
 </div>
);

// �’�’�’CIRCULAR SCORE WIDGET �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const CircularScore = ({ score, size = 160 }) => {
 const [animScore, setAnimScore] = useState(0);
 const frameRef = useRef(null);

 useEffect(() => {
 let start = null;
 const dur = 1400;
 const step = (ts) => {
 if (!start) start = ts;
 const p = Math.min((ts - start) / dur, 1);
 const eased = 1 - Math.pow(1 - p, 3);
 setAnimScore(Math.round(score * eased));
 if (p < 1) frameRef.current = requestAnimationFrame(step);
 };
 frameRef.current = requestAnimationFrame(step);
 return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
 }, [score]);

 const r = (size / 2) - 14;
 const circ = 2 * Math.PI * r;
 const dash = (animScore / 100) * circ;
 const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
 const trackColor = 'rgba(255,255,255,0.06)';

 return (
 <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
 <svg width={size} height={size} className="-rotate-90" style={{ position: 'absolute' }}>
 <circle cx={size / 2} cy={size / 2} r={r}
 fill="none" stroke={trackColor} strokeWidth="10" />
 <circle cx={size / 2} cy={size / 2} r={r}
 fill="none" stroke={color} strokeWidth="10"
 strokeLinecap="round"
 strokeDasharray={`${dash} ${circ}`}
 style={{ filter: `drop-shadow(0 0 10px ${color}66)` }}
 />
 </svg>
 <div className="flex flex-col items-center z-10">
 <span className="text-3xl font-black tabular-nums" style={{ color }}>{animScore}</span>
 <span className="text-[10px] text-[var(--text-faint)] font-medium tracking-wider">/ 100</span>
 </div>
 </div>
 );
};

// �’�’�’AI STATUS BADGE �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const AIStatusBadge = ({ status }) => {
 const map = {
 Learning: { dot: 'bg-[var(--green)]', ring: 'ring-emerald-400/40', text: 'text-[var(--green)]', label: '�’�¦�Learning' },
 Analyzing: { dot: 'bg-amber-400', ring: 'ring-amber-400/40', text: 'text-amber-400', label: '�’�¦�Analyzing' },
 Optimizing: { dot: 'bg-[var(--primary-light)]', ring: 'ring-[var(--primary-glow)]', text: 'text-[var(--primary-light)]', label: '�’�µ Optimizing' },
 };
 const s = map[status] || map.Optimizing;
 return (
 <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-muted)] bg-[var(--bg-raised)]`}>
 <span className={`w-2 h-2 rounded-full ${s.dot} ring-2 ${s.ring} animate-pulse`} />
 <span className={`text-[11px] font-bold ${s.text}`}>{status}</span>
 </div>
 );
};

// �’�’�’RISK BADGE �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const RiskBadge = ({ level }) => (
 <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${riskBadge(level)}`}>{level}</span>
);

// �’�’�’INSIGHT CARD �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const InsightCard = ({ title, children, className = '', action }) => (
 <div className={`glass-card overflow-hidden ${className}`}>
 <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--border-muted)]">
 <h3 className="text-[13px] font-bold text-[var(--text-primary)]">{title}</h3>
 {action && (
 <button className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-0.5">
 {action} <ChevronRight size={10} />
 </button>
 )}
 </div>
 <div className="p-4">{children}</div>
 </div>
);

// �’�’�’RECOMMENDATION LIST �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const RecommendationList = ({ alerts, onNavigate }) => (
 <div className="space-y-2.5">
 {alerts.map(alert => (
 <div key={alert.id}
 className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.005] cursor-default ${alertColor(alert.color)}`}>
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${alertColor(alert.color)}`}>
 <Ic name={alert.icon} size={14} className={alertIconColor(alert.color)} />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5 flex-wrap">
 <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${priorityBadge(alert.priority)}`}>
 {alert.priority}
 </span>
 <span className="text-[10px] text-[var(--text-faint)] font-medium">{alert.category}</span>
 <span className={`text-[10px] font-bold ml-auto ${alertIconColor(alert.color)}`}>{alert.metric}</span>
 </div>
 <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{alert.title}</p>
 <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{alert.detail}</p>
 </div>
 <button
 onClick={() => onNavigate?.(alert.action.page)}
 className="shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] font-semibold hover:bg-[var(--accent)]/20 transition-colors whitespace-nowrap"
 >
 {alert.action.label}
 </button>
 </div>
 ))}
 </div>
);

// �’�’�’HEALTH SCORE SECTION �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const HealthScoreSection = ({ health }) => {
 const subMetrics = [
 { label: 'Sales Health', val: health.salesHealth, icon: TrendingUp },
 { label: 'Project Execution', val: health.projectExecution, icon: FolderOpen },
 { label: 'Cash Flow', val: health.cashFlow, icon: DollarSign },
 { label: 'Inventory Stability', val: health.inventoryStability, icon: Package },
 { label: 'Team Efficiency', val: health.teamEfficiency, icon: Users },
 ];
 return (
 <div className="glass-card p-6 intelligence-hero-glow">
 <div className="flex flex-col lg:flex-row items-center gap-8">
 {/* Circular gauge */}
 <div className="flex flex-col items-center gap-3">
 <CircularScore score={health.overall} size={172} />
 <div className="text-center">
 <p className="text-sm font-extrabold text-[var(--text-primary)]">Business Health</p>
 <p className="text-[11px] text-[var(--text-muted)]">AI composite score</p>
 </div>
 </div>

 {/* Sub metrics */}
 <div className="flex-1 w-full space-y-3.5">
 {subMetrics.map(m => (
 <div key={m.label} className="group">
 <div className="flex items-center justify-between mb-1">
 <div className="flex items-center gap-2">
 <m.icon size={12} className="text-[var(--text-faint)]" />
 <span className="text-[11px] font-medium text-[var(--text-muted)]">{m.label}</span>
 </div>
 <div className="flex items-center gap-2">
 <span className={`text-xs font-bold ${scoreColor(m.val)}`}>
 <AnimatedNumber to={m.val} />
 </span>
 <span className="text-[10px] text-[var(--text-faint)]">/ 100</span>
 </div>
 </div>
 <div className="relative">
 <MiniBar value={m.val} colorClass={scoreBg(m.val)} />
 {/* Tooltip */}
 <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block z-10">
 <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg p-2 text-[10px] text-[var(--text-muted)] whitespace-nowrap shadow-lg">
 {m.val >= 75 ? '�’�“¦ On target' : m.val >= 50 ? '�’�’Needs attention' : '�’�¦Critical �’action required'}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Score interpretation */}
 <div className="lg:w-52 w-full space-y-2">
 <div className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-muted)]">
 <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider mb-2">Score Legend</p>
 {[
 { range: '75�’�100', label: 'Healthy', color: 'text-[var(--green)]', dot: 'bg-[var(--green)]' },
 { range: '50�’�74', label: 'Attention', color: 'text-amber-400', dot: 'bg-amber-400' },
 { range: '0�’�49', label: 'Critical', color: 'text-red-400', dot: 'bg-red-400' },
 ].map(r => (
 <div key={r.range} className="flex items-center gap-2 mb-1.5">
 <div className={`w-2 h-2 rounded-full ${r.dot}`} />
 <span className={`text-[11px] font-semibold ${r.color}`}>{r.range}</span>
 <span className="text-[10px] text-[var(--text-muted)]">{r.label}</span>
 </div>
 ))}
 </div>
 <div className="p-3 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/15">
 <p className="text-[10px] text-[var(--text-faint)] uppercase font-bold tracking-wider mb-1">AI Verdict</p>
 <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
 {health.overall >= 75
 ? 'Operations running well. Monitor cash flow and inventory for sustained growth.'
 : health.overall >= 60
 ? 'Stable but 2�’�3 areas need intervention. Prioritise project execution and receivables.'
 : 'Multiple risk signals detected. Immediate escalation recommended on top alerts.'}
 </p>
 </div>
 </div>
 </div>
 </div>
 );
};

// �’�’�’PREDICTIVE PIPELINE �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const PredictivePipeline = ({ pipeline }) => (
 <div className="glass-card p-5">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
 <Activity size={12} className="text-[var(--accent)]" />
 </div>
 <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Predictive EPC Pipeline</h3>
 <span className="ml-auto text-[10px] text-[var(--text-faint)]">Live stage intelligence</span>
 </div>

 {/* Horizontal flow */}
 <div className="flex gap-2 overflow-x-auto pb-3">
 {pipeline.map((stage, i) => (
 <React.Fragment key={stage.stage}>
 <div className={`flex-shrink-0 w-32 rounded-xl border p-3 transition-all hover:scale-[1.02] cursor-default
 ${stage.glow ? 'shadow-lg ' + (stage.riskPct > 20 ? 'shadow-red-500/15' : 'shadow-amber-500/15') : ''}
 ${stage.glow ? 'border-[var(--border-base)]' : 'border-[var(--border-muted)]'}
 bg-[var(--bg-raised)]`}>
 <div className="flex items-center justify-between mb-2">
 <div className="w-6 h-6 rounded-lg flex items-center justify-center"
 style={{ backgroundColor: stage.color + '20', border: `1px solid ${stage.color}40` }}>
 <Ic name={stage.icon} size={11} className="" style={{ color: stage.color }} />
 </div>
 {stage.delayFlag && (
 <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Delay risk" />
 )}
 </div>
 <p className="text-[11px] font-bold text-[var(--text-primary)] mb-0.5">{stage.stage}</p>
 <p className="text-lg font-black tabular-nums" style={{ color: stage.color }}>
 <AnimatedNumber to={stage.count} duration={900} />
 </p>
 <p className="text-[9px] text-[var(--text-faint)] mb-2">{fmt(stage.value)}</p>

 {/* Risk & conversion */}
 <div className="space-y-1.5">
 <div>
 <div className="flex justify-between text-[9px] mb-0.5">
 <span className="text-[var(--text-faint)]">Conv.</span>
 <span className="font-bold" style={{ color: stage.color }}>{stage.convRate}%</span>
 </div>
 <MiniBar value={stage.convRate} color={stage.color} />
 </div>
 <div className={`text-[9px] px-1.5 py-0.5 rounded font-semibold text-center ${stage.riskPct > 20 ? 'bg-red-500/10 text-red-400' : stage.riskPct > 10 ? 'bg-amber-500/10 text-amber-400' : 'bg-[var(--green)]/10 text-[var(--green)]'}`}>
 {stage.riskPct}% risk
 </div>
 </div>
 </div>
 {i < pipeline.length - 1 && (
 <div className="flex items-center shrink-0">
 <ChevronRight size={14} className="text-[var(--text-faint)]" />
 </div>
 )}
 </React.Fragment>
 ))}
 </div>

 {/* Legend */}
 <div className="flex gap-4 pt-3 border-t border-[var(--border-muted)] text-[10px] text-[var(--text-faint)]">
 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />Delay risk stage</div>
 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--green)]" />Healthy</div>
 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />&gt;20% risk</div>
 </div>
 </div>
);

// �’�’�’PROJECT RISK GRID �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const ProjectRiskGrid = ({ risks }) => (
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
 {risks.map(p => (
 <div key={p.id} className={`glass-card p-4 hover:scale-[1.01] transition-all cursor-default
 ${p.riskLevel === 'High' ? 'border-l-2 border-l-red-500 shadow-red-500/10 shadow-md' :
 p.riskLevel === 'Medium' ? 'border-l-2 border-l-amber-500' : ''}`}>
 <div className="flex items-start justify-between gap-2 mb-3">
 <div>
 <span className="text-[10px] font-mono text-[var(--accent-light)]">{p.id}</span>
 <p className="text-xs font-bold text-[var(--text-primary)] leading-tight mt-0.5">{p.customerName}</p>
 <p className="text-[10px] text-[var(--text-faint)]">{p.site}</p>
 </div>
 <RiskBadge level={p.riskLevel} />
 </div>

 {/* Progress */}
 <div className="mb-3">
 <div className="flex justify-between text-[10px] mb-1">
 <span className="text-[var(--text-muted)]">{p.status}</span>
 <span className="font-bold text-[var(--text-primary)]">{p.progress}%</span>
 </div>
 <MiniBar value={p.progress}
 colorClass={p.progress >= 75 ? 'from-emerald-500 to-teal-400' :
 p.progress >= 40 ? 'from-[var(--primary)] to-[var(--primary-light)]' :
 'from-amber-500 to-orange-400'} />
 </div>

 {/* Risk factors */}
 {p.riskFactors.length > 0 ? (
 <div className="space-y-1">
 {p.riskFactors.slice(0, 2).map((f, i) => (
 <div key={i} className="flex items-start gap-1.5">
 <AlertTriangle size={9} className="text-amber-400 shrink-0 mt-0.5" />
 <span className="text-[10px] text-[var(--text-muted)] leading-tight">{f}</span>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex items-center gap-1.5">
 <CheckCircle size={10} className="text-[var(--green)]" />
 <span className="text-[10px] text-[var(--green)]">No active risk factors</span>
 </div>
 )}

 {/* AI explanation */}
 <p className="text-[9px] text-[var(--text-faint)] mt-2 pt-2 border-t border-[var(--border-muted)] leading-relaxed italic">
 {p.riskLevel === 'High'
 ? 'Based on milestone velocity and pending approvals.'
 : p.riskLevel === 'Medium'
 ? 'Monitor weekly �’moderate delay signals detected.'
 : 'AI confidence: low risk. Continue current trajectory.'}
 </p>
 </div>
 ))}
 </div>
);

// �’�’�’CASH FLOW FORECAST �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const CashFlowForecast = ({ forecast }) => {
 const maxVal = Math.max(...forecast.map(f => Math.max(f.inflow, f.outflow)));
 const HEIGHT = 100;

 return (
 <div className="space-y-5">
 {/* SVG Chart */}
 <div className="p-4 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-muted)]">
 <div className="flex items-center gap-4 mb-4">
 {[
 { label: 'Inflow', color: '#22c55e' },
 { label: 'Outflow', color: '#f97316' },
 { label: 'Net', color: '#3b82f6' },
 ].map(l => (
 <div key={l.label} className="flex items-center gap-1.5">
 <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
 <span className="text-[10px] text-[var(--text-muted)]">{l.label}</span>
 </div>
 ))}
 </div>
 <svg viewBox={`0 0 ${forecast.length * 80} ${HEIGHT + 40}`} className="w-full" style={{ height: 160 }}>
 {/* Grid lines */}
 {[0, 0.25, 0.5, 0.75, 1].map(r => (
 <line key={r} x1="0" y1={r * HEIGHT} x2={forecast.length * 80} y2={r * HEIGHT}
 stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
 ))}
 {/* Bars �’inflow */}
 {forecast.map((d, i) => {
 const bw = 18;
 const inflowH = (d.inflow / maxVal) * HEIGHT;
 const outflowH = (d.outflow / maxVal) * HEIGHT;
 const netH = Math.abs(d.net / maxVal) * (HEIGHT * 0.4);
 const cx = i * 80 + 40;
 return (
 <g key={d.month}>
 <rect x={cx - bw - 2} y={HEIGHT - inflowH} width={bw} height={inflowH}
 rx="3" fill="#22c55e" fillOpacity="0.7" />
 <rect x={cx + 2} y={HEIGHT - outflowH} width={bw} height={outflowH}
 rx="3" fill="#f97316" fillOpacity="0.7" />
 {/* Net dot */}
 <circle cx={cx} cy={HEIGHT - netH - (d.net > 0 ? 10 : 0)}
 r="3" fill="#3b82f6" />
 <text x={cx} y={HEIGHT + 18} textAnchor="middle"
 fill="rgba(255,255,255,0.4)" fontSize="10">{d.month}</text>
 </g>
 );
 })}
 {/* Net line */}
 <polyline
 points={forecast.map((d, i) => {
 const netH = Math.abs(d.net / maxVal) * (HEIGHT * 0.4);
 return `${i * 80 + 40},${HEIGHT - netH - (d.net > 0 ? 10 : 0)}`;
 }).join(' ')}
 fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" opacity="0.7"
 />
 </svg>
 </div>

 {/* Summary cards */}
 <div className="grid grid-cols-3 gap-3">
 <div className="p-3 rounded-xl bg-[var(--green)]/5 border border-[var(--green)]/15">
 <p className="text-[10px] text-[var(--green)] font-bold mb-1">Upcoming Inflows</p>
 <p className="text-sm font-extrabold text-[var(--green)]">{fmt(forecast[0]?.inflow)}</p>
 <p className="text-[10px] text-[var(--text-faint)]">Next 30 days (est.)</p>
 </div>
 <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
 <p className="text-[10px] text-orange-400 font-bold mb-1">Upcoming Payables</p>
 <p className="text-sm font-extrabold text-orange-400">{fmt(forecast[0]?.outflow)}</p>
 <p className="text-[10px] text-[var(--text-faint)]">Next 30 days (est.)</p>
 </div>
 <div className={`p-3 rounded-xl ${forecast[0]?.net > 0 ? 'bg-[var(--bg-hover)] border border-[var(--border-active)]' : 'bg-red-500/5 border border-red-500/15'}`}>
 <p className={`text-[10px] font-bold mb-1 ${forecast[0]?.net > 0 ? 'text-[var(--primary-light)]' : 'text-red-400'}`}>Net Position</p>
 <p className={`text-sm font-extrabold ${forecast[0]?.net > 0 ? 'text-[var(--primary-light)]' : 'text-red-400'}`}>{fmt(Math.abs(forecast[0]?.net))}</p>
 <p className="text-[10px] text-[var(--text-faint)]">{forecast[0]?.net > 0 ? 'Surplus' : '�’ Deficit'}</p>
 </div>
 </div>

 {/* Risk warning */}
 {forecast.some(f => f.net < 0) && (
 <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
 <AlertTriangle size={14} className="text-red-400 shrink-0" />
 <p className="text-xs text-red-400 font-medium">Cash deficit projected in upcoming months. Accelerate collections on overdue invoices.</p>
 </div>
 )}
 </div>
 );
};

// �’�’�’TEAM PERFORMANCE �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const TeamPerformance = ({ metrics }) => (
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
 {metrics.map(m => (
 <div key={m.dept} className="glass-card p-4 hover:scale-[1.01] transition-all cursor-default">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ backgroundColor: m.color + '20', border: `1px solid ${m.color}40` }}>
 <Ic name={m.icon} size={13} />
 </div>
 <span className="text-xs font-bold text-[var(--text-primary)]">{m.dept}</span>
 {m.trend === 'up'
 ? <ArrowUpRight size={12} className="text-[var(--green)] ml-auto" />
 : <ArrowDownRight size={12} className="text-red-400 ml-auto" />}
 </div>

 <div className="mb-3">
 <div className="flex justify-between text-[10px] mb-1">
 <span className="text-[var(--text-muted)]">Productivity</span>
 <span className={`font-bold ${scoreColor(m.score)}`}>{m.score}</span>
 </div>
 <MiniBar value={m.score} colorClass={scoreBg(m.score)} />
 </div>

 <div className="space-y-1 text-[10px]">
 <div className="flex justify-between">
 <span className="text-[var(--text-faint)]">Tasks</span>
 <span className="font-semibold text-[var(--text-primary)]">{m.tasksCompleted}/{m.totalTasks}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-[var(--text-faint)]">Delay ratio</span>
 <span className={`font-semibold ${m.delayRatio > 20 ? 'text-red-400' : m.delayRatio > 10 ? 'text-amber-400' : 'text-[var(--green)]'}`}>
 {m.delayRatio}%
 </span>
 </div>
 <div className="flex items-center gap-1">
 {m.trend === 'up'
 ? <TrendingUp size={9} className="text-[var(--green)] shrink-0" />
 : <TrendingDown size={9} className="text-red-400 shrink-0" />}
 <span className={`text-[9px] ${m.trend === 'up' ? 'text-[var(--green)]' : 'text-red-400'}`}>
 {m.trend === 'up' ? '+' : '-'}{m.trendVal}% this week
 </span>
 </div>
 </div>

 <p className="text-[9px] text-[var(--text-faint)] mt-2.5 pt-2.5 border-t border-[var(--border-muted)] leading-relaxed italic">
 {m.insight}
 </p>
 </div>
 ))}
 </div>
);

// �’�’�’SIMULATOR PANEL �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const SimulatorPanel = () => {
 const [margin, setMargin] = useState(25);
 const [capacity, setCapacity] = useState(60);
 const [leadInflow, setLeadInflow] = useState(15);

 const baseRevenue = 15680000;
 const revenueForecast = Math.round(baseRevenue * (margin / 25) * (capacity / 60) * (leadInflow / 15) * 1.1);
 const workload = Math.round(Math.min(100, (capacity / 100) * 80 + (leadInflow / 30) * 20));
 const cashProjection = Math.round(revenueForecast * (margin / 100) * 0.65);
 const riskIndex = Math.max(1, Math.round(10 - (margin / 5) - (capacity / 20) + (leadInflow / 10)));

 return (
 <div className="space-y-5">
 {/* Sliders */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 {[
 { label: 'Target Margin (%)', val: margin, set: setMargin, min: 10, max: 40, color: '#22c55e', unit: '%' },
 { label: 'Installation Capacity (%)', val: capacity, set: setCapacity, min: 10, max: 100, color: '#3b82f6', unit: '%' },
 { label: 'Monthly Lead Inflow', val: leadInflow, set: setLeadInflow, min: 5, max: 50, color: '#f59e0b', unit: '' },
 ].map(s => (
 <div key={s.label} className="p-4 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-muted)]">
 <div className="flex justify-between items-center mb-3">
 <span className="text-[11px] font-bold text-[var(--text-primary)]">{s.label}</span>
 <span className="text-sm font-extrabold tabular-nums" style={{ color: s.color }}>
 {s.val}{s.unit}
 </span>
 </div>
 <input type="range" min={s.min} max={s.max} value={s.val}
 onChange={e => s.set(Number(e.target.value))}
 className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
 style={{
 background: `linear-gradient(to right, ${s.color} 0%, ${s.color} ${((s.val - s.min) / (s.max - s.min)) * 100}%, rgba(255,255,255,0.1) ${((s.val - s.min) / (s.max - s.min)) * 100}%, rgba(255,255,255,0.1) 100%)`,
 accentColor: s.color,
 }}
 />
 <div className="flex justify-between text-[9px] text-[var(--text-faint)] mt-1">
 <span>{s.min}{s.unit}</span><span>{s.max}{s.unit}</span>
 </div>
 </div>
 ))}
 </div>

 {/* Live outputs */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {[
 { label: 'Revenue Forecast', val: fmt(revenueForecast), color: '#22c55e', icon: TrendingUp, sub: '12-month projection' },
 { label: 'Team Workload', val: `${workload}%`, color: workload > 80 ? '#ef4444' : workload > 60 ? '#f59e0b' : '#22c55e', icon: Users, sub: 'Capacity utilisation' },
 { label: 'Cash Projection', val: fmt(cashProjection), color: '#3b82f6', icon: DollarSign, sub: 'Net cash position' },
 { label: 'Risk Index', val: `${riskIndex}/10`, color: riskIndex > 7 ? '#ef4444' : riskIndex > 4 ? '#f59e0b' : '#22c55e', icon: Gauge, sub: 'Lower = safer' },
 ].map(o => (
 <div key={o.label} className="p-4 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-muted)] transition-all duration-300">
 <div className="flex items-center gap-2 mb-2">
 <o.icon size={13} style={{ color: o.color }} />
 <span className="text-[10px] text-[var(--text-muted)]">{o.label}</span>
 </div>
 <p className="text-xl font-black tabular-nums transition-all duration-500" style={{ color: o.color }}>{o.val}</p>
 <p className="text-[10px] text-[var(--text-faint)] mt-0.5">{o.sub}</p>
 </div>
 ))}
 </div>

 <p className="text-[10px] text-[var(--text-faint)] text-center italic">
 * Simulation uses mock business model. Adjust sliders to explore scenarios.
 </p>
 </div>
 );
};

// �’�’�’INSIGHT FEED �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const InsightFeed = ({ feed }) => {
 const [expanded, setExpanded] = useState(false);
 const shown = expanded ? feed : feed.slice(0, 6);

 return (
 <div className="space-y-2">
 {shown.map(f => (
 <div key={f.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-muted)] hover:border-[var(--border-base)] transition-colors">
 <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5 ${feedBadge(f.type)}`}>
 {f.type.toUpperCase()}
 </span>
 <p className="flex-1 text-[11px] text-[var(--text-muted)] leading-relaxed">{f.text}</p>
 <div className="flex items-center gap-1 shrink-0">
 <Clock size={9} className="text-[var(--text-faint)]" />
 <span className="text-[9px] text-[var(--text-faint)] whitespace-nowrap">{f.ts}</span>
 </div>
 </div>
 ))}
 <button
 onClick={() => setExpanded(e => !e)}
 className="w-full py-2 text-[11px] text-[var(--accent)] hover:underline flex items-center justify-center gap-1"
 >
 {expanded ? '�’Show less' : `�’� Show ${feed.length - 6} more observations`}
 </button>
 </div>
 );
};

// �’�’�’SKELETON CARD �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const SkeletonCard = ({ h = 'h-24', className = '' }) => (
 <div className={`glass-card ${h} animate-shimmer ${className}`} />
);

// �’�’�’GLOBAL KPI SNAPSHOT �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const GlobalKPISnapshot = ({ kpis, isRefreshing }) => {
 const items = [
 { key: 'revenueForecast', label: 'Revenue Forecast', icon: TrendingUp, variant: 'emerald' },
 { key: 'conversionRate', label: 'Conversion Rate', icon: Target, variant: 'blue' },
 { key: 'avgProjectDuration', label: 'Avg Project Time', icon: Clock, variant: 'purple' },
 { key: 'installationLoad', label: 'Install Load', icon: Wrench, variant: 'amber' },
 { key: 'cashRiskIndex', label: 'Cash Risk Index', icon: Gauge, variant: 'indigo' },
 { key: 'inventoryTurnover', label: 'Inventory Turn', icon: Package, variant: 'indigo' },
 ];

 if (isRefreshing) {
 return (
 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
 {items.map(item => <SkeletonCard key={item.key} h="h-28" />)}
 </div>
 );
 }

 return (
 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
 {items.map(item => {
 const d = kpis[item.key];
 return (
 <KPICard
 key={item.key}
 label={item.label}
 value={d?.val || '-'}
 sub={d?.sub}
 icon={item.icon}
 variant={item.variant}
 trend={d?.trend}
 trendUp={d?.up}
 />
 );
 })}
 </div>
 );
};

// �’�’�’SECTION HEADER �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const SectionHeader = ({ icon: Icon, title, subtitle, color = 'var(--accent)' }) => (
 <div className="flex items-center gap-3 mb-4">
 <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
 style={{ backgroundColor: color + '18', border: `1px solid ${color}30` }}>
 <Icon size={15} style={{ color }} />
 </div>
 <div>
 <h2 className="text-sm font-bold text-[var(--text-primary)]">{title}</h2>
 {subtitle && <p className="text-[10px] text-[var(--text-faint)]">{subtitle}</p>}
 </div>
 </div>
);

// �’�’�’DATE RANGE SELECTOR �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const DATE_RANGES = ['Today', 'Last 7 days', 'Last 30 days', 'Last Quarter', 'YTD'];

// �’�’�’SECTION WRAPPER with skeleton fallback �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const SectionWrap = ({ loading, skeletonH = 'h-40', children }) =>
 loading ? <SkeletonCard h={skeletonH} /> : children;

// �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
// MAIN PAGE
// �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
const IntelligenceDashboardPage = ({ onNavigate }) => {
 const {
 intelligence, lastRefresh, isRefreshing, refresh, aiStatus, dateRange, setDateRange,
 } = useIntelligenceStore();

 const { health, alerts, pipeline, risks, cashForecast, teamMetrics, insightFeed, globalKPIs } = intelligence;

 const [showToast, setShowToast] = useState(false);
 const [brainPulse, setBrainPulse] = useState(false);

 const handleRefresh = () => {
 setBrainPulse(true);
 setTimeout(() => setBrainPulse(false), 1500);
 refresh();
 setShowToast(true);
 setTimeout(() => setShowToast(false), 3000);
 };

 const lastRefreshStr = new Date(lastRefresh).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
 const highPriorityCount = alerts.filter(a => a.priority === 'High').length;

 return (
 <div className="animate-fade-in space-y-8 relative">

 {/* �’�’Refresh toast �’�’*/}
 {showToast && (
 <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl
 bg-[var(--bg-surface)] border border-[var(--green)]/30 shadow-xl shadow-black/30 animate-slide-up">
 <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
 <span className="text-[11px] font-semibold text-[var(--text-primary)]">AI insights refreshed</span>
 <Clock size={10} className="text-[var(--text-faint)]" />
 <span className="text-[10px] text-[var(--text-faint)]">{lastRefreshStr}</span>
 </div>
 )}

 {/* �’�’PAGE HEADER �’�’*/}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div className="flex items-center gap-3">
 {/* Brain icon with pulse on refresh */}
 <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300
 ${brainPulse ? 'bg-violet-500/25 border-violet-400/50 shadow-lg shadow-violet-500/25 scale-110'
 : 'bg-violet-500/10 border-violet-500/20'}
 border`}>
 <Brain size={20} className={`transition-colors ${brainPulse ? 'text-violet-300' : 'text-violet-400'}`} />
 </div>
 <div>
 <h1 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
 AI Intelligence Center
 {highPriorityCount > 0 && (
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-bold">
 {highPriorityCount} urgent
 </span>
 )}
 </h1>
 <p className="text-xs text-[var(--text-muted)] mt-0.5">
 Operational intelligence �’�¡· derived from all modules �’�¡· updated {lastRefreshStr}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2 flex-wrap">
 <AIStatusBadge status={aiStatus} />

 {/* Date range pills */}
 <div className="view-toggle-pill">
 {DATE_RANGES.map(d => (
 <button key={d} onClick={() => setDateRange(d)}
 className={`view-toggle-btn whitespace-nowrap ${dateRange === d ? 'active' : ''}`}>
 {d}
 </button>
 ))}
 </div>

 <button onClick={handleRefresh} disabled={isRefreshing}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-raised)]
 border border-[var(--border-muted)] text-[11px] font-semibold
 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-violet-500/40
 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
 <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
 {isRefreshing ? 'Refreshing�’' : 'Refresh Insights'}
 </button>
 </div>
 </div>

 {/* �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
 KPI STRIP �’always-visible 6-up grid
 �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’*/}
 <GlobalKPISnapshot kpis={globalKPIs} isRefreshing={isRefreshing} />

 {/* �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
 SECTION 1 �’�¡· BUSINESS HEALTH SCORE
 �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’*/}
 <section>
 <SectionHeader icon={Gauge} title="Business Health Score"
 subtitle="AI composite score across 5 operational dimensions"
 color="#22c55e" />
 <SectionWrap loading={isRefreshing} skeletonH="h-52">
 <HealthScoreSection health={health} />
 </SectionWrap>
 </section>

 {/* �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
 SECTION 2 �’�¡· AI RECOMMENDED ACTIONS
 �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’*/}
 <section>
 <SectionHeader icon={Brain}
 title="�’�  Recommended Actions"
 subtitle={`${highPriorityCount} high-priority �’�¡· ${alerts.length} total actions from AI analysis`}
 color="#8b5cf6" />
 <SectionWrap loading={isRefreshing} skeletonH="h-64">
 <div className="glass-card p-5">
 <RecommendationList alerts={alerts} onNavigate={onNavigate} />
 </div>
 </SectionWrap>
 </section>

 {/* �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
 SECTION 3 �’�¡· PREDICTIVE PIPELINE
 �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’*/}
 <section>
 <SectionHeader icon={Activity} title="Predictive EPC Pipeline"
 subtitle="Full lifecycle: Lead �’� Survey �’� Design �’� Quote �’� Project �’� Install �’� Commission �’� Finance"
 color="#3b82f6" />
 <SectionWrap loading={isRefreshing} skeletonH="h-56">
 <PredictivePipeline pipeline={pipeline} />
 </SectionWrap>
 </section>

 {/* �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
 SECTION 4 �’�¡· PROJECT RISK ANALYSIS
 �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’*/}
 <section>
 <SectionHeader icon={AlertTriangle} title="Project Risk Analysis"
 subtitle="AI-scored risk factors per active project �’milestone velocity + approval status"
 color="#f59e0b" />
 <SectionWrap loading={isRefreshing} skeletonH="h-48">
 <ProjectRiskGrid risks={risks} />
 </SectionWrap>
 </section>

 {/* �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
 SECTION 5 + 8 �’�¡· CASH FLOW + INSIGHT FEED
 �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’*/}
 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
 <section>
 <SectionHeader icon={DollarSign} title="Cash Flow Forecast"
 subtitle="6-month projected inflows, outflows & net position"
 color="#a78bfa" />
 <SectionWrap loading={isRefreshing} skeletonH="h-72">
 <InsightCard title="6-Month Projection">
 <CashFlowForecast forecast={cashForecast} />
 </InsightCard>
 </SectionWrap>
 </section>

 <section>
 <SectionHeader icon={Eye} title="AI Insight Feed"
 subtitle="Continuous operational observations �’auto-generated, timestamped"
 color="#f97316" />
 <SectionWrap loading={isRefreshing} skeletonH="h-72">
 <InsightCard title="Live Observations">
 <InsightFeed feed={insightFeed} />
 </InsightCard>
 </SectionWrap>
 </section>
 </div>

 {/* �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
 SECTION 6 �’�¡· TEAM PERFORMANCE
 �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’*/}
 <section>
 <SectionHeader icon={Users} title="Team Performance Intelligence"
 subtitle="Departmental productivity �’�¡· delay ratios �’�¡· trend direction �’�¡· AI observations"
 color="#06b6d4" />
 <SectionWrap loading={isRefreshing} skeletonH="h-44">
 <TeamPerformance metrics={teamMetrics} />
 </SectionWrap>
 </section>

 {/* �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’
 SECTION 7 �’�¡· DECISION SIMULATOR
 �’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’�’*/}
 <section>
 <SectionHeader icon={Zap}
 title="Decision Simulator"
 subtitle='"What happens if�’" �’interactive scenario sandbox �’�¡· pure UI math �’�¡· no backend'
 color="#ec4899" />
 <InsightCard title="�’�¦�º What happens if�’">
 <SimulatorPanel />
 </InsightCard>
 </section>

 {/* �’�’Footer �’�’*/}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-2
 pt-4 pb-2 border-t border-[var(--border-muted)] text-[10px] text-[var(--text-faint)]">
 <span>Solar OS AI Intelligence Center �’�¡· {dateRange} �’�¡· Last updated {lastRefreshStr}</span>
 <span className="text-violet-400/70">
 All insights derived from module data �’�¡· No external API calls
 </span>
 </div>
 </div>
 );
};

export default IntelligenceDashboardPage;

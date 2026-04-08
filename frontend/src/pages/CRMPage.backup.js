// Solar OS †â€™“ Lead Management Module (Enterprise Edition)
import React, { useState, useMemo, useCallback } from 'react';
import {
 Plus, Phone, Mail, MapPin, TrendingUp, Users, Zap, Eye,
 BarChart2, Search, Download, Upload, MoreVertical,
 ChevronDown, ChevronUp, X, Check, Clock, AlertTriangle,
 MessageSquare, FileText, Calendar, Target, Flame, Thermometer, Snowflake,
 ArrowRight, Activity, Layers, List, SlidersHorizontal, Bell, Tag,
 Building2, User, Timer, Trash2, Info, DollarSign,
 LayoutDashboard, TrendingDown, ChevronRight, Briefcase,
} from 'lucide-react';
import {
 LEADS, PIPELINE_STAGES, USERS, CUSTOMERS,
} from '../data/mockData';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import { CURRENCY } from '../config/app.config';
import CanAccess from '../components/CanAccess';

const fmt = CURRENCY.format;

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// CONSTANTS
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const SOURCES = ['All', 'Website', 'Referral', 'Campaign', 'Walk-in', 'LinkedIn', 'Facebook Ads', 'Google Ads'];
const CITIES = ['All', 'Ahmedabad', 'Surat', 'Rajkot', 'Vadodara', 'Morbi', 'Anand', 'Mumbai', 'Pune', 'Chennai', 'Gandhinagar'];
const STAGE_FILTERS = ['All', ...PIPELINE_STAGES.map(s => s.label)];
const REPS = ['All', ...USERS.filter(u => u.role === 'Sales' || u.role === 'Admin').map(u => u.name)];
const CATS = ['All', 'Commercial', 'Industrial', 'Agricultural', 'Residential'];
const SCORE_TIERS = [
 { label: 'Hot', min: 75, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Flame },
 { label: 'Warm', min: 45, color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: Thermometer },
 { label: 'Cold', min: 0, color: 'var(--text-faint)', bg: 'var(--bg-elevated)', icon: Snowflake },
];
const ACTIVITY_ICONS = { call: Phone, email: Mail, whatsapp: MessageSquare, note: FileText };
const ACTIVITY_COLORS = { call: '#22c55e', email: '#3b82f6', whatsapp: '#25d366', note: 'var(--text-faint)' };

const getStage = (id) => PIPELINE_STAGES.find(s => s.id === id) || PIPELINE_STAGES[0];
const getScoreTier = (score) => SCORE_TIERS.find(t => score >= t.min) || SCORE_TIERS[2];

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// MICRO COMPONENTS
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const ScoreBadge = ({ score, size = 'sm' }) => {
 const tier = getScoreTier(score);
 const Icon = tier.icon;
 return (
 <span
 className={`inline-flex items-center gap-1.5 ${size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-[10px]'} rounded-full font-bold border`}
 style={{ color: tier.color, background: tier.bg, borderColor: `${tier.color}40` }}
 >
 <Icon size={size === 'lg' ? 13 : 10} />
 {tier.label} †â€™…Â¡Â· {score}
 </span>
 );
};

const StagePill = ({ stageId, size = 'sm' }) => {
 const stage = getStage(stageId);
 return (
 <span
 className={`inline-flex items-center gap-1 ${size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'} rounded-full font-semibold`}
 style={{ color: stage.color, background: `${stage.color}18`, border: `1px solid ${stage.color}35` }}
 >
 <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: stage.color }} />
 {stage.label}
 </span>
 );
};

const SLATimer = ({ slaHours, breached }) => {
 if (!slaHours) return null;
 return (
 <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${breached ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
 <Timer size={9} />{breached ? 'SLA Breached' : `${slaHours}h SLA`}
 </span>
 );
};

const SourceBadge = ({ source }) => {
 const colors = { Website: '#3b82f6', Referral: '#22c55e', Campaign: '#f59e0b', 'Walk-in': '#a855f7', LinkedIn: '#0077b5', 'Facebook Ads': '#1877f2', 'Google Ads': '#ea4335' };
 const c = colors[source] || '#94a3b8';
 return (
 <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ color: c, background: `${c}18`, border: `1px solid ${c}30` }}>
 {source}
 </span>
 );
};

const MiniKPI = ({ label, value, sub, icon: Icon, color }) => (
 <div className="glass-card p-4">
 <div className="flex items-start justify-between mb-2">
 <p className="text-[11px] text-[var(--text-faint)] font-medium">{label}</p>
 {Icon && (
 <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
 <Icon size={13} style={{ color }} />
 </div>
 )}
 </div>
 <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
 {sub && <p className="text-[10px] text-[var(--text-faint)] mt-1">{sub}</p>}
 </div>
);

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// KANBAN CARD
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const LeadCard = ({ lead, onSelect, isDragging }) => {
 const tier = getScoreTier(lead.score);
 const Icon = tier.icon;
 return (
 <div
 onClick={() => onSelect(lead)}
 className={`glass-card p-3.5 cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:shadow-lg border ${isDragging ? 'opacity-50 scale-95' : ''}`}
 >
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center gap-2 min-w-0">
 <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-amber-600 flex items-center justify-center text-black font-black text-[10px] shrink-0">
 {lead.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
 </div>
 <div className="min-w-0">
 <p className="text-xs font-bold text-[var(--text-primary)] truncate">{lead.name}</p>
 <p className="text-[10px] text-[var(--text-faint)] truncate">{lead.company}</p>
 </div>
 </div>
 <span className="inline-flex items-center gap-0.5 text-[10px] font-bold shrink-0 ml-1" style={{ color: tier.color }}>
 <Icon size={10} />{lead.score}
 </span>
 </div>
 <div className="flex items-center justify-between mb-2.5">
 <span className="text-xs font-extrabold text-[var(--text-primary)]">{fmt(lead.value)}</span>
 <SourceBadge source={lead.source} />
 </div>
 <div className="h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden mb-2.5">
 <div className="h-full rounded-full" style={{ width: `${lead.score}%`, background: `linear-gradient(90deg, ${tier.color}66, ${tier.color})` }} />
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1 text-[10px] text-[var(--text-faint)]">
 <MapPin size={9} />{lead.city}
 </div>
 <div className="flex items-center gap-1.5">
 {lead.slaBreached && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
 <span className="text-[9px] text-[var(--text-faint)]">{lead.age}d</span>
 </div>
 </div>
 {lead.tags?.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-2">
 {lead.tags.slice(0, 2).map(t => (
 <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-faint)] border border-[var(--border-subtle)]">{t}</span>
 ))}
 {lead.tags.length > 2 && <span className="text-[9px] text-[var(--text-faint)]">+{lead.tags.length - 2}</span>}
 </div>
 )}
 </div>
 );
};

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// KANBAN BOARD
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const KanbanBoard = ({ leads, onSelect, onStageChange }) => {
 const [dragging, setDragging] = useState(null);
 const [dragOver, setDragOver] = useState(null);

 const byStage = useMemo(() => {
 const map = {};
 PIPELINE_STAGES.forEach(s => { map[s.id] = []; });
 leads.forEach(l => { if (map[l.stage] !== undefined) map[l.stage].push(l); });
 return map;
 }, [leads]);

 const stageValue = (id) => byStage[id]?.reduce((s, l) => s + l.value, 0) || 0;

 return (
 <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 520 }}>
 {PIPELINE_STAGES.map(stage => {
 const stageLeads = byStage[stage.id] || [];
 const isOver = dragOver === stage.id;
 return (
 <div key={stage.id} className="shrink-0 flex flex-col rounded-xl border transition-all duration-150"
 style={{ width: 240, background: isOver ? `${stage.color}08` : 'var(--bg-surface)', borderColor: isOver ? `${stage.color}50` : 'var(--border-base)' }}
 onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
 onDrop={e => { e.preventDefault(); if (dragging && dragging.stage !== stage.id) onStageChange(dragging.id, stage.id); setDragging(null); setDragOver(null); }}
 onDragLeave={() => setDragOver(null)}
 >
 <div className="px-3 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
 <div className="flex items-center gap-2 min-w-0">
 <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: stage.color }} />
 <span className="text-[11px] font-bold text-[var(--text-primary)] truncate">{stage.label}</span>
 </div>
 <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: `${stage.color}18`, color: stage.color }}>{stageLeads.length}</span>
 </div>
 <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-raised)]">
 <div className="flex items-center justify-between">
 <span className="text-[9px] text-[var(--text-faint)]">{fmt(stageValue(stage.id))}</span>
 <span className="text-[9px] font-semibold" style={{ color: stage.color }}>{stage.prob}% prob</span>
 </div>
 </div>
 <div className="flex-1 overflow-y-auto p-2 space-y-2">
 {stageLeads.length === 0 && (
 <div className="flex flex-col items-center justify-center h-20 text-[10px] text-[var(--text-faint)]">
 <Layers size={16} className="mb-1 opacity-30" />Drop here
 </div>
 )}
 {stageLeads.map(lead => (
 <div key={lead.id} draggable
 onDragStart={e => { setDragging(lead); e.dataTransfer.effectAllowed = 'move'; }}
 onDragEnd={() => setDragging(null)}
 >
 <LeadCard lead={lead} onSelect={onSelect} isDragging={dragging?.id === lead.id} />
 </div>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 );
};

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// TABLE ROW (redesigned to match screenshot)
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// Avatar colours keyed by first letter
const AVATAR_PALETTE = ['#f59e0b', '#3b82f6', '#22c55e', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#ef4444', '#a855f7', '#06b6d4'];
const avatarColor = (name = '') => AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];

const TableRow = ({ lead, onSelect, selected, onToggle }) => {
 const tier = getScoreTier(lead.score);
 const stage = getStage(lead.stage);
 const ac = avatarColor(lead.name);
 return (
 <tr
 className={`border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-hover)] cursor-pointer group ${selected ? 'bg-[var(--accent)]/5' : ''}`}
 onClick={() => onSelect(lead)}
 >
 {/* Checkbox */}
 <td className="pl-4 pr-2 py-3 w-8" onClick={e => { e.stopPropagation(); onToggle(lead.id); }}>
 <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-muted)] group-hover:border-[var(--accent)]/50'}`}>
 {selected && <Check size={9} className="text-black" strokeWidth={3} />}
 </div>
 </td>

 {/* Lead / Company */}
 <td className="px-3 py-3 min-w-[160px]">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[10px] shrink-0"
 style={{ background: ac }}>
 {lead.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
 </div>
 <div className="min-w-0">
 <p className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">{lead.name}</p>
 <p className="text-[10px] text-[var(--text-faint)] truncate leading-tight mt-0.5">{lead.company}</p>
 </div>
 </div>
 </td>

 {/* Contact */}
 <td className="px-3 py-3 hidden md:table-cell min-w-[160px]">
 <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
 <Phone size={9} className="shrink-0 text-[var(--text-faint)]" />
 <span>{lead.phone}</span>
 </div>
 <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-faint)] mt-0.5">
 <Mail size={9} className="shrink-0" />
 <span className="truncate max-w-[120px]">{lead.email}</span>
 </div>
 </td>

 {/* Stage */}
 <td className="px-3 py-3 min-w-[130px]">
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap"
 style={{ color: stage.color, background: `${stage.color}18`, border: `1px solid ${stage.color}35` }}>
 <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: stage.color }} />
 {stage.label}
 </span>
 </td>

 {/* Score */}
 <td className="px-3 py-3 min-w-[90px]">
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
 style={{ color: tier.color, background: tier.bg, border: `1px solid ${tier.color}40` }}>
 {tier.label} †â€™…Â¡Â· {lead.score}
 </span>
 </div>
 </td>

 {/* Value */}
 <td className="px-3 py-3 min-w-[90px]">
 <p className="text-xs font-bold text-[var(--text-primary)]">{fmt(lead.value)}</p>
 <p className="text-[10px] text-[var(--text-faint)]">{lead.kw}</p>
 </td>

 {/* Source */}
 <td className="px-3 py-3 hidden lg:table-cell min-w-[90px]">
 <SourceBadge source={lead.source} />
 </td>

 {/* City */}
 <td className="px-3 py-3 hidden lg:table-cell min-w-[90px]">
 <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
 <MapPin size={9} className="shrink-0" />{lead.city}
 </div>
 </td>

 {/* Age */}
 <td className="px-3 py-3 hidden xl:table-cell min-w-[48px]">
 <span className={`text-[10px] font-semibold ${lead.age > 14 ? 'text-red-400' : lead.age > 7 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
 {lead.age}d
 </span>
 </td>

 {/* SLA */}
 <td className="px-3 py-3 hidden xl:table-cell min-w-[96px]">
 <SLATimer slaHours={lead.slaHours} breached={lead.slaBreached} />
 </td>

 {/* Actions */}
 <td className="px-3 py-3 min-w-[80px]">
 <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={e => { e.stopPropagation(); onSelect(lead); }}
 className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors"
 title="View"><Eye size={12} /></button>
 <button
 onClick={e => e.stopPropagation()}
 className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-faint)] hover:text-[var(--green)] transition-colors"
 title="Call"><Phone size={12} /></button>
 <button
 onClick={e => e.stopPropagation()}
 className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors"
 title="More"><MoreVertical size={12} /></button>
 </div>
 </td>
 </tr>
 );
};

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// AI SCORE BREAKDOWN
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const AIScoreBreakdown = ({ lead }) => {
 const factors = [
 { label: 'Monthly Bill', score: Math.min(100, Math.round(lead.monthlyBill / 1800)), icon: DollarSign },
 { label: 'System Size', score: Math.min(100, Math.round(parseFloat(lead.kw) * 0.4)), icon: Zap },
 { label: 'Roof Area', score: Math.min(100, Math.round(lead.roofArea / 20)), icon: Building2 },
 { label: 'Engagement', score: Math.min(100, (lead.activities || []).length * 20), icon: Activity },
 { label: 'Budget Match', score: Math.min(100, Math.round((lead.budget / (lead.value * 1.1)) * 100)), icon: Target },
 ];
 return (
 <div className="space-y-3">
 {factors.map(f => {
 const Icon = f.icon;
 return (
 <div key={f.label}>
 <div className="flex items-center justify-between mb-1">
 <div className="flex items-center gap-1.5">
 <Icon size={11} className="text-[var(--text-faint)]" />
 <span className="text-[11px] text-[var(--text-muted)]">{f.label}</span>
 </div>
 <span className="text-[11px] font-bold text-[var(--accent)]">{f.score}</span>
 </div>
 <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
 <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.score}%`, background: 'linear-gradient(90deg, var(--accent), #fbbf24)' }} />
 </div>
 </div>
 );
 })}
 </div>
 );
};

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// COMMUNICATION TIMELINE
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const CommunicationTimeline = ({ activities }) => {
 if (!activities || activities.length === 0)
 return <p className="text-[11px] text-[var(--text-faint)] text-center py-8">No activities yet</p>;
 return (
 <div className="space-y-1">
 {activities.map((act, i) => {
 const Icon = ACTIVITY_ICONS[act.type] || FileText;
 const color = ACTIVITY_COLORS[act.type] || '#94a3b8';
 return (
 <div key={act.id} className="flex gap-3">
 <div className="flex flex-col items-center">
 <div className="w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0" style={{ background: `${color}15`, borderColor: `${color}40` }}>
 <Icon size={11} style={{ color }} />
 </div>
 {i < activities.length - 1 && <div className="w-px flex-1 bg-[var(--border-subtle)] my-1" />}
 </div>
 <div className="pb-4 flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5 flex-wrap">
 <span className="text-[11px] font-semibold text-[var(--text-primary)] capitalize">{act.type}</span>
 <span className="text-[10px] text-[var(--text-faint)]">{act.ts}</span>
 <span className="text-[10px] text-[var(--text-faint)] ml-auto">by {act.by}</span>
 </div>
 <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{act.note}</p>
 </div>
 </div>
 );
 })}
 </div>
 );
};

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// LEAD DETAIL MODAL †â€™“ 360†â€™…Â¡VIEW
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const LeadDetailModal = ({ lead, onClose, onNavigate }) => {
 const [tab, setTab] = useState('overview');
 if (!lead) return null;
 const tier = getScoreTier(lead.score);
 const stageIndex = PIPELINE_STAGES.findIndex(s => s.id === lead.stage);
 const DETAIL_TABS = ['overview', 'timeline', 'site', 'energy', 'documents', 'logs'];

 return (
 <Modal open onClose={onClose} size="xl" title="">
 <div className="flex flex-col" style={{ maxHeight: '85vh' }}>
 {/* HEADER */}
 <div className="px-6 pt-2 pb-4 border-b border-[var(--border-base)]">
 <div className="flex items-start justify-between gap-4 flex-wrap">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-amber-600 flex items-center justify-center text-black font-black text-lg shadow-lg">
 {lead.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
 </div>
 <div>
 <h2 className="text-lg font-extrabold text-[var(--text-primary)]">{lead.name}</h2>
 <p className="text-sm text-[var(--text-muted)]">{lead.company}</p>
 <div className="flex items-center gap-2 mt-1.5 flex-wrap">
 <StagePill stageId={lead.stage} size="lg" />
 <ScoreBadge score={lead.score} size="lg" />
 <SLATimer slaHours={lead.slaHours} breached={lead.slaBreached} />
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2 flex-wrap shrink-0">
 <Button variant="outline" size="sm" className="flex items-center gap-1.5"><Phone size={12} /> Call</Button>
 <Button variant="outline" size="sm" className="flex items-center gap-1.5"><MessageSquare size={12} /> WhatsApp</Button>
 <Button variant="primary" size="sm" className="flex items-center gap-1.5"
 onClick={() => { onClose(); onNavigate?.('quotation'); }}>
 <FileText size={12} /> Convert
 </Button>
 </div>
 </div>

 {/* Stage progress */}
 <div className="mt-4 flex items-center gap-0">
 {PIPELINE_STAGES.filter(s => s.id !== 'lost').map((s, i, arr) => {
 const active = i <= stageIndex && lead.stage !== 'lost';
 const current = s.id === lead.stage;
 return (
 <React.Fragment key={s.id}>
 <div className="flex flex-col items-center" style={{ flex: 1 }}>
 <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2 transition-all"
 style={{ background: current ? s.color : active ? `${s.color}33` : 'var(--bg-elevated)', borderColor: active ? s.color : 'var(--border-base)', color: active ? (current ? '#000' : s.color) : 'var(--text-faint)' }}>
 {active && !current ? <Check size={8} strokeWidth={3} /> : i + 1}
 </div>
 <span className="text-[8px] text-[var(--text-faint)] mt-1 text-center leading-tight hidden sm:block" style={{ maxWidth: 60 }}>
 {s.label.split(' ')[0]}
 </span>
 </div>
 {i < arr.length - 1 && <div className="flex-1 h-px mb-4" style={{ background: active ? s.color : 'var(--border-base)' }} />}
 </React.Fragment>
 );
 })}
 </div>
 </div>

 {/* TAB NAV */}
 <div className="px-6 border-b border-[var(--border-base)] flex gap-4 overflow-x-auto">
 {DETAIL_TABS.map(t => (
 <button key={t} onClick={() => setTab(t)}
 className={`pb-2.5 pt-2 text-xs font-semibold capitalize whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-faint)] hover:text-[var(--text-secondary)]'}`}>
 {t === 'timeline' ? 'Communication' : t === 'logs' ? 'Activity Logs' : t}
 </button>
 ))}
 </div>

 {/* TAB CONTENT */}
 <div className="flex-1 overflow-y-auto px-6 py-4">

 {/* OVERVIEW */}
 {tab === 'overview' && (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 <div className="lg:col-span-2 space-y-4">
 {/* Stats grid */}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {[
 { label: 'System Size', value: lead.kw, icon: Zap },
 { label: 'Project Value', value: fmt(lead.value), icon: DollarSign },
 { label: 'Monthly Bill', value: `†â€™${(lead.monthlyBill / 1000).toFixed(0)}K`, icon: Activity },
 { label: 'Roof Area', value: `${lead.roofArea} sqft`, icon: Building2 },
 { label: 'Budget', value: fmt(lead.budget), icon: Target },
 { label: 'Lead Age', value: `${lead.age} days`, icon: Clock },
 ].map(f => {
 const Icon = f.icon;
 return (
 <div key={f.label} className="glass-card p-3">
 <div className="flex items-center gap-1.5 mb-1">
 <Icon size={10} className="text-[var(--accent)]" />
 <span className="text-[10px] text-[var(--text-faint)]">{f.label}</span>
 </div>
 <p className="text-sm font-bold text-[var(--text-primary)]">{f.value}</p>
 </div>
 );
 })}
 </div>

 {/* Contact */}
 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-3">Contact Information</p>
 <div className="grid grid-cols-2 gap-3">
 {[
 { icon: Phone, label: 'Phone', val: lead.phone },
 { icon: Mail, label: 'Email', val: lead.email },
 { icon: MapPin, label: 'Location', val: `${lead.city}, ${lead.state}` },
 { icon: User, label: 'Assigned', val: lead.assignedTo },
 ].map(c => {
 const Icon = c.icon;
 return (
 <div key={c.label} className="flex items-center gap-2">
 <Icon size={12} className="text-[var(--accent)] shrink-0" />
 <div className="min-w-0">
 <p className="text-[9px] text-[var(--text-faint)]">{c.label}</p>
 <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{c.val}</p>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Tags */}
 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-3">Tags</p>
 <div className="flex flex-wrap gap-1.5">
 {lead.tags?.map(t => (
 <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-base)]">
 <Tag size={9} />{t}
 </span>
 ))}
 <button className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] text-[var(--text-faint)] border border-dashed border-[var(--border-base)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
 <Plus size={9} />Tag
 </button>
 </div>
 </div>

 {/* Next steps */}
 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center gap-1.5"><Target size={12} className="text-[var(--accent)]" />Next Steps</p>
 <div className="space-y-2">
 {[
 { action: 'Schedule site survey', done: ['survey', 'proposal', 'negotiation', 'won'].includes(lead.stage) },
 { action: 'Send quotation', done: ['proposal', 'negotiation', 'won'].includes(lead.stage) },
 { action: 'Follow-up call', done: (lead.activities || []).some(a => a.type === 'call') },
 { action: 'Get PO / agreement', done: lead.stage === 'won' },
 ].map(s => (
 <div key={s.action} className="flex items-center gap-2.5">
 <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${s.done ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-muted)]'}`}>
 {s.done && <Check size={9} className="text-black" strokeWidth={3} />}
 </div>
 <span className={`text-xs ${s.done ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text-primary)]'}`}>{s.action}</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* RIGHT: AI Score */}
 <div className="space-y-4">
 <div className="glass-card p-4">
 <div className="flex items-center justify-between mb-3">
 <p className="text-xs font-bold text-[var(--text-primary)]">AI Lead Score</p>
 <ScoreBadge score={lead.score} />
 </div>
 <div className="flex items-center justify-center my-4">
 <div className="relative w-28 h-28">
 <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
 <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
 <circle cx="50" cy="50" r="40" fill="none" stroke={tier.color} strokeWidth="10"
 strokeDasharray={`${2 * Math.PI * 40 * lead.score / 100} ${2 * Math.PI * 40}`}
 strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <span className="text-2xl font-black" style={{ color: tier.color }}>{lead.score}</span>
 <span className="text-[9px] text-[var(--text-faint)]">/ 100</span>
 </div>
 </div>
 </div>
 <div className="text-center mb-4">
 <p className="text-xs font-bold" style={{ color: tier.color }}>{tier.label} Lead</p>
 <p className="text-[10px] text-[var(--text-faint)] mt-0.5">{getStage(lead.stage).prob}% conversion probability</p>
 </div>
 <AIScoreBreakdown lead={lead} />
 </div>

 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center gap-1.5"><Bell size={12} className="text-[var(--accent)]" />Follow-up</p>
 {lead.nextFollowUp ? (
 <>
 <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)]">
 <Calendar size={12} className="text-[var(--accent)] shrink-0" />
 <div>
 <p className="text-[10px] text-[var(--text-faint)]">Scheduled</p>
 <p className="text-xs font-bold text-[var(--text-primary)]">{lead.nextFollowUp}</p>
 </div>
 </div>
 <Button variant="outline" size="sm" className="w-full mt-2 text-[10px]">Reschedule</Button>
 </>
 ) : (
 <Button variant="outline" size="sm" className="w-full text-[10px]"><Plus size={10} className="mr-1" />Schedule Follow-up</Button>
 )}
 </div>

 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-2.5 flex items-center gap-1.5"><Info size={12} className="text-[var(--accent)]" />Quick Stats</p>
 <div className="space-y-2">
 {[
 { label: 'Source', value: lead.source },
 { label: 'Category', value: lead.category },
 { label: 'Roof Type', value: lead.roofType },
 { label: 'Created', value: lead.created },
 { label: 'Last Contact', value: lead.lastContact },
 { label: 'Activities', value: `${(lead.activities || []).length} interactions` },
 ].map(r => (
 <div key={r.label} className="flex items-center justify-between">
 <span className="text-[10px] text-[var(--text-faint)]">{r.label}</span>
 <span className="text-[10px] font-semibold text-[var(--text-primary)]">{r.value}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* COMMUNICATION */}
 {tab === 'timeline' && (
 <div className="max-w-2xl">
 <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
 <p className="text-xs font-bold text-[var(--text-primary)]">Communication History</p>
 <div className="flex gap-1.5 flex-wrap">
 {['call', 'email', 'whatsapp', 'note'].map(t => {
 const Icon = ACTIVITY_ICONS[t];
 return (
 <button key={t} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border border-[var(--border-base)] text-[var(--text-faint)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
 <Icon size={9} />Log {t}
 </button>
 );
 })}
 </div>
 </div>
 <CommunicationTimeline activities={lead.activities} />
 </div>
 )}

 {/* SITE */}
 {tab === 'site' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-3">Site Details</p>
 <div className="space-y-3">
 {[
 { label: 'Roof Type', value: lead.roofType },
 { label: 'Roof Area', value: `${lead.roofArea} sqft` },
 { label: 'Location', value: `${lead.city}, ${lead.state}` },
 { label: 'Coordinates', value: `${lead.lat}†â€™…Â¡N, ${lead.lng}†â€™…Â¡E` },
 ].map(r => (
 <div key={r.label} className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
 <span className="text-[11px] text-[var(--text-faint)]">{r.label}</span>
 <span className="text-[11px] font-semibold text-[var(--text-primary)]">{r.value}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="glass-card p-4 flex flex-col">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center gap-1.5"><MapPin size={12} className="text-[var(--accent)]" />Map View</p>
 <div className="flex-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] flex flex-col items-center justify-center min-h-36 text-center p-4">
 <MapPin size={24} className="text-[var(--accent)] mb-2" />
 <p className="text-xs font-semibold text-[var(--text-primary)]">{lead.city}, {lead.state}</p>
 <p className="text-[10px] text-[var(--text-faint)] mt-1">{lead.lat}†â€™…Â¡N †â€™…Â¡Â· {lead.lng}†â€™…Â¡E</p>
 <p className="text-[10px] text-[var(--text-faint)] mt-1">Map integration ready (Mapbox / Google)</p>
 </div>
 </div>
 <div className="glass-card p-4 md:col-span-2">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5"><Zap size={12} className="text-[var(--accent)]" />Shadow Analysis (Placeholder)</p>
 <div className="h-14 rounded-xl bg-[var(--bg-elevated)] border border-dashed border-[var(--accent)]/30 flex items-center justify-center">
 <span className="text-[11px] text-[var(--text-faint)]">Shadow analysis available after site survey completion</span>
 </div>
 </div>
 </div>
 )}

 {/* ENERGY */}
 {tab === 'energy' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-3">Energy Requirement</p>
 <div className="space-y-3">
 {[
 { label: 'Monthly Bill', value: `†â€™${lead.monthlyBill.toLocaleString()}` },
 { label: 'Monthly Consumption', value: `~${Math.round(lead.monthlyBill / 8)} kWh/mo` },
 { label: 'System Size', value: lead.kw },
 { label: 'Annual Generation', value: `~${parseFloat(lead.kw) * 1400} kWh` },
 ].map(r => (
 <div key={r.label} className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
 <span className="text-[11px] text-[var(--text-faint)]">{r.label}</span>
 <span className="text-[11px] font-bold text-[var(--text-primary)]">{r.value}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-3">ROI Estimate</p>
 <div className="space-y-3">
 {[
 { label: 'Investment', value: fmt(lead.value) },
 { label: 'Annual Saving', value: `†â€™${Math.round(lead.monthlyBill * 12 * 0.85).toLocaleString()}` },
 { label: 'Payback Period', value: `${(lead.value / (lead.monthlyBill * 12 * 0.85)).toFixed(1)} yrs` },
 { label: '25-Year ROI', value: `${Math.round(((lead.monthlyBill * 12 * 0.85 * 25 - lead.value) / lead.value) * 100)}%` },
 ].map(r => (
 <div key={r.label} className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
 <span className="text-[11px] text-[var(--text-faint)]">{r.label}</span>
 <span className="text-[11px] font-bold text-[var(--accent)]">{r.value}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* DOCUMENTS */}
 {tab === 'documents' && (
 <div>
 <div className="flex items-center justify-between mb-4">
 <p className="text-xs font-bold text-[var(--text-primary)]">Documents</p>
 <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-[10px]"><Upload size={10} />Upload</Button>
 </div>
 <div className="space-y-2">
 {[
 { name: 'Electricity Bill (Oct 25).pdf', size: '1.2 MB', date: '2026-02-20' },
 { name: 'Site Photo 1.jpg', size: '3.5 MB', date: '2026-02-22' },
 { name: 'Quotation Q001.pdf', size: '0.8 MB', date: '2026-02-23' },
 ].map(d => (
 <div key={d.name} className="flex items-center gap-3 p-3 glass-card hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors">
 <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
 <FileText size={13} className="text-[var(--accent)]" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{d.name}</p>
 <p className="text-[10px] text-[var(--text-faint)]">{d.size} †â€™…Â¡Â· {d.date}</p>
 </div>
 <button className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-faint)] hover:text-[var(--text-primary)]"><Download size={12} /></button>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* LOGS */}
 {tab === 'logs' && (
 <div>
 <p className="text-xs font-bold text-[var(--text-primary)] mb-4">Activity Logs</p>
 <div className="space-y-2">
 {[
 { text: `Stage changed †â€™¾Ã‚Â¢ ${getStage(lead.stage).label}`, by: 'Ravi Sharma', ts: lead.lastContact + ' 10:00' },
 { text: `Lead assigned to ${lead.assignedTo}`, by: 'Admin User', ts: lead.created + ' 14:05' },
 { text: 'Lead created from ' + lead.source, by: 'System', ts: lead.created + ' 14:00' },
 ].map((l, i) => (
 <div key={i} className="flex gap-3 p-3 glass-card">
 <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
 <div className="flex-1">
 <p className="text-xs text-[var(--text-primary)]">{l.text}</p>
 <p className="text-[10px] text-[var(--text-faint)] mt-0.5">{l.ts} †â€™…Â¡Â· {l.by}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </Modal>
 );
};

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// ADD LEAD MODAL (3-step)
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const AddLeadModal = ({ open, onClose }) => {
 const [step, setStep] = useState(0);
 const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', source: 'Website', city: '', kw: '', monthlyBill: '', roofType: 'RCC Flat', budget: '', assignedTo: 'Ravi Sharma', category: 'Commercial', stage: 'new' });
 const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
 const STEPS = ['Basic Info', 'Site & Energy', 'Assign & Confirm'];
 return (
 <Modal open={open} onClose={onClose} title="Add New Lead" size="md">
 <div className="flex items-center gap-2 mb-6">
 {STEPS.map((s, i) => (
 <React.Fragment key={s}>
 <button onClick={() => setStep(i)} className={`flex items-center gap-2 text-xs font-semibold transition-colors ${step === i ? 'text-[var(--accent)]' : step > i ? 'text-[var(--text-primary)]' : 'text-[var(--text-faint)]'}`}>
 <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${step === i ? 'bg-[var(--accent)] border-[var(--accent)] text-black' : step > i ? 'bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border-base)] text-[var(--text-faint)]'}`}>
 {step > i ? <Check size={9} strokeWidth={3} /> : i + 1}
 </span>
 <span className="hidden sm:inline">{s}</span>
 </button>
 {i < STEPS.length - 1 && <div className={`flex-1 h-px ${step > i ? 'bg-[var(--accent)]/50' : 'bg-[var(--border-base)]'}`} />}
 </React.Fragment>
 ))}
 </div>

 {step === 0 && (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <FormField label="Full Name"><Input placeholder="Ramesh Joshi" value={form.name} onChange={e => set('name', e.target.value)} /></FormField>
 <FormField label="Company"><Input placeholder="Joshi Industries" value={form.company} onChange={e => set('company', e.target.value)} /></FormField>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <FormField label="Phone"><Input placeholder="9876543210" value={form.phone} onChange={e => set('phone', e.target.value)} /></FormField>
 <FormField label="Email"><Input type="email" placeholder="email@company.com" value={form.email} onChange={e => set('email', e.target.value)} /></FormField>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <FormField label="Source"><Select value={form.source} onChange={e => set('source', e.target.value)}>{SOURCES.slice(1).map(s => <option key={s}>{s}</option>)}</Select></FormField>
 <FormField label="City"><Input placeholder="Ahmedabad" value={form.city} onChange={e => set('city', e.target.value)} /></FormField>
 </div>
 <FormField label="Stage"><Select value={form.stage} onChange={e => set('stage', e.target.value)}>{PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</Select></FormField>
 </div>
 )}
 {step === 1 && (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <FormField label="System Size (kW)"><Input placeholder="50" value={form.kw} onChange={e => set('kw', e.target.value)} /></FormField>
 <FormField label="Monthly Bill (†â€™)"><Input placeholder="45000" value={form.monthlyBill} onChange={e => set('monthlyBill', e.target.value)} /></FormField>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <FormField label="Roof Type"><Select value={form.roofType} onChange={e => set('roofType', e.target.value)}>{['RCC Flat', 'Industrial Shed', 'Tin Sheet', 'Sloped Tile'].map(t => <option key={t}>{t}</option>)}</Select></FormField>
 <FormField label="Category"><Select value={form.category} onChange={e => set('category', e.target.value)}>{CATS.slice(1).map(c => <option key={c}>{c}</option>)}</Select></FormField>
 </div>
 <FormField label="Budget (†â€™)"><Input placeholder="300000" value={form.budget} onChange={e => set('budget', e.target.value)} /></FormField>
 <div className="glass-card p-3 flex items-center gap-2 border-l-2 border-[var(--accent)]">
 <Zap size={12} className="text-[var(--accent)] shrink-0" />
 <p className="text-[10px] text-[var(--text-muted)]">AI score will be calculated automatically from the data above.</p>
 </div>
 </div>
 )}
 {step === 2 && (
 <div className="space-y-3">
 <FormField label="Assign To">
 <Select value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
 {USERS.filter(u => ['Sales', 'Admin'].includes(u.role)).map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
 </Select>
 </FormField>
 <FormField label="Notes"><Textarea placeholder="Additional notes..." rows={3} /></FormField>
 <div className="glass-card p-3 bg-[var(--accent)]/5 border border-[var(--accent)]/20">
 <p className="text-xs font-bold text-[var(--accent)] mb-2">Auto-Actions on Create</p>
 <div className="space-y-1">
 {['Duplicate detection (phone + email)', 'Auto-tag by source', 'AI score calculation', 'SLA timer start (2hr contact)', `Assign to ${form.assignedTo}`].map(a => (
 <p key={a} className="text-[10px] text-[var(--text-muted)]">†â€™…â€œÅ“ {a}</p>
 ))}
 </div>
 </div>
 </div>
 )}

 <div className="flex justify-between mt-6 pt-4 border-t border-[var(--border-base)]">
 <Button variant="ghost" size="sm" onClick={step === 0 ? onClose : () => setStep(s => s - 1)}>{step === 0 ? 'Cancel' : '†â€™Back'}</Button>
 {step < STEPS.length - 1
 ? <Button variant="primary" size="sm" onClick={() => setStep(s => s + 1)}>Next †â€™¾Ã‚Â¢</Button>
 : <Button variant="primary" size="sm" onClick={onClose} className="flex items-center gap-1.5"><Plus size={12} />Create Lead</Button>
 }
 </div>
 </Modal>
 );
};

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// IMPORT MODAL
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const ImportModal = ({ open, onClose }) => {
 const [drag, setDrag] = useState(false);
 return (
 <Modal open={open} onClose={onClose} title="Import Leads (CSV)" size="md">
 <div className="space-y-4">
 <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); }}
 className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${drag ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border-muted)]'}`}>
 <Upload size={32} className="mx-auto mb-3 text-[var(--text-faint)]" />
 <p className="text-sm font-bold text-[var(--text-primary)] mb-1">Drop your CSV file here</p>
 <p className="text-xs text-[var(--text-faint)] mb-4">or click to browse</p>
 <Button variant="outline" size="sm">Browse File</Button>
 </div>
 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-2">Required CSV Columns</p>
 <div className="grid grid-cols-3 gap-1.5">
 {['name', 'phone', 'email', 'company', 'city', 'source', 'kw', 'monthly_bill', 'stage'].map(c => (
 <span key={c} className="px-2 py-1 rounded bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)] font-mono">{c}</span>
 ))}
 </div>
 </div>
 <div className="glass-card p-3 border-l-2 border-[var(--accent)]">
 <p className="text-[10px] text-[var(--text-muted)]"><span className="text-[var(--accent)] font-bold">Auto on import:</span> Duplicate detection †â€™…Â¡Â· AI scoring †â€™…Â¡Â· Source tagging †â€™…Â¡Â· Auto-assignment</p>
 </div>
 <div className="flex gap-2">
 <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
 <Button variant="outline" size="sm" className="flex items-center gap-1.5"><Download size={12} />Template</Button>
 <Button variant="primary" size="sm">Import</Button>
 </div>
 </div>
 </Modal>
 );
};

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// FUNNEL CHART
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const FunnelChart = ({ leads }) => {
 const stages = PIPELINE_STAGES.filter(s => s.id !== 'lost');
 const counts = stages.map(s => ({ ...s, count: leads.filter(l => l.stage === s.id).length, value: leads.filter(l => l.stage === s.id).reduce((a, l) => a + l.value, 0) }));
 const maxCount = Math.max(...counts.map(c => c.count), 1);
 return (
 <div className="space-y-2">
 {counts.map((s, i) => {
 const pct = (s.count / maxCount) * 100;
 const conv = i > 0 && counts[i - 1].count > 0 ? ((s.count / counts[i - 1].count) * 100).toFixed(0) : null;
 return (
 <div key={s.id}>
 <div className="flex items-center gap-3 mb-1">
 <span className="text-[10px] text-[var(--text-faint)] w-28 shrink-0 truncate">{s.label}</span>
 <div className="flex-1">
 <div className="h-7 rounded-lg bg-[var(--bg-elevated)] overflow-hidden">
 <div className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-700"
 style={{ width: `${Math.max(pct, 8)}%`, background: `linear-gradient(90deg, ${s.color}33, ${s.color}88)` }}>
 {s.count > 0 && <span className="text-[10px] font-bold" style={{ color: s.color }}>{s.count}</span>}
 </div>
 </div>
 </div>
 <span className="text-[10px] text-[var(--text-faint)] w-20 text-right shrink-0">{fmt(s.value)}</span>
 {conv !== null && (
 <span className={`text-[9px] font-bold w-10 text-right shrink-0 ${parseInt(conv) < 50 ? 'text-red-400' : 'text-green-400'}`}>{conv}%†â€™“</span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 );
};

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// ANALYTICS PANEL
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const AnalyticsPanel = ({ leads }) => {
 const sourceData = useMemo(() => {
 const map = {};
 leads.forEach(l => { map[l.source] = (map[l.source] || 0) + 1; });
 return Object.entries(map).map(([s, c]) => ({ source: s, count: c, value: leads.filter(l => l.source === s).reduce((a, l) => a + l.value, 0) })).sort((a, b) => b.count - a.count);
 }, [leads]);
 const cityData = useMemo(() => {
 const map = {};
 leads.forEach(l => { map[l.city] = (map[l.city] || 0) + 1; });
 return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
 }, [leads]);
 const hotCount = leads.filter(l => l.score >= 75).length;
 const wonCount = leads.filter(l => l.stage === 'won').length;
 const lostCount = leads.filter(l => l.stage === 'lost').length;
 const closedPct = wonCount + lostCount > 0 ? ((wonCount / (wonCount + lostCount)) * 100).toFixed(0) : 0;
 return (
 <div className="space-y-4">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <MiniKPI label="Total Pipeline" value={`†â€™${(leads.reduce((a, l) => a + l.value, 0) / 100000).toFixed(1)}L`} sub={`${leads.length} leads`} icon={TrendingUp} color="#f59e0b" />
 <MiniKPI label="Hot Leads" value={hotCount} sub="Score †â€™¥ 75" icon={Flame} color="#f97316" />
 <MiniKPI label="Win Rate" value={`${closedPct}%`} sub={`${wonCount} won †â€™…Â¡Â· ${lostCount} lost`} icon={Target} color="#22c55e" />
 <MiniKPI label="SLA Breaches" value={leads.filter(l => l.slaBreached).length} sub="Needs action" icon={AlertTriangle} color="#ef4444" />
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 <div className="glass-card p-5">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-4 flex items-center gap-1.5"><BarChart2 size={13} className="text-[var(--accent)]" />Pipeline Funnel</p>
 <FunnelChart leads={leads} />
 </div>
 <div className="glass-card p-5">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-4 flex items-center gap-1.5"><Activity size={13} className="text-[var(--accent)]" />Source Performance</p>
 <div className="space-y-3">
 {sourceData.map(s => (
 <div key={s.source}>
 <div className="flex items-center justify-between mb-1">
 <span className="text-[11px] text-[var(--text-muted)]">{s.source}</span>
 <div className="flex items-center gap-2">
 <span className="text-[10px] text-[var(--text-faint)]">{fmt(s.value)}</span>
 <span className="text-[11px] font-bold text-[var(--text-primary)]">{s.count}</span>
 </div>
 </div>
 <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
 <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(s.count / leads.length) * 100}%`, background: 'linear-gradient(90deg, var(--accent), #fbbf24)' }} />
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="glass-card p-5">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-4 flex items-center gap-1.5"><MapPin size={13} className="text-[var(--accent)]" />Top Cities</p>
 <div className="space-y-2">
 {cityData.map(([city, count]) => (
 <div key={city} className="flex items-center gap-3">
 <span className="text-[11px] text-[var(--text-muted)] w-24 shrink-0">{city}</span>
 <div className="flex-1 h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
 <div className="h-full rounded-full" style={{ width: `${(count / leads.length) * 100}%`, background: 'var(--accent)' }} />
 </div>
 <span className="text-[11px] font-bold text-[var(--text-primary)] w-4 text-right">{count}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="glass-card p-5">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-4 flex items-center gap-1.5"><Users size={13} className="text-[var(--accent)]" />Sales Rep Performance</p>
 <div className="space-y-3">
 {Object.entries(leads.reduce((m, l) => { m[l.assignedTo] = (m[l.assignedTo] || 0) + 1; return m; }, {})).map(([rep, count]) => {
 const won = leads.filter(l => l.assignedTo === rep && l.stage === 'won').length;
 const conv = count > 0 ? Math.round((won / count) * 100) : 0;
 return (
 <div key={rep} className="flex items-center gap-3">
 <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[10px] font-black text-[var(--accent)] shrink-0">
 {rep.split(' ').map(w => w[0]).join('').slice(0, 2)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{rep}</span>
 <span className="text-[10px] text-[var(--text-faint)] shrink-0">{count} †â€™…Â¡Â· {conv}%</span>
 </div>
 <div className="h-1.5 mt-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
 <div className="h-full rounded-full" style={{ width: `${(count / leads.length) * 100}%`, background: 'var(--accent)' }} />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 );
};

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// LEADS DASHBOARD
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™

// Monthly pipeline data (12 months)
const MONTHLY_PIPELINE = [
 { month: 'Jan', contacted: 12000, opportunity: 18000, totalContacted: 8000 },
 { month: 'Feb', contacted: 15000, opportunity: 22000, totalContacted: 10000 },
 { month: 'Mar', contacted: 11000, opportunity: 25000, totalContacted: 9000 },
 { month: 'Apr', contacted: 18000, opportunity: 20000, totalContacted: 12000 },
 { month: 'May', contacted: 22000, opportunity: 28000, totalContacted: 14000 },
 { month: 'Jun', contacted: 19000, opportunity: 24000, totalContacted: 13000 },
 { month: 'Jul', contacted: 25000, opportunity: 32000, totalContacted: 16000 },
 { month: 'Aug', contacted: 21000, opportunity: 27000, totalContacted: 15000 },
 { month: 'Sep', contacted: 17000, opportunity: 22000, totalContacted: 11000 },
 { month: 'Oct', contacted: 24000, opportunity: 30000, totalContacted: 17000 },
 { month: 'Nov', contacted: 20000, opportunity: 26000, totalContacted: 14000 },
 { month: 'Dec', contacted: 16000, opportunity: 21000, totalContacted: 12000 },
];

// New leads heatmap (days †â€™„¢weeks)
const HEATMAP_DATA = {
 days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
 weeks: ['W1', 'W2', 'W3', 'W4'],
 values: [
 [3, 7, 5, 8, 6, 2, 1],
 [5, 9, 11, 7, 8, 3, 2],
 [4, 6, 8, 12, 9, 4, 1],
 [2, 5, 7, 6, 10, 5, 3],
 ],
};

// Notifications
const NOTIFICATIONS = [
 { id: 1, title: 'Leo Murphy requested access to JNE', time: 'Today at 8:42 AM', file: 'BTL_minute.pdf', read: false },
 { id: 2, title: 'Leo Murphy requested access to JNE', time: 'Today at 9:12 AM', read: true, badge: 'Pending' },
 { id: 3, title: 'Leo Murphy requested access to JNE', time: 'Today at 9:32 AM', read: false, badge: 'Pending' },
 { id: 4, title: 'Leo Murphy requested access to JNE', time: 'Today at 10:14 PM', read: true },
];

// SVG donut chart
const DonutChart = ({ segments, size = 120, thick = 18, label, sublabel }) => {
 const r = (size - thick) / 2;
 const cx = size / 2;
 const cy = size / 2;
 const circ = 2 * Math.PI * r;
 let offset = 0;
 return (
 <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
 <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
 <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={thick} />
 {segments.map((seg, i) => {
 const dash = (seg.pct / 100) * circ;
 const gap = circ - dash;
 const arc = (
 <circle key={i} cx={cx} cy={cy} r={r} fill="none"
 stroke={seg.color} strokeWidth={thick}
 strokeDasharray={`${dash} ${gap}`}
 strokeDashoffset={-offset}
 strokeLinecap="butt"
 />
 );
 offset += dash;
 return arc;
 })}
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 {label && <span className="text-base font-extrabold text-[var(--text-primary)]">{label}</span>}
 {sublabel && <span className="text-[9px] text-[var(--text-faint)]">{sublabel}</span>}
 </div>
 </div>
 );
};

// Activity icons map for timeline
const ACT_ICONS = { call: Phone, email: Mail, whatsapp: MessageSquare, note: FileText };
const ACT_COLORS = { call: '#22c55e', email: '#3b82f6', whatsapp: '#25d366', note: 'var(--text-faint)' };

const LeadsDashboard = ({ leads, onSelectLead, onNavigate }) => {
 const totalLeads = leads.length;
 const newLeads = leads.filter(l => l.stage === 'new' || l.stage === 'contacted').length;
 const lostLeads = leads.filter(l => l.stage === 'lost').length;
 const totalCustomers = CUSTOMERS.length;

 // Compute leads by company
 const byCompany = useMemo(() => {
 const map = {};
 leads.forEach(l => {
 if (!map[l.company]) map[l.company] = { company: l.company, leads: 0, value: 0, stage: l.stage, id: l.id };
 map[l.company].leads++;
 map[l.company].value += l.value;
 });
 return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 5);
 }, [leads]);

 // Source data for donut
 const sourceMap = useMemo(() => {
 const map = {};
 leads.forEach(l => { map[l.source] = (map[l.source] || 0) + 1; });
 return map;
 }, [leads]);
 const sourcePcts = useMemo(() => {
 const total = leads.length || 1;
 return Object.entries(sourceMap).map(([s, c], i) => ({
 label: s, pct: Math.round((c / total) * 100),
 color: ['#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'][i % 6],
 }));
 }, [sourceMap, leads.length]);

 // Recent activities from leads
 const recentActivities = useMemo(() => {
 const all = [];
 leads.forEach(l => {
 (l.activities || []).forEach(a => all.push({ ...a, leadName: l.name, leadId: l.id }));
 });
 return all.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 5);
 }, [leads]);

 // Recent leads (sorted by created desc)
 const recentLeads = useMemo(() =>
 [...leads].sort((a, b) => b.created.localeCompare(a.created)).slice(0, 6),
 [leads]);

 // Top cities
 const cityData = useMemo(() => {
 const map = {};
 leads.forEach(l => { map[l.city] = (map[l.city] || 0) + 1; });
 return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
 }, [leads]);

 const getStageForLead = (lead) => PIPELINE_STAGES.find(s => s.id === lead.stage) || PIPELINE_STAGES[0];

 // KPI delta styling
 const KPIStrip = () => (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {[
 { label: 'Total No of Leads', value: totalLeads, delta: '+4.6%', positive: true, color: '#f59e0b', subLabel: 'from last week', icon: Users },
 { label: 'No of New Leads', value: newLeads, delta: '+12.5%', positive: true, color: '#22c55e', subLabel: '% increase this week', icon: TrendingUp },
 { label: 'No of Lost Leads', value: lostLeads, delta: '-8%', positive: false, color: '#ec4899', subLabel: 'decreased this week', icon: TrendingDown },
 { label: 'No of Total Customers', value: totalCustomers, delta: '+3.5%', positive: true, color: '#a855f7', subLabel: '% from last week', icon: Briefcase },
 ].map(kpi => {
 const Icon = kpi.icon;
 const pct = Math.min(100, Math.round((kpi.value / Math.max(totalLeads, 1)) * 100));
 return (
 <div key={kpi.label} className="glass-card p-4 flex flex-col gap-2">
 {/* Icon row */}
 <div className="flex items-center justify-between">
 <div className="w-9 h-9 rounded-xl flex items-center justify-center"
 style={{ background: `${kpi.color}18`, border: `1px solid ${kpi.color}30` }}>
 <Icon size={16} style={{ color: kpi.color }} />
 </div>
 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${kpi.positive ? 'bg-[var(--green)]/15 text-[var(--green)]' : 'bg-red-500/15 text-red-400'}`}>
 {kpi.delta}
 </span>
 </div>
 {/* Label + value */}
 <div>
 <p className="text-[11px] text-[var(--text-faint)] font-medium">{kpi.label}</p>
 <p className="text-2xl font-extrabold text-[var(--text-primary)] leading-tight mt-0.5">{kpi.value}</p>
 </div>
 {/* Progress bar */}
 <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
 <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: kpi.color }} />
 </div>
 {/* Sub label */}
 <p className="text-[10px] text-[var(--text-faint)]">{kpi.subLabel}</p>
 </div>
 );
 })}
 </div>
 );

 // Pipeline stages stacked bar (full chart)
 const PipelineChart = () => {
 const maxV = Math.max(...MONTHLY_PIPELINE.map(d => d.contacted + d.opportunity + d.totalContacted));
 return (
 <div className="glass-card p-4">
 <div className="flex items-center justify-between mb-3">
 <div>
 <p className="text-xs font-bold text-[var(--text-primary)]">Pipeline Stages</p>
 </div>
 <div className="flex items-center gap-3 text-[10px] text-[var(--text-faint)]">
 <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#0e7490]" />Contacted <strong className="text-[var(--text-primary)] ml-0.5">50905</strong></span>
 <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#3b82f6]" />Opportunity <strong className="text-[var(--text-primary)] ml-0.5">22900</strong></span>
 <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#f59e0b]" />Total Contacted <strong className="text-[var(--text-primary)] ml-0.5">12566</strong></span>
 </div>
 <span className="text-[10px] text-[var(--text-faint)] bg-[var(--bg-elevated)] px-2 py-1 rounded-lg border border-[var(--border-base)]">2024 †â€™“ 2026</span>
 </div>
 <div className="flex gap-2" style={{ height: 140 }}>
 {/* Y-axis */}
 <div className="flex flex-col justify-between text-[9px] text-[var(--text-faint)] text-right pr-1 shrink-0" style={{ height: 120, marginTop: 0 }}>
 {[50, 40, 30, 20, 10, 0].map(v => <span key={v}>{v}k</span>)}
 </div>
 {/* Bars */}
 <div className="flex-1 flex items-end gap-1">
 {MONTHLY_PIPELINE.map((d, i) => {
 const pctC = (d.contacted / maxV) * 120;
 const pctO = (d.opportunity / maxV) * 120;
 const pctT = (d.totalContacted / maxV) * 120;
 return (
 <div key={i} className="flex-1 flex flex-col justify-end gap-0" style={{ height: 120 }}>
 <div style={{ height: Math.max(pctT, 2), background: '#f59e0b', borderRadius: '3px 3px 0 0' }} />
 <div style={{ height: Math.max(pctO, 2), background: '#3b82f6' }} />
 <div style={{ height: Math.max(pctC, 2), background: '#0e7490', borderRadius: '0 0 3px 3px' }} />
 </div>
 );
 })}
 </div>
 </div>
 {/* X-axis */}
 <div className="flex gap-1 mt-1" style={{ paddingLeft: 28 }}>
 {MONTHLY_PIPELINE.map(d => (
 <div key={d.month} className="flex-1 text-center text-[9px] text-[var(--text-faint)]">{d.month}</div>
 ))}
 </div>
 </div>
 );
 };

 // New Leads Heatmap
 const HeatmapChart = () => {
 const maxVal = Math.max(...HEATMAP_DATA.values.flat());
 const colors = ['var(--bg-elevated)', '#fde68a', '#f59e0b', '#d97706', '#92400e'];
 const getColor = (v) => {
 if (v === 0) return colors[0];
 const idx = Math.ceil((v / maxVal) * 4);
 return colors[Math.min(idx, 4)];
 };
 return (
 <div className="glass-card p-4">
 <div className="flex items-center justify-between mb-3">
 <p className="text-xs font-bold text-[var(--text-primary)]">New Leads</p>
 <span className="text-[10px] text-[var(--text-faint)] bg-[var(--bg-elevated)] px-2 py-1 rounded-lg border border-[var(--border-base)]">This Week</span>
 </div>
 <div className="flex gap-1">
 {/* Day labels */}
 <div className="flex flex-col gap-1 text-[9px] text-[var(--text-faint)] justify-around pr-1">
 {HEATMAP_DATA.days.map(d => <span key={d} style={{ height: 20, lineHeight: '20px' }}>{d}</span>)}
 </div>
 {/* Grid */}
 <div className="flex-1 flex gap-1">
 {HEATMAP_DATA.weeks.map((w, wi) => (
 <div key={w} className="flex-1 flex flex-col gap-1">
 {HEATMAP_DATA.days.map((_, di) => {
 const v = HEATMAP_DATA.values[wi][di];
 return (
 <div key={di} className="rounded flex items-center justify-center text-[8px] font-bold transition-all"
 style={{ height: 20, background: getColor(v), color: v > maxVal / 2 ? '#000' : 'var(--text-faint)' }}>
 {v > 0 ? v : ''}
 </div>
 );
 })}
 </div>
 ))}
 </div>
 </div>
 {/* Week labels */}
 <div className="flex gap-1 mt-1 pl-6">
 {HEATMAP_DATA.weeks.map(w => <div key={w} className="flex-1 text-center text-[9px] text-[var(--text-faint)]">{w}</div>)}
 </div>
 </div>
 );
 };

 // Lost Leads chart
 const LostLeadsChart = () => {
 const monthlyLost = [6, 9, 7, 11, 8, 10, 7, 12, 9, 8, 11, 7];
 const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
 const maxL = Math.max(...monthlyLost);
 return (
 <div className="glass-card p-4">
 <div className="flex items-center justify-between mb-3">
 <p className="text-xs font-bold text-[var(--text-primary)]">Lost Leads</p>
 <button className="text-[10px] text-[var(--text-faint)] flex items-center gap-1 bg-[var(--bg-elevated)] px-2 py-1 rounded-lg border border-[var(--border-base)]">
 Across Pipeline <ChevronDown size={9} />
 </button>
 </div>
 {/* Y ticks */}
 <div className="flex gap-2" style={{ height: 100 }}>
 <div className="flex flex-col justify-between text-[9px] text-[var(--text-faint)] text-right pr-1 shrink-0">
 {[20, 15, 10, 5, 0].map(v => <span key={v}>{v}</span>)}
 </div>
 <div className="flex-1 flex items-end gap-1">
 {monthlyLost.map((v, i) => (
 <div key={i} className="flex-1 flex flex-col justify-end" style={{ height: 80 }}>
 <div className="rounded-t" style={{ height: `${(v / maxL) * 100}%`, background: '#f59e0b', minHeight: 4 }} />
 </div>
 ))}
 </div>
 </div>
 <div className="flex gap-1 mt-1 pl-5">
 {months.map(m => <div key={m} className="flex-1 text-center text-[9px] text-[var(--text-faint)]">{m.slice(0, 1)}</div>)}
 </div>
 </div>
 );
 };

 // Leads by Companies
 const LeadsByCompanies = () => (
 <div className="glass-card p-4">
 <div className="flex items-center justify-between mb-3">
 <p className="text-xs font-bold text-[var(--text-primary)]">Leads by Companies</p>
 <button className="text-[10px] text-[var(--text-faint)] flex items-center gap-1 bg-[var(--bg-elevated)] px-2 py-1 rounded-lg border border-[var(--border-base)]">
 This Week <ChevronDown size={9} />
 </button>
 </div>
 <div className="space-y-2">
 {byCompany.map((c, i) => {
 const stage = PIPELINE_STAGES.find(s => s.id === c.stage) || PIPELINE_STAGES[0];
 const initials = c.company.split(' ').map(w => w[0]).join('').slice(0, 2);
 const colors = ['#f59e0b', '#3b82f6', '#22c55e', '#ec4899', '#8b5cf6'];
 return (
 <div key={c.company} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
 onClick={() => onSelectLead && leads.find(l => l.id === c.id) && onSelectLead(leads.find(l => l.id === c.id))}>
 <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
 style={{ background: `${colors[i % colors.length]}18`, color: colors[i % colors.length], border: `1px solid ${colors[i % colors.length]}30` }}>
 {initials}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{c.company}</p>
 <p className="text-[10px] text-[var(--text-faint)]">Value: {fmt(c.value)}</p>
 </div>
 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
 style={{ color: stage.color, background: `${stage.color}18`, border: `1px solid ${stage.color}30` }}>
 {stage.label}
 </span>
 </div>
 );
 })}
 </div>
 </div>
 );

 // Leads by Source donut + legend
 const LeadsBySource = () => (
 <div className="glass-card p-4">
 <div className="flex items-center justify-between mb-3">
 <p className="text-xs font-bold text-[var(--text-primary)]">Leads by Source</p>
 <button className="text-[10px] text-[var(--text-faint)] bg-[var(--bg-elevated)] px-2 py-1 rounded-lg border border-[var(--border-base)]">This Week</button>
 </div>
 <div className="flex items-center gap-4">
 <DonutChart segments={sourcePcts} size={110} thick={16} label={leads.length} sublabel="Leads" />
 <div className="flex-1 space-y-2">
 <p className="text-[10px] font-bold text-[var(--text-primary)] mb-2">Status</p>
 {sourcePcts.slice(0, 5).map(s => (
 <div key={s.label} className="flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
 <span className="text-[10px] text-[var(--text-muted)]">{s.label}</span>
 </div>
 <span className="text-[10px] font-bold text-[var(--text-primary)]">{s.pct}%</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 );

 // Recent Follow Up
 const RecentFollowUp = ({ onViewAll }) => (
 <div className="glass-card p-4">
 <div className="flex items-center justify-between mb-3">
 <p className="text-xs font-bold text-[var(--text-primary)]">Recent Follow Up</p>
 <button className="text-[10px] text-[var(--accent)] hover:underline" onClick={onViewAll}>View All</button>
 </div>
 <div className="space-y-2.5">
 {leads.filter(l => l.nextFollowUp).slice(0, 5).map((lead, i) => {
 const colors = ['#f59e0b', '#3b82f6', '#22c55e', '#ec4899', '#8b5cf6'];
 const col = colors[i % colors.length];
 return (
 <div key={lead.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer">
 <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
 style={{ background: `${col}18`, color: col, border: `1.5px solid ${col}40` }}>
 {lead.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{lead.name}</p>
 <p className="text-[10px] text-[var(--text-faint)] truncate">{lead.company}</p>
 </div>
 <div className="flex flex-col items-end gap-0.5">
 <span className="text-[9px] text-[var(--text-faint)]">{lead.nextFollowUp}</span>
 {lead.slaBreached && <span className="text-[9px] font-bold text-red-400">SLA!</span>}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );

 // Recent Activities
 const RecentActivities = ({ onViewAll }) => (
 <div className="glass-card p-4">
 <div className="flex items-center justify-between mb-3">
 <p className="text-xs font-bold text-[var(--text-primary)]">Recent Activities</p>
 <button className="text-[10px] text-[var(--accent)] hover:underline" onClick={onViewAll}>View All</button>
 </div>
 <div className="space-y-3">
 {recentActivities.map(act => {
 const Icon = ACT_ICONS[act.type] || FileText;
 const color = ACT_COLORS[act.type] || '#94a3b8';
 return (
 <div key={act.id} className="flex gap-2.5">
 <div className="w-7 h-7 rounded-full flex items-center justify-center border shrink-0 mt-0.5"
 style={{ background: `${color}15`, borderColor: `${color}40` }}>
 <Icon size={11} style={{ color }} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[11px] text-[var(--text-primary)] leading-relaxed">{act.note}</p>
 <p className="text-[9px] text-[var(--text-faint)] mt-0.5">{act.ts}</p>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );

 // Notifications
 const NotificationsPanel = () => (
 <div className="glass-card p-4">
 <div className="flex items-center justify-between mb-3">
 <p className="text-xs font-bold text-[var(--text-primary)]">Notifications</p>
 <button className="text-[10px] text-[var(--accent)] hover:underline">View All</button>
 </div>
 <div className="space-y-2.5">
 {NOTIFICATIONS.map(n => (
 <div key={n.id} className={`flex gap-2.5 p-2 rounded-lg transition-colors ${!n.read ? 'bg-[var(--accent)]/5 border border-[var(--accent)]/15' : ''}`}>
 <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
 <User size={13} className="text-[var(--accent)]" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[11px] font-semibold text-[var(--text-primary)] leading-tight">{n.title}</p>
 <p className="text-[9px] text-[var(--text-faint)] mt-0.5">{n.time}</p>
 {n.file && <p className="text-[10px] text-[var(--accent)] mt-0.5 flex items-center gap-1"><FileText size={9} />{n.file}</p>}
 {n.badge && (
 <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">{n.badge}</span>
 )}
 </div>
 {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1 shrink-0" />}
 </div>
 ))}
 </div>
 </div>
 );

 // Top Cities
 const TopCities = () => {
 const stateCounts = useMemo(() => {
 const m = {};
 leads.forEach(l => {
 if (!m[l.city]) m[l.city] = { city: l.city, state: l.state, count: 0 };
 m[l.city].count++;
 });
 return Object.values(m).sort((a, b) => b.count - a.count).slice(0, 5);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [leads]);
 const maxC = Math.max(...stateCounts.map(c => c.count), 1);
 return (
 <div className="glass-card p-4">
 <div className="flex items-center justify-between mb-3">
 <p className="text-xs font-bold text-[var(--text-primary)]">Top Cities</p>
 <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] font-semibold border border-[var(--accent)]/20">
 Substate
 </span>
 </div>
 <div className="space-y-2.5">
 {stateCounts.map((c, i) => (
 <div key={c.city} className="flex items-center gap-2.5">
 <span className="text-base shrink-0 leading-none">†â€™¸Ã†â€™¸Â³</span>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-0.5">
 <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{c.city}</p>
 <span className="text-[10px] font-bold text-[var(--text-muted)] shrink-0 ml-1">{c.count}</span>
 </div>
 <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
 <div className="h-full rounded-full transition-all duration-700"
 style={{ width: `${(c.count / maxC) * 100}%`, background: ['#f59e0b','#3b82f6','#22c55e','#ec4899','#8b5cf6'][i % 5] }} />
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 };

 // Recent Leads Table †â€™matches screenshot exactly
 const RecentLeadsTable = () => (
 <div className="glass-card overflow-hidden">
 <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-base)]">
 <p className="text-xs font-bold text-[var(--text-primary)]">Recent Leads</p>
 <button
 className="text-[10px] text-[var(--accent)] font-semibold hover:underline flex items-center gap-0.5"
 onClick={() => onSelectLead && onSelectLead(null)}
 >
 View All <ChevronRight size={10} />
 </button>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full min-w-[480px]">
 <thead>
 <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
 {['Company Name', 'Stage', 'Created Date', 'Lead Owner'].map(h => (
 <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wide whitespace-nowrap">
 {h}
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-[var(--border-subtle)]">
 {recentLeads.map(lead => {
 const stage = getStageForLead(lead);
 const ac = avatarColor(lead.name);
 return (
 <tr key={lead.id}
 className="hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
 onClick={() => onSelectLead(lead)}>
 <td className="px-4 py-3">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
 style={{ background: ac }}>
 {lead.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
 </div>
 <div>
 <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{lead.name}</p>
 <p className="text-[10px] text-[var(--text-faint)] leading-tight mt-0.5">{lead.company}</p>
 </div>
 </div>
 </td>
 <td className="px-4 py-3">
 <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
 style={{ color: stage.color, background: `${stage.color}18`, border: `1px solid ${stage.color}30` }}>
 <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: stage.color }} />
 {stage.label}
 </span>
 </td>
 <td className="px-4 py-3 text-[11px] text-[var(--text-muted)] whitespace-nowrap">{lead.created}</td>
 <td className="px-4 py-3 text-[11px] text-[var(--text-secondary)] whitespace-nowrap">{lead.assignedTo}</td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 );

 return (
 <div className="space-y-4">
 {/* Row 1: KPI strip */}
 <KPIStrip />

 {/* Row 2: Pipeline chart + New Leads Heatmap */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 <div className="lg:col-span-2"><PipelineChart /></div>
 <div><HeatmapChart /></div>
 </div>

 {/* Row 3: Lost Leads + Leads by Companies + Leads by Source */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 <div><LostLeadsChart /></div>
 <div><LeadsByCompanies /></div>
 <div><LeadsBySource /></div>
 </div>

 {/* Row 4: Follow Up + Activities + Notifications */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 <div><RecentFollowUp onViewAll={() => { }} /></div>
 <div><RecentActivities onViewAll={() => { }} /></div>
 <div><NotificationsPanel /></div>
 </div>

 {/* Row 5: Top Cities + Recent Leads table */}
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
 <div><TopCities /></div>
 {/* City donut placeholder */}
 <div className="glass-card p-4 flex flex-col items-center justify-center">
 <DonutChart
 segments={cityData.map(([, c], i) => ({
 label: cityData[i][0],
 pct: Math.round((c / leads.length) * 100),
 color: ['#f59e0b', '#3b82f6', '#22c55e', '#ec4899', '#8b5cf6'][i % 5],
 }))}
 size={120} thick={18} label="Leads" sublabel={leads.length}
 />
 <p className="text-xs font-bold text-[var(--text-primary)] mt-3">{leads.length}</p>
 <p className="text-[10px] text-[var(--text-faint)]">Total Leads</p>
 </div>
 <div className="lg:col-span-2"><RecentLeadsTable /></div>
 </div>
 </div>
 );
};

// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
// MAIN CRM PAGE
// †â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™†â€™
const CRMPage = ({ onNavigate }) => {
 const [view, setView] = useState('dashboard');
 const [search, setSearch] = useState('');
 const [filterSource, setFilterSource] = useState('All');
 const [filterCity, setFilterCity] = useState('All');
 const [filterStage, setFilterStage] = useState('All');
 const [filterRep, setFilterRep] = useState('All');
 const [filterCat, setFilterCat] = useState('All');
 const [sortKey, setSortKey] = useState('score');
 const [sortDir, setSortDir] = useState('desc');
 const [selected, setSelected] = useState([]);
 const [detailLead, setDetailLead] = useState(null);
 const [addOpen, setAddOpen] = useState(false);
 const [importOpen, setImportOpen] = useState(false);
 const [showFilters, setShowFilters] = useState(false);
 const [page, setPage] = useState(1);
 const [leads, setLeads] = useState(LEADS);
 const PER_PAGE = 10;

 const handleSort = (key) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('desc'); } };
 const handleStageChange = useCallback((id, newStage) => setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage } : l)), []);

 const filtered = useMemo(() => {
 let data = leads;
 if (search) { const q = search.toLowerCase(); data = data.filter(l => l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.phone.includes(q) || l.email.toLowerCase().includes(q) || l.city.toLowerCase().includes(q)); }
 if (filterSource !== 'All') data = data.filter(l => l.source === filterSource);
 if (filterCity !== 'All') data = data.filter(l => l.city === filterCity);
 if (filterStage !== 'All') { const s = PIPELINE_STAGES.find(s => s.label === filterStage); if (s) data = data.filter(l => l.stage === s.id); }
 if (filterRep !== 'All') data = data.filter(l => l.assignedTo === filterRep);
 if (filterCat !== 'All') data = data.filter(l => l.category === filterCat);
 data = [...data].sort((a, b) => { let av = a[sortKey], bv = b[sortKey]; if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); } return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1); });
 return data;
 }, [leads, search, filterSource, filterCity, filterStage, filterRep, filterCat, sortKey, sortDir]);

 const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
 const totalPages = Math.ceil(filtered.length / PER_PAGE);
 const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
 const toggleAll = () => setSelected(s => s.length === paginated.length ? [] : paginated.map(l => l.id));

 const totalPipeline = leads.reduce((a, l) => a + l.value, 0);
 const hotCount = leads.filter(l => l.score >= 75 && l.stage !== 'won' && l.stage !== 'lost').length;
 const wonLeads = leads.filter(l => l.stage === 'won');
 const closedLeads = leads.filter(l => l.stage === 'won' || l.stage === 'lost');
 const convRate = closedLeads.length > 0 ? ((wonLeads.length / closedLeads.length) * 100).toFixed(0) : 0;
 const breachedCount = leads.filter(l => l.slaBreached).length;
 const activeFilters = [filterSource, filterCity, filterStage, filterRep, filterCat].filter(f => f !== 'All').length;

 const SortTH = ({ label, colKey, className = '' }) => (
 <th className={`px-3 py-3 text-left cursor-pointer group select-none ${className}`} onClick={() => handleSort(colKey)}>
 <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wide">
 {label}
 <span className="opacity-0 group-hover:opacity-100 transition-opacity">
 {sortKey === colKey ? (sortDir === 'asc' ? <ChevronUp size={9} /> : <ChevronDown size={9} />) : <ChevronDown size={9} />}
 </span>
 {sortKey === colKey && <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />}
 </div>
 </th>
 );

 return (
 <div className="space-y-5 animate-fade-in">

 {/* †â€™†â€™PAGE HEADER †â€™†â€™*/}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <div>
 <h1 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/25 flex items-center justify-center">
 <Users size={16} className="text-[var(--accent)]" />
 </div>
 Lead Management
 </h1>
 <p className="text-xs text-[var(--text-faint)] mt-1">
 {leads.length} leads †â€™…Â¡Â· {hotCount} hot †â€™…Â¡Â· †â€™{(totalPipeline / 100000).toFixed(1)}L pipeline
 </p>
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 <CanAccess module="crm" feature="import_csv">
 <Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={() => setImportOpen(true)}><Upload size={12} />Import</Button>
 </CanAccess>
 <CanAccess module="crm" action="export">
 <Button variant="outline" size="sm" className="flex items-center gap-1.5"><Download size={12} />Export</Button>
 </CanAccess>
 <CanAccess module="crm" action="create">
 <Button variant="primary" size="sm" className="flex items-center gap-1.5" onClick={() => setAddOpen(true)}><Plus size={12} />Add Lead</Button>
 </CanAccess>
 </div>
 </div>

 {/* †â€™†â€™KPI CARDS †â€™hidden in dashboard (it has its own strip) †â€™†â€™*/}
 {view !== 'dashboard' && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {[
 { label: 'Total Pipeline', value: `†â€™${(totalPipeline / 100000).toFixed(1)}L`, sub: `${leads.length} active leads`, icon: TrendingUp, color: '#f59e0b' },
 { label: 'Hot Leads', value: hotCount, sub: 'Score †â€™¥ 75', icon: Flame, color: '#f97316' },
 { label: 'Win Rate', value: `${convRate}%`, sub: `${wonLeads.length} of ${closedLeads.length} closed`, icon: Target, color: '#22c55e' },
 { label: 'SLA Alerts', value: breachedCount, sub: breachedCount > 0 ? 'Immediate action' : 'All within SLA', icon: AlertTriangle, color: breachedCount > 0 ? '#ef4444' : '#22c55e' },
 ].map(k => {
 const Icon = k.icon;
 return (
 <div key={k.label} className="glass-card p-4">
 <div className="flex items-start justify-between mb-2">
 <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${k.color}18`, border: `1px solid ${k.color}25` }}>
 <Icon size={14} style={{ color: k.color }} />
 </div>
 </div>
 <p className="text-[11px] text-[var(--text-faint)] font-medium">{k.label}</p>
 <p className="text-xl font-extrabold mt-0.5" style={{ color: k.color }}>{k.value}</p>
 {k.sub && <p className="text-[10px] text-[var(--text-faint)] mt-1">{k.sub}</p>}
 </div>
 );
 })}
 </div>
 )}

 {/* †â€™†â€™SLA BANNER †â€™†â€™*/}
 {view !== 'dashboard' && breachedCount > 0 && (
 <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25">
 <AlertTriangle size={14} className="text-red-400 shrink-0" />
 <p className="text-xs text-red-400"><strong>{breachedCount} leads</strong> have breached SLA †â€™contact them immediately.</p>
 <button className="ml-auto text-[10px] text-red-400 underline whitespace-nowrap" onClick={() => { setSortKey('age'); setSortDir('desc'); }}>Sort by age †â€™¾Ã‚Â¢</button>
 </div>
 )}

 {/* †â€™†â€™AI INSIGHT BANNER †â€™†â€™*/}
 {view !== 'dashboard' && (
 <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5">
 <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/25 flex items-center justify-center shrink-0 mt-0.5">
 <Zap size={13} className="text-[var(--accent)]" />
 </div>
 <div>
 <p className="text-xs font-bold text-[var(--accent)] mb-0.5">AI Sales Insight</p>
 <p className="text-xs text-[var(--text-muted)] leading-relaxed">
 <strong className="text-[var(--text-secondary)]">Deepika Shah (L004)</strong> in negotiation †â€™decision expected Feb 28. Prioritise follow-up.
 <span className="mx-1.5 text-[var(--text-faint)]">†â€™…Â¡Â·</span>
 <strong className="text-[var(--text-secondary)]">Sanjay Patel (L013)</strong> score 93 †â€™highest value in pipeline at †â€™6.72L. Close this week.
 </p>
 </div>
 </div>
 )}

 {/* †â€™†â€™TOOLBAR †â€™†â€™*/}
 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
 {/* Search †â€™hidden in dashboard view */}
 {view !== 'dashboard' && (
 <div className="relative flex-1 min-w-0">
 <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
 <input
 className="w-full pl-9 pr-8 py-2 rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] transition-colors"
 placeholder="Search name, company, phone, email, city..."
 value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
 />
 {search && (
 <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-primary)]">
 <X size={12} />
 </button>
 )}
 </div>
 )}

 <div className="flex items-center gap-2 ml-auto shrink-0">
 {/* View switcher pill */}
 <div className="view-toggle-pill">
 {[
 { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', feature: 'table_view' },
 { id: 'table', icon: List, label: 'Table', feature: 'table_view' },
 { id: 'kanban', icon: Layers, label: 'Kanban', feature: 'kanban_view' },
 { id: 'analytics', icon: BarChart2, label: 'Analytics', feature: 'analytics_view' },
 ].map(v => {
 const Icon = v.icon;
 return (
 <CanAccess key={v.id} module="crm" feature={v.feature} fallback={null}>
 <button
 onClick={() => setView(v.id)}
 title={v.label}
 className={`view-toggle-btn ${view === v.id ? 'active' : ''}`}
 >
 <Icon size={12} />
 <span className="hidden sm:inline">{v.label}</span>
 </button>
 </CanAccess>
 );
 })}
 </div>

 {/* Filters button †â€™hidden in dashboard view */}
 {view !== 'dashboard' && (
 <button
 onClick={() => setShowFilters(f => !f)}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${showFilters || activeFilters > 0 ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/8' : 'border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:border-[var(--border-muted)]'}`}
 >
 <SlidersHorizontal size={12} />
 Filters
 {activeFilters > 0 && (
 <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-black text-[9px] font-black flex items-center justify-center">
 {activeFilters}
 </span>
 )}
 </button>
 )}
 </div>
 </div>

 {/* †â€™†â€™FILTERS †â€™†â€™*/}
 {view !== 'dashboard' && showFilters && (
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)]">
 {[
 { label: 'Source', opts: SOURCES, val: filterSource, set: v => { setFilterSource(v); setPage(1); } },
 { label: 'Stage', opts: STAGE_FILTERS, val: filterStage, set: v => { setFilterStage(v); setPage(1); } },
 { label: 'City', opts: CITIES, val: filterCity, set: v => { setFilterCity(v); setPage(1); } },
 { label: 'Rep', opts: REPS, val: filterRep, set: v => { setFilterRep(v); setPage(1); } },
 { label: 'Category', opts: CATS, val: filterCat, set: v => { setFilterCat(v); setPage(1); } },
 ].map(f => (
 <div key={f.label}>
 <label className="text-[10px] text-[var(--text-faint)] font-medium mb-1 block">{f.label}</label>
 <select value={f.val} onChange={e => f.set(e.target.value)}
 className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
 {f.opts.map(o => <option key={o}>{o}</option>)}
 </select>
 </div>
 ))}
 <div className="flex items-end">
 <button onClick={() => { setFilterSource('All'); setFilterCity('All'); setFilterStage('All'); setFilterRep('All'); setFilterCat('All'); setSearch(''); setPage(1); }}
 className="text-[10px] text-[var(--text-faint)] hover:text-red-400 flex items-center gap-1 transition-colors">
 <X size={10} />Clear All
 </button>
 </div>
 </div>
 )}

 {/* †â€™†â€™BULK ACTIONS †â€™†â€™*/}
 {view !== 'dashboard' && selected.length > 0 && (
 <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--accent)]/8 border border-[var(--accent)]/20">
 <span className="text-[11px] font-bold text-[var(--accent)]">{selected.length} selected</span>
 <div className="w-px h-4 bg-[var(--border-base)]" />
 <div className="flex gap-1.5 flex-wrap">
 <CanAccess module="crm" action="assign">
 <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-base)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
 <User size={10} /> Assign
 </button>
 </CanAccess>
 <CanAccess module="crm" action="edit">
 <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-base)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
 <ArrowRight size={10} /> Stage
 </button>
 </CanAccess>
 <CanAccess module="crm" action="export">
 <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-base)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
 <Download size={10} /> Export
 </button>
 </CanAccess>
 <CanAccess module="crm" action="delete">
 <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[var(--bg-surface)] text-red-400 border border-red-500/20 hover:border-red-400 hover:bg-red-500/8 transition-colors">
 <Trash2 size={10} /> Delete
 </button>
 </CanAccess>
 </div>
 <button onClick={() => setSelected([])} className="ml-auto p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">
 <X size={13} />
 </button>
 </div>
 )}

 {/* †â€™†â€™LEADS DASHBOARD †â€™†â€™*/}
 {view === 'dashboard' && (
 <LeadsDashboard leads={leads} onSelectLead={setDetailLead} onNavigate={onNavigate} />
 )}

 {/* †â€™†â€™RESULTS COUNT †â€™†â€™*/}
 {view !== 'dashboard' && (
 <div className="flex items-center justify-between gap-3 px-1">
 <p className="text-[11px] text-[var(--text-faint)]">
 Showing <strong className="text-[var(--text-primary)]">{Math.min(page * PER_PAGE, filtered.length)}</strong> of{' '}
 <strong className="text-[var(--text-primary)]">{filtered.length}</strong> results
 {filtered.length !== leads.length && (
 <span className="text-[var(--accent)]"> (filtered)</span>
 )}
 </p>
 {selected.length > 0 && (
 <span className="text-[11px] text-[var(--accent)] font-semibold">{selected.length} selected</span>
 )}
 </div>
 )}

 {/* †â€™†â€™MAIN CONTENT + SIDEBAR †â€™†â€™*/}
 {view !== 'dashboard' && (
 <div className={`flex gap-4 ${view === 'analytics' ? '' : 'items-start'}`}>

 {/* Main panel */}
 <div className="flex-1 min-w-0">
 {view === 'table' && (
 <div className="glass-card overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full min-w-[860px]">
 <thead>
 <tr className="border-b border-[var(--border-base)] bg-[var(--bg-elevated)]">
 {/* Select-all */}
 <th className="pl-4 pr-2 py-3 w-10">
 <div
 className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${selected.length === paginated.length && paginated.length > 0 ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-muted)] hover:border-[var(--accent)]/60'}`}
 onClick={toggleAll}
 >
 {selected.length === paginated.length && paginated.length > 0 && (
 <Check size={9} className="text-black" strokeWidth={3} />
 )}
 </div>
 </th>
 <SortTH label="Lead" colKey="name" />
 <th className="px-3 py-3 text-left text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wide hidden md:table-cell">
 Contact
 </th>
 <SortTH label="Stage" colKey="stage" />
 <SortTH label="Score" colKey="score" />
 <SortTH label="Value" colKey="value" />
 <th className="px-3 py-3 text-left text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wide hidden lg:table-cell">
 Source
 </th>
 <th className="px-3 py-3 text-left text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wide hidden lg:table-cell">
 City
 </th>
 <SortTH label="Age" colKey="age" className="hidden xl:table-cell" />
 <th className="px-3 py-3 text-left text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wide hidden xl:table-cell">
 SLA
 </th>
 <th className="px-3 py-3 text-left text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wide">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[var(--border-subtle)]">
 {paginated.length === 0 ? (
 <tr>
 <td colSpan={11} className="text-center py-20">
 <div className="flex flex-col items-center gap-3">
 <div className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center">
 <Search size={22} className="text-[var(--text-faint)] opacity-40" />
 </div>
 <p className="text-sm font-semibold text-[var(--text-primary)]">No leads found</p>
 <p className="text-xs text-[var(--text-faint)]">Try adjusting your search or filters</p>
 </div>
 </td>
 </tr>
 ) : (
 paginated.map(lead => (
 <TableRow
 key={lead.id}
 lead={lead}
 onSelect={setDetailLead}
 selected={selected.includes(lead.id)}
 onToggle={toggleSelect}
 />
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* †â€™†â€™Pagination †â€™†â€™*/}
 {totalPages > 1 && (
 <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-base)] bg-[var(--bg-surface)]">
 <p className="text-[11px] text-[var(--text-faint)]">
 Page <strong className="text-[var(--text-primary)]">{page}</strong> of{' '}
 <strong className="text-[var(--text-primary)]">{totalPages}</strong> †â€™…Â¡Â·{' '}
 {filtered.length} results
 </p>
 <div className="flex items-center gap-1">
 <button
 disabled={page === 1}
 onClick={() => setPage(p => p - 1)}
 className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--border-base)] text-[var(--text-faint)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
 >†â€™Prev</button>
 {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
 const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
 if (p < 1 || p > totalPages) return null;
 return (
 <button
 key={p}
 onClick={() => setPage(p)}
 className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${p === page ? 'bg-[var(--accent)] text-black shadow-sm' : 'text-[var(--text-faint)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}
 >{p}</button>
 );
 })}
 <button
 disabled={page === totalPages}
 onClick={() => setPage(p => p + 1)}
 className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--border-base)] text-[var(--text-faint)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
 >Next †â€™¾Ã‚Â¢</button>
 </div>
 </div>
 )}
 </div>
 )}

 {view === 'kanban' && (
 <div>
 <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)]">
 <Layers size={12} className="text-[var(--accent)]" />
 <p className="text-[11px] text-[var(--text-muted)]">Drag & drop cards between stages to update pipeline in real-time.</p>
 </div>
 <KanbanBoard leads={filtered} onSelect={setDetailLead} onStageChange={handleStageChange} />
 </div>
 )}

 {view === 'analytics' && <AnalyticsPanel leads={filtered} />}
 </div>

 {/* Alerts Sidebar †â€™only in table/kanban view */}
 {view !== 'analytics' && (
 <div className="w-60 shrink-0 hidden xl:flex flex-col gap-3 sticky top-4 self-start">

 {/* Smart Alerts */}
 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
 <Bell size={13} className="text-[var(--accent)]" />
 Smart Alerts
 {leads.filter(l => l.slaBreached).length + leads.filter(l => l.age >= 14 && l.stage !== 'won' && l.stage !== 'lost').length > 0 && (
 <span className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-black bg-red-500 text-white">
 {leads.filter(l => l.slaBreached).length + leads.filter(l => l.age >= 14 && l.stage !== 'won' && l.stage !== 'lost').length}
 </span>
 )}
 </p>
 <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
 {leads.filter(l => l.slaBreached).slice(0, 2).map(l => (
 <div key={l.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/8 border border-red-500/15 cursor-pointer hover:bg-red-500/12 transition-colors">
 <AlertTriangle size={11} className="text-red-400 shrink-0 mt-0.5" />
 <div className="min-w-0">
 <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate leading-tight">{l.name}</p>
 <p className="text-[10px] text-red-400 mt-0.5">SLA breached †â€™…Â¡Â· {l.age}d</p>
 </div>
 </div>
 ))}
 {leads.filter(l => l.score >= 75 && l.stage !== 'won' && l.stage !== 'lost').slice(0, 2).map(l => (
 <div key={l.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--accent)]/8 border border-[var(--accent)]/15 cursor-pointer hover:bg-[var(--accent)]/12 transition-colors">
 <Flame size={11} className="text-[var(--accent)] shrink-0 mt-0.5" />
 <div className="min-w-0">
 <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate leading-tight">{l.name}</p>
 <p className="text-[10px] text-[var(--accent)] mt-0.5">Hot †â€™…Â¡Â· {l.score} †â€™…Â¡Â· {fmt(l.value)}</p>
 </div>
 </div>
 ))}
 {leads.filter(l => l.age >= 14 && l.stage !== 'won' && l.stage !== 'lost').slice(0, 2).map(l => (
 <div key={l.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/8 border border-amber-500/15 cursor-pointer hover:bg-amber-500/12 transition-colors">
 <Clock size={11} className="text-amber-400 shrink-0 mt-0.5" />
 <div className="min-w-0">
 <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate leading-tight">{l.name}</p>
 <p className="text-[10px] text-amber-400 mt-0.5">{l.age}d old †â€™…Â¡Â· stale</p>
 </div>
 </div>
 ))}
 {leads.filter(l => l.slaBreached).length === 0 && leads.filter(l => l.age >= 14).length === 0 && (
 <p className="text-[11px] text-[var(--text-faint)] text-center py-4">All clear †â€™…â€œÅ“</p>
 )}
 </div>
 </div>

 {/* Pipeline Health */}
 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
 <Activity size={13} className="text-[var(--accent)]" />Pipeline Health
 </p>
 <div className="space-y-2.5">
 {PIPELINE_STAGES.filter(s => s.id !== 'won' && s.id !== 'lost').map(s => {
 const count = leads.filter(l => l.stage === s.id).length;
 const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
 return (
 <div key={s.id}>
 <div className="flex items-center justify-between mb-1">
 <span className="text-[10px] text-[var(--text-faint)] font-medium truncate pr-2">{s.label}</span>
 <span className="text-[10px] font-bold shrink-0" style={{ color: s.color }}>{count}</span>
 </div>
 <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
 <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: s.color }} />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Top Reps */}
 <div className="glass-card p-4">
 <p className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
 <Users size={13} className="text-[var(--accent)]" />Top Reps
 </p>
 <div className="space-y-2.5">
 {USERS.filter(u => u.role === 'Sales' || u.role === 'Admin').slice(0, 4).map(u => {
 const repLeads = leads.filter(l => l.assignedTo === u.name);
 const repWon = repLeads.filter(l => l.stage === 'won').length;
 const repHsl = `hsl(${(u.id * 53) % 360},60%,48%)`;
 return (
 <div key={u.id} className="flex items-center gap-2.5">
 <div
 className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
 style={{ background: repHsl }}
 >
 {u.name.charAt(0)}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{u.name}</p>
 <p className="text-[9px] text-[var(--text-faint)]">{repLeads.length} leads †â€™…Â¡Â· {repWon} won</p>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 )}
 </div>
 )} {/* end view !== 'dashboard' */}

 {/* †â€™†â€™MODALS †â€™†â€™*/}
 <LeadDetailModal lead={detailLead} onClose={() => setDetailLead(null)} onNavigate={onNavigate} />
 <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} />
 <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
 </div>
 );
};

export default CRMPage;

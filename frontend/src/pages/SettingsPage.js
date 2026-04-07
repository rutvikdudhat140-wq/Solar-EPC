// Solar OS — Settings & Control Center (Enterprise Edition)
// Feature Flags · RBAC Matrix · Role Builder · User Permissions · Workflow Rules · Audit Logs · AI Suggestions
import React, { useEffect, useMemo, useState } from 'react';
import {
    Settings, Shield, Flag, GitBranch, ScrollText, Zap,
    Search, RotateCcw, Download, ChevronDown, ChevronUp,
    Check, X, Plus, Trash2, Edit2,
    AlertTriangle, Info, CheckCircle,
    Users, Package, DollarSign, Wrench, FileText,
    Clock, ArrowRight, Cpu,
    Copy, Database,
    MapPin, Truck, ShoppingCart, Headphones, FileCheck, LayoutDashboard,
    Pencil, FolderOpen, UserCog, Eye, EyeOff, Layers,
    Home, Building2, Factory, RefreshCw, SunMedium, List,
    Workflow,
} from 'lucide-react';
import { AutomationBuilder } from '../components/automation';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { MODULE_DEFS, ROLE_DEFS, ACTION_DEFS } from '../config/features.config';
import { settingsApi } from '../services/settingsApi';
import {
    PROJECT_TYPE_LIST, PROJECT_TYPES, ADMIN_EDITABLE_FIELDS,
    PROJECT_TYPE_DEFAULTS,
} from '../config/projectTypes.config';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICON_MAP = {
    LayoutDashboard, Users, MapPin, Pencil, FileText, FolderOpen,
    Package, ShoppingCart, Truck, Wrench, CheckCircle, DollarSign,
    Headphones, FileCheck, Settings, Shield,
};
const ModIcon = ({ name, size = 14, className = '' }) => {
    const Icon = ICON_MAP[name] || Settings;
    return <Icon size={size} className={className} />;
};

// ─── Reusable toggle switch ───────────────────────────────────────────────────
const Toggle = ({ on, onChange, size = 'md', disabled = false }) => {
    const w = size === 'sm' ? 'w-7 h-4' : 'w-10 h-5';
    const k = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    const t = size === 'sm' ? (on ? 'translate-x-3' : 'translate-x-0') : (on ? 'translate-x-5' : 'translate-x-0');
    return (
        <button
            onClick={e => { e.stopPropagation(); if (!disabled) onChange(!on); }}
            disabled={disabled}
            className={`relative inline-flex items-center rounded-full transition-all duration-200 focus:outline-none ${w} ${on ? 'bg-[var(--accent)]' : 'bg-[var(--bg-overlay)]'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span className={`inline-block ${k} rounded-full bg-[var(--bg-surface)] shadow transform transition-transform duration-200 ml-0.5 ${t}`} />
        </button>
    );
};

// ─── CRM: Lead Status Builder ────────────────────────────────────────────────
function LeadStatusBuilder() {
    const [loading, setLoading] = useState(true);
    const [statuses, setStatuses] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState({
        key: '',
        label: '',
        color: '#64748b',
        type: 'pending',
    });

    const load = async () => {
        try {
            setLoading(true);
            const res = await settingsApi.getLeadStatuses(true);
            const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
            setStatuses(list);
        } catch (e) {
            toast.error(e?.message || 'Failed to load lead statuses');
            setStatuses([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({
            key: '',
            label: '',
            color: '#64748b',
            type: 'normal',
            surveyStatus: '',
            customerStatus: '',
            surveyColor: '#0ea5e9',
            customerColor: '#22c55e',
        });
        setModalOpen(true);
    };

    const openEdit = (s) => {
        setEditing(s);
        setForm({
            key: s?.key || '',
            label: s?.label || '',
            color: s?.color || '#64748b',
            type: s?.type || 'normal',
            surveyStatus: '',
            customerStatus: '',
            surveyColor: '#0ea5e9',
            customerColor: '#22c55e',
        });
        setModalOpen(true);
    };

    const slugifyKey = (value) => {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    };

    const upsertByKey = async (key, payload) => {
        const allRes = await settingsApi.getLeadStatuses(false);
        const all = Array.isArray(allRes?.data?.data) ? allRes.data.data : Array.isArray(allRes?.data) ? allRes.data : [];
        const existing = (all || []).find(s => String(s?.key || '').toLowerCase() === String(key || '').toLowerCase());

        if (existing) {
            await settingsApi.updateLeadStatus(existing._id || existing.id, {
                label: payload.label,
                color: payload.color,
                type: payload.type,
                moduleConnection: payload.moduleConnection,
                isActive: true,
            });
            return { action: 'updated' };
        }

        await settingsApi.createLeadStatus(payload);
        return { action: 'created' };
    };

    const save = async () => {
        const mainLabel = form.label?.trim();
        const mainKey = form.key?.trim();
        const surveyLabel = form.surveyStatus?.trim();
        const customerLabel = form.customerStatus?.trim();

        if (!editing) {
            const wantsMain = Boolean(mainLabel || mainKey);
            const wantsSurvey = Boolean(surveyLabel);
            const wantsCustomer = Boolean(customerLabel);

            if (!wantsMain && !wantsSurvey && !wantsCustomer) {
                toast.error('Please enter at least one status (Main, Survey, or Customer)');
                return;
            }

            if (wantsMain) {
                if (!mainLabel) {
                    toast.error('Label is required');
                    return;
                }
                if (!mainKey) {
                    toast.error('Key is required');
                    return;
                }
            }
        } else {
            if (!mainLabel) {
                toast.error('Label is required');
                return;
            }
        }

        try {
            setSaving(true);
            if (editing) {
                await settingsApi.updateLeadStatus(editing._id || editing.id, {
                    label: mainLabel,
                    color: form.color,
                    type: form.type,
                });
                toast.success('Status updated');
            } else {
                const createdLabels = [];

                const wantsMain = Boolean(mainLabel || mainKey);
                if (wantsMain) {
                    await upsertByKey(mainKey, {
                        key: mainKey,
                        label: mainLabel,
                        color: form.color,
                        type: form.type,
                    });
                    createdLabels.push(mainLabel);
                }

                if (surveyLabel) {
                    const key = slugifyKey(surveyLabel);
                    if (!key) {
                        toast.error('Survey Status is invalid');
                        return;
                    }
                    await upsertByKey(key, {
                        key,
                        label: surveyLabel,
                        color: form.surveyColor || form.color,
                        type: form.type,
                        moduleConnection: 'survey',
                    });
                    createdLabels.push(surveyLabel);
                }

                if (customerLabel) {
                    const key = slugifyKey(customerLabel);
                    if (!key) {
                        toast.error('Customer Status is invalid');
                        return;
                    }
                    await upsertByKey(key, {
                        key,
                        label: customerLabel,
                        color: form.customerColor || form.color,
                        type: form.type,
                        moduleConnection: 'customer',
                    });
                    createdLabels.push(customerLabel);
                }

                toast.success(createdLabels.length > 1 ? 'Statuses created' : 'Status created');
            }
            setModalOpen(false);
            await load();
        } catch (e) {
            toast.error(e?.message || 'Failed to save status');
        } finally {
            setSaving(false);
        }
    };

    const remove = async (s) => {
        setDeleteTarget(s);
        setDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            const res = await settingsApi.deleteLeadStatus(deleteTarget._id || deleteTarget.id, { force: 'true' });
            const ok = res?.success === true || res?.data?.success === true;
            if (!ok) {
                const msg = res?.message || res?.data?.message || 'Failed to delete status';
                throw new Error(msg);
            }
            toast.success(res?.message || res?.data?.message || 'Status deleted');
            setDeleteOpen(false);
            setDeleteTarget(null);
            await load();
        } catch (e) {
            toast.error(e?.message || 'Failed to delete status');
        } finally {
            setDeleting(false);
        }
    };

    const onDragEnd = async (result) => {
        if (!result?.destination) return;
        const from = result.source.index;
        const to = result.destination.index;
        if (from === to) return;

        const next = Array.from(statuses);
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setStatuses(next);

        try {
            await settingsApi.reorderLeadStatuses(next.map(s => s._id || s.id));
            toast.success('Order updated');
            await load();
        } catch (e) {
            toast.error(e?.message || 'Failed to reorder statuses');
            await load();
        }
    };

    return (
        <div className="rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-base)]">
                <div>
                    <p className="text-xs font-extrabold text-[var(--text-primary)]">Lead Status Builder</p>
                    <p className="text-[10px] text-[var(--text-faint)] mt-0.5">Configure tenant-scoped lead statuses (key + label + color + type) and reorder by drag & drop.</p>
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--accent)] text-black hover:opacity-90 transition-opacity">
                    <Plus size={10} /> Add Status
                </button>
            </div>

            {loading ? (
                <div className="p-4">
                    <p className="text-xs text-[var(--text-faint)]">Loading…</p>
                </div>
            ) : (
                <div className="p-3">
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="lead-statuses">
                            {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                                    {statuses.map((s, index) => (
                                        <Draggable key={`status-${s._id || s.id || s.key || index}`} draggableId={String(s._id || s.id || s.key || index)} index={index}>
                                            {(drag) => (
                                                <div ref={drag.innerRef} {...drag.draggableProps}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border border-[var(--border-base)] bg-[var(--bg-elevated)]`}
                                                >
                                                    <div {...drag.dragHandleProps} className="text-[var(--text-faint)] text-xs select-none w-5 text-center">≡</div>
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">{s.label}</span>
                                                            <code className="text-[9px] px-2 py-0.5 rounded bg-[var(--bg-overlay)] border border-[var(--border-base)] text-[var(--text-faint)]">{s.key}</code>
                                                            <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--bg-overlay)] border border-[var(--border-base)] text-[var(--text-faint)] uppercase">{s.type}</span>
                                                            {!s.isActive && <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold">INACTIVE</span>}
                                                            {s.isSystem && <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">SYSTEM</span>}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => openEdit(s)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors">
                                                        <Edit2 size={12} />
                                                    </button>
                                                    {!s.isSystem && (
                                                        <button onClick={() => remove(s)}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border-base)] text-[var(--text-faint)] hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-colors">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                    {statuses.length === 0 && (
                                        <div className="p-8 text-center text-[var(--text-faint)] text-xs">
                                            No statuses configured yet.
                                        </div>
                                    )}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            )}

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Edit Lead Status' : 'Add Lead Status'}
                size="sm"
                footer={
                    <>
                        <button onClick={() => setModalOpen(false)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                            Cancel
                        </button>
                        <button onClick={save} disabled={saving}
                            className={`px-4 py-2 rounded-lg text-xs font-bold bg-[var(--accent)] text-black hover:opacity-90 transition-opacity ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </>
                }
            >
                <div className="space-y-3">
                    {!editing && (
                        <div>
                            <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Key *</label>
                            <input
                                value={form.key}
                                onChange={e => setForm(p => ({ ...p, key: e.target.value }))}
                                placeholder="e.g. contacted"
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
                            />
                            <p className="text-[10px] text-[var(--text-faint)] mt-1">Stored on lead as <code>statusKey</code>. Do not use labels here.</p>
                        </div>
                    )}

                    <div>
                        <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Label *</label>
                        <input
                            value={form.label}
                            onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                            placeholder="e.g. Contacted"
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Color</label>
                            <input
                                type="color"
                                value={form.color}
                                onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                                className="w-full h-10 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)]"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Type</label>
                            <select
                                value={form.type}
                                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                            >
                                <option value="start">start</option>
                                <option value="pending">pending</option>
                                <option value="success">success</option>
                                <option value="dead">dead</option>
                            </select>
                        </div>
                    </div>

                    {!editing && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-1">
                                    <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Survey Status (optional)</label>
                                    <input
                                        value={form.surveyStatus}
                                        onChange={e => setForm(p => ({ ...p, surveyStatus: e.target.value }))}
                                        placeholder="e.g. Site Visit"
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Survey Color</label>
                                    <input
                                        type="color"
                                        value={form.surveyColor}
                                        onChange={e => setForm(p => ({ ...p, surveyColor: e.target.value }))}
                                        className="w-full h-10 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-1">
                                    <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Customer Status (optional)</label>
                                    <input
                                        value={form.customerStatus}
                                        onChange={e => setForm(p => ({ ...p, customerStatus: e.target.value }))}
                                        placeholder="e.g. Converted"
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Customer Color</label>
                                    <input
                                        type="color"
                                        value={form.customerColor}
                                        onChange={e => setForm(p => ({ ...p, customerColor: e.target.value }))}
                                        className="w-full h-10 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)]"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            <Modal
                open={deleteOpen}
                onClose={() => { if (!deleting) { setDeleteOpen(false); setDeleteTarget(null); } }}
                title="Delete Lead Status"
                size="sm"
                footer={
                    <>
                        <button
                            onClick={() => { if (!deleting) { setDeleteOpen(false); setDeleteTarget(null); } }}
                            className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={deleting}
                            className={`px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:opacity-90 transition-opacity ${deleting ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                    </>
                }
            >
                <div className="space-y-2">
                    <p className="text-xs text-[var(--text-faint)]">
                        Are you sure you want to delete this status?
                    </p>
                    <div className="rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] px-3 py-2">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{deleteTarget?.label || '—'}</p>
                        <p className="text-[10px] text-[var(--text-faint)] mt-0.5">{deleteTarget?.key || ''}</p>
                        <p className="text-[10px] text-[var(--text-faint)] mt-1">
                            This will hide the status (soft delete). Existing leads already in this status will keep the same stage key.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle, badge, children }) => (
    <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                <Icon size={16} className="text-[var(--accent)]" />
            </div>
            <div>
                <h2 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    {title}
                    {badge !== undefined && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25">
                            {badge}
                        </span>
                    )}
                </h2>
                {subtitle && <p className="text-[11px] text-[var(--text-faint)] mt-0.5">{subtitle}</p>}
            </div>
        </div>
        {children}
    </div>
);

// ─── PANEL A: MODULE CONTROL ──────────────────────────────────────────────────
const ModulesPanel = () => {
    const { flags, toggleModule, toggleFeature, toggleAction, resetFlags } = useSettings();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState({});
    const [groupFilter, setGroupFilter] = useState('All');

    const groups = ['All', ...new Set(MODULE_DEFS.map(m => m.group))];

    const filtered = useMemo(() => {
        let mods = MODULE_DEFS;
        if (groupFilter !== 'All') mods = mods.filter(m => m.group === groupFilter);
        if (search) {
            const q = search.toLowerCase();
            mods = mods.filter(m =>
                m.label.toLowerCase().includes(q) ||
                m.description.toLowerCase().includes(q) ||
                Object.values(m.features).some(f => f.label.toLowerCase().includes(q))
            );
        }
        return mods;
    }, [search, groupFilter]);

    const enabledCount = MODULE_DEFS.filter(m => flags[m.id]?.enabled).length;

    return (
        <div>
            <SectionHeader icon={Flag} title="Modules Control" subtitle="Toggle entire modules and their sub-features." badge={`${enabledCount}/${MODULE_DEFS.length} active`}>
                <button onClick={() => resetFlags(user?.name)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors">
                    <RotateCcw size={10} /> Reset All
                </button>
            </SectionHeader>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules or features…"
                        className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                </div>
                <div className="flex gap-1 flex-wrap">
                    {groups.map(g => (
                        <button key={g} onClick={() => setGroupFilter(g)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${groupFilter === g ? 'bg-[var(--accent)] border-[var(--accent)] text-black' : 'border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--text-primary)]'}`}>
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* Module cards */}
            <div className="space-y-2">
                {filtered.map(mod => {
                    const modState = flags[mod.id] || { enabled: true, features: {}, actions: {} };
                    const isEnabled = modState.enabled;
                    const isOpen = expanded[mod.id];
                    const featCount = Object.keys(mod.features).length;
                    const featOnCount = Object.values(modState.features || {}).filter(Boolean).length;

                    return (
                        <div key={mod.id} className={`rounded-xl border transition-all duration-200 overflow-hidden ${isEnabled ? 'border-[var(--border-base)]' : 'border-[var(--border-base)] opacity-60'}`}
                            style={{ background: isEnabled ? 'var(--bg-surface)' : 'var(--bg-elevated)' }}>

                            {/* Module header row */}
                            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                                onClick={() => setExpanded(p => ({ ...p, [mod.id]: !p[mod.id] }))}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: isEnabled ? 'rgba(245,158,11,0.09)' : 'var(--bg-overlay)', border: `1px solid ${isEnabled ? 'rgba(245,158,11,0.18)' : 'var(--border-base)'}` }}>
                                    <ModIcon name={mod.icon} size={14} className={isEnabled ? 'text-[var(--accent)]' : 'text-[var(--text-faint)]'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs font-bold ${isEnabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-faint)]'}`}>{mod.label}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium border" style={{ color: isEnabled ? 'var(--accent)' : 'var(--text-faint)', background: isEnabled ? 'rgba(245,158,11,0.07)' : 'transparent', borderColor: isEnabled ? 'rgba(245,158,11,0.20)' : 'var(--border-base)' }}>
                                            {mod.group}
                                        </span>
                                        {featCount > 0 && (
                                            <span className="text-[9px] text-[var(--text-faint)]">{featOnCount}/{featCount} features</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-[var(--text-faint)] truncate mt-0.5">{mod.description}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {!isEnabled && <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">DISABLED</span>}
                                    <Toggle on={isEnabled} onChange={() => toggleModule(mod.id, user?.name)} />
                                    <div className="text-[var(--text-faint)] ml-1">
                                        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded: sub-features + actions */}
                            {isOpen && (
                                <div className="border-t border-[var(--border-base)] bg-[var(--bg-elevated)] px-4 py-3 space-y-4">

                                    {/* Sub-features */}
                                    {Object.keys(mod.features).length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider mb-2">Sub-Features</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {Object.entries(mod.features).map(([featId, featDef]) => {
                                                    const on = modState.features?.[featId] ?? true;
                                                    return (
                                                        <div key={featId} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)]">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{featDef.label}</p>
                                                                <p className="text-[9px] text-[var(--text-faint)] truncate">{featDef.description}</p>
                                                            </div>
                                                            <Toggle on={on} onChange={() => toggleFeature(mod.id, featId, user?.name)} size="sm" disabled={!isEnabled} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div>
                                        <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider mb-2">Allowed Actions</p>
                                        <div className="flex flex-wrap gap-2">
                                            {ACTION_DEFS.map(act => {
                                                const on = modState.actions?.[act.id] ?? false;
                                                return (
                                                    <button key={act.id} onClick={() => toggleAction(mod.id, act.id, user?.name)}
                                                        disabled={!isEnabled}
                                                        title={act.description}
                                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${on && isEnabled ? 'bg-[var(--accent)]/12 border-[var(--accent)]/35 text-[var(--accent)]' : 'border-[var(--border-base)] text-[var(--text-faint)]'} ${!isEnabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-[var(--accent)]/50'}`}>
                                                        {on ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={3} />}
                                                        {act.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* CRM → Lead: Dynamic Status Builder */}
                                    {mod.id === 'crm' && (
                                        <div>
                                            <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider mb-2">CRM · Lead</p>
                                            <LeadStatusBuilder />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-faint)]">
                        <Search size={20} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No modules match "{search}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── PANEL B: RBAC MATRIX ────────────────────────────────────────────────────
const RBACPanel = () => {
    const { customRoles, toggleCustomRolePermission, setCustomRolePreset } = useSettings();
    const { user } = useAuth();
    const [selectedRole, setSelectedRole] = useState('');
    const [modFilter, setModFilter] = useState('');

    const roleList = useMemo(() => Object.values(customRoles || {}), [customRoles]);

    // Set initial role when roleList loads
    useEffect(() => {
        if (roleList?.length > 0 && !selectedRole) {
            setSelectedRole(roleList[0].id);
        }
    }, [roleList, selectedRole]);

    const roleDef = roleList?.find(r => r.id === selectedRole);

    // Debug: Log MODULE_DEFS
    console.log('[DEBUG] MODULE_DEFS:', MODULE_DEFS);
    console.log('[DEBUG] MODULE_DEFS length:', MODULE_DEFS?.length);

    const filteredMods = MODULE_DEFS.filter(m =>
        !modFilter || m.label.toLowerCase().includes(modFilter.toLowerCase())
    );

    console.log('[DEBUG] filteredMods:', filteredMods);
    console.log('[DEBUG] filteredMods length:', filteredMods?.length);

    const roleStats = useMemo(() => {
        let total = 0, granted = 0;
        MODULE_DEFS.forEach(mod => {
            ACTION_DEFS.forEach(act => {
                total++;
                if (roleDef?.permissions?.[mod.id]?.[act.id]) granted++;
            });
        });
        return { total, granted, pct: total > 0 ? ((granted / total) * 100).toFixed(0) : 0 };
    }, [roleDef]);

    return (
        <div>
            <SectionHeader icon={Shield} title="Role & Permissions Matrix" subtitle="Configure what each role can do per module.">
            </SectionHeader>

            {roleList.length === 0 && (
                <div className="p-4 rounded-xl border-2 border-dashed border-[var(--border-base)] text-center">
                    <p className="text-[11px] text-[var(--text-faint)]">No custom roles found in DB. Create one in Role Builder.</p>
                </div>
            )}

            {roleList.length > 0 && (
                <>

                    {/* Role selector tabs */}
                    <div className="flex flex-wrap gap-2 mb-5">
                        {roleList?.map(role => (
                            <button key={role.id} onClick={() => setSelectedRole(role.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selectedRole === role.id ? 'text-white border-transparent' : 'border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--text-primary)]'}`}
                                style={selectedRole === role.id ? { background: role.color, borderColor: role.color } : {}}>
                                {role.label}
                            </button>
                        ))}
                    </div>

                    {/* Selected role header */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl mb-4"
                        style={{ background: roleDef?.bg, border: `1px solid ${roleDef?.color}30` }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black"
                                style={{ background: roleDef?.color }}>
                                {roleDef?.label.charAt(0)}
                            </div>
                            <div>
                                <p className="text-xs font-extrabold text-[var(--text-primary)]">{roleDef?.label}</p>
                                <p className="text-[10px] text-[var(--text-faint)]">{roleDef?.description}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-lg font-black" style={{ color: roleDef?.color }}>{roleStats.pct}%</p>
                                <p className="text-[10px] text-[var(--text-faint)]">{roleStats.granted}/{roleStats.total} perms</p>
                            </div>
                            {/* Preset buttons */}
                            <div className="flex flex-col gap-1">
                                {[['full', 'Full Access'], ['view_only', 'View Only'], ['none', 'No Access']].map(([preset, label]) => (
                                    <button key={preset} onClick={() => setCustomRolePreset(selectedRole, preset, user?.name)}
                                        className="px-2 py-1 rounded text-[9px] font-bold border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors whitespace-nowrap">
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Module search */}
                    <div className="relative mb-3">
                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                        <input value={modFilter} onChange={e => setModFilter(e.target.value)} placeholder="Filter modules…"
                            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                    </div>

                    {/* Permission Matrix Table */}
                    <div className="glass-card overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wide w-40">Module</th>
                                    {ACTION_DEFS.map(act => (
                                        <th key={act.id} className="px-3 py-3 text-center text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wide">
                                            {act.label}
                                        </th>
                                    ))}
                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wide">Access</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMods.map((mod, i) => {
                                    const row = roleDef?.permissions?.[mod.id] || {};
                                    const accessCount = ACTION_DEFS.filter(a => row[a.id]).length;
                                    return (
                                        <tr key={mod.id} className={`border-b border-[var(--border-base)] transition-colors hover:bg-[var(--bg-hover)] ${i % 2 === 0 ? '' : 'bg-[var(--bg-elevated)]/40'}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <ModIcon name={mod.icon} size={12} className="text-[var(--text-faint)]" />
                                                    <span className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap">{mod.label}</span>
                                                </div>
                                            </td>
                                            {ACTION_DEFS.map(act => {
                                                const granted = row[act.id] ?? false;
                                                return (
                                                    <td key={act.id} className="px-3 py-3 text-center">
                                                        <button onClick={() => toggleCustomRolePermission(selectedRole, mod.id, act.id, user?.name)}
                                                            title={`${granted ? 'Revoke' : 'Grant'} ${act.label} on ${mod.label}`}
                                                            className={`w-6 h-6 rounded-md mx-auto flex items-center justify-center border transition-all ${granted ? 'border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]' : 'border-[var(--border-base)] text-[var(--text-faint)] hover:border-[var(--accent)]/40'}`}>
                                                            {granted ? <Check size={10} strokeWidth={3} /> : <X size={9} strokeWidth={2} />}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <div className="w-16 h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                                                        <div className="h-full rounded-full transition-all" style={{ width: `${(accessCount / ACTION_DEFS.length) * 100}%`, background: roleDef?.color }} />
                                                    </div>
                                                    <span className="text-[9px] font-bold" style={{ color: roleDef?.color }}>{accessCount}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── PANEL C: FEATURE FLAGS ───────────────────────────────────────────────────
const FeatureFlagsPanel = () => {
    const { flags, toggleModule, toggleFeature } = useSettings();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    // Flatten all flags to a searchable list
    const allFlags = useMemo(() => {
        const list = [];
        MODULE_DEFS.forEach(mod => {
            list.push({
                key: mod.id,
                moduleId: mod.id,
                featureId: null,
                label: mod.label,
                description: mod.description,
                group: mod.group,
                type: 'MODULE',
                enabled: flags[mod.id]?.enabled ?? true,
                parentEnabled: true,
            });
            Object.entries(mod.features).forEach(([featId, featDef]) => {
                list.push({
                    key: `${mod.id}.${featId}`,
                    moduleId: mod.id,
                    featureId: featId,
                    label: featDef.label,
                    description: featDef.description,
                    group: mod.group,
                    type: 'FEATURE',
                    enabled: flags[mod.id]?.features?.[featId] ?? true,
                    parentEnabled: flags[mod.id]?.enabled ?? true,
                    parentLabel: mod.label,
                });
            });
        });
        return list;
    }, [flags]);

    const filtered = useMemo(() => {
        let list = allFlags;
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(f => f.label.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.group.toLowerCase().includes(q));
        }
        if (groupFilter !== 'All') list = list.filter(f => f.group === groupFilter);
        if (statusFilter === 'ON') list = list.filter(f => f.enabled);
        if (statusFilter === 'OFF') list = list.filter(f => !f.enabled);
        return list;
    }, [allFlags, search, groupFilter, statusFilter]);

    const onCount = allFlags.filter(f => f.enabled).length;
    const offCount = allFlags.filter(f => !f.enabled).length;
    const groups = ['All', ...new Set(MODULE_DEFS.map(m => m.group))];

    return (
        <div>
            <SectionHeader icon={Zap} title="Feature Flags Panel" subtitle="Search and toggle every system flag in one place."
                badge={`${onCount} ON · ${offCount} OFF`}>
            </SectionHeader>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flags…"
                        className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                </div>
                <div className="flex gap-1">
                    {['All', 'ON', 'OFF'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${statusFilter === s
                                ? s === 'ON' ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                    : s === 'OFF' ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                        : 'bg-[var(--accent)] border-[var(--accent)] text-black'
                                : 'border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--text-primary)]'}`}>
                            {s}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1 flex-wrap">
                    {groups.map(g => (
                        <button key={g} onClick={() => setGroupFilter(g)}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${groupFilter === g ? 'bg-[var(--accent)] border-[var(--accent)] text-black' : 'border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--text-primary)]'}`}>
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* Flag count */}
            <p className="text-[11px] text-[var(--text-faint)] mb-3">
                Showing <strong className="text-[var(--text-primary)]">{filtered.length}</strong> of {allFlags.length} flags
            </p>

            {/* Flag list */}
            <div className="space-y-1.5">
                {filtered.map(flag => (
                    <div key={flag.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${flag.enabled ? 'border-[var(--border-base)] bg-[var(--bg-surface)]' : 'border-[var(--border-base)]/50 bg-[var(--bg-elevated)]/50 opacity-70'}`}>
                        {/* Type badge */}
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wide ${flag.type === 'MODULE' ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25' : 'bg-[var(--bg-hover)] text-[var(--primary-light)] border border-[var(--border-active)]'}`}>
                            {flag.type}
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-[var(--text-primary)]">{flag.label}</span>
                                {flag.type === 'FEATURE' && (
                                    <span className="text-[9px] text-[var(--text-faint)]">in {flag.parentLabel}</span>
                                )}
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-overlay)] text-[var(--text-faint)] border border-[var(--border-base)]">{flag.group}</span>
                            </div>
                            <p className="text-[10px] text-[var(--text-faint)] mt-0.5 truncate">{flag.description}</p>
                        </div>
                        {/* Key display */}
                        <code className="hidden lg:block text-[9px] text-[var(--text-faint)] bg-[var(--bg-overlay)] px-2 py-0.5 rounded font-mono border border-[var(--border-base)] shrink-0">
                            {flag.key}
                        </code>
                        {/* Status indicator */}
                        <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full ${flag.enabled ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {flag.enabled ? 'ON' : 'OFF'}
                        </span>
                        {/* Toggle */}
                        <Toggle
                            on={flag.enabled}
                            onChange={() => flag.featureId ? toggleFeature(flag.moduleId, flag.featureId, user?.name) : toggleModule(flag.moduleId, user?.name)}
                            size="sm"
                        />
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-faint)]">
                        <Search size={20} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No flags match your search</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── PANEL D: WORKFLOW RULES ──────────────────────────────────────────────────
const OPERATORS = ['=', '≠', '>', '<', '≥', '≤', 'contains', 'is empty'];
const FIELDS = ['lead_stage', 'invoice_status', 'inventory_level', 'project_status', 'ticket_status', 'payment_status'];
const ACTIONS_T = ['enable_feature', 'disable_feature', 'create_record', 'send_notification', 'assign_user', 'trigger_webhook'];

const WorkflowPanel = () => {
    const { workflows, toggleWorkflow, addWorkflow, deleteWorkflow } = useSettings();
    const { user } = useAuth();
    const [addOpen, setAddOpen] = useState(false);
    const [form, setForm] = useState({
        label: '', description: '', enabled: true,
        condition: { field: 'lead_stage', operator: '=', value: '' },
        action: { type: 'enable_feature', target: '' },
    });
    const [errors, setErrors] = useState({});

    const handleAdd = () => {
        const e = {};
        if (!form.label) e.label = 'Required';
        if (!form.condition.value) e.value = 'Required';
        if (!form.action.target) e.target = 'Required';
        if (Object.keys(e).length > 0) { setErrors(e); return; }
        addWorkflow(form, user?.name);
        setAddOpen(false);
        setForm({ label: '', description: '', enabled: true, condition: { field: 'lead_stage', operator: '=', value: '' }, action: { type: 'enable_feature', target: '' } });
        setErrors({});
    };

    const activeCount = workflows.filter(w => w.enabled).length;

    return (
        <div>
            <SectionHeader icon={GitBranch} title="Workflow Rules" subtitle="Conditional automation — IF condition THEN action." badge={`${activeCount} active`}>
                <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--accent)] text-black hover:opacity-90 transition-opacity">
                    <Plus size={10} /> New Rule
                </button>
            </SectionHeader>

            <div className="space-y-3">
                {workflows.map(wf => (
                    <div key={wf.id} className={`p-4 rounded-xl border transition-all ${wf.enabled ? 'border-[var(--border-base)] bg-[var(--bg-surface)]' : 'border-[var(--border-base)]/50 bg-[var(--bg-elevated)]/50 opacity-60'}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                    <span className="text-xs font-bold text-[var(--text-primary)]">{wf.label}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${wf.enabled ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-[var(--bg-overlay)] text-[var(--text-faint)] border border-[var(--border-base)]'}`}>
                                        {wf.enabled ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>
                                {wf.description && <p className="text-[10px] text-[var(--text-faint)] mb-3">{wf.description}</p>}

                                {/* Rule display */}
                                <div className="flex items-center flex-wrap gap-2 text-[11px]">
                                    <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-active)] text-[var(--primary-light)] font-semibold">IF</span>
                                    <code className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-primary)] font-mono text-[10px]">
                                        {wf.condition.field}
                                    </code>
                                    <span className="px-2 py-1 rounded bg-[var(--bg-overlay)] border border-[var(--border-base)] text-[var(--text-faint)] font-mono text-[10px]">
                                        {wf.condition.operator}
                                    </span>
                                    <code className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--accent)] font-mono text-[10px]">
                                        "{wf.condition.value}"
                                    </code>
                                    <ArrowRight size={10} className="text-[var(--text-faint)]" />
                                    <span className="px-2.5 py-1 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/25 text-[var(--accent)] font-semibold">THEN</span>
                                    <code className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-primary)] font-mono text-[10px]">
                                        {wf.action.type}
                                    </code>
                                    <span className="text-[var(--text-faint)]">→</span>
                                    <code className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] text-green-400 font-mono text-[10px]">
                                        {wf.action.target}
                                    </code>
                                </div>

                                <p className="text-[9px] text-[var(--text-faint)] mt-2">
                                    Created by {wf.createdBy} · {wf.createdAt}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <Toggle on={wf.enabled} onChange={() => toggleWorkflow(wf.id, user?.name)} size="sm" />
                                <button onClick={() => deleteWorkflow(wf.id, user?.name)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border-base)] text-[var(--text-faint)] hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/8 transition-all">
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Rule Modal */}
            <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Workflow Rule" size="lg">
                <div className="space-y-4 p-1">
                    {/* Label */}
                    <div>
                        <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Rule Name *</label>
                        <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Qualified Lead → Enable Quotation"
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                        {errors.label && <p className="text-[10px] text-red-400 mt-1">{errors.label}</p>}
                    </div>
                    {/* Description */}
                    <div>
                        <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Description</label>
                        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="What does this rule do?"
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] resize-none" />
                    </div>
                    {/* Condition */}
                    <div className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-active)]">
                        <p className="text-[10px] font-bold text-[var(--primary-light)] uppercase tracking-wider mb-3">IF Condition</p>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-[10px] text-[var(--text-faint)] block mb-1">Field</label>
                                <select value={form.condition.field} onChange={e => setForm(p => ({ ...p, condition: { ...p.condition, field: e.target.value } }))}
                                    className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                                    {FIELDS.map(f => <option key={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-[var(--text-faint)] block mb-1">Operator</label>
                                <select value={form.condition.operator} onChange={e => setForm(p => ({ ...p, condition: { ...p.condition, operator: e.target.value } }))}
                                    className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                                    {OPERATORS.map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-[var(--text-faint)] block mb-1">Value *</label>
                                <input value={form.condition.value} onChange={e => setForm(p => ({ ...p, condition: { ...p.condition, value: e.target.value } }))} placeholder="e.g. qualified"
                                    className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                                {errors.value && <p className="text-[10px] text-red-400 mt-0.5">{errors.value}</p>}
                            </div>
                        </div>
                    </div>
                    {/* Action */}
                    <div className="p-3 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/15">
                        <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider mb-3">THEN Action</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-[var(--text-faint)] block mb-1">Action Type</label>
                                <select value={form.action.type} onChange={e => setForm(p => ({ ...p, action: { ...p.action, type: e.target.value } }))}
                                    className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                                    {ACTIONS_T.map(a => <option key={a}>{a}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-[var(--text-faint)] block mb-1">Target *</label>
                                <input value={form.action.target} onChange={e => setForm(p => ({ ...p, action: { ...p.action, target: e.target.value } }))} placeholder="e.g. quotation or crm.kanban_view"
                                    className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                                {errors.target && <p className="text-[10px] text-red-400 mt-0.5">{errors.target}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
                        <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-xs font-bold bg-[var(--accent)] text-black hover:opacity-90 transition-opacity flex items-center gap-1.5">
                            <Plus size={11} /> Create Rule
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// ─── PANEL E: AUDIT LOGS ──────────────────────────────────────────────────────
const ACTION_COLORS = {
    TOGGLE_MODULE: '#f59e0b',
    TOGGLE_FEATURE: '#3b82f6',
    TOGGLE_ACTION: '#8b5cf6',
    RBAC_EDIT: '#22c55e',
    ROLE_PRESET: '#06b6d4',
    RESET_FLAGS: '#ef4444',
    RESET_RBAC: '#ef4444',
    WORKFLOW_CREATED: '#22c55e',
    WORKFLOW_TOGGLE: '#f97316',
    WORKFLOW_DELETED: '#ef4444',
    ROLLBACK: '#ec4899',
};

const AuditPanel = () => {
    const { auditLogs, rollbackAudit } = useSettings();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');

    const types = ['All', ...new Set(auditLogs.map(l => l.action))];
    const filtered = useMemo(() => {
        let list = auditLogs;
        if (search) { const q = search.toLowerCase(); list = list.filter(l => l.target.toLowerCase().includes(q) || l.user.toLowerCase().includes(q) || l.action.toLowerCase().includes(q)); }
        if (typeFilter !== 'All') list = list.filter(l => l.action === typeFilter);
        return list;
    }, [auditLogs, search, typeFilter]);

    return (
        <div>
            <SectionHeader icon={ScrollText} title="Audit Log" subtitle="Full history of every settings change, with rollback capability." badge={auditLogs.length}>
            </SectionHeader>

            <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs…"
                        className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                </div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                    {types.map(t => <option key={t}>{t}</option>)}
                </select>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors">
                    <Download size={10} /> Export
                </button>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
                            <tr>
                                {['Timestamp', 'User', 'Action', 'Target', 'From → To', 'IP', ''].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold text-[var(--text-faint)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((log, i) => {
                                const col = ACTION_COLORS[log.action] || '#94a3b8';
                                return (
                                    <tr key={log.id} className={`border-b border-[var(--border-base)] hover:bg-[var(--bg-hover)] transition-colors ${i % 2 === 0 ? '' : 'bg-[var(--bg-elevated)]/40'}`}>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={10} className="text-[var(--text-faint)] shrink-0" />
                                                <span className="text-[10px] text-[var(--text-faint)] font-mono whitespace-nowrap">{log.ts}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-[8px] font-black shrink-0">
                                                    {log.user.charAt(0)}
                                                </div>
                                                <span className="text-[10px] text-[var(--text-primary)] whitespace-nowrap">{log.user}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono" style={{ color: col, background: col + '15', border: `1px solid ${col}30` }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 max-w-[160px]">
                                            <span className="text-[10px] text-[var(--text-secondary)] truncate block">{log.target}</span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1 text-[10px]">
                                                <span className="text-red-400 font-mono">{log.from}</span>
                                                <ArrowRight size={8} className="text-[var(--text-faint)]" />
                                                <span className="text-green-400 font-mono">{log.to}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className="text-[9px] text-[var(--text-faint)] font-mono">{log.ip}</span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <button onClick={() => rollbackAudit(log.id, user?.name)}
                                                title="Rollback this change"
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold border border-[var(--border-base)] text-[var(--text-faint)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors whitespace-nowrap">
                                                <RotateCcw size={8} /> Rollback
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10 text-[var(--text-faint)] text-xs">No audit records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── PANEL F: AI SUGGESTIONS ──────────────────────────────────────────────────
const AISuggestionsPanel = () => {
    const { flags, rbac } = useSettings();
    const [applied, setApplied] = useState({});

    // Derive suggestions from current state
    const suggestions = useMemo(() => {
        const list = [];

        // Check for modules disabled
        const disabledMods = MODULE_DEFS.filter(m => !(flags[m.id]?.enabled ?? true));
        if (disabledMods.length > 3) {
            list.push({
                id: 's1', type: 'warning', severity: 'medium',
                title: `${disabledMods.length} modules are disabled`,
                description: `${disabledMods.map(m => m.label).join(', ')} are OFF. Verify this is intentional to avoid gaps in the EPC workflow.`,
                action: 'Review Modules',
                target: 'modules',
            });
        }

        // Check for over-permissioned roles
        Object.entries(rbac).forEach(([roleId, mods]) => {
            const roleDef = ROLE_DEFS.find(r => r.id === roleId);
            if (!roleDef) return;
            const deleteCount = MODULE_DEFS.filter(m => mods[m.id]?.delete).length;
            if (deleteCount > 5) {
                list.push({
                    id: `s_del_${roleId}`, type: 'risk', severity: 'high',
                    title: `${roleDef.label} has delete access on ${deleteCount} modules`,
                    description: 'High delete access increases data loss risk. Consider restricting to Admin only.',
                    action: 'Review RBAC',
                    target: 'rbac',
                });
            }
        });

        // Check for unused features (all features OFF for a module)
        MODULE_DEFS.forEach(mod => {
            if (!(flags[mod.id]?.enabled ?? true)) return;
            const feats = flags[mod.id]?.features || {};
            const allOff = Object.keys(mod.features).length > 0 && Object.keys(mod.features).every(k => feats[k] === false);
            if (allOff) {
                list.push({
                    id: `s_feat_${mod.id}`, type: 'info', severity: 'low',
                    title: `${mod.label}: All sub-features disabled`,
                    description: `The ${mod.label} module is ON but all features are disabled. Either enable features or disable the module.`,
                    action: 'Fix Now',
                    target: 'modules',
                });
            }
        });

        // Positive insight
        const enabledPct = Math.round((MODULE_DEFS.filter(m => flags[m.id]?.enabled ?? true).length / MODULE_DEFS.length) * 100);
        list.push({
            id: 's_health', type: 'success', severity: 'none',
            title: `System health: ${enabledPct}% modules active`,
            description: 'Your Solar OS configuration is running well. All critical pipeline modules (CRM → Commissioning) are operational.',
            action: null,
            target: null,
        });

        return list;
    }, [flags, rbac]);

    const STYPE_STYLE = {
        risk: { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.20)' },
        warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.20)' },
        info: { icon: Info, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.20)' },
        success: { icon: CheckCircle, color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.20)' },
    };

    return (
        <div>
            <SectionHeader icon={Cpu} title="AI Suggestions" subtitle="Smart recommendations to optimise your configuration."
                badge={`${suggestions.filter(s => s.type !== 'success').length} items`}>
            </SectionHeader>

            {/* Risk overview bar */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { label: 'High Risk', count: suggestions.filter(s => s.severity === 'high').length, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                    { label: 'Medium Risk', count: suggestions.filter(s => s.severity === 'medium').length, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                    { label: 'Low / Info', count: suggestions.filter(s => s.severity === 'low').length, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                ].map(r => (
                    <div key={r.label} className="p-3 rounded-xl border text-center" style={{ background: r.bg, borderColor: r.color + '30' }}>
                        <p className="text-xl font-black" style={{ color: r.color }}>{r.count}</p>
                        <p className="text-[10px] text-[var(--text-faint)]">{r.label}</p>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                {suggestions.map(s => {
                    const style = STYPE_STYLE[s.type] || STYPE_STYLE.info;
                    const Icon = style.icon;
                    const isApplied = applied[s.id];
                    return (
                        <div key={s.id} className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: style.bg, borderColor: style.border }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: style.color + '20', border: `1px solid ${style.color}30` }}>
                                <Icon size={14} style={{ color: style.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[var(--text-primary)] mb-0.5">{s.title}</p>
                                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{s.description}</p>
                            </div>
                            {s.action && (
                                <button onClick={() => setApplied(p => ({ ...p, [s.id]: true }))}
                                    disabled={isApplied}
                                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isApplied ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--accent)] hover:border-[var(--accent)]'}`}>
                                    {isApplied ? <><Check size={9} className="inline mr-1" />Applied</> : s.action}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── PANEL G: ROLE BUILDER ───────────────────────────────────────────────────
const ROLE_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#84cc16', '#14b8a6',
];

const RoleBuilderPanel = () => {
    const { customRoles, createCustomRole, cloneRole,
        updateCustomRole, toggleCustomRolePermission,
        setCustomRolePreset, deleteCustomRole } = useSettings();
    const { user } = useAuth();

    const [selectedId, setSelectedId] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [cloneOpen, setCloneOpen] = useState(false);
    const [cloneSourceId, setCloneSourceId] = useState('');
    const [modFilter, setModFilter] = useState('');
    const [newRole, setNewRole] = useState({ label: '', description: '', color: '#8b5cf6' });
    const [cloneLabel, setCloneLabel] = useState('');
    const [editingLabel, setEditingLabel] = useState(false);
    const [labelDraft, setLabelDraft] = useState('');

    const selected = selectedId ? customRoles[selectedId] : null;

    // DEBUG: Check dataScope value
    console.log('[DEBUG] selected role:', selected?.id, 'dataScope:', selected?.dataScope);

    const filteredMods = MODULE_DEFS.filter(m => !modFilter || m.label.toLowerCase().includes(modFilter.toLowerCase()));

    const handleCreate = async () => {
        if (!newRole.label.trim()) return;
        const id = createCustomRole(newRole.label, newRole.description, null, user?.name);
        setSelectedId(id);
        setCreateOpen(false);
        setNewRole({ label: '', description: '', color: '#8b5cf6' });
    };

    const handleClone = async () => {
        if (!cloneSourceId) return;
        const id = await cloneRole(cloneSourceId, cloneLabel || undefined, user?.name);
        setSelectedId(id);
        setCloneOpen(false);
        setCloneLabel('');
        setCloneSourceId('');
    };

    const handleSaveLabel = () => {
        if (selected && labelDraft.trim()) {
            updateCustomRole(selectedId, { label: labelDraft }, user?.name);
        }
        setEditingLabel(false);
    };

    const customRoleList = Object.values(customRoles);

    return (
        <div>
            <SectionHeader icon={Layers} title="Role Builder"
                subtitle="Create custom roles, clone existing ones, and configure per-module permissions."
                badge={`${customRoleList.length} custom roles`}>
                <div className="flex gap-2">
                    <button onClick={() => { setCloneSourceId(customRoleList?.[0]?.id || ''); setCloneOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors">
                        <Copy size={10} /> Clone Role
                    </button>
                    <button onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[var(--accent)] text-black hover:opacity-90 transition-opacity">
                        <Plus size={10} /> New Role
                    </button>
                </div>
            </SectionHeader>

            <div className="flex gap-4">
                {/* Left: role list */}
                <div className="w-52 shrink-0 space-y-2">
                    {customRoleList.length > 0 && (
                        <>
                            <p className="text-[9px] font-bold text-[var(--text-faint)] uppercase tracking-wider mb-2">Custom Roles</p>
                            {customRoleList.map(r => (
                                <button key={r.id} onClick={() => setSelectedId(r.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] text-left transition-all ${selectedId === r.id ? 'border-[var(--accent)] bg-[var(--accent)]/8' : 'border-[var(--border-base)] hover:border-[var(--accent)]/40'}`}
                                    style={{ background: selectedId === r.id ? undefined : r.bg }}>
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                                    <span className="font-semibold text-[var(--text-primary)] truncate flex-1">{r.label}</span>
                                    <span className="text-[8px] text-[var(--accent)] bg-[var(--accent)]/10 px-1 rounded shrink-0">CUSTOM</span>
                                </button>
                            ))}
                        </>
                    )}

                    {customRoleList.length === 0 && (
                        <div className="mt-4 p-3 rounded-xl border-2 border-dashed border-[var(--border-base)] text-center">
                            <p className="text-[10px] text-[var(--text-faint)]">No custom roles yet.<br />Click "+ New Role" to create one.</p>
                        </div>
                    )}
                </div>

                {/* Right: permission matrix for selected custom role */}
                <div className="flex-1 min-w-0">
                    {!selected ? (
                        <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed border-[var(--border-base)]">
                            <p className="text-sm text-[var(--text-faint)]">Select a custom role to edit its permissions</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Role header */}
                            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border"
                                style={{ background: selected.bg, borderColor: selected.color + '40' }}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                                        style={{ background: selected.color }}>
                                        {selected.label.charAt(0).toUpperCase()}
                                    </div>
                                    {editingLabel ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input value={labelDraft} onChange={e => setLabelDraft(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSaveLabel()}
                                                className="flex-1 px-2 py-1 rounded-lg border border-[var(--accent)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] focus:outline-none" autoFocus />
                                            <button onClick={handleSaveLabel} className="text-[10px] px-2 py-1 rounded bg-[var(--accent)] text-black font-bold"><Check size={10} /></button>
                                            <button onClick={() => setEditingLabel(false)} className="text-[10px] px-2 py-1 rounded border border-[var(--border-base)] text-[var(--text-faint)]"><X size={10} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div>
                                                <p className="text-xs font-extrabold text-[var(--text-primary)]">{selected.label}</p>
                                                {selected.baseRole && <p className="text-[9px] text-[var(--text-faint)]">Base: {selected.baseRole}</p>}
                                            </div>
                                            <button onClick={() => { setLabelDraft(selected.label); setEditingLabel(true); }}
                                                className="opacity-60 hover:opacity-100 transition-opacity ml-1">
                                                <Edit2 size={10} className="text-[var(--text-faint)]" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {[['full', 'Full'], ['view_only', 'View'], ['none', 'None']].map(([p, l]) => (
                                        <button key={p} onClick={() => setCustomRolePreset(selectedId, p, user?.name)}
                                            className="px-2 py-1 rounded text-[9px] font-bold border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors">
                                            {l}
                                        </button>
                                    ))}
                                    <button onClick={() => { if (window.confirm(`Delete role "${selected.label}"?`)) { deleteCustomRole(selectedId, user?.name); setSelectedId(null); } }}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border-base)] text-[var(--text-faint)] hover:border-red-500/40 hover:text-red-400 transition-all">
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            </div>

                            {/* Data Visibility Section */}
                            <div className="p-3 rounded-xl border border-[var(--border-base)] bg-[var(--bg-elevated)]">
                                <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider mb-2">Data Visibility</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => updateCustomRole(selectedId, { dataScope: 'ALL' }, user?.name)}
                                        className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all ${selected.dataScope === 'ALL' || !selected.dataScope ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border-base)] text-[var(--text-faint)] hover:border-[var(--accent)]/40'}`}>
                                        All Data
                                    </button>
                                    <button
                                        onClick={() => updateCustomRole(selectedId, { dataScope: 'ASSIGNED' }, user?.name)}
                                        className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all ${selected.dataScope === 'ASSIGNED' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border-base)] text-[var(--text-faint)] hover:border-[var(--accent)]/40'}`}>
                                        Only Assigned
                                    </button>
                                </div>
                                <p className="text-[9px] text-[var(--text-faint)] mt-2">
                                    {selected.dataScope === 'ASSIGNED'
                                        ? 'Users with this role will only see records assigned to them.'
                                        : 'Users with this role will see all records in the system.'}
                                </p>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                                <input value={modFilter} onChange={e => setModFilter(e.target.value)} placeholder="Filter modules…"
                                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                            </div>

                            {/* Matrix */}
                            <div className="glass-card overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
                                        <tr>
                                            <th className="px-3 py-2.5 text-left text-[9px] font-bold text-[var(--text-faint)] uppercase tracking-wide w-36">Module</th>
                                            {ACTION_DEFS.map(act => (
                                                <th key={act.id} className="px-2 py-2.5 text-center text-[9px] font-bold text-[var(--text-faint)] uppercase tracking-wide">{act.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMods.map((mod, i) => {
                                            const row = selected.permissions?.[mod.id] || {};
                                            return (
                                                <tr key={mod.id} className={`border-b border-[var(--border-base)] hover:bg-[var(--bg-hover)] transition-colors ${i % 2 === 0 ? '' : 'bg-[var(--bg-elevated)]/30'}`}>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <ModIcon name={mod.icon} size={11} className="text-[var(--text-faint)]" />
                                                            <span className="text-[11px] font-semibold text-[var(--text-primary)] whitespace-nowrap">{mod.label}</span>
                                                        </div>
                                                    </td>
                                                    {ACTION_DEFS.map(act => {
                                                        const granted = row[act.id] ?? false;
                                                        return (
                                                            <td key={act.id} className="px-2 py-2.5 text-center">
                                                                <button onClick={() => toggleCustomRolePermission(selectedId, mod.id, act.id, user?.name)}
                                                                    className={`w-6 h-6 rounded-md mx-auto flex items-center justify-center border transition-all ${granted ? 'border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]' : 'border-[var(--border-base)] text-[var(--text-faint)] hover:border-[var(--accent)]/40'}`}>
                                                                    {granted ? <Check size={10} strokeWidth={3} /> : <X size={9} strokeWidth={2} />}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Role Modal */}
            <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Custom Role" size="md">
                <div className="space-y-4 p-1">
                    <div>
                        <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Role Name *</label>
                        <input value={newRole.label} onChange={e => setNewRole(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Field Supervisor"
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Description</label>
                        <textarea value={newRole.description} onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))} rows={2}
                            placeholder="Describe this role's purpose…"
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] resize-none" />
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-2">Role Colour</label>
                        <div className="flex gap-2 flex-wrap">
                            {ROLE_COLORS.map(c => (
                                <button key={c} onClick={() => setNewRole(p => ({ ...p, color: c }))}
                                    className={`w-7 h-7 rounded-full transition-all ${newRole.color === c ? 'ring-2 ring-offset-1 ring-[var(--accent)] scale-110' : 'hover:scale-105'}`}
                                    style={{ background: c }} />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
                        <button onClick={handleCreate} disabled={!newRole.label.trim()}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-[var(--accent)] text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5">
                            <Plus size={11} /> Create Role
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Clone Role Modal */}
            <Modal open={cloneOpen} onClose={() => setCloneOpen(false)} title="Clone Existing Role" size="sm">
                <div className="space-y-4 p-1">
                    <div>
                        <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">Clone From *</label>
                        <select value={cloneSourceId} onChange={e => setCloneSourceId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                            <option value="">Select source role…</option>
                            {customRoleList.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-[var(--text-faint)] block mb-1">New Role Name</label>
                        <input value={cloneLabel} onChange={e => setCloneLabel(e.target.value)} placeholder="Leave blank for auto-name"
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => setCloneOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
                        <button onClick={handleClone} disabled={!cloneSourceId}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-[var(--accent)] text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5">
                            <Copy size={11} /> Clone
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// ─── PANEL H: USER PERMISSIONS ────────────────────────────────────────────────
const UserPermissionsPanel = () => {
    const {
        getEnrichedUsers, customRoles, userOverrides,
        rbac, resolvePermission,
        assignCustomRoleToUser, setUserPermissionOverride, clearUserOverrides,
    } = useSettings();
    const { user: adminUser, users } = useAuth();

    const enrichedUsers = getEnrichedUsers(users);

    const [selectedUserId, setSelectedUserId] = useState(null);
    const [modFilter, setModFilter] = useState('');
    const [search, setSearch] = useState('');

    const selectedUser = enrichedUsers.find(u => u.id === selectedUserId);
    const userOvr = selectedUserId ? (userOverrides[selectedUserId] ?? { customRoleId: null, overrides: {} }) : null;
    const filteredMods = MODULE_DEFS.filter(m => !modFilter || m.label.toLowerCase().includes(modFilter.toLowerCase()));
    const filteredUsers = enrichedUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()));

    const getEffectivePerm = (moduleId, actionId) => {
        if (!selectedUser) return false;
        return resolvePermission(moduleId, actionId);
    };

    const getOverrideState = (moduleId, actionId) => {
        if (!selectedUserId) return null;
        const v = userOverrides[selectedUserId]?.overrides?.[moduleId]?.[actionId];
        return v === undefined ? null : v; // null = use role default
    };

    const getBasePerm = (moduleId, actionId) => {
        if (!selectedUser) return false;
        const crId = userOvr?.customRoleId;
        if (crId && customRoles[crId]) return customRoles[crId].permissions?.[moduleId]?.[actionId] ?? false;
        return rbac[selectedUser.role]?.[moduleId]?.[actionId] ?? false;
    };

    const cycleOverride = (moduleId, actionId) => {
        const current = getOverrideState(moduleId, actionId);
        // null → true → false → null
        const next = current === null ? true : current === true ? false : null;
        setUserPermissionOverride(selectedUserId, moduleId, actionId, next, adminUser?.name);
    };

    const OverrideCell = ({ moduleId, actionId }) => {
        const base = getBasePerm(moduleId, actionId);
        const override = getOverrideState(moduleId, actionId);
        const effective = getEffectivePerm(moduleId, actionId);

        const isOverridden = override !== null;
        const isGrant = override === true;
        const isRevoke = override === false;

        return (
            <td className="px-2 py-2 text-center">
                <button onClick={() => cycleOverride(moduleId, actionId)}
                    title={`Base: ${base ? '✓' : '✗'} | Override: ${override === null ? 'none' : override ? 'grant' : 'revoke'}\nClick to cycle: default → grant → revoke → default`}
                    className={`relative w-7 h-7 rounded-md mx-auto flex items-center justify-center border transition-all
                        ${isGrant ? 'border-[var(--green)]/50 bg-[var(--green)]/20 text-[var(--green)]' :
                            isRevoke ? 'border-red-500/50 bg-red-500/10 text-red-400' :
                                effective ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]' :
                                    'border-[var(--border-base)] text-[var(--text-faint)] hover:border-[var(--accent)]/30'}`}>
                    {isGrant ? <Check size={10} strokeWidth={3} /> :
                        isRevoke ? <X size={9} strokeWidth={2.5} /> :
                            effective ? <Check size={10} strokeWidth={2} className="opacity-60" /> :
                                <X size={9} strokeWidth={1.5} className="opacity-30" />}
                    {isOverridden && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: isGrant ? '#22c55e' : '#ef4444' }} />
                    )}
                </button>
            </td>
        );
    };

    return (
        <div>
            <SectionHeader icon={UserCog} title="User Permission Panel"
                subtitle="Override base role permissions per user. Dot = user-level override applied.">
            </SectionHeader>

            <div className="flex gap-4">
                {/* Left: user list */}
                <div className="w-52 shrink-0">
                    <div className="relative mb-3">
                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
                            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                    </div>
                    <div className="space-y-1.5">
                        {filteredUsers.map(u => (
                            <button key={u.id} onClick={() => setSelectedUserId(u.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${selectedUserId === u.id ? 'border-[var(--accent)] bg-[var(--accent)]/8' : 'border-[var(--border-base)] hover:border-[var(--accent)]/40 bg-[var(--bg-surface)]'}`}>
                                <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-[9px] font-black shrink-0">
                                    {u.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{u.name}</p>
                                    <p className="text-[9px] text-[var(--text-faint)] truncate">{u.effectiveRole}</p>
                                </div>
                                {u.overrideCount > 0 && (
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">
                                        {u.overrideCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: permission editor */}
                <div className="flex-1 min-w-0">
                    {!selectedUser ? (
                        <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed border-[var(--border-base)]">
                            <p className="text-sm text-[var(--text-faint)]">Select a user to configure their permissions</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* User header */}
                            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-sm font-black">
                                        {selectedUser.avatar}
                                    </div>
                                    <div>
                                        <p className="text-xs font-extrabold text-[var(--text-primary)]">{selectedUser.name}</p>
                                        <p className="text-[10px] text-[var(--text-faint)]">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Data Visibility Override */}
                                    <div>
                                        <label className="text-[9px] text-[var(--text-faint)] block mb-1">Data Visibility</label>
                                        <select
                                            value={userOvr?.dataScope ?? ''}
                                            onChange={e => {
                                                const value = e.target.value;
                                                setUserPermissionOverride(selectedUserId, 'global', 'dataScope', value || null, adminUser?.name);
                                            }}
                                            className="px-2 py-1 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                                            <option value="">Use Role Setting</option>
                                            <option value="ALL">All Data</option>
                                            <option value="ASSIGNED">Only Assigned Data</option>
                                        </select>
                                    </div>

                                    {/* Assign custom role */}
                                    <div>
                                        <label className="text-[9px] text-[var(--text-faint)] block mb-1">Custom Role Override</label>
                                        <select
                                            value={userOvr?.customRoleId ?? ''}
                                            onChange={e => assignCustomRoleToUser(selectedUserId, e.target.value || null, adminUser?.name)}
                                            className="px-2 py-1 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                                            <option value="">Use base role ({selectedUser.role})</option>
                                            {Object.values(customRoles).map(r => (
                                                <option key={r.id} value={r.id}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {(userOvr?.customRoleId || (userOvr?.overrides && Object.keys(userOvr.overrides).length > 0)) && (
                                        <button onClick={() => clearUserOverrides(selectedUserId, adminUser?.name)}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/8 transition-colors">
                                            <RotateCcw size={10} /> Clear Overrides
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 text-[10px] px-1">
                                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 flex items-center justify-center"><Check size={8} className="text-[var(--accent)] opacity-60" /></div><span className="text-[var(--text-faint)]">Role default (granted)</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded border border-[var(--border-base)] flex items-center justify-center"><X size={8} className="text-[var(--text-faint)] opacity-30" /></div><span className="text-[var(--text-faint)]">Role default (denied)</span></div>
                                <div className="flex items-center gap-1.5 relative"><div className="w-4 h-4 rounded border border-[var(--green)]/50 bg-[var(--green)]/20 flex items-center justify-center"><Check size={8} className="text-[var(--green)]" /></div><div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--green)]" /><span className="text-[var(--text-faint)] ml-2">Override: force grant</span></div>
                                <div className="flex items-center gap-1.5 relative"><div className="w-4 h-4 rounded border border-red-500/50 bg-red-500/10 flex items-center justify-center"><X size={8} className="text-red-400" /></div><div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-[var(--text-faint)] ml-2">Override: force revoke</span></div>
                                <span className="text-[var(--text-faint)] ml-auto italic">Click cell to cycle: default → grant → revoke</span>
                            </div>

                            {/* Filter */}
                            <div className="relative">
                                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                                <input value={modFilter} onChange={e => setModFilter(e.target.value)} placeholder="Filter modules…"
                                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                            </div>

                            {/* Matrix */}
                            <div className="glass-card overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
                                        <tr>
                                            <th className="px-3 py-2.5 text-left text-[9px] font-bold text-[var(--text-faint)] uppercase w-36">Module</th>
                                            {ACTION_DEFS.map(act => (
                                                <th key={act.id} className="px-2 py-2.5 text-center text-[9px] font-bold text-[var(--text-faint)] uppercase">{act.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMods.map((mod, i) => (
                                            <tr key={mod.id} className={`border-b border-[var(--border-base)] hover:bg-[var(--bg-hover)] transition-colors ${i % 2 === 0 ? '' : 'bg-[var(--bg-elevated)]/30'}`}>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <ModIcon name={mod.icon} size={11} className="text-[var(--text-faint)]" />
                                                        <span className="text-[11px] font-semibold text-[var(--text-primary)] whitespace-nowrap">{mod.label}</span>
                                                    </div>
                                                </td>
                                                {ACTION_DEFS.map(act => (
                                                    <OverrideCell key={act.id} moduleId={mod.id} actionId={act.id} />
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── PANEL I: VIEW AS ─────────────────────────────────────────────────────────
const ViewAsPanel = () => {
    const {
        getEnrichedUsers, customRoles, userOverrides,
        resolvePermission,
        viewAsUserId, setViewAs, clearViewAs,
    } = useSettings();
    const { users } = useAuth();

    const enrichedUsers = getEnrichedUsers(users);

    const [selectedUserId, setSelectedUserId] = useState(viewAsUserId);
    const [modFilter, setModFilter] = useState('');

    const previewUser = enrichedUsers.find(u => u.id === selectedUserId);
    const filteredMods = MODULE_DEFS.filter(m => !modFilter || m.label.toLowerCase().includes(modFilter.toLowerCase()));

    const getPermSnapshot = (moduleId) => {
        if (!previewUser) return {};
        return Object.fromEntries(ACTION_DEFS.map(act => [
            act.id,
            resolvePermission(moduleId, act.id),
        ]));
    };

    const activateViewAs = () => {
        if (selectedUserId) setViewAs(selectedUserId);
    };

    const isActive = viewAsUserId === selectedUserId && !!viewAsUserId;

    return (
        <div>
            <SectionHeader icon={Eye} title="View As User"
                subtitle="Preview the exact permissions any user sees. Activate to simulate their session.">
                {viewAsUserId && (
                    <button onClick={clearViewAs}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors">
                        <EyeOff size={10} /> Exit View As
                    </button>
                )}
            </SectionHeader>

            {viewAsUserId && (
                <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-amber-500/8 border border-amber-500/25">
                    <Eye size={14} className="text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-300 font-medium">
                        You are previewing as <strong>{enrichedUsers.find(u => u.id === viewAsUserId)?.name ?? 'Unknown'}</strong>.
                        All permission checks in the app now reflect their access.
                    </p>
                    <button onClick={clearViewAs} className="ml-auto text-[10px] font-bold text-amber-400 hover:text-amber-300 whitespace-nowrap">Exit →</button>
                </div>
            )}

            <div className="flex gap-4">
                {/* User selector */}
                <div className="w-52 shrink-0 space-y-1.5">
                    {enrichedUsers.map(u => (
                        <button key={u.id} onClick={() => setSelectedUserId(u.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${selectedUserId === u.id ? 'border-[var(--accent)] bg-[var(--accent)]/8' : 'border-[var(--border-base)] hover:border-[var(--accent)]/40 bg-[var(--bg-surface)]'}`}>
                            <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-[9px] font-black shrink-0">
                                {u.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{u.name}</p>
                                <p className="text-[9px] text-[var(--text-faint)] truncate">{u.effectiveRole}</p>
                            </div>
                            {viewAsUserId === u.id && <Eye size={10} className="text-amber-400 shrink-0" />}
                        </button>
                    ))}
                </div>

                {/* Preview */}
                <div className="flex-1 min-w-0">
                    {!previewUser ? (
                        <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed border-[var(--border-base)]">
                            <p className="text-sm text-[var(--text-faint)]">Select a user to preview their permissions</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center font-black">
                                        {previewUser.avatar}
                                    </div>
                                    <div>
                                        <p className="text-xs font-extrabold text-[var(--text-primary)]">{previewUser.name}</p>
                                        <p className="text-[10px] text-[var(--text-faint)]">
                                            Base: {previewUser.role}
                                            {previewUser.customRoleId && <span className="text-amber-400 ml-1.5">+ {customRoles[previewUser.customRoleId]?.label}</span>}
                                            {previewUser.overrideCount > 0 && <span className="text-amber-400 ml-1.5">· {previewUser.overrideCount} overrides</span>}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={activateViewAs}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isActive ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-[var(--accent)] border-[var(--accent)] text-black hover:opacity-90'}`}>
                                    {isActive ? <><Eye size={10} /> Active</> : <><Eye size={10} /> Activate View As</>}
                                </button>
                            </div>

                            {/* Filter */}
                            <div className="relative">
                                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                                <input value={modFilter} onChange={e => setModFilter(e.target.value)} placeholder="Filter modules…"
                                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]" />
                            </div>

                            {/* Permission preview table */}
                            <div className="glass-card overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
                                        <tr>
                                            <th className="px-3 py-2.5 text-left text-[9px] font-bold text-[var(--text-faint)] uppercase w-36">Module</th>
                                            {ACTION_DEFS.map(act => (
                                                <th key={act.id} className="px-2 py-2.5 text-center text-[9px] font-bold text-[var(--text-faint)] uppercase">{act.label}</th>
                                            ))}
                                            <th className="px-3 py-2.5 text-center text-[9px] font-bold text-[var(--text-faint)] uppercase">Access</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMods.map((mod, i) => {
                                            const perms = getPermSnapshot(mod.id);
                                            const count = Object.values(perms).filter(Boolean).length;
                                            const ovr = userOverrides[previewUser.id]?.overrides?.[mod.id];
                                            const hasModOvr = ovr && Object.values(ovr).some(v => v !== null && v !== undefined);
                                            return (
                                                <tr key={mod.id} className={`border-b border-[var(--border-base)] ${i % 2 === 0 ? '' : 'bg-[var(--bg-elevated)]/30'}`}>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <ModIcon name={mod.icon} size={11} className="text-[var(--text-faint)]" />
                                                            <span className="text-[11px] font-semibold text-[var(--text-primary)] whitespace-nowrap">{mod.label}</span>
                                                            {hasModOvr && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Has overrides" />}
                                                        </div>
                                                    </td>
                                                    {ACTION_DEFS.map(act => {
                                                        const granted = perms[act.id] ?? false;
                                                        const isOvr = ovr?.[act.id] !== undefined && ovr?.[act.id] !== null;
                                                        return (
                                                            <td key={act.id} className="px-2 py-2.5 text-center">
                                                                <div className={`relative w-6 h-6 rounded-md mx-auto flex items-center justify-center border ${granted ? 'border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]' : 'border-[var(--border-base)] text-[var(--text-faint)]'}`}>
                                                                    {granted ? <Check size={10} strokeWidth={3} /> : <X size={9} strokeWidth={2} />}
                                                                    {isOvr && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-[var(--bg-surface)]" style={{ background: granted ? '#22c55e' : '#ef4444' }} />}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-3 py-2.5 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <div className="w-14 h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                                                                <div className="h-full rounded-full transition-all bg-[var(--accent)]" style={{ width: `${(count / ACTION_DEFS.length) * 100}%` }} />
                                                            </div>
                                                            <span className="text-[9px] font-bold text-[var(--accent)]">{count}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── PANEL G: PROJECT TYPE CONFIGURATION ─────────────────────────────────────
const PT_ICON_MAP = {
    [PROJECT_TYPES.RESIDENTIAL]: Home,
    [PROJECT_TYPES.COMMERCIAL]: Building2,
    [PROJECT_TYPES.INDUSTRIAL]: Factory,
};

const ProjectTypeConfigPanel = () => {
    const { projectTypeConfig, updateProjectTypeField, resetProjectType, resetAllProjectTypes } = useSettings();
    const { user } = useAuth();
    const isAdmin = user?.role === 'Admin';

    const [activeType, setActiveType] = useState(PROJECT_TYPES.RESIDENTIAL);
    const [confirmReset, setConfirmReset] = useState(null); // typeId | 'all' | null

    const cfg = projectTypeConfig[activeType] ?? PROJECT_TYPE_DEFAULTS[activeType];
    const TypeIcon = PT_ICON_MAP[activeType] ?? Settings;
    const ptDef = PROJECT_TYPE_LIST.find(t => t.id === activeType);

    const handleField = (field, rawVal) => {
        if (!isAdmin) return;
        const spec = ADMIN_EDITABLE_FIELDS.find(f => f.key === field);
        const value = spec ? parseFloat(rawVal) : rawVal;
        updateProjectTypeField(activeType, field, isNaN(value) ? rawVal : value, user?.name);
    };

    return (
        <div>
            <SectionHeader
                icon={Factory}
                title="Project Type Configuration"
                subtitle="Define design rules, financial models, and pricing for Residential / Commercial / Industrial projects."
                badge={isAdmin ? 'Admin Only' : 'View Only'}
            >
                {isAdmin && (
                    <button
                        onClick={() => setConfirmReset('all')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-[var(--border-base)] text-[var(--text-faint)] hover:text-red-400 hover:border-red-500/30 transition-colors"
                    >
                        <RefreshCw size={10} /> Reset All
                    </button>
                )}
            </SectionHeader>

            {!isAdmin && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-300">Only Admin users can edit project type configuration. You are viewing read-only defaults.</p>
                </div>
            )}

            {/* Type tabs */}
            <div className="flex gap-1.5 mb-5 flex-wrap">
                {PROJECT_TYPE_LIST.map(pt => {
                    const Icon = PT_ICON_MAP[pt.id];
                    const active = activeType === pt.id;
                    return (
                        <button key={pt.id} onClick={() => setActiveType(pt.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${active ? 'text-white border-transparent shadow-lg' : 'text-[var(--text-muted)] bg-[var(--bg-elevated)] border-[var(--border-base)] hover:border-[var(--border-muted)]'}`}
                            style={active ? { background: pt.color } : {}}>
                            <Icon size={13} />
                            {pt.label}
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                style={active
                                    ? { background: 'var(--tab-active-overlay)', color: '#fff' }
                                    : { background: pt.bg, color: pt.color }}>
                                {pt.id === PROJECT_TYPES.RESIDENTIAL ? '≤10kW' : pt.id === PROJECT_TYPES.COMMERCIAL ? '10–100kW' : '100kW+'}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Active type header */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-xl border"
                style={{ background: ptDef?.bg, borderColor: ptDef?.border }}>
                <div className="flex items-center gap-3">
                    <TypeIcon size={18} style={{ color: ptDef?.color }} />
                    <div>
                        <p className="text-sm font-extrabold" style={{ color: ptDef?.color }}>{cfg.label}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{cfg.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-[var(--text-faint)]">Financial model:</span>
                    <span className="font-black uppercase" style={{ color: ptDef?.color }}>{cfg.financialMode}</span>
                    {isAdmin && (
                        <button onClick={() => setConfirmReset(activeType)}
                            className="ml-3 flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-base)] text-[var(--text-faint)] hover:text-red-400 hover:border-red-500/30 transition-colors text-[9px] font-semibold">
                            <RefreshCw size={8} /> Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Editable fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {ADMIN_EDITABLE_FIELDS.map(spec => {
                    const val = cfg[spec.key] ?? PROJECT_TYPE_DEFAULTS[activeType][spec.key];
                    const isDirty = val !== PROJECT_TYPE_DEFAULTS[activeType][spec.key];
                    return (
                        <div key={spec.key}
                            className={`p-3 rounded-xl border transition-colors ${isDirty ? 'border-[var(--accent)]/40 bg-[var(--accent)]/3' : 'border-[var(--border-base)] bg-[var(--bg-raised)]'}`}>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{spec.label}</label>
                                {spec.unit && <span className="text-[9px] text-[var(--text-faint)] bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">{spec.unit}</span>}
                            </div>
                            <input
                                type={spec.type}
                                disabled={!isAdmin}
                                value={val}
                                min={spec.min}
                                max={spec.max}
                                step={spec.step ?? 1}
                                onChange={e => handleField(spec.key, e.target.value)}
                                className={`w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                                style={isDirty ? { borderColor: ptDef?.color + '60' } : {}}
                            />
                            {isDirty && (
                                <p className="text-[9px] mt-1" style={{ color: ptDef?.color }}>
                                    Modified (default: {PROJECT_TYPE_DEFAULTS[activeType][spec.key]})
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Read-only derived summary */}
            <div className="p-4 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
                <p className="text-[11px] font-bold text-[var(--text-primary)] mb-3">Derived Behaviour Summary</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                    {[
                        { l: 'AI Objective', v: cfg.aiObjectiveLabel, color: ptDef?.color },
                        { l: 'Financial Model', v: cfg.financialMode.toUpperCase(), color: ptDef?.color },
                        { l: 'Grid Pattern', v: cfg.gridPattern, color: '' },
                        { l: 'Layout Density', v: cfg.layoutDensity, color: '' },
                        { l: 'Shadow Priority', v: cfg.shadowPriority, color: '' },
                        { l: 'Maintenance Access', v: cfg.maintenanceAccess, color: '' },
                        { l: 'EMI Default', v: `${cfg.emiMonthsDefault} months`, color: '' },
                        { l: 'Down Payment', v: `${cfg.downPaymentPct}%`, color: '' },
                        { l: 'Subsidy', v: cfg.subsidyLabel, color: '' },
                    ].map(item => (
                        <div key={item.l}>
                            <p className="text-[var(--text-faint)]">{item.l}</p>
                            <p className="font-bold text-[var(--text-primary)] capitalize" style={item.color ? { color: item.color } : {}}>{item.v}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border-base)]">
                    <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">{cfg.aiObjectiveDesc}</p>
                </div>
            </div>

            {/* Recommended panels/inverters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {[
                    { label: 'Recommended Panels', items: cfg.recommendedPanels },
                    { label: 'Recommended Inverters', items: cfg.recommendedInverters },
                ].map(block => (
                    <div key={block.label} className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
                        <p className="text-[11px] font-bold text-[var(--text-primary)] mb-2">{block.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {block.items.map(item => (
                                <span key={item} className="text-[9px] px-2 py-1 rounded-lg border font-medium"
                                    style={{ background: ptDef?.bg, borderColor: ptDef?.border, color: ptDef?.color }}>
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Reset confirm modal */}
            <Modal
                open={!!confirmReset}
                onClose={() => setConfirmReset(null)}
                title={confirmReset === 'all' ? 'Reset All Project Types?' : `Reset ${confirmReset} to Defaults?`}
                description="This will discard all admin-saved changes and restore factory defaults. This action is logged in the audit trail."
                size="sm"
                footer={
                    <>
                        <button onClick={() => setConfirmReset(null)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (confirmReset === 'all') resetAllProjectTypes(user?.name);
                                else resetProjectType(confirmReset, user?.name);
                                setConfirmReset(null);
                            }}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">
                            Reset to Defaults
                        </button>
                    </>
                }
            >
                <p className="text-xs text-[var(--text-muted)]">
                    {confirmReset === 'all'
                        ? 'All three project types (Residential, Commercial, Industrial) will be reset.'
                        : `The ${confirmReset} project type configuration will be restored.`}
                </p>
            </Modal>
        </div>
    );
};

// ─── PANEL H: INSTALLATION TASK BUILDER ─────────────────────────────────────
const InstallationTasksPanel = () => {
    const { installationTasks, updateInstallationTasks } = useSettings();
    const { user } = useAuth();
    const [tasks, setTasks] = useState(installationTasks || []);
    const [newName, setNewName] = useState('');

    const addTask = () => {
        if (!newName.trim()) return;
        setTasks(prev => [...prev, { name: newName.trim(), photoRequired: false }]);
        setNewName('');
    };
    const save = () => {
        updateInstallationTasks(tasks, user?.name);
    };
    const move = (index, dir) => {
        setTasks(prev => {
            const arr = [...prev];
            const [item] = arr.splice(index, 1);
            arr.splice(index + dir, 0, item);
            return arr;
        });
    };
    const togglePhoto = (idx) => {
        setTasks(prev => {
            const arr = [...prev];
            arr[idx] = { ...arr[idx], photoRequired: !arr[idx].photoRequired };
            return arr;
        });
    };
    const remove = (idx) => {
        setTasks(prev => prev.filter((_, i) => i !== idx));
    };
    useEffect(() => {
        setTasks(installationTasks || []);
    }, [installationTasks]);
    return (
        <div>
            <SectionHeader icon={Wrench} title="Installation Tasks" subtitle="Define task checklist used when creating installations" badge={user?.role === 'Admin' ? 'Admin Only' : ''} />
            <div className="space-y-4">
                {tasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input type="text" value={t.name} disabled className="flex-1 bg-[var(--bg-input)] rounded px-2 py-1 text-xs" />
                        <label className="text-xs flex items-center gap-1">
                            <input type="checkbox" checked={!!t.photoRequired} onChange={() => togglePhoto(i)} /> Photo
                        </label>
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="text-[var(--text-muted)]"><ChevronUp size={12} /></button>
                        <button onClick={() => move(i, 1)} disabled={i === tasks.length - 1} className="text-[var(--text-muted)]"><ChevronDown size={12} /></button>
                        <button onClick={() => remove(i)} className="text-red-500"><X size={12} /></button>
                    </div>
                ))}
                <div className="flex gap-2">
                    <Input placeholder="New task name" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 text-xs" />
                    <Button onClick={addTask}><Plus size={12} /></Button>
                </div>
                <div className="flex justify-end">
                    <Button onClick={save}>Save Changes</Button>
                </div>
            </div>
        </div>
    );
};

// ─── PANEL I: COMMISSIONING TASK BUILDER ─────────────────────────────────────
const CommissioningTasksPanel = () => {
    const { commissioningTasks, updateCommissioningTasks } = useSettings();
    const { user } = useAuth();
    const [tasks, setTasks] = useState(commissioningTasks || []);
    const [newName, setNewName] = useState('');

    const addTask = () => {
        if (!newName.trim()) return;
        setTasks(prev => [...prev, { name: newName.trim(), photoRequired: false }]);
        setNewName('');
    };
    const save = () => {
        updateCommissioningTasks(tasks, user?.name);
    };
    const move = (index, dir) => {
        setTasks(prev => {
            const arr = [...prev];
            const [item] = arr.splice(index, 1);
            arr.splice(index + dir, 0, item);
            return arr;
        });
    };
    const togglePhoto = (idx) => {
        setTasks(prev => {
            const arr = [...prev];
            arr[idx] = { ...arr[idx], photoRequired: !arr[idx].photoRequired };
            return arr;
        });
    };
    const remove = (idx) => {
        setTasks(prev => prev.filter((_, i) => i !== idx));
    };
    useEffect(() => {
        setTasks(commissioningTasks || []);
    }, [commissioningTasks]);
    return (
        <div>
            <SectionHeader icon={CheckCircle} title="Commissioning Tasks" subtitle="Define task checklist used when creating commissionings" badge={user?.role === 'Admin' ? 'Admin Only' : ''} />
            <div className="space-y-4">
                {tasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input type="text" value={t.name} disabled className="flex-1 bg-[var(--bg-input)] rounded px-2 py-1 text-xs" />
                        <label className="text-xs flex items-center gap-1">
                            <input type="checkbox" checked={!!t.photoRequired} onChange={() => togglePhoto(i)} /> Photo
                        </label>
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="text-[var(--text-muted)]"><ChevronUp size={12} /></button>
                        <button onClick={() => move(i, 1)} disabled={i === tasks.length - 1} className="text-[var(--text-muted)]"><ChevronDown size={12} /></button>
                        <button onClick={() => remove(i)} className="text-red-500"><X size={12} /></button>
                    </div>
                ))}
                <div className="flex gap-2">
                    <Input placeholder="New task name" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 text-xs" />
                    <Button onClick={addTask}><Plus size={12} /></Button>
                </div>
                <div className="flex justify-end">
                    <Button onClick={save}>Save Changes</Button>
                </div>
            </div>
        </div>
    );
};

// ─── PANEL J: AUTOMATION BUILDER ─────────────────────────────────────────────
const AutomationPanel = () => {
    const { user, tenantId } = useAuth();
    return <AutomationBuilder tenantId={tenantId} user={user} />;
};

// ─── MAIN SETTINGS PAGE ───────────────────────────────────────────────────────
const TABS = [
    { id: 'modules', label: 'Modules', icon: Flag, panel: ModulesPanel },
    { id: 'rbac', label: 'RBAC Matrix', icon: Shield, panel: RBACPanel },
    { id: 'roles', label: 'Role Builder', icon: Layers, panel: RoleBuilderPanel },
    { id: 'users', label: 'User Perms', icon: UserCog, panel: UserPermissionsPanel },
    { id: 'viewas', label: 'View As', icon: Eye, panel: ViewAsPanel },
    { id: 'flags', label: 'Feature Flags', icon: Zap, panel: FeatureFlagsPanel },
    { id: 'automation', label: 'Automation', icon: Workflow, panel: AutomationPanel },
    { id: 'workflows', label: 'Workflows', icon: GitBranch, panel: WorkflowPanel },
    { id: 'audit', label: 'Audit Log', icon: ScrollText, panel: AuditPanel },
    { id: 'ai', label: 'AI Insights', icon: Cpu, panel: AISuggestionsPanel },
    { id: 'projecttypes', label: 'Project Types', icon: SunMedium, panel: ProjectTypeConfigPanel },
    { id: 'installationTasks', label: 'Install Tasks', icon: List, panel: InstallationTasksPanel },
    { id: 'commissioningTasks', label: 'Commissioning Tasks', icon: CheckCircle, panel: CommissioningTasksPanel },
];

const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('modules');
    const { flags, rbac, workflows, auditLogs, customRoles, getEnrichedUsers, viewAsUserId, clearViewAs } = useSettings();
    const { users } = useAuth();

    const ActivePanel = TABS.find(t => t.id === activeTab)?.panel || ModulesPanel;

    const enabledMods = MODULE_DEFS.filter(m => flags[m.id]?.enabled ?? true).length;
    const totalFlags = MODULE_DEFS.reduce((acc, m) => acc + Object.keys(m.features).length, MODULE_DEFS.length);
    const onFlags = MODULE_DEFS.reduce((acc, m) => {
        let cnt = (flags[m.id]?.enabled ?? true) ? 1 : 0;
        cnt += Object.keys(m.features).filter(k => flags[m.id]?.features?.[k] ?? true).length;
        return acc + cnt;
    }, 0);
    const activeWf = workflows.filter(w => w.enabled).length;
    const auditCount = auditLogs.length;
    const customRoleCount = Object.keys(customRoles).length;
    const enrichedUsers = useMemo(() => getEnrichedUsers(users), [getEnrichedUsers, users]);
    const viewAsUser = viewAsUserId ? enrichedUsers.find(u => u.id === viewAsUserId) : null;

    return (
        <div className="space-y-5 animate-fade-in">

            {/* ── PAGE HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/25 flex items-center justify-center">
                            <Settings size={16} className="text-[var(--accent)]" />
                        </div>
                        Settings & Control Center
                    </h1>
                    <p className="text-xs text-[var(--text-faint)] mt-1">
                        Feature flags · RBAC · Workflow rules · Audit logs — all in one place
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-green-500/20 bg-green-500/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[10px] font-semibold text-green-400">Live Config Engine</span>
                    </div>
                </div>
            </div>

            {/* ── VIEW AS BANNER ── */}
            {viewAsUser && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/30">
                    <Eye size={14} className="text-amber-400 shrink-0" />
                    <p className="text-xs font-semibold text-amber-300 flex-1">
                        Admin Preview Mode — viewing as <strong>{viewAsUser.name}</strong> ({viewAsUser.effectiveRole}). All module access reflects their permissions.
                    </p>
                    <button onClick={clearViewAs} className="text-[10px] font-bold text-amber-400 hover:text-amber-200 whitespace-nowrap px-3 py-1.5 rounded-lg border border-amber-500/30 hover:bg-amber-500/15 transition-colors">
                        <EyeOff size={10} className="inline mr-1" />Exit
                    </button>
                </div>
            )}

            {/* ── STATS OVERVIEW ── */}
            {null}

            {/* ── LIVE CONFIG JSON PREVIEW (collapsed) ── */}
            {null}

            {/* ── TAB NAV ── */}
            <div className="flex flex-nowrap gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${isActive ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}>
                            <Icon size={12} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── ACTIVE PANEL ── */}
            <div className="glass-card p-5 min-h-[400px]">
                <ActivePanel />
            </div>
        </div>
    );
};

// ─── CONFIG JSON PREVIEW ──────────────────────────────────────────────────────
const ConfigJSONPreview = ({ flags, rbac }) => {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const config = useMemo(() => ({
        modules: Object.fromEntries(
            MODULE_DEFS.map(m => [m.id, {
                enabled: flags[m.id]?.enabled ?? true,
                features: flags[m.id]?.features ?? {},
                actions: flags[m.id]?.actions ?? {},
            }])
        ),
        roles: Object.fromEntries(
            Object.entries(rbac).map(([roleId, mods]) => [
                roleId,
                Object.fromEntries(Object.entries(mods).map(([modId, perms]) => [modId, perms]))
            ])
        ),
    }), [flags, rbac]);

    const jsonStr = JSON.stringify(config, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonStr).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" onClick={() => setOpen(p => !p)}>
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[var(--accent)]/15 flex items-center justify-center">
                        <Database size={11} className="text-[var(--accent)]" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">Live Config JSON</span>
                    <span className="text-[10px] text-[var(--text-faint)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-base)]">
                        {MODULE_DEFS.length} modules · {Object.keys(rbac).length} roles
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {open && (
                        <button onClick={e => { e.stopPropagation(); handleCopy(); }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold border border-[var(--border-base)] text-[var(--text-faint)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors">
                            {copied ? <><Check size={8} /> Copied!</> : <><Copy size={8} /> Copy</>}
                        </button>
                    )}
                    {open ? <ChevronUp size={12} className="text-[var(--text-faint)]" /> : <ChevronDown size={12} className="text-[var(--text-faint)]" />}
                </div>
            </div>
            {open && (
                <div className="border-t border-[var(--border-base)] bg-[var(--bg-elevated)]">
                    <pre className="p-4 text-[10px] font-mono text-green-400 max-h-64 overflow-auto leading-relaxed">
                        {jsonStr}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;

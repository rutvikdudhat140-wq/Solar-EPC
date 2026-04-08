// Solar OS – EPC Edition — CompliancePage.js (API Integrated)
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    FileText, CheckCircle, AlertTriangle, Zap, Upload,
    Plus, Download, Building2, ShieldCheck, IndianRupee, LayoutGrid, List,
    Edit2, Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Progress } from '../components/ui/Progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { generateCompliancePDF } from '../utils/compliancePdfGenerator';
import apiClient, { api } from '../lib/apiClient';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';
const TENANT_ID = 'solarcorp';

/* ─── Config-driven Status Maps ─── */
const NEUTRAL = 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]';
const NM_STATUS = {
    Draft: { label: 'Draft', color: NEUTRAL },
    Applied: { label: 'Applied', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    Approved: { label: 'Approved', color: 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30' },
    Rejected: { label: 'Rejected', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    Connected: { label: 'Connected', color: 'bg-[var(--blue)]/15 text-[var(--blue)] border-[var(--blue)]/30' },
};
const SUB_STATUS = {
    Applied: { label: 'Applied', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    Sanctioned: { label: 'Sanctioned', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]' },
    Disbursed: { label: 'Disbursed', color: 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30' },
    Rejected: { label: 'Rejected', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};
const INS_STATUS = {
    Pending: { label: 'Pending', color: NEUTRAL },
    Scheduled: { label: 'Scheduled', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]' },
    Passed: { label: 'Passed', color: 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30' },
    Failed: { label: 'Failed', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};
const DOC_STATUS = {
    Uploaded: { label: 'Uploaded', color: 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30' },
    Pending: { label: 'Pending', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    Rejected: { label: 'Rejected', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const mkBadge = (map) => ({ value }) => {
    const meta = map[value] ?? { label: value, color: NEUTRAL };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;
};

const NMBadge = mkBadge(NM_STATUS);
const SubBadge = mkBadge(SUB_STATUS);
const InsBadge = mkBadge(INS_STATUS);
const DocBadge = mkBadge(DOC_STATUS);

/* ─── Local Data ─── */
const NET_METERING = [
    { id: 'NM001', projectId: 'P001', customer: 'Ramesh Joshi', site: 'GIDC Ahmedabad', systemSize: '50 kW', discom: 'DGVCL', applicationNo: 'DGVCL/NM/2026/1234', appliedDate: '2026-02-26', approvalDate: null, status: 'Applied', compensationRate: '₹2.25/kWh', bidirectionalMeter: false },
    { id: 'NM002', projectId: 'P003', customer: 'Prakash Agarwal', site: 'Ahmedabad Plant', systemSize: '80 kW', discom: 'DGVCL', applicationNo: 'DGVCL/NM/2026/0891', appliedDate: '2026-01-16', approvalDate: '2026-02-10', status: 'Approved', compensationRate: '₹2.25/kWh', bidirectionalMeter: true },
    { id: 'NM003', projectId: 'P002', customer: 'Suresh Bhatt', site: 'Vapi GIDC', systemSize: '150 kW', discom: 'DGVCL', applicationNo: null, appliedDate: null, approvalDate: null, status: 'Draft', compensationRate: '₹2.25/kWh', bidirectionalMeter: false },
];

const SUBSIDIES = [
    { id: 'SUB001', customer: 'Ramesh Joshi', systemSize: '50 kW', scheme: 'PM Surya Ghar', appliedDate: '2026-02-26', sanctionDate: null, disbursedDate: null, claimAmount: 94500, status: 'Applied', applicationRef: 'PMSG/GJ/2026/55201' },
    { id: 'SUB002', customer: 'Prakash Agarwal', systemSize: '80 kW', scheme: 'GEDA Rooftop', appliedDate: '2026-01-17', sanctionDate: '2026-02-05', disbursedDate: '2026-02-20', claimAmount: 120000, status: 'Disbursed', applicationRef: 'GEDA/RT/2026/00341' },
    { id: 'SUB003', customer: 'Meena Patel', systemSize: '40 kW', scheme: 'MNRE CAPEX', appliedDate: '2026-02-10', sanctionDate: '2026-02-28', disbursedDate: null, claimAmount: 60000, status: 'Sanctioned', applicationRef: 'MNRE/RT/2026/88104' },
];

const INSPECTIONS = [
    { id: 'INS001', projectId: 'P001', customer: 'Ramesh Joshi', type: 'DISCOM Technical', scheduledDate: '2026-03-05', completedDate: null, status: 'Scheduled', inspector: 'DGVCL Officer', outcome: null, remarks: null },
    { id: 'INS002', projectId: 'P003', customer: 'Prakash Agarwal', type: 'DISCOM Final', scheduledDate: '2026-02-08', completedDate: '2026-02-08', status: 'Passed', inspector: 'DGVCL Officer', outcome: 'Passed with remarks', remarks: 'Earthing improvements required within 30 days.' },
    { id: 'INS003', projectId: 'P001', customer: 'Ramesh Joshi', type: 'Electrical Inspector', scheduledDate: '2026-02-28', completedDate: null, status: 'Pending', inspector: 'State Electrical Inspector', outcome: null, remarks: null },
];

const DOCUMENTS = [
    { id: 'DOC001', name: 'Net Metering Application Form', category: 'DISCOM', project: 'P001', status: 'Uploaded', required: true },
    { id: 'DOC002', name: 'Single Line Diagram (SLD)', category: 'DISCOM', project: 'P001', status: 'Uploaded', required: true },
    { id: 'DOC003', name: 'Structural Load Certificate', category: 'DISCOM', project: 'P001', status: 'Uploaded', required: true },
    { id: 'DOC004', name: 'Electrical Completion Certificate', category: 'CEA', project: 'P001', status: 'Pending', required: true },
    { id: 'DOC005', name: 'Bidirectional Meter Installation Report', category: 'DISCOM', project: 'P001', status: 'Pending', required: true },
    { id: 'DOC006', name: 'Net Metering Agreement', category: 'DISCOM', project: 'P001', status: 'Pending', required: true },
    { id: 'DOC007', name: 'Subsidy Application (PM Surya Ghar)', category: 'MNRE', project: 'P001', status: 'Uploaded', required: false },
    { id: 'DOC008', name: 'Commissioning Certificate', category: 'Internal', project: 'P003', status: 'Uploaded', required: true },
    { id: 'DOC009', name: 'Generation Meter Calibration', category: 'CEA', project: 'P003', status: 'Uploaded', required: true },
];

/* ─── Column Schemas ─── */
const NM_COLUMNS = [
    { key: 'applicationId', header: 'App ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
    { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
    { key: 'systemSize', header: 'Size', render: v => <span className="text-xs font-bold text-[var(--solar)]">{v}</span> },
    { key: 'discom', header: 'DISCOM', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
    { key: 'applicationNo', header: 'App No.', render: v => <span className="text-xs font-mono text-[var(--text-secondary)]">{v ?? '—'}</span> },
    { key: 'appliedDate', header: 'Applied', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'approvalDate', header: 'Approved', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'compensationRate', header: 'Rate', render: v => <span className="text-xs text-[var(--green)]">{v}</span> },
    { key: 'status', header: 'Status', render: v => <NMBadge value={v} /> },
];

const SUB_COLUMNS = [
    { key: 'subsidyId', header: 'Sub ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
    { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
    { key: 'scheme', header: 'Scheme', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
    { key: 'systemSize', header: 'Size', render: v => <span className="text-xs font-bold text-[var(--solar)]">{v}</span> },
    { key: 'claimAmount', header: 'Claim Amt', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">₹{v.toLocaleString('en-IN')}</span> },
    { key: 'appliedDate', header: 'Applied', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'sanctionDate', header: 'Sanctioned', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'disbursedDate', header: 'Disbursed', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'status', header: 'Status', render: v => <SubBadge value={v} /> },
];

const INS_COLUMNS = [
    { key: 'inspectionId', header: 'Inspection ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
    { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
    { key: 'type', header: 'Type', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
    { key: 'inspector', header: 'Inspector', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
    { key: 'scheduledDate', header: 'Scheduled', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
    { key: 'completedDate', header: 'Completed', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'outcome', header: 'Outcome', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'status', header: 'Status', render: v => <InsBadge value={v} /> },
];

const DOC_COLUMNS = [
    { key: 'documentId', header: 'Doc ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
    { key: 'name', header: 'Document Name', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
    { key: 'category', header: 'Authority', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
    { key: 'project', header: 'Project', render: v => <span className="text-xs font-mono text-[var(--text-muted)]">{v}</span> },
    { key: 'required', header: 'Required', render: v => <span className={`text-xs font-semibold ${v ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>{v ? 'Mandatory' : 'Optional'}</span> },
    { key: 'status', header: 'Status', render: v => <DocBadge value={v} /> },
];

/* ─── Kanban Stage Defs ─── */
const NM_STAGES = [
    { id: 'Draft', label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
    { id: 'Applied', label: 'Applied', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { id: 'Approved', label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { id: 'Connected', label: 'Connected', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
    { id: 'Rejected', label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

const SUB_STAGES = [
    { id: 'Applied', label: 'Applied', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { id: 'Sanctioned', label: 'Sanctioned', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { id: 'Disbursed', label: 'Disbursed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { id: 'Rejected', label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

/* ─── Net Metering Card ─── */
const NMCard = ({ item, onDragStart, onClick }) => {
    const meta = NM_STATUS[item.status] ?? NM_STATUS.Draft;
    return (
        <div
            draggable
            onDragStart={() => onDragStart(item.applicationId)}
            onClick={() => onClick({ type: 'nm', data: item })}
            className="glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all space-y-2"
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-[var(--accent-light)]">{item.applicationId}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-medium ${meta.color}`}>{meta.label}</span>
            </div>
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.customer}</p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="glass-card p-1.5">
                    <p className="text-[var(--text-muted)]">DISCOM</p>
                    <p className="font-bold text-[var(--text-primary)]">{item.discom}</p>
                </div>
                <div className="glass-card p-1.5">
                    <p className="text-[var(--text-muted)]">Size</p>
                    <p className="font-bold text-[var(--solar)]">{item.systemSize}</p>
                </div>
            </div>
            <div className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
                <Building2 size={9} />
                <span className="truncate">{item.site}</span>
            </div>
            {item.applicationNo && (
                <p className="text-[9px] font-mono text-[var(--text-muted)] truncate">{item.applicationNo}</p>
            )}
            {item.bidirectionalMeter && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--blue)]/10 border border-[var(--blue)]/20 text-[var(--blue)]">Meter Installed ✓</span>
            )}
        </div>
    );
};

/* ─── Subsidy Card ─── */
const SubCard = ({ item, onDragStart, onClick }) => {
    const meta = SUB_STATUS[item.status] ?? SUB_STATUS.Applied;
    return (
        <div
            draggable
            onDragStart={() => onDragStart(item.subsidyId)}
            onClick={() => onClick({ type: 'sub', data: item })}
            className="glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all space-y-2"
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-[var(--accent-light)]">{item.subsidyId}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-medium ${meta.color}`}>{meta.label}</span>
            </div>
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.customer}</p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="glass-card p-1.5">
                    <p className="text-[var(--text-muted)]">Claim</p>
                    <p className="font-bold text-[var(--green)]">₹{item.claimAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="glass-card p-1.5">
                    <p className="text-[var(--text-muted)]">Size</p>
                    <p className="font-bold text-[var(--solar)]">{item.systemSize}</p>
                </div>
            </div>
            <p className="text-[9px] text-[var(--text-muted)] truncate">{item.scheme}</p>
            {item.applicationRef && (
                <p className="text-[9px] font-mono text-[var(--text-muted)] truncate">{item.applicationRef}</p>
            )}
        </div>
    );
};

/* ─── Generic Kanban Board ─── */
const ComplianceKanbanBoard = ({ stages, items, CardComponent, onStageChange, onCardClick }) => {
    const draggingId = useRef(null);
    const [dragOver, setDragOver] = useState(null);
    return (
        <div className="overflow-x-auto pb-3">
            <div className="flex gap-3 min-w-max">
                {stages?.map(stage => {
                    if (!stage || !stage.id) return null;
                    const cards = items.filter(i => i.status === stage.id);
                    return (
                        <div key={stage.id}
                            className={`flex flex-col w-56 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
                            onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}
                        >
                            <div className="p-2.5 border-b border-[var(--border-base)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                                    <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                                </div>
                                <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                            </div>
                            <div className="flex flex-col gap-2 p-2 flex-1 min-h-[100px]">
                                {cards.map((item, index) => (
                                    <CardComponent key={item._id || item.id || item.applicationId || item.subsidyId || item.inspectionId || item.documentId || index} item={item}
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

const CompliancePage = () => {
    const [nmItems, setNmItems] = useState([]);
    const [subItems, setSubItems] = useState([]);
    const [inspections, setInspections] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [stats, setStats] = useState({
        netMetering: { total: 0 },
        subsidies: { total: 0, totalAmount: 0, disbursed: 0, disbursedAmount: 0 },
        inspections: { total: 0 },
        documents: { total: 0, uploaded: 0, pending: 0, complianceScore: 0 },
    });
    const [projects, setProjects] = useState([]);
    const [nmView, setNmView] = useState('kanban');
    const [subView, setSubView] = useState('kanban');
    const [nmPage, setNmPage] = useState(1);
    const [subPage, setSubPage] = useState(1);
    const [insPage, setInsPage] = useState(1);
    const [docPage, setDocPage] = useState(1);
    const [pageSize] = useState(10);
    const [showAddNM, setShowAddNM] = useState(false);
    const [showAddSub, setShowAddSub] = useState(false);
    const [showAddIns, setShowAddIns] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [selected, setSelected] = useState(null);
    // Form states
    const [nmForm, setNmForm] = useState({ projectId: '', discom: '', applicationDate: '', contactOfficer: '', contactPhone: '' });
    const [subForm, setSubForm] = useState({ projectId: '', scheme: '', claimAmount: '', applicationDate: '', referenceNo: '' });
    const [insForm, setInsForm] = useState({ projectId: '', type: '', scheduledDate: '', inspector: '', notes: '' });
    const [docForm, setDocForm] = useState({ projectId: '', documentType: '', issuingAuthority: '', documentDate: '' });
    const [docFile, setDocFile] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchComplianceData = async () => {
            try {
                const [nmRes, subRes, insRes, docRes, statsRes, projectsRes] = await Promise.all([
                    api.get('/compliance/net-metering', { tenantId: TENANT_ID }),
                    api.get('/compliance/subsidies', { tenantId: TENANT_ID }),
                    api.get('/compliance/inspections', { tenantId: TENANT_ID }),
                    api.get('/compliance/documents', { tenantId: TENANT_ID }),
                    api.get('/compliance/stats', { tenantId: TENANT_ID }),
                    api.get('/projects', { tenantId: TENANT_ID }),
                ]);
                setNmItems(Array.isArray(nmRes) ? nmRes : (nmRes?.data || []));
                setSubItems(Array.isArray(subRes) ? subRes : (subRes?.data || []));
                setInspections(Array.isArray(insRes) ? insRes : (insRes?.data || []));
                setDocuments(Array.isArray(docRes) ? docRes : (docRes?.data || []));
                setStats(statsRes);
                setProjects(Array.isArray(projectsRes) ? projectsRes : (projectsRes?.data || []));
            } catch (err) { console.error('Error fetching compliance data:', err); }
        };
        fetchComplianceData();
    }, []);

    const handleNMStage = async (id, newStatus) => {
        try {
            const updated = await api.patch(`/compliance/net-metering/${id}`, { status: newStatus }, { tenantId: TENANT_ID });
            const itemData = updated.data || updated;
            setNmItems(prev => prev.map(i => i.applicationId === id ? { ...i, ...itemData } : i));
        } catch (err) { console.error('Error updating NM status:', err); }
    };

    const handleSubStage = async (id, newStatus) => {
        try {
            const updated = await api.patch(`/compliance/subsidies/${id}`, { status: newStatus }, { tenantId: TENANT_ID });
            const itemData = updated.data || updated;
            setSubItems(prev => prev.map(i => i.subsidyId === id ? { ...i, ...itemData } : i));
        } catch (err) { console.error('Error updating subsidy status:', err); }
    };

    const handleSubmitNM = async () => {
        if (!nmForm.projectId) { alert('Please select a project'); return; }

        // Find selected project to get customer, site, systemSize
        const selectedProject = projects.find(p => (p.projectId || p._id) === nmForm.projectId);
        if (!selectedProject) { alert('Project not found'); return; }

        try {
            const payload = {
                applicationId: `NM${Date.now().toString().slice(-6)}`,
                projectId: nmForm.projectId,
                customer: selectedProject.customerName || 'Unknown',
                site: selectedProject.site || selectedProject.location || 'Unknown',
                systemSize: selectedProject.systemSize ? `${selectedProject.systemSize} kW` : '0 kW',
                discom: nmForm.discom,
                appliedDate: nmForm.applicationDate,
                discomOfficer: nmForm.contactOfficer,
                discomPhone: nmForm.contactPhone,
                status: 'Draft',
            };

            const data = await api.post('/compliance/net-metering', payload, { tenantId: TENANT_ID });
            const newItem = data.data || data;
            setNmItems(prev => [newItem, ...prev]);
            setShowAddNM(false);
            setNmForm({ projectId: '', discom: '', applicationDate: '', contactOfficer: '', contactPhone: '' });
            alert('Net Metering application submitted successfully!');
        } catch (err) { console.error('Error submitting NM:', err); alert('Failed to submit application'); }
    };

    const handleSubmitSub = async () => {
        if (!subForm.projectId) { alert('Please select a project'); return; }

        const selectedProject = projects.find(p => (p.projectId || p._id) === subForm.projectId);
        if (!selectedProject) { alert('Project not found'); return; }

        try {
            const payload = {
                subsidyId: `SUB${Date.now().toString().slice(-6)}`,
                projectId: subForm.projectId,
                customer: selectedProject.customerName || 'Unknown',
                systemSize: selectedProject.systemSize ? `${selectedProject.systemSize} kW` : '0 kW',
                scheme: subForm.scheme,
                claimAmount: Number(subForm.claimAmount) || 0,
                appliedDate: subForm.applicationDate,
                applicationRef: subForm.referenceNo,
                status: 'Applied',
            };

            const data = await api.post('/compliance/subsidies', payload, { tenantId: TENANT_ID });
            const newItem = data.data || data;
            setSubItems(prev => [newItem, ...prev]);
            setShowAddSub(false);
            setSubForm({ projectId: '', scheme: '', claimAmount: '', applicationDate: '', referenceNo: '' });
            alert('Subsidy application submitted successfully!');
        } catch (err) { console.error('Error submitting Subsidy:', err); alert('Failed to submit application'); }
    };

    const handleSubmitIns = async () => {
        if (!insForm.projectId) { alert('Please select a project'); return; }

        const selectedProject = projects.find(p => (p.projectId || p._id) === insForm.projectId);
        if (!selectedProject) { alert('Project not found'); return; }

        try {
            const payload = {
                inspectionId: `INS${Date.now().toString().slice(-6)}`,
                projectId: insForm.projectId,
                customer: selectedProject.customerName || 'Unknown',
                type: insForm.type,
                remarks: insForm.notes,
                scheduledDate: insForm.scheduledDate,
                inspector: insForm.inspector,
                status: 'Scheduled',
            };

            const data = await api.post('/compliance/inspections', payload, { tenantId: TENANT_ID });
            const newItem = data.data || data;
            setInspections(prev => [newItem, ...prev]);
            setShowAddIns(false);
            setInsForm({ projectId: '', type: '', scheduledDate: '', inspector: '', notes: '' });
            alert('Inspection scheduled successfully!');
        } catch (err) { console.error('Error submitting Inspection:', err); alert('Failed to schedule inspection'); }
    };

    const handleSubmitDoc = async () => {
        if (!docForm.projectId) { alert('Please select a project'); return; }
        if (!docForm.documentType) { alert('Please select document type'); return; }

        const selectedProject = projects.find(p => (p.projectId || p._id) === docForm.projectId);

        try {
            const payload = {
                documentId: `DOC${Date.now().toString().slice(-6)}`,
                projectId: docForm.projectId,
                projectName: selectedProject?.customerName || 'Unknown',
                name: docForm.documentType,
                category: docForm.documentType,
                issuingAuthority: docForm.issuingAuthority,
                documentDate: docForm.documentDate,
                status: 'Uploaded',
                fileName: docFile?.name || null,
                fileSize: docFile?.size || null,
                mimeType: docFile?.type || null,
            };

            const data = await api.post('/compliance/documents', payload, { tenantId: TENANT_ID });
            const newItem = data.data || data;
            setDocuments(prev => [newItem, ...prev]);
            setShowUpload(false);
            setDocForm({ projectId: '', documentType: '', issuingAuthority: '', documentDate: '' });
            setDocFile(null);
            alert('Document uploaded successfully!');
        } catch (err) { console.error('Error uploading document:', err); alert('Failed to upload document'); }
    };

    // Edit states
    const [editingNM, setEditingNM] = useState(null);
    const [editingSub, setEditingSub] = useState(null);
    const [editingIns, setEditingIns] = useState(null);
    const [editingDoc, setEditingDoc] = useState(null);

    // Update handlers
    const handleUpdateNM = async () => {
        try {
            const payload = {
                discom: nmForm.discom,
                status: nmForm.status,
                appliedDate: nmForm.applicationDate,
                discomOfficer: nmForm.contactOfficer,
                discomPhone: nmForm.contactPhone,
            };
            const data = await api.patch(`/compliance/net-metering/${editingNM}`, payload, { tenantId: TENANT_ID });
            const updatedItem = data.data || data;
            setNmItems(prev => prev.map(i => i.applicationId === editingNM ? { ...i, ...updatedItem } : i));
            setEditingNM(null);
            setNmForm({ projectId: '', discom: '', status: '', applicationDate: '', contactOfficer: '', contactPhone: '' });
            alert('Net Metering application updated successfully!');
        } catch (err) { console.error('Error updating NM:', err); alert('Failed to update application'); }
    };

    const handleUpdateSub = async () => {
        try {
            const payload = {
                scheme: subForm.scheme,
                status: subForm.status,
                claimAmount: Number(subForm.claimAmount) || 0,
                appliedDate: subForm.applicationDate,
                applicationRef: subForm.referenceNo,
            };
            const data = await api.patch(`/compliance/subsidies/${editingSub}`, payload, { tenantId: TENANT_ID });
            const updatedItem = data.data || data;
            setSubItems(prev => prev.map(i => i.subsidyId === editingSub ? { ...i, ...updatedItem } : i));
            setEditingSub(null);
            setSubForm({ projectId: '', scheme: '', status: '', claimAmount: '', applicationDate: '', referenceNo: '' });
            alert('Subsidy application updated successfully!');
        } catch (err) { console.error('Error updating Subsidy:', err); alert('Failed to update subsidy'); }
    };

    const handleUpdateIns = async () => {
        try {
            const payload = {
                type: insForm.type,
                status: insForm.status,
                remarks: insForm.notes,
                scheduledDate: insForm.scheduledDate,
                inspector: insForm.inspector,
            };
            const data = await api.patch(`/compliance/inspections/${editingIns}`, payload, { tenantId: TENANT_ID });
            const updatedItem = data.data || data;
            setInspections(prev => prev.map(i => i.inspectionId === editingIns ? { ...i, ...updatedItem } : i));
            setEditingIns(null);
            setInsForm({ projectId: '', type: '', status: '', scheduledDate: '', inspector: '', notes: '' });
            alert('Inspection updated successfully!');
        } catch (err) { console.error('Error updating Inspection:', err); alert('Failed to update inspection'); }
    };

    const handleUpdateDoc = async () => {
        if (!docForm.documentType) { alert('Please select document type'); return; }
        try {
            const payload = {
                name: docForm.documentType,
                category: docForm.documentType,
                status: docForm.status,
                issuingAuthority: docForm.issuingAuthority,
                documentDate: docForm.documentDate,
            };
            const data = await api.patch(`/compliance/documents/${editingDoc}`, payload, { tenantId: TENANT_ID });
            const updatedItem = data.data || data;
            setDocuments(prev => prev.map(i => i.documentId === editingDoc ? { ...i, ...updatedItem } : i));
            setEditingDoc(null);
            setDocForm({ projectId: '', documentType: '', status: '', issuingAuthority: '', documentDate: '' });
            alert('Document updated successfully!');
        } catch (err) { console.error('Error updating Document:', err); alert('Failed to update document'); }
    };

    // Delete handlers
    const handleDeleteNM = async (id) => {
        if (!window.confirm('Are you sure you want to delete this application?')) return;
        try {
            await apiClient.delete(`/compliance/net-metering/${id}`, { params: { tenantId: TENANT_ID } });
            setNmItems(prev => prev.filter(i => i.applicationId !== id));
            alert('Net Metering application deleted successfully!');
        } catch (err) { console.error('Error deleting NM:', err); alert('Failed to delete application'); }
    };

    const handleDeleteSub = async (id) => {
        if (!window.confirm('Are you sure you want to delete this subsidy?')) return;
        try {
            await apiClient.delete(`/compliance/subsidies/${id}`, { params: { tenantId: TENANT_ID } });
            setSubItems(prev => prev.filter(i => i.subsidyId !== id));
            alert('Subsidy deleted successfully!');
        } catch (err) { console.error('Error deleting Subsidy:', err); alert('Failed to delete subsidy'); }
    };

    const handleDeleteIns = async (id) => {
        if (!window.confirm('Are you sure you want to delete this inspection?')) return;
        try {
            await apiClient.delete(`/compliance/inspections/${id}`, { params: { tenantId: TENANT_ID } });
            setInspections(prev => prev.filter(i => i.inspectionId !== id));
            alert('Inspection deleted successfully!');
        } catch (err) { console.error('Error deleting Inspection:', err); alert('Failed to delete inspection'); }
    };

    const handleDeleteDoc = async (id) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            await apiClient.delete(`/compliance/documents/${id}`, { params: { tenantId: TENANT_ID } });
            setDocuments(prev => prev.filter(i => i.documentId !== id));
            alert('Document deleted successfully!');
        } catch (err) { console.error('Error deleting Document:', err); alert('Failed to delete document'); }
    };

    const paginatedNM = nmItems.slice((nmPage - 1) * pageSize, nmPage * pageSize);
    const paginatedSub = subItems.slice((subPage - 1) * pageSize, subPage * pageSize);
    const paginatedIns = inspections.slice((insPage - 1) * pageSize, insPage * pageSize);
    const paginatedDoc = documents.slice((docPage - 1) * pageSize, docPage * pageSize);

    const totalSubsidy = subItems.reduce((a, s) => a + (s.claimAmount || 0), 0);
    const disbursed = subItems.filter(s => s.status === 'Disbursed').reduce((a, s) => a + (s.disbursedAmount || s.claimAmount || 0), 0);
    const uploadedDocs = documents.filter(d => d.status === 'Uploaded').length;
    const pendingDocs = documents.filter(d => d.status === 'Pending').length;
    const docProgress = stats.documents?.complianceScore || (documents.length > 0 ? Math.round((uploadedDocs / documents.length) * 100) : 0);

    const NM_ACTIONS = [
        { label: 'View', icon: FileText, onClick: r => setSelected({ type: 'nm', data: r }) },
        { label: 'Download', icon: Download, onClick: r => generateCompliancePDF('nm', r) },
        { label: 'Edit', icon: Edit2, onClick: r => { setNmForm({ projectId: r.projectId, discom: r.discom, status: r.status || '', applicationDate: r.appliedDate || '', contactOfficer: r.discomOfficer || '', contactPhone: r.discomPhone || '' }); setEditingNM(r.applicationId); setShowAddNM(true); } },
        { label: 'Delete', icon: Trash2, onClick: r => handleDeleteNM(r.applicationId), danger: true }
    ];
    const SUB_ACTIONS = [
        { label: 'View', icon: FileText, onClick: r => setSelected({ type: 'sub', data: r }) },
        { label: 'Download', icon: Download, onClick: r => generateCompliancePDF('sub', r) },
        { label: 'Edit', icon: Edit2, onClick: r => { setSubForm({ projectId: r.projectId, scheme: r.scheme, status: r.status || '', claimAmount: r.claimAmount || '', applicationDate: r.appliedDate || '', referenceNo: r.applicationRef || '' }); setEditingSub(r.subsidyId); setShowAddSub(true); } },
        { label: 'Delete', icon: Trash2, onClick: r => handleDeleteSub(r.subsidyId), danger: true }
    ];
    const INS_ACTIONS = [
        { label: 'View', icon: FileText, onClick: r => setSelected({ type: 'ins', data: r }) },
        { label: 'Download', icon: Download, onClick: r => generateCompliancePDF('ins', r) },
        { label: 'Edit', icon: Edit2, onClick: r => { setInsForm({ projectId: r.projectId, type: r.type, status: r.status || '', scheduledDate: r.scheduledDate || '', inspector: r.inspector || '', notes: r.remarks || '' }); setEditingIns(r.inspectionId); setShowAddIns(true); } },
        { label: 'Delete', icon: Trash2, onClick: r => handleDeleteIns(r.inspectionId), danger: true }
    ];
    const DOC_ACTIONS = [
        { label: 'View', icon: FileText, onClick: r => setSelected({ type: 'doc', data: r }) },
        { label: 'Download', icon: Download, onClick: r => generateCompliancePDF('doc', r) },
        { label: 'Edit', icon: Edit2, onClick: r => { setDocForm({ projectId: r.projectId, documentType: r.name || r.category, status: r.status || '', issuingAuthority: r.issuingAuthority || '', documentDate: r.documentDate || '' }); setEditingDoc(r.documentId); setShowUpload(true); } },
        { label: 'Delete', icon: Trash2, onClick: r => handleDeleteDoc(r.documentId), danger: true }
    ];

    return (
        <div className="animate-fade-in space-y-5">
            <PageHeader
                title="Compliance & Regulatory"
                subtitle="Net metering · subsidies · DISCOM inspections · document checklist"
                actions={[
                    { type: 'button', label: 'Upload Doc', icon: Upload, onClick: () => setShowUpload(true) },
                    { type: 'button', label: 'Apply Net Metering', icon: Plus, variant: 'primary', onClick: () => setShowAddNM(true) }
                ]}
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard
                    label={<span className="text-xs font-medium text-[var(--text-muted)]">Net Metering Apps</span>}
                    value={stats.netMetering?.total || 0}
                    icon={Building2}
                    color="blue"
                    style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
                    iconBgColor="bg-blue-100"
                    iconColor="text-blue-600"
                />
                <KPICard
                    label={<span className="text-xs font-medium text-[var(--text-muted)]">Subsidy Claimed</span>}
                    value={`₹${(totalSubsidy / 100000).toFixed(1)}L`}
                    icon={IndianRupee}
                    color="solar"
                    style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)' }}
                    iconBgColor="bg-orange-100"
                    iconColor="text-orange-600"
                />
                <KPICard
                    label={<span className="text-xs font-medium text-[var(--text-muted)]">Subsidy Disbursed</span>}
                    value={`₹${(disbursed / 100000).toFixed(1)}L`}
                    icon={CheckCircle}
                    color="emerald"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
                    iconBgColor="bg-[var(--green)]/10"
                    iconColor="text-[var(--green)]"
                />
                <KPICard
                    label={<span className="text-xs font-medium text-[var(--text-muted)]">Docs Pending</span>}
                    value={stats.documents?.pending || 0}
                    icon={AlertTriangle}
                    color="amber"
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
                    iconBgColor="bg-amber-100"
                    iconColor="text-amber-600"
                />
            </div>

            {/* AI Banner */}
            <div className="ai-banner">
                <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
                <p className="text-xs text-[var(--text-secondary)]">
                    <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
                    NM001 (Joshi Industries) awaiting bidirectional meter installation — coordinate with DGVCL for expedited meter provisioning. SUB001 (PM Surya Ghar) application submitted — expect sanction in 15-20 working days.
                </p>
            </div>

            {/* Document Completion Progress */}
            <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <ShieldCheck size={15} className="text-[var(--accent)]" /> Document Compliance Score
                    </h3>
                    <span className="text-sm font-black text-[var(--accent-light)]">{docProgress}%</span>
                </div>
                <Progress value={docProgress} className="h-2.5 mb-2" />
                <div className="flex gap-4 text-xs text-[var(--text-muted)]">
                    <span className="text-[var(--green)] font-semibold">{uploadedDocs} Uploaded</span>
                    <span className="text-amber-400 font-semibold">{pendingDocs} Pending</span>
                    <span>{documents.length} Total Required</span>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="netmetering">
                <TabsList>
                    <TabsTrigger value="netmetering">Net Metering ({nmItems.length})</TabsTrigger>
                    <TabsTrigger value="subsidies">Subsidies ({subItems.length})</TabsTrigger>
                    <TabsTrigger value="inspections">Inspections ({inspections.length})</TabsTrigger>
                    <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="netmetering">
                    <div className="space-y-3">
                        {/* Header row: view toggle + action button */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="view-toggle-pill">
                                <button onClick={() => setNmView('kanban')}
                                    className={`view-toggle-btn ${nmView === 'kanban' ? 'active' : ''}`}>
                                    <LayoutGrid size={12} /> Kanban
                                </button>
                                <button onClick={() => setNmView('table')}
                                    className={`view-toggle-btn ${nmView === 'table' ? 'active' : ''}`}>
                                    <List size={12} /> Table
                                </button>
                            </div>
                            <Button size="sm" onClick={() => setShowAddNM(true)}><Plus size={12} /> New Application</Button>
                        </div>

                        {nmView === 'kanban' ? (
                            <ComplianceKanbanBoard
                                stages={NM_STAGES}
                                items={nmItems}
                                CardComponent={NMCard}
                                onStageChange={handleNMStage}
                                onCardClick={setSelected}
                            />
                        ) : (
                            <DataTable columns={NM_COLUMNS} data={paginatedNM} rowActions={NM_ACTIONS}
                                pagination={{ page: nmPage, pageSize, total: nmItems.length, onChange: setNmPage }}
                                emptyMessage="No net metering applications found."
                                onRowClick={(item) => setSelected({ type: 'nm', data: item })} />
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="subsidies">
                    <div className="space-y-3">
                        {/* Header row: view toggle + action button */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="view-toggle-pill">
                                <button onClick={() => setSubView('kanban')}
                                    className={`view-toggle-btn ${subView === 'kanban' ? 'active' : ''}`}>
                                    <LayoutGrid size={12} /> Kanban
                                </button>
                                <button onClick={() => setSubView('table')}
                                    className={`view-toggle-btn ${subView === 'table' ? 'active' : ''}`}>
                                    <List size={12} /> Table
                                </button>
                            </div>
                            <Button size="sm" onClick={() => setShowAddSub(true)}><Plus size={12} /> New Subsidy Application</Button>
                        </div>

                        {subView === 'kanban' ? (
                            <ComplianceKanbanBoard
                                stages={SUB_STAGES}
                                items={subItems}
                                CardComponent={SubCard}
                                onStageChange={handleSubStage}
                                onCardClick={setSelected}
                            />
                        ) : (
                            <DataTable columns={SUB_COLUMNS} data={paginatedSub} rowActions={SUB_ACTIONS}
                                pagination={{ page: subPage, pageSize, total: subItems.length, onChange: setSubPage }}
                                emptyMessage="No subsidy applications found."
                                onRowClick={(item) => setSelected({ type: 'sub', data: item })} />
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="inspections">
                    <div className="space-y-3">
                        <div className="flex justify-end">
                            <Button size="sm" onClick={() => setShowAddIns(true)}><Plus size={12} /> Schedule Inspection</Button>
                        </div>
                        <DataTable columns={INS_COLUMNS} data={paginatedIns} rowActions={INS_ACTIONS}
                            pagination={{ page: insPage, pageSize, total: inspections.length, onChange: setInsPage }}
                            emptyMessage="No inspections found."
                            onRowClick={(item) => setSelected({ type: 'ins', data: item })} />
                    </div>
                </TabsContent>

                <TabsContent value="documents">
                    <div className="space-y-3">
                        <div className="flex justify-end">
                            <Button size="sm" onClick={() => setShowUpload(true)}><Upload size={12} /> Add Document</Button>
                        </div>
                        <DataTable columns={DOC_COLUMNS} data={paginatedDoc} rowActions={DOC_ACTIONS}
                            pagination={{ page: docPage, pageSize, total: documents.length, onChange: setDocPage }}
                            emptyMessage="No documents found."
                            onRowClick={(item) => setSelected({ type: 'doc', data: item })} />
                    </div>
                </TabsContent>
            </Tabs>

            {/* Net Metering Modal */}
            <Modal open={showAddNM} onClose={() => { setShowAddNM(false); setEditingNM(null); }} title={editingNM ? "Edit Net Metering Application" : "Apply for Net Metering"}
                footer={
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => { setShowAddNM(false); setEditingNM(null); }}>Cancel</Button>
                        <Button onClick={editingNM ? handleUpdateNM : handleSubmitNM}><Plus size={13} /> {editingNM ? 'Update' : 'Submit'} Application</Button>
                    </div>
                }>
                <div className="space-y-3">
                    <FormField label="Project">
                        <Select value={nmForm.projectId} onChange={e => setNmForm(f => ({ ...f, projectId: e.target.value }))}>
                            <option value="">Select Project</option>
                            {projects.map(p => (
                                <option key={p._id || p.projectId} value={p.projectId || p._id}>
                                    {p.projectId || p._id} – {p.customerName || 'Unknown'} {p.systemSize ? `(${p.systemSize} kW)` : ''}
                                </option>
                            ))}
                        </Select>
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="DISCOM">
                            <Select value={nmForm.discom} onChange={e => setNmForm(f => ({ ...f, discom: e.target.value }))}>
                                <option value="">Select DISCOM</option>
                                {['DGVCL', 'MGVCL', 'PGVCL', 'UGVCL', 'MSEDCL', 'BESCOM'].map(d => <option key={d} value={d}>{d}</option>)}
                            </Select>
                        </FormField>
                        <FormField label="Status">
                            <Select value={nmForm.status || ''} onChange={e => setNmForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="">Select Status</option>
                                {['Draft', 'Applied', 'Approved', 'Rejected', 'Connected'].map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Application Date">
                            <Input type="date" value={nmForm.applicationDate} onChange={e => setNmForm(f => ({ ...f, applicationDate: e.target.value }))} />
                        </FormField>
                    </div>
                    <FormField label="DISCOM Contact Officer">
                        <Input placeholder="Officer name" value={nmForm.contactOfficer} onChange={e => setNmForm(f => ({ ...f, contactOfficer: e.target.value }))} />
                    </FormField>
                    <FormField label="DISCOM Contact Phone">
                        <Input placeholder="9876543210" value={nmForm.contactPhone} onChange={e => setNmForm(f => ({ ...f, contactPhone: e.target.value }))} />
                    </FormField>
                </div>
            </Modal>

            {/* Subsidy Modal */}
            <Modal open={showAddSub} onClose={() => { setShowAddSub(false); setEditingSub(null); }} title={editingSub ? "Edit Subsidy Application" : "File Subsidy Application"}
                footer={
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => { setShowAddSub(false); setEditingSub(null); }}>Cancel</Button>
                        <Button onClick={editingSub ? handleUpdateSub : handleSubmitSub}><Plus size={13} /> {editingSub ? 'Update' : 'Submit'} Application</Button>
                    </div>
                }>
                <div className="space-y-3">
                    <FormField label="Project">
                        <Select value={subForm.projectId} onChange={e => setSubForm(f => ({ ...f, projectId: e.target.value }))}>
                            <option value="">Select Project</option>
                            {projects.map(p => (
                                <option key={p._id || p.projectId} value={p.projectId || p._id}>
                                    {p.projectId || p._id} – {p.customerName || 'Unknown'} {p.systemSize ? `(${p.systemSize} kW)` : ''}
                                </option>
                            ))}
                        </Select>
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Subsidy Scheme">
                            <Select value={subForm.scheme} onChange={e => setSubForm(f => ({ ...f, scheme: e.target.value }))}>
                                <option value="">Select Scheme</option>
                                {['PM Surya Ghar', 'GEDA Rooftop', 'MNRE CAPEX', 'State CAPEX'].map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </FormField>
                        <FormField label="Status">
                            <Select value={subForm.status || ''} onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="">Select Status</option>
                                {['Applied', 'Sanctioned', 'Disbursed', 'Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Claim Amount (₹)">
                            <Input type="number" placeholder="94500" value={subForm.claimAmount} onChange={e => setSubForm(f => ({ ...f, claimAmount: e.target.value }))} />
                        </FormField>
                        <FormField label="Application Date">
                            <Input type="date" value={subForm.applicationDate} onChange={e => setSubForm(f => ({ ...f, applicationDate: e.target.value }))} />
                        </FormField>
                    </div>
                    <FormField label="Application Reference No.">
                        <Input placeholder="PMSG/GJ/2026/..." value={subForm.referenceNo} onChange={e => setSubForm(f => ({ ...f, referenceNo: e.target.value }))} />
                    </FormField>
                </div>
            </Modal>

            {/* Upload Document Modal */}
            <Modal open={showUpload} onClose={() => { setShowUpload(false); setEditingDoc(null); }} title={editingDoc ? "Edit Document" : "Upload Compliance Document"}
                footer={
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => { setShowUpload(false); setEditingDoc(null); }}>Cancel</Button>
                        <Button onClick={editingDoc ? handleUpdateDoc : handleSubmitDoc}><Upload size={13} /> {editingDoc ? 'Update' : 'Upload'}</Button>
                    </div>
                }>
                <div className="space-y-3">
                    <FormField label="Project">
                        <Select value={docForm.projectId} onChange={e => setDocForm(f => ({ ...f, projectId: e.target.value }))}>
                            <option value="">Select Project</option>
                            {projects.map(p => (
                                <option key={p._id || p.projectId} value={p.projectId || p._id}>
                                    {p.projectId || p._id} – {p.customerName || 'Unknown'} {p.systemSize ? `(${p.systemSize} kW)` : ''}
                                </option>
                            ))}
                        </Select>
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Document Type">
                            <Select value={docForm.documentType} onChange={e => setDocForm(f => ({ ...f, documentType: e.target.value }))}>
                                <option value="">Select Document Type</option>
                                <option value="Net Metering Application Form">Net Metering Application Form</option>
                                <option value="Single Line Diagram (SLD)">Single Line Diagram (SLD)</option>
                                <option value="Structural Load Certificate">Structural Load Certificate</option>
                                <option value="Electrical Completion Certificate">Electrical Completion Certificate</option>
                                <option value="Bidirectional Meter Installation Report">Bidirectional Meter Installation Report</option>
                                <option value="Net Metering Agreement">Net Metering Agreement</option>
                                <option value="Subsidy Application">Subsidy Application</option>
                                <option value="Commissioning Certificate">Commissioning Certificate</option>
                                <option value="Generation Meter Calibration">Generation Meter Calibration</option>
                            </Select>
                        </FormField>
                        <FormField label="Status">
                            <Select value={docForm.status || ''} onChange={e => setDocForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="">Select Status</option>
                                {['Uploaded', 'Pending', 'Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </FormField>
                    </div>
                    <FormField label="Issuing Authority">
                        <Select value={docForm.issuingAuthority} onChange={e => setDocForm(f => ({ ...f, issuingAuthority: e.target.value }))}>
                            <option value="">Select Authority</option>
                            {['DISCOM', 'CEA', 'MNRE', 'GEDA', 'Internal', 'Structural Engineer'].map(a => <option key={a} value={a}>{a}</option>)}
                        </Select>
                    </FormField>
                    <FormField label="Document Date">
                        <Input type="date" value={docForm.documentDate} onChange={e => setDocForm(f => ({ ...f, documentDate: e.target.value }))} />
                    </FormField>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={e => setDocFile(e.target.files[0])}
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                    />
                    <div
                        className="border-2 border-dashed border-[var(--border-base)] rounded-lg p-6 text-center cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={24} className="mx-auto text-[var(--text-muted)] mb-2" />
                        <p className="text-xs text-[var(--text-muted)]">
                            {docFile ? `Selected: ${docFile.name}` : 'Click to select file or drag & drop'}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">PDF, JPG, PNG — max 10MB</p>
                    </div>
                </div>
            </Modal>

            {/* Inspection Schedule Modal */}
            <Modal open={showAddIns} onClose={() => { setShowAddIns(false); setEditingIns(null); }} title={editingIns ? "Edit Inspection" : "Schedule Inspection"}
                footer={
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => { setShowAddIns(false); setEditingIns(null); }}>Cancel</Button>
                        <Button onClick={editingIns ? handleUpdateIns : handleSubmitIns}><Plus size={13} /> {editingIns ? 'Update' : 'Schedule'} Inspection</Button>
                    </div>
                }>
                <div className="space-y-3">
                    <FormField label="Project">
                        <Select value={insForm.projectId} onChange={e => setInsForm(f => ({ ...f, projectId: e.target.value }))}>
                            <option value="">Select Project</option>
                            {projects.map(p => (
                                <option key={p._id || p.projectId} value={p.projectId || p._id}>
                                    {p.projectId || p._id} – {p.customerName || 'Unknown'} {p.systemSize ? `(${p.systemSize} kW)` : ''}
                                </option>
                            ))}
                        </Select>
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Inspection Type">
                            <Select value={insForm.type} onChange={e => setInsForm(f => ({ ...f, type: e.target.value }))}>
                                <option value="">Select Type</option>
                                {['DISCOM Inspection', 'CEA Inspection', 'MNRE Inspection', 'Structural', 'Electrical', 'Fire Safety'].map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                        </FormField>
                        <FormField label="Status">
                            <Select value={insForm.status || ''} onChange={e => setInsForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="">Select Status</option>
                                {['Pending', 'Scheduled', 'Passed', 'Failed'].map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Scheduled Date">
                            <Input type="date" value={insForm.scheduledDate} onChange={e => setInsForm(f => ({ ...f, scheduledDate: e.target.value }))} />
                        </FormField>
                        <FormField label="Inspector Name">
                            <Input placeholder="Inspector name" value={insForm.inspector} onChange={e => setInsForm(f => ({ ...f, inspector: e.target.value }))} />
                        </FormField>
                    </div>
                    <FormField label="Notes">
                        <Input placeholder="Additional notes..." value={insForm.notes} onChange={e => setInsForm(f => ({ ...f, notes: e.target.value }))} />
                    </FormField>
                </div>
            </Modal>

            {/* Detail Modal */}
            {selected && selected.data && (
                <Modal open={!!selected} onClose={() => setSelected(null)}
                    title={selected.type === 'nm' ? `Net Metering — ${selected.data?.id || selected.data?.applicationId || selected.data?._id}` :
                        selected.type === 'sub' ? `Subsidy — ${selected.data?.id || selected.data?.subsidyId || selected.data?._id}` :
                            selected.type === 'ins' ? `Inspection — ${selected.data?.id || selected.data?.inspectionId || selected.data?._id}` :
                                `Document — ${selected.data?.id || selected.data?.documentId || selected.data?._id}`}
                    footer={
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
                            <Button variant="ghost" onClick={() => {
                                const r = selected.data;
                                if (selected.type === 'nm') {
                                    setNmForm({ projectId: r.projectId, discom: r.discom, status: r.status || '', applicationDate: r.appliedDate || r.applicationDate || '', contactOfficer: r.discomOfficer || '', contactPhone: r.discomPhone || '' });
                                    setEditingNM(r.applicationId || r._id);
                                    setShowAddNM(true);
                                } else if (selected.type === 'sub') {
                                    setSubForm({ projectId: r.projectId, scheme: r.scheme, status: r.status || '', claimAmount: r.claimAmount || '', applicationDate: r.appliedDate || r.applicationDate || '', referenceNo: r.applicationRef || '' });
                                    setEditingSub(r.subsidyId || r._id);
                                    setShowAddSub(true);
                                } else if (selected.type === 'ins') {
                                    setInsForm({ projectId: r.projectId, type: r.type, status: r.status || '', scheduledDate: r.scheduledDate || '', inspector: r.inspector || '', notes: r.remarks || '' });
                                    setEditingIns(r.inspectionId || r._id);
                                    setShowAddIns(true);
                                } else if (selected.type === 'doc') {
                                    setDocForm({ projectId: r.projectId, documentType: r.name || r.category, status: r.status || '', issuingAuthority: r.issuingAuthority || '', documentDate: r.documentDate || '' });
                                    setEditingDoc(r.documentId || r._id);
                                    setShowUpload(true);
                                }
                                setSelected(null);
                            }}><Edit2 size={13} /> Edit</Button>
                            <Button onClick={() => generateCompliancePDF(selected.type, selected.data)}><Download size={13} /> Download</Button>
                        </div>
                    }>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        {Object.entries(selected.data)
                            .filter(([k]) => !['_id', '__v', 'tenantId', 'isDeleted'].includes(k))
                            .map(([k, v]) => (
                                <div key={k} className="glass-card p-2">
                                    <div className="text-[var(--text-muted)] mb-0.5 capitalize">{k.replace(/([A-Z])/g, ' $1')}</div>
                                    <div className="font-semibold text-[var(--text-primary)]">
                                        {v === null || v === undefined ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                                    </div>
                                </div>
                            ))}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CompliancePage;

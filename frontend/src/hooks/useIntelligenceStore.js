// Solar OS – AI Intelligence Store
// Pure mock intelligence engine — derived from existing module data.
// Backend API integration enabled

import { useState, useEffect, useMemo } from 'react';
import {
    LEADS, PROJECTS, QUOTATIONS, INVENTORY, INVOICES,
    SURVEYS, DESIGNS, TICKETS,
} from '../data/mockData';

const STORE_KEY = 'solar-os-intelligence-store';

// ── Derived intelligence computations ────────────────────────────────────────

const computeHealthScores = () => {
    // Sales Health — based on pipeline activity, lead engagement, conversion
    const hotLeads = LEADS.filter(l => ['negotiation', 'proposal', 'won'].includes(l.stage)).length;
    const staleLeads = LEADS.filter(l => l.age > 10).length;
    const convRate = QUOTATIONS.filter(q => q.status === 'Approved').length / Math.max(QUOTATIONS.length, 1) * 100;
    const salesHealth = Math.round(Math.min(100, (hotLeads / LEADS.length) * 60 + convRate * 0.8 - staleLeads * 2 + 45));

    // Project Execution — milestone health, delay ratio
    const onTrack = PROJECTS.filter(p => p.progress > 50 && p.status !== 'On Hold').length;
    const delayed = PROJECTS.filter(p => p.status === 'On Hold' || p.progress < 20).length;
    const projectExecution = Math.round(Math.min(100, (onTrack / Math.max(PROJECTS.length, 1)) * 80 + 30 - delayed * 8));

    // Cash Flow — receivables vs payables ratio
    const totalReceivable = INVOICES.filter(i => i.status !== 'Paid').reduce((a, i) => a + i.balance, 0);
    const overdueInvoices = INVOICES.filter(i => i.status === 'Overdue').length;
    const cashFlow = Math.round(Math.min(100, 85 - overdueInvoices * 12 - (totalReceivable > 1000000 ? 10 : 0)));

    // Inventory Stability — stock vs minimum stock
    const belowMin = INVENTORY.filter(i => i.available <= i.minStock).length;
    const inventoryStability = Math.round(Math.min(100, 95 - belowMin * 18));

    // Team Efficiency — tickets resolved, surveys completed, designs approved
    const resolvedTickets = TICKETS.filter(t => t.status === 'Resolved').length;
    const completedSurveys = SURVEYS.filter(s => s.status === 'Completed').length;
    const approvedDesigns = DESIGNS.filter(d => d.status === 'Approved').length;
    const teamEfficiency = Math.round(Math.min(100,
        (resolvedTickets / Math.max(TICKETS.length, 1)) * 30 +
        (completedSurveys / Math.max(SURVEYS.length, 1)) * 30 +
        (approvedDesigns / Math.max(DESIGNS.length, 1)) * 30 + 15
    ));

    const overall = Math.round((salesHealth + projectExecution + cashFlow + inventoryStability + teamEfficiency) / 5);

    return { overall, salesHealth, projectExecution, cashFlow, inventoryStability, teamEfficiency };
};

const computeAlerts = () => {
    const alerts = [];

    // Stale leads
    const staleLeads = LEADS.filter(l => l.age > 5 && !['won', 'lost'].includes(l.stage));
    if (staleLeads.length > 0) {
        alerts.push({
            id: 'AL001', priority: 'High', category: 'CRM',
            icon: 'UserX', color: 'amber',
            title: `${staleLeads.length} leads inactive for 5+ days`,
            detail: `${staleLeads.map(l => l.name).slice(0, 2).join(', ')} and others need follow-up.`,
            action: { label: 'View Leads', page: 'crm' },
            metric: `₹${(staleLeads.reduce((a, l) => a + l.value, 0) / 100000).toFixed(1)}L at risk`,
        });
    }

    // Projects at risk
    const riskProjects = PROJECTS.filter(p => p.status === 'On Hold' || (p.progress < 30 && p.status === 'Installation'));
    if (riskProjects.length > 0) {
        alerts.push({
            id: 'AL002', priority: 'High', category: 'Projects',
            icon: 'AlertTriangle', color: 'red',
            title: `${riskProjects.length} project(s) may delay installation`,
            detail: `${riskProjects[0]?.customerName} flagged. Check milestone velocity.`,
            action: { label: 'Open Projects', page: 'project' },
            metric: `${riskProjects.length} at risk`,
        });
    }

    // Overdue receivables
    const overdue = INVOICES.filter(i => i.status === 'Overdue' || (i.status === 'Pending' && i.balance > 500000));
    const overdueTotal = overdue.reduce((a, i) => a + i.balance, 0);
    if (overdueTotal > 0) {
        alerts.push({
            id: 'AL003', priority: 'High', category: 'Finance',
            icon: 'IndianRupee', color: 'red',
            title: `₹${(overdueTotal / 100000).toFixed(1)}L receivables overdue`,
            detail: `${overdue.length} invoice(s) unpaid. Cash flow impact projected.`,
            action: { label: 'Send Reminder', page: 'finance' },
            metric: `${overdue.length} invoices`,
        });
    }

    // Low inventory
    const lowStock = INVENTORY.filter(i => i.available <= i.minStock);
    if (lowStock.length > 0) {
        alerts.push({
            id: 'AL004', priority: 'Medium', category: 'Inventory',
            icon: 'Package', color: 'amber',
            title: `Inventory shortage predicted: ${lowStock.length} SKU(s)`,
            detail: `${lowStock.map(i => i.name).join(', ')} below safety stock.`,
            action: { label: 'Raise PO', page: 'procurement' },
            metric: `${lowStock.length} SKUs critical`,
        });
    }

    // High probability deals
    const hotDeals = LEADS.filter(l => l.score >= 88 && !['won', 'lost'].includes(l.stage));
    if (hotDeals.length > 0) {
        alerts.push({
            id: 'AL005', priority: 'Low', category: 'Opportunity',
            icon: 'Sparkles', color: 'emerald',
            title: `${hotDeals.length} high-probability deal(s) ready to close`,
            detail: `${hotDeals[0]?.name} (score: ${hotDeals[0]?.score}) — action now increases close rate by 34%.`,
            action: { label: 'View Pipeline', page: 'crm' },
            metric: `₹${(hotDeals.reduce((a, l) => a + l.value, 0) / 100000).toFixed(1)}L potential`,
        });
    }

    // Pending approvals (quotes with discounts)
    const pendingQuotes = QUOTATIONS.filter(q => q.status === 'Draft' && q.discount > 3);
    if (pendingQuotes.length > 0) {
        alerts.push({
            id: 'AL006', priority: 'Medium', category: 'Quotation',
            icon: 'ShieldCheck', color: 'blue',
            title: `${pendingQuotes.length} quote(s) awaiting discount approval`,
            detail: 'Discounts >3% pending manager sign-off. Cannot send to customer.',
            action: { label: 'Review Quotes', page: 'quotation' },
            metric: `${pendingQuotes.length} blocked`,
        });
    }

    return alerts;
};

const computePipelineStats = () => [
    {
        stage: 'Lead', icon: 'Users', count: LEADS.filter(l => !['won', 'lost'].includes(l.stage)).length,
        value: LEADS.filter(l => !['won', 'lost'].includes(l.stage)).reduce((a, l) => a + l.value, 0),
        convRate: 65, riskPct: 12, delayFlag: false,
        color: '#3b82f6', glow: false,
    },
    {
        stage: 'Survey', icon: 'MapPin', count: SURVEYS.length,
        value: SURVEYS.reduce((a, s) => a + (s.estimatedKw * 5600), 0),
        convRate: 78, riskPct: 8, delayFlag: false,
        color: '#8b5cf6', glow: false,
    },
    {
        stage: 'Design', icon: 'Pencil', count: DESIGNS.length,
        value: DESIGNS.reduce((a, d) => a + d.systemSize * 5600, 0),
        convRate: 82, riskPct: 15, delayFlag: true,
        color: '#f59e0b', glow: true,
    },
    {
        stage: 'Quote', icon: 'FileText', count: QUOTATIONS.length,
        value: QUOTATIONS.reduce((a, q) => a + q.totalPrice, 0),
        convRate: 40, riskPct: 30, delayFlag: true,
        color: '#f97316', glow: true,
    },
    {
        stage: 'Project', icon: 'FolderOpen', count: PROJECTS.filter(p => !['Commissioned'].includes(p.status)).length,
        value: PROJECTS.filter(p => !['Commissioned'].includes(p.status)).reduce((a, p) => a + p.value, 0),
        convRate: 88, riskPct: 20, delayFlag: false,
        color: '#06b6d4', glow: false,
    },
    {
        stage: 'Install', icon: 'Wrench', count: PROJECTS.filter(p => p.status === 'Installation').length,
        value: PROJECTS.filter(p => p.status === 'Installation').reduce((a, p) => a + p.value, 0),
        convRate: 94, riskPct: 18, delayFlag: true,
        color: '#ec4899', glow: true,
    },
    {
        stage: 'Commission', icon: 'CheckCircle', count: PROJECTS.filter(p => p.status === 'Commissioned').length,
        value: PROJECTS.filter(p => p.status === 'Commissioned').reduce((a, p) => a + p.value, 0),
        convRate: 100, riskPct: 2, delayFlag: false,
        color: '#22c55e', glow: false,
    },
    {
        stage: 'Finance', icon: 'DollarSign',
        count: INVOICES.filter(i => i.status !== 'Paid').length,
        value: INVOICES.filter(i => i.status !== 'Paid').reduce((a, i) => a + i.balance, 0),
        convRate: 72, riskPct: 25, delayFlag: true,
        color: '#a78bfa', glow: true,
    },
];

const computeProjectRisks = () => PROJECTS.map(p => {
    const factors = [];
    if (p.status === 'On Hold') factors.push('Project on hold');
    if (p.progress < 20 && p.status !== 'Survey') factors.push('Low progress velocity');
    const pendingMilestones = p.milestones.filter(m => m.status === 'Pending').length;
    if (pendingMilestones > 3) factors.push('Multiple pending milestones');
    const hasLowStock = INVENTORY.some(i => i.available <= i.minStock && i.category === 'Panel');
    if (hasLowStock && ['Procurement', 'Design'].includes(p.status)) factors.push('Material shortage risk');
    if (['Installation', 'Procurement'].includes(p.status) && !p.estEndDate) factors.push('No completion date set');
    if (p.status === 'Installation') factors.push('Pending supplier deliveries');

    const riskScore = factors.length === 0 ? 'Low' : factors.length === 1 ? 'Medium' : 'High';
    return { ...p, riskFactors: factors, riskLevel: riskScore };
});

const computeCashForecast = () => {
    const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const baseInflow = 2100000;
    const baseOutflow = 1400000;
    return months.map((month, i) => {
        const growth = 1 + (i * 0.08);
        const variance = (Math.sin(i * 1.3) * 0.12);
        const inflow = Math.round(baseInflow * growth * (1 + variance));
        const outflow = Math.round(baseOutflow * growth * (1 + variance * 0.6));
        return { month, inflow, outflow, net: inflow - outflow };
    });
};

const computeTeamMetrics = () => [
    {
        dept: 'Sales', icon: 'Users', color: '#3b82f6',
        score: 78, tasksCompleted: 24, totalTasks: 31,
        delayRatio: 12, trend: 'up', trendVal: 8,
        insight: 'Follow-up velocity improved. 3 deals in negotiation stage.',
    },
    {
        dept: 'Survey', icon: 'MapPin', color: '#8b5cf6',
        score: 85, tasksCompleted: 3, totalTasks: 4,
        delayRatio: 5, trend: 'up', trendVal: 5,
        insight: '1 survey pending — Rohit Kapoor 200kW. Schedule urgently.',
    },
    {
        dept: 'Design', icon: 'Pencil', color: '#f59e0b',
        score: 72, tasksCompleted: 1, totalTasks: 3,
        delayRatio: 22, trend: 'down', trendVal: 6,
        insight: 'D003 Parekh Ceramics BOQ not generated. Blocks quotation.',
    },
    {
        dept: 'Installation', icon: 'Wrench', color: '#22c55e',
        score: 88, tasksCompleted: 1, totalTasks: 2,
        delayRatio: 8, trend: 'up', trendVal: 12,
        insight: 'Installation efficiency improved 12% this week. P001 on track.',
    },
    {
        dept: 'Finance', icon: 'DollarSign', color: '#a78bfa',
        score: 65, tasksCompleted: 2, totalTasks: 7,
        delayRatio: 35, trend: 'down', trendVal: 4,
        insight: '₹19.5L outstanding receivables. INV007 overdue 2 days.',
    },
];

const computeInsightFeed = () => [
    { id: 'F001', ts: '2 min ago', type: 'warning', text: 'Quotation approval delays increasing — avg approval time up 2.3 days this week.' },
    { id: 'F002', ts: '15 min ago', type: 'success', text: 'North Gujarat region conversion rate improved 18% vs last month.' },
    { id: 'F003', ts: '1 hr ago', type: 'warning', text: 'Inventory turnover slowing — 400W panels at 72-day turnover vs 45-day target.' },
    { id: 'F004', ts: '2 hrs ago', type: 'info', text: 'Lead L009 Harish Mehta (dairy sector) shows highest engagement score in 30 days.' },
    { id: 'F005', ts: '3 hrs ago', type: 'success', text: 'P003 Prakash Agarwal commissioned — ₹4.48L recognised, margin 24.8%.' },
    { id: 'F006', ts: '5 hrs ago', type: 'warning', text: 'DC Cable stock at 4,200m — approaching reorder point. Suggest PO within 3 days.' },
    { id: 'F007', ts: '6 hrs ago', type: 'info', text: '3 leads from Morbi Ceramics Belt — cluster opportunity worth ₹21L potential.' },
    { id: 'F008', ts: '8 hrs ago', type: 'critical', text: 'P008 Deepika Shah on hold 37 days — escalation required or mark as lost.' },
    { id: 'F009', ts: '10 hrs ago', type: 'success', text: 'Solar panel efficiency tariff saving model updated — Vadodara region now ₹7.2/unit.' },
    { id: 'F010', ts: '12 hrs ago', type: 'info', text: 'Technician Kiran Tech has 2 open tickets — T001 (critical) unresolved 3 days.' },
    { id: 'F011', ts: '1 day ago', type: 'warning', text: 'PO002 SMA inverter delivery may slip — expected Feb 28, supplier flagged delay.' },
    { id: 'F012', ts: '1 day ago', type: 'success', text: 'Customer satisfaction score 4.8/5 from last 3 commissioned projects.' },
];

const computeGlobalKPIs = () => ({
    revenueForecast: { val: '₹2.4Cr', sub: 'Next 12 months', trend: '+23%', up: true },
    conversionRate: { val: '33%', sub: 'Lead → Project', trend: '+5% MoM', up: true },
    avgProjectDuration: { val: '38 days', sub: 'Design to Commission', trend: '-4 days', up: true },
    installationLoad: { val: '72%', sub: 'Technician capacity', trend: 'Moderate', up: null },
    cashRiskIndex: { val: '3.2', sub: 'Scale 1–10 (low=safe)', trend: '↑ from 2.8', up: false },
    inventoryTurnover: { val: '52 days', sub: 'Avg SKU rotation', trend: '+7 days vs target', up: false },
});

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useIntelligenceStore = () => {
    const [lastRefresh, setLastRefresh] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORE_KEY))?.lastRefresh || Date.now(); }
        catch { return Date.now(); }
    });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [aiStatus, setAiStatus] = useState('Optimizing'); // Learning | Analyzing | Optimizing
    const [dateRange, setDateRange] = useState('Last 30 days');

    const intelligence = useMemo(() => ({
        health: computeHealthScores(),
        alerts: computeAlerts(),
        pipeline: computePipelineStats(),
        risks: computeProjectRisks(),
        cashForecast: computeCashForecast(),
        teamMetrics: computeTeamMetrics(),
        insightFeed: computeInsightFeed(),
        globalKPIs: computeGlobalKPIs(),
    }), [lastRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        try { localStorage.setItem(STORE_KEY, JSON.stringify({ lastRefresh })); }
        catch { /* quota exceeded */ }
    }, [lastRefresh]);

    const refresh = () => {
        setIsRefreshing(true);
        const statuses = ['Learning', 'Analyzing', 'Optimizing'];
        setAiStatus(statuses[Math.floor(Math.random() * statuses.length)]);
        setTimeout(() => { setLastRefresh(Date.now()); setIsRefreshing(false); }, 1400);
    };

    return { intelligence, lastRefresh, isRefreshing, refresh, aiStatus, dateRange, setDateRange };
};

export default useIntelligenceStore;

// AdminDashboard.js a "  Admin Control Center (Fully Aligned with Module Design Standards)
// Matches design patterns from CRM, Project, Survey, Installation, and Service modules

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Users, Briefcase, DollarSign, Zap, CheckCircle, AlertTriangle,
    Clock, Eye, Target, Monitor, Database, Server, Crown,
    TrendingUp, Activity, RefreshCw, Download, Calendar, Bell,
    Search, MoreHorizontal, Star, Award, Gauge, Building,
    LayoutDashboard, LayoutGrid, BarChart3, Plus, Edit2, Trash2,
    FileText, ArrowUpRight, Filter, Settings, Shield,
    MapPin, PenTool, Wrench, Headphones, ShoppingCart, Package
} from 'lucide-react';
import ReminderWidget from '../Reminder/ReminderWidget';
import {
    ChartCard, DashTooltip,
    fmtCurrency, fmtPct, CHART_COLORS, chartAxisStyle, ROLE_COLORS
} from './DashboardShell';
import { DateFilter, filterByDateRange } from '../dashboard/DateFilter';

// a"  a"   Admin Approval Workflow Stages a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const ADMIN_KANBAN_STAGES = [
    { id: 'pending_approval', label: 'Pending Approval', color: '#f59e0b', icon: Clock, bg: '#f59e0b20' },
    { id: 'in_review', label: 'In Review', color: '#3b82f6', icon: Eye, bg: '#3b82f620' },
    { id: 'escalated', label: 'Escalated', color: '#ef4444', icon: AlertTriangle, bg: '#ef444420' },
    { id: 'approved', label: 'Approved', color: '#10b981', icon: CheckCircle, bg: '#10b98120' }
];

// a"  a"   Mock Data for Admin Approval Items a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const MOCK_ADMIN_ITEMS = [
    { id: 1, title: 'New Project Approval Request', type: 'Project', requester: 'Sales Team', value: 285000, stage: 'pending_approval', priority: 'high', date: '2h ago' },
    { id: 2, title: 'Budget Increase - Ahmedabad Project', type: 'Finance', requester: 'PM Team', value: 50000, stage: 'in_review', priority: 'medium', date: '4h ago' },
    { id: 3, title: 'Vendor Payment Above Threshold', type: 'Finance', requester: 'Procurement', value: 850000, stage: 'pending_approval', priority: 'high', date: '1h ago' },
    { id: 4, title: 'Design Change Request', type: 'Design', requester: 'Engineering', value: 25000, stage: 'escalated', priority: 'urgent', date: '30m ago' },
    { id: 5, title: 'Compliance Certificate', type: 'Compliance', requester: 'Service', value: 0, stage: 'approved', priority: 'low', date: '1d ago' },
    { id: 6, title: 'Large Equipment Purchase', type: 'Procurement', requester: 'Store', value: 1200000, stage: 'in_review', priority: 'high', date: '3h ago' },
    { id: 7, title: 'Customer Credit Extension', type: 'Finance', requester: 'Sales Team', value: 450000, stage: 'escalated', priority: 'urgent', date: '45m ago' },
    { id: 8, title: 'Project Milestone Completion', type: 'Project', requester: 'PM Team', value: 180000, stage: 'approved', priority: 'medium', date: '2d ago' }
];

// a"  a"   Admin Overview Data a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const ADMIN_OVERVIEW_DATA = {
    totalRevenue: 48000000,
    monthlyRevenue: 4200000,
    activeProjects: 35,
    totalCustomers: 1248,
    systemUptime: 99.8,
    activeUsers: 47,
    pendingApprovals: 12,
    customerSatisfaction: 4.7,
    productivityScore: 87.4,
    departmentEfficiency: 91.2
};

// a"  a"   Revenue Trend Data a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const REVENUE_TREND_DATA = [
    { month: 'Sep', revenue: 3200000, profit: 1280000 },
    { month: 'Oct', revenue: 3600000, profit: 1580000 },
    { month: 'Nov', revenue: 3950000, profit: 1775000 },
    { month: 'Dec', revenue: 4100000, profit: 1845000 },
    { month: 'Jan', revenue: 3850000, profit: 1617000 },
    { month: 'Feb', revenue: 4200000, profit: 1890000 }
];

// a"  a"   Department Performance Data a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const DEPARTMENT_PERFORMANCE = [
    { department: 'Sales', target: 100, actual: 118, efficiency: 95 },
    { department: 'Survey', target: 100, actual: 105, efficiency: 88 },
    { department: 'Design', target: 100, actual: 112, efficiency: 92 },
    { department: 'PM', target: 100, actual: 94, efficiency: 87 },
    { department: 'Finance', target: 100, actual: 108, efficiency: 96 },
    { department: 'Service', target: 100, actual: 102, efficiency: 89 }
];

// a"  a"   Project Status Data a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const PROJECT_STATUS_DATA = [
    { name: 'Completed', value: 186, color: '#10b981' },
    { name: 'In Progress', value: 35, color: '#3b82f6' },
    { name: 'Planning', value: 12, color: '#f59e0b' },
    { name: 'On Hold', value: 4, color: '#ef4444' }
];

// a"  a"   Real-Time Alerts a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const REAL_TIME_ALERTS = [
    { id: 1, type: 'critical', message: 'High-priority project deadline approaching', time: '2 mins ago', role: 'PM' },
    { id: 2, type: 'warning', message: 'Inventory stock below threshold', time: '5 mins ago', role: 'Store' },
    { id: 3, type: 'info', message: 'New customer inquiry received', time: '8 mins ago', role: 'Sales' },
    { id: 4, type: 'success', message: 'Project milestone achieved ahead of schedule', time: '12 mins ago', role: 'PM' }
];

// a"  a"   All Roles Data a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const ALL_ROLES_DATA = [
    {
        id: 'sales',
        name: 'Sales',
        icon: 'DollarSign',
        color: '#3b82f6',
        users: 12,
        activeLeads: 156,
        monthlyTarget: 5000000,
        achieved: 4250000,
        pendingQuotations: 24,
        closedThisMonth: 18,
        status: 'active',
        alerts: 3
    },
    {
        id: 'survey',
        name: 'Survey Engineer',
        icon: 'MapPin',
        color: '#10b981',
        users: 8,
        pendingSurveys: 12,
        completedToday: 5,
        sitesInProgress: 23,
        avgFeasibility: 87,
        status: 'active',
        alerts: 1
    },
    {
        id: 'design',
        name: 'Design Engineer',
        icon: 'PenTool',
        color: '#8b5cf6',
        users: 6,
        activeDesigns: 28,
        pendingApprovals: 8,
        completedToday: 3,
        avgDesignTime: 2.5,
        status: 'active',
        alerts: 2
    },
    {
        id: 'pm',
        name: 'Project Manager',
        icon: 'Briefcase',
        color: '#f59e0b',
        users: 10,
        activeProjects: 35,
        milestonesDue: 7,
        completedThisWeek: 4,
        budgetUtilization: 78,
        status: 'active',
        alerts: 5
    },
    {
        id: 'store',
        name: 'Store Manager',
        icon: 'Package',
        color: '#06b6d4',
        users: 5,
        inventoryValue: 2850000,
        lowStockAlerts: 4,
        pendingGRN: 12,
        itemsDispatched: 156,
        status: 'warning',
        alerts: 4
    },
    {
        id: 'procurement',
        name: 'Procurement Officer',
        icon: 'ShoppingCart',
        color: '#ec4899',
        users: 4,
        pendingPOs: 18,
        vendorQuotes: 24,
        ordersPlaced: 156,
        avgLeadTime: 12,
        status: 'active',
        alerts: 2
    },
    {
        id: 'finance',
        name: 'Finance',
        icon: 'DollarSign',
        color: '#ef4444',
        users: 7,
        pendingInvoices: 42,
        collectionsDue: 850000,
        paymentsPending: 1250000,
        complianceScore: 96,
        status: 'active',
        alerts: 1
    },
    {
        id: 'technician',
        name: 'Technician',
        icon: 'Wrench',
        color: '#f97316',
        users: 15,
        activeInstallations: 8,
        maintenanceDue: 12,
        completedTasks: 45,
        efficiency: 92,
        status: 'active',
        alerts: 3
    },
    {
        id: 'service',
        name: 'Service Manager',
        icon: 'Headphones',
        color: '#84cc16',
        users: 9,
        openTickets: 24,
        amcRenewals: 18,
        complaintsResolved: 156,
        satisfaction: 4.6,
        status: 'active',
        alerts: 2
    },
    {
        id: 'admin',
        name: 'Admin',
        icon: 'Shield',
        color: '#6366f1',
        users: 3,
        pendingApprovals: 12,
        systemAlerts: 2,
        activeSessions: 47,
        securityScore: 98,
        status: 'active',
        alerts: 0
    }
];

// a"  a"   Role Card Component a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const RoleCard = ({ role, onClick }) => {
    const icons = {
        DollarSign, Briefcase, Package, ShoppingCart, MapPin,
        PenTool, Wrench, Headphones, Shield, Users, Activity
    };
    const IconComponent = icons[role.icon] || Users;

    const statusColors = {
        active: { bg: 'bg-emerald-500/10', border: 'border-emerald-200', text: 'text-emerald-600' },
        warning: { bg: 'bg-amber-500/10', border: 'border-amber-200', text: 'text-amber-600' },
        critical: { bg: 'bg-red-500/10', border: 'border-red-200', text: 'text-red-600' }
    };
    const status = statusColors[role.status] || statusColors.active;

    return (
        <div
            onClick={onClick}
            className={`glass-card p-4 cursor-pointer hover:scale-[1.02] transition-all border-l-4 hover:shadow-lg ${status.border}`}
            style={{ borderLeftColor: role.color }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${role.color}15` }}
                    >
                        <IconComponent size={18} style={{ color: role.color }} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{role.name}</h4>
                        <p className="text-[10px] text-[var(--text-muted)]">{role.users} Users Active</p>
                    </div>
                </div>
                {role.alerts > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {role.alerts}
                    </span>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                {role.activeLeads !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Active Leads</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.activeLeads}</p>
                    </div>
                )}
                {role.pendingSurveys !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Pending Surveys</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.pendingSurveys}</p>
                    </div>
                )}
                {role.activeDesigns !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Active Designs</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.activeDesigns}</p>
                    </div>
                )}
                {role.activeProjects !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Active Projects</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.activeProjects}</p>
                    </div>
                )}
                {role.inventoryValue !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Inventory Value</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>a" 1{(role.inventoryValue / 100000).toFixed(1)}L</p>
                    </div>
                )}
                {role.pendingPOs !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Pending POs</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.pendingPOs}</p>
                    </div>
                )}
                {role.pendingInvoices !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Pending Invoices</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.pendingInvoices}</p>
                    </div>
                )}
                {role.activeInstallations !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Installations</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.activeInstallations}</p>
                    </div>
                )}
                {role.openTickets !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Open Tickets</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.openTickets}</p>
                    </div>
                )}
                {role.pendingApprovals !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Pending Approval</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.pendingApprovals}</p>
                    </div>
                )}
                {/* Achievement/Performance */}
                {role.achieved !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Target Achieved</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{((role.achieved / role.monthlyTarget) * 100).toFixed(0)}%</p>
                    </div>
                )}
                {role.completedToday !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Completed Today</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.completedToday}</p>
                    </div>
                )}
                {role.completedThisWeek !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">This Week</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.completedThisWeek}</p>
                    </div>
                )}
                {role.efficiency !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Efficiency</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.efficiency}%</p>
                    </div>
                )}
                {role.satisfaction !== undefined && (
                    <div className="p-2 rounded bg-[var(--bg-elevated)]">
                        <p className="text-[10px] text-[var(--text-muted)]">Satisfaction</p>
                        <p className="text-sm font-bold" style={{ color: role.color }}>{role.satisfaction}/5</p>
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${status.bg} ${status.text}`}>
                    {role.status.toUpperCase()}
                </span>
                <button className="text-[10px] text-[var(--primary)] hover:underline font-medium">
                    View Details a" " 
                </button>
            </div>
        </div>
    );
};

// a"  a"   Admin Kanban Card Component a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const AdminKanbanCard = ({ item, onDragStart, onClick }) => {
    const priorityColors = {
        urgent: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-200 dark:border-red-800' },
        high: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-200 dark:border-orange-800' },
        medium: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-200 dark:border-blue-800' },
        low: { bg: 'bg-gray-500/10', text: 'text-[var(--text-muted)]', border: 'border-[var(--border-base)] dark:border-gray-800' }
    };

    const priority = priorityColors[item.priority] || priorityColors.medium;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onClick={onClick}
            className={`glass-card p-3 cursor-pointer hover:scale-[1.02] transition-all border ${priority.border}`}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <p className="text-xs font-bold text-[var(--text-primary)] mb-1">{item.title}</p>
                    <p className="text-[9px] text-[var(--text-muted)]">{item.requester}</p>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${priority.bg} ${priority.text}`}>
                    {item.priority.toUpperCase()}
                </span>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium">
                        {item.type}
                    </span>
                    {item.value > 0 && (
                        <span className="text-xs font-bold text-[var(--accent)]">
                            {fmtCurrency(item.value)}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-1">
                        <Clock size={8} />
                        <span>{item.date}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[var(--border-subtle)]">
                <button className="flex-1 px-2 py-1 rounded bg-green-500/10 text-green-600 text-[9px] font-medium hover:bg-green-500/20 transition-colors">
                    <CheckCircle size={8} className="inline mr-1" /> Approve
                </button>
                <button className="flex-1 px-2 py-1 rounded bg-blue-500/10 text-blue-600 text-[9px] font-medium hover:bg-blue-500/20 transition-colors">
                    <Eye size={8} className="inline mr-1" /> Review
                </button>
            </div>
        </div>
    );
};

// a"  a"   Admin Kanban Board Component a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const AdminKanbanBoard = ({ items, onStageChange, onCardClick }) => {
    const [dragOver, setDragOver] = useState(null);
    const draggingId = useRef(null);

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
                {ADMIN_KANBAN_STAGES.map(stage => {
                    const stageItems = items.filter(item => item.stage === stage.id);
                    const totalValue = stageItems.reduce((sum, item) => sum + (item.value || 0), 0);

                    return (
                        <div
                            key={stage.id}
                            className={`w-80 flex-shrink-0 transition-all ${dragOver === stage.id ? 'scale-105' : ''}`}
                            onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={() => {
                                if (draggingId.current) {
                                    onStageChange(draggingId.current, stage.id);
                                }
                                draggingId.current = null;
                                setDragOver(null);
                            }}
                        >
                            <div className={`glass-card p-4 ${dragOver === stage.id ? 'border-2 border-[var(--primary)] bg-[var(--primary)]/5' : ''}`}>
                                {/* Stage Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{stage.label}</h4>
                                        <span className="text-xs text-[var(--text-muted)]">{stageItems.length}</span>
                                    </div>
                                    {totalValue > 0 && (
                                        <span className="text-xs font-bold text-[var(--accent)]">
                                            {fmtCurrency(totalValue)}
                                        </span>
                                    )}
                                </div>

                                {/* Cards */}
                                <div className="space-y-3 min-h-[400px]">
                                    {stageItems.map(item => (
                                        <AdminKanbanCard
                                            key={item.id}
                                            item={item}
                                            onDragStart={() => { draggingId.current = item.id; }}
                                            onClick={() => onCardClick?.(item)}
                                        />
                                    ))}

                                    {stageItems.length === 0 && (
                                        <div className="text-center py-8">
                                            <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center mx-auto mb-2">
                                                <stage.icon size={16} className="text-[var(--text-muted)]" />
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">No pending items</p>
                                        </div>
                                    )}
                                </div>

                                {/* Add Button */}
                                <button className="w-full mt-3 p-2 rounded-lg border-2 border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors text-xs font-medium">
                                    <Plus size={12} className="inline mr-1" /> Add Item
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// a"  a"   Main Admin Dashboard Component a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const AdminDashboard = ({ onNavigate }) => {
    const [view, setView] = useState('dashboard'); // dashboard | kanban | analytics
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [adminItems, setAdminItems] = useState(MOCK_ADMIN_ITEMS);
    const [selectedItem, setSelectedItem] = useState(null);

    // Real-time updates simulation
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshing(true);
            setTimeout(() => setRefreshing(false), 500);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleStageChange = (itemId, newStage) => {
        setAdminItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, stage: newStage } : item
        ));
    };

    // KPI Metrics
    const kpis = [
        {
            label: 'Total Revenue (YTD)',
            value: fmtCurrency(ADMIN_OVERVIEW_DATA.totalRevenue),
            change: '+18.4',
            icon: DollarSign,
            color: ROLE_COLORS.finance.primary
        },
        {
            label: 'Active Projects',
            value: ADMIN_OVERVIEW_DATA.activeProjects,
            change: '+5',
            icon: Briefcase,
            color: ROLE_COLORS.pm.primary
        },
        {
            label: 'Total Customers',
            value: ADMIN_OVERVIEW_DATA.totalCustomers.toLocaleString(),
            change: '+32',
            icon: Users,
            color: ROLE_COLORS.sales.primary
        },
        {
            label: 'System Performance',
            value: `${ADMIN_OVERVIEW_DATA.systemUptime}%`,
            change: '+0.2',
            icon: Monitor,
            color: ROLE_COLORS.admin.primary
        }
    ];

    return (
        <div className="space-y-6">
            {/* a"  a"   Standard Module Header a"  a"   */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                            <Crown size={20} className="text-[var(--primary)]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-[var(--text-primary)]">
                                Admin Control Center
                            </h1>
                            <p className="text-sm text-[var(--text-muted)]">
                                Complete organizational oversight and approval management
                            </p>
                        </div>
                    </div>

                    {/* Search & Actions */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] w-64"
                            />
                        </div>
                        <button
                            onClick={() => setRefreshing(!refreshing)}
                            className={`p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors ${refreshing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw size={14} />
                        </button>
                        <button className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors">
                            <Download size={14} />
                        </button>
                        <button className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors">
                            <Settings size={14} />
                        </button>
                    </div>
                </div>

                {/* Live Stats Bar */}
                <div className="flex items-center gap-6 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span>System Online</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users size={12} />
                        <span>{ADMIN_OVERVIEW_DATA.activeUsers} Active Users</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity size={12} />
                        <span>{ADMIN_OVERVIEW_DATA.systemUptime}% Uptime</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span>Last sync: {new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>

            {/* a"  a"   View Toggle (Standard Pattern) a"  a"   */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setView('dashboard')}
                        className={`view-toggle-btn ${view === 'dashboard' ? 'active' : ''}`}
                    >
                        <LayoutDashboard size={14} /> Dashboard
                    </button>
                    <button
                        onClick={() => setView('kanban')}
                        className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}
                    >
                        <LayoutGrid size={14} /> Kanban
                    </button>
                    <button
                        onClick={() => setView('analytics')}
                        className={`view-toggle-btn ${view === 'analytics' ? 'active' : ''}`}
                    >
                        <BarChart3 size={14} /> Analytics
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <AlertTriangle size={12} className="text-amber-500" />
                    <span>{ADMIN_OVERVIEW_DATA.pendingApprovals} Pending Approvals</span>
                </div>
            </div>

            {/* a"  a"   KPI Cards (Standard Module Pattern) a"  a"   */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(kpi => (
                    <div key={kpi.label} className="glass-card p-4 hover:scale-[1.02] transition-transform cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: `${kpi.color}15` }}
                            >
                                <kpi.icon size={18} style={{ color: kpi.color }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-[var(--text-muted)] font-medium">{kpi.label}</p>
                                <p className="text-xl font-black text-[var(--text-primary)]">{kpi.value}</p>
                                {kpi.change && (
                                    <p className={`text-xs font-bold ${kpi.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {kpi.change.startsWith('+') ? 'a" " ' : 'a" "'} {kpi.change}%
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* a"  a"   Dashboard View a"  a"   */}
            {view === 'dashboard' && (
                <div className="space-y-6">
                    {/* Global Date Filter Bar */}
                    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-base)] p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Filter by Date:</span>
                            <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                                {['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'All Time', 'Custom Range'].map((filter) => (
                                    <button 
                                        key={filter} 
                                        className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                                            filter === 'All Time' 
                                                ? 'bg-orange-500 text-white' 
                                                : 'text-[var(--text-secondary)] hover:text-gray-900 hover:bg-gray-200'
                                        }`}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <span className="text-sm text-[var(--text-muted)]">Showing All Data</span>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Analytics */}
                        <ChartCard 
                            title="Revenue Analytics" 
                            subtitle="Monthly performance trends"
                            headerRight={
                                <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                                    {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                        <button
                                            key={filter}
                                            className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all"
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>
                            }
                        >
                            <ResponsiveContainer width="100%" height={280}>
                                <ComposedChart data={REVENUE_TREND_DATA}>
                                    <defs>
                                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                                    <XAxis dataKey="month" {...chartAxisStyle} />
                                    <YAxis tickFormatter={fmtCurrency} {...chartAxisStyle} />
                                    <Tooltip content={<DashTooltip formatter={fmtCurrency} />} />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#revenueGrad)" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* Project Portfolio */}
                        <ChartCard 
                            title="Project Portfolio" 
                            subtitle="Current project distribution"
                            headerRight={
                                <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                                    {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                        <button
                                            key={filter}
                                            className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all"
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>
                            }
                        >
                            <div className="flex items-center gap-6">
                                <ResponsiveContainer width={180} height={180}>
                                    <PieChart>
                                        <Pie
                                            data={PROJECT_STATUS_DATA}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            innerRadius={45}
                                            dataKey="value"
                                            paddingAngle={2}
                                        >
                                            {PROJECT_STATUS_DATA.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<DashTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>

                                <div className="flex-1 space-y-2">
                                    {PROJECT_STATUS_DATA.map(item => (
                                        <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-xs font-medium text-[var(--text-secondary)]">{item.name}</span>
                                            </div>
                                            <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ChartCard>
                    </div>

                    {/* Department Performance */}
                    <ChartCard 
                        title="Department Performance" 
                        subtitle="Efficiency and achievement metrics"
                        headerRight={
                            <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                                {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                                    <button
                                        key={filter}
                                        className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all"
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        }
                    >
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={DEPARTMENT_PERFORMANCE}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                                <XAxis dataKey="department" {...chartAxisStyle} />
                                <YAxis {...chartAxisStyle} />
                                <Tooltip content={<DashTooltip />} />
                                <Bar dataKey="target" name="Target" fill="#e2e8f0" />
                                <Bar dataKey="actual" name="Achievement" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* a"  a"   All Roles Overview Section a"  a"   */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                                    <Users size={20} className="text-[var(--primary)]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-[var(--text-primary)]">All Roles Overview</h2>
                                    <p className="text-sm text-[var(--text-muted)]">
                                        Complete visibility across all {ALL_ROLES_DATA.length} departments
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-2xl font-black text-[var(--text-primary)]">
                                        {ALL_ROLES_DATA.reduce((acc, r) => acc + r.users, 0)}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">Total Active Users</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-amber-500">
                                        {ALL_ROLES_DATA.reduce((acc, r) => acc + r.alerts, 0)}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">Total Alerts</p>
                                </div>
                            </div>
                        </div>

                        {/* Role Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {ALL_ROLES_DATA.map(role => (
                                <RoleCard
                                    key={role.id}
                                    role={role}
                                    onClick={() => console.log(`Navigate to ${role.name}`)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Real-time Alerts & Reminders */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <ChartCard title="System Alerts" subtitle="Real-time notifications">
                                <div className="space-y-2">
                                    {REAL_TIME_ALERTS.map(alert => (
                                        <div
                                            key={alert.id}
                                            className={`flex items-start gap-3 p-3 rounded-lg border ${alert.type === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/30' :
                                                alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800/30' :
                                                    alert.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30' :
                                                        'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/30'
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full mt-1 ${alert.type === 'critical' ? 'bg-red-500 animate-pulse' :
                                                alert.type === 'warning' ? 'bg-yellow-500' :
                                                    alert.type === 'success' ? 'bg-green-500' :
                                                        'bg-blue-500'
                                                }`} />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${alert.type === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-200' :
                                                        alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-200' :
                                                            alert.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-200' :
                                                                'bg-blue-100 text-blue-800 dark:bg-blue-800/50 dark:text-blue-200'
                                                        }`}>
                                                        {alert.role}
                                                    </span>
                                                    <span className="text-xs text-[var(--text-muted)]">{alert.time}</span>
                                                </div>
                                                <p className="text-sm text-[var(--text-primary)]">{alert.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ChartCard>
                        </div>

                        <div>
                            <ReminderWidget onNavigateToReminders={() => onNavigate?.('reminders')} />
                        </div>
                    </div>
                </div>
            )}

            {/* a"  a"   Kanban View a"  a"   */}
            {view === 'kanban' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Approval Workflow</h3>
                            <p className="text-sm text-[var(--text-muted)]">{adminItems.length} total items requiring action</p>
                        </div>
                        <button className="px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                            <Plus size={14} className="inline mr-1" /> New Request
                        </button>
                    </div>

                    <AdminKanbanBoard
                        items={adminItems}
                        onStageChange={handleStageChange}
                        onCardClick={setSelectedItem}
                    />
                </div>
            )}

            {/* a"  a"   Analytics View a"  a"   */}
            {view === 'analytics' && (
                <div className="space-y-6">
                    <ChartCard title="Advanced Analytics" subtitle="Comprehensive system insights">
                        <div className="text-center py-12">
                            <BarChart3 size={48} className="text-[var(--text-muted)] mx-auto mb-4" />
                            <p className="text-sm text-[var(--text-muted)]">
                                Advanced analytics dashboard coming soon
                            </p>
                        </div>
                    </ChartCard>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;

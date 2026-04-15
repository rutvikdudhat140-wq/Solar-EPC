// RoleDashboardProvider.js   Central data provider for role-based dashboards
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const RoleDashboardContext = createContext();

export const useRoleDashboard = () => {
    const context = useContext(RoleDashboardContext);
    if (!context) {
        throw new Error('useRoleDashboard must be used within a RoleDashboardProvider');
    }
    return context;
};

//     Mock data generators                                                       

const generateSalesData = () => ({
    leads: {
        total: 248, new: 32, converted: 18, lost: 12,
        conversionRate: 24.5, trend: '+12%'
    },
    pipeline: [
        { stage: 'Cold Lead', count: 45, value: 18500000 },
        { stage: 'Warm Lead', count: 32, value: 14200000 },
        { stage: 'Proposal Sent', count: 28, value: 12800000 },
        { stage: 'Negotiation', count: 18, value: 8900000 },
        { stage: 'Won', count: 12, value: 6200000 },
    ],
    quotations: {
        pending: 24, approved: 18, rejected: 6, totalValue: 45200000
    },
    revenue: {
        monthly: [
            { month: 'Jan', target: 5000000, actual: 4200000 },
            { month: 'Feb', target: 5500000, actual: 5800000 },
            { month: 'Mar', target: 6000000, actual: 5200000 },
            { month: 'Apr', target: 6500000, actual: 6800000 },
            { month: 'May', target: 7000000, actual: 7200000 },
            { month: 'Jun', target: 7500000, actual: 6900000 },
        ],
        forecast: 48000000,
        ytd: 35200000,
    },
});

const generateSurveyData = () => ({
    surveys: {
        assigned: 28, completed: 18, inProgress: 7, pending: 3, completionRate: 78.6
    },
    feasibility: {
        reports: [
            { site: 'Residential Complex A', status: 'Completed', feasibility: 92 },
            { site: 'Commercial Building B', status: 'In Progress', feasibility: null },
            { site: 'Industrial Unit C', status: 'Completed', feasibility: 85 },
            { site: 'Warehouse D', status: 'Pending Review', feasibility: 88 },
        ],
    },
    shadowAnalysis: {
        completed: 15, optimal: 12, moderate: 2, poor: 1, avgShading: 8.5
    },
    locations: [
        { id: 1, name: 'Site A', lat: 21.1702, lng: 72.8311, status: 'completed' },
        { id: 2, name: 'Site B', lat: 21.1942, lng: 72.7933, status: 'in-progress' },
        { id: 3, name: 'Site C', lat: 21.2103, lng: 72.8397, status: 'pending' },
    ],
});

const generateDesignData = () => ({
    designs: {
        total: 42, inProgress: 12, completed: 25, approved: 18, revision: 7
    },
    boq: {
        generated: 28, pending: 8, approved: 20, avgValue: 850000
    },
    cadApproval: {
        submitted: 22, approved: 16, rejected: 3, pending: 3, approvalRate: 84.2
    },
    performance: {
        avgDesignTime: 4.2, revisionRate: 16.7, clientSatisfaction: 4.6,
        monthly: [
            { month: 'Jan', efficiency: 82, designTime: 5.1, revisions: 3 },
            { month: 'Feb', efficiency: 85, designTime: 4.8, revisions: 2 },
            { month: 'Mar', efficiency: 88, designTime: 4.5, revisions: 2 },
            { month: 'Apr', efficiency: 86, designTime: 4.7, revisions: 3 },
            { month: 'May', efficiency: 90, designTime: 4.2, revisions: 1 },
            { month: 'Jun', efficiency: 92, designTime: 4.0, revisions: 1 },
        ],
    },
    systemTypes: [
        { type: 'Residential', count: 28, capacity: 168 },
        { type: 'Commercial', count: 12, capacity: 240 },
        { type: 'Industrial', count: 2, capacity: 500 },
    ],
});

const generateProjectData = () => ({
    projects: {
        total: 35, active: 18, completed: 12, delayed: 3, onHold: 2,
        onTime: 15, onTimeRate: 85.7
    },
    milestones: {
        planning: { completed: 28, total: 35 },
        design: { completed: 24, total: 35 },
        procurement: { completed: 20, total: 35 },
        installation: { completed: 15, total: 35 },
        testing: { completed: 12, total: 35 },
    },
    installation: {
        scheduled: 8, inProgress: 5, completed: 3,
        avgDuration: 12.5, overallProgress: 68.2,
        phases: [
            { name: 'Planning', progress: 85 },
            { name: 'Foundation', progress: 92 },
            { name: 'Mounting', progress: 78 },
            { name: 'Electrical', progress: 45 },
            { name: 'Testing', progress: 25 },
        ],
    },
    commissioning: {
        pending: 6, inProgress: 4, completed: 8, successRate: 94.4
    },
    timeline: [
        { month: 'Jan', planned: 4, actual: 3, forecast: 3 },
        { month: 'Feb', planned: 6, actual: 5, forecast: 5 },
        { month: 'Mar', planned: 5, actual: 4, forecast: 4 },
        { month: 'Apr', planned: 7, actual: 6, forecast: 6 },
        { month: 'May', planned: 8, actual: 7, forecast: 7 },
        { month: 'Jun', planned: 6, actual: 5, forecast: 6 },
    ],
});

const generateStoreData = () => ({
    inventory: {
        totalItems: 1245, lowStock: 28, outOfStock: 5, totalValue: 25800000
    },
    stockAlerts: [
        { item: 'Solar Panels 400W', current: 12, minimum: 20, status: 'low' },
        { item: 'Inverters 5kW', current: 0, minimum: 5, status: 'out' },
        { item: 'DC Cables (roll)', current: 145, minimum: 100, status: 'ok' },
        { item: 'Mounting Structures', current: 8, minimum: 15, status: 'low' },
    ],
    activity: [
        { type: 'Inbound', item: 'Solar Panels', quantity: 200, date: '2024-01-20' },
        { type: 'Outbound', item: 'Inverters', quantity: 15, date: '2024-01-19' },
        { type: 'Transfer', item: 'Cables', quantity: 500, date: '2024-01-18' },
    ],
    usage: {
        monthly: [
            { month: 'Jan', inbound: 2500000, outbound: 1800000 },
            { month: 'Feb', inbound: 3200000, outbound: 2100000 },
            { month: 'Mar', inbound: 2800000, outbound: 2400000 },
            { month: 'Apr', inbound: 3500000, outbound: 2800000 },
            { month: 'May', inbound: 4100000, outbound: 3200000 },
            { month: 'Jun', inbound: 3800000, outbound: 3500000 },
        ],
        topItems: [
            { item: 'Solar Panels', usage: 45, trend: '+8%' },
            { item: 'Inverters', usage: 32, trend: '+12%' },
            { item: 'Cables', usage: 28, trend: '-3%' },
        ],
    },
});

const generateProcurementData = () => ({
    purchaseOrders: {
        total: 85, pending: 12, approved: 68, delivered: 58, totalValue: 45600000
    },
    vendors: [
        { name: 'SolarTech Ltd', rating: 4.8, orders: 28, onTime: 96 },
        { name: 'GreenEnergy Corp', rating: 4.5, orders: 22, onTime: 91 },
        { name: 'PowerSolutions', rating: 4.2, orders: 18, onTime: 88 },
        { name: 'SunPanel Inc', rating: 4.6, orders: 15, onTime: 93 },
        { name: 'ElectroCables', rating: 4.0, orders: 12, onTime: 85 },
    ],
    logistics: {
        inTransit: 15, delivered: 42, delayed: 3, avgDeliveryTime: 5.2
    },
    costAnalysis: {
        budgetVariance: -2.4, savingsAchieved: 1200000, negotiationSuccess: 87.5,
        categories: [
            { category: 'Solar Panels', budget: 15000000, actual: 14200000 },
            { category: 'Inverters', budget: 8000000, actual: 8400000 },
            { category: 'Structure', budget: 5000000, actual: 4800000 },
        ],
        monthly: [
            { month: 'Jan', budget: 8000000, actual: 7500000 },
            { month: 'Feb', budget: 9000000, actual: 8800000 },
            { month: 'Mar', budget: 7500000, actual: 7200000 },
            { month: 'Apr', budget: 10000000, actual: 9800000 },
            { month: 'May', budget: 11000000, actual: 10500000 },
            { month: 'Jun', budget: 9500000, actual: 9000000 },
        ],
    },
});

const generateFinanceData = () => ({
    invoices: {
        total: 156, paid: 124, pending: 28, overdue: 4, totalValue: 89400000
    },
    cashFlow: {
        monthly: [
            { month: 'Jan', inflow: 8500000, outflow: 6200000, net: 2300000 },
            { month: 'Feb', inflow: 9200000, outflow: 7100000, net: 2100000 },
            { month: 'Mar', inflow: 7800000, outflow: 6800000, net: 1000000 },
            { month: 'Apr', inflow: 10500000, outflow: 8200000, net: 2300000 },
            { month: 'May', inflow: 11200000, outflow: 8900000, net: 2300000 },
            { month: 'Jun', inflow: 9800000, outflow: 7600000, net: 2200000 },
        ],
        projected: 18500000,
        actual: 16800000,
    },
    payables: {
        current: 12400000, overdue: 2100000, upcoming: 8700000
    },
    receivables: {
        current: 15600000, overdue: 4200000, collections: 89.5
    },
    compliance: {
        gstReturns: { filed: 11, pending: 1 },
        tdsReturns: { filed: 4, pending: 0 },
        auditStatus: 'Completed',
    },
});

const generateTechnicianData = () => ({
    tasks: {
        assigned: 18, completed: 12, inProgress: 4, pending: 2, completionRate: 85.7
    },
    fieldWork: [
        { site: 'Residential A', task: 'Installation', progress: 75, dueDate: '2024-01-25' },
        { site: 'Commercial B', task: 'Maintenance', progress: 100, dueDate: '2024-01-20' },
        { site: 'Industrial C', task: 'Commissioning', progress: 45, dueDate: '2024-01-30' },
    ],
    checklists: {
        installation: { completed: 8, total: 10 },
        safety: { completed: 10, total: 10 },
        testing: { completed: 6, total: 8 },
    },
    serviceLogs: [
        { date: '2024-01-20', site: 'Site A', issue: 'Inverter fault', status: 'Resolved' },
        { date: '2024-01-19', site: 'Site B', issue: 'Panel cleaning', status: 'Completed' },
        { date: '2024-01-18', site: 'Site C', issue: 'Wiring check', status: 'Resolved' },
    ],
});

const generateServiceData = () => ({
    amcContracts: {
        active: 145, expiring: 12, renewals: 28, totalValue: 8500000
    },
    tickets: {
        open: 24, resolved: 156, inProgress: 8, avgResolutionTime: 2.4, satisfaction: 4.5
    },
    performance: {
        uptime: 98.5, responseTime: 1.2, firstCallResolution: 78.5, repeatIssues: 5.2
    },
    commissioning: [
        { project: 'Mall Solar', status: 'Completed', date: '2024-01-15', capacity: '500kW' },
        { project: 'Factory Unit', status: 'In Progress', date: '2024-01-22', capacity: '1MW' },
        { project: 'School Block', status: 'Completed', date: '2024-01-10', capacity: '100kW' },
    ],
});

//     Provider                                                                   

export const RoleDashboardProvider = ({ children, overrideRole }) => {
    const auth = useAuth();
    const user = auth?.user;
    const activeRole = overrideRole || user?.role;

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!activeRole) {
            setLoading(false);
            return;
        }
        setLoading(true);
        let data = {};
        const role = activeRole.toLowerCase();
        
        // Handle custom roles - they start with 'custom_'
        // Map them to appropriate dashboard based on their baseRole or default to Sales
        if (role.startsWith('custom_')) {
            // Custom roles default to SalesDashboard for now
            // In future, could check custom role permissions to determine best dashboard
            data = generateSalesData();
        } else {
            switch (role) {
                case 'sales': data = generateSalesData(); break;
                case 'survey engineer': data = generateSurveyData(); break;
                case 'design engineer': data = generateDesignData(); break;
                case 'project manager': data = generateProjectData(); break;
                case 'store manager': data = generateStoreData(); break;
                case 'procurement officer': data = generateProcurementData(); break;
                case 'finance': data = generateFinanceData(); break;
                case 'technician': data = generateTechnicianData(); break;
                case 'service manager': data = generateServiceData(); break;
                case 'admin': data = generateSalesData(); break;
                default: data = generateSalesData();
            }
        }
        setDashboardData(data);
        setLoading(false);
    }, [activeRole]);

    return (
        <RoleDashboardContext.Provider value={{
            data: dashboardData,
            loading,
            role: activeRole,
            refreshData: () => { setLoading(true); setTimeout(() => setLoading(false), 800); },
        }}>
            {children}
        </RoleDashboardContext.Provider>
    );
};

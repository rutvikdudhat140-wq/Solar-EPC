/**
 * Solar OS — Feature Flag & Module Config
 * Single source of truth for ALL modules, sub-features, and actions.
 * Every key maps to a flag that can be toggled from SettingsPage.
 */

// ─── MODULE DEFINITIONS ──────────────────────────────────────────────────────
// Each module has: enabled, label, icon name, description, features{}, actions{}
export const MODULE_DEFS = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        description: 'Central overview of KPIs, alerts, and activity.',
        group: 'OVERVIEW',
        features: {
            kpi_cards: { label: 'KPI Cards', description: 'Summary metric cards at top.' },
            activity_feed: { label: 'Activity Feed', description: 'Live activity stream on dashboard.' },
            alerts_widget: { label: 'Smart Alerts', description: 'SLA & critical alert panel.' },
        },
        actions: { view: true, export: false, create: false, edit: false, delete: false, approve: false, assign: false },
    },
    {
        id: 'crm',
        label: 'CRM & Sales',
        icon: 'Users',
        description: 'Lead capture, scoring, pipeline management.',
        group: 'PIPELINE',
        features: {
            ai_scoring: { label: 'AI Lead Scoring', description: 'ML-based score 0–100 for each lead.' },
            kanban_view: { label: 'Kanban View', description: 'Drag-and-drop pipeline board.' },
            table_view: { label: 'Table View', description: 'Paginated sortable lead table.' },
            analytics_view: { label: 'Analytics View', description: 'Funnel chart and source analytics.' },
            sla_timers: { label: 'SLA Timers', description: 'Breach alerts on overdue leads.' },
            map_view: { label: 'Map View', description: 'Geo-plot leads on India map.' },
            bulk_actions: { label: 'Bulk Actions', description: 'Select multiple leads for batch ops.' },
            import_csv: { label: 'CSV Import', description: 'Drag-and-drop CSV lead import.' },
        },
        actions: { view: true, create: true, edit: true, delete: true, export: true, approve: false, assign: true },
    },
    {
        id: 'survey',
        label: 'Survey',
        icon: 'MapPin',
        description: 'Site survey scheduling and data collection.',
        group: 'PIPELINE',
        features: {
            checklist: { label: 'Survey Checklist', description: 'Field engineer checklist form.' },
            photo_upload: { label: 'Photo Upload', description: 'Attach site photos to survey.' },
            geo_tagging: { label: 'Geo Tagging', description: 'GPS coordinates on submission.' },
        },
        actions: { view: true, create: true, edit: true, delete: false, export: true, approve: true, assign: true },
    },
    {
        id: 'design',
        label: 'Design & BOQ',
        icon: 'Pencil',
        description: 'System design, single-line diagrams, Bill of Quantities.',
        group: 'PIPELINE',
        features: {
            boq_generator: { label: 'BOQ Generator', description: 'Auto-generate Bill of Quantities.' },
            sld_viewer: { label: 'SLD Viewer', description: 'Single Line Diagram viewer/editor.' },
            version_control: { label: 'Design Versioning', description: 'Track design revision history.' },
        },
        actions: { view: true, create: true, edit: true, delete: false, export: true, approve: true, assign: false },
    },
    {
        id: 'quotation',
        label: 'Quotation',
        icon: 'FileText',
        description: 'Proposals, pricing engine, approval flow.',
        group: 'PIPELINE',
        features: {
            pricing_engine: { label: 'Pricing Engine', description: 'Dynamic kW-rate based pricing.' },
            pdf_export: { label: 'PDF Export', description: 'Generate branded proposal PDFs.' },
            multi_currency: { label: 'Multi-Currency', description: 'Support INR / USD quotes.' },
            e_signature: { label: 'E-Signature', description: 'Digital sign-off on proposals.' },
        },
        actions: { view: true, create: true, edit: true, delete: true, export: true, approve: true, assign: false },
    },
    {
        id: 'project',
        label: 'Projects',
        icon: 'FolderOpen',
        description: 'Project timeline, milestones, and team management.',
        group: 'PIPELINE',
        features: {
            gantt_chart: { label: 'Gantt Chart', description: 'Visual timeline of milestones.' },
            risk_register: { label: 'Risk Register', description: 'Track and mitigate project risks.' },
            wbs: { label: 'Work Breakdown', description: 'WBS task decomposition.' },
        },
        actions: { view: true, create: true, edit: true, delete: false, export: true, approve: true, assign: true },
    },
    {
        id: 'inventory',
        label: 'Inventory',
        icon: 'Package',
        description: 'Stock levels, warehousing, and reorder management.',
        group: 'OPERATIONS',
        features: {
            low_stock_alerts: { label: 'Low Stock Alerts', description: 'Alert when stock ≤ minimum.' },
            batch_tracking: { label: 'Batch Tracking', description: 'Track inventory by batch/serial.' },
            qr_scanner: { label: 'QR/Barcode Scan', description: 'Mobile QR scan for stock ops.' },
        },
        actions: { view: true, create: true, edit: true, delete: false, export: true, approve: false, assign: false },
    },
    {
        id: 'procurement',
        label: 'Procurement',
        icon: 'ShoppingCart',
        description: 'Purchase orders, vendor management, approvals.',
        group: 'OPERATIONS',
        features: {
            vendor_portal: { label: 'Vendor Portal', description: 'Self-service portal for vendors.' },
            po_approval: { label: 'PO Approval Flow', description: 'Multi-level purchase order approvals.' },
            rate_comparison: { label: 'Rate Comparison', description: 'Compare vendor quotes side-by-side.' },
        },
        actions: { view: true, create: true, edit: true, delete: false, export: true, approve: true, assign: false },
    },
    {
        id: 'logistics',
        label: 'Logistics',
        icon: 'Truck',
        description: 'Dispatch, delivery tracking, and vehicle assignment.',
        group: 'OPERATIONS',
        features: {
            live_tracking: { label: 'Live GPS Tracking', description: 'Real-time vehicle location.' },
            route_optimizer: { label: 'Route Optimizer', description: 'AI-optimized delivery routes.' },
        },
        actions: { view: true, create: true, edit: true, delete: false, export: true, approve: false, assign: true },
    },
    {
        id: 'installation',
        label: 'Installation',
        icon: 'Wrench',
        description: 'Field installation tasks, checklist, and sign-offs.',
        group: 'FIELD',
        features: {
            task_checklist: { label: 'Task Checklist', description: 'Step-by-step install checklist.' },
            photo_evidence: { label: 'Photo Evidence', description: 'Capture before/after photos.' },
            site_handover: { label: 'Site Handover', description: 'Digital handover certificate.' },
        },
        actions: { view: true, create: false, edit: true, delete: false, export: true, approve: true, assign: true },
    },
    {
        id: 'commissioning',
        label: 'Commissioning',
        icon: 'CheckCircle',
        description: 'System testing, commissioning reports, DISCOM filing.',
        group: 'FIELD',
        features: {
            test_protocols: { label: 'Test Protocols', description: 'Standard commissioning tests.' },
            discom_filing: { label: 'DISCOM e-Filing', description: 'Online net-meter application.' },
        },
        actions: { view: true, create: false, edit: true, delete: false, export: true, approve: true, assign: false },
    },
    {
        id: 'finance',
        label: 'Finance',
        icon: 'DollarSign',
        description: 'Invoicing, payment tracking, P&L, and reporting.',
        group: 'FINANCE',
        features: {
            invoice_gen: { label: 'Invoice Generator', description: 'Auto-generate GST invoices.' },
            payment_gateway: { label: 'Payment Gateway', description: 'Online payment link integration.' },
            pl_reports: { label: 'P&L Reports', description: 'Profit & Loss analytics.' },
            tds_gst: { label: 'TDS / GST Engine', description: 'Automated tax computation.' },
        },
        actions: { view: true, create: true, edit: true, delete: false, export: true, approve: true, assign: false },
    },
    {
        id: 'service',
        label: 'Service & AMC',
        icon: 'Headphones',
        description: 'Ticket management, AMC contracts, field service.',
        group: 'POST SALE',
        features: {
            ticket_system: { label: 'Ticket System', description: 'Customer support ticket queue.' },
            amc_contracts: { label: 'AMC Contracts', description: 'Annual maintenance contract tracking.' },
            sla_tracking: { label: 'SLA Tracking', description: 'Response time SLA monitoring.' },
            remote_monitor: { label: 'Remote Monitoring', description: 'Live plant performance data.' },
        },
        actions: { view: true, create: true, edit: true, delete: false, export: true, approve: false, assign: true },
    },
    {
        id: 'compliance',
        label: 'Compliance',
        icon: 'FileCheck',
        description: 'Regulatory filings, certificates, net-meter tracking.',
        group: 'POST SALE',
        features: {
            document_vault: { label: 'Document Vault', description: 'Secure compliance document store.' },
            renewal_alerts: { label: 'Renewal Alerts', description: 'Certificate expiry reminders.' },
        },
        actions: { view: true, create: true, edit: true, delete: false, export: true, approve: true, assign: false },
    },
    {
        id: 'hrm',
        label: 'HRM',
        icon: 'Briefcase',
        description: 'Human Resource Management - Employees, Attendance, Leave, Payroll.',
        group: 'OVERVIEW',
        features: {
            employee_management: { label: 'Employee Management', description: 'Employee profiles and records.' },
            attendance_system: { label: 'Attendance System', description: 'Check-in/out and attendance tracking.' },
            leave_management: { label: 'Leave Management', description: 'Leave requests and approvals.' },
            payroll_system: { label: 'Payroll System', description: 'Salary generation and payslips.' },
            salary_increments: { label: 'Salary Increments', description: 'Increment history and management.' },
        },
        actions: { view: true, create: true, edit: true, delete: true, export: true, approve: true, assign: true },
    },
    {
        id: 'tasks',
        label: 'Tasks',
        icon: 'CheckSquare',
        description: 'Task management, assignments and tracking.',
        group: 'OVERVIEW',
        features: {
            task_board: { label: 'Task Board', description: 'Kanban view of all tasks.' },
            task_assignment: { label: 'Task Assignment', description: 'Assign tasks to team members.' },
            task_tracking: { label: 'Task Tracking', description: 'Track task progress and status.' },
        },
        actions: { view: true, create: true, edit: true, delete: true, export: true, approve: false, assign: true },
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: 'Settings',
        description: 'Feature flags, RBAC, workflow rules, audit logs.',
        group: 'SYSTEM',
        features: {
            feature_flags: { label: 'Feature Flag Panel', description: 'Toggle all features on/off.' },
            rbac_matrix: { label: 'RBAC Matrix', description: 'Role-permission cross-matrix.' },
            workflow_rules: { label: 'Workflow Rules', description: 'Conditional automation rules.' },
            audit_logs: { label: 'Audit Logs', description: 'Change history with rollback.' },
            ai_suggestions: { label: 'AI Suggestions', description: 'Recommend permission optimizations.' },
        },
        actions: { view: true, create: true, edit: true, delete: true, export: true, approve: false, assign: false },
    },
];

// ─── ACTION DEFINITIONS ────────────────────────────────────────────────────────
export const ACTION_DEFS = [
    { id: 'view', label: 'View', icon: 'Eye', description: 'Read access to module data.' },
    { id: 'create', label: 'Create', icon: 'Plus', description: 'Add new records.' },
    { id: 'edit', label: 'Edit', icon: 'Edit2', description: 'Modify existing records.' },
    { id: 'delete', label: 'Delete', icon: 'Trash2', description: 'Remove records permanently.' },
    { id: 'export', label: 'Export', icon: 'Download', description: 'Export data to CSV/PDF.' },
    { id: 'approve', label: 'Approve', icon: 'CheckCircle', description: 'Approve pending items.' },
    { id: 'assign', label: 'Assign', icon: 'UserCheck', description: 'Assign records to users.' },
];

// ─── ROLE DEFINITIONS ──────────────────────────────────────────────────────────
export const ROLE_DEFS = [
    { id: 'Admin', label: 'Admin', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', description: 'Full system access.' },
    { id: 'Sales', label: 'Sales Rep', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', description: 'CRM and quotation access.' },
    { id: 'Survey Engineer', label: 'Survey Engineer', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', description: 'Survey and site ops.' },
    { id: 'Design Engineer', label: 'Design Engineer', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', description: 'Design and BOQ tools.' },
    { id: 'Project Manager', label: 'Project Manager', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', description: 'Full project ops.' },
    { id: 'Store Manager', label: 'Store Manager', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', description: 'Inventory and logistics.' },
    { id: 'Procurement Officer', label: 'Procurement', color: '#f97316', bg: 'rgba(249,115,22,0.12)', description: 'Vendor and purchase management.' },
    { id: 'Finance', label: 'Finance', color: '#84cc16', bg: 'rgba(132,204,22,0.12)', description: 'Finance and compliance.' },
    { id: 'Technician', label: 'Technician', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', description: 'Field execution only.' },
    { id: 'Service Manager', label: 'Service Manager', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', description: 'Post-sale service management.' },
];

// ─── DEFAULT FEATURE FLAGS STATE ──────────────────────────────────────────────
// Builds initial state: { [moduleId]: { enabled, features: { [featId]: bool }, actions: { [actionId]: bool } } }
export function buildDefaultFlags() {
    const flags = {};
    MODULE_DEFS.forEach(mod => {
        flags[mod.id] = {
            enabled: true,
            features: Object.fromEntries(Object.keys(mod.features).map(k => [k, true])),
            actions: { ...mod.actions },
        };
    });
    return flags;
}

// ─── DEFAULT RBAC STATE ────────────────────────────────────────────────────────
// Builds { [roleId]: { [moduleId]: { view, create, edit, delete, export, approve, assign } } }
export function buildDefaultRBAC() {
    const rbac = {};
    ROLE_DEFS.forEach(role => {
        rbac[role.id] = {};
        MODULE_DEFS.forEach(mod => {
            rbac[role.id][mod.id] = {
                view: false,
                create: false,
                edit: false,
                delete: false,
                export: false,
                approve: false,
                assign: false,
            };
        });
    });
    return rbac;
}

// ─── DEFAULT WORKFLOW RULES ────────────────────────────────────────────────────
export const DEFAULT_WORKFLOW_RULES = [
    {
        id: 'wf001',
        enabled: true,
        label: 'Qualified → Enable Quotation',
        description: 'When a lead reaches Qualified stage, enable quotation creation.',
        condition: { field: 'lead_stage', operator: '=', value: 'qualified' },
        action: { type: 'enable_feature', target: 'quotation' },
        createdBy: 'Admin User',
        createdAt: '2026-02-01',
    },
    {
        id: 'wf002',
        enabled: true,
        label: 'Won Lead → Trigger Project',
        description: 'When lead marked Won, auto-create project record.',
        condition: { field: 'lead_stage', operator: '=', value: 'won' },
        action: { type: 'create_record', target: 'project' },
        createdBy: 'Admin User',
        createdAt: '2026-02-01',
    },
    {
        id: 'wf003',
        enabled: false,
        label: 'Invoice Approved → Release Inventory',
        description: 'On finance approval, release reserved inventory for project.',
        condition: { field: 'invoice_status', operator: '=', value: 'approved' },
        action: { type: 'enable_feature', target: 'inventory.release' },
        createdBy: 'Admin User',
        createdAt: '2026-02-10',
    },
    {
        id: 'wf004',
        enabled: true,
        label: 'Low Stock → Block Dispatch',
        description: 'When inventory < minimum, disable logistics dispatch.',
        condition: { field: 'inventory_level', operator: '<', value: 'min_stock' },
        action: { type: 'disable_feature', target: 'logistics.dispatch' },
        createdBy: 'Admin User',
        createdAt: '2026-02-12',
    },
];

// ─── AUDIT LOG SEED ────────────────────────────────────────────────────────────
export const DEFAULT_AUDIT_LOGS = [
    { id: 'a001', ts: '2026-02-27 09:15', user: 'Admin User', action: 'TOGGLE_MODULE', target: 'map_view (CRM)', from: 'enabled', to: 'disabled', ip: '192.168.1.10' },
    { id: 'a002', ts: '2026-02-26 14:32', user: 'Admin User', action: 'RBAC_EDIT', target: 'Sales → quotation.delete', from: 'true', to: 'false', ip: '192.168.1.10' },
    { id: 'a003', ts: '2026-02-25 11:00', user: 'Admin User', action: 'WORKFLOW_CREATED', target: 'wf003 – Invoice Approved', from: 'null', to: 'created', ip: '192.168.1.10' },
    { id: 'a004', ts: '2026-02-24 16:45', user: 'Admin User', action: 'TOGGLE_MODULE', target: 'logistics (entire module)', from: 'disabled', to: 'enabled', ip: '192.168.1.10' },
    { id: 'a005', ts: '2026-02-23 10:20', user: 'Admin User', action: 'RBAC_EDIT', target: 'Finance → compliance.view', from: 'false', to: 'true', ip: '192.168.1.10' },
];

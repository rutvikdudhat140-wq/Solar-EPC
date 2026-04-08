// Professional Solar EPC Estimate Module - Upgraded Version
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, FileText, Send, DollarSign, Download, Copy, Trash2, Search,
  User, Building2, MapPin, Sun, Zap,
  Edit, CheckCircle, XCircle, Clock,
  Calculator, LayoutGrid, List, Kanban,
  ChevronLeft, Save, Printer, Check, ArrowRight, MoreVertical, Mail, FileCheck,
  Package, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import DataTable from '../components/ui/DataTable';
import { CURRENCY } from '../config/app.config';
import { cn } from '../lib/utils';
import { EquipmentLibrary } from '../components/estimates/EquipmentLibrary';
import { CompanyHeader, DocumentHeader } from '../components/documents/CompanyHeader';
import { downloadEstimatePDF, downloadProposalPDF } from '../lib/pdfGenerator';
import { settingsApi } from '../services/settingsApi';
import { toast } from '../components/ui/Toast';
import api from '../lib/apiClient';

import { documentsApi } from '../services/documentsApi';
import { inventoryApi } from '../services/inventoryApi';

const fmt = CURRENCY.format;

// ── Estimate Status Configurations ────────────────────────────────────────────
const ESTIMATE_STATUS = {
  draft: { label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: Clock },
  sent: { label: 'Sent', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: Send },
  accepted: { label: 'Accepted', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle },
};

const projectTypeOptions = [
  { value: 'residential', label: 'Residential', icon: User },
  { value: 'commercial', label: 'Commercial', icon: Building2 },
  { value: 'industrial', label: 'Industrial', icon: Zap },
];

const installationTypeOptions = [
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'ground_mounted', label: 'Ground Mounted' },
];

const DEFAULT_PROJECT_TYPES = projectTypeOptions;
const DEFAULT_INSTALLATION_TYPES = installationTypeOptions;

// ── Generate Estimate Number ───────────────────────────────────────────────────
const generateEstimateNumber = (existingEstimates = []) => {
  const year = new Date().getFullYear();
  const prefix = `EST-${year}`;

  // Find existing numbers for this year
  const existingNumbers = existingEstimates
    .map(e => e.estimateNumber)
    .filter(n => n?.startsWith(prefix))
    .map(n => {
      const match = n.match(/-(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });

  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNumber = String(maxNumber + 1).padStart(4, '0');

  return `${prefix}-${nextNumber}`;
};

// ── Solar Equipment Categories ─────────────────────────────────────────────────
const EQUIPMENT_CATEGORIES = [
  { value: 'solar_panel', label: 'Solar Panel' },
  { value: 'inverter', label: 'Inverter' },
  { value: 'structure', label: 'Mounting Structure' },
  { value: 'cable_dc', label: 'DC Cable' },
  { value: 'cable_ac', label: 'AC Cable' },
  { value: 'earthing', label: 'Earthing Kit' },
  { value: 'lightning', label: 'Lightning Arrestor' },
  { value: 'battery', label: 'Battery Storage' },
  { value: 'meter', label: 'Energy Meter' },
  { value: 'labor', label: 'Installation Labour' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'misc', label: 'Miscellaneous' },
];

// ── Mock Estimates Data ────────────────────────────────────────────────────────
const MOCK_ESTIMATES = [
  {
    id: 'EST-001',
    estimateNumber: 'EST-2026-0001',
    customerName: 'ABC Corporation',
    companyName: 'ABC Corp Ltd',
    customerEmail: 'contact@abccorp.com',
    customerPhone: '+91 9876543210',
    customerAddress: '123 Business Park, Mumbai',
    projectLocation: 'Mumbai, Maharashtra',
    projectName: '5kW Rooftop Solar Installation',
    systemCapacity: 5,
    projectType: 'commercial',
    installationType: 'rooftop',
    projectDescription: 'Grid-tied solar system for office building',
    items: [
      { name: 'Solar Panel 550W', description: 'High efficiency monocrystalline', category: 'solar_panel', brand: 'Waaree', model: 'WS-550', quantity: 10, unitPrice: 15000, total: 150000 },
      { name: 'String Inverter 5kW', description: '3-phase grid-tied inverter', category: 'inverter', brand: 'Growatt', model: 'MAX 50KTL3 LV', quantity: 1, unitPrice: 65000, total: 65000 },
      { name: 'Mounting Structure', description: 'Aluminum structure with clamps', category: 'structure', brand: 'Sterling', model: 'SS-RF-01', quantity: 1, unitPrice: 25000, total: 25000 },
      { name: 'DC Cable 4mm', description: 'Solar DC cable 100m', category: 'cable_dc', brand: 'Polycab', model: 'PV-4MM', quantity: 1, unitPrice: 12000, total: 12000 },
      { name: 'AC Cable 6mm', description: 'AC cable 50m', category: 'cable_ac', brand: 'Polycab', model: 'AC-6MM', quantity: 1, unitPrice: 8000, total: 8000 },
      { name: 'Earthing Kit', description: 'Complete earthing system', category: 'earthing', brand: 'Generic', model: 'EARTH-01', quantity: 1, unitPrice: 15000, total: 15000 },
      { name: 'Lightning Arrestor', description: 'Class B surge protection', category: 'lightning', brand: 'Phoenix', model: 'LA-100', quantity: 1, unitPrice: 10000, total: 10000 },
    ],
    equipmentCost: 285000,
    installationCost: 45000,
    engineeringCost: 15000,
    transportationCost: 8000,
    miscellaneousCost: 5000,
    subtotal: 358000,
    gstRate: 18,
    gstAmount: 64440,
    total: 422440,
    status: 'accepted',
    notes: 'Net metering application to be done by client',
    terms: '50% advance, 50% on completion. 5 year warranty on installation.',
    createdAt: '2026-01-15',
    version: 1,
  },
  {
    id: 'EST-002',
    estimateNumber: 'EST-2026-0002',
    customerName: 'Rajesh Sharma',
    companyName: '',
    customerEmail: 'r.sharma@email.com',
    customerPhone: '+91 9876543212',
    customerAddress: '45 Green Valley, Pune',
    projectLocation: 'Pune, Maharashtra',
    projectName: '3kW Home Solar System',
    systemCapacity: 3,
    projectType: 'residential',
    installationType: 'rooftop',
    projectDescription: 'Residential rooftop solar with battery backup',
    items: [
      { name: 'Solar Panel 440W', description: 'Monocrystalline panels', category: 'solar_panel', brand: 'Adani', model: 'AS-440', quantity: 7, unitPrice: 12000, total: 84000 },
      { name: 'Hybrid Inverter 3kW', description: 'Solar hybrid inverter', category: 'inverter', brand: 'Luminous', model: 'NXT 3KW', quantity: 1, unitPrice: 45000, total: 45000 },
      { name: 'Battery 5kWh', description: 'Lithium battery backup', category: 'battery', brand: 'Exide', model: 'Li-5KWH', quantity: 1, unitPrice: 85000, total: 85000 },
      { name: 'Mounting Structure', description: 'GI structure for RCC roof', category: 'structure', brand: 'Tata', model: 'GI-RCC', quantity: 1, unitPrice: 18000, total: 18000 },
      { name: 'Cables & Accessories', description: 'DC/AC cables, connectors', category: 'accessories', brand: 'Various', model: 'MIX', quantity: 1, unitPrice: 15000, total: 15000 },
    ],
    equipmentCost: 247000,
    installationCost: 28000,
    engineeringCost: 8000,
    transportationCost: 5000,
    miscellaneousCost: 3000,
    subtotal: 291000,
    gstRate: 18,
    gstAmount: 52380,
    total: 343380,
    status: 'sent',
    notes: 'Subsidy application assistance provided',
    terms: '40% advance, 60% on commissioning.',
    createdAt: '2026-02-10',
    version: 1,
  },
  {
    id: 'EST-003',
    estimateNumber: 'EST-2026-0003',
    customerName: 'Metro Industries',
    companyName: 'Metro Industries Pvt Ltd',
    customerEmail: 'projects@metroind.com',
    customerPhone: '+91 9876543215',
    customerAddress: '78 Industrial Area, Ahmedabad',
    projectLocation: 'Ahmedabad, Gujarat',
    projectName: '100kW Industrial Solar Plant',
    systemCapacity: 100,
    projectType: 'industrial',
    installationType: 'ground_mounted',
    projectDescription: 'Ground-mounted solar power plant for factory',
    items: [
      { name: 'Solar Panel 550W', description: 'High wattage panels', category: 'solar_panel', brand: 'Jinko', model: 'JKM550M', quantity: 182, unitPrice: 14000, total: 2548000 },
      { name: 'Central Inverter 100kW', description: 'Industrial inverter', category: 'inverter', brand: 'SMA', model: 'Sunny Central 100', quantity: 1, unitPrice: 450000, total: 450000 },
      { name: 'Ground Mount Structure', description: 'Hot-dip galvanized', category: 'structure', brand: 'Schletter', model: 'FixGrid-G', quantity: 1, unitPrice: 350000, total: 350000 },
      { name: 'HT Cable 35mm', description: 'HT cable 500m', category: 'cable_ac', brand: 'KEI', model: 'HT-35MM', quantity: 1, unitPrice: 85000, total: 85000 },
      { name: 'Transformers', description: 'Step-up transformer', category: 'misc', brand: 'Voltamp', model: 'VTR-500', quantity: 1, unitPrice: 180000, total: 180000 },
      { name: 'SCADA System', description: 'Monitoring system', category: 'accessories', brand: 'Wonderware', model: 'SCADA-PRO', quantity: 1, unitPrice: 120000, total: 120000 },
    ],
    equipmentCost: 3733000,
    installationCost: 280000,
    engineeringCost: 95000,
    transportationCost: 45000,
    miscellaneousCost: 35000,
    subtotal: 4188000,
    gstRate: 18,
    gstAmount: 753840,
    total: 4941840,
    status: 'draft',
    notes: 'Awaiting site survey completion',
    terms: '30% advance, 40% on material delivery, 30% on commissioning',
    createdAt: '2026-03-01'
  }
];

// ── Main Estimate Page Component ──────────────────────────────────────────────
const EstimatePage = () => {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid' | 'kanban'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const res = await documentsApi.getAll();
      const docs = res?.data?.data || res?.data || [];
      console.log('[EstimatePage] Raw documents from API:', docs);
      
      const formatted = docs
        .filter(d => d.type === 'estimate')
        .map(d => ({
          ...d,
          id: d.id || d._id,
          estimateNumber: d.documentId || d.id || d._id,
          projectName: d.title || d.projectName,
          items: d.items || [],
          total: d.total || d.totalValue || 0,
          customerName: d.customerName,
          status: d.status?.toLowerCase() || 'draft',
          createdAt: d.createdAt
        }));
      
      console.log('[EstimatePage] Formatted estimates:', formatted);
      setEstimates(formatted);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast.error('Failed to load estimates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimates();
  }, []);

  // ── Filter Estimates ────────────────────────────────────────────────────────
  const filteredEstimates = useMemo(() => {
    let filtered = estimates;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        (e.estimateNumber && e.estimateNumber.toLowerCase().includes(query)) ||
        (e.customerName && e.customerName.toLowerCase().includes(query)) ||
        (e.projectName && e.projectName.toLowerCase().includes(query)) ||
        (e.projectLocation && e.projectLocation.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    return filtered;
  }, [estimates, searchQuery, statusFilter]);

  // ── Stats Calculations ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = estimates.length;
    const totalValue = estimates.reduce((a, e) => a + (e.total || 0), 0);
    const accepted = estimates.filter(e => e.status === 'accepted').length;
    const pending = estimates.filter(e => e.status === 'sent' || e.status === 'draft').length;

    return { total, totalValue, accepted, pending };
  }, [estimates]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCreateEstimate = async (data) => {
    try {
      // Ensure items have all required fields before saving
      const itemsWithUnit = data.items?.map(item => ({
        ...item,
        unit: item.unit || 'Piece',
        category: item.category || 'misc',
        total: (item.quantity || 0) * (item.unitPrice || 0)
      })) || [];
      
      const payload = {
        ...data,
        items: itemsWithUnit,
        type: 'estimate',
        title: data.projectName,
        status: 'draft'
      };
      
      console.log('[EstimatePage] Creating estimate with payload:', JSON.stringify(payload, null, 2));
      console.log('[EstimatePage] Items being saved:', itemsWithUnit);
      
      const response = await documentsApi.create(payload);
      console.log('[EstimatePage] Create response:', response);
      
      toast.success('Estimate created successfully');
      fetchEstimates();
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('[EstimatePage] Error creating estimate:', error);
      toast.error('Failed to create estimate: ' + (error?.response?.data?.message || error.message));
    }
  };

  const handleUpdateEstimate = async (id, data) => {
    try {
      const payload = {
        ...data,
        title: data.projectName
      };
      await documentsApi.update(id, payload);
      toast.success('Estimate updated successfully');
      fetchEstimates();
      setSelectedEstimate(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating estimate:', error);
      toast.error('Failed to update estimate');
    }
  };

  const handleDeleteEstimate = async (id) => {
    if (window.confirm('Are you sure you want to delete this estimate?')) {
      try {
        await documentsApi.delete(id);
        toast.success('Estimate deleted');
        fetchEstimates();
      } catch (error) {
        console.error('Error deleting estimate:', error);
        toast.error('Failed to delete estimate');
      }
    }
  };

  const handleDuplicateEstimate = (estimate) => {
    const newEstimate = {
      ...estimate,
      id: `EST-${String(estimates.length + 1).padStart(3, '0')}`,
      estimateNumber: generateEstimateNumber(estimates),
      projectName: `${estimate.projectName} (Copy)`,
      status: 'draft',
      version: 1,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setEstimates([newEstimate, ...estimates]);
  };

  const handleDownloadPDF = (estimate) => {
    downloadEstimatePDF(estimate);
  };

  const handleDownloadProposal = (estimate) => {
    downloadProposalPDF(estimate);
  };

  const handleSendEstimate = (id) => {
    const estimate = estimates.find((e) => e.id === id);
    const to = estimate?.customerEmail || '';
    const subject = `Estimate ${estimate?.estimateNumber || id}`;
    const bodyLines = [
      `Hello ${estimate?.customerName || ''},`,
      '',
      `Please find the estimate details below:`,
      '',
      `Estimate No: ${estimate?.estimateNumber || id}`,
      `Project: ${estimate?.projectName || ''}`,
      `Location: ${estimate?.projectLocation || ''}`,
      `System Capacity: ${estimate?.systemCapacity || ''} kW`,
      `Project Type: ${estimate?.projectType || ''}`,
      `Installation Type: ${estimate?.installationType || ''}`,
      `Total: ${fmt(estimate?.total || 0)}`,
      '',
      'Thanks,',
    ];
    const body = bodyLines.join('\n');
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    setEstimates(estimates.map(e =>
      e.id === id ? { ...e, status: 'sent', sentAt: new Date().toISOString() } : e
    ));
  };

  // Listen for custom event from DocumentPage to open modal
  useEffect(() => {
    console.log('Setting up global openEstimateModal function');
    // @ts-ignore
    window.openEstimateModal = () => {
      console.log('Global function called! Opening modal...');
      setIsCreateModalOpen(true);
    };
    return () => {
      // @ts-ignore
      delete window.openEstimateModal;
    };
  }, []);

  // Debug viewMode changes
  useEffect(() => {
    console.log('[EstimatePage] viewMode changed to:', viewMode);
  }, [viewMode]);

  const handleMarkAsCompleted = async (doc) => {
    if (!window.confirm(`Mark ${doc.estimateNumber} as completed?`)) return;
    try {
      await documentsApi.update(doc.id, { status: 'accepted' });
      toast.success('Estimate marked as completed');
      fetchEstimates();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleApproveAndCreateProject = async (doc) => {
    if (!window.confirm(`Approve ${doc.estimateNumber} and create project?`)) return;
    setIsProcessing(true);
    try {
      const projectData = {
        projectId: `PRJ-${Date.now()}`,
        customerName: doc.customerName,
        email: doc.customerEmail,
        mobileNumber: doc.customerPhone,
        site: doc.projectLocation || 'TBD',
        systemSize: doc.systemCapacity || 0,
        status: 'Logistics',
        pm: 'Unassigned',
        startDate: new Date().toISOString(),
        progress: 0,
        value: doc.total,
        notes: doc.projectName,
        items: doc.items?.map(item => ({
          itemId: `item-${Math.random().toString(36).substr(2, 9)}`,
          category: item.category || 'Miscellaneous',
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.total
        })) || []
      };
      await api.post('/projects', projectData);
      await documentsApi.update(doc.id, { status: 'accepted' });
      toast.success('Project created successfully!');
      fetchEstimates();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsProcessing(false);
      setActionMenuOpen(null);
    }
  };

  const handleSendEmailAndComplete = async (doc) => {
    if (!window.confirm(`Send email to ${doc.customerEmail} and mark as sent?`)) return;
    try {
      handleSendEstimate(doc.id);
      toast.success('Email trigger initiated');
    } catch (error) {
      toast.error('Failed to send email');
    }
  };

  // ── Table Columns ───────────────────────────────────────────────────────────
  const tableColumns = [
    {
      key: 'estimateNumber',
      header: 'Estimate #',
      render: v => <span className="text-xs font-mono text-[var(--primary)] font-semibold">{v}</span>,
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: v => (
        <div>
          <span className="text-xs font-medium text-[var(--text-primary)]">{v}</span>
        </div>
      ),
    },
    {
      key: 'projectName',
      header: 'Project',
      render: v => <span className="text-xs text-[var(--text-muted)] line-clamp-1">{v}</span>,
    },
    {
      key: 'systemCapacity',
      header: 'Capacity',
      render: v => <span className="text-xs font-medium text-[var(--text-primary)]">{v} kW</span>,
    },
    {
      key: 'total',
      header: 'Total Cost',
      render: v => <span className="text-xs font-bold text-[var(--green)]">{fmt(v)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: v => {
        const config = ESTIMATE_STATUS[v] || ESTIMATE_STATUS.draft;
        return (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: config.bg, color: config.color }}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: v => <span className="text-xs text-[var(--text-muted)]">{new Date(v).toLocaleDateString('en-IN')}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (v, doc) => (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActionMenuOpen(actionMenuOpen === doc.id ? null : doc.id);
            }}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          
          {actionMenuOpen === doc.id && (
            <div className="absolute right-0 mt-1 w-48 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproveAndCreateProject(doc);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-hover)] transition-colors"
              >
                <CheckCircle size={14} className="text-[var(--green)]" />
                <span>Approve & Create Project</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendEmailAndComplete(doc);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-hover)] transition-colors"
              >
                              <Mail size={14} className="text-[var(--primary)]" />
                <span>Send Email</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsCompleted(doc);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-hover)] transition-colors"
              >
                <FileCheck size={14} className="text-purple-500" />
                <span>Mark as Completed</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteEstimate(doc.id);
                  setActionMenuOpen(null);
                }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-hover)] text-[var(--red)] transition-colors"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--blue-bg)] flex items-center justify-center">
                <FileText size={20} className="text-[var(--blue)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">{stats.total}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Total Estimates</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">{stats.accepted}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Accepted</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">{stats.pending}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search estimates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'list' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
              title="List View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'grid' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'kanban' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
              title="Kanban View"
            >
              <Kanban size={16} />
            </button>
          </div>

          <Button onClick={() => { console.log('Create Estimate clicked!'); setIsCreateModalOpen(true); }} className="flex items-center gap-1.5">
            <Plus size={16} />
            Create Estimate
          </Button>
        </div>
      </div>

      {/* Estimates List */}
      {filteredEstimates.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No estimates found</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">Create your first solar estimate</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Create Estimate
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEstimates.map(estimate => (
            <EstimateCard
              key={estimate.id}
              estimate={estimate}
              onView={() => setSelectedEstimate(estimate)}
              onEdit={() => { setSelectedEstimate(estimate); setIsEditMode(true); }}
              onDuplicate={() => handleDuplicateEstimate(estimate)}
              onDelete={() => handleDeleteEstimate(estimate.id)}
              onDownload={() => handleDownloadPDF(estimate)}
              onDownloadProposal={() => handleDownloadProposal(estimate)}
              onSend={() => handleSendEstimate(estimate.id)}
            />
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanView estimates={filteredEstimates} onCardClick={setSelectedEstimate} />
      ) : (
        <div className="glass-card overflow-hidden p-4">
          <div style={{ minHeight: '200px', background: 'var(--bg-surface)' }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-base)]">
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-muted)]">Estimate #</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-muted)]">Customer</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-muted)]">Project</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-muted)]">Total</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-muted)]">Status</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstimates.map((estimate) => (
                  <tr 
                    key={estimate.id} 
                    className="border-b border-[var(--border-base)]/50 hover:bg-[var(--bg-hover)] cursor-pointer"
                    onClick={() => setSelectedEstimate(estimate)}
                  >
                    <td className="py-2 px-3 text-xs font-mono text-[var(--primary)]">{estimate.estimateNumber}</td>
                    <td className="py-2 px-3 text-xs">{estimate.customerName}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-muted)]">{estimate.projectName}</td>
                    <td className="py-2 px-3 text-xs text-right font-bold text-[var(--green)]">{(estimate.total / 100000).toFixed(1)}L</td>
                    <td className="py-2 px-3 text-xs">
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ 
                          background: ESTIMATE_STATUS[estimate.status]?.bg || '#e5e7eb',
                          color: ESTIMATE_STATUS[estimate.status]?.color || '#374151'
                        }}
                      >
                        {ESTIMATE_STATUS[estimate.status]?.label || estimate.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpen(actionMenuOpen === estimate.id ? null : estimate.id);
                          }}
                          className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          <MoreVertical size={14} />
                        </button>
                        
                        {actionMenuOpen === estimate.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg shadow-lg z-[100] py-1 text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveAndCreateProject(estimate);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-hover)] transition-colors"
                            >
                              <CheckCircle size={14} className="text-[var(--green)]" />
                              <span>Approve & Create Project</span>
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendEmailAndComplete(estimate);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-hover)] transition-colors"
                            >
                              <Mail size={14} className="text-[var(--primary)]" />
                              <span>Send Email</span>
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsCompleted(estimate);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-hover)] transition-colors"
                            >
                              <FileCheck size={14} className="text-purple-500" />
                              <span>Mark as Completed</span>
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEstimate(estimate.id);
                                setActionMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-hover)] text-[var(--red)] transition-colors"
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={Boolean(isCreateModalOpen || (selectedEstimate && isEditMode))}
        onClose={() => { setIsCreateModalOpen(false); setSelectedEstimate(null); setIsEditMode(false); }}
        title={isEditMode ? 'Edit Estimate' : 'Create Solar EPC Estimate'}
        size="full"
      >
        <CreateEstimateForm
          initialData={isEditMode ? selectedEstimate : null}
          estimates={estimates}
          onSubmit={isEditMode ? (data) => handleUpdateEstimate(selectedEstimate.id, data) : handleCreateEstimate}
          onCancel={() => { setIsCreateModalOpen(false); setSelectedEstimate(null); setIsEditMode(false); }}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={Boolean(selectedEstimate && !isEditMode)}
        onClose={() => setSelectedEstimate(null)}
        title={`Estimate ${selectedEstimate?.estimateNumber}`}
        size="lg"
      >
        {selectedEstimate && (
          <EstimateDetail
            estimate={selectedEstimate}
            onEdit={() => setIsEditMode(true)}
            onDelete={() => handleDeleteEstimate(selectedEstimate.id)}
            onDownload={() => handleDownloadPDF(selectedEstimate)}
            onDownloadProposal={() => handleDownloadProposal(selectedEstimate)}
            onSend={() => handleSendEstimate(selectedEstimate.id)}
          />
        )}
      </Modal>
    </div>
  );
};

// ── Estimate Card Component ───────────────────────────────────────────────────
const EstimateCard = ({ estimate, onView, onEdit, onDuplicate, onDelete, onDownload, onDownloadProposal, onSend }) => {
  const statusConfig = ESTIMATE_STATUS[estimate.status] || ESTIMATE_STATUS.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="glass-card p-4 space-y-3 hover:scale-[1.01] transition-all cursor-pointer" onClick={onView}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-[var(--primary)] font-semibold">{estimate.estimateNumber}</p>
          <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">{estimate.projectName}</p>
        </div>
        <div
          className="px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1"
          style={{ background: statusConfig.bg, color: statusConfig.color }}
        >
          <StatusIcon size={10} />
          {statusConfig.label}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <User size={12} />
          <span className="line-clamp-1">{estimate.customerName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <MapPin size={12} />
          <span className="line-clamp-1">{estimate.projectLocation}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card p-2 text-center">
          <p className="text-[10px] text-[var(--text-muted)]">System</p>
          <p className="text-sm font-bold text-[var(--text-primary)]">{estimate.systemCapacity} kW</p>
        </div>
        <div className="glass-card p-2 text-center">
          <p className="text-[10px] text-[var(--text-muted)]">Total</p>
          <p className="text-sm font-bold text-[var(--green)]">{(estimate.total / 100000).toFixed(1)}L</p>
        </div>
      </div>

      <div className="flex items-center gap-1 pt-2 border-t border-[var(--border-base)]">
        <button
          onClick={(e) => { e.stopPropagation(); onSend(); }}
          disabled={estimate.status !== 'draft'}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-medium hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={10} />
          Send
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDownloadProposal(); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
          title="Download Proposal"
        >
          <FileText size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          title="Download PDF"
        >
          <Download size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--red)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ── Create Estimate Form Component ────────────────────────────────────────────
const CreateEstimateForm = ({ initialData, estimates, onSubmit, onCancel }) => {
  const [projectTypeOptions, setProjectTypeOptions] = useState(DEFAULT_PROJECT_TYPES);
  const [installationTypeOptions, setInstallationTypeOptions] = useState(DEFAULT_INSTALLATION_TYPES);

  useEffect(() => {
    let cancelled = false;
    const loadTypeOptions = async () => {
      try {
        const res = await settingsApi.getTypeOptions();
        const pts = res?.projectTypes || res?.data?.projectTypes;
        const its = res?.installationTypes || res?.data?.installationTypes;
        if (!cancelled) {
          if (Array.isArray(pts) && pts.length > 0) setProjectTypeOptions(pts);
          if (Array.isArray(its) && its.length > 0) setInstallationTypeOptions(its);
        }
      } catch {
        // ignore
      }
    };
    loadTypeOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const [formData, setFormData] = useState(initialData || {
    customerName: '',
    companyName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    projectLocation: '',
    projectName: '',
    systemCapacity: '',
    projectType: 'residential',
    installationType: 'rooftop',
    projectDescription: '',
    items: [],
    equipmentCost: 0,
    installationCost: 0,
    engineeringCost: 0,
    transportationCost: 0,
    miscellaneousCost: 0,
    subtotal: 0,
    gstRate: 18,
    gstAmount: 0,
    total: 0,
    notes: '',
    terms: '50% advance, 50% on completion. 5 year warranty on installation.',
  });

  const [activeSection, setActiveSection] = useState('equipment');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEquipmentLibraryOpen, setIsEquipmentLibraryOpen] = useState(false);
  
  // Inventory items state for dropdown
  const [inventoryItems, setInventoryItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState('');
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Fetch inventory items and categories
  const fetchInventoryData = async () => {
    setIsLoadingInventory(true);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        inventoryApi.getAll(),
        inventoryApi.getCategories()
      ]);
      
      const items = itemsRes?.data ?? itemsRes ?? [];
      const cats = catsRes?.data ?? catsRes ?? [];
      
      setInventoryItems(Array.isArray(items) ? items : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      console.error('Failed to fetch inventory data:', err);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Fetch on mount and set up polling every 30 seconds
  useEffect(() => {
    fetchInventoryData();
    const interval = setInterval(fetchInventoryData, 30000);
    return () => clearInterval(interval);
  }, []);

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    category: 'Solar Panel',
    brand: '',
    model: '',
    quantity: 1,
    unit: 'Piece',
    unitPrice: 0,
    total: 0,
    inventoryItemId: null,
  });

  // Calculate totals whenever costs or items change
  useEffect(() => {
    const itemsTotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const equipmentCost = itemsTotal;
    const subtotal = equipmentCost +
      (formData.installationCost || 0) +
      (formData.engineeringCost || 0) +
      (formData.transportationCost || 0) +
      (formData.miscellaneousCost || 0);
    const gstAmount = (subtotal * (formData.gstRate || 18)) / 100;
    const total = subtotal + gstAmount;

    setFormData(prev => ({
      ...prev,
      equipmentCost,
      subtotal,
      gstAmount,
      total,
    }));
  }, [formData.items, formData.installationCost, formData.engineeringCost, formData.transportationCost, formData.miscellaneousCost, formData.gstRate]);

  const handleAddItem = () => {
    // Validate required fields
    if (!newItem.name?.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (!newItem.category) {
      toast.error('Category is required');
      return;
    }
    if (!newItem.quantity || newItem.quantity <= 0) {
      toast.error('Valid quantity is required');
      return;
    }
    if (!newItem.unit) {
      toast.error('Unit is required');
      return;
    }

    const item = {
      ...newItem,
      total: newItem.quantity * newItem.unitPrice,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item],
    }));

    setNewItem({
      name: '',
      description: '',
      category: 'Solar Panel',
      brand: '',
      model: '',
      quantity: 1,
      unit: 'Piece',
      unitPrice: 0,
      total: 0,
      inventoryItemId: null,
    });
    setSelectedInventoryItem('');
    setIsAddingItem(false);
    toast.success('Item added successfully');
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSelectFromLibrary = (item) => {
    const newItemData = {
      name: item.name,
      description: item.description,
      category: item.category,
      unit: item.unit || 'Piece',
      brand: item.brand,
      model: item.model,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItemData],
    }));
    toast.success(`${item.name} added to estimate`);
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('[CreateEstimateForm] handleSubmit triggered');
    
    // Validate required fields before proceeding
    if (!formData.customerName || !formData.customerPhone || !formData.projectName || !formData.systemCapacity) {
      toast.error('Please fill in all required fields');
      console.log('[CreateEstimateForm] Validation failed: missing required fields');
      return;
    }

    console.log('[CreateEstimateForm] Submitting form data:', formData);
    
    if (typeof onSubmit === 'function') {
      try {
        // We do NOT close the modal here. The parent's handleCreateEstimate will do it.
        await onSubmit(formData);
        console.log('[CreateEstimateForm] onSubmit call completed');
      } catch (error) {
        console.error('[CreateEstimateForm] onSubmit error:', error);
        toast.error('Failed to save estimate');
      }
    } else {
      console.error('[CreateEstimateForm] onSubmit prop is missing or not a function');
    }
  };

  const sectionTabs = [
    { key: 'equipment', label: 'Equipment', icon: Zap },
    { key: 'customer', label: 'Customer', icon: User },
    { key: 'project', label: 'Project', icon: Sun },
    { key: 'costs', label: 'Costs', icon: DollarSign },
    { key: 'summary', label: 'Summary', icon: FileText },
  ];

  // Live Cost Panel Component
  const LiveCostPanel = () => (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl p-4 space-y-3 sticky top-4">
      <h5 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
        <Calculator size={16} className="text-[var(--primary)]" />
        Live Calculation
      </h5>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Equipment:</span>
          <span className="font-medium">{fmt(formData.equipmentCost || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Installation:</span>
          <span className="font-medium">{fmt(formData.installationCost || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Engineering:</span>
          <span className="font-medium">{fmt(formData.engineeringCost || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Transport:</span>
          <span className="font-medium">{fmt(formData.transportationCost || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Misc:</span>
          <span className="font-medium">{fmt(formData.miscellaneousCost || 0)}</span>
        </div>
        <div className="border-t border-[var(--border-base)] pt-2">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Subtotal:</span>
            <span className="font-bold">{fmt(formData.subtotal || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">GST ({formData.gstRate || 18}%):</span>
            <span className="font-medium">{fmt(formData.gstAmount || 0)}</span>
          </div>
        </div>
        <div className="border-t border-[var(--border-base)] pt-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-[var(--primary)]">Grand Total:</span>
            <span className="text-lg font-black text-[var(--green)]">{fmt(formData.total || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Equipment Library Modal */}
      <EquipmentLibrary
        isOpen={isEquipmentLibraryOpen}
        onClose={() => setIsEquipmentLibraryOpen(false)}
        onSelect={handleSelectFromLibrary}
      />

      {/* Section Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] overflow-x-auto">
        {sectionTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSection(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
              activeSection === tab.key
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Form Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Customer Section */}
          {activeSection === 'customer' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <User size={16} className="text-[var(--primary)]" />
                Customer Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Customer Name *" required>
                  <Input
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Enter customer name"
                  />
                </FormField>
                <FormField label="Company Name">
                  <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Enter company name (if applicable)"
                  />
                </FormField>
                <FormField label="Phone Number *" required>
                  <Input
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </FormField>
                <FormField label="Email Address">
                  <Input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    placeholder="customer@email.com"
                  />
                </FormField>
                <FormField label="Address" className="md:col-span-2">
                  <Textarea
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    placeholder="Customer address"
                    rows={2}
                  />
                </FormField>
                <FormField label="Project Location *" required>
                  <Input
                    value={formData.projectLocation}
                    onChange={(e) => setFormData({ ...formData, projectLocation: e.target.value })}
                    placeholder="City, State"
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* Project Section */}
          {activeSection === 'project' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Sun size={16} className="text-[var(--solar)]" />
                Project Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Project Name *" required>
                  <Input
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="e.g., 5kW Rooftop Solar Installation"
                  />
                </FormField>
                <FormField label="System Capacity (kW) *" required>
                  <Input
                    type="number"
                    value={formData.systemCapacity}
                    onChange={(e) => setFormData({ ...formData, systemCapacity: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., 5"
                  />
                </FormField>
                <FormField label="Project Description" className="md:col-span-2">
                  <Textarea
                    value={formData.projectDescription}
                    onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                    placeholder="Describe the project scope, requirements, etc."
                    rows={3}
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* Equipment Section */}
          {activeSection === 'equipment' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" />
                  Equipment Selection
                </h4>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsEquipmentLibraryOpen(true)}
                  >
                    <Search size={14} className="mr-1" />
                    Browse Library
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsAddingItem(true)}
                  >
                    <Plus size={14} className="mr-1" />
                    Add Custom
                  </Button>
                </div>
              </div>

              {formData.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border-base)]">
                        <th className="text-left py-2 text-[10px] font-medium text-[var(--text-muted)]">Item</th>
                        <th className="text-left py-2 text-[10px] font-medium text-[var(--text-muted)]">Category</th>
                        <th className="text-left py-2 text-[10px] font-medium text-[var(--text-muted)]">Brand/Model</th>
                        <th className="text-center py-2 text-[10px] font-medium text-[var(--text-muted)]">Qty</th>
                        <th className="text-center py-2 text-[10px] font-medium text-[var(--text-muted)]">Unit</th>
                        <th className="text-right py-2 text-[10px] font-medium text-[var(--text-muted)]">Unit Price</th>
                        <th className="text-right py-2 text-[10px] font-medium text-[var(--text-muted)]">Total</th>
                        <th className="text-center py-2 text-[10px] font-medium text-[var(--text-muted)]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index} className="border-b border-[var(--border-base)]/50">
                          <td className="py-2">
                            <p className="text-xs font-medium text-[var(--text-primary)]">{item.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{item.description}</p>
                          </td>
                          <td className="py-2 text-xs text-[var(--text-muted)]">
                            {item.category || '-'}
                          </td>
                          <td className="py-2 text-xs text-[var(--text-muted)]">
                            {item.brand} {item.model}
                          </td>
                          <td className="py-2 text-center text-xs text-[var(--text-primary)]">{item.quantity}</td>
                          <td className="py-2 text-center text-xs text-[var(--text-muted)]">{item.unit || 'Piece'}</td>
                          <td className="py-2 text-right text-xs text-[var(--text-primary)]">{fmt(item.unitPrice)}</td>
                          <td className="py-2 text-right text-xs font-bold text-[var(--green)]">{fmt(item.total)}</td>
                          <td className="py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 rounded text-[var(--red)] hover:bg-[var(--bg-hover)]"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[var(--border-base)]">
                        <td colSpan={6} className="text-right py-2 text-xs font-bold text-[var(--text-primary)]">Equipment Cost:</td>
                        <td className="text-right py-2 text-xs font-bold text-[var(--green)]">{fmt(formData.equipmentCost)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  <Zap size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No equipment added yet</p>
                  <p className="text-xs">Browse library or add custom items</p>
                </div>
              )}

              {/* Add Item Form */}
              {isAddingItem && (
                <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] space-y-3">
                  
                  {/* Select from Inventory Section */}
                  <div className="p-3 rounded-lg border border-[var(--border-base)] bg-[var(--bg-overlay)] space-y-2">
                    <h5 className="text-xs font-bold text-[var(--primary)] flex items-center gap-2">
                      <Package size={14} />
                      Select from Inventory
                    </h5>
                    
                    <div className="flex gap-2">
                      <select
                        value={selectedInventoryItem}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setSelectedInventoryItem(selectedId);
                          if (selectedId) {
                            const item = inventoryItems.find(i => (i.itemId || i._id || i.id) === selectedId);
                            if (item) {
                              setNewItem({
                                name: item.description || item.name || '',
                                description: item.longDescription || '',
                                category: item.category || 'Solar Panel',
                                unit: item.unit || 'Piece',
                                brand: item.brand || '',
                                model: item.model || '',
                                quantity: 1,
                                unitPrice: item.rate || 0,
                                total: 0,
                                inventoryItemId: item.itemId || item._id || item.id,
                                stock: item.stock,
                                available: item.available
                              });
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-base)] text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      >
                        <option value="">-- Select an inventory item --</option>
                        {inventoryItems.map(item => {
                          const itemId = item.itemId || item._id || item.id;
                          const itemName = item.description || item.name || 'Unnamed Item';
                          const categoryName = item.category || '';
                          const stock = item.available ?? item.stock ?? 0;
                          const isOutOfStock = stock <= 0;
                          return (
                              <option key={itemId} value={itemId} className={isOutOfStock ? 'text-[var(--red)]' : ''}>
                              {itemName} {categoryName ? `(${categoryName})` : ''} {isOutOfStock ? ' ⚠️ Out of Stock' : ''}
                            </option>
                          );
                        })}
                      </select>
                      
                      <button
                        onClick={fetchInventoryData}
                        className="px-3 py-2 rounded-lg border border-[var(--border-base)] text-[var(--primary)] hover:bg-[var(--bg-hover)] transition-colors"
                        title="Refresh inventory"
                      >
                        <RefreshCw size={16} className={isLoadingInventory ? 'animate-spin' : ''} />
                      </button>
                    </div>
                    
                    {isLoadingInventory && <p className="text-xs text-[var(--primary)]">Loading inventory...</p>}
                    
                    {selectedInventoryItem && newItem.stock !== undefined && newItem.stock <= 0 && (
                      <p className="text-xs text-[var(--red)] flex items-center gap-1">
                        ⚠️ Warning: This item is out of stock
                      </p>
                    )}
                  </div>

                  <div className="text-center text-xs text-[var(--text-muted)] font-medium">or</div>

                  <h5 className="text-xs font-bold text-[var(--text-primary)]">Add Custom Equipment</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Item Name *" className="col-span-2">
                      <Input
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder="e.g., Solar Panel 550W"
                      />
                    </FormField>
                    <FormField label="Description">
                      <Input
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        placeholder="Brief description"
                      />
                    </FormField>
                    <FormField label="Category *" required>
                      <Select
                        value={newItem.category}
                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      >
                        {categories.length > 0 ? (
                          categories.map(cat => (
                            <option key={cat.code || cat._id} value={cat.name || cat.code}>
                              {cat.name || cat.code}
                            </option>
                          ))
                        ) : (
                          EQUIPMENT_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.label}>{cat.label}</option>
                          ))
                        )}
                      </Select>
                    </FormField>
                    <FormField label="Brand">
                      <Input
                        value={newItem.brand}
                        onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                        placeholder="e.g., Waaree"
                      />
                    </FormField>
                    <FormField label="Model">
                      <Input
                        value={newItem.model}
                        onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                        placeholder="e.g., WS-550"
                      />
                    </FormField>
                    <FormField label="Quantity *" required className="col-span-1">
                      <Input
                        type="number"
                        min={1}
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                      />
                    </FormField>
                    <FormField label="Unit *" required className="col-span-1">
                      <Select
                        value={newItem.unit}
                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      >
                        <option value="Piece">Piece</option>
                        <option value="Set">Set</option>
                        <option value="Meter">Meter</option>
                        <option value="Kg">Kg</option>
                        <option value="Liter">Liter</option>
                        <option value="kW">kW</option>
                        <option value="Unit">Unit</option>
                        <option value="Bundle">Bundle</option>
                        <option value="Pair">Pair</option>
                        <option value="Nos">Nos</option>
                      </Select>
                    </FormField>
                    <FormField label="Unit Price (₹) *" required className="col-span-2">
                      <Input
                        type="number"
                        min={0}
                        value={newItem.unitPrice}
                        onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </FormField>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddingItem(false)}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={handleAddItem}>
                      Add Item
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Costs Section */}
          {activeSection === 'costs' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <DollarSign size={16} className="text-[var(--green)]" />
                Additional Costs
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Installation Cost (₹)">
                  <Input
                    type="number"
                    value={formData.installationCost}
                    onChange={(e) => setFormData({ ...formData, installationCost: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Engineering Cost (₹)">
                  <Input
                    type="number"
                    value={formData.engineeringCost}
                    onChange={(e) => setFormData({ ...formData, engineeringCost: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Transportation Cost (₹)">
                  <Input
                    type="number"
                    value={formData.transportationCost}
                    onChange={(e) => setFormData({ ...formData, transportationCost: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Miscellaneous Cost (₹)">
                  <Input
                    type="number"
                    value={formData.miscellaneousCost}
                    onChange={(e) => setFormData({ ...formData, miscellaneousCost: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="GST Rate (%)">
                  <Input
                    type="number"
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: parseFloat(e.target.value) || 0 })}
                    placeholder="18"
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* Summary Section */}
          {activeSection === 'summary' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FileText size={16} className="text-[var(--primary)]" />
                Estimate Summary
              </h4>

              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-base)]/50">
                  <span className="text-xs text-[var(--text-muted)]">Equipment Cost</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{fmt(formData.equipmentCost)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-base)]/50">
                  <span className="text-xs text-[var(--text-muted)]">Installation Cost</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{fmt(formData.installationCost || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-base)]/50">
                  <span className="text-xs text-[var(--text-muted)]">Engineering Cost</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{fmt(formData.engineeringCost || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-base)]/50">
                  <span className="text-xs text-[var(--text-muted)]">Transportation Cost</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{fmt(formData.transportationCost || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-base)]/50">
                  <span className="text-xs text-[var(--text-muted)]">Miscellaneous Cost</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{fmt(formData.miscellaneousCost || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b-2 border-[var(--border-base)]">
                  <span className="text-sm font-bold text-[var(--text-primary)]">Subtotal</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{fmt(formData.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-base)]/50">
                  <span className="text-xs text-[var(--text-muted)]">GST ({formData.gstRate || 18}%)</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{fmt(formData.gstAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-[var(--primary)]/10 rounded-lg px-3">
                  <span className="text-sm font-bold text-[var(--primary)]">Grand Total</span>
                  <span className="text-lg font-black text-[var(--primary)]">{fmt(formData.total)}</span>
                </div>
              </div>

              <FormField label="Notes">
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </FormField>

              <FormField label="Terms & Conditions">
                <Textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="Payment terms, warranty, etc."
                  rows={3}
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Right Side - Live Cost Panel */}
        <div className="lg:col-span-1">
          <LiveCostPanel />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--border-base)]">
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {activeSection !== 'equipment' && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const currentIndex = sectionTabs.findIndex(s => s.key === activeSection);
                setActiveSection(sectionTabs[currentIndex - 1].key);
              }}
            >
              Previous
            </Button>
          )}
          {activeSection !== 'summary' ? (
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Validation: Equipment tab requires at least 1 item
                if (activeSection === 'equipment' && formData.items.length === 0) {
                  toast.error('Please add at least one equipment item');
                  return;
                }
                const currentIndex = sectionTabs.findIndex(s => s.key === activeSection);
                if (currentIndex < sectionTabs.length - 1) {
                  setActiveSection(sectionTabs[currentIndex + 1].key);
                }
              }}
            >
              Next
            </Button>
          ) : (
            <Button 
              type="button"
              onClick={(e) => {
                console.log('[CreateEstimateForm] Create button clicked');
                handleSubmit(e);
              }}
            >
              {initialData ? 'Update Estimate' : 'Create Estimate'}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

// ── Estimate Detail Component ─────────────────────────────────────────────────
const EstimateDetail = ({ estimate, onEdit, onDelete, onDownload, onDownloadProposal, onSend }) => {
  const statusConfig = ESTIMATE_STATUS[estimate.status] || ESTIMATE_STATUS.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1"
              style={{ background: statusConfig.bg, color: statusConfig.color }}
            >
              <StatusIcon size={10} />
              {statusConfig.label}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">v{estimate.version}</span>
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{estimate.projectName}</h3>
          <p className="text-sm text-[var(--text-muted)]">{estimate.estimateNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-[var(--green)]">{fmt(estimate.total)}</p>
          <p className="text-xs text-[var(--text-muted)]">Grand Total</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-[var(--text-primary)]">Customer Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[var(--text-muted)]">Name:</span>
            <span className="ml-2 font-medium">{estimate.customerName}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Company:</span>
            <span className="ml-2 font-medium">{estimate.companyName || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Phone:</span>
            <span className="ml-2 font-medium">{estimate.customerPhone}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Email:</span>
            <span className="ml-2 font-medium">{estimate.customerEmail || 'N/A'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[var(--text-muted)]">Location:</span>
            <span className="ml-2 font-medium">{estimate.projectLocation}</span>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-[var(--text-primary)]">Project Details</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[var(--text-muted)]">System Capacity:</span>
            <span className="ml-2 font-medium">{estimate.systemCapacity} kW</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Project Type:</span>
            <span className="ml-2 font-medium capitalize">{estimate.projectType}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Installation:</span>
            <span className="ml-2 font-medium capitalize">{estimate.installationType?.replace('_', ' ') || 'Standard'}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Created:</span>
            <span className="ml-2 font-medium">{new Date(estimate.createdAt).toLocaleDateString('en-IN')}</span>
          </div>
        </div>
        {estimate.projectDescription && (
          <div className="mt-3">
            <span className="text-[var(--text-muted)] text-sm">Description:</span>
            <p className="text-sm mt-1">{estimate.projectDescription}</p>
          </div>
        )}
      </div>

      {/* Equipment Items */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-[var(--text-primary)]">Equipment ({estimate.items.length} items)</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-base)]">
                <th className="text-left py-2 text-[10px] font-medium text-[var(--text-muted)]">Item</th>
                <th className="text-center py-2 text-[10px] font-medium text-[var(--text-muted)]">Qty</th>
                <th className="text-right py-2 text-[10px] font-medium text-[var(--text-muted)]">Price</th>
                <th className="text-right py-2 text-[10px] font-medium text-[var(--text-muted)]">Total</th>
              </tr>
            </thead>
            <tbody>
              {estimate.items.slice(0, 5).map((item, index) => (
                <tr key={index} className="border-b border-[var(--border-base)]/50">
                  <td className="py-2">
                    <p className="text-xs font-medium">{item.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{item.brand} {item.model}</p>
                  </td>
                  <td className="py-2 text-center text-xs">{item.quantity}</td>
                  <td className="py-2 text-right text-xs">{fmt(item.unitPrice)}</td>
                  <td className="py-2 text-right text-xs font-medium">{fmt(item.total)}</td>
                </tr>
              ))}
              {estimate.items.length > 5 && (
                <tr>
                  <td colSpan={4} className="text-center py-2 text-[10px] text-[var(--text-muted)]">
                    +{estimate.items.length - 5} more items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="glass-card p-4 space-y-2">
        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">Cost Breakdown</h4>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Equipment Cost</span>
          <span className="font-medium">{fmt(estimate.equipmentCost)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Installation</span>
          <span className="font-medium">{fmt(estimate.installationCost || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Engineering</span>
          <span className="font-medium">{fmt(estimate.engineeringCost || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Transportation</span>
          <span className="font-medium">{fmt(estimate.transportationCost || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Miscellaneous</span>
          <span className="font-medium">{fmt(estimate.miscellaneousCost || 0)}</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-[var(--border-base)]">
          <span className="font-medium">Subtotal</span>
          <span className="font-medium">{fmt(estimate.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">GST ({estimate.gstRate || 18}%)</span>
          <span className="font-medium">{fmt(estimate.gstAmount)}</span>
        </div>
        <div className="flex justify-between text-base font-bold pt-2 border-t-2 border-[var(--border-base)]">
          <span className="text-[var(--primary)]">Grand Total</span>
          <span className="text-[var(--green)]">{fmt(estimate.total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-base)]">
        <button
          onClick={onSend}
          className="flex-1 flex items-center justify-center gap-2 px-4 h-[42px] rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <div className="flex items-center justify-center gap-2">
            <Send size={16} strokeWidth={2.5} className="flex-shrink-0" />
            <span className="leading-none" style={{ position: 'relative', top: '1px' }}>Send Estimate</span>
          </div>
        </button>
        <button
          onClick={onDownloadProposal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-medium hover:bg-[var(--primary)]/20 transition-colors"
        >
          <FileText size={16} />
          Proposal
        </button>
        <button
          onClick={onDownload}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Download size={16} />
          PDF
        </button>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Edit size={16} />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--red-bg)] text-[var(--red)] text-sm font-medium hover:bg-[var(--red-bg)]/50 transition-colors"
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </div>
  );
};

// ── Kanban View Component ───────────────────────────────────────────────────
const KanbanView = ({ estimates, onCardClick }) => {
  const columns = [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'sent', label: 'Sent', color: '#3b82f6' },
    { id: 'accepted', label: 'Accepted', color: '#22c55e' },
    { id: 'rejected', label: 'Rejected', color: '#ef4444' },
  ];

  const getEstimatesByStatus = (status) => estimates.filter(e => e.status === status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map(column => (
        <div key={column.id} className="glass-card p-3 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-base)]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: column.color }} />
              <span className="text-sm font-bold text-[var(--text-primary)]">{column.label}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
              {getEstimatesByStatus(column.id).length}
            </span>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {getEstimatesByStatus(column.id).map(estimate => (
              <div
                key={estimate.id}
                onClick={() => onCardClick(estimate)}
                className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] hover:border-[var(--primary)] cursor-pointer transition-all hover:shadow-md"
              >
                <p className="text-xs font-mono text-[var(--primary)]">{estimate.estimateNumber}</p>
                <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-1">{estimate.projectName}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{estimate.customerName}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-[var(--green)]">{(estimate.total / 100000).toFixed(1)}L</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{estimate.systemCapacity} kW</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EstimatePage;

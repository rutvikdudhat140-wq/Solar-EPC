// Solar EPC ERP - Professional Proposal Module
// Complete Proposal Management System with Dashboard, Wizard, and PDF Generation

import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, FileText, Send, DollarSign, Download, Copy, Trash2, Search, Filter,
  User, Building2, Phone, Mail, MapPin, Sun, Zap, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, Edit, Eye, MoreHorizontal, Calculator, TrendingUp,
  TrendingDown, LayoutGrid, List, Kanban, ChevronRight, ChevronLeft, Save, Printer,
  Check, ArrowRight, FileSpreadsheet, RefreshCw, EyeIcon, CheckSquare,
  XSquare, FileSignature, ArrowLeftRight, BadgeCheck, FileCheck, MailOpen,
  Sparkles, Shield, Leaf, Battery, Gauge, Settings, MoreVertical, X, MessageSquare, Bell,
  Package
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import DataTable from '../components/ui/DataTable';
import { CURRENCY } from '../config/app.config';
import { cn } from '../lib/utils';
import { downloadRayzonPDF } from '../lib/pdfTemplate';
import PDFTemplateCustomizer from '../components/documents/PDFTemplateCustomizer';
import { settingsApi } from '../services/settingsApi';
import { toast } from '../components/ui/Toast';
import { documentsApi } from '../services/documentsApi';
import { inventoryApi } from '../services/inventoryApi';
import ProposalCanvasEditor from '../components/ProposalCanvasEditor';
import CustomDocumentEditor from '../components/CustomDocumentEditor';

import api from '../lib/apiClient';

const fmt = CURRENCY.format;

// ── Proposal Status Configurations ─────────────────────────────────────────────
const PROPOSAL_STATUS = {
  draft: {
    label: 'Draft',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.12)',
    icon: FileText,
    description: 'Proposal is being prepared'
  },
  sent: {
    label: 'Sent',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    icon: Send,
    description: 'Proposal sent to client'
  },
  viewed: {
    label: 'Viewed',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
    icon: EyeIcon,
    description: 'Client has viewed the proposal'
  },
  accepted: {
    label: 'Accepted',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    icon: CheckCircle,
    description: 'Proposal accepted by client'
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    icon: XCircle,
    description: 'Proposal rejected by client'
  },
};

const DEFAULT_PROJECT_TYPES = [
  { value: 'residential', label: 'Residential', icon: User },
  { value: 'commercial', label: 'Commercial', icon: Building2 },
  { value: 'industrial', label: 'Industrial', icon: Zap },
];

const DEFAULT_INSTALLATION_TYPES = [
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'ground_mounted', label: 'Ground Mounted' },
  { value: 'carport', label: 'Carport' },
];

// ── Generate Proposal Number ─────────────────────────────────────────────────
const generateProposalNumber = (existingProposals = []) => {
  const year = new Date().getFullYear();
  const prefix = `PROP-${year}`;

  const existingNumbers = existingProposals
    .map(p => p.proposalNumber)
    .filter(n => n?.startsWith(prefix))
    .map(n => {
      const match = n.match(/-(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });

  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNumber = String(maxNumber + 1).padStart(4, '0');

  return `${prefix}-${nextNumber}`;
};

// ── Sunvora Energy Company Data ──────────────────────────────────────────────
const COMPANY_DATA = {
  name: 'Sunvora Energy Pvt. Ltd.',
  tagline: 'Best Value & Quality Solar Solution',
  logo: '/logo.png',
  address: '104 to 1117, 11th Floor, Millennium Business Hub-1',
  city: 'Opp. Sarthana Nature Park, Surat - 395006, Gujarat - India',
  phone: '+91 96380 00461',
  phone2: '+91 96380 00462',
  tollfree: '1800 123 1232',
  email: 'epc@sunvoraenergy.com',
  website: 'www.sunvoraenergy.com',
  gstin: '24AABCU9603R1ZX',
  manufacturing: {
    name: 'Sunvora Solar Pvt. Ltd.',
    address: 'Block No. 105, B/H Aron Pipes B/H Hariya Talav, Karanj Kim - Mandavi Road',
    city: 'Gujarat 394110',
    email: 'contact@sunvoraenergies.com',
    website: 'www.sunvorasolar.com'
  }
};

// ── Mock Proposals Data ──────────────────────────────────────────────────────
const MOCK_PROPOSALS = [
  {
    id: 'PROP-001',
    proposalNumber: 'PROP-2026-0001',
    estimateId: 'EST-2026-0001',
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
    projectDescription: 'Grid-tied solar system for office building with net metering',
    equipmentItems: [
      { component: 'Solar PV Module', brand: 'Sunvora', description: '625 Wp TopCon Glass-to-Glass Bifacial Module x 8 nos', quantity: 8 },
      { component: 'Module Mounting Structure', brand: 'As per design', description: 'Fixed Tilt - Hot Dip GI Galvalum material', quantity: 1 },
      { component: 'Inverter', brand: 'Solis', description: 'Grid Tied String Inverter with remote monitoring', quantity: 1 },
      { component: 'DC Cable', brand: 'Apar', description: '1C X 4 Sq. mm Copper UV protected', quantity: 100 },
      { component: 'AC Cable', brand: 'RR Kabel', description: '3.5C X 4 sq mm al armd cable', quantity: 50 },
      { component: 'Earthing Kit', brand: 'Reputed', description: 'HDGI Earthing Rod with accessories', quantity: 1 },
    ],
    equipmentCost: 285000,
    installationCost: 45000,
    engineeringCost: 15000,
    transportationCost: 8000,
    miscellaneousCost: 5000,
    discount: 0,
    subtotal: 358000,
    gstRate: 18,
    gstAmount: 64440,
    total: 422440,
    status: 'accepted',
    benefits: {
      yearlySavings: 85000,
      co2Reduction: 6.5,
      paybackPeriod: 5,
      warrantyYears: 25
    },
    terms: '50% advance payment, 50% on completion. 5 year warranty on installation. 30 years performance warranty on solar panels.',
    notes: 'Net metering application to be done by client. All approvals and clearances included.',
    createdAt: '2026-01-15',
    sentAt: '2026-01-16',
    viewedAt: '2026-01-17',
    acceptedAt: '2026-01-20',
  },
  {
    id: 'PROP-002',
    proposalNumber: 'PROP-2026-0002',
    estimateId: 'EST-2026-0002',
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
    projectDescription: 'Residential rooftop solar with premium components',
    equipmentItems: [
      { component: 'Solar PV Module', brand: 'Sunvora', description: '440W Monocrystalline Panels x 7 nos', quantity: 7 },
      { component: 'Hybrid Inverter', brand: 'Growatt', description: '3kW Solar hybrid inverter with monitoring', quantity: 1 },
      { component: 'Mounting Structure', brand: 'Tata', description: 'GI structure for RCC roof', quantity: 1 },
      { component: 'Cables & Accessories', brand: 'Polycab', description: 'DC/AC cables, connectors, junction boxes', quantity: 1 },
    ],
    equipmentCost: 247000,
    installationCost: 28000,
    engineeringCost: 8000,
    transportationCost: 5000,
    miscellaneousCost: 3000,
    discount: 5000,
    subtotal: 286000,
    gstRate: 18,
    gstAmount: 51480,
    total: 337480,
    status: 'sent',
    benefits: {
      yearlySavings: 55000,
      co2Reduction: 4.2,
      paybackPeriod: 6,
      warrantyYears: 25
    },
    terms: '40% advance, 60% on commissioning. Subsidy application assistance provided.',
    notes: 'Subsidy application assistance provided. Government subsidy of 40% applicable.',
    createdAt: '2026-02-10',
    sentAt: '2026-02-11',
  },
  {
    id: 'PROP-003',
    proposalNumber: 'PROP-2026-0003',
    estimateId: 'EST-2026-0003',
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
    projectDescription: 'Ground-mounted solar power plant for factory with net metering',
    equipmentItems: [
      { component: 'Solar PV Module', brand: 'Sunvora', description: '550W High Wattage Panels x 182 nos', quantity: 182 },
      { component: 'Central Inverter', brand: 'SMA', description: '100kW Industrial Inverter', quantity: 1 },
      { component: 'Ground Mount Structure', brand: 'Schletter', description: 'Hot-dip galvanized structure', quantity: 1 },
      { component: 'HT Cable', brand: 'KEI', description: 'HT cable 500m', quantity: 1 },
      { component: 'Transformers', brand: 'Voltamp', description: 'Step-up transformer', quantity: 1 },
      { component: 'SCADA System', brand: 'Wonderware', description: 'Monitoring system', quantity: 1 },
    ],
    equipmentCost: 3733000,
    installationCost: 280000,
    engineeringCost: 95000,
    transportationCost: 45000,
    miscellaneousCost: 35000,
    discount: 50000,
    subtotal: 4138000,
    gstRate: 18,
    gstAmount: 744840,
    total: 4882840,
    status: 'draft',
    benefits: {
      yearlySavings: 850000,
      co2Reduction: 85,
      paybackPeriod: 5.5,
      warrantyYears: 25
    },
    terms: '30% advance, 40% on material delivery, 30% on commissioning. O&M for 5 years included.',
    notes: 'Awaiting site survey completion. DCR compliance required for subsidy.',
    createdAt: '2026-03-01',
  },
];

// ── Mock Estimates for Conversion ────────────────────────────────────────────
const MOCK_ESTIMATES_FOR_CONVERSION = [
  { id: 'EST-2026-0004', customerName: 'Green Valley Apartments', projectName: '50kW Residential Complex', systemCapacity: 50, total: 1850000, status: 'draft' },
  { id: 'EST-2026-0005', customerName: 'Tech Park Solutions', projectName: '200kW Commercial Solar', systemCapacity: 200, total: 7200000, status: 'draft' },
  { id: 'EST-2026-0006', customerName: 'Farmers Co-op', projectName: '25kW Agricultural Solar', systemCapacity: 25, total: 925000, status: 'draft' },
];

// ── Reusable Document Header Component ───────────────────────────────────────
const DocumentHeader = ({
  company = COMPANY_DATA,
  documentType = 'Proposal',
  documentNumber,
  date,
  validUntil,
  customerName,
  customerAddress,
  projectLocation
}) => (
  <div className="bg-gradient-to-r from-[#006b6b] to-[#008080] text-white rounded-xl p-6 mb-6">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      {/* Company Info */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-[var(--bg-surface)]/20 rounded-xl flex items-center justify-center shrink-0">
          <Sun size={32} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{company.name}</h2>
          <p className="text-sm text-white/80">{company.tagline}</p>
          <div className="mt-2 text-xs text-white/70 space-y-0.5">
            <p>{company.address}</p>
            <p>{company.city}</p>
            <p>Phone: {company.phone} | {company.email}</p>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="text-right">
        <div className="bg-[var(--bg-surface)]/20 rounded-lg px-4 py-2 inline-block">
          <p className="text-xs text-white/70 uppercase tracking-wider">{documentType}</p>
          <p className="text-lg font-bold">{documentNumber}</p>
        </div>
        <div className="mt-2 text-xs text-white/80 space-y-1">
          <p>Date: {date ? new Date(date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</p>
          {validUntil && <p>Valid Until: {new Date(validUntil).toLocaleDateString('en-IN')}</p>}
        </div>
      </div>
    </div>

    {/* Customer Info */}
    {(customerName || customerAddress || projectLocation) && (
      <div className="mt-4 pt-4 border-t border-white/20">
        <p className="text-xs text-white/70 uppercase tracking-wider mb-2">Prepared For</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {customerName && (
            <div>
              <span className="text-white/70">Customer:</span>
              <span className="ml-2 font-medium">{customerName}</span>
            </div>
          )}
          {customerAddress && (
            <div>
              <span className="text-white/70">Address:</span>
              <span className="ml-2">{customerAddress}</span>
            </div>
          )}
          {projectLocation && (
            <div>
              <span className="text-white/70">Project Location:</span>
              <span className="ml-2">{projectLocation}</span>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

// ── Main Proposal Page Component ─────────────────────────────────────────────
const ProposalPage = () => {
  const [projectTypeOptions, setProjectTypeOptions] = useState(DEFAULT_PROJECT_TYPES);
  const [installationTypeOptions, setInstallationTypeOptions] = useState(DEFAULT_INSTALLATION_TYPES);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

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

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid' | 'kanban' 
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPDFCustomizerOpen, setIsPDFCustomizerOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailTab, setDetailTab] = useState('proposal'); // 'proposal' | 'comments' | 'reminders' | 'tasks' | 'notes' | 'templates'
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isCanvasEditorOpen, setIsCanvasEditorOpen] = useState(false);
  const [isCustomDocumentEditorOpen, setIsCustomDocumentEditorOpen] = useState(false);
  const [showEmailOnCanvasOpen, setShowEmailOnCanvasOpen] = useState(false);

  // ── Filter Proposals ────────────────────────────────────────────────────────
  const filteredProposals = useMemo(() => {
    let filtered = proposals;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.proposalNumber && p.proposalNumber.toLowerCase().includes(query)) ||
        (p.customerName && p.customerName.toLowerCase().includes(query)) ||
        (p.projectName && p.projectName.toLowerCase().includes(query)) ||
        (p.projectLocation && p.projectLocation.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    return filtered;
  }, [proposals, searchQuery, statusFilter]);

  // ── Stats Calculations ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = proposals.length;
    const totalValue = proposals.reduce((a, p) => a + (p.total || 0), 0);
    const accepted = proposals.filter(p => p.status === 'accepted').length;
    const pending = proposals.filter(p => ['draft', 'sent', 'viewed'].includes(p.status)).length;
    const acceptedValue = proposals.filter(p => p.status === 'accepted').reduce((a, p) => a + (p.total || 0), 0);

    return { total, totalValue, accepted, pending, acceptedValue };
  }, [proposals]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const res = await documentsApi.getEstimatesProposalsQuotations();
      const docs = res?.data?.data || res?.data || [];
      console.log('[ProposalPage] Raw documents from API:', docs);

      const formatted = docs
        .filter(d => d.type === 'proposal')
        .map(d => ({
          // Core IDs
          id: d._id || d.id,
          documentId: d.documentId,
          proposalNumber: d.documentId || d.proposalNumber,

          // Project Info
          projectName: d.title || d.projectName || 'Untitled Proposal',
          projectDescription: d.description || d.projectDescription || '',
          projectLocation: d.projectLocation || d.customerAddress || '',

          // Customer Info
          customerName: d.customerName || 'Unknown Customer',
          customerEmail: d.customerEmail || '',
          customerPhone: d.customerPhone || '',
          customerAddress: d.customerAddress || '',
          // Individual address fields for canvas
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          country: d.country || '',
          zipCode: d.zipCode || '',
          companyName: d.companyName || '',

          // System Details
          systemCapacity: d.systemCapacity || 0,
          projectType: d.projectType || 'residential',
          installationType: d.installationType || 'rooftop',

          // Equipment Items
          equipmentItems: d.equipmentItems || d.items?.map(item => ({
            component: item.name || item.component,
            brand: item.brand || '',
            description: item.description || '',
            quantity: item.quantity || 0
          })) || [],
          items: d.items || [],

          // Costs
          equipmentCost: d.equipmentCost || 0,
          installationCost: d.installationCost || 0,
          engineeringCost: d.engineeringCost || 0,
          transportationCost: d.transportationCost || 0,
          miscellaneousCost: d.miscellaneousCost || 0,
          discount: d.discount || 0,

          // Financial Summary
          subtotal: d.subtotal || d.total || 0,
          gstRate: d.taxRate || d.gstRate || 18,
          gstAmount: d.taxAmount || d.gstAmount || 0,
          total: d.total || 0,

          // Status & Dates
          status: (d.status || 'draft').toLowerCase(),
          validUntil: d.validUntil || null,
          createdAt: d.createdAt || new Date().toISOString(),
          sentAt: d.sentAt || null,
          viewedAt: d.viewedAt || null,
          acceptedAt: d.acceptedAt || null,
          rejectedAt: d.rejectedAt || null,

          // Terms & Notes
          terms: d.terms || d.notes || '',
          notes: d.notes || '',

          // Benefits (calculated if not provided)
          benefits: d.benefits || {
            yearlySavings: Math.round((d.systemCapacity || 0) * 15000),
            co2Reduction: Math.round((d.systemCapacity || 0) * 1.3 * 10) / 10,
            paybackPeriod: d.total > 0 && (d.systemCapacity || 0) > 0
              ? Math.round(d.total / ((d.systemCapacity || 0) * 15000) * 10) / 10
              : 0,
            warrantyYears: 25
          },

          // Metadata
          createdBy: d.createdBy || '',
          assignedTo: d.assignedTo || '',
          leadId: d.leadId,
          projectId: d.projectId,
          customerId: d.customerId,
          tenantId: d.tenantId,
        }));

      console.log('[ProposalPage] Formatted proposals:', formatted);
      setProposals(formatted);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleCreateProposal = async (data) => {
    try {
      console.log('[DEBUG] Creating proposal with data:', data);

      // Generate unique documentId with timestamp to avoid duplicates
      const timestamp = Date.now().toString(36).toUpperCase();
      const uniqueId = `PROP-${new Date().getFullYear()}-${timestamp}`;

      // Ensure all fields have default values
      const payload = {
        type: 'proposal',
        documentId: data.proposalNumber || uniqueId,
        title: data.projectName || data.subject || 'New Solar Proposal',
        description: data.projectDescription || data.description || '',
        customerName: data.customerName || data.to || 'Unknown Customer',
        customerEmail: data.customerEmail || data.email || '',
        customerPhone: data.customerPhone || data.phone || '',
        customerAddress: data.customerAddress || [data.address, data.city, data.state, data.country, data.zipCode].filter(Boolean).join(', ') || '',
        // Keep individual address fields for canvas display
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        zipCode: data.zipCode || '',
        companyName: data.companyName || '',

        // System details
        systemCapacity: data.systemCapacity || 0,
        projectType: data.projectType || 'residential',
        installationType: data.installationType || 'rooftop',
        projectLocation: data.projectLocation || '',

        // Equipment items - ensure proper format
        items: (data.items || []).map(item => ({
          name: item.name || item.component || item.description || 'Item',
          description: item.description || item.longDescription || '',
          brand: item.brand || '',
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice || item.rate) || 0,
          total: parseFloat(item.total || (item.quantity * item.unitPrice)) || 0
        })),
        equipmentItems: (data.items || []).map(item => ({
          component: item.name || item.component || 'Item',
          brand: item.brand || '',
          description: item.description || item.longDescription || '',
          quantity: parseInt(item.quantity) || 1
        })),

        // Costs - ensure numbers
        equipmentCost: parseFloat(data.equipmentCost) || 0,
        installationCost: parseFloat(data.installationCost) || 0,
        engineeringCost: parseFloat(data.engineeringCost) || 0,
        transportationCost: parseFloat(data.transportationCost) || 0,
        miscellaneousCost: parseFloat(data.miscellaneousCost) || 0,
        discount: parseFloat(data.discount) || 0,

        // Financials
        subtotal: parseFloat(data.subtotal || data.subTotal || 0),
        taxRate: parseFloat(data.taxRate || data.gstRate) || 18,
        taxAmount: parseFloat(data.taxAmount || data.gstAmount) || 0,
        total: parseFloat(data.total) || 0,

        // Status
        status: data.status || 'draft',
        validUntil: data.validUntil || data.openTill || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

        // Terms & Notes
        terms: data.terms || '',
        notes: data.notes || '',

        // Benefits
        benefits: data.benefits || {
          yearlySavings: Math.round((data.systemCapacity || 5) * 15000),
          co2Reduction: Math.round((data.systemCapacity || 5) * 1.3 * 10) / 10,
          paybackPeriod: 5,
          warrantyYears: 25
        }
      };

      console.log('[DEBUG] Payload being sent to API:', payload);

      const response = await documentsApi.create(payload);
      console.log('[DEBUG] API Response:', response);

      toast.success('Proposal created successfully!');
      fetchProposals();
      setIsCreateModalOpen(false);

      // Open canvas editor with the newly created proposal data
      const newProposal = response.data || { ...payload, id: response.id || Date.now() };
      setSelectedProposal(newProposal);
      setIsCanvasEditorOpen(true);
    } catch (error) {
      console.error('[DEBUG] Error creating proposal:', error);
      console.error('[DEBUG] Error status:', error?.status);
      console.error('[DEBUG] Error message:', error?.message);
      console.error('[DEBUG] Error data:', error?.data);

      // Show detailed error message
      const errorMsg = error?.message || 'Failed to create proposal';
      const errorDetails = error?.data?.errors?.map(e => e.message).join(', ') || '';
      toast.error(`${errorMsg}${errorDetails ? ': ' + errorDetails : ''}`);
    }
  };

  const handleConvertFromEstimate = (estimate) => {
    const convertedProposal = {
      id: `PROP-${String(proposals.length + 1).padStart(3, '0')}`,
      proposalNumber: generateProposalNumber(proposals),
      estimateId: estimate.id,
      customerName: estimate.customerName,
      companyName: estimate.companyName || '',
      customerEmail: estimate.customerEmail || '',
      customerPhone: estimate.customerPhone || '',
      customerAddress: estimate.customerAddress || '',
      projectLocation: estimate.projectLocation,
      projectName: estimate.projectName,
      systemCapacity: estimate.systemCapacity,
      projectType: estimate.projectType,
      installationType: estimate.installationType,
      projectDescription: estimate.projectDescription || '',
      equipmentItems: estimate.items?.map(item => ({
        component: item.name,
        brand: item.brand,
        description: item.description,
        quantity: item.quantity
      })) || [],
      equipmentCost: estimate.equipmentCost || 0,
      installationCost: estimate.installationCost || 0,
      engineeringCost: estimate.engineeringCost || 0,
      transportationCost: estimate.transportationCost || 0,
      miscellaneousCost: estimate.miscellaneousCost || 0,
      discount: 0,
      subtotal: estimate.subtotal || 0,
      gstRate: estimate.gstRate || 18,
      gstAmount: estimate.gstAmount || 0,
      total: estimate.total || 0,
      status: 'draft',
      benefits: {
        yearlySavings: Math.round(estimate.systemCapacity * 15000),
        co2Reduction: Math.round(estimate.systemCapacity * 1.3 * 10) / 10,
        paybackPeriod: Math.round(estimate.total / (estimate.systemCapacity * 15000) * 10) / 10,
        warrantyYears: 25
      },
      terms: estimate.terms || '50% advance, 50% on completion. 5 year warranty on installation. 30 years performance warranty on solar panels.',
      notes: estimate.notes || '',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setProposals([convertedProposal, ...proposals]);
    setIsConvertModalOpen(false);
    setSelectedProposal(convertedProposal);
    setIsEditMode(true);
  };

  const handleUpdateProposal = async (id, data) => {
    try {
      const payload = {
        title: data.projectName,
        description: data.projectDescription || '',
        customerName: data.customerName,
        customerEmail: data.customerEmail || '',
        customerPhone: data.customerPhone || '',
        customerAddress: data.customerAddress || data.projectLocation || '',
        companyName: data.companyName || '',

        // System details
        systemCapacity: data.systemCapacity || 0,
        projectType: data.projectType || 'residential',
        installationType: data.installationType || 'rooftop',
        projectLocation: data.projectLocation || '',

        // Equipment items
        items: data.equipmentItems?.map(item => ({
          name: item.component,
          description: item.description,
          brand: item.brand,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          total: item.total || 0
        })) || [],
        equipmentItems: data.equipmentItems || [],

        // Costs
        equipmentCost: data.equipmentCost || 0,
        installationCost: data.installationCost || 0,
        engineeringCost: data.engineeringCost || 0,
        transportationCost: data.transportationCost || 0,
        miscellaneousCost: data.miscellaneousCost || 0,
        discount: data.discount || 0,

        // Financials
        subtotal: data.subtotal || 0,
        taxRate: data.gstRate || 18,
        taxAmount: data.gstAmount || 0,
        total: data.total || 0,

        // Terms & Notes
        terms: data.terms || '',
        notes: data.notes || ''
      };

      await documentsApi.update(id, payload);
      toast.success('Proposal updated successfully');
      fetchProposals();
      setSelectedProposal(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error('Failed to update proposal');
    }
  };

  const handleDeleteProposal = async (id) => {
    if (window.confirm('Are you sure you want to delete this proposal?')) {
      try {
        await documentsApi.delete(id);
        toast.success('Proposal deleted');
        fetchProposals();
      } catch (error) {
        console.error('Error deleting proposal:', error);
        toast.error('Failed to delete proposal');
      }
    }
  };

  const handleDuplicateProposal = async (proposal) => {
    try {
      const result = await documentsApi.duplicate(proposal.id);
      toast.success('Proposal duplicated');
      fetchProposals();
    } catch (error) {
      console.error('Error duplicating proposal:', error);
      toast.error('Failed to duplicate proposal');
    }
  };

  const handleDownloadPDF = (proposal) => {
    downloadRayzonPDF(proposal);
  };

  const handleSendProposal = async (id) => {
    try {
      await documentsApi.update(id, { status: 'sent', sentAt: new Date().toISOString() });
      toast.success('Proposal sent');
      fetchProposals();
    } catch (error) {
      console.error('Error sending proposal:', error);
      toast.error('Failed to send proposal');
    }
  };

  const handleMarkViewed = async (id) => {
    try {
      await documentsApi.update(id, { status: 'viewed', viewedAt: new Date().toISOString() });
      toast.success('Proposal marked as viewed');
      fetchProposals();
    } catch (error) {
      console.error('Error marking proposal as viewed:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAcceptProposal = async (id) => {
    try {
      await documentsApi.update(id, { status: 'accepted', acceptedAt: new Date().toISOString() });
      toast.success('Proposal accepted');
      fetchProposals();
    } catch (error) {
      console.error('Error accepting proposal:', error);
      toast.error('Failed to accept proposal');
    }
  };

  const handleRejectProposal = async (id) => {
    try {
      await documentsApi.update(id, { status: 'rejected', rejectedAt: new Date().toISOString() });
      toast.success('Proposal rejected');
      fetchProposals();
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      toast.error('Failed to reject proposal');
    }
  };

  // Debug viewMode changes
  useEffect(() => {
    console.log('[ProposalPage] viewMode changed to:', viewMode);
  }, [viewMode]);

  const handleMarkAsCompleted = async (doc) => {
    if (!window.confirm(`Mark ${doc.proposalNumber} as completed?`)) return;
    try {
      await documentsApi.update(doc.id, { status: 'accepted' });
      toast.success('Proposal marked as completed');
      fetchProposals();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleApproveAndCreateProject = async (doc) => {
    if (!window.confirm(`Approve ${doc.proposalNumber} and create project?`)) return;
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
          category: 'Miscellaneous',
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.total
        })) || []
      };
      await api.post('/projects', projectData);
      await documentsApi.update(doc.id, { status: 'accepted' });
      toast.success('Project created successfully!');
      fetchProposals();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsProcessing(false);
      setActionMenuOpen(null);
    }
  };

  const handleSendEmailAction = async (doc) => {
    if (!window.confirm(`Send email to ${doc.customerEmail}?`)) return;
    try {
      handleSendProposal(doc.id);
      toast.success('Email trigger initiated');
    } catch (error) {
      toast.error('Failed to send email');
    }
  };

  const handleSendEmail = async (doc) => {
    if (!doc.customerEmail) {
      toast.error('No customer email available');
      return;
    }
    // Open canvas editor with email input visible
    setSelectedProposal(doc);
    setShowEmailOnCanvasOpen(true);
    setIsCanvasEditorOpen(true);
    setShowDetailPanel(false);
  };

  const handleProposalClick = (proposal) => {
    setSelectedProposal(proposal);
    setShowDetailPanel(true);
    setDetailTab('proposal');
  };

  const handleCloseDetail = () => {
    setShowDetailPanel(false);
    // Keep selectedProposal so we can reopen with arrow
  };

  // ── Open Canvas Editor with Proposal Data ───────────────────────────────────
  const handleOpenCanvasEditor = (proposal) => {
    setSelectedProposal(proposal);
    setShowEmailOnCanvasOpen(false);
    setIsCanvasEditorOpen(true);
    setShowDetailPanel(false);
  };

  // ── Table Columns ─────────────────────────────────────────────────────────
  const tableColumns = [
    {
      key: 'proposalNumber',
      header: 'Proposal #',
      render: v => <span className="text-xs font-medium text-[var(--red)] hover:text-[var(--red)] cursor-pointer">{v}</span>,
    },
    {
      key: 'projectName',
      header: 'Subject',
      render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span>,
    },
    {
      key: 'customerName',
      header: 'To',
      render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: v => <span className="text-xs font-medium text-[var(--text-primary)]">{CURRENCY.formatExact(v)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: v => <span className="text-xs text-[var(--text-secondary)]">{new Date(v).toISOString().split('T')[0]}</span>,
    },
    {
      key: 'validUntil',
      header: 'Open Till',
      render: v => <span className="text-xs text-[var(--text-secondary)]">{v || '—'}</span>,
    },
    {
      key: 'projectLocation',
      header: 'Project',
      render: v => <span className="text-xs text-[var(--text-secondary)]">{v || '—'}</span>,
    },
    {
      key: 'tags',
      header: 'Tags',
      render: v => <span className="text-xs text-[var(--text-muted)]">—</span>,
    },
    {
      key: 'createdAt',
      header: 'Date Created',
      render: v => <span className="text-xs text-[var(--text-secondary)]">{new Date(v).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: v => {
        const config = PROPOSAL_STATUS[v] || PROPOSAL_STATUS.draft;
        const isAccepted = v === 'accepted';
        const isOpen = v === 'sent' || v === 'viewed';
        return (
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-medium ${isAccepted
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : isOpen
                ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-base)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
              }`}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (v, doc) => (
        <div className="flex items-center gap-1">
          <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <Eye size={14} />
          </button>
              <button className="p-1 text-[var(--text-muted)] hover:text-[var(--primary)]">
            <Edit size={14} />
          </button>
          <button
            className={`p-1 transition-colors ${doc.customerEmail
              ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
              : 'text-gray-300 cursor-not-allowed'
              }`}
            disabled={!doc.customerEmail}
            onClick={(e) => {
              e.stopPropagation();
              handleSendEmail(doc);
            }}
            title={doc.customerEmail ? `Send PDF to ${doc.customerEmail}` : 'No email available'}
          >
            <Mail size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-l-4 border-[var(--primary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--blue-bg)] flex items-center justify-center">
              <FileText size={20} className="text-[var(--blue)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Total Proposals</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-l-4 border-[var(--green)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
              <DollarSign size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{(stats.totalValue / 100000).toFixed(1)}L</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Total Value</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.accepted}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Accepted</p>
              <p className="text-[10px] text-[var(--green)]">{(stats.acceptedValue / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pending}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar - Perfex Style */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-base)]">
        <div className="flex items-center gap-2">
          {/* + New Proposal Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-inv)] text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Proposal
          </button>

          {/* Layout Toggle */}
          <div className="flex items-center border border-[var(--border-base)] rounded-lg overflow-hidden">
            <button className="p-2 bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] border-r border-[var(--border-base)]">
              <LayoutGrid size={16} />
            </button>
            <button className="p-2 bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]">
              <List size={16} />
            </button>
          </div>

          {/* Canvas Editor Button */}
          <button
            onClick={() => setIsCanvasEditorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-inv)] text-sm font-medium transition-colors"
            title="Open Visual Canvas Editor"
          >
            <Sparkles size={16} />
            Canvas Editor
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Entries per page */}
          <select className="px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-secondary)] focus:outline-none">
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>

          {/* Export */}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">
            <span>Export</span>
            <ChevronDown size={14} />
          </button>

          {/* Filters */}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">
            <Filter size={14} />
            <span>Filters</span>
          </button>

          {/* Toggle Side Panel Arrow */}
          <button
            onClick={() => {
              if (showDetailPanel) {
                handleCloseDetail();
              } else if (selectedProposal) {
                setShowDetailPanel(true);
              }
            }}
            className={`p-2 rounded-lg border transition-colors ${
              showDetailPanel 
                ? 'bg-[var(--bg-hover)] border-[var(--border-active)] text-[var(--primary)]' 
                : 'bg-[var(--bg-surface)] border-[var(--border-base)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }`}
            title={showDetailPanel ? 'Close side panel' : 'Open side panel'}
          >
            {showDetailPanel ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px] pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-base)]"
            />
          </div>
        </div>
      </div>

      {/* Proposals List - Perfex CRM Style with Side Panel */}
      <div className="flex gap-0">
        {/* Left Side - Table */}
        <div className={`${showDetailPanel ? 'w-[55%]' : 'w-full'} transition-all duration-300`}>
          {filteredProposals.length === 0 ? (
            <div className="bg-[var(--bg-surface)] p-12 text-center rounded-lg border border-[var(--border-base)]">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No proposals found</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">Create your first proposal to get started</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors mx-auto"
              >
                <Plus size={16} />
                Create Proposal
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProposals.map(proposal => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onView={() => handleProposalClick(proposal)}
                  onEdit={() => { handleProposalClick(proposal); setIsEditMode(true); }}
                  onDuplicate={() => handleDuplicateProposal(proposal)}
                  onDelete={() => handleDeleteProposal(proposal.id)}
                  onDownload={() => handleDownloadPDF(proposal)}
                  onSend={() => handleSendProposal(proposal.id)}
                  onAccept={() => handleAcceptProposal(proposal.id)}
                  onReject={() => handleRejectProposal(proposal.id)}
                />
              ))}
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanView proposals={filteredProposals} onCardClick={handleProposalClick} />
          ) : (
            <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-base)] overflow-hidden">
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)]">Proposal #</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)]">Subject</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)]">To</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)]">Total</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)]">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)]">Open Till</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)]">Project</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)]">Tags</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)]">Date Created</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-secondary)]">Status</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-[var(--text-secondary)] w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProposals.map((proposal, index) => (
                      <tr
                        key={proposal.id}
                        className={`border-b border-[var(--border-base)] hover:bg-[var(--bg-elevated)] cursor-pointer ${selectedProposal?.id === proposal.id ? 'bg-[var(--primary)]/10 border-l-4 border-l-[var(--primary)]' : ''}`}
                      >
                        <td className="py-3 px-4 group">
                          <div className="relative">
                            <span
                              className="text-xs font-medium text-red-500 hover:text-red-600 cursor-pointer block"
                              onClick={() => handleOpenCanvasEditor(proposal)}
                            >{proposal.proposalNumber}</span>
                            {/* View | Edit links - visible on hover */}
                            <div className="absolute left-0 top-full mt-0.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenCanvasEditor(proposal); }}
                                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] hover:underline"
                                title="Open in Canvas Editor"
                              >
                                Canvas
                              </button>
                              <span className="text-[10px] text-gray-400">|</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleProposalClick(proposal); }}
                                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] hover:underline"
                              >
                                View
                              </button>
                              <span className="text-[10px] text-gray-400">|</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleProposalClick(proposal); setIsEditMode(true); }}
                                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] hover:underline"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        </td>
                        <td
                          className="py-3 px-4"
                          onClick={() => { setSelectedProposal(proposal); setIsEditMode(true); }}
                        >
                          <span className="text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] cursor-pointer">{proposal.projectName}</span>
                        </td>
                        <td
                          className="py-3 px-4"
                          onClick={() => { setSelectedProposal(proposal); setIsEditMode(true); }}
                        >
                          <span className="text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] cursor-pointer">{proposal.customerName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-medium text-[var(--text-primary)]">{CURRENCY.formatExact(proposal.total)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-[var(--text-secondary)]">{new Date(proposal.createdAt).toISOString().split('T')[0]}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-[var(--text-secondary)]">{proposal.validUntil || '—'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-[var(--text-secondary)]">{proposal.projectLocation || '—'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-[var(--text-muted)]">—</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-[var(--text-secondary)]">{new Date(proposal.createdAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\//g, '-')}</span>
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const config = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.draft;
                            const isAccepted = proposal.status === 'accepted';
                            const isOpen = proposal.status === 'sent' || proposal.status === 'viewed';
                            return (
                              <span
                                className={`px-3 py-1 rounded-full text-[11px] font-medium ${isAccepted
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : isOpen
                                    ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-base)]'
                                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                                  }`}
                              >
                                {config.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSendEmail(proposal); }}
                            disabled={!proposal.customerEmail}
                            className={`p-1 transition-colors ${proposal.customerEmail
                              ? 'text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-elevated)]'
                              : 'text-[var(--text-muted)]/50 cursor-not-allowed'
                              }`}
                            title={proposal.customerEmail ? `Send PDF to ${proposal.customerEmail}` : 'No email available'}
                          >
                            <Mail size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-t border-[var(--border-base)]">
                <div className="text-xs text-[var(--text-muted)]">
                  Showing 1 to {filteredProposals.length} of {filteredProposals.length} entries
                </div>
                <div className="flex items-center gap-1">
                  <button className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-50" disabled>
                    Previous
                  </button>
                  <button className="px-3 py-1 text-xs font-medium text-[var(--primary-inv)] bg-[var(--text-muted)] rounded">
                    1
                  </button>
                  <button className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-50" disabled>
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Detail Panel */}
        {showDetailPanel && selectedProposal && (
          <div className="w-[45%] bg-[var(--bg-surface)] border-l border-[var(--border-base)] min-h-[calc(100vh-200px)]">
            <ProposalSidePanel
              proposal={selectedProposal}
              activeTab={detailTab}
              onTabChange={setDetailTab}
              onClose={handleCloseDetail}
              onEdit={() => setIsEditMode(true)}
              onSend={() => handleSendProposal(selectedProposal.id)}
              onAccept={() => handleAcceptProposal(selectedProposal.id)}
              onReject={() => handleRejectProposal(selectedProposal.id)}
              onDownload={() => handleDownloadPDF(selectedProposal)}
              onReminderClick={() => setIsReminderModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={Boolean(isCreateModalOpen || (selectedProposal && isEditMode))}
        onClose={() => { setIsCreateModalOpen(false); setSelectedProposal(null); setIsEditMode(false); }}
        title={isEditMode ? 'Edit Proposal' : 'Create Solar Proposal'}
        size="full"
      >
        <CreateProposalWizard
          initialData={isEditMode ? selectedProposal : null}
          projectTypeOptions={projectTypeOptions}
          installationTypeOptions={installationTypeOptions}
          onSubmit={isEditMode ? (data) => handleUpdateProposal(selectedProposal.id, data) : handleCreateProposal}
          onCancel={() => {
            setIsCreateModalOpen(false);
            setSelectedProposal(null);
            setIsEditMode(false);
          }}
        />
      </Modal>

      {/* Convert from Estimate Modal */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert Estimate to Proposal"
        size="lg"
      >
        <ConvertFromEstimate
          estimates={MOCK_ESTIMATES_FOR_CONVERSION}
          onConvert={handleConvertFromEstimate}
          onCancel={() => setIsConvertModalOpen(false)}
        />
      </Modal>

      {/* View Modal - Show same form UI in readOnly mode */}
      {!showDetailPanel && (
        <Modal
          isOpen={Boolean(selectedProposal && !isEditMode)}
          onClose={() => setSelectedProposal(null)}
          title={`Proposal ${selectedProposal?.proposalNumber}`}
          size="full"
        >
          {selectedProposal && (
            <CreateProposalWizard
              initialData={selectedProposal}
              readOnly={true}
              onCancel={() => setSelectedProposal(null)}
              onSubmit={() => { }}
            />
          )}
        </Modal>
      )}

      {/* PDF Template Customizer Modal */}
      <PDFTemplateCustomizer
        isOpen={isPDFCustomizerOpen}
        onClose={() => setIsPDFCustomizerOpen(false)}
        proposalData={selectedProposal || {}}
        onDownload={() => {
          setIsPDFCustomizerOpen(false);
        }}
      />

      {/* Set Proposal Reminder Modal */}
      <Modal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        title="Set Proposal Reminder"
        size="md"
      >
        <div className="space-y-4">
          {/* Date to be notified */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              <span className="text-[var(--red)]">*</span> Date to be notified
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-[var(--border-base)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                defaultValue={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Note</label>
            <textarea
              placeholder="Enter reminder note..."
              rows={3}
              className="w-full px-3 py-2 border border-[var(--border-base)] rounded-lg text-sm resize-y focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsReminderModalOpen(false)}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border-base)] rounded hover:bg-[var(--bg-elevated)]"
            >
              Close
            </button>
            <button
              onClick={() => {
                setIsReminderModalOpen(false);
                toast.success('Reminder set successfully');
              }}
              className="px-4 py-2 text-sm text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Canvas Editor Modal */}
      <Modal
        isOpen={isCanvasEditorOpen}
        onClose={() => {
          setIsCanvasEditorOpen(false);
          setShowEmailOnCanvasOpen(false);
        }}
        title="Visual Proposal Designer (Canva-Style)"
        size="full"
      >
        <ProposalCanvasEditor
          key={`canvas-${selectedProposal?.id || 'new'}`}
          initialData={selectedProposal}
          showEmailOnOpen={showEmailOnCanvasOpen}
          onSave={async (canvasData) => {
            console.log('[Canvas] Saving canvas data:', canvasData);

            if (!selectedProposal?.id && !selectedProposal?.documentId) {
              toast.error('Proposal ID not found. Cannot save canvas.');
              return;
            }

            try {
              // Save canvas data to backend
              const proposalId = selectedProposal.id || selectedProposal.documentId;
              await api.post(`/documents/${proposalId}/canvas`, {
                canvasElements: canvasData.canvasElements,
                canvasSize: canvasData.canvasSize,
                savedAt: new Date().toISOString()
              });

              toast.success('Proposal canvas saved successfully!');
              setIsCanvasEditorOpen(false);
              setShowEmailOnCanvasOpen(false);
              fetchProposals(); // Refresh proposals list
            } catch (error) {
              console.error('[Canvas] Error saving canvas:', error);
              toast.error('Failed to save canvas. Please try again.');
            }
          }}
          onSendEmail={async (pdfBlob, emailData) => {
            console.log('[Canvas] Sending email with PDF:', emailData);

            if (!selectedProposal?.id && !selectedProposal?.documentId) {
              toast.error('Proposal ID not found. Cannot send email.');
              return;
            }

            try {
              const proposalId = selectedProposal.id || selectedProposal.documentId;

              // Convert PDF blob to base64
              const reader = new FileReader();
              reader.readAsDataURL(pdfBlob);
              reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];

                // Send email with PDF via backend
                await api.post(`/documents/${proposalId}/send-pdf`, {
                  sendDto: {
                    email: emailData.email,
                    message: emailData.message
                  },
                  pdfBase64: base64data
                });

                toast.success(`Proposal sent to ${emailData.email}`);
                setIsCanvasEditorOpen(false);
                setShowEmailOnCanvasOpen(false);
                fetchProposals(); // Refresh proposals list
              };
            } catch (error) {
              console.error('[Canvas] Error sending email:', error);
              toast.error('Failed to send email. Please try again.');
            }
          }}
          onCancel={() => {
            setIsCanvasEditorOpen(false);
            setShowEmailOnCanvasOpen(false);
          }}
          readOnly={false}
        />
      </Modal>
    </div>
  );
};

// ── Proposal Card Component ─────────────────────────────────────────────────
const ProposalCard = ({ proposal, onView, onEdit, onDuplicate, onDelete, onDownload, onSend, onAccept, onReject }) => {
  const statusConfig = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="glass-card p-4 space-y-3 hover:scale-[1.01] transition-all cursor-pointer" onClick={onView}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-[var(--primary)] font-semibold">{proposal.proposalNumber}</p>
          <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">{proposal.projectName}</p>
        </div>
        <div
          className="px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1"
          style={{ background: statusConfig.bg, color: statusConfig.color }}
        >
          <StatusIcon size={10} />
          {statusConfig.label}
        </div>
      </div>

      {/* Customer Info */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <User size={12} />
          <span className="line-clamp-1">{proposal.customerName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <MapPin size={12} />
          <span className="line-clamp-1">{proposal.projectLocation}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card p-2 text-center">
          <p className="text-[10px] text-[var(--text-muted)]">System</p>
          <p className="text-sm font-bold text-[var(--text-primary)]">{proposal.systemCapacity} kW</p>
        </div>
        <div className="glass-card p-2 text-center">
          <p className="text-[10px] text-[var(--text-muted)]">Total</p>
          <p className="text-sm font-bold text-[var(--green)]">{(proposal.total / 100000).toFixed(1)}L</p>
        </div>
      </div>

      {/* Benefits Preview */}
      {proposal.benefits && (
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <Leaf size={10} className="text-green-500" />
            {proposal.benefits.co2Reduction} Tons CO₂
          </span>
          <span className="flex items-center gap-1">
            <Gauge size={10} className="text-[var(--primary)]" />
            {proposal.benefits.yearlySavings >= 100000
              ? `${(proposal.benefits.yearlySavings / 100000).toFixed(1)}L/yr`
              : `${proposal.benefits.yearlySavings.toLocaleString()}/yr`
            }
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-[var(--border-base)]">
        {proposal.status === 'draft' && (
          <button
            onClick={(e) => { e.stopPropagation(); onSend(); }}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--primary)] text-white text-[10px] font-medium hover:opacity-90 transition-opacity"
          >
            <Send size={10} />
            Send
          </button>
        )}
        {proposal.status === 'sent' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-medium hover:opacity-90 transition-opacity"
            >
              <CheckCircle size={10} />
              Accept
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              className="flex items-center justify-center p-1.5 rounded-lg bg-red-400 text-white hover:opacity-90 transition-opacity"
            >
              <XCircle size={14} />
            </button>
          </>
        )}
        {proposal.status === 'viewed' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-medium hover:opacity-90 transition-opacity"
            >
              <CheckCircle size={10} />
              Accept
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              className="flex items-center justify-center p-1.5 rounded-lg bg-red-400 text-white hover:opacity-90 transition-opacity"
            >
              <XCircle size={14} />
            </button>
          </>
        )}
        {(proposal.status === 'accepted' || proposal.status === 'rejected') && (
          <div className="flex-1 text-center text-[10px] text-[var(--text-muted)] py-1.5">
            {proposal.status === 'accepted' ? (
              <span className="flex items-center justify-center gap-1 text-green-500">
                <BadgeCheck size={14} />
                Accepted
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1 text-[var(--red)]">
                <XSquare size={14} />
                Rejected
              </span>
            )}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          title="Download Proposal"
        >
          <FileText size={14} />
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

// ── Convert From Estimate Component ───────────────────────────────────────
const ConvertFromEstimate = ({ estimates, onConvert, onCancel }) => {
  const [selectedEstimate, setSelectedEstimate] = useState(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Select an estimate to convert into a professional proposal. All data will be copied and can be edited before finalizing.
      </p>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {estimates.map(estimate => (
          <div
            key={estimate.id}
            onClick={() => setSelectedEstimate(estimate)}
            className={cn(
              'p-4 rounded-xl border cursor-pointer transition-all',
              selectedEstimate?.id === estimate.id
                ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                : 'border-[var(--border-base)] hover:border-[var(--primary)]/50'
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono text-[var(--primary)]">{estimate.id}</p>
                <p className="font-medium text-[var(--text-primary)]">{estimate.projectName}</p>
                <p className="text-sm text-[var(--text-muted)]">{estimate.customerName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[var(--green)]">{CURRENCY.formatExact(estimate.total)}</p>
                <p className="text-xs text-[var(--text-muted)]">{estimate.systemCapacity} kW</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-base)]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => selectedEstimate && onConvert(selectedEstimate)}
          disabled={!selectedEstimate}
        >
          <RefreshCw size={16} className="mr-1.5" />
          Convert to Proposal
        </Button>
      </div>
    </div>
  );
};

// ── Create Proposal Wizard Component (Perfex CRM Style) ─────────────────────
const CreateProposalWizard = ({
  initialData,
  projectTypeOptions = DEFAULT_PROJECT_TYPES,
  installationTypeOptions = DEFAULT_INSTALLATION_TYPES,
  onSubmit,
  onCancel,
  readOnly = false,
}) => {
  // Transform initial data to new form structure
  const transformInitialData = (data) => {
    if (!data) return null;

    // Parse address into components
    const addressParts = (data.customerAddress || '').split(',').map(p => p.trim());
    const city = data.projectLocation?.split(',')[0] || addressParts[1] || '';
    const state = data.projectLocation?.split(',')[1]?.trim() || addressParts[2] || '';

    return {
      // Header Info
      subject: data.projectName || data.title || '',
      related: data.related || '',
      date: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      openTill: data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: data.currency || 'USD',
      discountType: data.discountType || 'no_discount',
      tags: data.tags || '',
      allowComments: data.allowComments !== false,

      // Status & Assignment
      status: data.status || 'draft',
      assignedTo: data.assignedTo || '',
      to: data.customerName || data.to || '',

      // Address
      address: addressParts[0] || data.customerAddress || '',
      city: city,
      state: state,
      country: data.country || '',
      zipCode: data.zipCode || '',
      email: data.customerEmail || data.email || '',
      phone: data.customerPhone || data.phone || '',

      // Items - map from equipmentItems or items
      items: (data.items || data.equipmentItems || []).map((item, idx) => ({
        id: item.id || Date.now() + idx,
        description: item.name || item.component || item.description || '',
        longDescription: item.description || item.longDescription || '',
        quantity: item.quantity || 1,
        unit: item.unit || '',
        rate: item.unitPrice || item.rate || 0,
        tax: item.tax || 'No Tax',
        amount: (item.quantity || 1) * (item.unitPrice || item.rate || 0),
        isOptional: item.isOptional || false
      })),

      // Cost Fields
      equipmentCost: data.equipmentCost || 0,
      installationCost: data.installationCost || 0,
      engineeringCost: data.engineeringCost || 0,
      transportationCost: data.transportationCost || 0,
      miscellaneousCost: data.miscellaneousCost || 0,
      gstRate: data.gstRate || data.taxRate || 18,
      gstAmount: data.gstAmount || data.taxAmount || 0,

      // Financial Summary
      subtotal: data.subtotal || data.total || 0,
      discount: data.discount || 0,
      discountType: data.discountType || 'percentage',
      adjustment: data.adjustment || 0,
      total: data.total || 0,

      // Project Details
      systemCapacity: data.systemCapacity || '',
      projectType: data.projectType || 'residential',
      installationType: data.installationType || 'rooftop',
      projectLocation: data.projectLocation || '',
      companyName: data.companyName || '',

      // Terms
      terms: data.terms || data.notes || '',
    };
  };

  const defaultFormData = {
    // Header Info
    subject: '',
    related: '',
    date: new Date().toISOString().split('T')[0],
    openTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'USD',
    discountType: 'no_discount',
    tags: '',
    allowComments: true,

    // Status & Assignment
    status: 'draft',
    assignedTo: '',
    to: '',

    // Address
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    email: '',
    phone: '',

    // Items
    items: [],

    // Cost Fields
    equipmentCost: 0,
    installationCost: 0,
    engineeringCost: 0,
    transportationCost: 0,
    miscellaneousCost: 0,
    gstRate: 18,
    gstAmount: 0,

    // Totals
    subtotal: 0,
    discount: 0,
    discountType: 'percentage',
    adjustment: 0,
    total: 0,

    // Project Details
    systemCapacity: '',
    projectType: 'residential',
    installationType: 'rooftop',
    projectLocation: '',
    companyName: '',

    // Terms
    terms: '',
  };

  const [formData, setFormData] = useState(() => {
    const transformed = transformInitialData(initialData);
    return transformed || defaultFormData;
  });

  const [showQtyAs, setShowQtyAs] = useState('qty'); // 'qty' | 'hours' | 'qty/hours'
  const [editingItem, setEditingItem] = useState(null);
  
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
    description: '',
    longDescription: '',
    quantity: 1,
    unit: '',
    rate: 0,
    tax: 'No Tax',
    isOptional: false,
    inventoryItemId: null
  });

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const discountAmount = formData.discountType === 'percentage'
      ? (subtotal * (formData.discount || 0) / 100)
      : (formData.discount || 0);
    const adjustment = formData.adjustment || 0;
    const total = subtotal - discountAmount + adjustment;

    return { subtotal, discountAmount, total };
  };

  const handleAddItem = () => {
    if (!newItem.description) return;

    const item = {
      ...newItem,
      id: Date.now(),
      amount: newItem.quantity * newItem.rate
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    setNewItem({
      description: '',
      longDescription: '',
      quantity: 1,
      unit: '',
      rate: 0,
      tax: 'No Tax',
      isOptional: false,
      inventoryItemId: null
    });
    setSelectedInventoryItem('');
    setEditingItem(null);
  };

  const handleRemoveItem = (id) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleSubmit = (send = false) => {
    console.log('[DEBUG] handleSubmit called with send=', send);
    console.log('[DEBUG] onSubmit prop is:', typeof onSubmit);
    console.log('[DEBUG] Form data before submit:', formData);

    if (!onSubmit || typeof onSubmit !== 'function') {
      console.error('[DEBUG] ERROR: onSubmit is not a function!');
      alert('Error: onSubmit function is not defined');
      return;
    }

    // Use default values if fields are empty
    const subject = formData.subject?.trim() || 'New Solar Proposal';
    const customerName = formData.to?.trim() || 'Unknown Customer';
    const email = formData.email?.trim() || '';

    const totals = calculateTotals();
    console.log('[DEBUG] Calculated totals:', totals);

    const payload = {
      ...formData,
      ...totals,
      subject,
      to: customerName,
      projectName: subject,
      customerName: customerName,
      customerEmail: email,
      customerPhone: formData.phone || '',
      // Keep individual address fields for canvas
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      country: formData.country || '',
      zipCode: formData.zipCode || '',
      customerAddress: [formData.address, formData.city, formData.state, formData.country, formData.zipCode].filter(Boolean).join(', ') || '',
      projectLocation: [formData.city, formData.state].filter(Boolean).join(', ') || '',
      validUntil: formData.openTill || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total: totals.total || 0,
      status: send ? 'sent' : (formData.status || 'draft'),
      // Ensure items is always an array
      items: formData.items || [],
      equipmentItems: formData.items || []
    };

    console.log('[DEBUG] Final payload:', payload);
    onSubmit(payload);
  };

  // Base classes for inputs - changes based on readOnly mode
  const inputBaseClass = readOnly
    ? "w-full px-3 py-2 border border-[var(--border-base)] rounded text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] cursor-default"
    : "w-full px-3 py-2 border border-[var(--border-base)] rounded text-sm focus:outline-none focus:border-[var(--primary)] bg-[var(--bg-surface)] text-[var(--text-primary)]";

  const selectBaseClass = readOnly
    ? "w-full px-3 py-2 border border-[var(--border-base)] rounded text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] cursor-default appearance-none"
    : "w-full px-3 py-2 border border-[var(--border-base)] rounded text-sm focus:outline-none focus:border-[var(--primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)]";

  const { subtotal, discountAmount, total } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* DEBUG TEST BUTTON */}
      {!readOnly && (
        <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
          <p className="text-sm text-yellow-800 mb-2">Debug: Test if buttons work</p>
          <button
            type="button"
            onClick={() => window.alert('TEST BUTTON CLICKED!')}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            CLICK ME TO TEST
          </button>
        </div>
      )}

      {/* Header - Only show in readOnly mode */}
      {readOnly && initialData && (
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-base)]">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--blue-bg)] flex items-center justify-center">
                <FileText size={20} className="text-[var(--blue)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{initialData.proposalNumber}</h2>
              <p className="text-xs text-[var(--text-muted)]">Proposal Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${initialData.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
              initialData.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                initialData.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
              }`}>
              {initialData.status?.toUpperCase() || 'DRAFT'}
            </span>
          </div>
        </div>
      )}

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              <span className="text-[var(--red)]">*</span> Subject
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => !readOnly && setFormData({ ...formData, subject: e.target.value })}
              className={inputBaseClass}
              placeholder="Enter proposal subject"
              readOnly={readOnly}
            />
          </div>

          {/* Related */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Related</label>
            <select
              value={formData.related}
              onChange={(e) => !readOnly && setFormData({ ...formData, related: e.target.value })}
              disabled={readOnly}
              className={selectBaseClass}
            >
              <option value="">Nothing selected</option>
              <option value="lead">Lead</option>
              <option value="customer">Customer</option>
              <option value="project">Project</option>
            </select>
          </div>

          {/* Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => !readOnly && setFormData({ ...formData, date: e.target.value })}
                readOnly={readOnly}
                className={inputBaseClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Open Till</label>
              <input
                type="date"
                value={formData.openTill}
                onChange={(e) => !readOnly && setFormData({ ...formData, openTill: e.target.value })}
                readOnly={readOnly}
                className={inputBaseClass}
              />
            </div>
          </div>

          {/* Currency & Discount Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => !readOnly && setFormData({ ...formData, currency: e.target.value })}
                disabled={readOnly}
                className={selectBaseClass}
              >
                <option value="USD">USD $</option>
                <option value="INR">INR ₹</option>
                <option value="EUR">EUR €</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Discount Type</label>
              <select
                value={formData.discountType}
                onChange={(e) => !readOnly && setFormData({ ...formData, discountType: e.target.value })}
                disabled={readOnly}
                className={selectBaseClass}
              >
                <option value="no_discount">No discount</option>
                <option value="percentage">Percentage %</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              <span className="text-[var(--text-muted)]">#</span> Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => !readOnly && setFormData({ ...formData, tags: e.target.value })}
              readOnly={readOnly}
              className={inputBaseClass}
              placeholder="Enter tags separated by comma"
            />
          </div>

          {/* Allow Comments Toggle */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Allow Comments</label>
            <button
              type="button"
              onClick={() => !readOnly && setFormData({ ...formData, allowComments: !formData.allowComments })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.allowComments ? 'bg-blue-500' : 'bg-gray-300'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.allowComments ? 'translate-x-5' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Status & Assigned */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                <span className="text-[var(--red)]">*</span> Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => !readOnly && setFormData({ ...formData, status: e.target.value })}
                disabled={readOnly}
                className={selectBaseClass}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Assigned</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => !readOnly && setFormData({ ...formData, assignedTo: e.target.value })}
                disabled={readOnly}
                className={selectBaseClass}
              >
                <option value="">Ezekiel Shoran</option>
                <option value="user1">User 1</option>
                <option value="user2">User 2</option>
              </select>
            </div>
          </div>

          {/* To */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              <span className="text-[var(--red)]">*</span> To (Customer Name)
            </label>
            <input
              type="text"
              value={formData.to}
              onChange={(e) => !readOnly && setFormData({ ...formData, to: e.target.value })}
              className={inputBaseClass}
              placeholder="Enter customer name"
              readOnly={readOnly}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => !readOnly && setFormData({ ...formData, address: e.target.value })}
              readOnly={readOnly}
              className={`${inputBaseClass} resize-none`}
              rows={2}
              placeholder="Enter address"
            />
          </div>

          {/* City, State, Country, Zip */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => !readOnly && setFormData({ ...formData, city: e.target.value })}
                readOnly={readOnly}
                className={inputBaseClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => !readOnly && setFormData({ ...formData, state: e.target.value })}
                readOnly={readOnly}
                className={inputBaseClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Country</label>
              <select
                value={formData.country}
                onChange={(e) => !readOnly && setFormData({ ...formData, country: e.target.value })}
                disabled={readOnly}
                className={selectBaseClass}
              >
                <option value="">Nothing selected</option>
                <option value="US">United States</option>
                <option value="IN">India</option>
                <option value="UK">United Kingdom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Zip Code</label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => !readOnly && setFormData({ ...formData, zipCode: e.target.value })}
                readOnly={readOnly}
                className={inputBaseClass}
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                <span className="text-[var(--red)]">*</span> Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => !readOnly && setFormData({ ...formData, email: e.target.value })}
                readOnly={readOnly}
                className={inputBaseClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => !readOnly && setFormData({ ...formData, phone: e.target.value })}
                readOnly={readOnly}
                className={inputBaseClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="border-t border-[var(--border-base)] pt-6">
        {!readOnly && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <select
                value={editingItem !== null ? "custom" : "Add Item"}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setEditingItem(Date.now());
                  }
                }}
                className="px-3 py-2 border border-[var(--border-base)] rounded text-sm focus:outline-none focus:border-[var(--primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              >
                <option>Add Item</option>
                <option value="custom">Custom Item</option>
              </select>
              
              {/* Inventory Item Selection */}
              <select
                value={selectedInventoryItem}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setSelectedInventoryItem(selectedId);
                  if (selectedId) {
                    const item = inventoryItems.find(i => (i.itemId || i._id || i.id) === selectedId);
                    if (item) {
                      setNewItem({
                        description: item.description || item.name || '',
                        longDescription: item.longDescription || '',
                        quantity: 1,
                        unit: item.unit || '',
                        rate: item.rate || 0,
                        tax: 'No Tax',
                        isOptional: false,
                        inventoryItemId: item.itemId || item._id || item.id,
                        category: item.category || ''
                      });
                      setEditingItem(Date.now());
                    }
                  }
                }}
                className="px-3 py-2 border border-[var(--border-base)] rounded text-sm focus:outline-none focus:border-[var(--primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              >
                <option value="">📦 From Inventory</option>
                {inventoryItems.map(item => {
                  const itemId = item.itemId || item._id || item.id;
                  const itemName = item.description || item.name || 'Unnamed Item';
                  const stock = item.available ?? item.stock ?? 0;
                  const isOutOfStock = stock <= 0;
                  return (
                      <option key={itemId} value={itemId} className={isOutOfStock ? 'text-[var(--red)]' : ''}>
                      {itemName} {isOutOfStock ? '⚠️ Out of Stock' : ''}
                    </option>
                  );
                })}
              </select>
              
              <button
                onClick={fetchInventoryData}
                className="w-8 h-8 flex items-center justify-center border border-[var(--border-base)] rounded text-[var(--primary)] hover:bg-[var(--bg-hover)]"
                title="Refresh inventory"
              >
                <RefreshCw size={14} className={isLoadingInventory ? 'animate-spin' : ''} />
              </button>
              
              <button
                onClick={() => setEditingItem(Date.now())}
                className="w-8 h-8 flex items-center justify-center border border-[var(--border-base)] rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--text-muted)]">Show quantity as:</span>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="qtyAs"
                  checked={showQtyAs === 'qty'}
                  onChange={() => setShowQtyAs('qty')}
                  className="w-3 h-3"
                />
                <span>Qty</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="qtyAs"
                  checked={showQtyAs === 'hours'}
                  onChange={() => setShowQtyAs('hours')}
                  className="w-3 h-3"
                />
                <span>Hours</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="qtyAs"
                  checked={showQtyAs === 'qty/hours'}
                  onChange={() => setShowQtyAs('qty/hours')}
                  className="w-3 h-3"
                />
                <span>Qty/Hours</span>
              </label>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="border border-[var(--border-base)] rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--bg-elevated)]">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] w-8"></th>
                <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Item</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Description</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-[var(--text-secondary)] w-16">Qty</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] w-20">Rate</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)] w-24">Tax</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-secondary)] w-24">Amount</th>
                {!readOnly && <th className="text-center py-2 px-3 text-xs font-medium text-[var(--text-secondary)] w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {formData.items.length === 0 && editingItem === null && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--text-muted)] text-sm">
                    No items added. Click + to add an item.
                  </td>
                </tr>
              )}

              {formData.items.map((item, index) => (
                <tr key={item.id} className="border-t border-[var(--border-base)]">
                  <td className="py-2 px-3">
                    <span className="text-xs text-[var(--text-muted)]">{index + 1}</span>
                  </td>
                  <td className="py-2 px-3">
                    {readOnly ? (
                      <span className="text-sm text-[var(--text-primary)]">{item.description}</span>
                    ) : (
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].description = e.target.value;
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="w-full px-2 py-1 border border-[var(--border-base)] rounded text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                        placeholder="Description"
                      />
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {readOnly ? (
                      <span className="text-sm text-[var(--text-muted)]">{item.longDescription}</span>
                    ) : (
                      <input
                        type="text"
                        value={item.longDescription}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].longDescription = e.target.value;
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="w-full px-2 py-1 border border-[var(--border-base)] rounded text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                        placeholder="Long description"
                      />
                    )}
                  </td>
                  <td className="py-2 px-3 text-center text-sm text-[var(--text-secondary)]">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-3 text-sm text-[var(--text-secondary)]">
                    {item.rate?.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-sm text-[var(--text-secondary)]">
                    {item.tax}
                  </td>
                  <td className="py-2 px-3 text-right text-sm font-medium text-[var(--text-primary)]">
                    ${item.amount?.toFixed(2) || '0.00'}
                  </td>
                  {!readOnly && (
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[var(--red)] hover:text-[var(--red)]"
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {/* New Item Row - Only show when not readOnly */}
              {!readOnly && editingItem !== null && (
                  <tr className="border-t border-[var(--border-base)] bg-[var(--bg-hover)]/50">
                  <td className="py-2 px-3">
                    <span className="text-xs text-[var(--text-muted)]">{formData.items.length + 1}</span>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full px-2 py-1 border border-[var(--border-base)] rounded text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      placeholder="Description"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={newItem.longDescription}
                      onChange={(e) => setNewItem({ ...newItem, longDescription: e.target.value })}
                      className="w-full px-2 py-1 border border-[var(--border-base)] rounded text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      placeholder="Long description"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-[var(--border-base)] rounded text-sm text-center bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={newItem.rate}
                      onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-[var(--border-base)] rounded text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={newItem.tax}
                      onChange={(e) => setNewItem({ ...newItem, tax: e.target.value })}
                      className="w-full px-2 py-1 border border-[var(--border-base)] rounded text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    >
                      <option>No Tax</option>
                      <option>GST 5%</option>
                      <option>GST 12%</option>
                      <option>GST 18%</option>
                      <option>GST 28%</option>
                    </select>
                  </td>
                  <td className="py-2 px-3 text-right text-sm font-medium">
                    ${(newItem.quantity * newItem.rate).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={handleAddItem}
                      className="w-6 h-6 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                    >
                      ✓
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Optional Item Checkbox */}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="optionalItem"
            checked={newItem.isOptional}
            onChange={(e) => setNewItem({ ...newItem, isOptional: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="optionalItem" className="text-sm text-[var(--text-secondary)]">
            This item is optional
          </label>
        </div>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end">
        <div className="w-full max-w-md space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Sub Total:</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>

          {formData.discountType !== 'no_discount' && (
            <div className="flex justify-between text-sm items-center">
              <span className="text-[var(--text-secondary)]">Discount {formData.discountType === 'percentage' ? '%' : ''}:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  className="w-20 px-2 py-1 border border-[var(--border-base)] rounded text-sm text-right"
                />
                <span className="text-[var(--text-secondary)] w-16 text-right">-${discountAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between text-sm items-center">
            <span className="text-[var(--text-secondary)]">Adjustment:</span>
            <input
              type="number"
              value={formData.adjustment}
              onChange={(e) => setFormData({ ...formData, adjustment: parseFloat(e.target.value) || 0 })}
              className="w-20 px-2 py-1 border border-[var(--border-base)] rounded text-sm text-right"
            />
          </div>

          <div className="flex justify-between text-base font-bold border-t border-[var(--border-base)] pt-2">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Terms & Footer */}
      <div className="border-t border-[var(--border-base)] pt-4">
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Include proposal items with merge field anywhere in proposal content by using: {'{proposal_items}'}
        </p>

        <div className="flex items-center justify-end gap-3 relative z-50">
          {readOnly ? (
            <>
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-base)] rounded"
              >
                Close
              </button>
              <button
                onClick={() => { }}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  window.alert('Save as Draft clicked!');
                  console.log('[DEBUG] Save as Draft clicked - executing handleSubmit');
                  handleSubmit(false);
                }}
                style={{ position: 'relative', zIndex: 9999 }}
                className="px-4 py-2 text-sm text-white bg-gray-700 hover:bg-gray-800 rounded pointer-events-auto"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  window.alert('Save & Send clicked!');
                  console.log('[DEBUG] Save & Send clicked - executing handleSubmit');
                  handleSubmit(true);
                }}
                style={{ position: 'relative', zIndex: 9999 }}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded pointer-events-auto"
              >
                Save & Send
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Proposal Detail Component ──────────────────────────────────────────────
const ProposalDetail = ({ proposal, onEdit, onDelete, onDownload, onCustomizePDF, onSend, onAccept, onReject }) => {
  const statusConfig = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <DocumentHeader
        company={COMPANY_DATA}
        documentType="Solar Proposal"
        documentNumber={proposal.proposalNumber}
        date={proposal.createdAt}
        customerName={proposal.customerName}
        customerAddress={proposal.customerAddress}
        projectLocation={proposal.projectLocation}
      />

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5"
            style={{ background: statusConfig.bg, color: statusConfig.color }}
          >
            <StatusIcon size={14} />
            {statusConfig.label}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{statusConfig.description}</span>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-[var(--green)]">{CURRENCY.formatExact(proposal.total)}</p>
          <p className="text-xs text-[var(--text-muted)]">Total Project Value</p>
        </div>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4 space-y-3">
          <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <User size={16} className="text-[var(--primary)]" />
            Customer Information
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Name:</span>
              <span className="font-medium">{proposal.customerName}</span>
            </div>
            {proposal.companyName && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Company:</span>
                <span>{proposal.companyName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Phone:</span>
              <span>{proposal.customerPhone}</span>
            </div>
            {proposal.customerEmail && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Email:</span>
                <span>{proposal.customerEmail}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Location:</span>
              <span>{proposal.projectLocation}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 space-y-3">
          <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sun size={16} className="text-[var(--primary)]" />
            Project Details
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Project Name:</span>
              <span className="font-medium">{proposal.projectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">System Capacity:</span>
              <span className="font-medium">{proposal.systemCapacity} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Project Type:</span>
              <span className="capitalize">{proposal.projectType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Installation:</span>
              <span className="capitalize">{proposal.installationType?.replace('_', ' ') || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment List */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Zap size={16} className="text-[var(--primary)]" />
          Solar Equipment ({proposal.equipmentItems?.length || 0} items)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-base)]">
                <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Component</th>
                <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Brand</th>
                <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Description</th>
                <th className="text-center py-2 text-xs font-medium text-[var(--text-muted)]">Qty</th>
              </tr>
            </thead>
            <tbody>
              {proposal.equipmentItems?.map((item, index) => (
                <tr key={index} className="border-b border-[var(--border-base)]/50">
                  <td className="py-2 text-sm font-medium">{item.component}</td>
                  <td className="py-2 text-sm text-[var(--text-muted)]">{item.brand}</td>
                  <td className="py-2 text-sm text-[var(--text-muted)]">{item.description}</td>
                  <td className="py-2 text-center text-sm">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <DollarSign size={16} className="text-[var(--primary)]" />
          Cost Summary
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Equipment Cost</span>
              <span className="font-medium">{CURRENCY.formatExact(proposal.equipmentCost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Installation Cost</span>
              <span>{CURRENCY.formatExact(proposal.installationCost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Engineering Cost</span>
              <span>{CURRENCY.formatExact(proposal.engineeringCost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Transportation</span>
              <span>{CURRENCY.formatExact(proposal.transportationCost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Miscellaneous</span>
              <span>{CURRENCY.formatExact(proposal.miscellaneousCost || 0)}</span>
            </div>
            {proposal.discount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Discount</span>
                <span>-{CURRENCY.formatExact(proposal.discount)}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between pt-4 border-t border-[var(--border-base)]">
              <span className="font-medium">Subtotal</span>
              <span className="font-medium">{CURRENCY.formatExact(proposal.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">GST ({proposal.gstRate || 18}%)</span>
              <span>{CURRENCY.formatExact(proposal.gstAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-[var(--border-base)]">
              <span className="text-[var(--green)]">Grand Total</span>
              <span className="text-[var(--green)]">{CURRENCY.formatExact(proposal.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      {proposal.benefits && (
        <div className="glass-card p-4 space-y-3 bg-gradient-to-r from-green-500/5 to-emerald-500/5 border-green-500/20">
          <h4 className="text-sm font-bold text-green-600 flex items-center gap-2">
            <Sparkles size={16} />
            Project Benefits
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <Leaf size={20} className="text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-600">{proposal.benefits.co2Reduction}</p>
              <p className="text-xs text-[var(--text-muted)]">Tons CO₂/yr</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--green)]/10">
              <DollarSign size={20} className="text-[var(--green)] mx-auto mb-1" />
              <p className="text-lg font-bold text-[var(--green)]">
                {proposal.benefits.yearlySavings >= 100000
                  ? `${(proposal.benefits.yearlySavings / 100000).toFixed(1)}L`
                  : (proposal.benefits.yearlySavings / 1000).toFixed(1) + 'K'
                }
              </p>
              <p className="text-xs text-[var(--text-muted)]">Savings/yr</p>
            </div>
              <div className="text-center p-3 rounded-lg bg-[var(--blue-bg)]">
                <Clock size={20} className="text-[var(--blue)] mx-auto mb-1" />
              <p className="text-lg font-bold text-[var(--blue)]">{proposal.benefits.paybackPeriod}</p>
              <p className="text-xs text-[var(--text-muted)]">Years Payback</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/10">
              <Shield size={20} className="text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-amber-600">{proposal.benefits.warrantyYears}</p>
              <p className="text-xs text-[var(--text-muted)]">Years Warranty</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">Terms & Conditions</h4>
          <p className="text-sm text-[var(--text-muted)] whitespace-pre-line">{proposal.terms}</p>
        </div>
        {proposal.notes && (
          <div className="glass-card p-4">
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">Additional Notes</h4>
            <p className="text-sm text-[var(--text-muted)] whitespace-pre-line">{proposal.notes}</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">Proposal Timeline</h4>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--blue-bg)] flex items-center justify-center">
                <FileText size={14} className="text-[var(--blue)]" />
            </div>
            <div>
              <p className="font-medium">Created</p>
              <p className="text-xs text-[var(--text-muted)]">{new Date(proposal.createdAt).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          {proposal.sentAt && (
            <>
              <ArrowRight size={16} className="text-[var(--text-muted)]" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                  <Send size={14} className="text-[var(--primary)]" />
                </div>
                <div>
                  <p className="font-medium">Sent</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(proposal.sentAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </>
          )}
          {proposal.viewedAt && (
            <>
              <ArrowRight size={16} className="text-[var(--text-muted)]" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Eye size={14} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-medium">Viewed</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(proposal.viewedAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </>
          )}
          {proposal.acceptedAt && (
            <>
              <ArrowRight size={16} className="text-[var(--text-muted)]" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle size={14} className="text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Accepted</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(proposal.acceptedAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[var(--border-base)]">
        {proposal.status === 'draft' && (
          <button
            onClick={onSend}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Send size={16} />
            Send to Client
          </button>
        )}
        {(proposal.status === 'sent' || proposal.status === 'viewed') && (
          <>
            <button
              onClick={onAccept}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <BadgeCheck size={16} />
              Mark Accepted
            </button>
            <button
              onClick={onReject}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-400 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <XCircle size={16} />
              Reject
            </button>
          </>
        )}
        <button
          onClick={onDownload}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          <FileText size={16} />
          Download PDF
        </button>
        <button
          onClick={onCustomizePDF}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-600 text-sm font-medium hover:bg-amber-500/20 transition-colors"
        >
          <Settings size={16} />
          Customize PDF
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

// ── Proposal Side Panel Component (Perfex Style) ─────────────────────────────
const ProposalSidePanel = ({ proposal, activeTab, onTabChange, onClose, onEdit, onSend, onAccept, onReject, onDownload, onReminderClick }) => {
  const tabs = [
    { id: 'proposal', label: 'Proposal' },
    { id: 'comments', label: 'Comments' },
    { id: 'reminders', label: 'Reminders' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'notes', label: 'Notes' },
    { id: 'templates', label: 'Templates' },
  ];

  const statusConfig = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.draft;

  return (
    <div className="h-full flex flex-col">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--border-base)] bg-[var(--bg-elevated)] px-2">
        <div className="flex items-center overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--bg-surface)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 px-2">
          <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <Printer size={16} />
          </button>
          <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <Eye size={16} />
          </button>
          <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <MoreVertical size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-[var(--bg-hover)] border-l-4 border-[var(--primary)] p-3 m-4 rounded">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-primary)]">
            This proposal is {proposal.status} by {proposal.customerName} on {new Date(proposal.createdAt).toISOString().split('T')[0]}
          </span>
          <button className="text-[var(--text-muted)] hover:text-[var(--primary)]">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {activeTab === 'proposal' && (
          <div className="space-y-6">
            {/* Proposal Header */}
            <div className="border-b border-[var(--border-base)] pb-4">
              <h2 className="text-xl font-bold text-[var(--primary)] mb-1">{proposal.proposalNumber}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-3">{proposal.projectName}</p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mb-4">
                <button className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] border border-[var(--border-base)] rounded">
                  <Edit size={16} />
                </button>
                <button className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] border border-[var(--border-base)] rounded">
                  <Send size={16} />
                </button>
                <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-base)] rounded">
                  <FileText size={16} />
                </button>
                <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-base)] rounded">
                  <MoreVertical size={16} />
                </button>
                <button
                  onClick={onAccept}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded"
                >
                  <CheckCircle size={14} />
                  Convert
                </button>
              </div>

              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${proposal.status === 'accepted'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : proposal.status === 'sent' || proposal.status === 'viewed'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-base)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                  }`}
              >
                {statusConfig.label}
              </span>
            </div>

            {/* Company & Customer Info */}
            <div className="grid grid-cols-2 gap-6">
              {/* Company Info */}
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">{COMPANY_DATA.name}</h4>
                <p className="text-xs text-[var(--text-secondary)] mb-1">{COMPANY_DATA.address}</p>
                <p className="text-xs text-[var(--text-secondary)] mb-1">{COMPANY_DATA.city}</p>
                <p className="text-xs text-[var(--text-secondary)]">{COMPANY_DATA.country}</p>
                  <p className="text-xs text-[var(--primary)] mt-2">{COMPANY_DATA.phone}</p>
                  <p className="text-xs text-[var(--primary)]">{COMPANY_DATA.email}</p>
              </div>

              {/* Customer Info */}
              <div className="text-right">
                <p className="text-xs text-[var(--text-muted)] mb-1">To:</p>
                  <h4 className="text-sm font-bold text-[var(--primary)] mb-1">{proposal.customerName}</h4>
                  <p className="text-xs text-[var(--primary)] mt-2">{proposal.customerPhone || '-'}</p>
                  <p className="text-xs text-[var(--primary)]">{proposal.customerEmail || '-'}</p>
              </div>
            </div>

            {/* Available merge fields link */}
            <div className="text-right">
              <button className="text-xs text-[var(--primary)] hover:underline">
                Available merge fields
              </button>
            </div>

            {/* Content Area */}
            <div className="border border-[var(--border-base)] rounded p-4 min-h-[150px]">
              <p className="text-sm text-[var(--text-secondary)]">
                {proposal.projectDescription || proposal.description || 'No description available'}
              </p>
            </div>

            {/* Signature Section */}
            <div className="border-t border-[var(--border-base)] pt-4">
              <div className="flex items-start justify-between">
                <div className="text-xs text-[var(--text-secondary)] space-y-1">
                  <p>Signer Name: {proposal.customerName}</p>
                  <p>Signed Date: {new Date(proposal.createdAt).toISOString().split('T')[0]} 07:52:52</p>
                  <p>IP Address: -</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-red-500 mb-2">✕ Signature (Customer)</p>
                  <div className="w-32 h-16 border border-[var(--border-base)] rounded flex items-center justify-center">
                    <span className="text-2xl font-cursive italic text-[var(--text-muted)]" style={{ fontFamily: 'cursive' }}>
                      {proposal.customerName?.charAt(0) || 'R'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="p-4">
            <textarea
              placeholder="Add a comment..."
              className="w-full h-[100px] p-3 border border-[var(--border-base)] rounded-lg resize-y text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <div className="flex justify-end mt-3">
              <button className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-inv)] text-sm font-medium rounded">
                Add Comment
              </button>
            </div>
          </div>
        )}

        {activeTab === 'reminders' && (
          <div className="p-4 space-y-4">
            {/* Set Proposal Reminder Button */}
            <div>
              <button
                onClick={onReminderClick}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-inv)] text-sm font-medium rounded"
              >
                <Bell size={16} />
                Set Proposal Reminder
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between py-3 border-t border-b border-[var(--border-base)]">
              <div className="flex items-center gap-2">
                <select className="px-2 py-1 text-sm border border-[var(--border-base)] rounded bg-[var(--bg-surface)]">
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <button className="px-3 py-1 text-sm text-[var(--text-secondary)] border border-[var(--border-base)] rounded hover:bg-[var(--bg-elevated)]">
                  Export
                </button>
                <button className="p-1 text-[var(--text-secondary)] border border-[var(--border-base)] rounded hover:bg-[var(--bg-elevated)]">
                  <RefreshCw size={14} />
                </button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-[180px] pl-9 pr-3 py-1 text-sm border border-[var(--border-base)] rounded focus:outline-none"
                />
              </div>
            </div>

            {/* Table */}
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-base)]">
                  <th className="text-left py-2 text-sm font-medium text-[var(--text-secondary)]">Description</th>
                  <th className="text-left py-2 text-sm font-medium text-[var(--text-secondary)]">Date</th>
                  <th className="text-left py-2 text-sm font-medium text-[var(--text-secondary)]">Remind</th>
                  <th className="text-left py-2 text-sm font-medium text-[var(--text-secondary)]">Is notified?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="4" className="py-8 text-center text-[var(--text-muted)] text-sm">
                    No entries found
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="p-4 text-center text-[var(--text-muted)]">
            <CheckSquare size={48} className="mx-auto mb-2 text-[var(--text-muted)]" />
            <p>No tasks yet</p>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="p-4 text-center text-[var(--text-muted)]">
            <FileText size={48} className="mx-auto mb-2 text-[var(--text-muted)]" />
            <p>No notes added</p>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="p-4 text-center text-[var(--text-muted)]">
            <LayoutGrid size={48} className="mx-auto mb-2 text-[var(--text-muted)]" />
            <p>No templates available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Kanban View Component ───────────────────────────────────────────────────
const KanbanView = ({ proposals, onCardClick }) => {
  const columns = [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'sent', label: 'Sent', color: '#3b82f6' },
    { id: 'viewed', label: 'Viewed', color: '#8b5cf6' },
    { id: 'accepted', label: 'Accepted', color: '#22c55e' },
    { id: 'rejected', label: 'Rejected', color: '#ef4444' },
  ];

  const getProposalsByStatus = (status) => proposals.filter(p => p.status === status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {columns.map(column => (
        <div key={column.id} className="glass-card p-3 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-base)]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: column.color }} />
              <span className="text-sm font-bold text-[var(--text-primary)]">{column.label}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
              {getProposalsByStatus(column.id).length}
            </span>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {getProposalsByStatus(column.id).map(proposal => (
              <div
                key={proposal.id}
                onClick={() => onCardClick(proposal)}
                className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] hover:border-[var(--primary)] cursor-pointer transition-all hover:shadow-md"
              >
                <p className="text-xs font-mono text-[var(--primary)]">{proposal.proposalNumber}</p>
                <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-1">{proposal.projectName}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{proposal.customerName}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-[var(--green)]">{CURRENCY.formatExact(proposal.total)}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{proposal.systemCapacity} kW</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProposalPage;

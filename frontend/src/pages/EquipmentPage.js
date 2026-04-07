// Solar OS – Equipment Management Module
// Complete equipment tracking and management system

import React, { useState, useMemo } from 'react';
import {
  Hammer,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit3,
  Trash2,
  Wrench,
  Calendar,
  MapPin,
  User,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  BarChart3,
  TrendingUp,
  Package,
  Settings,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Truck,
  ClipboardList,
  History,
  ScanLine,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { CURRENCY } from '../config/app.config';
import { cn } from '../lib/utils';

const fmt = CURRENCY.format;

// ── Mock Equipment Data ─────────────────────────────────────────────────────
const MOCK_EQUIPMENT = [
  {
    id: 'EQ-001',
    name: 'Solar Panel Lifter',
    category: 'Lifting Equipment',
    brand: 'Schletter',
    model: 'SL-500',
    serialNo: 'SC2024001',
    purchaseDate: '2023-06-15',
    purchasePrice: 850000,
    condition: 'good',
    status: 'available',
    location: 'Surat Warehouse',
    assignedTo: null,
    lastMaintenance: '2024-01-20',
    nextMaintenance: '2024-07-20',
    warrantyExpiry: '2026-06-15',
    specifications: {
      capacity: '500 kg',
      height: '12 meters',
      power: 'Electric 3-phase',
    },
    notes: 'Primary panel lifting equipment for rooftop installations',
  },
  {
    id: 'EQ-002',
    name: 'Drilling Machine',
    category: 'Power Tools',
    brand: 'Bosch',
    model: 'GBH 8-45 DV',
    serialNo: 'BS2023089',
    purchaseDate: '2023-08-10',
    purchasePrice: 45000,
    condition: 'excellent',
    status: 'in-use',
    location: 'Project Site - Ahmedabad',
    assignedTo: 'Installation Team A',
    lastMaintenance: '2024-02-15',
    nextMaintenance: '2024-08-15',
    warrantyExpiry: '2025-08-10',
    specifications: {
      power: '1500W',
      rpm: '900',
      weight: '8.5 kg',
    },
    notes: 'Heavy-duty rotary hammer for concrete drilling',
  },
  {
    id: 'EQ-003',
    name: 'Cable Pulling Winch',
    category: 'Cable Equipment',
    brand: 'Greenlee',
    model: 'CW-1000',
    serialNo: 'GL2023156',
    purchaseDate: '2023-09-05',
    purchasePrice: 125000,
    condition: 'good',
    status: 'maintenance',
    location: 'Service Center',
    assignedTo: null,
    lastMaintenance: '2024-03-01',
    nextMaintenance: '2024-06-01',
    warrantyExpiry: '2025-09-05',
    specifications: {
      capacity: '1000 kg',
      speed: '15 m/min',
      cable: '100 meters',
    },
    notes: 'Scheduled for motor servicing',
  },
  {
    id: 'EQ-004',
    name: 'Infrared Camera',
    category: 'Testing Equipment',
    brand: 'FLIR',
    model: 'E96',
    serialNo: 'FL2024012',
    purchaseDate: '2024-01-15',
    purchasePrice: 320000,
    condition: 'excellent',
    status: 'available',
    location: 'Quality Lab',
    assignedTo: null,
    lastMaintenance: '2024-04-10',
    nextMaintenance: '2024-10-10',
    warrantyExpiry: '2026-01-15',
    specifications: {
      resolution: '640 x 480',
      temperature: '-20°C to 550°C',
      accuracy: '±2°C',
    },
    notes: 'Thermal imaging for panel inspection',
  },
  {
    id: 'EQ-005',
    name: 'Scaffolding Set',
    category: 'Safety Equipment',
    brand: 'Layher',
    model: 'Allround',
    serialNo: 'LY2023250',
    purchaseDate: '2023-07-20',
    purchasePrice: 280000,
    condition: 'fair',
    status: 'in-use',
    location: 'Project Site - Vadodara',
    assignedTo: 'Safety Team',
    lastMaintenance: '2024-03-15',
    nextMaintenance: '2024-06-15',
    warrantyExpiry: '2025-07-20',
    specifications: {
      height: '10 meters',
      load: '200 kg/m²',
      material: 'Galvanized Steel',
    },
    notes: 'Some parts need replacement soon',
  },
  {
    id: 'EQ-006',
    name: 'IV Curve Tracer',
    category: 'Testing Equipment',
    brand: 'Solis',
    model: 'PV-1500',
    serialNo: 'SL2023098',
    purchaseDate: '2023-10-12',
    purchasePrice: 175000,
    condition: 'good',
    status: 'available',
    location: 'Commissioning Lab',
    assignedTo: null,
    lastMaintenance: '2024-02-28',
    nextMaintenance: '2024-08-28',
    warrantyExpiry: '2025-10-12',
    specifications: {
      voltage: '1500V DC',
      current: '30A',
      accuracy: '±0.5%',
    },
    notes: 'Used for panel performance testing',
  },
  {
    id: 'EQ-007',
    name: 'Welding Machine',
    category: 'Power Tools',
    brand: 'Lincoln Electric',
    model: 'Power MIG 210',
    serialNo: 'LE2023456',
    purchaseDate: '2023-11-08',
    purchasePrice: 95000,
    condition: 'excellent',
    status: 'in-use',
    location: 'Fabrication Shop',
    assignedTo: 'Fabrication Team',
    lastMaintenance: '2024-04-05',
    nextMaintenance: '2024-10-05',
    warrantyExpiry: '2025-11-08',
    specifications: {
      power: '210A',
      input: '230V Single Phase',
      duty: '40%',
    },
    notes: 'Used for mounting structure fabrication',
  },
  {
    id: 'EQ-008',
    name: 'Crane Truck 10T',
    category: 'Heavy Vehicle',
    brand: 'Tata',
    model: 'LPT 1412',
    serialNo: 'TT2023125',
    purchaseDate: '2023-05-25',
    purchasePrice: 1850000,
    condition: 'good',
    status: 'available',
    location: 'Transport Yard',
    assignedTo: null,
    lastMaintenance: '2024-03-20',
    nextMaintenance: '2024-06-20',
    warrantyExpiry: '2026-05-25',
    specifications: {
      capacity: '10 Tons',
      boom: '18 meters',
      fuel: 'Diesel',
    },
    notes: 'Primary transport for heavy equipment',
  },
];

// ── Configuration ────────────────────────────────────────────────────────────
const EQUIPMENT_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'Lifting Equipment', label: 'Lifting Equipment' },
  { value: 'Power Tools', label: 'Power Tools' },
  { value: 'Cable Equipment', label: 'Cable Equipment' },
  { value: 'Testing Equipment', label: 'Testing Equipment' },
  { value: 'Safety Equipment', label: 'Safety Equipment' },
  { value: 'Heavy Vehicle', label: 'Heavy Vehicle' },
];

const EQUIPMENT_STATUS = {
  available: { label: 'Available', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  'in-use': { label: 'In Use', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  maintenance: { label: 'Maintenance', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  retired: { label: 'Retired', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const CONDITION_STATUS = {
  excellent: { label: 'Excellent', color: '#22c55e' },
  good: { label: 'Good', color: '#3b82f6' },
  fair: { label: 'Fair', color: '#f59e0b' },
  poor: { label: 'Poor', color: '#ef4444' },
};

// ── Equipment Card Component ───────────────────────────────────────────────
const EquipmentCard = ({ equipment, onClick, onEdit, onDelete }) => {
  const statusConfig = EQUIPMENT_STATUS[equipment.status] || EQUIPMENT_STATUS.available;
  const conditionConfig = CONDITION_STATUS[equipment.condition] || CONDITION_STATUS.good;

  const isMaintenanceDue = new Date(equipment.nextMaintenance) < new Date();

  return (
    <div
      onClick={() => onClick(equipment)}
      className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-base)] p-4 cursor-pointer hover:shadow-md transition-all hover:border-orange-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Hammer size={20} className="text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">{equipment.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{equipment.id}</p>
          </div>
        </div>
        <div
          className="px-2 py-1 rounded-full text-[10px] font-medium"
          style={{ background: statusConfig.bg, color: statusConfig.color }}
        >
          {statusConfig.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-[var(--bg-elevated)] rounded-lg p-2">
          <p className="text-[var(--text-muted)]">Category</p>
          <p className="font-medium text-[var(--text-primary)]">{equipment.category}</p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-lg p-2">
          <p className="text-[var(--text-muted)]">Condition</p>
          <p className="font-medium" style={{ color: conditionConfig.color }}>{conditionConfig.label}</p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-lg p-2">
          <p className="text-[var(--text-muted)]">Location</p>
          <p className="font-medium text-[var(--text-primary)] truncate">{equipment.location}</p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-lg p-2">
          <p className="text-[var(--text-muted)]">Value</p>
          <p className="font-medium text-[var(--text-primary)]">{fmt(equipment.purchasePrice)}</p>
        </div>
      </div>

      {isMaintenanceDue && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg mb-3">
          <AlertTriangle size={14} className="text-red-500" />
          <span className="text-xs text-red-600 font-medium">Maintenance Due!</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-base)]">
        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <Calendar size={12} />
          <span>Next: {equipment.nextMaintenance}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(equipment); }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(equipment); }}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Equipment Detail Modal ───────────────────────────────────────────────────
const EquipmentDetail = ({ equipment, onClose, onEdit, onDelete }) => {
  if (!equipment) return null;

  const statusConfig = EQUIPMENT_STATUS[equipment.status] || EQUIPMENT_STATUS.available;
  const conditionConfig = CONDITION_STATUS[equipment.condition] || CONDITION_STATUS.good;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-orange-100 flex items-center justify-center">
            <Hammer size={28} className="text-orange-600" />
          </div>
          <div>
            <p className="text-xs font-mono text-orange-600">{equipment.id}</p>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{equipment.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: statusConfig.bg, color: statusConfig.color }}
              >
                {statusConfig.label}
              </span>
              <span className="text-xs text-[var(--text-muted)]">{equipment.category}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(equipment)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            <Edit3 size={14} />
            Edit
          </button>
          <button
            onClick={() => onDelete(equipment)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4">
          <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Package size={16} className="text-orange-500" />
            Equipment Info
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Brand</span>
              <span className="font-medium text-[var(--text-primary)]">{equipment.brand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Model</span>
              <span className="font-medium text-[var(--text-primary)]">{equipment.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Serial No</span>
              <span className="font-medium text-[var(--text-primary)]">{equipment.serialNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Condition</span>
              <span className="font-medium" style={{ color: conditionConfig.color }}>{conditionConfig.label}</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-elevated)] rounded-xl p-4">
          <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-orange-500" />
            Location & Assignment
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Current Location</span>
              <span className="font-medium text-[var(--text-primary)]">{equipment.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Assigned To</span>
              <span className="font-medium text-[var(--text-primary)]">{equipment.assignedTo || 'Unassigned'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Purchase Date</span>
              <span className="font-medium text-[var(--text-primary)]">{equipment.purchaseDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Purchase Price</span>
              <span className="font-medium text-[var(--text-primary)]">{fmt(equipment.purchasePrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4">
        <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
          <Settings size={16} className="text-orange-500" />
          Specifications
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(equipment.specifications).map(([key, value]) => (
            <div key={key} className="bg-[var(--bg-surface)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-muted)] capitalize">{key}</p>
              <p className="font-medium text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance Schedule */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4">
        <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
          <Wrench size={16} className="text-orange-500" />
          Maintenance Schedule
        </h4>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-[var(--bg-surface)] rounded-lg p-3">
            <p className="text-xs text-[var(--text-muted)]">Last Maintenance</p>
            <p className="font-medium text-[var(--text-primary)]">{equipment.lastMaintenance}</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-lg p-3">
            <p className="text-xs text-[var(--text-muted)]">Next Maintenance</p>
            <p className="font-medium text-[var(--text-primary)]">{equipment.nextMaintenance}</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-lg p-3">
            <p className="text-xs text-[var(--text-muted)]">Warranty Expiry</p>
            <p className="font-medium text-[var(--text-primary)]">{equipment.warrantyExpiry}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {equipment.notes && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <h4 className="text-sm font-bold text-amber-800 mb-2">Notes</h4>
          <p className="text-sm text-amber-700">{equipment.notes}</p>
        </div>
      )}
    </div>
  );
};

// ── Equipment Form Component ────────────────────────────────────────────────
const EquipmentForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || 'Power Tools',
    brand: initialData?.brand || '',
    model: initialData?.model || '',
    serialNo: initialData?.serialNo || '',
    purchaseDate: initialData?.purchaseDate || new Date().toISOString().split('T')[0],
    purchasePrice: initialData?.purchasePrice || '',
    condition: initialData?.condition || 'good',
    status: initialData?.status || 'available',
    location: initialData?.location || '',
    assignedTo: initialData?.assignedTo || '',
    warrantyExpiry: initialData?.warrantyExpiry || '',
    notes: initialData?.notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      specifications: initialData?.specifications || {},
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Equipment Name *" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Drilling Machine"
          />
        </FormField>

        <FormField label="Category *" required>
          <Select
            value={formData.category}
            onChange={(v) => setFormData({ ...formData, category: v })}
            options={EQUIPMENT_CATEGORIES.filter(c => c.value !== 'all')}
          />
        </FormField>

        <FormField label="Brand *" required>
          <Input
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            placeholder="e.g., Bosch"
          />
        </FormField>

        <FormField label="Model *" required>
          <Input
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            placeholder="e.g., GBH 8-45 DV"
          />
        </FormField>

        <FormField label="Serial Number">
          <Input
            value={formData.serialNo}
            onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
            placeholder="e.g., BS2023089"
          />
        </FormField>

        <FormField label="Purchase Price (₹)">
          <Input
            type="number"
            value={formData.purchasePrice}
            onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
            placeholder="e.g., 45000"
          />
        </FormField>

        <FormField label="Purchase Date">
          <Input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
          />
        </FormField>

        <FormField label="Warranty Expiry">
          <Input
            type="date"
            value={formData.warrantyExpiry}
            onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
          />
        </FormField>

        <FormField label="Condition">
          <Select
            value={formData.condition}
            onChange={(v) => setFormData({ ...formData, condition: v })}
            options={[
              { value: 'excellent', label: 'Excellent' },
              { value: 'good', label: 'Good' },
              { value: 'fair', label: 'Fair' },
              { value: 'poor', label: 'Poor' },
            ]}
          />
        </FormField>

        <FormField label="Status">
          <Select
            value={formData.status}
            onChange={(v) => setFormData({ ...formData, status: v })}
            options={[
              { value: 'available', label: 'Available' },
              { value: 'in-use', label: 'In Use' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'retired', label: 'Retired' },
            ]}
          />
        </FormField>

        <FormField label="Current Location *" required>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Surat Warehouse"
          />
        </FormField>

        <FormField label="Assigned To">
          <Input
            value={formData.assignedTo}
            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
            placeholder="e.g., Installation Team A"
          />
        </FormField>
      </div>

      <FormField label="Notes">
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes about the equipment..."
          rows={3}
        />
      </FormField>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-base)]">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
          {initialData ? 'Update Equipment' : 'Add Equipment'}
        </Button>
      </div>
    </form>
  );
};

// ── Main Equipment Page ──────────────────────────────────────────────────────
const EquipmentPage = () => {
  const [equipment, setEquipment] = useState(MOCK_EQUIPMENT);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);

  // ── Dynamic Filter Options ───────────────────────────────────────────────────
  const dynamicCategories = useMemo(() => {
    const categories = new Set(equipment.map(item => item.category));
    return ['all', ...Array.from(categories).sort()];
  }, [equipment]);

  const dynamicStatuses = useMemo(() => {
    const statuses = new Set(equipment.map(item => item.status));
    return ['all', ...Array.from(statuses).sort()];
  }, [equipment]);

  const getCategoryCount = (cat) => cat === 'all' ? equipment.length : equipment.filter(e => e.category === cat).length;
  const getStatusCount = (status) => status === 'all' ? equipment.length : equipment.filter(e => e.status === status).length;

  // ── Filter Logic ───────────────────────────────────────────────────────────
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [equipment, searchQuery, categoryFilter, statusFilter]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalValue = equipment.reduce((sum, item) => sum + item.purchasePrice, 0);
    const maintenanceDue = equipment.filter(item => new Date(item.nextMaintenance) < new Date()).length;

    return {
      total: equipment.length,
      available: equipment.filter(e => e.status === 'available').length,
      inUse: equipment.filter(e => e.status === 'in-use').length,
      maintenance: equipment.filter(e => e.status === 'maintenance').length,
      totalValue,
      maintenanceDue,
    };
  }, [equipment]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCreate = (data) => {
    const newId = `EQ-${String(equipment.length + 1).padStart(3, '0')}`;
    const newEquipment = {
      id: newId,
      ...data,
      lastMaintenance: new Date().toISOString().split('T')[0],
    };
    setEquipment([newEquipment, ...equipment]);
    setIsCreateModalOpen(false);
  };

  const handleEdit = (data) => {
    setEquipment(equipment.map(item =>
      item.id === editingEquipment.id ? { ...item, ...data } : item
    ));
    setIsEditModalOpen(false);
    setEditingEquipment(null);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Delete equipment ${item.id} - ${item.name}?`)) {
      setEquipment(equipment.filter(e => e.id !== item.id));
      setSelectedEquipment(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-elevated)] pb-20">
      {/* Header */}
      <div className="bg-[var(--bg-surface)] border-b border-[var(--border-base)] sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-400 rounded-xl flex items-center justify-center shadow-lg">
                <Hammer size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Equipment</h1>
                <p className="text-sm text-[var(--text-muted)]">Manage tools, machinery & vehicles</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Download size={18} />
                Export
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
              >
                <Plus size={18} />
                Add Equipment
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-surface)] rounded-xl p-4 shadow-sm border border-[var(--border-base)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                <p className="text-xs text-[var(--text-muted)]">Total Equipment</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                <Package size={20} className="text-[var(--primary)]" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] rounded-xl p-4 shadow-sm border border-[var(--border-base)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[var(--green)]">{stats.available}</p>
                <p className="text-xs text-[var(--text-muted)]">Available</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
                <CheckCircle size={20} className="text-[var(--green)]" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] rounded-xl p-4 shadow-sm border border-[var(--border-base)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[var(--primary)]">{stats.inUse}</p>
                <p className="text-xs text-[var(--text-muted)]">In Use</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                <Wrench size={20} className="text-[var(--primary)]" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] rounded-xl p-4 shadow-sm border border-[var(--border-base)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.maintenanceDue}</p>
                <p className="text-xs text-[var(--text-muted)]">Maintenance Due</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[var(--bg-surface)] rounded-xl p-4 shadow-sm border border-[var(--border-base)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-base)] text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--border-base)] text-sm focus:outline-none focus:border-orange-500 min-w-[150px]"
            >
              {dynamicCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat} ({getCategoryCount(cat)})
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--border-base)] text-sm focus:outline-none focus:border-orange-500 min-w-[150px]"
            >
              {dynamicStatuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Status' : status.replace('-', ' ').toUpperCase()} ({getStatusCount(status)})
                </option>
              ))}
            </select>
            {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setStatusFilter('all'); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X size={16} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Equipment Grid */}
        {filteredEquipment.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-xl p-12 text-center shadow-sm border border-[var(--border-base)]">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
              <Hammer size={32} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No equipment found</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Add your first equipment to get started</p>
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus size={16} className="mr-1.5" />
              Add Equipment
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEquipment.map(item => (
              <EquipmentCard
                key={item.id}
                equipment={item}
                onClick={setSelectedEquipment}
                onEdit={(item) => { setEditingEquipment(item); setIsEditModalOpen(true); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedEquipment}
        onClose={() => setSelectedEquipment(null)}
        title="Equipment Details"
        size="lg"
      >
        {selectedEquipment && (
          <EquipmentDetail
            equipment={selectedEquipment}
            onClose={() => setSelectedEquipment(null)}
            onEdit={(item) => { setEditingEquipment(item); setIsEditModalOpen(true); }}
            onDelete={handleDelete}
          />
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Equipment"
        size="lg"
      >
        <EquipmentForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingEquipment(null); }}
        title="Edit Equipment"
        size="lg"
      >
        {editingEquipment && (
          <EquipmentForm
            onSubmit={handleEdit}
            onCancel={() => { setIsEditModalOpen(false); setEditingEquipment(null); }}
            initialData={editingEquipment}
          />
        )}
      </Modal>
    </div>
  );
};

export default EquipmentPage;

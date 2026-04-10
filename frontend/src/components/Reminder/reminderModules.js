import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Brain,
  MapPin,
  PencilRuler,
  FileText,
  ShoppingCart,
  Package,
  Briefcase,
  Truck,
  Wrench,
  ShieldCheck,
  DollarSign,
  Headphones,
  Scale,
  Building2,
  UserCog,
  Settings,
} from 'lucide-react';

export const REMINDER_MODULES = [
  { id: 'dashboard', label: 'Dashboard', color: '#2563eb', icon: LayoutDashboard, category: 'overview', supportsAuto: true, supportsManual: true },
  { id: 'crm', label: 'CRM & Sales', color: '#7c3aed', icon: Users, category: 'overview', supportsAuto: true, supportsManual: true },
  { id: 'tasks', label: 'Tasks', color: '#0f766e', icon: CheckSquare, category: 'overview', supportsAuto: true, supportsManual: true },
  { id: 'intelligence', label: 'AI Intelligence', color: '#4f46e5', icon: Brain, category: 'overview', supportsAuto: true, supportsManual: true },
  { id: 'survey', label: 'Survey', color: '#0891b2', icon: MapPin, category: 'pipeline', supportsAuto: true, supportsManual: true },
  { id: 'design', label: 'Design & BOQ', color: '#8b5cf6', icon: PencilRuler, category: 'pipeline', supportsAuto: true, supportsManual: true },
  { id: 'documentation', label: 'Documentation', color: '#6366f1', icon: FileText, category: 'pipeline', supportsAuto: true, supportsManual: true },
  { id: 'procurement', label: 'Procurement', color: '#dc2626', icon: ShoppingCart, category: 'operations', supportsAuto: true, supportsManual: true },
  { id: 'inventory', label: 'Inventory', color: '#ea580c', icon: Package, category: 'operations', supportsAuto: true, supportsManual: true },
  { id: 'projects', label: 'Projects', color: '#f59e0b', icon: Briefcase, category: 'operations', supportsAuto: true, supportsManual: true },
  { id: 'logistics', label: 'Logistics', color: '#9333ea', icon: Truck, category: 'operations', supportsAuto: true, supportsManual: true },
  { id: 'installation', label: 'Installation', color: '#14b8a6', icon: Wrench, category: 'field', supportsAuto: true, supportsManual: true },
  { id: 'commissioning', label: 'Commissioning', color: '#3b82f6', icon: ShieldCheck, category: 'field', supportsAuto: true, supportsManual: true },
  { id: 'finance', label: 'Finance', color: '#10b981', icon: DollarSign, category: 'finance', supportsAuto: true, supportsManual: true },
  { id: 'service', label: 'Service & AMC', color: '#ec4899', icon: Headphones, category: 'post-sale', supportsAuto: true, supportsManual: true },
  { id: 'compliance', label: 'Compliance', color: '#f97316', icon: Scale, category: 'post-sale', supportsAuto: true, supportsManual: true },
  { id: 'hrm', label: 'HRM', color: '#0284c7', icon: Building2, category: 'staff', supportsAuto: true, supportsManual: true },
  { id: 'admin', label: 'Admin', color: '#64748b', icon: UserCog, category: 'system', supportsAuto: true, supportsManual: true },
  { id: 'settings', label: 'Settings', color: '#475569', icon: Settings, category: 'system', supportsAuto: true, supportsManual: true },
];

export const REMINDER_MODULE_ALIASES = {
  sales: 'crm',
  project: 'projects',
};

export const normalizeReminderModule = (moduleId) => {
  if (!moduleId) return 'dashboard';
  const normalized = String(moduleId).trim().toLowerCase();
  return REMINDER_MODULE_ALIASES[normalized] || normalized;
};

export const getReminderModuleInfo = (moduleId) => {
  const normalized = normalizeReminderModule(moduleId);
  return REMINDER_MODULES.find((item) => item.id === normalized) || {
    id: normalized,
    label: normalized.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    color: '#6b7280',
    icon: FileText,
    category: 'other',
    supportsAuto: false,
    supportsManual: true,
  };
};

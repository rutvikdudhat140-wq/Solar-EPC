// Solar OS - EPC Edition - FinancePage.js  (Kanban + Table)  
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx'; 
import {
  DollarSign, TrendingUp, TrendingDown,
  CheckCircle, Clock, Zap, FileText, Plus, IndianRupee,
  LayoutGrid, List, Calendar, AlertCircle, RefreshCw,
  Edit, Download, Trash2, Loader2, X, BarChart3, Eye, EyeOff,
  PieChart, ChevronDown, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { financeApi, getPaidAmount, getBalance } from '../lib/financeApi';
import { api } from '../lib/apiClient';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { KPICard } from '../components/ui/KPICard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import { useSettings } from '../context/SettingsContext';
import { usePermissions } from '../hooks/usePermissions';
import { format, subMonths } from 'date-fns';
import FinanceDashboard from '../components/finance/FinanceDashboard';
import CalendarFilter from '../components/finance/CalendarFilter';
const fmt = CURRENCY.format;
/* ── Invoice stage definitions ──────────────────────────────────────────────── */
const INV_STAGES = [
  { id: 'Draft', label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  { id: 'Sent', label: 'Sent', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Partial', label: 'Partial', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'Paid', label: 'Paid', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'Overdue', label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];
/* ── Invoice card ────────────────────────────────────────────────────────────── */
const InvCard = ({ inv, onDragStart, onClick }) => {
  const paid = inv.paid || inv.amountPaid || 0;
  const balancePct = inv.amount > 0 ? Math.round((paid / inv.amount) * 100) : 0;
  const isOverdue = inv.status === 'Overdue';
  const displayId = inv.invoiceNumber || inv.id;
  return (
    <div
      draggable
      onDragStart={() => onDragStart(inv._id || inv.id)}
      onClick={() => onClick(inv)}
      className={`glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all space-y-2 ${isOverdue ? 'border-red-500/40' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{displayId}</span>
        <StatusBadge domain="invoice" value={inv.status} />
      </div>
      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{inv.customerName}</p>
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <div className="glass-card p-1.5 text-center">
          <p className="text-[var(--text-muted)]">Total</p>
          <p className="font-bold text-[var(--text-primary)]">{fmt(inv.amount)}</p>
        </div>
        <div className="glass-card p-1.5 text-center">
          <p className="text-[var(--text-muted)]">Balance</p>
          <p className={`font-bold ${inv.balance > 0 ? 'text-red-400' : 'text-[var(--green)]'}`}>{fmt(inv.balance)}</p>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[9px] text-[var(--text-muted)] mb-0.5">
          <span>Collected</span><span>{balancePct}%</span>
        </div>
        <div className="h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
          <div className={`h-full rounded-full ${balancePct === 100 ? 'bg-[var(--green)]' : 'bg-[var(--accent)]'}`}
            style={{ width: `${balancePct}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
        <Calendar size={9} /><span>Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</span>
        {isOverdue && <AlertCircle size={9} className="text-red-400 ml-auto" />}
      </div>
    </div>
  );
};
/* ── Kanban board ────────────────────────────────────────────────────────────── */
const InvKanbanBoard = ({ invoices, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {INV_STAGES.map(stage => {
          // Show Pending invoices in Sent column
          const cards = invoices.filter(i =>
            i.status === stage.id || (stage.id === 'Sent' && i.status === 'Pending')
          );
          const colAmt = cards.reduce((s, i) => s + i.amount, 0);
          return (
            <div key={stage.id}
              className={`flex flex-col w-60 rounded-xl border transition-colors h-[530px] ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}
            >
              <div className="p-2.5 border-b border-[var(--border-base)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {colAmt > 0 && <span className="text-[10px] text-[var(--text-muted)]">{fmt(colAmt)}</span>}
                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-2 h-[430px] overflow-y-auto">
                {cards.map(inv => (
                  <InvCard key={inv._id || inv.id} inv={inv}
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

/* ── Purchase Order Details Component ───────────────────────────────────────── */
const PurchaseOrderDetails = ({ vendorId, allPurchaseOrders }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const vendorPOs = useMemo(() => {
    return allPurchaseOrders.filter(po => {
      const poVendorId = (po?.vendorId && typeof po.vendorId === 'object') ? po.vendorId?._id : po?.vendorId;
      return String(poVendorId) === String(vendorId);
    });
  }, [vendorId, allPurchaseOrders]);
  
  if (vendorPOs.length === 0) return null;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  
  return (
    <div className="col-span-7 mt-1 mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--primary)] transition-colors font-medium ml-[1.35rem]"
      >
        {isExpanded ? (
          <>
            <ChevronDown size={14} />
            <span>Purchase Orders ({vendorPOs.length})</span>
          </>
        ) : (
          <>
            <ChevronRight size={14} />
            <span>Purchase Orders ({vendorPOs.length})</span>
          </>
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-2 space-y-1">
          {/* Header Row - Column Labels */}
          <div className="grid grid-cols-7 gap-2 text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wide px-3 py-1.5 border-b border-[var(--border-base)]">
            <div className="pl-2">PO Number</div>
            <div className="">Amount</div>
            <div className="text-right pr-2">Ordered</div>
            <div className="text-right pr-2">Expected</div>
            <div className="text-right pr-2">Delivered</div>
            <div className="text-right pr-2">Paid</div>
            <div className="text-right pr-2">Outstanding</div>
          </div>
          
          {/* PO Rows - Perfect alignment with vendor columns */}
          {vendorPOs.map((po, idx) => {
            // Calculate paid amount for this PO from payment history
            const poPaidAmount = po.paidAmount || 0;
            const poOutstanding = (po.totalAmount || 0) - poPaidAmount;
            const isFullyPaid = poOutstanding <= 0 && poPaidAmount > 0;
            
            return (
              <div
                key={po._id || po.id || idx}
                className={`grid grid-cols-7 gap-2 text-[10px] px-3 py-1.5 rounded transition-colors ${
                  isFullyPaid 
                    ? 'bg-[var(--green)]/10 border border-[var(--green)]500/30' 
                    : idx % 2 === 0 
                      ? 'bg-[var(--bg-surface)]' 
                      : 'bg-[var(--bg-elevated)]'
                } hover:bg-[var(--bg-hover)]`}
              >
                {/* Column 1: PO Number - aligns under Vendor Name */}
                <div className="flex items-center pl-2">
                  <div className="font-mono text-xs text-[var(--accent-light)] truncate">{po.id || 'N/A'}</div>
                  {isFullyPaid && (
                    <span className="inline-flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-medium bg-[var(--green)]/20 text-[var(--green)] ml-1">
                      <CheckCircle size={8} /> Paid
                    </span>
                  )}
                </div>
                
                {/* Column 2: Amount - aligns under Vendor ID (starts at same position as Vendor ID) */}
                <div className="text-xs font-medium text-[var(--text-primary)]">{fmt(po.totalAmount || 0)}</div>
                
                {/* Column 3: Ordered Date - aligns under Total POs */}
                <div className="text-right text-xs text-[var(--text-muted)] pr-2">{formatDate(po.orderedDate)}</div>
                
                {/* Column 4: Expected Date - aligns under Total Payable */}
                <div className="text-right text-xs font-medium text-[var(--accent)] pr-2">{formatDate(po.expectedDate)}</div>
                
                {/* Column 5: Delivered Date - aligns under Paid */}
                <div className="text-right text-xs text-[var(--green)] pr-2">{formatDate(po.deliveredDate)}</div>
                
                {/* Column 6: Paid Amount - aligns under Outstanding */}
                <div className="text-right text-xs text-[var(--green)] font-medium pr-2">{fmt(poPaidAmount)}</div>
                
                {/* Column 7: Outstanding Amount - aligns under Last Payment */}
                <div className="text-right text-xs font-bold text-amber-400 pr-2">{fmt(poOutstanding)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
/* ── Table columns ──────────────────────────────────────────────────────────── */
const INVOICE_COLUMNS = [
  { key: 'invoiceNumber', header: 'Invoice #', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'customerName', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'email', header: 'Email', render: v => <span className="text-xs text-[var(--text-muted)]">{v || '-'}</span> },
  { key: 'phone', header: 'Phone', render: v => <span className="text-xs text-[var(--text-muted)]">{v || '-'}</span> },
  { key: 'paymentTerms', header: 'Payment Terms', render: v => <span className="text-xs text-[var(--text-muted)]">{v || '-'}</span> },
  { key: 'amount', header: 'Invoice Amt', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{fmt(v)}</span> },
  { key: 'paid', header: 'Paid', render: v => <span className="text-xs text-[var(--green)] font-bold">{fmt(v)}</span> },
  { key: 'balance', header: 'Balance', render: v => <span className={`text-xs font-bold ${v > 0 ? 'text-red-400' : 'text-[var(--green)]'}`}>{fmt(v)}</span> },
  { key: 'status', header: 'Status', render: v => <StatusBadge domain="invoice" value={v} /> },
  { key: 'invoiceDate', header: 'Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
  { key: 'dueDate', header: 'Due Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
  { key: 'paidDate', header: 'Paid On', render: v => <span className="text-xs text-[var(--text-muted)]">{v ? new Date(v).toLocaleDateString() : '-'}</span> },
  {
    key: 'reminderCount', header: 'Reminders', render: (v, row) => (
      <div className="flex items-center gap-1">
        {v > 0 ? (
          <>
            <span className="text-xs font-bold text-orange-400">{v}</span>
            {row.lastReminderSentAt && (
              <span className="text-[10px] text-[var(--text-faint)]">
                ({new Date(row.lastReminderSentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})</span>
            )}
          </>
        ) : (
          <span className="text-xs text-[var(--text-faint)]">-</span>
        )}
      </div>
    )
  },
];
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="my-0.5">{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};
const INV_STATUS_FILTERS = ['All', 'Draft', 'Sent', 'Partial', 'Paid', 'Overdue', 'Outstanding'];
/* ══════════════════════════════════════════════════════════════════════════════
  PAGE
══════════════════════════════════════════════════════════════════════════════ */
const FinancePage = ({ onNavigate }) => {
  const { isActionEnabled } = useSettings();
 const { can } = usePermissions();
  const [view, setView] = useState('table');
  // Main view mode: 'dashboard', 'kanban', 'table'
  const [mainView, setMainView] = useState('dashboard');
  // Active tab in table view: 'invoices', 'payables', 'transactions'
  const [activeTab, setActiveTab] = useState('invoices');
  // Table view summary cards visibility (default hidden)
  const [showSummaryCards, setShowSummaryCards] = useState(false);
  const [invSearch, setInvSearch] = useState('');
  const [invStatus, setInvStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(() => {
    const saved = localStorage.getItem('finance_invoice_pageSize');
    return saved ? parseInt(saved, 10) : APP_CONFIG.defaultPageSize;
  });
  const setPageSize = (size) => {
    localStorage.setItem('finance_invoice_pageSize', String(size));
    setPageSizeState(size);
  };
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  // Calendar filter year state - for filtering data by year
  // Default to FULL YEAR when opening finance module
  const today = new Date();
  const currentYear = today.getFullYear();
  const [calendarFilterYear, setCalendarFilterYear] = useState(currentYear.toString());
  // Calendar filter month state - for displaying selected month in calendar (undefined = full year)
  const [calendarFilterMonth, setCalendarFilterMonth] = useState(undefined);
  // Calendar filter day state - for Today filter (undefined=no day filter)
  const [calendarFilterDay, setCalendarFilterDay] = useState(undefined);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selected, setSelected] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [adjustmentTrend, setAdjustmentTrend] = useState([]);
  const [payables, setPayables] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [transactionAnalytics, setTransactionAnalytics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [allowedPaymentTerms, setAllowedPaymentTerms] = useState([]);
  const [canCreateInvoice, setCanCreateInvoice] = useState(true);
  const [projectStatus, setProjectStatus] = useState('');
  const [selectedProjectContractValue, setSelectedProjectContractValue] = useState(null);
  const latestProjectIdRef = useRef('');
  // Reminder modal state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedReminderInvoice, setSelectedReminderInvoice] = useState(null);
  const [reminderForm, setReminderForm] = useState({
    reminderType: 'Gentle',
    customerEmail: '',
    messageBody: '',
  });
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState(false);
  // Timeline drawer state
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineInvoice, setTimelineInvoice] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  // Edit invoice modal state
  const [showEditInvoice, setShowEditInvoice] = useState(false);
  const [editInvoiceTarget, setEditInvoiceTarget] = useState(null);
  const [editInvoice, setEditInvoice] = useState({
    invoiceNumber: '',
    customerName: '',
    amount: '',
    invoiceDate: '',
    dueDate: '',
    paymentTerms: '',
    description: '',
    email: '',
    status: '',
  });
  const [newInvoiceErrors, setNewInvoiceErrors] = useState({});
  const [savingEditInvoice, setSavingEditInvoice] = useState(false);
  const [editModalError, setEditModalError] = useState(null);
  // Delete confirmation modal state
  const [showDeleteInvoice, setShowDeleteInvoice] = useState(false);
  const [showStatusChangeConfirm, setShowStatusChangeConfirm] = useState(false);
  const [pendingStageChange, setPendingStageChange] = useState(null);
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState(null);
  const [deletingInvoice, setDeletingInvoice] = useState(false);
  // Assign invoice modal state
  const [showAssignInvoice, setShowAssignInvoice] = useState(false);
  const [assignInvoiceTarget, setAssignInvoiceTarget] = useState(null);
  const [assignToUser, setAssignToUser] = useState('');
  // Form state for new invoice
  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: '',
    projectId: '',
    customerName: '',
    amount: '',
    invoiceDate: '',
    dueDate: '',
    paymentTerms: '',
    description: '',
    email: '',
    phone: '',
  });
  // Record Payment modal state
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [recordPayment, setRecordPayment] = useState({
    paymentType: 'Customer Payment',
    referenceType: 'Invoice',
    referenceId: '',
    amount: '',
    maxAmount: 0,
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Bank Transfer',
    notes: '',
  });
  const [recordPaymentErrors, setRecordPaymentErrors] = useState({});
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ amount: '', reason: '', description: '', type: '', selectedPurchaseOrderId: '' });
  const [adjustErrors, setAdjustErrors] = useState({});
  const [adjustError, setAdjustError] = useState(null);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);
  const [adjustRevertState, setAdjustRevertState] = useState(null);
  const [manualAdjustments, setManualAdjustments] = useState([]);
  const [manualBalance, setManualBalance] = useState(0);
  // Adjustment categories state
  const [adjustmentCategories, setAdjustmentCategories] = useState([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({
    categoryName: '',
    type: 'credit',
  });
  const [addingCategory, setAddingCategory] = useState(false);
  // Journal entries state
  const [journalEntries, setJournalEntries] = useState([]);
  const [selectedJournalEntry, setSelectedJournalEntry] = useState(null);
  const [selectedJournalEntryIndex, setSelectedJournalEntryIndex] = useState(null);
  const [showJournalEntryModal, setShowJournalEntryModal] = useState(false);
  const { debitTotal, creditTotal } = useMemo(() => {
    let debitTotal = 0;
    let creditTotal = 0;
    (journalEntries || []).forEach((entry) => {
      (entry?.lines || []).forEach((line) => {
        const d = Number(line?.debitAmount || 0);
        const c = Number(line?.creditAmount || 0);
        if (!Number.isNaN(d)) debitTotal += d;
        if (!Number.isNaN(c)) creditTotal += c;
      });
    });
    return { debitTotal, creditTotal };
  }, [journalEntries]);
  // Fetch adjustment categories when modal opens or type changes
  useEffect(() => {
    if (!showAdjustModal) return;
    const type = adjustForm.type || 'credit';
    // Set today's date as default if date is empty
    if (!adjustForm.date) {
      setAdjustForm(prev => ({ ...prev, date: new Date().toISOString().slice(0, 10) }));
    }
    (async () => {
      try {
        const cats = await financeApi.getAdjustmentCategories(type);
        setAdjustmentCategories(cats || []);
      } catch (err) {
        console.error("Failed to fetch adjustment categories:", err);
      }
    })();
  }, [showAdjustModal, adjustForm.type]);
  // Filtered data by selected year from calendar
  const filteredInvoicesByYear = useMemo(() => {
    if (calendarFilterYear === 'all') return invoices;
    return invoices.filter(inv => {
      const invoiceDate = new Date(inv.invoiceDate || inv.createdAt);
      const createdAtDate = inv.createdAt ? new Date(inv.createdAt) : null;
      if (calendarFilterDay !== undefined) {
        // Today mode: match if invoiceDate OR createdAt is today
        const year = parseInt(calendarFilterYear);
        const month = calendarFilterMonth;
        const day = calendarFilterDay;
        const invoiceDateMatch = invoiceDate.getFullYear() === year && invoiceDate.getMonth() === month && invoiceDate.getDate() === day;
        const createdAtMatch = createdAtDate && createdAtDate.getFullYear() === year && createdAtDate.getMonth() === month && createdAtDate.getDate() === day;
        return invoiceDateMatch || createdAtMatch;
      }
      if (invoiceDate.getFullYear().toString() !== calendarFilterYear) return false;
      if (calendarFilterMonth !== undefined && invoiceDate.getMonth() !== calendarFilterMonth) return false;
      return true;
    });
}, [invoices, calendarFilterYear, calendarFilterMonth, calendarFilterDay]);
const filteredJournalEntriesByYear = useMemo(() => {
    if (calendarFilterYear === 'all') return journalEntries;
    return journalEntries.filter(entry => {
        const entryDate = new Date(entry.date || entry.createdAt);
        const entryCreatedAt = entry.createdAt ? new Date(entry.createdAt) : null;
        if (calendarFilterDay !== undefined) {
          const year = parseInt(calendarFilterYear);
          const entryDateMatch = entryDate.getFullYear() === year && entryDate.getMonth() === calendarFilterMonth && entryDate.getDate() === calendarFilterDay;
          const createdMatch = entryCreatedAt && entryCreatedAt.getFullYear() === year && entryCreatedAt.getMonth() === calendarFilterMonth && entryCreatedAt.getDate() === calendarFilterDay;
          return entryDateMatch || createdMatch;
        }
        if (entryDate.getFullYear().toString() !== calendarFilterYear) return false;
        if (calendarFilterMonth !== undefined && entryDate.getMonth() !== calendarFilterMonth) return false;
        return true;
    });
}, [journalEntries, calendarFilterYear, calendarFilterMonth, calendarFilterDay]);
const filteredJournalTotals = useMemo(() => {
    let debitTotal = 0;
    let creditTotal = 0;
    (filteredJournalEntriesByYear || []).forEach((entry) => {
      (entry?.lines || []).forEach((line) => {
        const d = Number(line?.debitAmount || 0);
        const c = Number(line?.creditAmount || 0);
        if (!Number.isNaN(d)) debitTotal += d;
        if (!Number.isNaN(c)) creditTotal += c;
      });
    });
    return { debitTotal, creditTotal };
}, [filteredJournalEntriesByYear]);
const filteredManualAdjustmentsByYear = useMemo(() => {
    if (calendarFilterYear === 'all') return manualAdjustments;
    return manualAdjustments.filter(adj => {
      const adjDate = new Date(adj.date || adj.createdAt);
      const adjCreatedAt = adj.createdAt ? new Date(adj.createdAt) : null;
      if (calendarFilterDay !== undefined) {
        const year = parseInt(calendarFilterYear);
        const adjDateMatch = adjDate.getFullYear() === year && adjDate.getMonth() === calendarFilterMonth && adjDate.getDate() === calendarFilterDay;
        const createdMatch = adjCreatedAt && adjCreatedAt.getFullYear() === year && adjCreatedAt.getMonth() === calendarFilterMonth && adjCreatedAt.getDate() === calendarFilterDay;
        return adjDateMatch || createdMatch;
      }
      if (adjDate.getFullYear().toString() !== calendarFilterYear) return false;
      if (calendarFilterMonth !== undefined && adjDate.getMonth() !== calendarFilterMonth) return false;
      return true;
    });
  }, [manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay]);
  
  const filteredPayablesByYear = useMemo(() => {
    if (calendarFilterYear === 'all') return payables;
    return payables.filter(p => {
      // Include vendors even without lastPurchaseOrderDate - they should show in current year
      if (!p.lastPurchaseOrderDate) return true;
      const poDate = new Date(p.lastPurchaseOrderDate);
      // Handle invalid dates
      if (isNaN(poDate.getTime())) return true;
      if (poDate.getFullYear().toString() !== calendarFilterYear) return false;
      if (calendarFilterMonth !== undefined && poDate.getMonth() !== calendarFilterMonth) return false;
      if (calendarFilterDay !== undefined && poDate.getDate() !== calendarFilterDay) return false;
      return true;
    }); 
  }, [payables, calendarFilterYear, calendarFilterMonth, calendarFilterDay]);
  
  // Filter purchase orders by calendar for payables display
  const filteredPurchaseOrdersByCalendar = useMemo(() => {
    if (calendarFilterYear === 'all') return purchaseOrders;
    return purchaseOrders.filter(po => {
      // Filter based ONLY on expectedDate
      if (!po.expectedDate) return false;
      
      const expectedDate = new Date(po.expectedDate);
      
      // Handle invalid dates
      if (isNaN(expectedDate.getTime())) return false;
      
      // Check if expectedDate matches the selected calendar date
      if (expectedDate.getFullYear().toString() !== calendarFilterYear) return false;
      if (calendarFilterMonth !== undefined && expectedDate.getMonth() !== calendarFilterMonth) return false;
      if (calendarFilterDay !== undefined && expectedDate.getDate() !== calendarFilterDay) return false;
      
      return true;
    });
  }, [purchaseOrders, calendarFilterYear, calendarFilterMonth, calendarFilterDay]);
  const filteredPaymentsByYear = useMemo(() => {
    if (calendarFilterYear === 'all') return payments;
    return payments.filter(p => {
      const paymentDate = new Date(p.paymentDate || p.date || p.createdAt);
      if (calendarFilterDay !== undefined) {
        const year = parseInt(calendarFilterYear);
        return paymentDate.getFullYear() === year && paymentDate.getMonth() === calendarFilterMonth && paymentDate.getDate() === calendarFilterDay;
      }
      if (paymentDate.getFullYear().toString() !== calendarFilterYear) return false;
      if (calendarFilterMonth !== undefined && paymentDate.getMonth() !== calendarFilterMonth) return false;
      return true;
    }); 
  }, [payments, calendarFilterYear, calendarFilterMonth, calendarFilterDay]);
  // Extract unique years from invoice data for the calendar filter
  const availableYears = useMemo(() => {
    const years = new Set();
    (invoices || []).forEach(inv => {
      const date = new Date(inv.invoiceDate || inv.createdAt);
      if (!isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    });
    (journalEntries || []).forEach(entry => {
      const date = new Date(entry.date || entry.createdAt);
      if (!isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending
  }, [invoices, journalEntries]);
  // Fetch data on mount
  useEffect(() => {
    fetchData();
    // Periodic refetch of manual adjustments and journal entries to keep Transactions tab in sync with database
    const intervalId = setInterval(async () => {
      try {
        const adjustments = await financeApi.getManualAdjustments();
        setManualAdjustments(adjustments || []);
        const entries = await financeApi.getJournalEntries();
        setJournalEntries(entries || []);
      } catch (err) {
        console.error('Failed to refresh data:', err);
      }
    }, 5000); // Refresh every 5 seconds
    return () => clearInterval(intervalId);
  }, []);
  const fetchData = async () => {
    try {
      if (!canViewFinance) {
        setLoading(false);
        setError('This action is disabled from module settings.');
        return;
      }
      setLoading(true);
      setError(null);
      const [
        invoicesRes,
        paymentsRes,
        vendorExpensesRes,
        statsRes,
        vendorsRes,
        posRes,
        manualAdjustmentsRes,
        manualBalanceRes,
        categoriesRes,
        journalEntriesRes,
        transactionAnalyticsRes,
      ] = await Promise.all([
        financeApi.getInvoices(),
        financeApi.getPayments(),
        financeApi.getExpenses(undefined, 'Vendor Payment'),
        financeApi.getDashboardStats(),
        api.get('/procurement/vendors'),
        api.get('/finance/vendors/purchase-orders'),
        financeApi.getManualAdjustments(),
        financeApi.getManualAdjustmentBalance(),
        financeApi.getAdjustmentCategories(),
        financeApi.getJournalEntries(),
        financeApi.getTransactionAnalytics(),
      ]);
      console.log('📊 Fetched invoices:', invoicesRes?.length || 0);
      if (invoicesRes && invoicesRes.length > 0) {
        console.log('📋 First invoice data:', JSON.stringify(invoicesRes[0], null, 2));
        console.log('📋 Phone field value:', invoicesRes[0]?.phone);
        console.log('📋 Payment Terms field value:', invoicesRes[0]?.paymentTerms);
      }
      setInvoices(invoicesRes || []);
      const payments = paymentsRes || [];
      setPayments(payments);
      const vendorExpenses = vendorExpensesRes || [];
      setDashboardStats(statsRes);
      // Set manual adjustments and balance
      setManualAdjustments(manualAdjustmentsRes || []);
      setManualBalance(manualBalanceRes?.balance || 0);
      // Set adjustment categories
      setAdjustmentCategories(categoriesRes || []);
      // Set journal entries
      setJournalEntries(journalEntriesRes || []);
      // Set transaction analytics
      setTransactionAnalytics(transactionAnalyticsRes || null);
      // Vendor Payables (from Procurement Purchase Orders)
      const vendors = Array.isArray(vendorsRes)
        ? vendorsRes
        : (vendorsRes?.data || []);
      const purchaseOrdersData = Array.isArray(posRes)
        ? posRes
        : (posRes?.data || []);
      setPurchaseOrders(purchaseOrdersData);
      const safeDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) {
          return Number.isNaN(d.getTime()) ? null : d;
        }
        if (typeof d === 'string') {
          const m = d.trim().match(/^([0-3]\d)[-\/](0\d|1[0-2])[-\/](\d{4})$/);
          if (m) {
            const day = Number(m[1]);
            const month = Number(m[2]);
            const year = Number(m[3]);
            const dt = new Date(year, month - 1, day);
            return Number.isNaN(dt.getTime()) ? null : dt;
          }
        }
        const dt = new Date(d);
        return Number.isNaN(dt.getTime()) ? null : dt;
      };
      const getMonthKey = (dt) => {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      };
      const getMonthLabel = (dt) => dt.toLocaleString('en-IN', { month: 'short' });
      const buildLastNMonths = (n) => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const months = [];
        for (let i = n - 1; i >= 0; i -= 1) {
          const d = new Date(start.getFullYear(), start.getMonth() - i, 1);
          months.push({
            key: getMonthKey(d),
            month: getMonthLabel(d),
            start: new Date(d.getFullYear(), d.getMonth(), 1),
            end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
          });
        }
        return months;
      };
      const months = buildLastNMonths(6);
      const allowedInvoiceStatuses = new Set(['Paid', 'Partial', 'Pending']);
      const invoiceCreatedAt = (inv) => safeDate(inv?.invoiceDate) || safeDate(inv?.createdAt);
      const paymentDate = (p) => safeDate(p?.paymentDate) || safeDate(p?.createdAt);
      const expenseCreatedAt = (exp) => safeDate(exp?.createdAt) || safeDate(exp?.expenseDate);
      const expensePaidAt = (exp) => safeDate(exp?.expenseDate) || safeDate(exp?.updatedAt) || safeDate(exp?.createdAt);
      const invoicesForCharts = (invoicesRes || []).filter(inv => allowedInvoiceStatuses.has(inv?.status));
      const revenueCostSeries = months.map((m) => {
        const revenue = invoicesForCharts.reduce((sum, inv) => {
          const dt = invoiceCreatedAt(inv);
          if (!dt || dt < m.start || dt >= m.end) return sum;
          return sum + Number(inv?.amount || inv?.invoiceAmount || 0);
        }, 0);
        const cost = (vendorExpenses || []).reduce((sum, exp) => {
          const dt = expenseCreatedAt(exp);
          if (!dt || dt < m.start || dt >= m.end) return sum;
          return sum + Number(exp?.amount || exp?.payableAmount || 0);
        }, 0);
        return { month: m.month, revenue, cost };
      });
      const cashFlowSeries = months.map((m) => {
        // Inflow: Use getPaidAmount with manualAdjustments state (EXACT same as Collected calculation)
        const inflow = (invoicesRes || []).reduce((sum, inv) => {
          // For paid invoices, use invoiceDate if paidDate is missing
          let dt = safeDate(inv?.paidDate);
          if (!dt && inv?.status === 'Paid') {
            dt = safeDate(inv?.invoiceDate) || safeDate(inv?.updatedAt) || safeDate(inv?.createdAt);
          }
          if (!dt || dt < m.start || dt >= m.end) return sum;
          // EXACT same calculation as totalCollected - must match exactly
          return sum + getPaidAmount(inv, manualAdjustments || []);
        }, 0);
        const outflow = (vendorExpenses || []).reduce((sum, exp) => {
          if (String(exp?.status || '').toLowerCase() !== 'paid') return sum;
          const dt = expensePaidAt(exp);
          if (!dt || dt < m.start || dt >= m.end) return sum;
          return sum + Number(exp?.amount || exp?.paidAmount || 0);
        }, 0);
        return { month: m.month, inflow, outflow };
      });
      console.log('FinancePage CashFlow debug:', {
        months: months.map(m => ({ month: m.month, start: m.start.toISOString(), end: m.end.toISOString() })),
        invoicesCount: invoicesRes?.length || 0,
        paidInvoices: invoicesRes?.filter(inv => inv?.status === 'Paid').map(inv => ({
          status: inv.status,
          amount: inv.amount,
          paid: inv.paid,
          invoiceDate: inv.invoiceDate,
          paidDate: inv.paidDate
        })),
        cashFlowSeries
      });
      setMonthlyRevenue(revenueCostSeries);
      setCashFlow(cashFlowSeries);
      // Calculate monthly income/expense trend from manual adjustments only
      const adjustmentTrendSeries = months.map((m) => {
        const income = (manualAdjustmentsRes || [])
          .filter(adj => adj.type === 'credit')
          .reduce((sum, adj) => {
            const dt = safeDate(adj?.date) || safeDate(adj?.createdAt);
            if (!dt || dt < m.start || dt >= m.end) return sum;
            return sum + Number(adj?.amount || 0);
          }, 0);
        const expense = (manualAdjustmentsRes || [])
          .filter(adj => adj.type === 'debit')
          .reduce((sum, adj) => {
            const dt = safeDate(adj?.date) || safeDate(adj?.createdAt);
            if (!dt || dt < m.start || dt >= m.end) return sum;
            return sum + Number(adj?.amount || 0);
          }, 0);
        return { month: m.month, income, expense };
      });
      setAdjustmentTrend(adjustmentTrendSeries);
      // Vendor Payables (from Finance Vendors API)
      try {
        const financeVendorsRes = await financeApi.getFinanceVendors();
        const financeVendors = Array.isArray(financeVendorsRes) ? financeVendorsRes : [];
        console.log('[Finance] Finance Vendors from API:', financeVendors.map(fv => ({
          vendorId: fv.vendorId,
          vendorName: fv.vendorName,
          totalPaid: fv.totalPaid,
          totalPayable: fv.totalPayable
        })));
        const vendors = Array.isArray(vendorsRes)
          ? vendorsRes
          : (vendorsRes?.data || []);
        const purchaseOrdersData2 = Array.isArray(posRes)
          ? posRes
          : (posRes?.data || []);
        // Build vendor rows from procurement vendors (source of truth) with calculated PO counts
        const vendorMap = new Map();
        console.log('[Finance] Total vendors:', vendors.length);
        console.log('[Finance] Total purchase orders:', purchaseOrdersData2.length);
        // First, add all procurement vendors who have POs
        for (const v of vendors) {
          const vendorId = v?._id || v?.id;
          if (!vendorId) continue;
          const vendorPOs = purchaseOrdersData2.filter(po => {
            const poVendorId = (po?.vendorId && typeof po.vendorId === 'object') ? po.vendorId?._id : po?.vendorId;
            return String(poVendorId) === String(vendorId);
          });
          console.log(`[Finance] Vendor ${v?.name} (${vendorId}): ${vendorPOs.length} POs`);
          if (vendorPOs.length > 0) {
            const totalPayable = vendorPOs.reduce((sum, po) => sum + Number(po?.totalAmount || 0), 0);
            const totalPaid = vendorPOs.reduce((sum, po) => sum + Number(po?.paidAmount || 0), 0);
            vendorMap.set(String(vendorId), {
              vendorName: v?.name || v?.vendorName || 'Unknown',
              vendorId: v?.id || `V-${String(vendorId).slice(-4)}`,
              vendorObjectId: vendorId,
              vendorCode: v?.id || `V-${String(vendorId).slice(-4)}`,
              totalPurchaseOrders: vendorPOs.length,
              totalPayableAmount: totalPayable,
              amountPaid: totalPaid,
              outstandingAmount: totalPayable - totalPaid,
              lastPurchaseOrderDate: '',
              status: 'Active',
            });
          }
        }
        console.log('[Finance] Vendor map size:', vendorMap.size);
        console.log('[Finance] Vendor rows:', Array.from(vendorMap.values()).map(v => ({ name: v.vendorName, pos: v.totalPurchaseOrders })));
        // Merge with existing finance vendor data (for any additional info like last payment date)
        for (const fv of financeVendors) {
          const vendorId = fv?.vendorId;
          if (!vendorId) continue;
          const existing = vendorMap.get(String(vendorId));
          if (existing) {
            // Keep calculated values but merge additional finance data
            existing.lastPurchaseOrderDate = fv?.lastPaymentDate ? new Date(fv.lastPaymentDate).toLocaleDateString('en-IN') : '';
            existing.status = fv?.status || 'Active';
            // NOTE: Don't add fv.totalPaid here - it's already included in PO paidAmount calculations above
            // existing.amountPaid += fv?.totalPaid || 0;  // REMOVED - causes double counting!
            existing.outstandingAmount = existing.totalPayableAmount - existing.amountPaid;
          }
        }
        const vendorRows = Array.from(vendorMap.values());
        setPayables(vendorRows);
        for (const v of vendors) {
          const vendorId = v?._id || v?.id;
          if (!vendorId) continue;
          const exists = financeVendors.find(fv => String(fv.vendorId) === String(vendorId));
          // Always sync vendor data (new and existing)
            const vendorPOs = purchaseOrdersData2.filter(po => {
              const poVendorId = (po?.vendorId && typeof po.vendorId === 'object') ? po.vendorId?._id : po?.vendorId;
              return String(poVendorId) === String(vendorId);
            }); 
            const totalPayable = vendorPOs.reduce((sum, po) => sum + Number(po?.totalAmount || 0), 0);
            const totalPaid = vendorPOs.reduce((sum, po) => sum + Number(po?.paidAmount || 0), 0);
            try {
              await financeApi.syncFinanceVendor({
                vendorId: String(vendorId),
                vendorName: v?.name || v?.vendorName || 'Unknown',
                vendorCode: v?.id || `V-${String(vendorId).slice(-4)}`,
                totalPayable,
                totalPaid,
                totalPurchaseOrders: vendorPOs.length,
                procurementVendor: v, // Send full procurement vendor object
                purchaseOrders: vendorPOs, // Send all POs for this vendor
              });
            } catch (syncErr) {
              console.error('Failed to sync vendor:', vendorId, syncErr);
            }
          // Vendor sync completed 
        }
      } catch (fvErr) {
        console.error('Failed to load finance vendors:', fvErr);
      }
    } catch (err) {
      setError(err.message || 'Failed to load finance data');
    } finally { 
      setLoading(false);
    }
  };
  const guardCreate = () => {
    if (!can('finance', 'create')) {
      toast.error('Permission denied: Cannot create invoices');
      return false;
    }
    return true;  
  }; 
  const guardApprove = () => {
    if (!can('finance', 'approve')) {
      toast.error('Permission denied: Cannot approve/record payments');
      return false;
    }
    return true;
  };
  const canFinance = (actionId) => isActionEnabled('finance', actionId);
  const canViewFinance = canFinance('view');
  const financePermissions = {
    create: canFinance('create'),
    edit: canFinance('edit'),
    delete: canFinance('delete'),
    export: canFinance('export'),
    assign: canFinance('assign'),
  };
  const canEditInvoice = (inv) => canFinance('edit') && inv?.status !== 'Paid';
  const canDeleteInvoice = (inv) => canFinance('delete') && inv?.status !== 'Paid';
  const canAssignInvoice = (inv) => canFinance('assign') && ['Draft', 'Pending', 'Partial', 'Overdue'].includes(inv?.status);
  const toDateInputValue = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString().slice(0, 10);
  };
  // Helper function to get valid next statuses based on current status
  const getValidNextStatuses = (currentStatus) => {
    const transitions = {
      'Draft': ['Sent'],
      'Sent': ['Partial', 'Paid'],
      'Pending': ['Partial', 'Paid'],
      'Partial': ['Paid'],
      'Paid': [], // No further transitions from Paid
      'Overdue': ['Partial', 'Paid']
    };
    return transitions[currentStatus] || [];
  };
  const openEditInvoice = (row) => {
    if (!canEditInvoice(row)) return;
    setEditInvoiceTarget(row);
    setEditInvoice({
      invoiceNumber: row?.invoiceNumber || '',
      customerName: row?.customerName || '',
      amount: String(row?.amount ?? ''),
      invoiceDate: toDateInputValue(row?.invoiceDate),
      dueDate: toDateInputValue(row?.dueDate),
      paymentTerms: row?.paymentTerms || '',
      description: row?.description || '',
      email: row?.email || '',
      phone: row?.phone || '',
      status: row?.status || '',
    });
    setEditModalError(null);
    setShowEditInvoice(true);
  };
  const handleSaveEditInvoice = async () => {
    if (!editInvoiceTarget) return;
    if (!editInvoice.invoiceNumber.trim()) {
      setEditModalError('Invoice Number is required');
      return;
    }
    if (!editInvoice.customerName.trim()) {
      setEditModalError('Customer Name is required');
      return;
    } 
    if (!editInvoice.amount || parseFloat(editInvoice.amount) <= 0) {
      setEditModalError('Valid Invoice Amount is required');
      return;
    }
    if (!editInvoice.invoiceDate) {
      setEditModalError('Invoice Date is required');
      return;
    }
    if (!editInvoice.dueDate) {
      setEditModalError('Due Date is required');
      return;
    }
    if (new Date(editInvoice.dueDate) < new Date(editInvoice.invoiceDate)) {
      setEditModalError('Due Date cannot be earlier than Invoice Date');
      return;
    }
    // Status validation (same as Kanban view)
    const previousStatus = editInvoiceTarget?.status;
    const newStatus = editInvoice.status;
    if (previousStatus && previousStatus !== newStatus) {
      const order = {
        Draft: 0,
        Sent: 1,
        Pending: 2,
        Partial: 3,
        Paid: 4,
        Overdue: 5, 
      };
      const isBackward = order[newStatus] < order[previousStatus];
      if (isBackward) {
        setEditModalError('Invoice status cannot be moved backward.');
        return;
      }
      const allowedTransitions = new Set([
        'Draft->Sent',
        'Sent->Partial',
        'Sent->Paid',
        'Pending->Partial',
        'Pending->Paid',
        'Partial->Paid',
        'Overdue->Partial',
        'Overdue->Paid'
      ]); 
      const key = `${previousStatus}->${newStatus}`;
      if (!allowedTransitions.has(key)) {
        setEditModalError('Invalid invoice status transition');
        return;
      }
    }
    const invoiceId = editInvoiceTarget?._id || editInvoiceTarget?.id;
    if (!invoiceId) return;
    try { 
      setSavingEditInvoice(true);
      setEditModalError(null);
      const dto = {
        invoiceNumber: editInvoice.invoiceNumber.trim(),
        customerName: editInvoice.customerName.trim(),
        amount: parseFloat(editInvoice.amount),
        invoiceDate: editInvoice.invoiceDate,
        dueDate: editInvoice.dueDate,
        ...(editInvoice.email ? { email: editInvoice.email.trim() } : {}),
        ...(editInvoice.status ? { status: editInvoice.status } : {}),
        ...(editInvoice.status === 'Paid' ? { paidDate: new Date().toISOString() } : {}),
        ...(editInvoice.paymentTerms ? { paymentTerms: editInvoice.paymentTerms } : {}),
        ...(editInvoice.description ? { description: editInvoice.description } : {}),
      };
      await financeApi.updateInvoice(invoiceId, dto);
      // Handle Partial status - open adjust amount modal
      if (newStatus === 'Partial' && editInvoiceTarget) {
        const outstandingAmount = (editInvoiceTarget.amount || 0) - (editInvoiceTarget.paid || 0);
        setAdjustForm({ 
          type: 'credit',
          category: 'Invoice Amount Received',
          amount: String(outstandingAmount),
          lf: '',
          reason: `Partial payment for invoice ${editInvoiceTarget.invoiceNumber || ''}`,
          reference: '',
          date: new Date().toISOString().slice(0, 10),
          selectedInvoiceId: editInvoiceTarget._id || editInvoiceTarget.id,
          selectedVendorId: '',
          paymentMethod: 'Bank Transfer',
        });
        setShowAdjustModal(true);
      }
      // Handle Paid status - create transaction entry
      if (newStatus === 'Paid' && editInvoiceTarget) {
        const outstandingAmount = (editInvoiceTarget.amount || 0) - (editInvoiceTarget.paid || 0);
        if (outstandingAmount > 0) {
          const tenantId = localStorage.getItem('tenantId') || 'solarcorp';
          const today = new Date().toISOString().slice(0, 10);
          // Create journal entry for the outstanding amount as credit
          const invoiceJournalEntry = {
            id: `je-inv-paid-${Date.now()}`,
            _id: `je-inv-paid-${Date.now()}`,
            entryDate: today,
            reference: editInvoiceTarget.invoiceNumber || editInvoiceTarget._id || editInvoiceTarget.id,
            description: `Invoice marked as Paid - ${editInvoiceTarget.customerName || 'Customer'}`,
            entryType: 'Invoice Payment',
            totalDebit: outstandingAmount,
            totalCredit: outstandingAmount,
            lines: [
              {
                accountName: 'Cash/Bank A/c',
                debitAmount: outstandingAmount,
                creditAmount: 0,
                description: 'Cash/Bank A/c Dr.'
              },
              {
                accountName: editInvoiceTarget.invoiceNumber ? `${editInvoiceTarget.customerName} (${editInvoiceTarget.invoiceNumber})` : (editInvoiceTarget.customerName || 'Customer'),
                debitAmount: 0,
                creditAmount: outstandingAmount,
                description: `To ${editInvoiceTarget.customerName || 'Customer'}`
              }
            ]
          };
          // Add to journalEntries state immediately
          setJournalEntries(prev => [invoiceJournalEntry, ...prev]);
          // Save to backend
          try {
            await financeApi.createManualAdjustment({
              type: 'credit',
              category: 'Invoice Payment',
              amount: outstandingAmount,
              reason: `Invoice ${editInvoiceTarget.invoiceNumber || ''} marked as Paid - Outstanding amount received from ${editInvoiceTarget.customerName || 'Customer'}`,
              reference: editInvoiceTarget._id || editInvoiceTarget.id,
              date: today,
              tenantId
            });
            console.log('✅ Saved to backend');
          } catch (err) {
            console.error('Failed to create journal entry for paid invoice:', err);
          }
        }
      }
      setShowEditInvoice(false);
      setEditInvoiceTarget(null);
      toast.success('Invoice updated successfully');
      await fetchData();
    } catch (err) {
      setEditModalError(err.message || 'Failed to update invoice');
    } finally {
      setSavingEditInvoice(false);
    }
  };
  const openDeleteInvoice = (row) => {
    if (!canDeleteInvoice(row)) return;
    setDeleteInvoiceTarget(row);
    setError(null);
    setShowDeleteInvoice(true);
  };
  const openAssignInvoice = (row) => {
    if (!canAssignInvoice(row)) return;
    setAssignInvoiceTarget(row);
    setAssignToUser('');
    setError(null);
    setShowAssignInvoice(true);
  };
  const handleSaveAssignInvoice = async () => {
    if (!assignInvoiceTarget) return;
    if (!assignToUser) {
      setError('Please select a user.');
      return;
    }
    setError('Assign is not available for invoices yet.');
    setShowAssignInvoice(false);
    setAssignInvoiceTarget(null);
    setAssignToUser('');
  };
  const handleConfirmDeleteInvoice = async () => {
    if (!deleteInvoiceTarget) return;
    const invoiceId = deleteInvoiceTarget?._id || deleteInvoiceTarget?.id;
    if (!invoiceId) return;
    try {
      setDeletingInvoice(true);
      setError(null);
      await financeApi.deleteInvoice(invoiceId);
      setShowDeleteInvoice(false);
      setDeleteInvoiceTarget(null);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete invoice');
    } finally {
      setDeletingInvoice(false);
    }
  };
  // Generate next invoice number based on existing invoices
  const getNextInvoiceNumber = () => {
    const prefix = 'INV-';
    const numbers = invoices
      .map(inv => inv.invoiceNumber)
      .filter(num => num && num.startsWith(prefix))
      .map(num => {
        const match = num.match(/INV-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
  }; 
  const exportAllInvoicesCsv = () => {
    if (!canFinance('export')) return;
    const safe = (v) => {
      const s = v == null ? '' : String(v);
      const needsQuotes = /[\n\r,"]/g.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };
    const header = [
      'Invoice #',
      'Customer',
      'Amount',
      'Paid',
      'Balance',
      'Status',
      'Invoice Date',
      'Due Date',
      'Paid On',
      'Reminders',
    ].map(safe).join(',');
    const rows = (invoices || []).map((row) => {
      // Helper to format date as DD-MM-YYYY for Excel
      const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '-';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };
      const cols = [
        row?.invoiceNumber || row?.id || '',
        row?.customerName || '',
        row?.amount ?? '',
        row?.paid ?? '',
        row?.balance ?? '',
        row?.status || '',
        "'" + formatDate(row?.invoiceDate),
        "'" + formatDate(row?.dueDate),
        "'" + formatDate(row?.paidDate),
        (row?.reminderCount > 0) ? row.reminderCount : '-',
      ];
      return cols.map(safe).join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }; 
  useEffect(() => {
    if (!showInvoice) return;
    let mounted = true;
    (async () => {
      try {
        const [customersRes, projectsRes] = await Promise.all([
          financeApi.getCustomers(),
          financeApi.getProjects ? financeApi.getProjects() : Promise.resolve([]),
        ]);
        if (!mounted) return;
        setCustomers(Array.isArray(customersRes) ? customersRes : []);
        setProjects(Array.isArray(projectsRes) ? projectsRes : []);
      } catch {
        if (!mounted) return;
        setCustomers([]);
        setProjects([]);
      }
    })();
    // Pre-fill invoice number when modal opens
    setNewInvoice(prev => ({
      ...prev,
      invoiceNumber: getNextInvoiceNumber(),
    })); 
    return () => {
      mounted = false;
    };
  }, [showInvoice]);
  // Fetch project status and allowed payment terms when project is selected
  useEffect(() => {
    if (!newInvoice.projectId) {
      setAllowedPaymentTerms([]);
      setCanCreateInvoice(true);
      setProjectStatus('');
      setSelectedProjectContractValue(null);
      setNewInvoice((prev) => ({ ...prev, paymentTerms: '' }));
      return; 
    }
    // Reset state immediately to avoid showing stale terms/status from previous project
    latestProjectIdRef.current = newInvoice.projectId;
    setProjectStatus('');
    setAllowedPaymentTerms([]);
    setCanCreateInvoice(false);
    setNewInvoice((prev) => ({ ...prev, paymentTerms: '', email: '', phone: '' }));
    // Try to get payment terms, email, phone from projects list immediately
    const selectedProjectFromList = projects.find(p => (p._id || p.id) === newInvoice.projectId);
    console.log('[Project Select] Selected project from list:', selectedProjectFromList);
    console.log('[Project Select] Payment terms from list:', selectedProjectFromList?.paymentTerms);
    
    // Set payment terms from projects list if available
    if (selectedProjectFromList?.paymentTerms !== undefined && selectedProjectFromList?.paymentTerms !== null) {
      const pt = String(selectedProjectFromList.paymentTerms);
      setNewInvoice(prev => ({ ...prev, paymentTerms: pt }));
      console.log('[Project Select] Payment terms set from list:', pt);
    }
    
    if (selectedProjectFromList?.email) {
      setNewInvoice(prev => ({ ...prev, email: selectedProjectFromList.email }));
      console.log('Email from projects list:', selectedProjectFromList.email);
    }
    if (selectedProjectFromList?.mobileNumber || selectedProjectFromList?.phone || selectedProjectFromList?.customerPhone) {
      const phoneVal = selectedProjectFromList.mobileNumber || selectedProjectFromList.phone || selectedProjectFromList.customerPhone;
      setNewInvoice(prev => ({ ...prev, phone: phoneVal }));
      console.log('Phone from projects list:', phoneVal);
    }
    let mounted = true;
    (async () => {
      try {
        const requestedProjectId = newInvoice.projectId;
        // Fetch project details from main projects endpoint
        const projectRes = await financeApi.getProject(requestedProjectId);
        if (!mounted) return; 
        if (latestProjectIdRef.current !== requestedProjectId) return;
        const projectStatus = projectRes?.status || projectRes?.data?.status || projectRes?.project?.status || '';
        const customerName = projectRes?.customerName || projectRes?.data?.customerName || projectRes?.project?.customerName || '';
        const customerEmail = projectRes?.email || projectRes?.data?.email || projectRes?.project?.email || projectRes?.customerEmail || projectRes?.data?.customerEmail || projectRes?.project?.customerEmail || '';
        let customerPhone = projectRes?.mobileNumber || projectRes?.data?.mobileNumber || projectRes?.project?.mobileNumber || projectRes?.phone || projectRes?.data?.phone || projectRes?.project?.phone || projectRes?.customerPhone || projectRes?.data?.customerPhone || projectRes?.project?.customerPhone;
        console.log('Project Response:', JSON.stringify(projectRes, null, 2));
        console.log('Extracted Email:', customerEmail);
        console.log('Extracted Phone (before fallback):', customerPhone);
        if (!customerPhone) customerPhone = '-';
        console.log('Final Phone:', customerPhone);
        // Get contract value from projects list (already loaded)
        const selectedProject = projects.find(p => (p._id || p.id) === requestedProjectId);
        const contractValueFromList = selectedProject?.value ?? selectedProject?.contractValue ?? selectedProject?.contractAmount;
        const contractValueRaw =
          contractValueFromList ??
          projectRes?.value ??
          projectRes?.data?.value ??
          projectRes?.project?.value ??
          projectRes?.contractValue ??
          projectRes?.data?.contractValue ??
          projectRes?.project?.contractValue ??
          projectRes?.contractAmount ??
          projectRes?.data?.contractAmount ??
          projectRes?.project?.contractAmount;
        const contractValue = Number(contractValueRaw);
        if (!projectStatus) {
          console.error('Project status is empty/undefined. Full response:', projectRes);
        }
        setProjectStatus(projectStatus);
        setNewInvoice(prev => ({ ...prev, customerName, email: customerEmail, phone: customerPhone }));
        if (!Number.isNaN(contractValue) && contractValue > 0) {
          setSelectedProjectContractValue(contractValue);
          setNewInvoice(prev => ({ ...prev, amount: String(contractValue) }));
          setNewInvoiceErrors(prev => ({ ...prev, amount: undefined }));
        } else {
          setSelectedProjectContractValue(null);
        }
        // Get payment terms from project response (from quotation) - PRIORITY OVER LIST
        const projectPaymentTerms = projectRes?.paymentTerms || projectRes?.data?.paymentTerms || projectRes?.project?.paymentTerms;
        console.log('Payment Terms from API:', projectRes);
        console.log('Project Payment Terms:', projectPaymentTerms);
        if (typeof projectPaymentTerms === 'number') {
          // Use the payment terms from quotation as a single value
          setAllowedPaymentTerms([projectPaymentTerms]);
          setCanCreateInvoice(true);
          // Set payment terms in new invoice form (API takes priority)
          const ptString = String(projectPaymentTerms);
          setNewInvoice(prev => ({ ...prev, paymentTerms: ptString }));
          console.log('[API] Payment terms set from API:', ptString);
        } else {
          // No payment terms available from API, keep from list if available
          setAllowedPaymentTerms([]);
          setCanCreateInvoice(false);
          console.log('No payment terms found from API, keeping from list if available');
        }
      } catch (err) {
        console.error('Failed to fetch project status:', err);
        if (!mounted) return;
        setAllowedPaymentTerms([]);
        setCanCreateInvoice(false);
        setProjectStatus('');
        setSelectedProjectContractValue(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [newInvoice.projectId, projects]);
  const handleStageChange = async (id, newStage, skipConfirm = false) => {
    const existing = (invoices || []).find(i => String(i._id || i.id) === String(id));
    const previousStatus = existing?.status;
    if (previousStatus && previousStatus !== newStage) {
      const order = {
        Draft: 0,
        Sent: 1,
        Pending: 2,
        Partial: 3,
        Paid: 4,
        Overdue: 5,
      };
          const isBackward = order[newStage] < order[previousStatus];
          // Only allow backward transition with confirmation for Overdue -> Partial/Paid
          const isOverdueToPartialOrPaid = previousStatus === 'Overdue' && (newStage === 'Partial' || newStage === 'Paid');
          if (isBackward && !skipConfirm) {
            if (isOverdueToPartialOrPaid) {
              setPendingStageChange({ id, newStage, previousStatus });
              setShowStatusChangeConfirm(true);
              return;
            } else {
              toast.error('Invoice status cannot be moved backward.');
              return;
            }
          }
          const allowedTransitions = new Set([
            'Draft->Sent',
        'Draft->Sent',
        'Sent->Partial',
        'Sent->Paid',
        'Pending->Partial',
        'Pending->Paid',
        'Partial->Paid',
        'Overdue->Partial',
        'Overdue->Paid'
      ]);
      const key = `${previousStatus}->${newStage}`;
      if (!allowedTransitions.has(key)) {
        toast.error('Invalid invoice status transition');
        return;
      }
    }
    try {
      await financeApi.updateInvoiceStatus(id, newStage);
      setInvoices(prev => prev.map(i => {
        if (i._id === id || i.id === id) {
          // If becoming Paid, set paid = amount, balance = 0, and paidDate = today
          if (newStage === 'Paid') {
            return { 
              ...i, 
              status: newStage, 
              paid: i.amount || 0, 
              balance: 0,
              paidDate: new Date().toISOString()
            };
          }
          return { ...i, status: newStage };
        }
        return i;
      }));
      if (newStage === 'Partial' && (previousStatus === 'Sent' || previousStatus === 'Overdue') && existing) {
        const outstandingAmount = (existing.amount || 0) - (existing.paid || 0);
        setAdjustRevertState({ invoiceId: existing._id || existing.id, previousStatus });
        setAdjustForm({ 
          type: 'credit',
          category: 'Invoice Amount Received',
          amount: String(outstandingAmount),
          lf: '',
          reason: `Partial payment for invoice ${existing.invoiceNumber || ''}`,
          reference: '',
          date: new Date().toISOString().slice(0, 10),
          selectedInvoiceId: existing._id || existing.id,
          selectedVendorId: '',
          paymentMethod: 'Bank Transfer',
        });
        setShowAdjustModal(true);
      }
      
      // Draft -> Sent with payment terms: Open adjust modal for advance payment
      if (newStage === 'Sent' && previousStatus === 'Draft' && existing && existing.paymentTerms) {
        const paymentTermsStr = String(existing.paymentTerms);
        const percentageMatch = paymentTermsStr.match(/(\d+)/);
        
        if (percentageMatch) {
          const percentage = parseFloat(percentageMatch[1]);
          const totalAmount = Number(existing.amount || 0);
          const advanceAmount = totalAmount * (percentage / 100);
          
          // Only show modal if advance amount > 0
          if (advanceAmount > 0) {
            setAdjustForm({ 
              type: 'credit',
              category: 'Invoice Amount Received',
              amount: String(advanceAmount),
              lf: '',
              reason: `Advance payment for invoice ${existing.invoiceNumber || ''}`,
              reference: existing._id || existing.id,
              date: new Date().toISOString().slice(0, 10),
              selectedInvoiceId: existing._id || existing.id,
              selectedVendorId: '',
              paymentMethod: 'Bank Transfer',
            });
            setShowAdjustModal(true);
          }
        }
      }
      // Create journal entry when invoice becomes Paid (from Sent or Partial)
      if (newStage === 'Paid' && existing) {
        const outstandingAmount = (existing.amount || 0) - (existing.paid || 0);
        if (outstandingAmount > 0) {
          const tenantId = localStorage.getItem('tenantId') || 'solarcorp';
          const today = new Date().toISOString().slice(0, 10);
          // Create journal entry for the outstanding amount as credit
          const invoiceJournalEntry = {
            id: `je-inv-paid-${Date.now()}`,
            _id: `je-inv-paid-${Date.now()}`,
            entryDate: today,
            reference: existing.invoiceNumber || existing._id || existing.id,
            description: `Invoice marked as Paid - ${existing.customerName || 'Customer'}`,
            entryType: 'Invoice Payment',
            totalDebit: outstandingAmount,
            totalCredit: outstandingAmount,
            lines: [
              {
                accountName: 'Cash/Bank A/c',
                debitAmount: outstandingAmount,
                creditAmount: 0,
                description: 'Cash/Bank A/c Dr.'
              }, 
              { 
                accountName: existing.invoiceNumber ? `${existing.customerName} (${existing.invoiceNumber})` : (existing.customerName || 'Customer'),
                debitAmount: 0,
                creditAmount: outstandingAmount,
                description: `To ${existing.customerName || 'Customer'}`
              }
            ] 
          };
          // Add to journalEntries state immediately
          setJournalEntries(prev => [invoiceJournalEntry, ...prev]);
          // Save to backend
          try {
            await financeApi.createManualAdjustment({
              type: 'credit',
              category: 'Invoice Payment',
              amount: outstandingAmount,
              reason: `Invoice ${existing.invoiceNumber || ''} marked as Paid - Outstanding amount received from ${existing.customerName || 'Customer'}`,
              reference: existing._id || existing.id,
              date: today,
              tenantId
            });
            console.log('✅ Saved to backend');
          // Note: Local journal entry already added above with lf field
          // Backend may not return lf, so we keep local state
          } catch (err) {
            console.error('Failed to create journal entry for paid invoice:', err);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to update invoice status');
    }
  };
  const handleCreateInvoice = async () => {
    // Validation
    const nextErrors = {};
    const invoiceNumberTrimmed = newInvoice.invoiceNumber.trim();
    if (!newInvoice.invoiceNumber.trim()) nextErrors.invoiceNumber = 'Invoice Number is required';
    if (!newInvoice.projectId) nextErrors.projectId = 'Project is required';
    if (!newInvoice.amount || parseFloat(newInvoice.amount) <= 0) nextErrors.amount = 'Valid Invoice Amount is required';
    if (!newInvoice.invoiceDate) nextErrors.invoiceDate = 'Invoice Date is required';
    if (!newInvoice.dueDate) nextErrors.dueDate = 'Due Date is required';
    if (
      newInvoice.projectId &&
      selectedProjectContractValue !== null &&
      !Number.isNaN(Number(newInvoice.amount)) &&
      Number(newInvoice.amount) > Number(selectedProjectContractValue)
    ) {
      nextErrors.amount = 'Invoice amount cannot exceed the project contract value';
    }
    if (newInvoice.invoiceDate && newInvoice.dueDate && String(newInvoice.dueDate) < String(newInvoice.invoiceDate)) {
      nextErrors.dueDate = 'Due Date must be on/after Invoice Date';
    }
    // Check if invoice number already exists in frontend (visible invoices)
    const invoiceNumberExists = (invoices || []).some(
      (inv) => String(inv?.invoiceNumber || '').trim().toLowerCase() === invoiceNumberTrimmed.toLowerCase()
    );
    if (invoiceNumberExists) {
      nextErrors.invoiceNumber = `Invoice Number '${invoiceNumberTrimmed}' already exists`;
    }
    if (Object.keys(nextErrors).length > 0) {
      setNewInvoiceErrors(nextErrors);
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      setNewInvoiceErrors({});
      // Format data for API - only send fields that are in CreateInvoiceDto
      const invoiceData = {
        invoiceNumber: invoiceNumberTrimmed,
        projectId: newInvoice.projectId || undefined,
        projectStatus: projectStatus || undefined,
        customerName: newInvoice.customerName.trim(),
        email: newInvoice.email?.trim() || undefined,
        phone: newInvoice.phone?.trim() || undefined,
        amount: parseFloat(newInvoice.amount),
        invoiceDate: newInvoice.invoiceDate,
        dueDate: newInvoice.dueDate,
        ...(newInvoice.paymentTerms && { paymentTerms: newInvoice.paymentTerms }),
        ...(newInvoice.description && { description: newInvoice.description }),
      };
      const res = await financeApi.createInvoice(invoiceData);
      console.log('✅ Invoice created successfully:', invoiceData);
      console.log('📋 API Response:', res);
      console.log('📋 Phone sent:', newInvoice.phone);
      console.log('📋 Payment Terms sent:', newInvoice.paymentTerms);
      // Immediately fetch updated list to see if fields are present
      console.log('🔄 Fetching updated invoice list...');
      const updatedInvoices = await financeApi.getInvoices();
      console.log('📊 Updated invoices count:', updatedInvoices?.length || 0);
      if (updatedInvoices && updatedInvoices.length > 0) {
        const latestInv = updatedInvoices[0];
        console.log('📋 Latest invoice from API:', JSON.stringify(latestInv, null, 2));
        console.log('📋 Latest invoice phone:', latestInv?.phone);
        console.log('📋 Latest invoice payment terms:', latestInv?.paymentTerms);
      }
      setShowInvoice(false);
      setNewInvoice({
        invoiceNumber: getNextInvoiceNumber(),
        projectId: '',
        customerName: '',
        amount: '',
        invoiceDate: '',
        dueDate: '',
        paymentTerms: '',
        description: '',
        email: '',
        phone: '',
      });
      setNewInvoiceErrors({});
      // Reset allowed payment terms and project status
      setAllowedPaymentTerms([]);
      setCanCreateInvoice(true);
      setProjectStatus('');
      // Refresh data to show new invoice
      console.log('🔄 Fetching updated invoice list...');
      await fetchData();
      console.log('✅ Invoice list refreshed');
    } catch (err) {
      setError(err.message || 'Failed to create invoice');
      console.error('❌ Invoice creation error:', err);
    } finally {
      setSubmitting(false);
    }
  };
  const handleSendReminder = async () => {
    if (!selectedReminderInvoice) return;
    // Validation
    if (!reminderForm.customerEmail.trim()) {
      setError('Customer email is required');
      return;
    }
    try {
      setSendingReminder(true);
      setError(null);
      await financeApi.sendInvoiceReminder(selectedReminderInvoice._id || selectedReminderInvoice.id, {
        reminderType: reminderForm.reminderType,
        customerEmail: reminderForm.customerEmail.trim(),
        messageBody: reminderForm.messageBody,
      });
      setReminderSuccess(true);
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowReminderModal(false);
        setSelectedReminderInvoice(null);
        setReminderForm({ reminderType: 'Gentle', customerEmail: '', messageBody: '' });
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
  };
  const clampAmount = (val, max) => {
    const num = Number(val);
    if (Number.isNaN(num) || num <= 0) return '';
    if (typeof max === 'number' && max > 0) return String(Math.min(num, max));
    return String(num);
  };
  const handleRecordPayment = async () => {
    // Validation
    const nextErrors = {};
    if (!recordPayment.referenceId) nextErrors.referenceId = recordPayment.paymentType === 'Customer Payment' ? 'Invoice is required' : 'Vendor is required';
    const maxAmount = Number(recordPayment.maxAmount || 0);
    const amountNum = Number(recordPayment.amount);
    if (!recordPayment.amount || Number.isNaN(amountNum) || amountNum <= 0) nextErrors.amount = 'Valid amount greater than 0 is required';
    if (maxAmount > 0 && amountNum > maxAmount) nextErrors.amount = `Amount cannot exceed ₹${maxAmount}`;
    if (!recordPayment.paymentDate) nextErrors.paymentDate = 'Payment date is required';
    if (!recordPayment.paymentMethod) nextErrors.paymentMethod = 'Payment method is required';
    if (Object.keys(nextErrors).length > 0) {
      setRecordPaymentErrors(nextErrors);
      return;
    }
    try {
      setSubmittingPayment(true);
      setError(null);
      setRecordPaymentErrors({});
      const paymentData = {
        paymentType: recordPayment.paymentType,
        referenceType: recordPayment.referenceType,
        referenceId: recordPayment.referenceId,
        amount: parseFloat(recordPayment.amount),
        paymentDate: recordPayment.paymentDate,
        paymentMethod: recordPayment.paymentMethod,
        notes: recordPayment.notes?.trim() || undefined,
      };
      await financeApi.initiateFinancePayment(paymentData);
      setShowRecordPayment(false);
      setRecordPayment({
        paymentType: 'Customer Payment',
        referenceType: 'Invoice',
        referenceId: '',
        amount: '',
        maxAmount: 0,
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'Bank Transfer',
        notes: '',
      });
      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };
  // Handle delete journal entry
  const handleDeleteJournalEntry = async (entry) => {
    if (!entry?._id && !entry?.id) {
      console.error('No entry ID to delete');
      return;
    }
    const entryId = entry._id || entry.id;
    const entryIdStr = typeof entryId === 'string' ? entryId : entryId.toString();
    // Skip local-only entries (vendor payment entries created locally)
    if (entryIdStr.startsWith('ven-') || entryIdStr.startsWith('TXN-VEN-')) {
      console.log('Removing local-only entry:', entryIdStr);
      setJournalEntries(prev => prev.filter(e => (e._id || e.id) !== entryId));
      return;
    }
    if (!window.confirm('Are you sure you want to delete this entry? This will also update the cash position.')) {
      return;
    }
    try {
      setLoading(true);
      console.log('Deleting journal entry:', entryIdStr);
      // Delete from backend
      await financeApi.deleteJournalEntry(entryIdStr);
      // Remove from local state
      setJournalEntries(prev => prev.filter(e => (e._id || e.id) !== entryId));
      // Refresh balance to reflect in cash position
      const newBalance = await financeApi.getManualAdjustmentBalance();
      setManualBalance(newBalance);
      console.log('Entry deleted successfully');
    } catch (error) {
      console.error('Failed to delete journal entry:', error);
      alert('Failed to delete entry: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  const handleSubmitAdjustment = async () => {
    const nextErrors = {};
    const amountNum = Number(adjustForm.amount);
    if (!adjustForm.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      nextErrors.amount = 'Amount must be greater than 0';
    }
    if (!adjustForm.date) {
      nextErrors.date = 'Date is required';
    }
    if (!adjustForm.category) {
      nextErrors.category = 'Category is required';
    }
    // Validate invoice selection for Invoice Amount Received
    if (adjustForm.type === 'credit' && adjustForm.category === 'Invoice Amount Received' && !adjustForm.selectedInvoiceId) {
      nextErrors.selectedInvoiceId = 'Please select an invoice';
    }
    // Validate vendor selection for Vendor Payment
    if (adjustForm.type === 'debit' && adjustForm.category === 'Vendor Payment' && !adjustForm.selectedVendorId) {
      nextErrors.selectedVendorId = 'Please select a vendor';
    }
    // Validate payment amount doesn't exceed total invoice amount for invoice payments
    if (adjustForm.type === 'credit' && (adjustForm.category === 'Invoice Payment' || adjustForm.category === 'Invoice Amount Received') && adjustForm.selectedInvoiceId) {
      const inv = invoices.find(i => (i._id || i.id) === adjustForm.selectedInvoiceId);
      if (inv) {
        // Check if amount exceeds total invoice amount (not just outstanding)
        if (amountNum > inv.amount) {
          nextErrors.amount = `Amount cannot exceed total invoice amount of ${fmt(inv.amount)}`;
          toast.error(`Cannot pay more than total invoice amount of ${fmt(inv.amount)}`);
        }
      }
    }
    // Validate amount doesn't exceed cash position for debit transactions
    if (adjustForm.type === 'debit') {
      if (amountNum > cashPosition) {
        nextErrors.amount = `Amount cannot exceed available cash position of ${fmt(cashPosition)}`;
        toast.error(`Cannot debit more than available cash position of ${fmt(cashPosition)}`);
      }
      // Additional validation for vendor payments - also check outstanding amount
      if (adjustForm.category === 'Vendor Payment' && adjustForm.selectedVendorId) {
        const vendor = payables.find(p => String(p.vendorObjectId || p.vendorId) === adjustForm.selectedVendorId);
        if (vendor && amountNum > (vendor.outstandingAmount || 0)) {
          nextErrors.amount = `Amount cannot exceed outstanding balance of ${fmt(vendor.outstandingAmount)}`;
          toast.error(`Amount cannot exceed outstanding balance of ${fmt(vendor.outstandingAmount)}`);
        }
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setAdjustErrors(nextErrors);
      return;
    }
    try {
      setSubmittingAdjust(true);
      setAdjustError(null);
      // Handle Invoice Payment (Credit - Invoice Amount Received)
      if (adjustForm.type === 'credit' && adjustForm.category === 'Invoice Amount Received' && adjustForm.selectedInvoiceId) {
        const inv = invoices.find(i => (i._id || i.id) === adjustForm.selectedInvoiceId);
        console.log('Processing invoice payment:', {
          invoiceId: adjustForm.selectedInvoiceId,
          invoiceNumber: inv?.invoiceNumber,
          amount: amountNum,
          currentPaid: inv?.paid || 0,
          outstanding: inv?.amount - (inv?.paid || 0)
        });
        // Create journal entry directly for UI display - Double entry format
        const invoiceJournalEntry = {
          id: `inv-${Date.now()}`,
          date: adjustForm.date,
          description: `Invoice payment: ${inv?.customerName || 'Customer'}`,
          type: 'Income',
          category: 'Invoice Payment',
          referenceId: adjustForm.selectedInvoiceId,
          transactionNumber: `TXN-INV-${Date.now().toString().slice(-6)}`,
          status: 'Completed',
          narration: adjustForm.reason || `Payment received from ${inv?.customerName || 'Customer'}`,
          createdAt: new Date(adjustForm.date + 'T00:00:00.000Z'),
          lf: adjustForm.lf ? parseInt(adjustForm.lf) : undefined,
          lines: [
            {
              accountName: 'Cash/Bank A/c',
              debitAmount: amountNum,
              creditAmount: 0,
              description: 'Cash/Bank A/c'
            },
            {
              accountName: inv?.invoiceNumber ? `${inv.customerName} (${inv.invoiceNumber})` : (inv?.customerName || 'Customer'),
              debitAmount: 0,
              creditAmount: amountNum,
              description: `To ${inv?.customerName || 'Customer'}`
            }
          ]
        };
        const tenantId = localStorage.getItem('tenantId') || 'solarcorp';
        try {
          console.log('Saving to backend with tenantId:', tenantId);
          await financeApi.createManualAdjustment({
            type: 'credit',
            category: 'Invoice Payment',
            amount: amountNum,
            reason: adjustForm.reason || `Payment received from ${inv?.customerName || 'Customer'}`,
            reference: adjustForm.selectedInvoiceId,
            date: adjustForm.date,
            tenantId,
            lf: adjustForm.lf ? parseInt(adjustForm.lf) : undefined
          });
          console.log('✅ Saved to backend');
          // Note: Local journal entry already added above with lf field
          // Backend may not return lf, so we keep local state
        } catch (err) {
          console.error('Backend save error:', err?.response?.data || err?.message);
        }
        // Update local invoice state (will be overwritten by refetch, but keeps UI responsive)
        let becamePaid = false;
        const newPaid = (inv?.paid || 0) + amountNum;
        const newBalance = inv?.amount - newPaid;
        const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';
        if (newStatus === 'Paid') {
          becamePaid = true;
        }
        setInvoices(prev => prev.map(invItem => {
          if ((invItem._id || invItem.id) === adjustForm.selectedInvoiceId) {
            return { ...invItem, paid: newPaid, balance: newBalance, status: newStatus, paidDate: adjustForm.date };
          }
          return invItem;
        }));
        // Show notification if invoice became fully paid
        if (becamePaid) {
          toast.success('Invoice fully paid! Status moved to Paid.', { duration: 4000 });
        }
        // Update manual balance locally (increase cash position for credit)
        setManualBalance(prev => prev + amountNum);
        setShowAdjustModal(false);
        setAdjustRevertState(null);
        setAdjustForm({
          type: 'credit',
          category: '',
          amount: '',
          lf: '',
          reason: '',
          reference: '',
          date: new Date().toISOString().slice(0, 10),
          selectedInvoiceId: '',
          selectedVendorId: '',
          selectedPurchaseOrderId: '',
          paymentMethod: 'Bank Transfer',
        });
        setAdjustErrors({});
        setAdjustError(null);
        toast.success(`Payment of ${fmt(amountNum)} recorded for invoice successfully`);
        // Refresh data from database to ensure changes persist
        await fetchData();
        return;
      }
      // Handle Vendor Payment (Debit - Vendor Payment) - Direct Update Method
      if (adjustForm.type === 'debit' && adjustForm.category === 'Vendor Payment' && adjustForm.selectedVendorId) {
        const vendor = payables.find(p => String(p.vendorObjectId || p.vendorId) === adjustForm.selectedVendorId);
        console.log('Processing vendor payment:', {
          vendorId: adjustForm.selectedVendorId,
          vendorName: vendor?.vendorName,
          amount: amountNum,
          outstandingAmount: vendor?.outstandingAmount,
          selectedPOId: adjustForm.selectedPurchaseOrderId
        });
        
        // Create journal entry directly for UI display - Double entry format
        const journalEntry = {
          id: `ven-${Date.now()}`,
          date: adjustForm.date,
          description: `Vendor payment: ${vendor?.vendorName || 'Vendor'}`,
          type: 'Expense',
          category: 'Vendor Bill Payment',
          referenceId: adjustForm.selectedVendorId,
          transactionNumber: `TXN-VEN-${Date.now().toString().slice(-6)}`,
          status: 'Completed',
          narration: adjustForm.reason || `Payment made to ${vendor?.vendorName || 'Vendor'}`,
          createdAt: new Date(adjustForm.date + 'T00:00:00.000Z'),
          lf: adjustForm.lf ? parseInt(adjustForm.lf) : undefined,
          lines: [
            {
              accountName: vendor?.vendorName || 'Vendor',
              debitAmount: amountNum,
              creditAmount: 0,
              description: `${vendor?.vendorName || 'Vendor'}`
            },
            {
              accountName: 'Cash/Bank A/c',
              debitAmount: 0,
              creditAmount: amountNum,
              description: 'To Cash/Bank A/c'
            }
          ]
        };
        console.log('Created vendor journal entry:', journalEntry);
        // Add to journalEntries state immediately
        setJournalEntries(prev => {
          console.log('Adding to journalEntries. Current count:', prev.length);
          const updated = [journalEntry, ...prev];
          console.log('Updated journalEntries count:', updated.length);
          return updated;
        });
        
        // Save to backend - Use Manual Adjustment API which auto-allocates to oldest POs
        try {
          const tenantId = localStorage.getItem('tenantId') || 'solarcorp';
          console.log('Saving vendor payment via manual adjustment with tenantId:', tenantId);
          
          // Call createManualAdjustment API which auto-allocates payment to oldest POs first
          const adjustmentResult = await financeApi.createManualAdjustment({
            type: 'debit',
            category: 'Vendor Payment',
            amount: amountNum,
            reason: adjustForm.reason || `Payment to ${vendor?.vendorName || 'Vendor'}`,
            reference: adjustForm.selectedVendorId,
            date: adjustForm.date,
            tenantId,
            lf: adjustForm.lf ? parseInt(adjustForm.lf) : undefined
          });
          
          console.log('✓ Saved vendor payment via manual adjustment, result:', adjustmentResult);
          
          // Update local payables state AFTER successful API call
          setPayables(prev => {
            const updatedPayables = prev.map(p => {
              if (String(p.vendorObjectId || p.vendorId) === adjustForm.selectedVendorId) {
                const newPaid = (p.amountPaid || 0) + amountNum;
                const newOutstanding = (p.outstandingAmount || 0) - amountNum;
                return {
                  ...p,
                  amountPaid: newPaid,
                  outstandingAmount: newOutstanding,
                  status: newOutstanding <= 0 ? 'Paid' : 'Partial'
                };
              }
              return p;
            });
            return updatedPayables;
          });
          
          // CRITICAL: Force update purchaseOrders state by fetching fresh data from backend
          // This ensures PO Details table shows the correct paidAmount immediately
          try {
            const freshPOs = await api.get('/finance/vendors/purchase-orders');
            const posData = Array.isArray(freshPOs) ? freshPOs : (freshPOs?.data || []);
            console.log('[PAYMENT] Fetched fresh POs from finance API:', posData.length);
            
            // Find the specific PO that was paid
            const paidPO = posData.find(po => 
              String(po._id || po.id) === String(adjustForm.selectedPurchaseOrderId)
            );
            
            if (paidPO) {
              console.log('[PAYMENT] Found paid PO in fresh data:', {
                id: paidPO.id || paidPO._id,
                paidAmount: paidPO.paidAmount,
                totalAmount: paidPO.totalAmount
              });
              
              // Manually update this PO's paidAmount in state
              setPurchaseOrders(prev => {
                const updated = prev.map(po => {
                  if (String(po._id || po.id) === String(adjustForm.selectedPurchaseOrderId)) {
                    // Use the paidAmount from backend response or calculate it
                    const backendPaidAmount = paidPO.paidAmount !== undefined 
                      ? Number(paidPO.paidAmount) 
                      : (Number(po.paidAmount || 0) + amountNum);
                    
                    return {
                      ...po,
                      paidAmount: backendPaidAmount,
                      outstandingAmount: Number(po.totalAmount || 0) - backendPaidAmount
                    };
                  }
                  return po;
                });
                console.log('[PAYMENT] Updated purchaseOrders, paid PO now has paidAmount:', 
                  updated.find(po => String(po._id || po.id) === String(adjustForm.selectedPurchaseOrderId))?.paidAmount
                );
                return updated;
              });
            } else {
              console.warn('[PAYMENT] Could not find paid PO in fresh data');
            }
          } catch (fetchErr) {
            console.error('[PAYMENT] Failed to fetch fresh POs:', fetchErr);
            // Fallback: manually update the PO
            setPurchaseOrders(prev => {
              const updatedPOs = prev.map(po => {
                if (String(po._id || po.id) === String(adjustForm.selectedPurchaseOrderId)) {
                  const currentPaid = Number(po.paidAmount || 0);
                  return {
                    ...po,
                    paidAmount: currentPaid + amountNum,
                    outstandingAmount: Number(po.totalAmount || 0) - (currentPaid + amountNum)
                  };
                }
                return po;
              });
              return updatedPOs;
            });
          }
        } catch (err) {
          console.error('Backend save error:', err?.response?.data || err?.message);
          toast.error('Failed to save vendor payment to backend');
          return;
        }
        // Update manual balance locally (reduce cash position for debit)
        setManualBalance(prev => prev - amountNum);
        setShowAdjustModal(false);
        setAdjustForm({
          type: 'credit',
          category: '',
          amount: '',
          lf: '',
          reason: '',
          reference: '',
          date: new Date().toISOString().slice(0, 10),
          selectedInvoiceId: '',
          selectedVendorId: '',
          selectedPurchaseOrderId: '',
          paymentMethod: 'Bank Transfer',
        });
        setAdjustErrors({});
        setAdjustError(null);
        toast.success(`Vendor payment of ${fmt(amountNum)} to ${vendor?.vendorName || 'Vendor'} recorded successfully. Auto-allocated to oldest POs.`);
        // Refresh data from database to ensure changes persist
        await fetchData();
        return;
      }
      // Default: Create manual adjustment for other categories
      console.log('Creating manual adjustment for category:', adjustForm.category);
      console.log('Current manual balance before adjustment:', manualBalance);
      console.log('Adjustment details:', { type: adjustForm.type, amount: amountNum, category: adjustForm.category });
      // Create journal entry directly for UI display - Double entry format
      const adjustmentJournalEntry = {
        id: `adj-${Date.now()}`,
        date: adjustForm.date,
        description: `Manual adjustment: ${adjustForm.reason || adjustForm.type}`,
        type: adjustForm.type === 'debit' ? 'Expense' : 'Income',
        category: adjustForm.category || 'Manual Adjustment',
        referenceId: adjustForm.reference,
        transactionNumber: `TXN-ADJ-${Date.now().toString().slice(-6)}`,
        status: 'Completed',
        narration: adjustForm.reason || `${adjustForm.type} adjustment - ${adjustForm.category}`,
        createdAt: new Date(adjustForm.date + 'T00:00:00.000Z'),
        lf: adjustForm.lf ? parseInt(adjustForm.lf) : undefined,
        lines: adjustForm.type === 'debit' ? [
          {
            accountName: adjustForm.category || 'Expense',
            debitAmount: amountNum,
            creditAmount: 0,
            description: `${adjustForm.category || 'Expense'}`
          },
          {
            accountName: 'Cash/Bank A/c',
            debitAmount: 0,
            creditAmount: amountNum,
            description: 'To Cash/Bank A/c'
          }
        ] : [
          {
            accountName: 'Cash/Bank A/c',
            debitAmount: amountNum,
            creditAmount: 0,
            description: 'Cash/Bank A/c'
          },
          {
            accountName: adjustForm.category || 'Income',
            debitAmount: 0,
            creditAmount: amountNum,
            description: `To ${adjustForm.category || 'Income'}`
          }
        ]
      };
      console.log('Created manual adjustment journal entry:', adjustmentJournalEntry);
      // Add to journalEntries state immediately
      setJournalEntries(prev => {
        console.log('Adding to journalEntries. Current count:', prev.length);
        const updated = [adjustmentJournalEntry, ...prev];
        console.log('Updated journalEntries count:', updated.length);
        return updated;
      });
      // Save to backend with tenantId
      try {
        const tenantId = localStorage.getItem('tenantId') || 'solarcorp';
        console.log('Saving to backend with tenantId:', tenantId);
        await financeApi.createManualAdjustment({
          type: adjustForm.type,
          category: adjustForm.category || 'Manual Adjustment',
          amount: amountNum,
          reason: adjustForm.reason || 'Manual adjustment',
          reference: adjustForm.reference || '',
          date: adjustForm.date,
          tenantId,
          lf: adjustForm.lf ? parseInt(adjustForm.lf) : undefined
        });
        console.log('✅ Saved to backend');
        // Note: Local journal entry already added above with lf field
        // Backend may not return lf, so we keep local state
      } catch (err) {
        console.error('Backend save error:', err?.response?.data || err?.message);
      }
      // Update manual balance locally
      setManualBalance(prev => {
        const newBalance = adjustForm.type === 'credit' ? prev + amountNum : prev - amountNum;
        console.log('Updating manual balance:', { old: prev, new: newBalance, amount: amountNum, type: adjustForm.type });
        return newBalance;
      });
      console.log('Manual adjustment completed successfully');
      setShowAdjustModal(false);
      setAdjustForm({
        type: 'credit',
        category: '',
        amount: '',
        reason: '',
        reference: '',
        date: new Date().toISOString().slice(0, 10),
        selectedInvoiceId: '',
        selectedVendorId: '',
        selectedPurchaseOrderId: '',
        paymentMethod: 'Bank Transfer',
      });
      setAdjustErrors({});
      setAdjustError(null);
      toast.success(`Manual ${adjustForm.type} of ${fmt(amountNum)} recorded successfully`);
      // Refresh data from database to ensure changes persist
      await fetchData();
    } catch (err) {
      console.error('Error in handleSubmitAdjustment:', err);
      setAdjustError(err.message || 'Failed to record adjustment');
    } finally {
      setSubmittingAdjust(false);
    }
  };
  const fetchTimeline = async (invoiceId) => {
    try {
      setLoadingTimeline(true);
      const data = await financeApi.getInvoiceTimeline(invoiceId);
      setTimelineData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
      setTimelineData([]);
    } finally {
      setLoadingTimeline(false);
    }
  };
  const filteredInvoices = useMemo(() =>
    (filteredInvoicesByYear || []).filter(inv =>
      (invStatus === 'All' ||
        inv.status === invStatus ||
        // Handle Pending status showing as Sent in UI
        (invStatus === 'Sent' && inv.status === 'Pending') ||
        // Handle Outstanding filter - show Draft, Sent, Partial, Overdue (exclude Paid)
        (invStatus === 'Outstanding' && ['Draft', 'Sent', 'Partial', 'Overdue', 'Pending'].includes(inv.status))
      ) &&
      inv.customerName?.toLowerCase().includes(invSearch.toLowerCase())
    ), [filteredInvoicesByYear, invSearch, invStatus]);
  const paginatedInvoices = useMemo(() =>
    filteredInvoices.slice((page - 1) * pageSize, page * pageSize),
    [filteredInvoices, page, pageSize]);
  const safeDateForSummary = (d) => {
    if (!d) return null;
    if (d instanceof Date) {
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof d === 'string') {
      const m = d.trim().match(/^([0-3]\d)[-\/](0\d|1[0-2])[-\/](\d{4})$/);
      if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = Number(m[3]);
        const dt = new Date(year, month - 1, day);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }
    }
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };
  // Filter data based on date range
  const filteredRevenueData = useMemo(() => {
    return (monthlyRevenue || []).filter(item => {
      const itemDate = new Date(item.month + ' 01, ' + selectedYear);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    });
  }, [dateRange, selectedYear]);
  const filteredCashFlowData = useMemo(() => {
    return (cashFlow || []).filter(item => {
      const itemDate = new Date(item.month + ' 01, ' + selectedYear);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    });
  }, [dateRange, selectedYear]);
  const exportInvoiceCsv = (row) => {
    const r = row || {};
    const headers = ['Invoice Number', 'Customer', 'Status', 'Amount', 'Paid', 'Balance', 'Invoice Date', 'Due Date'];
    const values = [
      r.invoiceNumber || r.id || '',
      r.customerName || '',
      r.status || '',
      r.amount ?? '',
      r.paid ?? '',
      r.balance ?? '',
      r.invoiceDate || '',
      r.dueDate || '',
    ];
    const csv = `${headers.join(',')}\n${values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${r.invoiceNumber || r.id || 'export'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const exportJournalEntriesCsv = () => {
    // Prepare data rows
    const rows = [];
    let debitTotal = 0;
    let creditTotal = 0;
    const dataToExport = calendarFilterYear === 'all' ? journalEntries : filteredJournalEntriesByYear;
    dataToExport.forEach(entry => {
      const date = entry.date ? new Date(entry.date).toISOString().slice(0, 10) : '';
      const narration = entry.narration || '';
      const debitLines = entry.lines?.filter(l => l.debitAmount > 0) || [];
      const creditLines = entry.lines?.filter(l => l.creditAmount > 0) || [];
      // Add debit lines
      debitLines.forEach((line, idx) => {
        debitTotal += Number(line.debitAmount || 0);
        rows.push({
          Date: idx === 0 ? date : '',
          Particulars: `${line.accountName} Dr.`,
          'Ledger / Account': line.accountName || '',
          'L.F.': idx === 0 ? (entry.lf != null && entry.lf !== undefined ? entry.lf : '') : '',
          'Debit Amount (Dr.)': line.debitAmount || 0,
          'Credit Amount (Cr.)': '',
          'Narration / Notes': idx === 0 ? narration : ''
        });
      });
      // Add credit lines
      creditLines.forEach((line) => {
        creditTotal += Number(line.creditAmount || 0);
        rows.push({
          Date: '',
          Particulars: `To ${line.accountName}`,
          'Ledger / Account': line.accountName || '',
          'L.F.': '',
          'Debit Amount (Dr.)': '',
          'Credit Amount (Cr.)': line.creditAmount || 0,
          'Narration / Notes': ''
        });
      });
    });
    // Add totals row
    rows.push({
      Date: '',
      Particulars: 'TOTAL',
      'Ledger / Account': '',
      'L.F.': '',
      'Debit Amount (Dr.)': debitTotal,
      'Credit Amount (Cr.)': creditTotal,
      'Narration / Notes': ''
    });
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(rows);
    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Date
      { wch: 35 },  // Particulars
      { wch: 25 },  // Ledger / Account
      { wch: 8 },   // L.F.
      { wch: 18 },  // Debit Amount
      { wch: 18 },  // Credit Amount
      { wch: 40 }   // Narration
    ];
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Journal Entries');
    // Download file
    XLSX.writeFile(wb, `journal_entries_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const exportManualAdjustmentsCsv = () => {
    const rows = [];
    const dataToExport = calendarFilterYear === 'all' ? manualAdjustments : filteredManualAdjustmentsByYear;
    dataToExport.forEach(adj => {
      rows.push({
        Date: adj.date ? new Date(adj.date).toISOString().slice(0, 10) : '',
        Type: adj.type || '',
        Category: adj.category || '',
        Amount: adj.amount || 0,
        Reason: adj.reason || '',
        Reference: adj.reference || '',
        'L.F.': adj.lf != null && adj.lf !== undefined ? adj.lf : '',
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 },  // Date
      { wch: 10 },  // Type
      { wch: 20 },  // Category
      { wch: 15 },  // Amount
      { wch: 40 },  // Reason
      { wch: 20 },  // Reference
      { wch: 8 },   // L.F.
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const INV_ACTIONS = [
    { label: 'View Invoice', icon: FileText, onClick: row => setSelected(row) },
    ...(canFinance('edit') ? [
      {
        label: 'Edit',
        icon: Edit,
        show: (row) => row?.status !== 'Paid',
        onClick: (row) => openEditInvoice(row),
      },
    ] : []),
    ...(canFinance('export') ? [
      {
        label: 'Export',
        icon: Download,
        onClick: (row) => exportInvoiceCsv(row),
      },
    ] : []),
    ...(canFinance('delete') ? [
      {
        label: 'Delete',
        icon: Trash2,
        danger: true,
        show: (row) => row?.status !== 'Paid',
        onClick: (row) => openDeleteInvoice(row),
      },
    ] : []),
    {
      label: 'Send Reminder',
      icon: Clock,
      show: (row) => !['Draft', 'Paid'].includes(row?.status) && (row?.balance > 0),
      onClick: (row) => {
        setSelectedReminderInvoice(row);
        setReminderForm({
          reminderType: 'Gentle',
          customerEmail: row?.email || '',
          messageBody: '',
        });
        setShowReminderModal(true);
        setReminderSuccess(false);
        setError(null);
      },
    },
  ];
  const filteredRowActions = INV_ACTIONS.filter(action => {
    switch (action.label) {
      case 'Edit':
        return !!financePermissions?.edit;
      case 'Delete':
        return !!financePermissions?.delete;
      case 'Export':
        return !!financePermissions?.export;
      default:
        return true;
    }
  });
  // Calculate KPI values from real data
  // Use filteredInvoicesByYear so values respect the selected month/year filter
  const revenueCurrent = (filteredInvoicesByYear || []).reduce((sum, inv) => sum + Number(inv?.amount || inv?.invoiceAmount || 0), 0);
  // Calculate total collected from invoices
  const totalCollected = (filteredInvoicesByYear || []).reduce((sum, inv) => {
    const paid = getPaidAmount(inv, manualAdjustments);
    console.log('💵 Collected Invoice:', {
      id: inv.id || inv._id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      amount: inv.amount,
      paid: inv.paid,
      paidAmount: inv.paidAmount,
      calculatedPaid: paid
    });
    return sum + paid;
  }, 0);
  console.log('✅ Total Collected:', totalCollected, 'Invoice count:', filteredInvoicesByYear?.length);
  
  // Calculate total receivables (outstanding balance only)
  const receivables = (filteredInvoicesByYear || []).reduce((sum, inv) => sum + getBalance(inv, manualAdjustments), 0);
  // Calculate payables total for display
  const payablesTotal = (filteredPayablesByYear || []).reduce((sum, p) => sum + (p.outstandingAmount || 0), 0);
  const cashPosition = (() => {
    const totalCredit = (manualAdjustments || []).filter(a => a.type === 'credit').reduce((s, a) => s + Number(a.amount || 0), 0);
    const totalDebit = (manualAdjustments || []).filter(a => a.type === 'debit').reduce((s, a) => s + Number(a.amount || 0), 0);
    return totalCredit - totalDebit;
  })();
  const isInCurrentMonth = (dt) => {
    if (!dt) return false;
    // If a month filter is selected, use it; otherwise use today's month
    if (calendarFilterYear !== 'all' && calendarFilterMonth !== undefined) {
      if (calendarFilterDay !== undefined) {
        // For day filter, caller should check both invoiceDate and createdAt separately
        return dt.getFullYear().toString() === calendarFilterYear && dt.getMonth() === calendarFilterMonth && dt.getDate() === calendarFilterDay;
      }
      return dt.getFullYear().toString() === calendarFilterYear && dt.getMonth() === calendarFilterMonth;
    }
    if (calendarFilterYear !== 'all') {
      return dt.getFullYear().toString() === calendarFilterYear;
    }
    const now = new Date();
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
  };
  const safeDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };
  // Helper: checks if an invoice matches the current period filter (handles Today OR logic)
  const isInvoiceInCurrentPeriod = (inv) => {
    if (calendarFilterDay !== undefined && calendarFilterYear !== 'all') {
      // Today mode: match if invoiceDate OR createdAt is today
      const year = parseInt(calendarFilterYear);
      const dtInv = safeDate(inv?.invoiceDate);
      const dtCreated = safeDate(inv?.createdAt);
      const checkDate = (d) => d && d.getFullYear() === year && d.getMonth() === calendarFilterMonth && d.getDate() === calendarFilterDay;
      return checkDate(dtInv) || checkDate(dtCreated);
    }
    const dt = safeDate(inv?.invoiceDate) || safeDate(inv?.createdAt);
    return isInCurrentMonth(dt);
  };
  const currentMonthInvoiced = (filteredInvoicesByYear || []).reduce((sum, inv) => {
    return sum + Number(inv?.amount || inv?.invoiceAmount || 0);
  }, 0);
  const currentMonthCollected = (filteredInvoicesByYear || []).reduce((sum, inv) => {
    return sum + getPaidAmount(inv, manualAdjustments);
  }, 0);
  const currentMonthOutstanding = (filteredInvoicesByYear || []).reduce((sum, inv) => {
    return sum + getBalance(inv, manualAdjustments);
  }, 0);
  const currentMonthCollectionRate = currentMonthInvoiced > 0
    ? Math.round((currentMonthCollected / currentMonthInvoiced) * 100)
    : 0;
  if (!canViewFinance) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-96">
        <div className="glass-card p-6 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Error Loading Data</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">This action is disabled from module settings.</p>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm text-[var(--text-muted)]">Loading finance data...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-96">
        <div className="glass-card p-6 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Error Loading Data</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">{error}</p>
          <Button onClick={fetchData}><Plus size={13} /> Retry</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="animate-fade-in space-y-5 -mt-5">
      <div className="page-header flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          {mainView === 'dashboard' ? (
            <>
              <h1 className="heading-page text-xl sm:text-2xl flex items-center gap-2">
                <PieChart size={28} className="text-[var(--accent)]" />
                Finance Dashboard
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-2 mb-3">Complete overview of your financial operations</p>
            </>
          ) : (
            <>
              <h1 className="heading-page text-xl sm:text-2xl">Finance</h1>
              <p className="text-xs text-[var(--text-muted)] mt-2 mb-3">Revenue · receivables · payables · cash flow · invoices</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* View Toggle - Compact */}
          <div className="flex items-center gap-0.5 bg-[var(--bg-elevated)] rounded-lg p-0.5 border border-[var(--border-base)]">
            <button
              onClick={() => setMainView('dashboard')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${mainView === 'dashboard'
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              title="Dashboard View"
            >
              <BarChart3 size={13} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              onClick={() => setMainView('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${mainView === 'kanban'
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              title="Kanban Board"
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setMainView('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${mainView === 'table'
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              title="Table View"
            >
              <List size={13} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
          
          {/* Calendar Filter */}
          <CalendarFilter 
            onDateChange={(dateInfo) => {
              if (dateInfo) {
                setCalendarFilterYear(dateInfo.year.toString());
                setCalendarFilterMonth(dateInfo.month);
                setCalendarFilterDay(dateInfo.day);
              } else {
                // Clear filter - reset to current year (default view)
                setCalendarFilterYear(currentYear.toString());
                setCalendarFilterMonth(undefined);
                setCalendarFilterDay(undefined);
              }
            }}
            initialYear={calendarFilterYear !== 'all' ? parseInt(calendarFilterYear) : currentYear}
            initialMonth={calendarFilterMonth}
            initialDay={calendarFilterDay}
            availableYears={availableYears}
          />
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {financePermissions?.create && (
              <Button size="sm" onClick={() => setShowInvoice(true)}>
                <Plus size={13} /> <span className="hidden sm:inline">New Invoice</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                const catsRes = await financeApi.getAdjustmentCategories();
                const cats = Array.isArray(catsRes) ? catsRes : (catsRes?.data || []);
                setAdjustmentCategories(cats);
                console.log('[Finance] Loaded', cats.length, 'adjustment categories');
              } catch (err) {
                console.error('Failed to refresh adjustment categories:', err);
              }
              setShowAdjustModal(true);
            }}>
              <TrendingUp size={13} /> <span className="hidden sm:inline">Adjust</span>
            </Button>
            {mainView === 'table' && (
              <Button variant="outline" size="sm" onClick={() => setShowSummaryCards(!showSummaryCards)} title="Toggle Summary Cards">
                {showSummaryCards ? <EyeOff size={13} /> : <Eye size={13} />}
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* Dashboard View */}
      {mainView === 'dashboard' && (
        <>
          {calendarFilterYear !== 'all' && filteredInvoicesByYear.length === 0 && filteredJournalEntriesByYear.length === 0 && filteredManualAdjustmentsByYear.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">No data available for the selected period</h3>
              <p className="text-sm text-[var(--text-muted)] text-center max-w-md mb-4">
                {calendarFilterMonth !== undefined
                  ? `There are no invoices, journal entries, or transactions recorded for ${new Date(parseInt(calendarFilterYear), calendarFilterMonth, 1).toLocaleString('default', { month: 'long' })} ${calendarFilterYear}.`
                  : `There are no invoices, journal entries, or transactions recorded for ${calendarFilterYear}.`
                }
              </p>
              <button
                onClick={() => { setCalendarFilterYear(currentYear.toString()); setCalendarFilterMonth(undefined); setCalendarFilterDay(undefined); }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Show Current Year Data
              </button>
            </div>
          ) : (
        <FinanceDashboard
          isOpen={true}
          onClose={() => { }}
          dashboardStats={dashboardStats}
          payables={filteredPayablesByYear}
          invoices={filteredInvoicesByYear}
          payments={filteredPaymentsByYear}
          manualAdjustments={calendarFilterYear === 'all' ? manualAdjustments : filteredManualAdjustmentsByYear}
          monthlyRevenue={monthlyRevenue}
          cashFlow={cashFlow}
          totalCollected={totalCollected}
          manualBalance={manualBalance}
          cashPosition={cashPosition}
          transactionAnalytics={transactionAnalytics}
          adjustmentTrend={adjustmentTrend}
          calendarFilterYear={calendarFilterYear}
          calendarFilterMonth={calendarFilterMonth}
          calendarFilterDay={calendarFilterDay}
          onInvoicesClick={() => {
            setMainView('table');
            setActiveTab('invoices');
            setInvStatus('All');
            setPage(1);
          }}
          onPayablesClick={() => {
            setMainView('table');
            setActiveTab('payables');
            setPage(1);
          }}
          onReceivablesClick={() => {
            setMainView('table');
            setActiveTab('invoices');
            setInvStatus('Outstanding');
            setPage(1);
          }}
          onCollectedClick={() => {
            setMainView('table');
            setActiveTab('invoices');
            setInvStatus('Paid');
            setPage(1);
          }}
          onInvoicedClick={() => {
            setMainView('table');
            setActiveTab('invoices');
            setInvStatus('All');
            setPage(1);
          }}
          onCashPositionClick={() => {
            setMainView('table');
            setActiveTab('transactions');
            setPage(1);
          }}
          onOutstandingClick={() => {
            setMainView('table');
            setActiveTab('invoices');
            setInvStatus('Outstanding');
            setPage(1);
          }}
        />
          )}
        </>
      )}
      {/* Kanban View */}
      {mainView === 'kanban' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
            {INV_STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => { setInvStatus(s); setPage(1); }}
                className={`filter-chip ${invStatus === s ? 'filter-chip-active' : ''}`}>{s}</button>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <Input placeholder="Search invoices..." value={invSearch}
                onChange={e => { setInvSearch(e.target.value); setPage(1); }}
                className="h-8 text-xs w-44" />
            </div>
          </div>
          <InvKanbanBoard invoices={filteredInvoices} onStageChange={handleStageChange} onCardClick={setSelected} />
        </div>
      )}
      {/* Table View - Original Content */}
      {mainView === 'table' && (
        <>
          {showSummaryCards && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard className="glass-card bg-[var(--bg-surface)]" label="Total Revenue" value={fmt(revenueCurrent)} sub="From invoices" icon={TrendingUp} variant="emerald" />
                <KPICard className="glass-card bg-[var(--bg-surface)]" label="Cash Position" value={fmt(cashPosition)} sub="Collected - Payables" icon={IndianRupee} variant="blue" />
                <KPICard className="glass-card bg-[var(--bg-surface)]" label="Receivables" value={fmt(receivables)} sub="Outstanding" icon={Clock} variant="amber" />
                <KPICard className="glass-card bg-[var(--bg-surface)]" label="Payables" value={fmt(payablesTotal)} sub="Due" icon={TrendingDown} variant="red" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Cashflow Summary</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Invoiced', value: fmt(revenueCurrent), color: 'text-[var(--text-primary)]' },
                    { label: 'Collected', value: fmt(totalCollected), color: 'text-[var(--green)]' },
                    { label: 'Outstanding', value: fmt(receivables), color: 'text-amber-400' },
                    { label: 'Collection Rate', value: `${Math.round((totalCollected / (revenueCurrent || 1)) * 100)}%`, color: 'text-[var(--blue)]' },
                  ].map(stat => (
                    <div key={stat.label} className="glass-card p-3 text-center bg-[var(--bg-surface)]">
                      <p className="text-[11px] text-[var(--text-muted)] mb-1">{stat.label}</p>
                      <p className={`text-base font-black ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="invoices">Invoices ({calendarFilterYear === 'all' ? invoices.length : filteredInvoicesByYear.length})</TabsTrigger>
              <TabsTrigger value="payables">Payables Summary</TabsTrigger>
              <TabsTrigger value="transactions">Transactions ({calendarFilterYear === 'all' ? journalEntries.length : filteredJournalEntriesByYear.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="invoices">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
                  {INV_STATUS_FILTERS.map(s => (
                    <button key={s} onClick={() => { setInvStatus(s); setPage(1); }}
                      className={`filter-chip ${invStatus === s ? 'filter-chip-active' : ''}`}>{s}</button>
                  ))}
                  <div className="flex items-center gap-2 ml-auto">
                    <Input placeholder="Search invoices..." value={invSearch}
                      onChange={e => { setInvSearch(e.target.value); setPage(1); }}
                      className="h-8 text-xs w-44" />
                  </div>
                </div>
                {view === 'kanban' ? (
                  <InvKanbanBoard invoices={filteredInvoices} onStageChange={handleStageChange} onCardClick={setSelected} />
                ) : (
                  <DataTable
                    columns={INVOICE_COLUMNS}
                    data={paginatedInvoices}
                    total={filteredInvoices.length}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={s => { setPageSize(s); setPage(1); }}
                    toolbar={canFinance('export') ? (
                      <Button size="sm" onClick={exportAllInvoicesCsv}>
                        <Download size={12} /> Export
                      </Button>
                    ) : null}
                    rowActions={filteredRowActions}
                    onRowClick={setSelected}
                    rowKey="_id"
                    emptyText="No invoices found."
                  />
                )}
              </div>
            </TabsContent>
            <TabsContent value="payables">
              <div className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Payables to Vendors</h3>
                  {calendarFilterYear !== 'all' && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Filtered by selected date • {filteredPurchaseOrdersByCalendar.length} POs match
                    </p>
                  )}
                </div>
                {(calendarFilterYear === 'all' ? payables : filteredPayablesByYear).length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">
                    {calendarFilterYear !== 'all' 
                      ? 'No payables found for the selected period' 
                      : 'No pending payables'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-7 gap-2 text-[11px] text-[var(--text-muted)] px-2">
                      <div>Vendor</div>
                      <div>Vendor ID</div>
                      <div className="text-right">Total POs</div>
                      <div className="text-right">Total Payable</div>
                      <div className="text-right">Paid</div>
                      <div className="text-right">Outstanding</div>
                      <div className="text-right">Last Payment</div>
                    </div>
                    {(calendarFilterYear === 'all' ? payables : filteredPayablesByYear).map((p) => {
                      const vendorPOs = (calendarFilterYear === 'all' ? purchaseOrders : filteredPurchaseOrdersByCalendar).filter(po => {
                        const poVendorId = (po?.vendorId && typeof po.vendorId === 'object') ? po.vendorId?._id : po?.vendorId;
                        return String(poVendorId) === String(p.vendorObjectId || p.vendorId);
                      });
                      
                      // Skip vendor if no matching POs after filtering
                      if (calendarFilterYear !== 'all' && vendorPOs.length === 0) return null;
                      
                      const isFullyPaid = (p.outstandingAmount || 0) <= 0 && (p.amountPaid || 0) > 0;
                      return (
                        <div key={p.vendorObjectId || p.vendorId}>
                          <div
                            className={`grid grid-cols-7 gap-2 items-center p-3 rounded-lg border ${isFullyPaid ? 'bg-[var(--green)]/10 border-[var(--green)]500/30' : 'bg-[var(--bg-elevated)] border-[var(--border-muted)]'}`}
                          >
                            <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                              {p.vendorName}
                              {isFullyPaid && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--green)]/20 text-[var(--green)]">
                                  <CheckCircle size={10} /> Paid
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-[var(--accent-light)]">{p.vendorId}</div>
                            <div className="text-xs text-right text-[var(--text-primary)]">{vendorPOs.length || p.totalPurchaseOrders}</div>
                            <div className="text-xs text-right text-[var(--text-primary)]">{fmt(p.totalPayableAmount)}</div>
                            <div className="text-xs text-right text-[var(--text-primary)]">{fmt(p.amountPaid)}</div>
                            <div className={`text-xs text-right font-bold ${isFullyPaid ? 'text-[var(--green)]' : 'text-amber-400'}`}>{fmt(p.outstandingAmount)}</div>
                            <div className="text-xs text-right text-[var(--text-muted)]">{p.lastPurchaseOrderDate || '-'}</div>
                          </div>
                          {/* Purchase Order Details */}
                          <PurchaseOrderDetails 
                            vendorId={p.vendorObjectId || p.vendorId}
                            allPurchaseOrders={calendarFilterYear === 'all' ? purchaseOrders : filteredPurchaseOrdersByCalendar}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="transactions">
              <div className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Journal Entries</h3>
                  {canFinance('export') && (calendarFilterYear === 'all' ? journalEntries : filteredJournalEntriesByYear).length > 0 && (
                    <Button size="sm" onClick={exportJournalEntriesCsv}>
                      <Download size={12} /> Export Journal
                    </Button>
                  )}
                </div>
                {(calendarFilterYear === 'all' ? journalEntries : filteredJournalEntriesByYear).length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">No journal entries recorded</p>
                ) : (
                  <div className="border border-[var(--border-base)] overflow-auto bg-[var(--bg-elevated)] relative">
                    {/* Table Header - Traditional Accounting Format */}
                    <div className="grid grid-cols-12 text-[13px] font-bold text-[var(--text-primary)] border-b-2 border-[var(--border-base)] pb-2 mt-3">
                      <div className="col-span-2 border-r-2 border-[var(--border-base)] pr-2">Date</div>
                      <div className="col-span-6 border-r-2 border-[var(--border-base)] px-2">Particulars</div>
                      <div className="col-span-1 border-r border-[var(--border-base)] px-1 text-center">L.F.</div>
                      <div className="col-span-2 border-r border-[var(--border-base)] px-1 text-right">Amount(Dr.)</div>
                      <div className="col-span-1 pl-1 text-right">Amount(Cr.)</div>
                    </div>
                    {[...(calendarFilterYear === 'all' ? journalEntries : filteredJournalEntriesByYear)].reverse().map((entry, entryIdx) => (
                      <div
                        key={entry._id || entry.id}
                        className="relative border-b border-[var(--border-muted)] last:border-b-0 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                        onClick={() => {
                          setSelectedJournalEntry(entry);
                          setSelectedJournalEntryIndex(entryIdx + 1);
                          setShowJournalEntryModal(true);
                        }}
                      >
                        {/* Continuous vertical lines using absolute positioned divs */}
                        <div className="absolute top-0 bottom-0 left-[16.66%] w-[2px] bg-[var(--border-base)] z-10"></div>
                        <div className="absolute top-0 bottom-0 left-[66.66%] w-[1px] bg-[var(--border-base)] z-10"></div>
                        <div className="absolute top-0 bottom-0 left-[75%] w-[1px] bg-[var(--border-base)] z-10"></div>
                        <div className="absolute top-0 bottom-0 left-[91.66%] w-[1px] bg-[var(--border-base)] z-10"></div>
                        {/* Journal Entry Content - No internal horizontal lines */}
                        <div>
                          {(() => {
                            const debitLines = entry.lines?.filter(l => l.debitAmount > 0) || [];
                            const creditLines = entry.lines?.filter(l => l.creditAmount > 0) || [];
                            return (
                              <>
                                {debitLines.map((line, idx) => (
                                  <div
                                    key={`debit-${idx}`}
                                    className="grid grid-cols-12 text-[13px] items-start relative"
                                  >
                                    <div className="col-span-2 px-2 py-2 text-[var(--text-primary)]">
                                      {idx === 0 ? new Date(entry.date).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                      }) : ''}
                                    </div>
                                    <div className="col-span-6 px-2 py-2 text-[var(--text-primary)]">
                                      {line.accountName} <span className="text-[var(--text-muted)]">Dr.</span>
                                    </div>
                                    <div className="col-span-1 px-1 py-2 text-center text-[var(--text-primary)] font-medium text-[13px]">{idx === 0 ? (entry.lf != null && entry.lf !== undefined ? entry.lf : '') : ''}</div>
                                    <div className="col-span-2 px-2 py-2 text-right font-medium text-[var(--text-primary)]">
                                      {fmt(line.debitAmount)}
                                    </div>
                                    <div className="col-span-1 px-1 py-2 text-right"></div>
                                  </div>
                                ))}
                                {creditLines.map((line, idx) => (
                                  <div
                                    key={`credit-${idx}`}
                                    className="grid grid-cols-12 text-[13px] items-start relative"
                                  >
                                    <div className="col-span-2 px-2 py-2"></div>
                                    <div className="col-span-6 px-2 py-2 text-[var(--text-primary)] pl-6">
                                      <span className="text-[var(--text-muted)]">To</span> {line.accountName}
                                    </div>
                                    <div className="col-span-1 px-1 py-2 text-center text-[var(--text-muted)] text-[10px]"></div>
                                    <div className="col-span-2 px-1 py-2 text-right"></div>
                                    <div className="col-span-1 px-1 py-2 text-right font-medium text-[var(--text-primary)]">
                                      {fmt(line.creditAmount)}
                                    </div>
                                  </div>
                                ))}
                                {entry.narration && (
                                  <div className="grid grid-cols-12 text-[13px] items-start bg-[var(--bg-surface)] relative">
                                    <div className="col-span-2 px-2 py-2"></div>
                                    <div className="col-span-6 px-2 py-2 text-[var(--text-muted)] italic">
                                      ({entry.narration})
                                    </div>
                                    <div className="col-span-1 px-1 py-2"></div>
                                    <div className="col-span-2 px-1 py-2"></div>
                                    <div className="col-span-1 px-1 py-2"></div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteJournalEntry(entry);
                            }}
                            className="absolute top-2 right-2 p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete entry"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-12 text-[15px] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)] border-t-2 border-[var(--border-base)] sticky bottom-0 z-20">
                      <div className="col-span-2 border-r-2 border-[var(--border-base)] px-2 py-2">TOTAL</div>
                      <div className="col-span-6 border-r-2 border-[var(--border-base)] px-2 py-2"></div>
                      <div className="col-span-1 border-r border-[var(--border-base)] px-1 py-2"></div>
                      <div className="col-span-2 border-r border-[var(--border-base)] px-1 py-2 text-right">{fmt(filteredJournalTotals.debitTotal)}</div>
                      <div className="col-span-1 pl-1 py-2 text-right">{fmt(filteredJournalTotals.creditTotal)}</div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
      {/* New Invoice Modal */}
      <Modal isOpen={showInvoice} onClose={() => { setShowInvoice(false); setError(null); setNewInvoiceErrors({}); }} title="Create Invoice"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setShowInvoice(false); setError(null); setNewInvoiceErrors({}); }} disabled={submitting}>Cancel</Button>
            <Button onClick={handleCreateInvoice} disabled={submitting}>
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {submitting ? ' Creating...' : ' Create Invoice'}
            </Button>
          </div>
        }>
        <div className="space-y-3 pb-20">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          {!canCreateInvoice && newInvoice.projectId && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
              Invoice cannot be generated at this project stage ({projectStatus}).
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Invoice Number">
              <Input
                value={newInvoice.invoiceNumber}
                onChange={e => {
                  const v = e.target.value;
                  setNewInvoice({ ...newInvoice, invoiceNumber: v });
                  if (newInvoiceErrors.invoiceNumber) setNewInvoiceErrors(prev => ({ ...prev, invoiceNumber: undefined }));
                }}
                placeholder="INV-001"
              />
              {newInvoiceErrors.invoiceNumber ? (
                <div className="text-[11px] text-red-400 mt-1">{newInvoiceErrors.invoiceNumber}</div>
              ) : null}
            </FormField>
            <FormField label="Project">
              <Select
                value={newInvoice.projectId}
                onChange={e => {
                  const v = e.target.value;
                  setNewInvoice({ ...newInvoice, projectId: v });
                  if (newInvoiceErrors.projectId) setNewInvoiceErrors(prev => ({ ...prev, projectId: undefined }));
                }}
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>{p.name || p.customerName}</option>
                ))}
              </Select>
              {newInvoiceErrors.projectId ? (
                <div className="text-[11px] text-red-400 mt-1">{newInvoiceErrors.projectId}</div>
              ) : null}
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Invoice Amount (₹)">
              <Input
                type="number"
                value={newInvoice.amount}
                onChange={e => {
                  const v = e.target.value;
                  setNewInvoice({ ...newInvoice, amount: v });
                  const num = Number(v);
                  if (
                    newInvoice.projectId &&
                    selectedProjectContractValue !== null &&
                    !Number.isNaN(num) &&
                    num > Number(selectedProjectContractValue)
                  ) {
                    setNewInvoiceErrors(prev => ({ ...prev, amount: 'Invoice amount cannot exceed the project contract value' }));
                  } else if (newInvoiceErrors.amount) {
                    setNewInvoiceErrors(prev => ({ ...prev, amount: undefined }));
                  }
                }}
                placeholder="280000"
              />
              {newInvoiceErrors.amount ? (
                <div className="text-[11px] text-red-400 mt-1">{newInvoiceErrors.amount}</div>
              ) : null}
            </FormField>
            <FormField label="Invoice Date">
              <Input
                type="date"
                value={newInvoice.invoiceDate}
                onChange={e => {
                  const v = e.target.value;
                  setNewInvoice({ ...newInvoice, invoiceDate: v });
                  if (newInvoiceErrors.invoiceDate) setNewInvoiceErrors(prev => ({ ...prev, invoiceDate: undefined }));
                }}
              />
              {newInvoiceErrors.invoiceDate ? (
                <div className="text-[11px] text-red-400 mt-1">{newInvoiceErrors.invoiceDate}</div>
              ) : null}
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Due Date">
              <Input
                type="date"
                value={newInvoice.dueDate}
                min={newInvoice.invoiceDate || undefined}
                onChange={e => {
                  const v = e.target.value;
                  setNewInvoice({ ...newInvoice, dueDate: v });
                  if (newInvoiceErrors.dueDate) setNewInvoiceErrors(prev => ({ ...prev, dueDate: undefined }));
                }}
              />
              {newInvoiceErrors.dueDate ? (
                <div className="text-[11px] text-red-400 mt-1">{newInvoiceErrors.dueDate}</div>
              ) : null}
            </FormField>
            <FormField label="Payment Terms">
              <Input
                value={newInvoice.paymentTerms && newInvoice.paymentTerms !== '' ? newInvoice.paymentTerms : '-'}
                disabled={true}
                readOnly
                placeholder="-"
              />
            </FormField>
          </div>
          <FormField label="Customer Email">
            <Input
              type="email"
              value={newInvoice.email}
              onChange={e => setNewInvoice({ ...newInvoice, email: e.target.value })}
              placeholder="customer@example.com"
              disabled={!newInvoice.projectId}
            />
          </FormField>
          <FormField label="Customer Phone">
            <Input
              type="tel"
              value={newInvoice.phone}
              placeholder="-"
              disabled={!newInvoice.projectId}
            />
          </FormField>
        </div>
      </Modal>
      {/* Invoice Detail Modal */}
      {selected && (
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Invoice - ${selected.invoiceNumber || selected.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            </div>
          }>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Invoice #', selected.invoiceNumber || selected.id],
              ['Customer', selected.customerName],
              ['Email', selected.email || '-'],
              ['Phone', selected.phone || '-'],
              ['Payment Terms', selected.paymentTerms || '-'],
              ['Invoice Amt', fmt(selected.amount)],
              ['Amount Paid', fmt(selected.paid || 0)],
              ['Balance Due', fmt(selected.balance || 0)],
              ['Status', <StatusBadge domain="invoice" value={selected.status} />],
              ['Invoice Date', selected.invoiceDate ? new Date(selected.invoiceDate).toLocaleDateString() : '-'],
              ['Due Date', selected.dueDate ? new Date(selected.dueDate).toLocaleDateString() : '-'],
              ['Paid On', selected.paidDate ? new Date(selected.paidDate).toLocaleDateString() : '-'],
              ['Last Reminder', selected.lastReminderSentAt ? new Date(selected.lastReminderSentAt).toLocaleDateString() : '-'],
              ['Reminder Count', selected.reminderCount || 0],
            ].map(([k, v]) => (
              <div key={k} className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                <div className="font-semibold text-[var(--text-primary)]">{v}</div>
              </div>
            ))}
          </div>
          
          {/* Advance Payment Information */}
          {selected.paymentTerms && (() => {
            // Extract percentage from paymentTerms (e.g., "50" or "50%" or "Net 30")
            const paymentTermsStr = String(selected.paymentTerms);
            const percentageMatch = paymentTermsStr.match(/(\d+)/);
            
            if (percentageMatch) {
              const percentage = parseFloat(percentageMatch[1]);
              const totalAmount = Number(selected.amount || 0);
              const paidAmount = Number(selected.paid || 0);
              
              // Calculate advance amount based on percentage
              const advanceRequired = totalAmount * (percentage / 100);
              const advanceReceived = Math.min(paidAmount, advanceRequired);
              const advancePending = Math.max(0, advanceRequired - advanceReceived);
              
              return (
                <div className="mt-4 pt-4 border-t border-[var(--border-base)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <TrendingUp size={16} />
                    Advance Information
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card p-3 bg-[var(--primary)]/5 border-[var(--primary)]/20">
                      <div className="text-[10px] text-[var(--primary)] mb-1">Advance Required ({percentage}%)</div>
                      <div className="text-base font-bold text-[var(--primary)]">{fmt(advanceRequired)}</div>
                    </div>
                    <div className="glass-card p-3 bg-[var(--green)]/5 border-[var(--green)]500/20">
                      <div className="text-[10px] text-[var(--green)] mb-1">Advance Received</div>
                      <div className="text-base font-bold text-[var(--green)]">{fmt(advanceReceived)}</div>
                    </div>
                    <div className="glass-card p-3 bg-amber-500/5 border-amber-500/20">
                      <div className="text-[10px] text-amber-400 mb-1">Advance Pending</div>
                      <div className="text-base font-bold text-amber-400">{fmt(advancePending)}</div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </Modal>
      )}
      {/* Edit Invoice Modal */}
      {showEditInvoice && editInvoiceTarget && (
        <Modal
          open={showEditInvoice}
          onClose={() => {
            if (savingEditInvoice) return;
            setShowEditInvoice(false);
            setEditInvoiceTarget(null);
            setEditModalError(null);
          }}
          title={`Edit Invoice - ${editInvoiceTarget.invoiceNumber || editInvoiceTarget.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  if (savingEditInvoice) return;
                  setShowEditInvoice(false);
                  setEditInvoiceTarget(null);
                  setEditModalError(null);
                }}
                disabled={savingEditInvoice}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEditInvoice} disabled={savingEditInvoice}>
                {savingEditInvoice ? <Loader2 size={13} className="animate-spin" /> : <Edit size={13} />}
                {savingEditInvoice ? ' Saving...' : ' Save Changes'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 pb-20">
            {editModalError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {editModalError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Invoice Number">
                <Input
                  value={editInvoice.invoiceNumber}
                  onChange={e => setEditInvoice({ ...editInvoice, invoiceNumber: e.target.value })}
                  placeholder="INV-001"
                  disabled={savingEditInvoice}
                />
              </FormField>
              <FormField label="Customer Name">
                <Input
                  value={editInvoice.customerName}
                  onChange={e => setEditInvoice({ ...editInvoice, customerName: e.target.value })}
                  placeholder="Customer"
                  disabled={savingEditInvoice}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Invoice Amount (₹)">
                <Input
                  type="number"
                  value={editInvoice.amount}
                  onChange={e => setEditInvoice({ ...editInvoice, amount: e.target.value })}
                  placeholder="280000"
                  disabled={savingEditInvoice}
                />
              </FormField>
              <FormField label="Invoice Date">
                <Input
                  type="date"
                  value={editInvoice.invoiceDate}
                  onChange={e => setEditInvoice({ ...editInvoice, invoiceDate: e.target.value })}
                  disabled={savingEditInvoice}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Due Date">
                <Input
                  type="date" min={editInvoice.invoiceDate || undefined}
                  value={editInvoice.dueDate}
                  onChange={e => setEditInvoice({ ...editInvoice, dueDate: e.target.value })}
                  disabled={savingEditInvoice}
                />
              </FormField>
              <FormField label="Status">
                <Select
                  value={editInvoice.status}
                  onChange={e => setEditInvoice({ ...editInvoice, status: e.target.value })}
                  disabled={savingEditInvoice}
                >
                  <option value="">Select Status</option>
                  {editInvoiceTarget?.status && (
                    <option value={editInvoiceTarget.status}>{editInvoiceTarget.status} (Current)</option>
                  )}
                  {getValidNextStatuses(editInvoiceTarget?.status).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Payment Terms">
                <Input
                  value={editInvoice.paymentTerms}
                  placeholder="Net 30"
                  disabled={true}
                  readOnly
                />
              </FormField>
              <FormField label="Phone">
                <Input
                  value={editInvoice.phone || '-'}
                  placeholder="-"
                  disabled={true}
                  readOnly
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Customer Email">
                <Input
                  type="email"
                  value={editInvoice.email}
                  onChange={e => setEditInvoice({ ...editInvoice, email: e.target.value })}
                  placeholder="customer@example.com"
                  disabled={savingEditInvoice}
                />
              </FormField>
            </div>
          </div>
        </Modal>
      )}
      {/* Delete Invoice Confirmation Modal */}
      {showDeleteInvoice && deleteInvoiceTarget && (
        <Modal
          open={showDeleteInvoice}
          onClose={() => {
            if (deletingInvoice) return;
            setShowDeleteInvoice(false);
            setDeleteInvoiceTarget(null);
            setError(null);
          }}
          title="Delete Invoice"
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  if (deletingInvoice) return;
                  setShowDeleteInvoice(false);
                  setDeleteInvoiceTarget(null);
                  setError(null);
                }}
                disabled={deletingInvoice}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmDeleteInvoice} disabled={deletingInvoice}>
                {deletingInvoice ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {deletingInvoice ? ' Deleting...' : ' Delete'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="glass-card p-3">
              <p className="text-sm text-[var(--text-primary)] font-semibold">Are you sure you want to delete this invoice?</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{deleteInvoiceTarget.invoiceNumber || deleteInvoiceTarget.id} - {deleteInvoiceTarget.customerName}</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">This cannot be undone.</p>
            </div>
          </div>
        </Modal>
      )}
      {showStatusChangeConfirm && pendingStageChange && (<Modal open={showStatusChangeConfirm} onClose={() => { setShowStatusChangeConfirm(false); setPendingStageChange(null); }} title="Confirm Status Change" footer={<div className="flex gap-2 justify-end"><Button variant="ghost" onClick={() => { setShowStatusChangeConfirm(false); setPendingStageChange(null); }}>Cancel</Button><Button onClick={() => { setShowStatusChangeConfirm(false); handleStageChange(pendingStageChange.id, pendingStageChange.newStage, true); setPendingStageChange(null); }}>OK</Button></div>}><div className="space-y-3"><p className="text-sm text-[var(--text-secondary)]">Are you sure you want to change this invoice status from {pendingStageChange.previousStatus} to {pendingStageChange.newStage}?</p></div></Modal>)}
      {/* Assign Invoice Modal */}
      {showAssignInvoice && assignInvoiceTarget && (
        <Modal
          open={showAssignInvoice}
          onClose={() => {
            setShowAssignInvoice(false);
            setAssignInvoiceTarget(null);
            setAssignToUser('');
          }}
          title={`Assign Invoice - ${assignInvoiceTarget.invoiceNumber || assignInvoiceTarget.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAssignInvoice(false);
                  setAssignInvoiceTarget(null);
                  setAssignToUser('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveAssignInvoice}>
                Save
              </Button>
            </div>
          }
        >
          <div className="space-y-3 pb-8">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <FormField label="Assign To">
              <Select value={assignToUser} onChange={(e) => setAssignToUser(e.target.value)}>
                <option value="">Select user</option>
              </Select>
            </FormField>
          </div>
        </Modal>
      )}
      {/* Send Reminder Modal */}
      {showReminderModal && selectedReminderInvoice && (
        <Modal
          open={showReminderModal}
          onClose={() => {
            setShowReminderModal(false);
            setSelectedReminderInvoice(null);
            setReminderForm({ reminderType: 'Gentle', customerEmail: '', messageBody: '' });
            setReminderSuccess(false);
            setError(null);
          }}
          title={`Send Reminder - ${selectedReminderInvoice.invoiceNumber || selectedReminderInvoice.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowReminderModal(false);
                  setSelectedReminderInvoice(null);
                  setReminderForm({ reminderType: 'Gentle', customerEmail: '', messageBody: '' });
                  setReminderSuccess(false);
                  setError(null);
                }}
                disabled={sendingReminder}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendReminder}
                disabled={sendingReminder || reminderSuccess}
              >
                {sendingReminder ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
                {sendingReminder ? ' Sending...' : reminderSuccess ? ' Sent!' : ' Send Reminder'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            {reminderSuccess && (
              <div className="p-3 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]500/30 text-[var(--green)] text-sm">
                Reminder sent successfully.
              </div>
            )}
            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Invoice #</div>
                <div className="font-semibold text-[var(--text-primary)]">{selectedReminderInvoice.invoiceNumber || selectedReminderInvoice.id}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Customer</div>
                <div className="font-semibold text-[var(--text-primary)]">{selectedReminderInvoice.customerName}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Due Amount</div>
                <div className="font-semibold text-red-400">{fmt(selectedReminderInvoice.balance || 0)}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Due Date</div>
                <div className="font-semibold text-[var(--text-primary)]">{selectedReminderInvoice.dueDate ? new Date(selectedReminderInvoice.dueDate).toLocaleDateString() : '-'}</div>
              </div>
            </div>
            {/* Reminder Type */}
            <FormField label="Reminder Type">
              <Select
                value={reminderForm.reminderType}
                onChange={e => setReminderForm({ ...reminderForm, reminderType: e.target.value })}
                disabled={sendingReminder || reminderSuccess}
              >
                <option value="Gentle">Gentle Reminder</option>
                <option value="Due Today">Due Today</option>
                <option value="Overdue">Overdue</option>
              </Select>
            </FormField>
            {/* Customer Email */}
            <FormField label="Customer Email">
              <Input
                type="email"
                value={reminderForm.customerEmail}
                onChange={e => setReminderForm({ ...reminderForm, customerEmail: e.target.value })}
                placeholder="customer@example.com"
                disabled={sendingReminder || reminderSuccess}
              />
            </FormField>
            {/* Message Body */}
            <FormField label="Message (Optional)">
              <textarea
                value={reminderForm.messageBody}
                onChange={e => setReminderForm({ ...reminderForm, messageBody: e.target.value })}
                placeholder="Enter custom message or leave blank for default template..."
                disabled={sendingReminder || reminderSuccess}
                className="w-full h-32 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--border-active)] transition-all duration-150 text-xs px-3 py-2 resize-none"
              />
            </FormField>
          </div>
        </Modal>
      )}
      {/* Timeline Drawer */}
      {showTimeline && timelineInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setShowTimeline(false); setTimelineInvoice(null); setTimelineData([]); }}
          />
          <div className="relative w-full max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-base)] h-full overflow-y-auto animate-slide-in-right">
            <div className="p-4 border-b border-[var(--border-base)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Invoice Timeline</h3>
                <p className="text-xs text-[var(--text-muted)]">{timelineInvoice.invoiceNumber || timelineInvoice.id}</p>
              </div>
              <button
                onClick={() => { setShowTimeline(false); setTimelineInvoice(null); setTimelineData([]); }}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {loadingTimeline ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
                </div>
              ) : timelineData.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-[var(--text-faint)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">No timeline activity found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timelineData.map((activity, index) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center">
                          {activity.action === 'INVOICE_CREATED' && <FileText size={14} className="text-[var(--primary)]" />}
                          {activity.action === 'INVOICE_UPDATED' && <Edit size={14} className="text-amber-400" />}
                          {activity.action === 'STATUS_CHANGED' && <RefreshCw size={14} className="text-purple-400" />}
                          {activity.action === 'PAYMENT_ADDED' && <CheckCircle size={14} className="text-[var(--green)]" />}
                          {activity.action === 'REMINDER_SENT' && <Clock size={14} className="text-orange-400" />}
                        </div>
                        {index < timelineData.length - 1 && (
                          <div className="w-px flex-1 bg-[var(--border-base)] my-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="glass-card p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                              {activity.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {new Date(activity.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {activity.metadata && (
                            <div className="space-y-1 text-xs text-[var(--text-muted)]">
                              {activity.action === 'PAYMENT_ADDED' && (
                                <p>{fmt(activity.metadata.paymentAmount || 0)} received via {activity.metadata.paymentMethod}</p>
                              )}
                              {activity.action === 'STATUS_CHANGED' && (
                                <p>{activity.metadata.previousStatus} → {activity.metadata.newStatus}</p>
                              )}
                              {activity.action === 'REMINDER_SENT' && (
                                <p>Reminder sent to {activity.metadata.sentTo}</p>
                              )}
                              {activity.action === 'INVOICE_CREATED' && (
                                <p>Amount: {fmt(activity.metadata.amount || 0)} for {activity.metadata.customerName}</p>
                              )}
                            </div>
                          )}
                          {activity.performedBy && (
                            <p className="text-[10px] text-[var(--text-faint)] mt-2">
                              By: {activity.performedBy.name || 'Unknown'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Record Payment Modal */}
      <Modal
        open={showRecordPayment}
        onClose={() => {
          if (submittingPayment) return;
          setShowRecordPayment(false);
          setError(null);
          setRecordPaymentErrors({});
        }}
        title="Record Payment"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                if (submittingPayment) return;
                setShowRecordPayment(false);
                setError(null);
                setRecordPaymentErrors({});
              }}
              disabled={submittingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={submittingPayment}
            >
              {submittingPayment ? <Loader2 size={13} className="animate-spin" /> : <IndianRupee size={13} />}
              {submittingPayment ? ' Recording...' : ' Record Payment'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pb-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payment Type">
              <Select
                value={recordPayment.paymentType}
                onChange={e => {
                  const newType = e.target.value;
                  setRecordPayment({
                    ...recordPayment,
                    paymentType: newType,
                    referenceType: newType === 'Customer Payment' ? 'Invoice' : 'Vendor',
                    referenceId: '',
                    customerName: '',
                    invoiceNumber: '',
                    vendorName: '',
                    amount: '',
                    maxAmount: 0,
                  });
                  if (recordPaymentErrors.referenceId) setRecordPaymentErrors(prev => ({ ...prev, referenceId: undefined }));
                }}
                disabled={submittingPayment}
              >
                <option value="Customer Payment">Customer Payment</option>
                <option value="Vendor Payment">Vendor Payment</option>
              </Select>
            </FormField>
            <FormField label="Reference Type">
              <Select
                value={recordPayment.referenceType}
                onChange={e => {
                  setRecordPayment({ ...recordPayment, referenceType: e.target.value, referenceId: '', customerName: '', invoiceNumber: '', vendorName: '', amount: '', maxAmount: 0 });
                  if (recordPaymentErrors.referenceId) setRecordPaymentErrors(prev => ({ ...prev, referenceId: undefined }));
                }}
                disabled={submittingPayment}
              >
                {recordPayment.paymentType === 'Customer Payment' ? (
                  <option value="Invoice">Invoice</option>
                ) : (
                  <option value="Vendor">Vendor</option>
                )}
              </Select>
            </FormField>
          </div>
          <FormField label={recordPayment.paymentType === 'Customer Payment' ? 'Select Invoice' : 'Select Vendor'}>
            <Select
              value={recordPayment.referenceId}
              onChange={e => {
                const nextId = e.target.value;
                if (!nextId) {
                  setRecordPayment({ ...recordPayment, referenceId: '', customerName: '', invoiceNumber: '', vendorName: '', amount: '', maxAmount: 0 });
                  if (recordPaymentErrors.referenceId) setRecordPaymentErrors(prev => ({ ...prev, referenceId: undefined }));
                  return;
                }
                if (recordPayment.paymentType === 'Customer Payment') {
                  const inv = (invoices || []).find(i => String(i._id || i.id) === String(nextId));
                  const outstanding = Number(inv?.balance ?? inv?.balanceDue ?? (Number(inv?.amount || 0) - Number(inv?.paid || 0)));
                  const max = Math.max(0, outstanding || 0);
                  setRecordPayment({
                    ...recordPayment,
                    referenceId: nextId,
                    customerName: inv?.customerName || '',
                    invoiceNumber: inv?.invoiceNumber || '',
                    vendorName: '',
                    maxAmount: max,
                    amount: max > 0 ? String(max) : '',
                  });
                } else {
                  const v = (payables || []).find(p => String(p.vendorObjectId || p.vendorId) === String(nextId));
                  const max = Math.max(0, Number(v?.outstandingAmount || 0));
                  setRecordPayment({
                    ...recordPayment,
                    referenceId: nextId,
                    vendorName: v?.vendorName || '',
                    customerName: '',
                    invoiceNumber: '',
                    maxAmount: max,
                    amount: max > 0 ? String(max) : '',
                  });
                }
                if (recordPaymentErrors.referenceId) setRecordPaymentErrors(prev => ({ ...prev, referenceId: undefined }));
              }}
              disabled={submittingPayment}
            >
              <option value="">{recordPayment.paymentType === 'Customer Payment' ? 'Select Invoice' : 'Select Vendor'}</option>
              {recordPayment.paymentType === 'Customer Payment'
                ? invoices.map(inv => (
                  <option key={inv._id || inv.id} value={inv._id || inv.id}>
                    {inv.invoiceNumber} - {inv.customerName} (₹{inv.amount})
                  </option>
                ))
                : payables.map(p => (
                  <option key={p.vendorObjectId || p.vendorId} value={p.vendorObjectId || p.vendorId}>
                    {p.vendorName} (Outstanding: ₹{p.outstandingAmount})
                  </option>
                ))
              }
            </Select>
            {recordPaymentErrors.referenceId && (
              <div className="text-[11px] text-red-400 mt-1">{recordPaymentErrors.referenceId}</div>
            )}
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (₹)">
              <Input
                type="number"
                value={recordPayment.amount}
                onChange={e => {
                  const v = clampAmount(e.target.value, Number(recordPayment.maxAmount || 0));
                  setRecordPayment({ ...recordPayment, amount: v });
                  if (recordPaymentErrors.amount) setRecordPaymentErrors(prev => ({ ...prev, amount: undefined }));
                }}
                placeholder="Enter amount"
                max={recordPayment.maxAmount || undefined}
                disabled={submittingPayment}
              />
              {recordPaymentErrors.amount && (
                <div className="text-[11px] text-red-400 mt-1">{recordPaymentErrors.amount}</div>
              )}
            </FormField>
            <FormField label="Payment Date">
              <Input
                type="date"
                value={recordPayment.paymentDate}
                onChange={e => {
                  setRecordPayment({ ...recordPayment, paymentDate: e.target.value });
                  if (recordPaymentErrors.paymentDate) setRecordPaymentErrors(prev => ({ ...prev, paymentDate: undefined }));
                }}
                disabled={submittingPayment}
              />
              {recordPaymentErrors.paymentDate && (
                <div className="text-[11px] text-red-400 mt-1">{recordPaymentErrors.paymentDate}</div>
              )}
            </FormField>
          </div>
          <FormField label="Payment Method">
            <Select
              value={recordPayment.paymentMethod}
              onChange={e => {
                setRecordPayment({ ...recordPayment, paymentMethod: e.target.value });
                if (recordPaymentErrors.paymentMethod) setRecordPaymentErrors(prev => ({ ...prev, paymentMethod: undefined }));
              }}
              disabled={submittingPayment}
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </Select>
            {recordPaymentErrors.paymentMethod && (
              <div className="text-[11px] text-red-400 mt-1">{recordPaymentErrors.paymentMethod}</div>
            )}
          </FormField>
          <FormField label="Notes (Optional)">
            <textarea
              value={recordPayment.notes}
              onChange={e => setRecordPayment({ ...recordPayment, notes: e.target.value })}
              placeholder="Enter any additional notes..."
              disabled={submittingPayment}
              className="w-full h-24 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--border-active)] transition-all duration-150 text-xs px-3 py-2 resize-none"
            />
          </FormField>
        </div>
      </Modal>
      {/* Manual Adjustment Modal */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => {
          if (submittingAdjust) return;
          // Revert to original status if no payment was made
          if (adjustRevertState) {
            const { invoiceId, previousStatus } = adjustRevertState;
            financeApi.updateInvoiceStatus(invoiceId, previousStatus).then(() => {
              setInvoices(prev => prev.map(i => 
                (i._id === invoiceId || i.id === invoiceId) ? { ...i, status: previousStatus } : i
              ));
            }).catch(() => {});
            setAdjustRevertState(null);
          }
          setShowAdjustModal(false);
          setAdjustError(null);
          setAdjustErrors({});
        }}
        title="Manual Adjustment"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                if (submittingAdjust) return;
                // Revert to original status if no payment was made
                if (adjustRevertState) {
                  const { invoiceId, previousStatus } = adjustRevertState;
                  financeApi.updateInvoiceStatus(invoiceId, previousStatus).then(() => {
                    setInvoices(prev => prev.map(i => 
                      (i._id === invoiceId || i.id === invoiceId) ? { ...i, status: previousStatus } : i
                    ));
                  }).catch(() => {});
                  setAdjustRevertState(null);
                }
                setShowAdjustModal(false);
                setAdjustError(null);
                setAdjustErrors({});
              }}
              disabled={submittingAdjust}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitAdjustment} disabled={submittingAdjust}>
              {submittingAdjust ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
              {submittingAdjust ? ' Saving...' : ' Save Adjustment'}
            </Button>
          </div>
        } 
      >
        <div className="space-y-[64px] pb-4">
          {adjustError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {adjustError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <Select
                value={adjustForm.type}
                onChange={e => {
                  setAdjustForm({ ...adjustForm, type: e.target.value, category: '' });
                  if (adjustErrors.type) setAdjustErrors(prev => ({ ...prev, type: undefined }));
                }} 
                disabled={submittingAdjust}
              >
                <option value="credit">Credit (+ Add Amount)</option>
                <option value="debit">Debit (- Subtract Amount)</option>
              </Select>
            </FormField>
            <FormField label="Category *">
              <Select
                value={adjustForm.category}
                onChange={e => {
                  const value = e.target.value;
                  if (value === '__add_new__') {
                    setShowAddCategoryModal(true);
                    setNewCategory({ categoryName: '', type: adjustForm.type });
                    return;
                  }
                  setAdjustForm({ ...adjustForm, category: value });
                  if (adjustErrors.category) setAdjustErrors(prev => ({ ...prev, category: undefined }));
                }} 
                disabled={submittingAdjust}
              >
                <option value="">Select Category</option>
                {adjustmentCategories
                  .filter(cat => cat.type === (adjustForm.type || 'credit'))
                  .map(cat => (
                    <option key={cat._id || cat.id} value={cat.categoryName}>
                      {cat.categoryName}
                    </option>
                  ))}
                {/* Special payment categories are already included in adjustmentCategories from API */}
                <option value="__add_new__">+ Add New Category</option>
              </Select> 
              {adjustErrors.category && (
                <div className="text-[11px] text-red-400 mt-1">{adjustErrors.category}</div>
              )}
            </FormField>
          </div>
          {/* Invoice Selection for Customer Payment (Credit - Invoice Amount Received) */}
          {adjustForm.type === 'credit' && adjustForm.category === 'Invoice Amount Received' && (
            <div className="mt-4">
              <FormField label="Select Invoice *">
                <Select
                  value={adjustForm.selectedInvoiceId}
                  onChange={e => {
                    const selectedInv = invoices.find(inv => (inv._id || inv.id) === e.target.value);
                    setAdjustForm({ 
                      ...adjustForm, 
                      selectedInvoiceId: e.target.value,
                      amount: selectedInv ? String(selectedInv.amount - (selectedInv.paid || 0)) : ''
                    });
                    if (adjustErrors.selectedInvoiceId) setAdjustErrors(prev => ({ ...prev, selectedInvoiceId: undefined }));
                  }}
                  disabled={submittingAdjust}
                >
                  <option value="">Select an invoice</option>
                  {invoices
                    .filter(inv => ['Sent', 'Partial', 'Overdue', 'Pending'].includes(inv.status))
                    .map(inv => {
                      const id = inv._id || inv.id;
                      return (
                        <option key={id} value={id}>
                          {inv.invoiceNumber} - {inv.customerName} | Total: {fmt(inv.amount)} | Outstanding: {fmt(inv.amount - (inv.paid || 0))}
                        </option>
                      );
                    })}
                </Select>
                {adjustErrors.selectedInvoiceId && (
                  <div className="text-[11px] text-red-400 mt-1">{adjustErrors.selectedInvoiceId}</div>
                )}
                {adjustForm.selectedInvoiceId && (
                  <div className="text-[11px] text-[var(--text-muted)] mt-2">
                    {(() => {
                      const inv = invoices.find(i => (i._id || i.id) === adjustForm.selectedInvoiceId);
                      if (!inv) return null;
                      const outstanding = inv.amount - (inv.paid || 0);
                      return (
                        <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border-muted)]">
                          <div className="font-medium">Invoice Details:</div>
                          <div>Customer: {inv.customerName}</div>
                          <div>Total Amount: {fmt(inv.amount)}</div>
                          <div>Paid: {fmt(inv.paid || 0)}</div>
                          <div className="font-semibold text-amber-400">Outstanding: {fmt(outstanding)}</div>
                          <div className="text-[10px] text-[var(--text-muted)] mt-1">ID: {inv._id || inv.id}</div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </FormField>
            </div>
          )}
          {/* Vendor Selection for Vendor Payment (Debit - Vendor Payment) */}
          {adjustForm.type === 'debit' && adjustForm.category === 'Vendor Payment' && (
            <div className="mt-4 space-y-4">
              <FormField label="Select Vendor *">
                <Select
                  value={adjustForm.selectedVendorId}
                  onChange={e => {
                    const selectedVendor = payables.find(p => String(p.vendorObjectId || p.vendorId) === e.target.value);
                    setAdjustForm({ 
                      ...adjustForm, 
                      selectedVendorId: e.target.value,
                      selectedPurchaseOrderId: '', // Reset PO selection when vendor changes
                      amount: selectedVendor ? String(selectedVendor.outstandingAmount) : ''
                    });
                    if (adjustErrors.selectedVendorId) setAdjustErrors(prev => ({ ...prev, selectedVendorId: undefined }));
                  }}
                  disabled={submittingAdjust}
                >
                  <option value="">Select a vendor</option>
                  {(() => {
                    const vendorsWithOutstanding = payables.filter(p => (p.outstandingAmount || 0) > 0);
                    if (vendorsWithOutstanding.length === 0) {
                      return (
                        <option disabled>No vendors with outstanding payments found</option>
                      );
                    }
                    return vendorsWithOutstanding.map(p => (
                      <option key={p.vendorObjectId || p.vendorId} value={String(p.vendorObjectId || p.vendorId)}>
                        {p.vendorName} | Outstanding: {fmt(p.outstandingAmount)}
                      </option>
                    ));
                  })()}
                </Select>
                {adjustErrors.selectedVendorId && (
                  <div className="text-[11px] text-red-400 mt-1">{adjustErrors.selectedVendorId}</div>
                )}
                {adjustForm.selectedVendorId && (
                  <div className="text-[11px] text-[var(--text-muted)] mt-2">
                    {(() => {
                      const vendor = payables.find(p => String(p.vendorObjectId || p.vendorId) === adjustForm.selectedVendorId);
                      if (!vendor) return null;
                      return (
                        <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border-muted)]">
                          <div className="font-medium">Vendor Details:</div>
                          <div>Vendor: {vendor.vendorName}</div>
                          <div>Total Payable: {fmt(vendor.totalPayableAmount)}</div>
                          <div>Paid: {fmt(vendor.amountPaid || 0)}</div>
                          <div className="font-semibold text-amber-400">Outstanding: {fmt(vendor.outstandingAmount)}</div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </FormField>

              {/* Purchase Order Selection */}
              {adjustForm.selectedVendorId && (
                <FormField label="Select Purchase Order (Optional)">
                  <Select
                    value={adjustForm.selectedPurchaseOrderId || ''}
                    onChange={e => {
                      const selectedPO = purchaseOrders.find(po => (po._id || po.id) === e.target.value);
                      const vendor = payables.find(p => String(p.vendorObjectId || p.vendorId) === adjustForm.selectedVendorId);
                      
                      setAdjustForm({ 
                        ...adjustForm, 
                        selectedPurchaseOrderId: e.target.value,
                        // Auto-fill reason with PO ID
                        reason: selectedPO ? `Payment against PO: ${selectedPO.id || 'N/A'}` : '',
                        // Set amount to PO total amount if PO is selected, otherwise use vendor outstanding
                        amount: selectedPO ? String(selectedPO.totalAmount || 0) : (vendor ? String(vendor.outstandingAmount) : '')
                      });
                    }}
                    disabled={submittingAdjust}
                  >
                    <option value="">Select PO (Optional)</option>
                    {(() => {
                      const vendorPOs = purchaseOrders.filter(po => {
                        const poVendorId = (po?.vendorId && typeof po.vendorId === 'object') ? po.vendorId?._id : po?.vendorId;
                        return String(poVendorId) === String(adjustForm.selectedVendorId);
                      });
                      if (vendorPOs.length === 0) {
                        return (
                          <option disabled>No purchase orders for this vendor</option>
                        );
                      }
                      return vendorPOs.map(po => (
                        <option key={po._id || po.id} value={po._id || po.id}>
                          {po.id || 'N/A'} | Amount: {fmt(po.totalAmount || 0)} | Ordered: {po.orderedDate || '-'}
                        </option>
                      ));
                    })()}
                  </Select>
                  
                  {/* PO Details Display */}
                  {adjustForm.selectedPurchaseOrderId && (
                    <div className="text-[11px] text-[var(--text-muted)] mt-2">
                      {(() => {
                        const selectedPO = purchaseOrders.find(po => (po._id || po.id) === adjustForm.selectedPurchaseOrderId);
                        if (!selectedPO) return null;
                        
                        // Use actual paid amount from PO
                        const poPaidAmount = selectedPO.paidAmount || 0;
                        const poOutstanding = (selectedPO.totalAmount || 0) - poPaidAmount;
                        
                        return (
                          <div className="p-2 bg-[var(--bg-surface)] rounded border border-[var(--border-base)] space-y-1">
                            <div className="flex justify-between">
                              <span>PO Number:</span>
                              <span className="font-mono text-[var(--accent-light)]">{selectedPO.id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Amount:</span>
                              <span className="font-medium">{fmt(selectedPO.totalAmount || 0)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--border-base)]">
                              <div className="text-center">
                                <div className="text-[9px] uppercase text-[var(--text-muted)]">Paid Amount</div>
                                <div className="text-xs font-semibold text-[var(--green)]">{fmt(poPaidAmount)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-[9px] uppercase text-[var(--text-muted)]">Outstanding</div>
                                <div className="text-xs font-bold text-amber-400">{fmt(poOutstanding)}</div>
                              </div>
                            </div>
                            <div className="flex justify-between pt-2">
                              <span>Ordered Date:</span>
                              <span>{selectedPO.orderedDate || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Expected Date:</span>
                              <span className="text-[var(--accent)]">{selectedPO.expectedDate || '-'}</span>
                            </div>
                            {selectedPO.deliveredDate && (
                              <div className="flex justify-between">
                                <span>Delivered Date:</span>
                                <span className="text-[var(--green)]">{selectedPO.deliveredDate}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </FormField>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <FormField label="Amount (₹)">
              <Input
                type="number"
                value={adjustForm.amount}
                onChange={e => {
                  setAdjustForm({ ...adjustForm, amount: e.target.value });
                  if (adjustErrors.amount) setAdjustErrors(prev => ({ ...prev, amount: undefined }));
                }}
                placeholder="Enter amount"
                disabled={submittingAdjust}
              />
              {adjustErrors.amount && (
                <div className="text-[11px] text-red-400 mt-1">{adjustErrors.amount}</div>
              )}
            </FormField>
            <FormField label="L.F.">
              <Input
                type="number"
                value={adjustForm.lf || ''}
                onChange={e => {
                  const val = e.target.value;
                  // Only allow numbers 1-1000
                  if (val === '' || (/^\d+$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 1000)) {
                    setAdjustForm({ ...adjustForm, lf: val });
                  }
                  if (adjustErrors.lf) setAdjustErrors(prev => ({ ...prev, lf: undefined }));
                }}
                placeholder="Enter L.F. (1-1000)"
                min="1"
                max="1000"
                disabled={submittingAdjust}
              />
              {adjustErrors.lf && (
                <div className="text-[11px] text-red-400 mt-1">{adjustErrors.lf}</div>
              )}
            </FormField>
            <FormField label="Date">
              <Input
                type="date"
                value={adjustForm.date}
                onChange={e => {
                  setAdjustForm({ ...adjustForm, date: e.target.value });
                  if (adjustErrors.date) setAdjustErrors(prev => ({ ...prev, date: undefined }));
                }}
                disabled={submittingAdjust}
              />
              {adjustErrors.date && (
                <div className="text-[11px] text-red-400 mt-1">{adjustErrors.date}</div>
              )}
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Reason (Optional)">
              <Input
                value={adjustForm.reason}
                onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="e.g., Year-end adjustment, Correction"
                disabled={submittingAdjust}
              />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Reference (Optional)">
              <Input
                value={adjustForm.reference}
                onChange={e => setAdjustForm({ ...adjustForm, reference: e.target.value })}
                placeholder="e.g., ADJ-001, Journal entry reference"
                disabled={submittingAdjust}
              />
            </FormField>
          </div>
        </div>
      </Modal>
      {/* Add New Category Modal */}
      <Modal
        isOpen={showAddCategoryModal}
        onClose={() => {
          if (addingCategory) return;
          setShowAddCategoryModal(false);
          setNewCategory({ categoryName: '', type: 'credit' });
        }}
        title="Add New Category"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                if (addingCategory) return;
                setShowAddCategoryModal(false);
                setNewCategory({ categoryName: '', type: 'credit' });
              }}
              disabled={addingCategory}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newCategory.categoryName.trim()) {
                  toast.error('Category name is required');
                  return;
                }
                try {
                  setAddingCategory(true);
                  const result = await financeApi.createAdjustmentCategory({
                    categoryName: newCategory.categoryName.trim(),
                    type: newCategory.type,
                  });
                  // Add new category to list and select it
                  const newCat = result?.category || result;
                  if (newCat) {
                    setAdjustmentCategories(prev => [...prev, newCat]);
                    // If the new category type matches current form type, select it
                    if (newCat.type === adjustForm.type) {
                      setAdjustForm(prev => ({ ...prev, category: newCat.categoryName }));
                    }
                  }
                  toast.success(`Category "${newCategory.categoryName}" created successfully`);
                  setShowAddCategoryModal(false);
                  setNewCategory({ categoryName: '', type: 'credit' });
                } catch (err) {
                  toast.error(err.message || 'Failed to create category');
                } finally {
                  setAddingCategory(false);
                }
              }}
              disabled={addingCategory}
            >
              {addingCategory ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {addingCategory ? ' Saving...' : ' Save Category'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pb-4">
          <FormField label="Category Name">
            <Input
              value={newCategory.categoryName}
              onChange={e => setNewCategory({ ...newCategory, categoryName: e.target.value })}
              placeholder="e.g., Customer Advance, Bank Charges"
              disabled={addingCategory}
              autoFocus
            />
          </FormField>
          <FormField label="Type">
            <Select
              value={newCategory.type}
              onChange={e => setNewCategory({ ...newCategory, type: e.target.value })}
              disabled={addingCategory}
            >
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </Select>
          </FormField>
        </div>
      </Modal>
      {/* Journal Entry Detail Modal */}
      {showJournalEntryModal && selectedJournalEntry && (
        <Modal
          isOpen={showJournalEntryModal}
          onClose={() => {
            setShowJournalEntryModal(false);
            setSelectedJournalEntry(null);
            setSelectedJournalEntryIndex(null);
          }}
          title={`Journal Entry - JE-${String(selectedJournalEntryIndex || 1).padStart(3, '0')}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowJournalEntryModal(false);
                  setSelectedJournalEntry(null);
                  setSelectedJournalEntryIndex(null);
                }}
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 pb-4">
            {/* Entry Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Date</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {new Date(selectedJournalEntry.date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Reference</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {selectedJournalEntry.reference || '-'}
                </div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Category</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {selectedJournalEntry.narration
                    ? selectedJournalEntry.narration.split(':')[0]?.trim()
                    : (selectedJournalEntry.category || '-')}
                </div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Type</div>
                <div className={`font-semibold ${selectedJournalEntry.type === 'credit' ? 'text-[var(--green)]' : 'text-red-400'}`}>
                  {selectedJournalEntry.type === 'credit' ? 'Credit (+)' : 'Debit (-)'}
                </div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">L.F.</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {selectedJournalEntry.lf || '-'}
                </div>
              </div>
            </div>
            {/* Journal Lines Table */}
            <div className="border border-[var(--border-base)] rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 text-[11px] font-semibold text-[var(--text-primary)] border-b-2 border-[var(--border-base)] p-2 bg-[var(--bg-surface)]">
                <div className="col-span-6 border-r-2 border-[var(--border-base)] px-1">Account</div>
                <div className="col-span-3 border-r-2 border-[var(--border-base)] px-1 text-right">Debit (₹)</div>
                <div className="col-span-3 pl-1 text-right">Credit (₹)</div>
              </div>
              {/* Debit Lines */}
              {(selectedJournalEntry.lines || [])
                .filter(l => l.debitAmount > 0)
                .map((line, idx) => (
                  <div
                    key={`debit-${idx}`}
                    className="grid grid-cols-12 text-xs border-b border-[var(--border-muted)]"
                  >
                    <div className="col-span-6 border-r-2 border-[var(--border-base)] px-3 py-2 text-[var(--text-primary)]">
                      {line.accountName} <span className="text-[var(--text-muted)]">Dr.</span>
                    </div>
                    <div className="col-span-3 border-r-2 border-[var(--border-base)] px-3 py-2 text-right font-medium text-[var(--text-primary)]">
                      {fmt(line.debitAmount)}
                    </div>
                    <div className="col-span-3 px-3 py-2 text-right">-</div>
                  </div>
                ))}
              {/* Credit Lines */}
              {(selectedJournalEntry.lines || [])
                .filter(l => l.creditAmount > 0)
                .map((line, idx) => (
                  <div
                    key={`credit-${idx}`}
                    className="grid grid-cols-12 text-xs border-b border-[var(--border-muted)]"
                  >
                    <div className="col-span-6 border-r-2 border-[var(--border-base)] px-3 py-2 text-[var(--text-primary)] pl-6">
                      <span className="text-[var(--text-muted)]">To</span> {line.accountName}
                    </div>
                    <div className="col-span-3 border-r-2 border-[var(--border-base)] px-3 py-2 text-right">-</div>
                    <div className="col-span-3 px-3 py-2 text-right font-medium text-[var(--text-primary)]">
                      {fmt(line.creditAmount)}
                    </div>
                  </div>
                ))}
              {/* Total Row */}
              <div className="grid grid-cols-12 text-xs font-semibold bg-[var(--bg-surface)] p-2 border-t-2 border-[var(--border-base)]">
                <div className="col-span-6 border-r-2 border-[var(--border-base)] px-1">Total</div>
                <div className="col-span-3 border-r-2 border-[var(--border-base)] px-1 text-right">
                  {fmt((selectedJournalEntry.lines || [])
                    .reduce((sum, l) => sum + (l.debitAmount || 0), 0))}
                </div>
                <div className="col-span-3 pl-1 text-right">
                  {fmt((selectedJournalEntry.lines || [])
                    .reduce((sum, l) => sum + (l.creditAmount || 0), 0))}
                </div>
              </div>
            </div>
            {/* Narration */}
            {selectedJournalEntry.narration && (
              <div className="glass-card p-3">
                <div className="text-[var(--text-muted)] mb-1 text-xs">Narration</div>
                <div className="text-sm text-[var(--text-primary)] italic">
                  ({selectedJournalEntry.narration})
                </div>
              </div>
            )}
            {/* Reason */}
            {selectedJournalEntry.reason && (
              <div className="glass-card p-3">
                <div className="text-[var(--text-muted)] mb-1 text-xs">Reason</div>
                <div className="text-sm text-[var(--text-primary)]">
                  {selectedJournalEntry.reason}
                </div>
              </div>
            )}
            {/* Created Info */}
            <div className="text-[10px] text-[var(--text-muted)] text-right">
              Created: {selectedJournalEntry.createdAt ? new Date(selectedJournalEntry.createdAt).toLocaleString('en-IN') : '-'}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default FinancePage;
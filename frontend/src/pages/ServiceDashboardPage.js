import React, { useState, useMemo, useEffect } from 'react';

import {

  Headphones, Plus, Clock, CheckCircle, AlertTriangle,

  Shield, Zap, Wrench, Calendar, XCircle, ArrowLeft,

  TrendingUp, BarChart3, PieChart, Activity, Users,

  FileText, IndianRupee, RefreshCw, Filter

} from 'lucide-react';

import { StatusBadge } from '../components/ui/Badge';

import { Button } from '../components/ui/Button';

import { PageHeader } from '../components/ui/PageHeader';

import { KPICard } from '../components/ui/KPICard';

import { Avatar } from '../components/ui/Avatar';

import DataTable from '../components/ui/DataTable';

import {

  getTickets,

  getTicketStats,

  getAmcContracts,

  getAmcContractStats,

  getAiInsight,

  getEngineers,

  getCustomers,

  getVisits,

  getVisitStats,

} from '../modules/service-amc/services/serviceAmcApi';



const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';

const TENANT_ID = 'solarcorp';



/* ── Priority helpers ───────────────────────────────────────────────────────── */

const NEUTRAL_BADGE = 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]';

const PRIORITY_MAP = {

  High: { label: 'High', color: 'bg-red-500/15    text-red-400    border-red-500/30' },

  Medium: { label: 'Medium', color: 'bg-amber-500/15  text-amber-400  border-amber-500/30' },

  Low: { label: 'Low', color: NEUTRAL_BADGE },

};

const PriorityBadge = ({ value }) => {

  const meta = PRIORITY_MAP[value] ?? PRIORITY_MAP.Low;

  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;

};



/* ── AMC badge ──────────────────────────────────────────────────────────────── */

const AMC_MAP = {

  Active: { label: 'Active', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },

  Expired: { label: 'Expired', color: 'bg-red-500/15    text-red-400    border-red-500/30' },

  Expiring: { label: 'Expiring', color: 'bg-amber-500/15  text-amber-400  border-amber-500/30' },

};

const AmcBadge = ({ value }) => {

  const meta = AMC_MAP[value] ?? AMC_MAP.Active;

  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;

};



/* ── Ticket Status Badge ────────────────────────────────────────────────────── */

const TICKET_STATUS_MAP = {

  Open: { label: 'Open', color: 'bg-red-500/15 text-red-400 border-red-500/30' },

  Scheduled: { label: 'Scheduled', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },

  'In Progress': { label: 'In Progress', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },

  Resolved: { label: 'Resolved', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },

  Closed: { label: 'Closed', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },

};

const TicketStatusBadge = ({ value }) => {

  const meta = TICKET_STATUS_MAP[value] ?? { label: value, color: NEUTRAL_BADGE };

  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;

};



/* ── Visit Status Badge ─────────────────────────────────────────────────────── */

const VISIT_STATUS_MAP = {

  Scheduled: { label: 'Scheduled', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },

  Completed: { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },

  Cancelled: { label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border-red-500/30' },

};

const VisitStatusBadge = ({ value }) => {

  const meta = VISIT_STATUS_MAP[value] ?? { label: value, color: NEUTRAL_BADGE };

  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;

};



/* ══════════════════════════════════════════════════════════════════════════════

   SERVICE DASHBOARD PAGE

══════════════════════════════════════════════════════════════════════════════ */

const ServiceDashboardPage = ({ onNavigate }) => {

  // Data states

  const [tickets, setTickets] = useState([]);

  const [amcContracts, setAmcContracts] = useState([]);

  const [visits, setVisits] = useState([]);

  const [engineers, setEngineers] = useState([]);

  const [customers, setCustomers] = useState([]);

  const [ticketStats, setTicketStats] = useState({ openTickets: 0, inProgress: 0, resolved: 0 });

  const [amcStats, setAmcStats] = useState({ activeContracts: 0 });

  const [visitStats, setVisitStats] = useState({ totalVisits: 0, scheduled: 0, completed: 0, cancelled: 0 });

  const [aiInsight, setAiInsight] = useState({ insight: '', recommendations: [] });

  // Store raw API responses to extract pagination metadata

  const [amcResponseMeta, setAmcResponseMeta] = useState({ total: 0 });

  const [visitsResponseMeta, setVisitsResponseMeta] = useState({ total: 0 });



  // Loading states

  const [loadingTickets, setLoadingTickets] = useState(false);

  const [loadingAmc, setLoadingAmc] = useState(false);

  const [loadingVisits, setLoadingVisits] = useState(false);

  const [loadingStats, setLoadingStats] = useState(false);

  const [loadingEngineers, setLoadingEngineers] = useState(false);

  const [lastRefresh, setLastRefresh] = useState(new Date());



  // Toast notification state

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {

    setToast({ show: true, message, type });

    setTimeout(() => setToast({ show: false, message: '', type }), 5000);

  };



  // Fetch all data

  const fetchAllData = async () => {

    setLoadingTickets(true);

    setLoadingAmc(true);

    setLoadingVisits(true);

    setLoadingStats(true);

    setLoadingEngineers(true);



    try {

      // Fetch stats for counts (independent of pagination)

      const [tStats, aStats, vStats] = await Promise.all([

        getTicketStats(),

        getAmcContractStats(),

        getVisitStats()

      ]);



      // Set stats immediately for cards display

      console.log('DEBUG - Setting stats:', { tStats, aStats, vStats });

      setTicketStats(tStats || { openTickets: 0, inProgress: 0, resolved: 0 });

      setAmcStats(aStats || { activeContracts: 0, totalContracts: 0 });

      setVisitStats(vStats || { totalVisits: 0, scheduled: 0, completed: 0, cancelled: 0 });



      // Fetch detailed data for recent activity lists

      const [

        ticketsRes,

        amcRes,

        visitsRes,

        engineersRes,

        customersRes,

        aiRes

      ] = await Promise.all([

        getTickets({ limit: 1000 }),

        getAmcContracts({ limit: 1000 }),

        getVisits({ limit: 1000 }),

        getEngineers(),

        getCustomers(),

        getAiInsight()

      ]);



      // Process tickets

      let ticketsData = [];

      if (Array.isArray(ticketsRes)) {

        ticketsData = ticketsRes;

      } else if (ticketsRes?.data && Array.isArray(ticketsRes.data)) {

        ticketsData = ticketsRes.data;

      } else if (ticketsRes?.data?.data && Array.isArray(ticketsRes.data.data)) {

        ticketsData = ticketsRes.data.data;

      }

      setTickets(ticketsData);



      // Process AMC contracts

      let contractsData = [];

      let amcTotalCount = 0;

      console.log('DEBUG - AMC Raw Response:', amcRes);

      if (Array.isArray(amcRes)) {

        contractsData = amcRes;

        amcTotalCount = amcRes.length;

      } else if (amcRes?.data && Array.isArray(amcRes.data)) {

        contractsData = amcRes.data;

        amcTotalCount = amcRes?.total || amcRes.data?.length;

      } else if (amcRes?.data?.data && Array.isArray(amcRes.data.data)) {

        contractsData = amcRes.data.data;

        // Priority: data.data.total > data.total > res.total > array.length

        amcTotalCount = amcRes.data?.total ?? amcRes?.data?.total ?? amcRes?.total ?? amcRes.data.data.length;

        console.log('DEBUG - AMC total extracted:', amcTotalCount, 'from:', { 'data.total': amcRes.data?.total, 'res.data.total': amcRes?.data?.total, 'res.total': amcRes?.total });

      } else if (amcRes?.data && typeof amcRes.data === 'object') {

        // Handle case where data.data might not exist but data is object with data and total

        if (Array.isArray(amcRes.data.data)) {

          contractsData = amcRes.data.data;

          amcTotalCount = amcRes.data.total || amcRes.data.data.length;

        } else {

          contractsData = Object.values(amcRes.data).filter(v => Array.isArray(v))[0] || [];

          amcTotalCount = amcRes.data.total || contractsData.length;

        }

      }

      setAmcContracts(contractsData);

      setAmcResponseMeta({ total: amcTotalCount });

      console.log('DEBUG - AMC total from API:', amcTotalCount, 'array length:', contractsData.length);



      // Process visits

      let visitsData = [];

      let visitsTotalCount = 0;

      if (Array.isArray(visitsRes)) {

        visitsData = visitsRes;

        visitsTotalCount = visitsRes.length;

      } else if (visitsRes?.data && Array.isArray(visitsRes.data)) {

        visitsData = visitsRes.data;

        visitsTotalCount = visitsRes?.total || visitsRes.data?.length;

      } else if (visitsRes?.data?.data && Array.isArray(visitsRes.data.data)) {

        visitsData = visitsRes.data.data;

        visitsTotalCount = visitsRes?.data?.total || visitsRes?.total || visitsRes.data.data.length;

      }

      setVisits(visitsData);

      setVisitsResponseMeta({ total: visitsTotalCount });

      console.log('DEBUG - Visits total from API:', visitsTotalCount, 'array length:', visitsData.length);



      // Process engineers

      let engineersData = [];

      if (Array.isArray(engineersRes)) {

        engineersData = engineersRes;

      } else if (engineersRes?.data && Array.isArray(engineersRes.data)) {

        engineersData = engineersRes.data;

      } else if (engineersRes?.data?.data && Array.isArray(engineersRes.data.data)) {

        engineersData = engineersRes.data.data;

      }

      setEngineers(engineersData);



      // Process customers

      const customersData = Array.isArray(customersRes) ? customersRes : customersRes?.data || [];

      setCustomers(customersData);



      // Set AI insight

      setAiInsight(aiRes || { insight: '', recommendations: [] });



      setLastRefresh(new Date());

    } catch (err) {

      console.error('Error fetching dashboard data:', err);

      showToast('Failed to fetch some data', 'error');

    } finally {

      setLoadingTickets(false);

      setLoadingAmc(false);

      setLoadingVisits(false);

      setLoadingStats(false);

      setLoadingEngineers(false);

    }

  };



  // Initial fetch

  useEffect(() => {

    fetchAllData();

  }, []);



  // Auto-refresh every 30 seconds

  useEffect(() => {

    const interval = setInterval(() => {

      fetchAllData();

    }, 30000);

    return () => clearInterval(interval);

  }, []);



  // Calculate dynamic stats

  const dynamicTicketStats = useMemo(() => {

    const ticketsArray = Array.isArray(tickets) ? tickets : [];

    // Use API stats when available, fallback to calculated from array

    return {

      openTickets: ticketStats?.openTickets ?? ticketsArray.filter(t => t.status === 'Open').length,

      scheduled: ticketStats?.scheduled ?? ticketsArray.filter(t => t.status === 'Scheduled').length,

      inProgress: ticketStats?.inProgress ?? ticketsArray.filter(t => t.status === 'In Progress').length,

      resolved: ticketStats?.resolved ?? ticketsArray.filter(t => t.status === 'Resolved').length,

      closed: ticketStats?.closed ?? ticketsArray.filter(t => t.status === 'Closed').length,

      total: ticketStats?.total ?? ticketsArray.length,

    };

  }, [tickets, ticketStats]);



  const dynamicAmcStats = useMemo(() => {

    // Use API response metadata total (actual total count), not array length (paginated)

    const totalContracts = amcResponseMeta?.total || amcContracts.length;

    const activeContracts = amcStats?.activeContracts ?? amcContracts.filter(c => c.status === 'Active').length;

    console.log('DEBUG - AMC Stats final:', { totalContracts, activeContracts, amcResponseMeta, contractsLength: amcContracts.length });

    return {

      total: totalContracts,

      active: activeContracts,

      expiring: amcStats?.expiringContracts ?? amcContracts.filter(c => c.status === 'Expiring').length,

      expired: amcStats?.expiredContracts ?? amcContracts.filter(c => c.status === 'Expired').length,

      totalValue: amcStats?.totalValue ?? amcContracts.reduce((sum, c) => sum + (c.amount || 0), 0),

    };

  }, [amcContracts, amcStats, amcResponseMeta]);



  const dynamicVisitStats = useMemo(() => {

    // Use API response metadata total (actual total count), not array length (paginated)

    const totalVisits = visitsResponseMeta?.total || visits.length;

    const scheduledVisits = visits.filter(v => v.status === 'Scheduled').length;

    const completedVisits = visits.filter(v => v.status === 'Completed').length;

    console.log('DEBUG - Visit Stats final:', { totalVisits, scheduledVisits, completedVisits, visitsResponseMeta, visitsLength: visits.length });

    return {

      total: totalVisits,

      scheduled: scheduledVisits,

      completed: completedVisits,

      cancelled: visits.filter(v => v.status === 'Cancelled').length,

    };

  }, [visits, visitsResponseMeta]);



  // AI insight text

  const aiInsightText = aiInsight?.insight ||

    (aiInsight?.recommendations?.length > 0

      ? aiInsight.recommendations.join(' ')

      : 'No insights available at this time.');



  // Recent items (sorted by date) - Show ALL tickets without limit

  const recentTickets = useMemo(() => {

    const allTickets = [...tickets]

      .sort((a, b) => {

        const dateA = a.created || a.createdAt || a.date;

        const dateB = b.created || b.createdAt || b.date;

        // Handle missing dates - put items with valid dates first

        if (!dateA && !dateB) return 0;

        if (!dateA) return 1;

        if (!dateB) return -1;

        return new Date(dateB) - new Date(dateA);

      });

    console.log('DEBUG - Total tickets:', tickets.length);

    console.log('DEBUG - Recent tickets count:', allTickets.length);

    console.log('DEBUG - All ticket IDs:', allTickets.map(t => ({id: t.id, status: t.status, customer: t.customerName})));

    return allTickets;

  }, [tickets]);



  const recentVisits = useMemo(() => {

    return [...visits]

      .sort((a, b) => new Date(b.scheduledDate || b.createdAt) - new Date(a.scheduledDate || a.createdAt))

      .slice(0, 5);

  }, [visits]);



  const recentContracts = useMemo(() => {

    return [...amcContracts]

      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))

      .slice(0, 5);

  }, [amcContracts]);



  // Ticket columns for recent tickets table

  const RECENT_TICKET_COLUMNS = [

    { key: 'id', header: 'ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },

    { key: 'customerName', header: 'Customer', render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },

    { key: 'type', header: 'Type', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },

    { key: 'status', header: 'Status', render: v => <TicketStatusBadge value={v} /> },

    { key: 'priority', header: 'Priority', render: v => <PriorityBadge value={v} /> },

    {

      key: 'assignedTo', header: 'Assigned', render: v => (

        <div className="flex items-center gap-1.5">

          <Avatar name={v} size="xs" />

          <span className="text-xs text-[var(--text-muted)]">{v || 'Unassigned'}</span>

        </div>

      )

    },

  ];



  return (

    <div className="animate-fade-in space-y-5">

      {/* Header */}

      <PageHeader

        title="Service & AMC Dashboard"

        subtitle="Real-time overview of tickets, AMC contracts, visits, and team performance"

        actions={[

          { type: 'button', label: 'Back to Service', icon: ArrowLeft, variant: 'secondary', onClick: () => onNavigate('service') },

          { type: 'button', label: 'New Ticket', icon: Plus, variant: 'primary', onClick: () => onNavigate('service') }

        ]}

      />



      {/* Overview Stats Cards */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <KPICard

          label="Total Tickets"

          value={dynamicTicketStats.total}

          icon={Headphones}

          sub={`${dynamicTicketStats.openTickets} open now`}

          variant="blue"

        />

        <KPICard

          label="Open Tickets"

          value={dynamicTicketStats.openTickets}

          icon={AlertTriangle}

          trend="Need attention"

          trendUp={false}

          variant="amber"

        />

        <KPICard

          label="Scheduled"

          value={dynamicVisitStats.scheduled}

          icon={Calendar}

          sub={`${dynamicVisitStats.total} total visits`}

          variant="purple"

        />

        <KPICard

          label="In Progress"

          value={dynamicTicketStats.inProgress}

          icon={Clock}

          sub="Being handled"

          variant="indigo"

        />

      </div>



      {/* Second Row Stats */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <KPICard

          label="Resolved"

          value={dynamicTicketStats.resolved}

          icon={CheckCircle}

          trend="This month"

          trendUp={true}

          variant="emerald"

        />

        <KPICard

          label="Closed"

          value={dynamicTicketStats.closed}

          icon={XCircle}

          sub="Completed"

          variant="indigo"

        />

        <KPICard

          label="AMC Contracts"

          value={dynamicAmcStats.total}

          icon={Shield}

          sub={`${dynamicAmcStats.active} active contracts`}

          variant="purple"

        />

        <KPICard

          label="Total Visits"

          value={dynamicVisitStats.total}

          icon={Activity}

          sub={`${dynamicVisitStats.scheduled} scheduled`}

          variant="blue"

        />

      </div>



      {/* Status Breakdown Section */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Tickets Status Breakdown */}

        <div className="glass-card p-4">

          <div className="flex items-center justify-between mb-4">

            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">

              <PieChart size={16} className="text-[var(--accent-light)]" />

              Tickets Status Breakdown

            </h3>

            <span className="text-xs text-[var(--text-muted)]">Total: {dynamicTicketStats.total}</span>

          </div>

          <div className="space-y-3">

            {[

              { label: 'Open', count: dynamicTicketStats.openTickets, color: 'bg-red-500', text: 'text-red-400' },

              { label: 'Scheduled', count: dynamicTicketStats.scheduled, color: 'bg-blue-500', text: 'text-blue-400' },

              { label: 'In Progress', count: dynamicTicketStats.inProgress, color: 'bg-amber-500', text: 'text-amber-400' },

              { label: 'Resolved', count: dynamicTicketStats.resolved, color: 'bg-emerald-500', text: 'text-emerald-400' },

              { label: 'Closed', count: dynamicTicketStats.closed, color: 'bg-slate-500', text: 'text-slate-400' },

            ].map((item) => (

              <div key={item.label} className="flex items-center gap-3">

                <span className={`text-xs font-medium w-20 ${item.text}`}>{item.label}</span>

                <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">

                  <div

                    className={`h-full ${item.color} rounded-full`}

                    style={{ width: `${dynamicTicketStats.total > 0 ? (item.count / dynamicTicketStats.total) * 100 : 0}%` }}

                  />

                </div>

                <span className="text-xs font-bold text-[var(--text-primary)] w-8 text-right">{item.count}</span>

              </div>

            ))}

          </div>

        </div>



        {/* Visits Status */}

        <div className="glass-card p-4">

          <div className="flex items-center justify-between mb-4">

            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">

              <Activity size={16} className="text-[var(--accent-light)]" />

              Visit Statistics

            </h3>

            <span className="text-xs text-[var(--text-muted)]">Total: {dynamicVisitStats.total}</span>

          </div>

          <div className="space-y-3">

            {[

              { label: 'Scheduled', count: dynamicVisitStats.scheduled, color: 'bg-blue-500', text: 'text-blue-400' },

              { label: 'Completed', count: dynamicVisitStats.completed, color: 'bg-emerald-500', text: 'text-emerald-400' },

              { label: 'Cancelled', count: dynamicVisitStats.cancelled, color: 'bg-red-500', text: 'text-red-400' },

            ].map((item) => (

              <div key={item.label} className="flex items-center gap-3">

                <span className={`text-xs font-medium w-20 ${item.text}`}>{item.label}</span>

                <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">

                  <div

                    className={`h-full ${item.color} rounded-full`}

                    style={{ width: `${dynamicVisitStats.total > 0 ? (item.count / dynamicVisitStats.total) * 100 : 0}%` }}

                  />

                </div>

                <span className="text-xs font-bold text-[var(--text-primary)] w-8 text-right">{item.count}</span>

              </div>

            ))}

          </div>

        </div>

      </div>



      {/* Recent Activity Section */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Tickets */}

        <div className="glass-card p-4">

          <div className="flex items-center justify-between mb-3">

            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">

              <Headphones size={16} className="text-[var(--accent-light)]" />

              Recent Tickets

            </h3>

            <Button variant="ghost" size="sm" onClick={() => onNavigate('service')}>

              View All

            </Button>

          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">

            {recentTickets.map((ticket) => (

              <div key={ticket.id} className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-xs">

                <div className="flex items-center justify-between">

                  <span className="font-mono text-[var(--accent-light)]">{ticket.id}</span>

                  <TicketStatusBadge value={ticket.status} />

                </div>

                <div className="text-[var(--text-primary)] truncate mt-1">{ticket.customerName}</div>

                <div className="flex items-center justify-between mt-1">

                  <span className="text-[10px] text-[var(--text-muted)]">{ticket.type}</span>

                  <PriorityBadge value={ticket.priority} />

                </div>

              </div>

            ))}

            {recentTickets.length === 0 && (

              <p className="text-xs text-[var(--text-muted)] text-center py-4">No tickets found</p>

            )}

          </div>

        </div>



        {/* Recent Visits */}

        <div className="glass-card p-4">

          <div className="flex items-center justify-between mb-3">

            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">

              <Clock size={16} className="text-[var(--accent-light)]" />

              Recent Visits

            </h3>

            <Button variant="ghost" size="sm" onClick={() => onNavigate('service', 'schedule-visit')}>

              View All

            </Button>

          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">

            {recentVisits.map((visit) => (

              <div key={visit.id || visit.visitId} className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-xs">

                <div className="flex items-center justify-between">

                  <span className="font-mono text-[var(--accent-light)]">{visit.visitId || visit.id}</span>

                  <VisitStatusBadge value={visit.status} />

                </div>

                <div className="text-[var(--text-primary)] truncate mt-1">{visit.customer}</div>

                <div className="text-[10px] text-[var(--text-muted)] mt-1">

                  {visit.visitType} • {visit.scheduledDate}

                </div>

              </div>

            ))}

            {recentVisits.length === 0 && (

              <p className="text-xs text-[var(--text-muted)] text-center py-4">No visits found</p>

            )}

          </div>

        </div>



        {/* Team Overview */}

        <div className="glass-card p-4">

          <div className="flex items-center justify-between mb-3">

            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">

              <Users size={16} className="text-[var(--accent-light)]" />

              Team Overview

            </h3>

            <span className="text-xs text-[var(--text-muted)]">{engineers.length} Engineers</span>

          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">

            {engineers.slice(0, 8).map((engineer) => (

              <div key={engineer.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)]">

                <Avatar name={engineer.name} size="sm" />

                <div className="flex-1 min-w-0">

                  <div className="text-xs font-medium text-[var(--text-primary)] truncate">{engineer.name}</div>

                  <div className="text-[10px] text-[var(--text-muted)] truncate">{engineer.email}</div>

                </div>

                <div className="text-[10px] text-[var(--text-muted)]">

                  {tickets.filter(t => t.assignedTo === engineer.name).length} tickets

                </div>

              </div>

            ))}

            {engineers.length === 0 && (

              <p className="text-xs text-[var(--text-muted)] text-center py-4">No engineers found</p>

            )}

          </div>

        </div>

      </div>



      {/* Toast Notification */}

      {toast.show && (

        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>

          {toast.message}

        </div>

      )}

    </div>

  );

};



export default ServiceDashboardPage;


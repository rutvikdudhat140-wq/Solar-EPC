// SalesDashboard.js a "  Sales role dashboard with lead status cards and workflow
import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, Activity, CheckCircle, MapPin, ArrowRight,
    TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
    Calendar, Zap, Target, RefreshCw
} from 'lucide-react';
import { useRoleDashboard } from './RoleDashboardProvider';
import {
    ChartCard, SectionHeader,
    DashTable, Grid4,
    DashboardLoading,
    fmtCurrency, ROLE_COLORS
} from './DashboardShell';
import { leadsApi } from '../../services/leadsApi';
import { surveysApi } from '../../services/surveysApi';
import { toast } from '../../components/ui/Toast';

const C = ROLE_COLORS.sales;

// a"  a"   Lead Status KPI Card a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const LeadStatusCard = ({ title, value, change, icon: Icon, color, subtitle, trend, onClick }) => (
    <div 
        onClick={onClick}
        className="glass-card p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform cursor-pointer"
    >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" 
            style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)` }}>
            <Icon size={20} style={{ color }} />
        </div>
        <div className="flex-1">
            <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{value}</p>
            {subtitle && <p className="text-[9px] text-[var(--text-muted)]">{subtitle}</p>}
            <div className="flex items-center gap-1 mt-1">
                {change !== undefined && (
                    <p className={`text-[10px] font-bold ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {change >= 0 ? <ArrowUpRight size={10} className="inline" /> : <ArrowDownRight size={10} className="inline" />}
                        {Math.abs(change)}%
                    </p>
                )}
                {trend && (
                    <div className="flex items-center gap-0.5">
                        {trend === 'up' && <TrendingUp size={10} className="text-emerald-500" />}
                        {trend === 'down' && <TrendingDown size={10} className="text-red-500" />}
                        {trend === 'stable' && <ArrowRight size={10} className="text-amber-500" />}
                    </div>
                )}
            </div>
        </div>
    </div>
);

// a"  a"   CRM Lead Card (for Site Survey Scheduled section) a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const CRMLeadCard = ({ lead, onMoveToPending }) => (
    <div 
        onClick={() => onMoveToPending(lead)}
        className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer hover:scale-[1.02]"
    >
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm">
                {lead.name?.split(' ').map(n => n[0]).join('') || '?'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{lead.name}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{lead.company || 'Individual'}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-bold text-amber-500">{lead.kw || '0kW'}</p>
                <p className="text-[9px] text-[var(--text-muted)]">{lead.city || 'a " '}</p>
            </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                <Calendar size={10} />
                <span>Due: {lead.nextFollowUp || 'a " '}</span>
            </div>
            <span className="text-[9px] text-amber-500 font-medium flex items-center gap-1">
                Click to Move Pending <ArrowRight size={10} />
            </span>
        </div>
    </div>
);

// a"  a"   Survey Card (for Active/In Progress section) a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const SurveyCard = ({ survey, onComplete, onFillForm }) => (
    <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-emerald-500/30 hover:border-emerald-500/60 transition-all">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 text-white flex items-center justify-center font-bold text-sm">
                {survey.customerName?.split(' ').map(n => n[0]).join('') || '?'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{survey.customerName}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{survey.site || 'a " '}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-bold text-emerald-500">{survey.estimatedKw}kW</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    survey.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                    survey.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                    'bg-blue-500/10 text-blue-500'
                }`}>
                    {survey.status}
                </span>
            </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                <Calendar size={10} />
                <span>{survey.scheduledDate || 'a " '}</span>
            </div>
            {survey.status === 'pending' && onFillForm && (
                <button
                    onClick={() => onFillForm(survey)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                    <Activity size={10} />
                    Fill Form
                </button>
            )}
            {survey.status === 'active' && onComplete && (
                <button
                    onClick={() => onComplete(survey)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                    <CheckCircle size={10} />
                    Complete
                </button>
            )}
        </div>
    </div>
);

// a"  a"   Main Dashboard Component a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  
const SalesDashboard = () => {
    const { data, loading } = useRoleDashboard();
    const [crmLeads, setCrmLeads] = useState([]);
    const [surveys, setSurveys] = useState([]);
    const [leadsLoading, setLeadsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch leads and surveys data
    const fetchData = useCallback(async () => {
        try {
            setLeadsLoading(true);
            
            // Fetch all leads from CRM
            const leadsResult = await leadsApi.getAll({ limit: 100 });
            const leadsData = leadsResult.data?.data || leadsResult.data || [];
            setCrmLeads(leadsData);
            
            // Fetch all surveys
            const surveysResult = await surveysApi.getAll({ limit: 100 });
            const surveysData = surveysResult.data?.data || surveysResult.data || [];
            setSurveys(surveysData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            toast.error('Failed to load dashboard data');
        } finally {
            setLeadsLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle refresh
    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        toast.success('Dashboard refreshed');
    };

    // Handle Move to Pending - Move lead to survey stage and create pending survey
    const handleMoveToPending = async (lead) => {
        try {
            // First update lead stage to 'survey'
            await leadsApi.update(lead._id || lead.id, { stage: 'survey' });
            
            // Create a pending survey for this lead
            const surveyData = {
                customerName: lead.name,
                engineer: lead.assignedTo || 'Unassigned',
                site: lead.company || lead.city || 'TBD',
                scheduledDate: lead.nextFollowUp || new Date().toISOString().split('T')[0],
                estimatedKw: parseInt(lead.kw?.replace('kW', '')) || 0,
                status: 'pending',
                sourceLeadId: lead._id || lead.id,
                notes: `Moved to Pending from CRM. Source: ${lead.source}, City: ${lead.city}, Phone: ${lead.phone}`
            };
            
            await surveysApi.create(surveyData);
            
            toast.success(`Lead "${lead.name}" moved to Pending`);
            
            // Refresh data to show updated state
            await fetchData();
        } catch (err) {
            console.error('Failed to move lead to pending:', err);
            toast.error('Failed to move lead: ' + (err.message || 'Unknown error'));
        }
    };

    // Handle survey form submission
    const handleFillForm = async (survey) => {
        try {
            await surveysApi.update(survey._id || survey.id, { status: 'active' });
            toast.success('Survey form submitted! Moved to Active.');
            await fetchData();
        } catch (err) {
            console.error('Failed to submit survey form:', err);
            toast.error('Failed to submit survey form');
        }
    };

    // Handle survey completion
    const handleCompleteSurvey = async (survey) => {
        try {
            await surveysApi.update(survey._id || survey.id, { status: 'completed' });
            
            // Update lead stage to proposal
            if (survey.sourceLeadId) {
                await leadsApi.update(survey.sourceLeadId, { stage: 'proposal' });
            }
            
            toast.success('Survey completed! Lead moved to Proposal stage.');
            await fetchData();
        } catch (err) {
            console.error('Failed to complete survey:', err);
            toast.error('Failed to complete survey');
        }
    };

    if (loading) return <DashboardLoading />;

    // Calculate lead status counts
    const activeLeads = crmLeads.filter(l => l.stage === 'new' || l.stage === 'contacted' || l.stage === 'qualified').length;
    const inProgressLeads = crmLeads.filter(l => l.stage === 'proposal' || l.stage === 'negotiation' || l.stage === 'survey').length;
    const completedLeads = crmLeads.filter(l => l.stage === 'won').length;

    // Calculate percentages (mock - in real app, compare with previous period)
    const activeChange = 12.5;
    const inProgressChange = -5.2;
    const completedChange = 8.7;

    // Get leads ready for survey (qualified stage)
    const readyForSurveyLeads = crmLeads.filter(l => l.stage === 'qualified' && !surveys.find(s => s.sourceLeadId === (l._id || l.id)));

    // Get site survey scheduled leads (survey stage without survey created)
    const surveyScheduledLeads = crmLeads.filter(l => l.stage === 'survey' && !surveys.find(s => s.sourceLeadId === (l._id || l.id)));

    // Get pending surveys (survey scheduled, form not submitted)
    const pendingSurveys = surveys.filter(s => s.status === 'pending');

    // Get active surveys (form submitted, in progress)
    const activeSurveys = surveys.filter(s => s.status === 'active');

    // Get completed surveys
    const completedSurveys = surveys.filter(s => s.status === 'completed');

    return (
        <div className="space-y-6 p-6">
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

            <div className="flex items-center justify-between">
                <SectionHeader
                    title="Sales Dashboard"
                    subtitle="Lead management   Pipeline tracking   Site surveys"
                    icon={Target}
                    accent={C.primary}
                    badge="Sales Hub"
                />
                <button
                    onClick={handleRefresh}
                    disabled={refreshing || leadsLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                    <RefreshCw size={14} className={refreshing || leadsLoading ? 'animate-spin' : ''} />
                    <span className="text-xs">Refresh</span>
                </button>
            </div>

            {/* a"  a"   Lead Status Cards a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"   */}
            <Grid4>
                <LeadStatusCard
                    title="Active Leads"
                    value={activeLeads}
                    change={activeChange}
                    icon={Users}
                    color="#3b82f6"
                    subtitle="New, contacted, qualified"
                    trend="up"
                />
                <LeadStatusCard
                    title="In Progress"
                    value={inProgressLeads}
                    change={inProgressChange}
                    icon={Activity}
                    color="#f59e0b"
                    subtitle="Proposal, negotiation, survey"
                    trend="stable"
                />
                <LeadStatusCard
                    title="Completed"
                    value={completedLeads}
                    change={completedChange}
                    icon={CheckCircle}
                    color="#22c55e"
                    subtitle="Won deals"
                    trend="up"
                />
                <LeadStatusCard
                    title="Site Survey"
                    value={pendingSurveys.length + activeSurveys.length}
                    change={0}
                    icon={MapPin}
                    color="#a855f7"
                    subtitle="Pending & active surveys"
                    trend="stable"
                />
            </Grid4>

            {/* a"  a"   Site Survey Scheduled (From CRM) Section a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"   */}
            <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Site Survey Scheduled (From CRM)</h3>
                        <p className="text-[11px] text-[var(--text-muted)]">
                            Leads ready to be flipped from CRM to survey workflow
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                            {readyForSurveyLeads.length + surveyScheduledLeads.length} Pending
                        </span>
                    </div>
                </div>

                {/* Ready for Flip (Qualified leads) */}
                {readyForSurveyLeads.length > 0 && (
                    <div className="mb-4">
                        <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                            Ready for Survey (Qualified)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {readyForSurveyLeads.map(lead => (
                                <CRMLeadCard key={lead._id || lead.id} lead={lead} onMoveToPending={handleMoveToPending} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Survey Scheduled but no survey created yet */}
                {surveyScheduledLeads.length > 0 && (
                    <div className="mb-4">
                        <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                            Survey Scheduled (Awaiting Form)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {surveyScheduledLeads.map(lead => (
                                <CRMLeadCard key={lead._id || lead.id} lead={lead} onMoveToPending={handleMoveToPending} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {readyForSurveyLeads.length === 0 && surveyScheduledLeads.length === 0 && (
                    <div className="p-8 text-center">
                        <p className="text-[11px] text-[var(--text-muted)]">
                            No leads ready for site survey. Move leads to &quot;Qualified&quot; stage in CRM.
                        </p>
                    </div>
                )}
            </div>

            {/* a"  a"   Survey Workflow Sections a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"   */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Surveys */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">PENDING</h3>
                            <p className="text-[11px] text-[var(--text-muted)]">Form not submitted</p>
                        </div>
                        <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                            {pendingSurveys.length}
                        </span>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {pendingSurveys.map(survey => (
                            <SurveyCard 
                                key={survey._id || survey.id} 
                                survey={survey} 
                                onFillForm={handleFillForm}
                            />
                        ))}
                        {pendingSurveys.length === 0 && (
                            <p className="text-[11px] text-[var(--text-muted)] text-center py-4">
                                No pending surveys
                            </p>
                        )}
                    </div>
                </div>

                {/* Active Surveys */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">IN PROGRESS</h3>
                            <p className="text-[11px] text-[var(--text-muted)]">Active surveys</p>
                        </div>
                        <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                            {activeSurveys.length}
                        </span>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {activeSurveys.map(survey => (
                            <SurveyCard 
                                key={survey._id || survey.id} 
                                survey={survey} 
                                onComplete={handleCompleteSurvey}
                            />
                        ))}
                        {activeSurveys.length === 0 && (
                            <p className="text-[11px] text-[var(--text-muted)] text-center py-4">
                                No active surveys
                            </p>
                        )}
                    </div>
                </div>

                {/* Completed Surveys */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">COMPLETED</h3>
                            <p className="text-[11px] text-[var(--text-muted)]">Ready for proposal</p>
                        </div>
                        <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold">
                            {completedSurveys.length}
                        </span>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {completedSurveys.map(survey => (
                            <SurveyCard 
                                key={survey._id || survey.id} 
                                survey={survey}
                            />
                        ))}
                        {completedSurveys.length === 0 && (
                            <p className="text-[11px] text-[var(--text-muted)] text-center py-4">
                                No completed surveys
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* a"  a"   Recent Leads Table a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"  a"   */}
            <ChartCard 
                title="Recent Leads" 
                subtitle="Latest lead activity"
                headerRight={
                    <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg p-1">
                        {['All', 'Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
                            <button key={filter} className="px-2 py-1 text-xs rounded-md font-medium text-[var(--text-secondary)] hover:text-gray-900 transition-all">{filter}</button>
                        ))}
                    </div>
                }
            >
                <DashTable
                    columns={['Lead', 'Company', 'Stage', 'Value', 'Status']}
                    rows={crmLeads.slice(0, 5).map(lead => [
                        <div key={`name-${lead._id || lead.id}`} className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-[11px]">
                                {lead.name?.[0] || '?'}
                            </div>
                            <span className="font-medium text-[var(--text-primary)]">{lead.name}</span>
                        </div>,
                        <span key={`comp-${lead._id || lead.id}`} className="text-[var(--text-secondary)]">{lead.company || 'a " '}</span>,
                        <span key={`stage-${lead._id || lead.id}`} className={`text-[10px] px-2 py-0.5 rounded-full ${
                            lead.stage === 'won' ? 'bg-emerald-500/10 text-emerald-500' :
                            lead.stage === 'lost' ? 'bg-red-500/10 text-red-500' :
                            lead.stage === 'survey' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-blue-500/10 text-blue-500'
                        }`}>
                            {lead.stage}
                        </span>,
                        <span key={`val-${lead._id || lead.id}`} className="font-bold text-[var(--accent)]">{fmtCurrency(lead.value || 0)}</span>,
                        <span key={`status-${lead._id || lead.id}`} className={`text-[10px] ${
                            lead.stage === 'won' ? 'text-emerald-500' : 
                            lead.stage === 'lost' ? 'text-red-500' : 
                            'text-[var(--text-muted)]'
                        }`}>
                            {lead.stage === 'won' ? 'Closed Won' : lead.stage === 'lost' ? 'Closed Lost' : 'Open'}
                        </span>
                    ])}
                />
            </ChartCard>
        </div>
    );
};

export default SalesDashboard;

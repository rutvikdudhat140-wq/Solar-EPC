// Site Survey Management - Consistent UI Design
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, MapPin, Calendar, CheckCircle, Zap, List, LayoutGrid,
  Eye, ChevronRight, Trash2, Edit2, Search, User,
  Clock, FileText, Play, X, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Textarea, Select } from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { KPICard } from '../components/ui/KPICard';
import { useAuditLog } from '../hooks/useAuditLog';
import { usePermissions } from '../hooks/usePermissions';

const SurveyPage = () => {
  // ── State Management ─────────────────────────────────────────
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    engineer: 'Priya Patel',
    siteAddress: '',
    scheduledDate: '',
    size: '',
    notes: ''
  });

  const { logCreate, logDelete } = useAuditLog('Survey');
  const { can } = usePermissions();

  // ── Mock Data ─────────────────────────────────────────────────
  useEffect(() => {
    const mockSurveys = [
      {
        id: 'SYY-JNK-ZYMP-ZGP',
        customerName: 'abdgf rtgy',
        site: 'Surat',
        estimatedKw: null,
        engineer: 'Unassigned',
        scheduledDate: '2025-03-11',
        status: 'pending',
        createdAt: '2025-03-11'
      },
      {
        id: 'SYY-JNK-SY8C28-L82',
        customerName: 'Adipisicing sint asp Aut A commodi velit',
        site: 'Mumbai',
        estimatedKw: null,
        engineer: 'Unassigned',
        scheduledDate: '2025-03-10',
        status: 'completed',
        createdAt: '2025-03-10'
      },
      {
        id: 'SYY-JNK-SY8XCEL-79Y',
        customerName: 'Distinctio Nulla it',
        site: 'Bangalore',
        estimatedKw: null,
        engineer: 'Unassigned',
        scheduledDate: '2025-03-09',
        status: 'completed',
        createdAt: '2025-03-09'
      }
    ];
    setSurveys(mockSurveys);
    setLoading(false);
  }, []);

  // ── Stats ────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: surveys.length,
    pending: surveys.filter(s => s.status === 'pending').length,
    active: surveys.filter(s => s.status === 'active').length,
    completed: surveys.filter(s => s.status === 'completed').length
  }), [surveys]);

  // ── Filtered Surveys ─────────────────────────────────────────
  const filteredSurveys = useMemo(() => {
    let filtered = surveys;
    if (activeTab !== 'all') {
      filtered = filtered.filter(s => s.status === activeTab);
    }
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(s => 
        s.customerName?.toLowerCase().includes(searchLower) ||
        s.site?.toLowerCase().includes(searchLower) ||
        s.id?.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [surveys, activeTab, search]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleAddSurvey = () => {
    if (!can('survey', 'create')) {
      toast.error('Permission denied');
      return;
    }
    setIsScheduling(true);
    
    const newSurvey = {
      id: `SYY-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      customerName: formData.customerName,
      site: formData.siteAddress || 'Not specified',
      estimatedKw: formData.size ? parseInt(formData.size) : null,
      engineer: formData.engineer,
      scheduledDate: formData.scheduledDate,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    setSurveys(prev => [newSurvey, ...prev]);
    logCreate({ id: newSurvey.id, name: formData.customerName });
    toast.success('Survey scheduled successfully');
    
    setShowAddModal(false);
    setFormData({
      customerName: '',
      engineer: 'Priya Patel',
      siteAddress: '',
      scheduledDate: '',
      size: '',
      notes: ''
    });
    setIsScheduling(false);
  };

  const handleDelete = (survey) => {
    if (!can('survey', 'delete')) {
      toast.error('Permission denied');
      return;
    }
    if (window.confirm(`Delete survey for ${survey.customerName}?`)) {
      setSurveys(prev => prev.filter(s => s.id !== survey.id));
      logDelete({ id: survey.id, name: survey.customerName });
      toast.success('Survey deleted');
    }
  };

  const handleStartSurvey = (survey) => {
    setSurveys(prev => prev.map(s => 
      s.id === survey.id ? { ...s, status: 'active' } : s
    ));
    toast.success('Survey started');
  };

  // ── Components ───────────────────────────────────────────────
  const StatusBadge = ({ status }) => {
    const styles = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      active: 'bg-blue-50 text-blue-700 border-blue-200',
      completed: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20'
    };
    const labels = { pending: 'Pending', active: 'Active', completed: 'Completed' };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const SummaryCard = ({ title, value, icon: Icon, color }) => {
    const colorMap = {
      'bg-blue-500': { variant: 'blue', tag: 'Surveys' },
      'bg-amber-500': { variant: 'amber', tag: 'Pending' },
      'bg-[var(--green)]/100': { variant: 'emerald', tag: 'Active' },
      'bg-purple-500': { variant: 'purple', tag: 'Completed' },
    };
    const config = colorMap[color] || { variant: 'blue', tag: 'Status' };
    
    return (
      <KPICard
        label={title}
        value={value}
        icon={Icon}
        variant={config.variant}
        tags={[config.tag]}
      />
    );
  };

  const TabButton = ({ id, label, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        activeTab === id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-base)]'
      }`}
    >
      {label}
      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === id ? 'bg-[var(--bg-surface)]/20' : 'bg-[var(--bg-elevated)]'}`}>
        {count}
      </span>
    </button>
  );

  // ── Views ───────────────────────────────────────────────────
  const TableView = () => (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-base)] overflow-hidden">
      <table className="w-full">
        <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Client Name</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Location</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Capacity</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Engineer</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Survey ID</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Date</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredSurveys.length === 0 ? (
            <tr><td colSpan={8} className="px-6 py-12 text-center text-[var(--text-muted)]">No surveys found</td></tr>
          ) : filteredSurveys.map((survey) => (
            <tr key={survey.id} className="hover:bg-[var(--bg-elevated)]">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                    {survey.customerName?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-[var(--text-primary)]">{survey.customerName}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-[var(--text-secondary)]"><MapPin size={14} className="inline mr-1"/>{survey.site}</td>
              <td className="px-6 py-4 text-[var(--text-secondary)]">{survey.estimatedKw ? `${survey.estimatedKw} kW` : 'To be determined'}</td>
              <td className="px-6 py-4 text-[var(--text-secondary)]">{survey.engineer}</td>
              <td className="px-6 py-4 text-[var(--text-muted)] text-sm">{survey.id}</td>
              <td className="px-6 py-4 text-[var(--text-secondary)]">{survey.scheduledDate ? format(new Date(survey.scheduledDate), 'dd MMM') : '-'}</td>
              <td className="px-6 py-4"><StatusBadge status={survey.status} /></td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedSurvey(survey)} className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]" title="View">
                    <Eye size={16} />
                  </button>
                  {survey.status === 'pending' && (
                    <button onClick={() => handleStartSurvey(survey)} className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white" title="Start Survey">
                      <Play size={14} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(survey)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const ListView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredSurveys.map((survey) => (
        <div key={survey.id} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-base)] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-semibold">
                {survey.customerName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{survey.customerName}</h3>
                <p className="text-sm text-[var(--text-muted)] flex items-center gap-1"><MapPin size={12} />{survey.site}</p>
              </div>
            </div>
            <StatusBadge status={survey.status} />
          </div>
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Capacity</span><span className="text-[var(--text-secondary)]">{survey.estimatedKw ? `${survey.estimatedKw} kW` : 'To be determined'}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Engineer</span><span className="text-[var(--text-secondary)]">{survey.engineer}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Survey ID</span><span className="text-[var(--text-muted)] text-xs">{survey.id}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Date</span><span className="text-[var(--text-secondary)]">{survey.scheduledDate ? format(new Date(survey.scheduledDate), 'dd MMM yyyy') : '-'}</span></div>
          </div>
          <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-base)]">
            <button onClick={() => setSelectedSurvey(survey)} className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-base)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] text-sm font-medium">
              <Eye size={14} className="inline mr-1" />View
            </button>
            {survey.status === 'pending' && (
              <button onClick={() => handleStartSurvey(survey)} className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium">
                <Play size={14} className="inline mr-1" />Start
              </button>
            )}
            <button onClick={() => handleDelete(survey)} className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="p-6 bg-[var(--bg-elevated)] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Site Survey Management</h1>
        <p className="text-[var(--text-muted)] mt-1">Manage site surveys from lead to completion</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total Surveys" value={stats.total} icon={MapPin} color="bg-blue-500" />
        <SummaryCard title="Pending" value={stats.pending} icon={Clock} color="bg-amber-500" />
        <SummaryCard title="Active" value={stats.active} icon={Zap} color="bg-[var(--green)]/100" />
        <SummaryCard title="Completed" value={stats.completed} icon={CheckCircle} color="bg-purple-500" />
      </div>

      {/* Tabs, Search, View Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <TabButton id="all" label="All Surveys" count={stats.total} />
          <TabButton id="pending" label="Pending" count={stats.pending} />
          <TabButton id="active" label="Active" count={stats.active} />
          <TabButton id="completed" label="Complete" count={stats.completed} />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <Input placeholder="Search by client name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-64" />
          </div>
          <div className="flex items-center bg-[var(--bg-surface)] rounded-lg border border-[var(--border-base)] p-1">
            <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}>
              <List size={16} className="inline mr-1" />Table
            </button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}>
              <LayoutGrid size={16} className="inline mr-1" />List
            </button>
          </div>
          <Button onClick={() => setShowAddModal(true)}><Plus size={18} className="mr-1" />New Survey</Button>
        </div>
      </div>

      {/* Content */}
      {loading ? <div className="text-center py-12 text-[var(--text-muted)]">Loading...</div> : viewMode === 'table' ? <TableView /> : <ListView />}

      {/* Add Survey Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Schedule New Survey" footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button onClick={handleAddSurvey} disabled={!formData.customerName || isScheduling}>
            {isScheduling ? 'Scheduling...' : 'Schedule Survey'}
          </Button>
        </div>
      }>
        <div className="space-y-4">
          <FormField label="Customer Name *">
            <Input value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} placeholder="Enter customer name" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Assigned Engineer">
              <Select value={formData.engineer} onChange={(e) => setFormData({ ...formData, engineer: e.target.value })}>
                <option>Priya Patel</option><option>Rahul Sharma</option><option>Amit Kumar</option><option>Sneha Reddy</option>
              </Select>
            </FormField>
            <FormField label="Est. Size (kW)">
              <Input type="number" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} placeholder="50" />
            </FormField>
          </div>
          <FormField label="Site Address">
            <Input value={formData.siteAddress} onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })} placeholder="Enter site address" />
          </FormField>
          <FormField label="Scheduled Date">
            <Input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} />
          </FormField>
          <FormField label="Notes">
            <Textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." />
          </FormField>
        </div>
      </Modal>

      {/* View Survey Modal */}
      <Modal open={!!selectedSurvey} onClose={() => setSelectedSurvey(null)} title="Survey Details" footer={<div className="flex justify-end"><Button onClick={() => setSelectedSurvey(null)}>Close</Button></div>}>
        {selectedSurvey && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 rounded-xl bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
                {selectedSurvey.customerName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{selectedSurvey.customerName}</h3>
                <p className="text-[var(--text-muted)]">{selectedSurvey.site}</p>
              </div>
              <StatusBadge status={selectedSurvey.status} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-[var(--bg-elevated)] rounded-lg"><span className="text-xs text-[var(--text-muted)]">Survey ID</span><p className="font-medium">{selectedSurvey.id}</p></div>
              <div className="p-3 bg-[var(--bg-elevated)] rounded-lg"><span className="text-xs text-[var(--text-muted)]">Engineer</span><p className="font-medium">{selectedSurvey.engineer}</p></div>
              <div className="p-3 bg-[var(--bg-elevated)] rounded-lg"><span className="text-xs text-[var(--text-muted)]">Capacity</span><p className="font-medium">{selectedSurvey.estimatedKw || 'TBD'} kW</p></div>
              <div className="p-3 bg-[var(--bg-elevated)] rounded-lg"><span className="text-xs text-[var(--text-muted)]">Date</span><p className="font-medium">{selectedSurvey.scheduledDate ? format(new Date(selectedSurvey.scheduledDate), 'dd MMM yyyy') : 'Not scheduled'}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SurveyPage;

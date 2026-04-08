import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowDown, 
  ArrowUp, 
  Lock, 
  Unlock, 
  ArrowRightLeft, 
  Truck, 
  PackageX, 
  Settings,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Search,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../../lib/apiClient';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';

const TENANT_ID = 'solarcorp';

const MOVEMENT_TYPES = {
  PURCHASE: { label: 'Purchase', color: 'green', icon: ArrowDown, bgColor: 'bg-green-500/10', textColor: 'text-green-600' },
  RESERVE: { label: 'Reserve', color: 'blue', icon: Lock, bgColor: 'bg-blue-500/10', textColor: 'text-blue-600' },
  RELEASE: { label: 'Release', color: 'cyan', icon: Unlock, bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-600' },
  TRANSFER: { label: 'Transfer', color: 'purple', icon: ArrowRightLeft, bgColor: 'bg-purple-500/10', textColor: 'text-purple-600' },
  DISPATCH: { label: 'Dispatch', color: 'orange', icon: Truck, bgColor: 'bg-orange-500/10', textColor: 'text-orange-600' },
  CONSUME: { label: 'Consume', color: 'red', icon: PackageX, bgColor: 'bg-red-500/10', textColor: 'text-red-600' },
  ADJUSTMENT: { label: 'Adjustment', color: 'gray', icon: Settings, bgColor: 'bg-gray-500/10', textColor: 'text-gray-600' },
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const MovementTypeBadge = ({ type }) => {
  const config = MOVEMENT_TYPES[type] || MOVEMENT_TYPES.ADJUSTMENT;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

const StockMovements = () => {
  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterReference, setFilterReference] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState({ byType: [], topItems: [] });
  const [showStatsCards, setShowStatsCards] = useState(true);

    const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = { 
        page, 
        limit,
        tenantId: TENANT_ID 
      };
      if (filterType) params.type = filterType;
      if (filterItem) params.itemId = filterItem;
      if (filterWarehouse) params.warehouseId = filterWarehouse;
      if (filterReference) params.reference = filterReference;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Try fetching from the unified endpoint
      let response;
      try {
        response = await api.get('/inventory/stock-movements', params);
      } catch (e) {
        console.error('Failed to fetch stock movements:', e);
        throw e;
      }
      
      const data = response?.data ?? response;
      console.log('[StockMovements] API response:', data);
      
      let movementsData = [];
      if (Array.isArray(data)) {
        movementsData = data;
      } else if (data && Array.isArray(data.data)) {
        movementsData = data.data;
      } else if (data && Array.isArray(data.results)) {
        movementsData = data.results;
      } else if (data && typeof data === 'object') {
        const possibleArrays = Object.values(data).filter(Array.isArray);
        if (possibleArrays.length > 0) {
          movementsData = possibleArrays[0];
        }
      }
      
      setMovements(movementsData);
      setTotal(data?.total || movementsData.length || 0);
    } catch (err) {
      console.error('Failed to fetch stock movements:', err);
      setError(err.message);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

    const fetchStats = async () => {
    try {
      const response = await api.get('/inventory/stock-movements/stats', {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        tenantId: TENANT_ID,
      });
      const data = response?.data ?? response;
      console.log('[StockMovements] Stats API response:', data);
      setStats(data || { byType: [], topItems: [] });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [page]);

  useEffect(() => {
    setPage(1);
    fetchMovements();
  }, [filterType, filterItem, filterWarehouse, filterReference, startDate, endDate]);

  useEffect(() => {
    fetchItems();
    fetchProjects();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items', { tenantId: TENANT_ID });
      const data = response?.data ?? response;
      const itemsArray = Array.isArray(data) ? data : (data.data || []);
      setItems(itemsArray);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects', { tenantId: TENANT_ID });
      const data = response?.data ?? response;
      const projectsArray = Array.isArray(data) ? data : (data.data || []);
      setProjects(projectsArray);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const totalPages = Math.ceil(total / limit);

  // Create lookup maps for items and projects
  const itemMap = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      // Map by both _id and itemId for flexibility
      if (item._id) map.set(item._id.toString(), item);
      if (item.id) map.set(item.id.toString(), item);
      if (item.itemId) map.set(item.itemId, item);
    });
    return map;
  }, [items]);

  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach(project => {
      if (project.projectId) map.set(project.projectId, project);
      if (project._id) map.set(project._id.toString(), project);
      if (project.id) map.set(project.id.toString(), project);
    });
    return map;
  }, [projects]);

  // Helper to get item details
  const getItemDetails = (row) => {
    // Try to find by itemId first (which might be MongoDB ID or INV ID)
    let item = itemMap.get(row.itemId?.toString());
    
    // If not found and itemId looks like MongoDB ID, try other fields
    if (!item && row.itemId) {
      const itemIdStr = row.itemId.toString();
      // Check if any item has this as _id or id
      item = items.find(i => i._id?.toString() === itemIdStr || i.id?.toString() === itemIdStr);
    }
    
    return {
      itemId: item?.itemId || row.itemId || '-',
      name: item?.description || item?.name || row.itemDescription || '-'
    };
  };

  // Helper to get project details
  const getProjectDetails = (row) => {
    if (row.referenceType !== 'PROJECT' || !row.reference) return null;
    
    const project = projectMap.get(row.reference);
    return {
      projectId: row.reference,
      projectName: project?.customerName || project?.name || row.customerName || null
    };
  };

  const columns = [
    { 
      key: 'createdAt', 
      header: 'Date', 
      sortable: true,
      render: (v) => <span className="text-xs text-[var(--text-secondary)]">{formatDate(v)}</span>
    },
    { 
      key: 'itemDescription', 
      header: 'Item', 
      sortable: true,
      render: (v, row) => {
        const item = getItemDetails(row);
        return (
          <div className="flex flex-col">
            <span className="text-xs font-mono text-[var(--accent-light)]">{item.itemId}</span>
            <span className="text-[10px] font-medium text-[var(--text-primary)]">{item.name}</span>
          </div>
        );
      }
    },
    { 
      key: 'warehouseName', 
      header: 'Warehouse', 
      render: (v) => <span className="text-xs text-[var(--text-secondary)]">{v || '-'}</span>
    },
    { 
      key: 'type', 
      header: 'Movement Type', 
      sortable: true,
      render: (v) => <MovementTypeBadge type={v} />
    },
    { 
      key: 'quantity', 
      header: 'Quantity', 
      sortable: true,
      render: (v, row) => {
        const isNegative = ['RESERVE', 'DISPATCH', 'CONSUME'].includes(row.type);
        const colorClass = isNegative ? 'text-red-500' : 'text-green-500';
        const sign = isNegative ? '-' : '+';
        return (
          <span className={`text-xs font-bold ${colorClass}`}>
            {sign}{v}
          </span>
        );
      }
    },
    { 
      key: 'reference', 
      header: 'Reference', 
      render: (v, row) => {
        const project = getProjectDetails(row);
        return (
          <div className="flex flex-col">
            <span className="text-xs text-[var(--text-secondary)]">{v || '-'}</span>
            {project?.projectName ? (
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                {project.projectName}
              </span>
            ) : (
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                {row.referenceType === 'PROJECT' ? 'Project' : (row.referenceType || '-')}
              </span>
            )}
          </div>
        );
      }
    },
    { 
      key: 'note', 
      header: 'Note', 
      render: (v) => <span className="text-xs text-[var(--text-muted)] truncate max-w-[150px]" title={v}>{v || '-'}</span>
    },
  ];

  const exportToCSV = () => {
    if (!movements.length) {
      alert('No data to export');
      return;
    }
    
    const headers = ['Date', 'Item', 'Warehouse', 'Type', 'Quantity', 'Reference', 'Note'];
    const rows = movements.map(m => [
      formatDate(m.createdAt),
      m.itemDescription,
      m.warehouseName || '-',
      m.type,
      m.quantity,
      m.reference || '-',
      m.note || '-'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock-movements-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setFilterType('');
    setFilterItem('');
    setFilterWarehouse('');
    setFilterReference('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header with Show/Hide Cards button */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowStatsCards(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border bg-white border-gray-200 text-gray-700 shadow-sm hover:shadow-md"
          title={showStatsCards ? 'Hide Cards' : 'Show Cards'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
          {showStatsCards ? 'Hide Cards' : 'Show Cards'}
        </button>
      </div>

      {/* Stats Cards - Responsive grid */}
      {showStatsCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { type: 'PURCHASE', label: 'Purchase', color: 'blue', icon: ArrowDown, gradient: 'from-blue-100 to-sky-200', border: 'border-blue-200', iconBg: 'bg-blue-200', text: 'text-blue-700' },
            { type: 'RESERVE', label: 'Reserve', color: 'indigo', icon: Lock, gradient: 'from-indigo-100 to-purple-200', border: 'border-indigo-200', iconBg: 'bg-indigo-200', text: 'text-indigo-700' },
            { type: 'RELEASE', label: 'PROJECT RETURNED (RELEASE)', color: 'cyan', icon: Unlock, gradient: 'from-cyan-100 to-teal-200', border: 'border-cyan-200', iconBg: 'bg-cyan-200', text: 'text-cyan-700' },
            { type: 'TRANSFER', label: 'Transfer', color: 'violet', icon: ArrowRightLeft, gradient: 'from-violet-100 to-purple-200', border: 'border-violet-200', iconBg: 'bg-violet-200', text: 'text-violet-700' },
          ].map(({ type, label, icon: Icon, color, gradient, border, iconBg, text }) => {
            const stat = stats.byType?.find(s => s._id === type);
            const count = stat?.count || 0;
            const isActive = filterType === type;
            return (
              <div 
                key={type} 
                onClick={() => setFilterType(isActive ? '' : type)}
                className={`relative overflow-hidden bg-gradient-to-br ${gradient} border ${border} rounded-xl p-4 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${isActive ? 'ring-2 ring-offset-2 ring-' + color + '-400' : ''}`}
              >
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-bold ${text} uppercase tracking-wider`}>{label}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{count}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon size={20} className={text} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters - Single Row */}
      <div className="glass-card p-3">
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
          <Filter size={14} className="text-[var(--text-muted)] flex-shrink-0" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg w-28 flex-shrink-0"
          >
            <option value="">All Types</option>
            {Object.entries(MOVEMENT_TYPES)
              .filter(([type]) => !['DISPATCH', 'CONSUME', 'ADJUSTMENT'].includes(type))
              .map(([type, config]) => (
                <option key={type} value={type}>{config.label}</option>
              ))}
          </select>
          <input
            type="text"
            placeholder="Warehouse..."
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
            className="px-2 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg w-24 flex-shrink-0"
          />
          <input
            type="text"
            placeholder="Reference..."
            value={filterReference}
            onChange={(e) => setFilterReference(e.target.value)}
            className="px-2 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg w-24 flex-shrink-0"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg w-28 flex-shrink-0"
          />
          <span className="text-xs text-[var(--text-muted)] flex-shrink-0">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg w-28 flex-shrink-0"
          />
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
            <button
              onClick={clearFilters}
              className="px-2 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Clear
            </button>
            <button
              onClick={fetchMovements}
              className="px-2 py-1.5 text-xs bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors flex items-center gap-1"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="px-2 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-1"
            >
              <Download size={12} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <DataTable
          columns={columns}
          data={movements}
          loading={loading}
          rowActions={[]}
          emptyText="No stock movements found"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-base)]">
            <div className="text-xs text-[var(--text-muted)]">
              Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-surface)] transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-[var(--text-secondary)]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-surface)] transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockMovements;

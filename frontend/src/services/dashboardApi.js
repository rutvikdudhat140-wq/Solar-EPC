// Dashboard API Service - Fully Dynamic with Fallback
import { api } from '../lib/apiClient';

const extractData = (res) => {
  if (!res) return {};
  return res?.data?.data !== undefined ? res.data.data : (res?.data || res || {});
};

const normalizeQuotationStats = (data = {}) => {
  const byStatus = data.byStatus || {};
  const draft = Number(data.draft ?? byStatus.draft ?? byStatus.Draft ?? 0);
  const sent = Number(data.sent ?? byStatus.sent ?? byStatus.Sent ?? 0);
  const approved = Number(data.approved ?? data.accepted ?? byStatus.accepted ?? byStatus.Accepted ?? byStatus.approved ?? byStatus.Approved ?? 0);
  const rejected = Number(data.rejected ?? byStatus.rejected ?? byStatus.Rejected ?? 0);
  const pending = Number(data.pending ?? (draft + sent));
  const total = Number(data.total ?? (draft + sent + approved + rejected));

  return {
    ...data,
    total,
    draft,
    sent,
    approved,
    accepted: approved,
    pending,
    rejected,
  };
};

const normalizeInventoryItemList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const normalizeLookupCategories = (data) => {
  const raw = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
  return raw.map((item) => item?.name || item?.code || item).filter(Boolean);
};

const buildInventoryByCategoryFromCategories = (categories = [], items = []) => {
  return categories
    .map((category) => {
      const categoryItems = items.filter((item) => item?.category === category);
      return {
        category,
        count: categoryItems.length,
        totalStock: categoryItems.reduce((sum, item) => sum + (Number(item?.stock) || 0), 0),
        totalAvailable: categoryItems.reduce((sum, item) => {
          const available = item?.available !== undefined && item?.available !== null
            ? Number(item.available) || 0
            : (Number(item?.stock) || 0) - (Number(item?.reserved) || 0);
          return sum + Math.max(available, 0);
        }, 0),
      };
    })
    .filter((item) => item.count > 0);
};

const buildInventoryByCategoryFromItems = (items = []) => {
  const grouped = items.reduce((acc, item) => {
    const category = item?.category || item?.name || 'Other';
    const available = item?.available !== undefined && item?.available !== null
      ? Number(item.available) || 0
      : (Number(item?.stock) || 0) - (Number(item?.reserved) || 0);

    if (!acc[category]) {
      acc[category] = { category, count: 0, totalStock: 0, totalAvailable: 0 };
    }

    acc[category].count += 1;
    acc[category].totalStock += Number(item?.stock) || 0;
    acc[category].totalAvailable += Math.max(available, 0);
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => (b.totalAvailable || b.totalStock || 0) - (a.totalAvailable || a.totalStock || 0));
};

const normalizeInventoryStats = (stats = {}, byCategory = [], inventoryItems = [], lookupCategories = []) => {
  const categoryCountData = buildInventoryByCategoryFromCategories(lookupCategories, inventoryItems);
  let normalizedByCategory = [];

  if (Array.isArray(byCategory) && byCategory.length > 0) {
    normalizedByCategory = byCategory;
  } else if (Array.isArray(stats.byCategory) && stats.byCategory.length > 0) {
    normalizedByCategory = stats.byCategory;
  } else if (categoryCountData.length > 0) {
    normalizedByCategory = categoryCountData;
  } else {
    normalizedByCategory = buildInventoryByCategoryFromItems(inventoryItems);
  }

  return {
    ...stats,
    byCategory: normalizedByCategory,
    categoryGraph: categoryCountData.length > 0 ? categoryCountData : normalizedByCategory,
    categories: lookupCategories,
    items: inventoryItems,
    total: stats.totalAvailableStock || stats.totalStock || stats.totalItems || stats.total || 0,
  };
};

const normalizeInstallationStats = (data = {}) => ({
  ...data,
  total: Number(data.total ?? data.totalInstallations ?? 0),
  inProgress: Number(data.inProgress ?? data.active ?? 0),
  active: Number(data.active ?? data.inProgress ?? 0),
  completed: Number(data.completed ?? data.finished ?? 0),
  pending: Number(data.pending ?? data.unassigned ?? 0),
  unassigned: Number(data.unassigned ?? data.pending ?? 0),
});

const normalizeFinanceStats = (data = {}) => ({
  ...data,
  totalRevenue: Number(data.totalRevenue ?? data.totalValue ?? data.revenue ?? 0),
  totalValue: Number(data.totalValue ?? data.totalRevenue ?? data.revenue ?? 0),
});

const normalizeEmployeeStats = (data = {}) => ({
  ...data,
  total: Number(data.total ?? data.totalEmployees ?? data.count ?? 0),
  totalEmployees: Number(data.totalEmployees ?? data.total ?? data.count ?? 0),
});

const normalizeTasksStats = (data = {}) => ({
  ...data,
  total: Number(data.total ?? data.totalTasks ?? data.count ?? 0),
});

const normalizeProjectsStats = (data = {}) => ({
  ...data,
  total: Number(data.total ?? data.totalProjects ?? 0),
  totalProjects: Number(data.totalProjects ?? data.total ?? 0),
});

const mergeLiveModuleData = async (seed = {}) => {
  const [
    widgetRes,
    projectsRes,
    inventoryRes,
    inventoryListRes,
    inventoryCategoriesRes,
    leadsRes,
    financeRes,
    surveysRes,
    commissioningRes,
    serviceRes,
    installationRes,
    quotationRes,
    procurementRes,
    employeesRes,
    tasksRes,
  ] = await Promise.all([
    api.get('/dashboard/widget').catch(() => null),
    api.get('/projects/stats').catch(() => null),
    api.get('/dashboard/inventory-stats')
      .catch(() => api.get('/inventory/stats'))
      .catch(() => null),
    api.get('/inventory').catch(() => null),
    api.get('/lookups/categories').catch(() => null),
    api.get('/leads/stats').catch(() => null),
    api.get('/finance/dashboard-stats').catch(() => null),
    api.get('/site-surveys/stats').catch(() => null),
    api.get('/commissionings/stats').catch(() => null),
    api.get('/dashboard/service-stats')
      .catch(() => api.get('/service-amc/stats'))
      .catch(() => null),
    api.get('/installations/stats').catch(() => null),
    api.get('/documents/estimates-proposals-quotations/stats').catch(() => null),
    api.get('/procurement/stats').catch(() => null),
    api.get('/hrm/employees/stats').catch(() => null),
    api.get('/tasks/stats/overview').catch(() => null),
  ]);

  const widgetData = extractData(widgetRes);
  const inventoryItems = normalizeInventoryItemList(extractData(inventoryListRes));
  const inventoryCategories = normalizeLookupCategories(extractData(inventoryCategoriesRes));
  const inventoryModuleStats = extractData(inventoryRes);
  const inventoryByCategoryData =
    Array.isArray(inventoryModuleStats?.byCategory) ? inventoryModuleStats.byCategory : [];

  return {
    ...widgetData,
    ...seed,
    projects: { ...(widgetData.projects || {}), ...(seed.projects || {}), ...normalizeProjectsStats(extractData(projectsRes)) },
    inventory: {
      ...(widgetData.inventory || {}),
      ...(seed.inventory || {}),
      ...normalizeInventoryStats(
        inventoryModuleStats,
        inventoryByCategoryData,
        inventoryItems,
        inventoryCategories
      ),
    },
    leads: { ...(widgetData.leads || {}), ...(seed.leads || {}), ...extractData(leadsRes) },
    finance: { ...(widgetData.finance || {}), ...(seed.finance || {}), ...normalizeFinanceStats(extractData(financeRes)) },
    surveys: { ...(widgetData.surveys || {}), ...(seed.surveys || {}), ...extractData(surveysRes) },
    commissioning: { ...(widgetData.commissioning || {}), ...(seed.commissioning || {}), ...extractData(commissioningRes) },
    service: { ...(widgetData.service || {}), ...(seed.service || {}), ...extractData(serviceRes) },
    installation: { ...(widgetData.installation || {}), ...(seed.installation || {}), ...normalizeInstallationStats(extractData(installationRes)) },
    quotation: { ...(widgetData.quotation || {}), ...(seed.quotation || {}), ...normalizeQuotationStats(extractData(quotationRes)) },
    procurement: { ...(widgetData.procurement || {}), ...(seed.procurement || {}), ...extractData(procurementRes) },
    employees: { ...(widgetData.employees || {}), ...(seed.employees || {}), ...normalizeEmployeeStats(extractData(employeesRes)) },
    tasks: { ...(widgetData.tasks || {}), ...(seed.tasks || {}), ...normalizeTasksStats(extractData(tasksRes)) },
    estimates: widgetData.estimates || seed.estimates || { total: 0, pending: 0, approved: 0 },
    logistics: widgetData.logistics || seed.logistics || { total: 0, inTransit: 0, delivered: 0 },
    compliance: widgetData.compliance || seed.compliance || { total: 0, pending: 0, compliant: 0 },
    documents: widgetData.documents || seed.documents || { total: 0, pending: 0, approved: 0 },
  };
};

const DashboardService = {
  getWidgetData: async () => {
    try {
      return await mergeLiveModuleData();
    } catch (error) {
      console.error('[Dashboard API] Live dashboard fetch failed:', error);
      return {};
    }
  },

  getWidgetDataFallback: async () => {
    try {
      return await mergeLiveModuleData();
    } catch (error) {
      console.error('[Dashboard API] Fallback error:', error);
      return {};
    }
  },

  // Overview stats
  getOverviewStats: async () => {
    try {
      const response = await api.get('/dashboard/overview');
      return response?.data?.data || {};
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      return {};
    }
  },

  // Recent activities from backend
  getRecentActivities: async (limit = 10) => {
    try {
      const response = await api.get(`/dashboard/activities?limit=${limit}`);
      return response?.data?.data || [];
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  },

  // Finance data with trends
  getFinanceTrends: async () => {
    try {
      const response = await api.get('/dashboard/finance');
      return response?.data?.data || {};
    } catch (error) {
      console.error('Error fetching finance trends:', error);
      return {};
    }
  },

  // Sales pipeline data
  getSalesPipeline: async () => {
    try {
      const response = await api.get('/dashboard/sales');
      return response?.data?.data || {};
    } catch (error) {
      console.error('Error fetching sales pipeline:', error);
      return {};
    }
  },

  // Team performance
  getTeamPerformance: async () => {
    try {
      const response = await api.get('/dashboard/team');
      return response?.data?.data || {};
    } catch (error) {
      console.error('Error fetching team performance:', error);
      return {};
    }
  },

  // Project metrics
  getProjectMetrics: async () => {
    try {
      const response = await api.get('/dashboard/projects');
      return response?.data?.data || {};
    } catch (error) {
      console.error('Error fetching project metrics:', error);
      return {};
    }
  },

  // Inventory alerts
  getInventoryAlerts: async () => {
    try {
      const response = await api.get('/dashboard/inventory');
      return response?.data?.data || {};
    } catch (error) {
      console.error('Error fetching inventory alerts:', error);
      return {};
    }
  },

  // Intelligent insights
  getInsights: async () => {
    try {
      const response = await api.get('/dashboard/insights');
      return response?.data?.data || [];
    } catch (error) {
      console.error('Error fetching insights:', error);
      return [];
    }
  },

  // All dashboard data at once
  getAllDashboardData: async () => {
    try {
      const response = await api.get('/dashboard/all');
      return response?.data?.data || {};
    } catch (error) {
      console.error('Error fetching all dashboard data:', error);
      return {};
    }
  },

  // Refresh dashboard cache
  refreshDashboard: async () => {
    try {
      const response = await api.get('/dashboard/refresh');
      return response?.data || {};
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      return {};
    }
  },

  // Legacy support - Individual module stats (fallback)
  getModuleStats: async (module) => {
    try {
      const endpoints = {
        projects: '/projects/stats',
        inventory: '/inventory/stats',
        leads: '/leads/stats',
        finance: '/finance/dashboard-stats',
        surveys: '/site-surveys/stats',
        commissioning: '/commissionings/stats',
        service: '/service-amc/stats',
        installation: '/installations/stats',
        quotation: '/documents/estimates-proposals-quotations/stats',
        estimates: '/estimates/stats',
        procurement: '/procurement/stats',
        hrm: '/hrm/stats',
      };
      
      const response = await api.get(endpoints[module] || `/dashboard/widget`);
      return response?.data?.data || response?.data || {};
    } catch (error) {
      console.error(`Error fetching ${module} stats:`, error);
      return {};
    }
  },

  // Project Stats
  getProjectStats: async () => {
    try {
      const [stats, byStage] = await Promise.all([
        api.get('/projects/stats'),
        api.get('/projects/by-stage'),
      ]);
      return { stats: stats?.data?.data || stats?.data || stats, byStage: byStage?.data?.data || byStage?.data || byStage };
    } catch (error) {
      console.error('Error fetching project stats:', error);
      return null;
    }
  },

  // Inventory Stats
  getInventoryStats: async () => {
    try {
      const [stats, inventoryList, categories] = await Promise.all([
        api.get('/dashboard/inventory-stats').catch(() => api.get('/inventory/stats')),
        api.get('/inventory').catch(() => null),
        api.get('/lookups/categories').catch(() => null),
      ]);
      const statsData = extractData(stats);
      const byCategoryData = Array.isArray(statsData?.byCategory) ? statsData.byCategory : [];
      const inventoryItems = normalizeInventoryItemList(extractData(inventoryList));
      const lookupCategories = normalizeLookupCategories(extractData(categories));
      const normalizedInventory = normalizeInventoryStats(statsData, byCategoryData, inventoryItems, lookupCategories);
      return {
        stats: normalizedInventory,
        byCategory: normalizedInventory.byCategory,
        categoryGraph: normalizedInventory.categoryGraph,
        items: inventoryItems,
        categories: lookupCategories,
      };
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      return null;
    }
  },

  getServiceStats: async () => {
    try {
      const response = await api.get('/dashboard/service-stats').catch(() => api.get('/service-amc/stats'));
      return extractData(response);
    } catch (error) {
      console.error('Error fetching service stats:', error);
      return null;
    }
  },

  getDashboardMetrics: async () => {
    try {
      const response = await api.get('/dashboard/metrics');
      return extractData(response);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return {};
    }
  },

  // CRM/Leads Stats
  getCRMStats: async () => {
    try {
      const response = await api.get('/leads/stats');
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error fetching CRM stats:', error);
      return null;
    }
  },

  // Finance Stats
  getFinanceStats: async () => {
    try {
      const response = await api.get('/finance/stats');
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error fetching finance stats:', error);
      return null;
    }
  },

  // HRM Stats
  getHRMStats: async () => {
    try {
      const response = await api.get('/hrm/stats');
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error fetching HRM stats:', error);
      return null;
    }
  },

  // Survey Stats
  getSurveyStats: async () => {
    try {
      const response = await api.get('/site-surveys/stats');
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error fetching survey stats:', error);
      return null;
    }
  },

  // Installation Stats
  getInstallationStats: async () => {
    try {
      const response = await api.get('/installations/stats');
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error fetching installation stats:', error);
      return null;
    }
  },

  // Commissioning Stats
  getCommissioningStats: async () => {
    try {
      const response = await api.get('/commissionings/stats');
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error fetching commissioning stats:', error);
      return null;
    }
  },

  // Quotation Stats
  getQuotationStats: async () => {
    try {
      const response = await api.get('/documents/estimates-proposals-quotations/stats');
      return normalizeQuotationStats(response?.data?.data || response?.data || response);
    } catch (error) {
      console.error('Error fetching quotation stats:', error);
      return null;
    }
  },

  // Procurement Stats
  getProcurementStats: async () => {
    try {
      const response = await api.get('/procurement/stats');
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error fetching procurement stats:', error);
      return null;
    }
  },

  // Tasks Stats
  getTasksStats: async () => {
    try {
      const response = await api.get('/tasks/stats/overview');
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error fetching tasks stats:', error);
      return null;
    }
  },
};

export default DashboardService;

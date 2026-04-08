// Dashboard API Service - Fully Dynamic with Fallback
import { api } from '../lib/apiClient';

const DashboardService = {
  // Main widget data - try backend aggregated endpoint first, fallback to individual calls
  getWidgetData: async () => {
    try {
      // Try the aggregated widget endpoint
      const response = await api.get('/dashboard/widget');
      console.log('[Dashboard API] Widget response:', response?.data);
      
      const data = response?.data?.data;
      
      // Check if we got valid data, otherwise use fallback
      if (data && (data.leads?.total !== undefined || data.projects?.total !== undefined)) {
        return data;
      }
      
      // Fallback: fetch from individual endpoints
      console.log('[Dashboard API] Widget empty, using fallback...');
      return await DashboardService.getWidgetDataFallback();
    } catch (error) {
      console.log('[Dashboard API] Widget failed, using fallback:', error.message);
      return await DashboardService.getWidgetDataFallback();
    }
  },

  // Fallback: fetch from individual module endpoints
  getWidgetDataFallback: async () => {
    try {
      const [projectsRes, inventoryRes, leadsRes, financeRes, surveysRes, commissioningRes, serviceRes, installationRes, quotationRes, procurementRes, employeesRes] = await Promise.all([
        api.get('/projects/stats').catch(() => null),
        api.get('/inventory/stats').catch(() => null),
        api.get('/leads/stats').catch(() => null),
        api.get('/finance/dashboard-stats').catch(() => null),
        api.get('/surveys/stats').catch(() => null),
        api.get('/commissioning/stats').catch(() => null),
        api.get('/service-amc/stats').catch(() => null),
        api.get('/installation/stats').catch(() => null),
        api.get('/quotation/stats').catch(() => null),
        api.get('/procurement/stats').catch(() => null),
        api.get('/hrm/employees/stats').catch(() => null),
      ]);

      const extractData = (res) => {
        if (!res) return {};
        const d = res?.data?.data !== undefined ? res.data.data : res.data;
        return d || {};
      };

      return {
        projects: extractData(projectsRes),
        inventory: extractData(inventoryRes),
        leads: extractData(leadsRes),
        finance: extractData(financeRes),
        surveys: extractData(surveysRes),
        commissioning: extractData(commissioningRes),
        service: extractData(serviceRes),
        installation: extractData(installationRes),
        quotation: extractData(quotationRes),
        procurement: extractData(procurementRes),
        employees: extractData(employeesRes),
        estimates: { total: 0, pending: 0, approved: 0 },
        logistics: { total: 0, inTransit: 0, delivered: 0 },
        compliance: { total: 0, pending: 0, compliant: 0 },
        documents: { total: 0, pending: 0, approved: 0 },
      };
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
        surveys: '/surveys/stats',
        commissioning: '/commissioning/stats',
        service: '/service-amc/stats',
        installation: '/installation/stats',
        quotation: '/quotation/stats',
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
      const [stats, byCategory] = await Promise.all([
        api.get('/inventory/stats'),
        api.get('/inventory/by-category'),
      ]);
      return { stats: stats?.data?.data || stats?.data || stats, byCategory: byCategory?.data?.data || byCategory?.data || byCategory };
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      return null;
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
      const response = await api.get('/surveys/stats');
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error fetching survey stats:', error);
      return null;
    }
  },

  // Installation Stats
  getInstallationStats: async () => {
    try {
      const response = await api.get('/installation/stats');
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error fetching installation stats:', error);
      return null;
    }
  },

  // Commissioning Stats
  getCommissioningStats: async () => {
    try {
      const response = await api.get('/commissioning/stats');
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error fetching commissioning stats:', error);
      return null;
    }
  },

  // Quotation Stats
  getQuotationStats: async () => {
    try {
      const response = await api.get('/quotation/stats');
      return response?.data?.data || response?.data || response;
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
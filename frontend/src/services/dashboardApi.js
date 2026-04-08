// Dashboard API Service - Fetches live data from all modules
import { api } from '../lib/apiClient';

// Get tenant ID from localStorage
const TENANT_ID = localStorage.getItem('tenantId') || 'solarcorp';

const DashboardService = {
  // Overview Stats
  getOverviewStats: async () => {
    try {
      const headers = { 'x-tenant-id': TENANT_ID };
      const [projects, inventory, leads, finance, hrm, surveys] = await Promise.allSettled([
        api.get('/projects/stats', { headers }),
        api.get('/inventory/stats', { headers }),
        api.get('/leads/stats', { headers }),
        api.get('/finance/stats', { headers }),
        api.get('/hrm/stats', { headers }),
        api.get('/surveys/stats', { headers }),
      ]);

      return {
        projects: projects.status === 'fulfilled' ? projects.value : null,
        inventory: inventory.status === 'fulfilled' ? inventory.value : null,
        leads: leads.status === 'fulfilled' ? leads.value : null,
        finance: finance.status === 'fulfilled' ? finance.value : null,
        hrm: hrm.status === 'fulfilled' ? hrm.value : null,
        surveys: surveys.status === 'fulfilled' ? surveys.value : null,
      };
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      return null;
    }
  },

  // Project Stats
  getProjectStats: async () => {
    try {
      const [stats, byStage] = await Promise.all([
        api.get('/projects/stats'),
        api.get('/projects/by-stage'),
      ]);
      return { stats, byStage };
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
      return { stats, byCategory };
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      return null;
    }
  },

  // CRM/Leads Stats
  getCRMStats: async () => {
    try {
      const response = await api.get('/leads/stats');
      return response;
    } catch (error) {
      console.error('Error fetching CRM stats:', error);
      return null;
    }
  },

  // Finance Stats
  getFinanceStats: async () => {
    try {
      const response = await api.get('/finance/stats');
      return response;
    } catch (error) {
      console.error('Error fetching finance stats:', error);
      return null;
    }
  },

  // HRM Stats
  getHRMStats: async () => {
    try {
      const response = await api.get('/hrm/stats');
      return response;
    } catch (error) {
      console.error('Error fetching HRM stats:', error);
      return null;
    }
  },

  // Survey Stats
  getSurveyStats: async () => {
    try {
      const response = await api.get('/surveys/stats');
      return response;
    } catch (error) {
      console.error('Error fetching survey stats:', error);
      return null;
    }
  },

  // Installation Stats
  getInstallationStats: async () => {
    try {
      const response = await api.get('/installation/stats');
      return response;
    } catch (error) {
      console.error('Error fetching installation stats:', error);
      return null;
    }
  },

  // Commissioning Stats
  getCommissioningStats: async () => {
    try {
      const response = await api.get('/commissioning/stats');
      return response;
    } catch (error) {
      console.error('Error fetching commissioning stats:', error);
      return null;
    }
  },

  // Service AMC Stats
  getServiceStats: async () => {
    try {
      const response = await api.get('/service-amc/stats');
      return response;
    } catch (error) {
      console.error('Error fetching service stats:', error);
      return null;
    }
  },

  // Compliance Stats
  getComplianceStats: async () => {
    try {
      const response = await api.get('/compliance/stats');
      return response;
    } catch (error) {
      console.error('Error fetching compliance stats:', error);
      return null;
    }
  },

  // Procurement Stats
  getProcurementStats: async () => {
    try {
      const response = await api.get('/procurement/stats');
      return response;
    } catch (error) {
      console.error('Error fetching procurement stats:', error);
      return null;
    }
  },

  // Logistics Stats
  getLogisticsStats: async () => {
    try {
      const response = await api.get('/logistics/stats');
      return response;
    } catch (error) {
      console.error('Error fetching logistics stats:', error);
      return null;
    }
  },

  // Recent Activity
  getRecentActivity: async () => {
    try {
      const [projects, quotations, installations, tickets] = await Promise.allSettled([
        api.get('/projects?limit=5'),
        api.get('/quotations?limit=5'),
        api.get('/installation?limit=5'),
        api.get('/service-amc/tickets?limit=5'),
      ]);

      return {
        recentProjects: projects.status === 'fulfilled' ? projects.value : [],
        recentQuotations: quotations.status === 'fulfilled' ? quotations.value : [],
        recentInstallations: installations.status === 'fulfilled' ? installations.value : [],
        recentTickets: tickets.status === 'fulfilled' ? tickets.value : [],
      };
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return null;
    }
  },

  // Dashboard Widget Data (aggregated from ALL modules)
  getWidgetData: async () => {
    try {
      const endpoints = [
        { name: 'projects', url: '/projects/stats' },
        { name: 'inventory', url: '/inventory/stats' },
        { name: 'leads', url: '/leads/stats' },
        { name: 'finance', url: '/finance/dashboard-stats' },  // Use dashboard-stats endpoint
        { name: 'surveys', url: '/surveys/stats' },
        { name: 'commissioning', url: '/commissioning/stats' },
        { name: 'service', url: '/service-amc/stats' },
        { name: 'employees', url: '/hrm/employees/stats' },
        { name: 'installation', url: '/installation/stats' },
        { name: 'quotation', url: '/quotation/stats' },
        { name: 'estimates', url: '/estimates/stats' },
        { name: 'procurement', url: '/procurement/stats' },
        { name: 'logistics', url: '/logistics/stats' },
        { name: 'compliance', url: '/compliance/stats' },
        { name: 'documents', url: '/document/stats' },
      ];

      console.log('[Dashboard] Fetching widget data from all modules with tenant:', TENANT_ID);
      
      const headers = { 'x-tenant-id': TENANT_ID };
      const results = await Promise.allSettled(
        endpoints.map(ep => api.get(ep.url, { headers }).catch(err => {
          console.error(`[Dashboard] API Error for ${ep.name}:`, err.message);
          return null;
        }))
      );

      const data = {};
      
      results.forEach((result, index) => {
        const endpoint = endpoints[index];
        if (result.status === 'fulfilled' && result.value) {
          // Extract data from various response formats
          const responseData = result.value?.data || result.value || {};
          data[endpoint.name] = responseData;
          console.log(`[Dashboard] ✅ ${endpoint.name}:`, responseData);
        } else {
          console.warn(`[Dashboard] ❌ Failed to fetch ${endpoint.name}:`, result.reason?.message || 'Unknown error');
          // Provide fallback data structure
          data[endpoint.name] = {};
        }
      });

      // Log summary
      const successful = Object.keys(data).filter(k => Object.keys(data[k]).length > 0).length;
      console.log(`[Dashboard] Summary: ${successful}/${endpoints.length} modules returned data`);

      return data;
    } catch (error) {
      console.error('Error fetching widget data:', error);
      return {};
    }
  },
};

export default DashboardService;

import apiClient from '../lib/apiClient';



export const settingsApi = {

  // ── Full Settings ─────────────────────────────────────────────────────────

  async getFullSettings() {

    try {

      const response = await apiClient.get('/settings');

      return response;

    } catch (error) {

      console.warn('Settings API failed, using defaults:', error.message);

      // Return default settings structure when API fails

      return {

        flags: {},

        rbac: {},

        workflows: [],

        auditLogs: [],

        customRoles: {},

        projectTypeConfigs: {}

      };

    }

  },



  async getMyPermissions() {

    try {

      return await apiClient.get('/settings/my-permissions');

    } catch (error) {

      console.warn('Failed to load my permissions:', error.message);

      return { data: { permissions: {} } };

    }

  },



  // ── Feature Flags ─────────────────────────────────────────────────────────

  async getFeatureFlags() {

    try {

      return await apiClient.get('/settings/flags');

    } catch (error) {

      return { data: {} };

    }

  },



  async updateFeatureFlag(moduleId, update) {

    try {

      return await apiClient.put(`/settings/flags/${moduleId}`, update);

    } catch (error) {

      console.warn('Failed to update feature flag:', error.message);

      return { success: false };

    }

  },



  async toggleModule(moduleId, enabled) {

    try {

      return await apiClient.post(`/settings/flags/${moduleId}/toggle`, { enabled });

    } catch (error) {

      console.warn('Failed to toggle module:', error.message);

      return { success: false };

    }

  },



  async toggleFeature(moduleId, featureId, enabled) {

    try {

      return await apiClient.post(`/settings/flags/${moduleId}/features/${featureId}`, { enabled });

    } catch (error) {

      console.warn('Failed to toggle feature:', error.message);

      return { success: false };

    }

  },



  async toggleAction(moduleId, actionId, enabled) {

    try {

      return await apiClient.post(`/settings/flags/${moduleId}/actions/${actionId}`, { enabled });

    } catch (error) {

      console.warn('Failed to toggle action:', error.message);

      return { success: false };

    }

  },



  // ── RBAC ─────────────────────────────────────────────────────────────────

  async getRBACConfigs() {

    try {

      return await apiClient.get('/settings/rbac');

    } catch (error) {

      return { data: {} };

    }

  },



  async updateRBAC(roleId, moduleId, permissions) {

    try {

      return await apiClient.put(`/settings/rbac/${roleId}/${moduleId}`, { permissions });

    } catch (error) {

      console.warn('Failed to update RBAC:', error.message);

      return { success: false };

    }

  },



  async toggleRBAC(roleId, moduleId, actionId, enabled) {

    try {

      return await apiClient.post(`/settings/rbac/${roleId}/${moduleId}/${actionId}`, { enabled });

    } catch (error) {

      console.warn('Failed to toggle RBAC:', error.message);

      return { success: false };

    }

  },



  // ── Workflow Rules ───────────────────────────────────────────────────────

  async getWorkflowRules() {

    try {

      return await apiClient.get('/settings/workflows');

    } catch (error) {

      return { data: [] };

    }

  },



  async createWorkflowRule(rule) {

    try {

      return await apiClient.post('/settings/workflows', rule);

    } catch (error) {

      console.warn('Failed to create workflow rule:', error.message);

      return { success: false };

    }

  },



  async updateWorkflowRule(wfId, updates) {

    try {

      return await apiClient.put(`/settings/workflows/${wfId}`, updates);

    } catch (error) {

      console.warn('Failed to update workflow rule:', error.message);

      return { success: false };

    }

  },



  async deleteWorkflowRule(wfId) {

    try {

      return await apiClient.delete(`/settings/workflows/${wfId}`);

    } catch (error) {

      console.warn('Failed to delete workflow rule:', error.message);

      return { success: false };

    }

  },



  // ── Audit Logs ────────────────────────────────────────────────────────────

  async getAuditLogs() {

    try {

      return await apiClient.get('/settings/audit');

    } catch (error) {

      return { data: [] };

    }

  },



  async createAuditLog(log) {

    try {

      return await apiClient.post('/settings/audit', log);

    } catch (error) {

      console.warn('Failed to create audit log:', error.message);

      return { success: false };

    }

  },



  // ── Custom Roles ─────────────────────────────────────────────────────────

  async getCustomRoles() {

    try {

      return await apiClient.get('/settings/custom-roles');

    } catch (error) {

      return { data: {} };

    }

  },



  async createCustomRole(role) {

    try {

      return await apiClient.post('/settings/custom-roles', role);

    } catch (error) {

      console.warn('Failed to create custom role:', error.message);

      throw error;

    }

  },



  async updateCustomRole(roleId, updates) {

    try {

      return await apiClient.put(`/settings/custom-roles/${roleId}`, updates);

    } catch (error) {

      console.warn('Failed to update custom role:', error.message);

      return { success: false };

    }

  },



  async deleteCustomRole(roleId) {

    try {

      return await apiClient.delete(`/settings/custom-roles/${roleId}`);

    } catch (error) {

      console.warn('Failed to delete custom role:', error.message);

      return { success: false };

    }

  },



  async updateCustomRolePermissions(roleId, moduleId, permissions) {

    try {

      return await apiClient.put(`/settings/custom-roles/${roleId}/permissions`, { moduleId, permissions });

    } catch (error) {

      console.warn('Failed to update custom role permissions:', error.message);

      return { success: false };

    }

  },



  async cloneCustomRole(roleId, label) {

    try {

      return await apiClient.post(`/settings/custom-roles/${roleId}/clone`, { label });

    } catch (error) {

      console.warn('Failed to clone custom role:', error.message);

      throw error;

    }

  },



  // ── Project Type Configs ────────────────────────────────────────────────

  async getProjectTypeConfigs() {

    try {

      return await apiClient.get('/settings/project-types');

    } catch (error) {

      return { data: {} };

    }

  },



  // ── Installation Task Checklist Builder ─────────────────────────────────

  async getInstallationTasks() {

    try {

      return await apiClient.get('/settings/installation/tasks');

    } catch (error) {

      return { data: [] };

    }

  },



  async getTypeOptions() {

    try {

      return await apiClient.get('/settings/type-options');

    } catch (error) {

      return { projectTypes: [], installationTypes: [] };

    }

  },



  async updateInstallationTasks(tasks) {

    try {

      return await apiClient.put('/settings/installation/tasks', { tasks });

    } catch (error) {

      console.warn('Failed to update installation tasks:', error.message);

      return { success: false };

    }

  },



  async updateCommissioningTasks(tasks) {

    try {

      return await apiClient.put('/settings/commissioning/tasks', { tasks });

    } catch (error) {

      console.warn('Failed to update commissioning tasks:', error.message);

      return { success: false };

    }

  },



  // ── Milestones Config ─────────────────────────────────────────────────────

  async updateMilestones(milestones) {

    try {

      return await apiClient.put('/settings/milestones', { milestones });

    } catch (error) {

      console.warn('Failed to update milestones:', error.message);

      return { success: false };

    }

  },



  async updateProjectTypeConfig(typeId, config) {

    try {

      return await apiClient.put(`/settings/project-types/${typeId}`, config);

    } catch (error) {

      console.warn('Failed to update project type config:', error.message);

      return { success: false };

    }

  },



  // ── Lead Statuses (CRM → Lead) ───────────────────────────────────────────

  async getLeadStatuses(activeOnly = false) {

    try {

      const params = activeOnly ? { active: 'true' } : {};

      return await apiClient.get('/settings/lead-statuses', { params });

    } catch (error) {

      return { data: [] };

    }

  },



  async createLeadStatus(payload) {

    try {

      return await apiClient.post('/settings/lead-statuses', payload);

    } catch (error) {

      console.warn('Failed to create lead status:', error.message);

      throw error;

    }

  },



  async updateLeadStatus(id, payload) {

    try {

      return await apiClient.patch(`/settings/lead-statuses/${id}`, payload);

    } catch (error) {

      console.warn('Failed to update lead status:', error.message);

      throw error;

    }

  },



  async deleteLeadStatus(id, params = {}) {

    try {

      return await apiClient.delete(`/settings/lead-statuses/${id}`, { params });

    } catch (error) {

      console.warn('Failed to delete lead status:', error.message);

      throw error;

    }

  },



  async reorderLeadStatuses(statusIds) {

    try {

      return await apiClient.patch('/settings/lead-statuses/reorder', { statusIds });

    } catch (error) {

      console.warn('Failed to reorder lead statuses:', error.message);

      return { success: false };

    }

  },

};


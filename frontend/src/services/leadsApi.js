import apiClient, { api } from '../lib/apiClient';

export const leadsApi = {
  // Get all leads with optional filters
  async getAll(params = {}) {
    return api.get('/leads', params);
  },

  // Get ordered active lead status options
  async getStatusOptions() {
    return api.get('/leads/status-options');
  },

  // Get single lead by ID
  async getById(id) {
    return api.get(`/leads/${id}`);
  },

  // Create new lead
  async create(data) {
    return api.post('/leads', data);
  },

  // Update lead
  async update(id, data) {
    return api.put(`/leads/${id}`, data);
  },

  // Delete lead (soft delete)
  async delete(id) {
    await api.delete(`/leads/${id}`);
    return { success: true };
  },

  // Get lead statistics
  async getStats() {
    return api.get('/leads/stats');
  },

  async getDashboardOverview() {
    return api.get('/leads/dashboard/overview');
  },

  // UNIFIED DASHBOARD API - Single call for all dashboard data
  async getDashboard(params = {}) {
    return api.get('/leads/dashboard', params);
  },

  // DEPRECATED - Use getDashboard() instead
  async getDashboardKpis(params = {}) {
    return api.get('/leads/dashboard/kpis', params);
  },

  async getDashboardFunnel(params = {}) {
    return api.get('/leads/dashboard/funnel', params);
  },

  async getDashboardSources(params = {}) {
    return api.get('/leads/dashboard/sources', params);
  },

  async getDashboardSource() {
    return api.get('/leads/dashboard/source');
  },

  async getDashboardMonthly(params = {}) {
    return api.get('/leads/dashboard/monthly', params);
  },

  async getDashboardTrend() {
    return api.get('/leads/dashboard/trend');
  },

  async getDashboardTopPerformers(params = {}) {
    return api.get('/leads/dashboard/top-performers', params);
  },

  async getDashboardActivity() {
    return api.get('/leads/dashboard/activity');
  },

  // Add activity to lead
  async addActivity(id, activity) {
    return api.post(`/leads/${id}/activities`, activity);
  },

  // Duplicate lead
  async duplicate(id) {
    return api.post(`/leads/${id}/duplicate`);
  },

  // Archive lead
  async archive(id) {
    return api.post(`/leads/${id}/archive`);
  },

  // Unarchive lead
  async unarchive(id) {
    return api.post(`/leads/${id}/unarchive`);
  },

  // Get lead timeline
  async getTimeline(id) {
    return api.get(`/leads/${id}/timeline`);
  },

  // Get lead tracker / status progress
  async getTracker(id) {
    return api.get(`/leads/${id}/tracker`);
  },

  // Update lead stage (with tracker update)
  async updateStage(id, stage) {
    const res = await api.patch(`/leads/${id}/stage`, { stage });
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
      window.dispatchEvent(new Event('leadStageUpdated'));
    }
    return res;
  },

  // Bulk archive leads
  async bulkArchive(ids) {
    return api.post('/leads/bulk/archive', { ids });
  },

  // Bulk delete leads - DELETE /api/v1/leads/bulk
  async bulkDelete(ids) {
    return api.post('/leads/bulk/delete', { leadIds: ids });
  },

  // Bulk update stage
  async bulkUpdateStage(ids, stage) {
    return api.post(`/leads/bulk/stage/${stage}`, { ids });
  },

  async reassignStatusKey(fromStatusKey, toStatusKey) {
    return api.post('/leads/reassign-status', { fromStatusKey, toStatusKey });
  },

  // Recalculate all scores
  async recalculateScores() {
    return api.post('/leads/recalculate-scores');
  },

  // Assign lead to user
  async assignLead(id, assignedTo) {
    console.log('[LEADS API] assignLead called with:', { id, assignedTo, type: typeof assignedTo });
    if (!assignedTo) {
      throw new Error('assignedTo is required');
    }
    return api.patch(`/leads/${id}/assign`, { assignedTo: String(assignedTo) });
  },

  // Bulk assign leads to user - PATCH /api/v1/leads/bulk-assign
  async bulkAssign(ids, assignedTo) {
    return api.patch('/leads/bulk-assign', { leadIds: ids, assignedTo });
  },

  // Bulk score boost - PATCH /api/v1/leads/bulk-score
  async bulkScore(ids, scoreIncrease) {
    return api.patch('/leads/bulk-score', { leadIds: ids, scoreIncrease });
  },

  // Get all roles
  async getRoles() {
    return api.get('/settings/custom-roles');
  },

  // Get all employees (for lead assignment)
  async getAllEmployees() {
    return api.get('/hrm/employees');
  },

  // Get users by role
  async getUsersByRole(roleId) {
    return api.get('/users', { roleId });
  },

  // Export leads to CSV - POST /api/v1/leads/export (ASYNC JOB)
  // Supports both ID-based and filter-based export
  async exportCSV(leadIds = [], filters = {}) {
    const payload = {};
    
    // If leadIds provided, use ID-based export
    if (leadIds && leadIds.length > 0) {
      payload.leadIds = leadIds;
    }
    
    // If filters provided, use filter-based export
    if (filters && Object.keys(filters).length > 0) {
      payload.filters = filters;
    }
    
    return api.post('/leads/export', payload);
  },

  // Get export job status - GET /api/v1/leads/export/:jobId/status
  async getExportStatus(jobId) {
    return api.get(`/leads/export/${jobId}/status`);
  },

  // Import leads from file (CSV, XLSX, JSON)
  async importLeads(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/leads/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Get CSV import documentation
  async getImportDocumentation() {
    return api.get('/leads/import/documentation');
  },

  // Get customers (leads with status = "customer")
  async getCustomers(params = {}) {
    return api.get('/leads/customers', params);
  },

  // Get HRM departments for project creation
  async getHrmDepartments() {
    return api.get('/hrm/departments');
  },

  // Get HRM employees for project creation
  async getHrmEmployees() {
    return api.get('/hrm/employees');
  },
};

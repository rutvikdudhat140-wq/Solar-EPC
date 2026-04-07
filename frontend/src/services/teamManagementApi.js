import apiClient, { api } from '../lib/apiClient';

export const TeamManagementService = {
  // Get all departments with pagination and filtering
  getDepartments: async (params = {}) => {
    const { page = 1, limit = 20, search, isActive } = params;
    const queryParams = new URLSearchParams();
    
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (search) queryParams.append('search', search);
    if (isActive !== undefined) queryParams.append('isActive', isActive.toString());
    
    const response = await api.get(`/team-management/departments?${queryParams.toString()}`);
    return response.data;
  },

  // Get single department by ID
  getDepartmentById: async (departmentId) => {
    const response = await api.get(`/team-management/departments/${departmentId}`);
    return response.data;
  },

  // Create new department
  createDepartment: async (departmentData) => {
    const response = await api.post('/team-management/departments', departmentData);
    return response.data;
  },

  // Update department
  updateDepartment: async (departmentId, departmentData) => {
    const response = await api.patch(`/team-management/departments/${departmentId}`, departmentData);
    return response.data;
  },

  // Delete department (soft delete)
  deleteDepartment: async (departmentId) => {
    const response = await api.delete(`/team-management/departments/${departmentId}`);
    return response.data;
  },

  // Set department head
  setDepartmentHead: async (departmentId, userId) => {
    const response = await api.patch(`/team-management/departments/${departmentId}/head`, { userId });
    return response.data;
  },

  // Remove department head
  removeDepartmentHead: async (departmentId) => {
    const response = await api.delete(`/team-management/departments/${departmentId}/head`);
    return response.data;
  },

  // Assign users to department
  assignUsersToDepartment: async (departmentId, emails) => {
    const response = await api.post(`/team-management/departments/${departmentId}/assign-users`, { emails });
    return response.data;
  },

  // Remove users from department
  removeUsersFromDepartment: async (departmentId, emails) => {
    const response = await api.post(`/team-management/departments/${departmentId}/remove-users`, { emails });
    return response.data;
  },

  // Get available users for department assignment
  getAvailableUsers: async (excludeDepartmentId, search) => {
    const queryParams = new URLSearchParams();
    if (excludeDepartmentId) queryParams.append('excludeDepartmentId', excludeDepartmentId);
    if (search) queryParams.append('search', search);
    
    const response = await api.get(`/team-management/available-users?${queryParams.toString()}`);
    return response.data;
  },

  // Get department statistics
  getStatistics: async () => {
    const response = await api.get('/team-management/statistics');
    return response.data;
  },

  // Reorder departments
  reorderDepartments: async (orderedIds) => {
    const response = await api.patch('/team-management/departments/reorder', { orderedIds });
    return response.data;
  },
};

export default TeamManagementService;

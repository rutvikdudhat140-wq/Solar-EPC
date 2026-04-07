import apiClient, { api } from '../lib/apiClient';

export const UserManagementService = {
  // Get all users with pagination and filtering
  getUsers: async (params = {}) => {
    const { page = 1, limit = 20, search, role, isActive, sortBy, sortOrder } = params;
    const queryParams = new URLSearchParams();
    
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (search) queryParams.append('search', search);
    if (role) queryParams.append('role', role);
    if (isActive !== undefined) queryParams.append('isActive', isActive.toString());
    if (sortBy) queryParams.append('sortBy', sortBy);
    if (sortOrder) queryParams.append('sortOrder', sortOrder);
    
    const response = await api.get(`/user-management/users?${queryParams.toString()}`);
    return response.data;
  },

  // Get single user by ID
  getUserById: async (userId) => {
    const response = await api.get(`/user-management/users/${userId}`);
    return response.data;
  },

  // Create new user
  createUser: async (userData) => {
    const response = await api.post('/user-management/users', userData);
    return response.data;
  },

  // Update user
  updateUser: async (userId, userData) => {
    const response = await api.patch(`/user-management/users/${userId}`, userData);
    return response.data;
  },

  // Delete user (soft delete)
  deleteUser: async (userId) => {
    const response = await api.delete(`/user-management/users/${userId}`);
    return response.data;
  },

  // Bulk delete users
  bulkDeleteUsers: async (userIds) => {
    const response = await api.post('/user-management/users/bulk-delete', { userIds });
    return response.data;
  },

  // Toggle user active status
  toggleUserActive: async (userId) => {
    const response = await api.patch(`/user-management/users/${userId}/toggle-active`);
    return response.data;
  },

  // Get user statistics
  getStatistics: async () => {
    const response = await api.get('/user-management/statistics');
    return response.data;
  },

  // Reset user password
  resetPassword: async (userId, newPassword) => {
    const response = await api.patch(`/user-management/users/${userId}/reset-password`, { newPassword });
    return response.data;
  },
};

export default UserManagementService;

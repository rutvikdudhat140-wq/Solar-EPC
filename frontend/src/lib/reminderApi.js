import { api } from './apiClient';

const API_BASE = '/reminders';

export const reminderApi = {
  create: (data) => api.post(API_BASE, data),
  getAll: (params = {}) => api.get(API_BASE, params),
  getById: (id) => api.get(`${API_BASE}/${id}`),
  update: (id, data) => api.put(`${API_BASE}/${id}`, data),
  delete: (id) => api.delete(`${API_BASE}/${id}`),
  complete: (id) => api.post(`${API_BASE}/${id}/complete`),
  snooze: (id, minutes) => api.post(`${API_BASE}/${id}/snooze`, { snoozeMinutes: minutes }),
  cancel: (id) => api.post(`${API_BASE}/${id}/cancel`),
  getStats: () => api.get(`${API_BASE}/stats`),
  getUpcoming: (hours = 24) => api.get(`${API_BASE}/upcoming`, { hours }),
  getAssignableUsers: () => api.get('/tasks/users/assignees'),
};

export default reminderApi;

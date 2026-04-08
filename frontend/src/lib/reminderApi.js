import { api } from './apiClient';

const API_BASE = '/reminders';

export const reminderApi = {
  // CRUD Operations
  create: (data) => api.post(API_BASE, data),
  
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`${API_BASE}?${queryString}`);
  },
  
  getById: (id) => api.get(`${API_BASE}/${id}`),
  
  update: (id, data) => api.put(`${API_BASE}/${id}`, data),
  
  delete: (id) => api.delete(`${API_BASE}/${id}`),
  
  // Status Operations
  complete: (id) => api.post(`${API_BASE}/${id}/complete`),
  
  snooze: (id, minutes) => api.post(`${API_BASE}/${id}/snooze`, { snoozeMinutes: minutes }),
  
  cancel: (id) => api.post(`${API_BASE}/${id}/cancel`),
  
  // Stats & Dashboard
  getStats: () => api.get(`${API_BASE}/stats`),
  
  getUpcoming: (hours = 24) => api.get(`${API_BASE}/upcoming?hours=${hours}`),
};

export default reminderApi;

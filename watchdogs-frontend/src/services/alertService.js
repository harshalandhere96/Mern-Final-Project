import api from '../config/api';

const alertService = {
  // Get all alerts for current user
  getAlerts: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/alerts?${params.toString()}`);
    return response.data;
  },

  // Get alerts near a location
  getNearbyAlerts: async (latitude, longitude, radius = 10) => {
    const response = await api.get('/alerts/nearby', {
      params: { latitude, longitude, radius }
    });
    return response.data;
  },

  // Get alert by ID
  getAlertById: async (alertId) => {
    const response = await api.get(`/alerts/${alertId}`);
    return response.data;
  },

  // Create new alert
  createAlert: async (alertData) => {
    const response = await api.post('/alerts', alertData);
    return response.data;
  },

  // Update alert
  updateAlert: async (alertId, updates) => {
    const response = await api.put(`/alerts/${alertId}`, updates);
    return response.data;
  },

  // Delete alert
  deleteAlert: async (alertId) => {
    const response = await api.delete(`/alerts/${alertId}`);
    return response.data;
  },

  // Mark alert as read
  markAsRead: async (alertId) => {
    const response = await api.patch(`/alerts/${alertId}/read`);
    return response.data;
  },

  // Mark all alerts as read
  markAllAsRead: async () => {
    const response = await api.patch('/alerts/read-all');
    return response.data;
  },

  // Get unread alert count
  getUnreadCount: async () => {
    const response = await api.get('/alerts/unread/count');
    return response.data;
  },

  // Subscribe to alert notifications
  subscribeToAlerts: async (preferences) => {
    const response = await api.post('/alerts/subscribe', preferences);
    return response.data;
  },

  // Unsubscribe from alert notifications
  unsubscribeFromAlerts: async () => {
    const response = await api.post('/alerts/unsubscribe');
    return response.data;
  },

  // Report false alert
  reportFalseAlert: async (alertId, reason) => {
    const response = await api.post(`/alerts/${alertId}/report`, { reason });
    return response.data;
  },

  // Get alert statistics
  getAlertStats: async () => {
    const response = await api.get('/alerts/stats');
    return response.data;
  }
};

export default alertService;
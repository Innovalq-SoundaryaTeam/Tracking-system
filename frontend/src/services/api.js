import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
};

// Jobs services
export const jobsAPI = {
  createJob: (jobData) => api.post('/jobs/', jobData),
  getMyJobs: (params = {}) => api.get("/jobs/my", { params }),
  getAvailableJobs: (params = {}) => api.get('/jobs/available', { params }),
  assignJob: (jobId) => api.put(`/jobs/${jobId}/assign`),
  pickupJob: (jobId) => api.put(`/jobs/${jobId}/pickup`),
  startTransit: (jobId) => api.put(`/jobs/${jobId}/transit`),
  completeJob: (jobId) => api.put(`/jobs/${jobId}/complete`),
  getAllJobs: (params) => api.get("/jobs/all", { params }),
  reassignJob: (jobId, driverId) => api.put(`/jobs/${jobId}/reassign`, { driver_id: driverId }),
  cancelJob: (jobId) => api.put(`/jobs/${jobId}/cancel`),
  collectPayment: (jobId, body = {}) => api.post(`/jobs/${jobId}/collect-payment`, body),
  updateJob: (jobId, data) => api.put(`/jobs/${jobId}`, data),
  deleteJob: (jobId) => api.delete(`/jobs/${jobId}`),

  getDailyStats: (date) => api.get(`/jobs/daily-stats?date=${date}`),

  getJobsByDate: (date) => api.get(`/jobs/jobs-by-date?date=${date}`),   // ✅ ADD THIS

  getPickupAlerts: () => api.get("/jobs/pickup-alerts"),
  getAssignmentAlerts: () => api.get("/jobs/assignment-alerts"),
};

export const paymentsAPI = {
  getSummary: () => api.get("/payments/summary"),
  getCreditPending: () => api.get("/payments/credit-pending"),
  collectCreditPayment: (jobId) => api.put(`/payments/credit/${jobId}/collect`),
};

// Delivery proofs services
export const deliveryProofsAPI = {
  uploadProof: (jobId, formData) => api.post(`/delivery-proofs/upload/${jobId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getJobProof: (jobId) => api.get(`/delivery-proofs/job/${jobId}`),
};

// Driver ratings services
export const driverRatingsAPI = {
  rateDriver: (ratingData) => api.post('/driver-ratings/', ratingData),
  getDriverRatings: (driverId) => api.get(`/driver-ratings/driver/${driverId}`),
  getMyPerformance: () => api.get('/driver-ratings/my-performance'),
};

// Users services
export const usersAPI = {
  getDrivers: () => api.get('/users/drivers'),
  getSellers: () => api.get('/users/sellers'),
  getCurrentUser: () => api.get('/users/me'),
};

export const directoryAPI = {
  getDrivers: () => api.get('/directory/drivers'),
  createDriver: (data) => api.post('/directory/drivers', data),
  updateDriver: (id, data) => api.put(`/directory/drivers/${id}`, data),
  deleteDriver: (id) => api.delete(`/directory/drivers/${id}`),
  getSellers: () => api.get('/directory/sellers'),
  createSeller: (data) => api.post('/directory/sellers', data),
  updateSeller: (id, data) => api.put(`/directory/sellers/${id}`, data),
  deleteSeller: (id) => api.delete(`/directory/sellers/${id}`),
};

// Stock services
export const stockAPI = {
  getStock: () => api.get('/stock/'),
  updateStock: (stockData) => api.put('/stock/', stockData),
};

// Activity logs services
export const activityLogsAPI = {
  getActivityLogs: (params = {}) => api.get('/activity-logs/', { params }),
  getMyActivityLogs: (params = {}) => api.get('/activity-logs/my', { params }),
};

export default api;

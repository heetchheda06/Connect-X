import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach token & format headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('connectx_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // For FormData uploads, remove Content-Type header so browser/axios sets multipart boundary automatically
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto logout trigger can be dispatched here
      localStorage.removeItem('connectx_token');
      localStorage.removeItem('connectx_user');
    }
    return Promise.reject(error);
  }
);

export default api;

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

// Response interceptor: handle 401 unauthorized & sanitize error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto logout trigger can be dispatched here
      localStorage.removeItem('connectx_token');
      localStorage.removeItem('connectx_user');
    }

    // Sanitize raw Gemini API JSON quota/rate limit error messages
    if (error.response?.data?.message) {
      const rawMsg = error.response.data.message;
      if (typeof rawMsg === 'string') {
        if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota') || rawMsg.includes('429')) {
          error.response.data.message = 'AI daily quota limit reached on the Free Tier. Please try again tomorrow or upgrade your Gemini API key.';
        } else if (rawMsg.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(rawMsg);
            error.response.data.message = parsed.error?.message || 'AI request failed. Please try again later.';
          } catch (_) {}
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token from localStorage if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('newtonite_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Active persona override header if set
  const personaUserId = localStorage.getItem('newtonite_active_user_id');
  if (personaUserId && !token) {
    config.headers['X-User-Id'] = personaUserId;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor: capture ETags
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
    // Optionally trigger redirect or clear credentials
  }
  return Promise.reject(error);
});

// Helper for generating unique idempotency keys
export function generateIdempotencyKey(prefix = 'req') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

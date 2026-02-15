import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const contentApi = axios.create({
  baseURL: `${API_BASE_URL}/api/content`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
contentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
contentApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/pages/login.html';
    }
    return Promise.reject(error);
  }
);

// ============================================
// CAREERS API
// ============================================
export const careersApi = {
  getAll: (params = {}) =>
    contentApi.get('/careers', { params }),

  getById: (id) =>
    contentApi.get(`/careers/${id}`),

  create: (data) =>
    contentApi.post('/careers', data),

  update: (id, data) =>
    contentApi.put(`/careers/${id}`, data),

  delete: (id) =>
    contentApi.delete(`/careers/${id}`),
};

// ============================================
// APPLICATIONS API
// ============================================
export const applicationsApi = {
  getAll: (params = {}) =>
    axios.get(`${API_BASE_URL}/api/applications/admin`, { 
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }),

  getById: (id) =>
    axios.get(`${API_BASE_URL}/api/applications/admin/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }),

  updateStatus: (id, data) =>
    axios.put(`${API_BASE_URL}/api/applications/admin/${id}`, data, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }),

  delete: (id) =>
    axios.delete(`${API_BASE_URL}/api/applications/admin/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }),

  getStats: () =>
    axios.get(`${API_BASE_URL}/api/applications/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }),
};

// ============================================
// NEWS API
// ============================================
export const newsApi = {
  getAll: (params = {}) =>
    contentApi.get('/news', { params }),

  getById: (id) =>
    contentApi.get(`/news/${id}`),

  create: (data) =>
    contentApi.post('/news', data),

  update: (id, data) =>
    contentApi.put(`/news/${id}`, data),

  delete: (id) =>
    contentApi.delete(`/news/${id}`),
};

// ============================================
// BLOGS API
// ============================================
export const blogsApi = {
  getAll: (params = {}) =>
    contentApi.get('/blogs', { params }),

  getById: (id) =>
    contentApi.get(`/blogs/${id}`),

  create: (data) =>
    contentApi.post('/blogs', data),

  update: (id, data) =>
    contentApi.put(`/blogs/${id}`, data),

  delete: (id) =>
    contentApi.delete(`/blogs/${id}`),
};

// ============================================
// VIDEOS API
// ============================================
export const videosApi = {
  getAll: (params = {}) =>
    contentApi.get('/videos', { params }),

  getById: (id) =>
    contentApi.get(`/videos/${id}`),

  create: (data) =>
    contentApi.post('/videos', data),

  update: (id, data) =>
    contentApi.put(`/videos/${id}`, data),

  delete: (id) =>
    contentApi.delete(`/videos/${id}`),
};

// ============================================
// EVENTS API
// ============================================
export const eventsApi = {
  getAll: (params = {}) =>
    contentApi.get('/events', { params }),

  getById: (id) =>
    contentApi.get(`/events/${id}`),

  create: (data) =>
    contentApi.post('/events', data),

  update: (id, data) =>
    contentApi.put(`/events/${id}`, data),

  delete: (id) =>
    contentApi.delete(`/events/${id}`),
};

// ============================================
// WEBINARS API
// ============================================
export const webinarsApi = {
  getAll: (params = {}) =>
    contentApi.get('/webinars', { params }),

  getById: (id) =>
    contentApi.get(`/webinars/${id}`),

  create: (data) =>
    contentApi.post('/webinars', data),

  update: (id, data) =>
    contentApi.put(`/webinars/${id}`, data),

  delete: (id) =>
    contentApi.delete(`/webinars/${id}`),
};

// ============================================
// GLOSSARY API
// ============================================
export const glossaryApi = {
  getAll: (params = {}) =>
    contentApi.get('/glossary', { params }),

  getById: (id) =>
    contentApi.get(`/glossary/${id}`),

  create: (data) =>
    contentApi.post('/glossary', data),

  update: (id, data) =>
    contentApi.put(`/glossary/${id}`, data),

  delete: (id) =>
    contentApi.delete(`/glossary/${id}`),
};

// ============================================
// CONTACT API
// ============================================
export const contactApi = {
  getAll: () =>
    contentApi.get('/admin/contact-submissions'),
  update: (id, data) =>
    contentApi.put(`/admin/contact-submissions/${id}/status`, data),
  getStats: () =>
    contentApi.get('/admin/contact-submissions/stats'),
};

// DEMO REQUESTS API
// ============================================
export const demoRequestsApi = {
  getAll: () =>
    contentApi.get('/admin/demo-requests'),
  update: (id, data) =>
    contentApi.put(`/admin/demo-requests/${id}/status`, data),
  getStats: () =>
    contentApi.get('/admin/demo-requests/stats'),
};

// STATS API
// ============================================
export const statsApi = {
  getAll: () =>
    contentApi.get('/stats'),
};

// Default export with all APIs
export default {
  careers: careersApi,
  applications: applicationsApi,
  news: newsApi,
  blogs: blogsApi,
  videos: videosApi,
  events: eventsApi,
  webinars: webinarsApi,
  glossary: glossaryApi,
  contact: contactApi,
  demoRequests: demoRequestsApi,
  stats: statsApi,
};

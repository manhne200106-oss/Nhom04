import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: ALWAYS attach Bearer token and Content-Type to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: Auto-logout on 401 Unauthorized (unless logging in)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLogin = error.config?.url?.includes('/auth/login');
      if (!isLogin) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

// Structured API methods
export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
};

export const projectsApi = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getStats: (id) => api.get(`/projects/${id}/stats`),
};

export const tasksApi = {
  getByProject: (projectId, params = {}) => api.get(`/projects/${projectId}/tasks`, { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`),
};

export const sprintsApi = {
  getByProject: (projectId) => api.get(`/projects/${projectId}/sprints`),
  create: (projectId, data) => api.post(`/projects/${projectId}/sprints`, data),
  update: (id, data) => api.patch(`/sprints/${id}`, data),
  delete: (id) => api.delete(`/sprints/${id}`),
};

export const membersApi = {
  getByProject: (projectId) => api.get(`/projects/${projectId}/members`),
  add: (projectId, data) => api.post(`/projects/${projectId}/members`, data),
};

export const meetingNotesApi = {
  getByProject: (projectId) => api.get(`/projects/${projectId}/meeting-notes`),
  create: (projectId, data) => api.post(`/projects/${projectId}/meeting-notes`, data),
};

export const aiApi = {
  summarizeProgress: (projectId) => api.post('/ai/summarize-progress', { project_id: projectId }),
  suggestAssignment: (projectId, taskTitle, requiredSkills) =>
    api.post('/ai/suggest-assignment', {
      project_id: projectId,
      task_title: taskTitle,
      required_skills: requiredSkills,
    }),
  meetingMinutes: (projectId, rawNotes) =>
    api.post('/ai/meeting-minutes', { project_id: projectId, raw_notes: rawNotes }),
  chatAssistant: (projectId, message) =>
    api.post('/ai/chat-assistant', { project_id: projectId, message }),
};

export default api;

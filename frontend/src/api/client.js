const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const msg = Array.isArray(detail)
      ? detail.map((d) => d.msg || d).join(', ')
      : detail || data.message || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

export const authApi = {
  register: (body) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  adminLogin: (body) => apiRequest('/auth/admin-login', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (body) => apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
};

export const userApi = {
  me: () => apiRequest('/users/me'),
  update: (body) => apiRequest('/users/me', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) =>
    apiRequest('/users/me/change-password', { method: 'POST', body: JSON.stringify(body) }),
};

export const ticketApi = {
  create: (body) => apiRequest('/tickets', { method: 'POST', body: JSON.stringify(body) }),
  my: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/tickets/my${q ? `?${q}` : ''}`);
  },
  all: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/tickets/all${q ? `?${q}` : ''}`);
  },
  get: (id) => apiRequest(`/tickets/${id}`),
  update: (id, body) => apiRequest(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  sendMessage: (id, content) =>
    apiRequest(`/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  reply: (id, content) =>
    apiRequest(`/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ content }) }),
  feedback: (id, rating) =>
    apiRequest(`/tickets/${id}/feedback`, { method: 'POST', body: JSON.stringify({ rating }) }),
  summary: () => apiRequest('/tickets/dashboard/summary'),
};

export const knowledgeApi = {
  list: () => apiRequest('/knowledge'),
  stats: () => apiRequest('/knowledge/stats'),
  upload: (formData) => apiRequest('/knowledge/upload', { method: 'POST', body: formData }),
  remove: (id) => apiRequest(`/knowledge/${id}`, { method: 'DELETE' }),
};

export const analyticsApi = {
  overview: () => apiRequest('/analytics/overview'),
  evaluation: () => apiRequest('/analytics/evaluation'),
};

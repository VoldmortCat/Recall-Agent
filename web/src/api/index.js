import client, { getToken } from './client';
import { setToken } from './client';

export const authApi = {
  register: (phone) => client.post('/auth/register', { phone }),
  login: (phone, code) => client.post('/auth/login', { phone, code }),
  profile: () => client.get('/auth/profile'),
};

export const mistakeApi = {
  list: (params) => client.get('/mistakes', { params }),
  detail: (id) => client.get(`/mistakes/${id}`),
  create: (body) => client.post('/mistakes', body),
  update: (id, body) => client.put(`/mistakes/${id}`, body),
  remove: (id) => client.delete(`/mistakes/${id}`),
  upload: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return client.post('/mistakes/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  similar: (q, exclude, limit = 6) =>
    client.get('/mistakes/search/similar', { params: { q, exclude, limit } }),
};

export const categoryApi = {
  list: () => client.get('/categories'),
  create: (name, color) => client.post('/categories', { name, color }),
  update: (id, body) => client.put(`/categories/${id}`, body),
  remove: (id) => client.delete(`/categories/${id}`),
};

export const chatApi = {
  send: (messages) => client.post('/chat', { messages }),
};

export const chatSessionApi = {
  list: () => client.get('/chat-sessions'),
  create: (title) => client.post('/chat-sessions', { title }),
  get: (id) => client.get(`/chat-sessions/${id}`),
  updateTitle: (id, title) => client.put(`/chat-sessions/${id}`, { title }),
  remove: (id) => client.delete(`/chat-sessions/${id}`),
  sendMessage: (id, content) => client.post(`/chat-sessions/${id}/messages`, { content }),
};

export const statsApi = {
  get: () => client.get('/stats'),
};

export const settingsApi = {
  get: () => client.get('/settings'),
  save: (body) => client.put('/settings', body),
};

export const reviewApi = {
  today: () => client.get('/review/today'),
  submit: (id, quality) => client.post(`/review/${id}`, { quality }),
  progress: () => client.get('/review/progress'),
};

export const exportApi = {
  /** 导出 PDF：使用原始 fetch 绕过 axios 拦截器，确保 blob 正确接收 */
  pdf: async (body) => {
    const token = getToken();
    const resp = await fetch('/api/v1/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    // 检查是否返回 PDF
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/pdf')) {
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `recall-错题集-${Date.now()}.pdf`;
      a.click(); URL.revokeObjectURL(url);
      return { ok: true };
    }
    // 降级 JSON
    const data = await resp.json();
    if (data.fallback) throw new Error('PDF 导出服务未启用，请启动 PDF 微服务');
    return data;
  },
};

export { setToken };

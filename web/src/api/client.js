import axios from 'axios';

const TOKEN_KEY = 'recall_token';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }

/** 上传图片是受保护资源（需登录+归属校验），<img> 无法带 header，故把 token 拼到 URL 上 */
export function assetUrl(p) {
  if (!p || !p.startsWith('/uploads/')) return p;
  const t = getToken();
  if (!t) return p;
  return `${p}${p.includes('?') ? '&' : '?'}token=${encodeURIComponent(t)}`;
}

const client = axios.create({ baseURL: '/api/v1' });

client.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const data = err.response?.data;
    if (data?.code === 'UNAUTHORIZED' || data?.code === 'TOKEN_INVALID') {
      setToken(null);
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(data || { message: err.message });
  }
);

export default client;

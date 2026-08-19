import axios from 'axios'

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

// 请求拦截器：自动携带 token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || { message: '网络错误' })
  }
)

/** 上传图片是受保护资源（需登录+归属校验），<img> 无法带 header，故把 token 拼到 URL 上 */
export function assetUrl(p) {
  if (!p || !p.startsWith('/uploads/')) return p
  const t = localStorage.getItem('token')
  if (!t) return p
  return `${p}${p.includes('?') ? '&' : '?'}token=${encodeURIComponent(t)}`
}

export default request
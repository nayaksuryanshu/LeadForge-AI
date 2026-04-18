import axios from 'axios'

const resolveApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = String(window.location?.hostname || '').toLowerCase()
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
    const isVercelHost = hostname === 'vercel.app' || hostname.endsWith('.vercel.app')

    // Keep browser requests same-origin to rely on Vite/Vercel proxying and avoid CORS errors.
    if (isLocalHost || isVercelHost) {
      return '/api'
    }
  }

  const raw = String(import.meta.env.VITE_API_BASE_URL || '').trim()

  if (!raw) {
    return '/api'
  }

  // If a full backend URL is provided without /api, normalize it.
  if (/^https?:\/\//i.test(raw)) {
    const normalized = raw.replace(/\/+$/, '')
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`
  }

  return raw
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Something went wrong'

    return Promise.reject(new Error(message))
  },
)

export default api
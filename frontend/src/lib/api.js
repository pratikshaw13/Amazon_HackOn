import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
})

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sl_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const valuationApi = {
  analyse: (formData) => api.post('/api/v1/valuation/analyse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}

export const passportApi = {
  get: (productId) => api.get(`/api/v1/passport/${productId}`),
}

export const marketplaceApi = {
  getListings: (params) => api.get('/api/v1/marketplace/listings', { params }),
  getListing: (id) => api.get(`/api/v1/marketplace/listings/${id}`),
}

export const heatmapApi = {
  getDemand: (category) => api.get(`/api/v1/heatmap/${category}`),
}

export const preventionApi = {
  check: (data) => api.post('/api/v1/prevention/check', data),
}

export const greenApi = {
  getCredits: (userId) => api.get(`/api/v1/green/${userId}`),
  award: (userId, data) => api.post(`/api/v1/green/${userId}/award`, data),
  getLeaderboard: () => api.get('/api/v1/green/leaderboard'),
}

export const agentsApi = {
  getStatus: () => api.get('/api/v1/agents/status'),
}

export default api

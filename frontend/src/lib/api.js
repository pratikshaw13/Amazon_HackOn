import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
})

// Attach auth token if present (but don't override if already set)
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    // Don't override if Authorization is already explicitly set
    if (!config.headers.Authorization) {
      const token = localStorage.getItem('sl_token')
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Auto-logout on 401 (only for user portal, not seller/delivery portals)
api.interceptors.response.use(
  response => response,
  error => {
    if (
      typeof window !== 'undefined' &&
      error.response?.status === 401 &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/seller-portal') &&
      !window.location.pathname.startsWith('/delivery-portal') &&
      !window.location.pathname.startsWith('/register')
    ) {
      // Only redirect if the failed request used the user token
      const requestUrl = error.config?.url || ''
      const isUserEndpoint = !requestUrl.includes('certified-seller') &&
                             !requestUrl.includes('delivery-partner') &&
                             !requestUrl.includes('seller-inventory') &&
                             !requestUrl.includes('seller-routing') &&
                             !requestUrl.includes('seller-analytics') &&
                             !requestUrl.includes('rescue')
      if (isUserEndpoint) {
        localStorage.removeItem('sl_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

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
  getLedger: (userId) => api.get(`/api/v1/green/${userId}/ledger`),
  getRewards: () => api.get('/api/v1/green/rewards/catalog'),
  redeem: (userId, data) => api.post(`/api/v1/green/${userId}/redeem`, data),
  getLeaderboard: () => api.get('/api/v1/green/leaderboard'),
  getPlatformImpact: () => api.get('/api/v1/green/impact/platform'),
}

export const agentsApi = {
  getStatus: () => api.get('/api/v1/agents/status'),
}

export const authApi = {
  register: (data) => api.post('/api/v1/auth/register', data),
  login: (data) => api.post('/api/v1/auth/login', data),
  me: () => api.get('/api/v1/auth/me'),
}

export const transactionsApi = {
  buy: (data) => api.post('/api/v1/transactions/buy', data),
  donate: (data) => api.post('/api/v1/transactions/donate', data),
  history: () => api.get('/api/v1/transactions/history'),
}

export const verificationApi = {
  verify: (formData) => api.post('/api/v1/verification/verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getStatus: (productId) => api.get(`/api/v1/verification/${productId}`),
}

export const sellerApi = {
  register: (data) => api.post('/api/v1/seller/register', data),
  login: (data) => api.post('/api/v1/seller/login', data),
  dashboard: () => api.get('/api/v1/seller/dashboard'),
  products: () => api.get('/api/v1/seller/products'),
}

export const routingApi = {
  getQueue: () => api.get('/api/v1/routing/products'),
  recommend: (productId) => api.post(`/api/v1/routing/recommend/${productId}`),
  approve: (data) => api.post('/api/v1/routing/approve', data),
}

export const searchApi = {
  search: (q, limit = 20) => api.get('/api/v1/search', { params: { q, limit } }),
  suggest: (q) => api.get('/api/v1/search/suggest', { params: { q } }),
}

export const cartApi = {
  get: () => api.get('/api/v1/cart'),
  add: (product_id) => api.post('/api/v1/cart/add', { product_id }),
  remove: (product_id) => api.delete(`/api/v1/cart/${product_id}`),
  checkout: (data = {}) => api.post('/api/v1/cart/checkout', data),
}

export const ordersApi = {
  get: () => api.get('/api/v1/orders'),
}

export const fullOrdersApi = {
  buy: (data) => api.post('/api/v1/full-orders/buy', data),
  buyerOrders: () => api.get('/api/v1/full-orders/buyer'),
  sellerOrders: () => api.get('/api/v1/full-orders/seller'),
  getOrder: (orderId) => api.get(`/api/v1/full-orders/${orderId}`),
  confirmPayment: (data) => api.post('/api/v1/full-orders/confirm-payment', data),
}

export const sellAgentApi = {
  start: () => api.post('/api/v1/sell/agent/start'),
  uploadImage: (formData) => api.post('/api/v1/sell/agent/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  estimate: (data) => api.post('/api/v1/sell/agent/estimate', data),
  confirm: (formData) => api.post('/api/v1/sell/agent/confirm', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}

export default api

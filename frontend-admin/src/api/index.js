import axios from 'axios'

const BASE = '/api'
const api = axios.create({ baseURL: BASE, timeout: 15000 })

// 请求拦截器：附加JWT Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('hotel_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(r => r.data, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('hotel_token')
    localStorage.removeItem('hotel_user')
    window.location.href = '/login'
  }
  return Promise.reject(err)
})

export default {
  // 品牌
  getBrands(params) { return api.get('/brands', { params }) },
  getBrand(name) { return api.get(`/brands/${encodeURIComponent(name)}`) },

  // 评估
  evaluate(input) { return api.post('/evaluate', input) },
  matchBrands(input, topN = 5) { return api.post('/match-brands', { input, topN }) },
  quickCalc(input) { return api.post('/quick-calc', input) },
  getDimensions() { return api.get('/dimensions') },

  // 报告
  getReports(params) { return api.get('/reports', { params }) },
  getReport(id) { return api.get(`/reports/${id}`) },
  generateReport(payload) { return api.post('/reports/generate', payload) },

  // 客户
  getInvestors(params) { return api.get('/investors', { params }) },
  getInvestor(id) { return api.get(`/investors/${id}`) },
  createInvestor(data) { return api.post('/investors', data) },
  updateInvestor(id, data) { return api.put(`/investors/${id}`, data) },
  deleteInvestor(id) { return api.delete(`/investors/${id}`) },

  // 认证
  login(data) { return api.post('/auth/login', data) },
  register(data) { return api.post('/auth/register', data) },
  getMe() { return api.get('/auth/me') },
}

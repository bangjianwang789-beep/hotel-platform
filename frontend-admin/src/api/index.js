import axios from 'axios'

const BASE = '/api'
const api = axios.create({ baseURL: BASE, timeout: 15000 })

api.interceptors.response.use(r => r.data, err => Promise.reject(err))

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
}

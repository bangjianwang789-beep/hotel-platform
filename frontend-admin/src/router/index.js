import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '仪表盘' } },
    { path: '/brands', component: () => import('../views/BrandList.vue'), meta: { title: '品牌管理' } },
    { path: '/evaluate', component: () => import('../views/Evaluation.vue'), meta: { title: '物业评估' } },
    { path: '/investors', component: () => import('../views/InvestorList.vue'), meta: { title: '意向客户' } },
    { path: '/reports', component: () => import('../views/ReportList.vue'), meta: { title: '评估报告' } },
  ]
})

export default router

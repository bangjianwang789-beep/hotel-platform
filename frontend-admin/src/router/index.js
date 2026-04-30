import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: () => import('../views/Login.vue'), meta: { title: '登录' } },
    { path: '/dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '仪表盘', requiresAuth: true } },
    { path: '/brands', component: () => import('../views/BrandList.vue'), meta: { title: '品牌管理', requiresAuth: true } },
    { path: '/evaluate', component: () => import('../views/Evaluation.vue'), meta: { title: '物业评估', requiresAuth: true } },
    { path: '/investors', component: () => import('../views/InvestorList.vue'), meta: { title: '意向客户', requiresAuth: true } },
    { path: '/reports', component: () => import('../views/ReportList.vue'), meta: { title: '评估报告', requiresAuth: true } },
  ]
})

// 路由守卫：检查登录状态
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('hotel_token')
    if (!token) {
      return next('/login')
    }
  }
  // 已登录访问登录页 → 跳转首页
  if (to.path === '/login' && localStorage.getItem('hotel_token')) {
    return next('/dashboard')
  }
  next()
})

export default router

<template>
  <el-container style="height: 100vh">
    <el-aside width="200px" style="background: #1a1a2e">
      <div style="padding: 20px; text-align: center; color: #e94560; font-size: 18px; font-weight: bold; border-bottom: 1px solid #333">
        酒店投资平台
      </div>
      <el-menu :default-active="$route.path" router background-color="#1a1a2e" text-color="#aaa" active-text-color="#e94560">
        <el-menu-item index="/dashboard"><el-icon><Odometer/></el-icon>仪表盘</el-menu-item>
        <el-menu-item index="/brands"><el-icon><Shop/></el-icon>品牌管理</el-menu-item>
        <el-menu-item index="/evaluate"><el-icon><DataAnalysis/></el-icon>物业评估</el-menu-item>
        <el-menu-item index="/investors"><el-icon><User/></el-icon>意向客户</el-menu-item>
        <el-menu-item index="/reports"><el-icon><Document/></el-icon>评估报告</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="background:#fff; border-bottom: 1px solid #eee; display:flex; align-items:center; justify-content:space-between">
        <span style="font-size:16px; font-weight:600">{{ $route.meta.title }}</span>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="color:#666; font-size:13px">{{ currentUser }}</span>
          <el-button size="small" @click="handleLogout">退出</el-button>
        </div>
      </el-header>
      <el-main style="background:#f5f7fa">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Odometer, Shop, DataAnalysis, User, Document } from '@element-plus/icons-vue'

const router = useRouter()

const currentUser = computed(() => {
  try {
    const user = JSON.parse(localStorage.getItem('hotel_user') || '{}')
    return user.username || '未登录'
  } catch { return '未登录' }
})

function handleLogout() {
  localStorage.removeItem('hotel_token')
  localStorage.removeItem('hotel_user')
  router.push('/login')
}
</script>

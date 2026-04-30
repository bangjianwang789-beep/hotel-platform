<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h2>酒店投资品牌匹配 SaaS</h2>
        <p>管理后台</p>
      </div>

      <el-tabs v-model="activeTab" class="login-tabs">
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" :rules="loginRules" ref="loginRef" label-position="top" @submit.prevent="handleLogin">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="loginForm.username" placeholder="输入用户名" clearable />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="loginForm.password" type="password" placeholder="输入密码" show-password @keyup.enter="handleLogin" />
            </el-form-item>
            <el-button type="primary" style="width:100%;margin-top:8px" :loading="loading" @click="handleLogin">登录</el-button>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form :model="regForm" :rules="regRules" ref="regRef" label-position="top" @submit.prevent="handleRegister">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="regForm.username" placeholder="设置用户名" clearable />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="regForm.password" type="password" placeholder="设置密码" show-password />
            </el-form-item>
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="regForm.phone" placeholder="可选" clearable />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="regForm.email" placeholder="可选" clearable />
            </el-form-item>
            <el-button type="primary" style="width:100%;margin-top:8px" :loading="loading" @click="handleRegister">注册</el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'

const router = useRouter()
const activeTab = ref('login')
const loading = ref(false)
const loginRef = ref(null)
const regRef = ref(null)

const loginForm = reactive({ username: '', password: '' })
const regForm = reactive({ username: '', password: '', phone: '', email: '' })

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}
const regRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  try {
    await loginRef.value.validate()
  } catch { return }

  loading.value = true
  try {
    const res = await api.login(loginForm)
    if (res.success) {
      localStorage.setItem('hotel_token', res.data.token)
      localStorage.setItem('hotel_user', JSON.stringify({ id: res.data.id, username: res.data.username, role: res.data.role }))
      ElMessage.success(`欢迎回来，${res.data.username}！`)
      router.push('/dashboard')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  try {
    await regRef.value.validate()
  } catch { return }

  loading.value = true
  try {
    const res = await api.register(regForm)
    if (res.success) {
      localStorage.setItem('hotel_token', res.data.token)
      localStorage.setItem('hotel_user', JSON.stringify({ id: res.data.id, username: res.data.username, role: res.data.role }))
      ElMessage.success('注册成功！')
      router.push('/dashboard')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.login-card {
  width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 36px 32px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-header h2 {
  font-size: 20px;
  color: #1a1a2e;
  margin: 0 0 6px;
}

.login-header p {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.login-tabs :deep(.el-tabs__item) {
  font-weight: 500;
}
</style>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="logo">Recall</h1>
      <p class="subtitle">AI智能错题本</p>

      <div class="form">
        <input
          v-model="phone"
          type="tel"
          placeholder="手机号"
          class="input"
          maxlength="11"
        />
        <input
          v-model="code"
          type="text"
          placeholder="验证码（MVP阶段任意输入）"
          class="input"
        />
        <button class="btn" @click="handleLogin">登录 / 注册</button>
        <button class="btn demo" @click="demoLogin">🚀 一键体验 Demo</button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login, register } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const phone = ref('')
const code = ref('123456')
const error = ref('')

async function handleLogin() {
  if (!phone.value) {
    error.value = '请输入手机号'
    return
  }

  try {
    // 先尝试登录，失败则注册
    let res
    try {
      res = await login({ phone: phone.value, code: code.value })
    } catch {
      res = await register({ phone: phone.value })
    }

    authStore.setToken(res.data.token)
    await authStore.fetchProfile()
    router.push('/')
  } catch (err) {
    error.value = err.message || '登录失败'
  }
}

async function demoLogin() {
  phone.value = '13800000000'
  code.value = '123456'
  await handleLogin()
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 40px 32px;
  width: 360px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  text-align: center;
}

.logo {
  font-size: 36px;
  color: #667eea;
  margin-bottom: 4px;
}

.subtitle {
  color: #999;
  margin-bottom: 32px;
  font-size: 14px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input {
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: #667eea;
}

.btn {
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:hover {
  background: #5a6fd6;
}

.btn.demo {
  background: #fff;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn.demo:hover {
  background: #f0f2ff;
}

.error {
  color: #e74c3c;
  margin-top: 12px;
  font-size: 13px;
}
</style>
<template>
  <div class="mine-page">
    <header class="bar"><h2>👤 我的</h2></header>

    <div class="profile">
      <div class="avatar">R</div>
      <div>
        <div class="name">{{ user?.nickname || user?.phone || 'Recall 用户' }}</div>
        <div class="sub">AI 智能错题本 · 本地数据</div>
      </div>
    </div>

    <div class="menu">
      <div class="item" @click="$router.push('/settings')">
        <span>⚙️ API 模型设置</span><span class="arrow">›</span>
      </div>
      <div class="item" @click="$router.push('/help')">
        <span>📖 帮助 / 关于</span><span class="arrow">›</span>
      </div>
      <div class="item" @click="clearData">
        <span>🗑 清空本地错题</span><span class="arrow">›</span>
      </div>
    </div>

    <button class="logout" @click="logout">退出登录</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getMistakeList } from '@/api/mistakes'

const router = useRouter()
const authStore = useAuthStore()
const user = ref(null)

onMounted(async () => {
  await authStore.fetchProfile().catch(() => {})
  user.value = authStore.user
})

function logout() {
  authStore.clearAuth()
  router.push('/login')
}

// 演示用：仅清空列表视图（保留账号）
async function clearData() {
  if (!confirm('确定清空本机所有错题？此操作不可恢复。')) return
  try {
    const res = await getMistakeList({ pageSize: 200 })
    const list = res.data?.list || []
    const { deleteMistake } = await import('@/api/mistakes')
    for (const m of list) await deleteMistake(m.id).catch(() => {})
    alert('已清空 ' + list.length + ' 条错题')
  } catch (e) {
    alert('清空失败：' + (e.message || '未知错误'))
  }
}
</script>

<style scoped>
.mine-page { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f5f6fa; padding-bottom: 80px; }
.bar { padding: 14px 16px; background: #fff; border-bottom: 1px solid #eee; }
.bar h2 { font-size: 17px; }
.profile { display: flex; align-items: center; gap: 14px; padding: 20px 16px; background: #fff; }
.avatar { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; }
.name { font-size: 17px; font-weight: 600; color: #333; }
.sub { font-size: 12px; color: #999; margin-top: 3px; }
.menu { margin-top: 12px; background: #fff; border-radius: 12px; overflow: hidden; }
.item { display: flex; align-items: center; justify-content: space-between; padding: 15px 16px; border-bottom: 1px solid #f2f2f2; font-size: 15px; color: #333; cursor: pointer; }
.item:last-child { border-bottom: none; }
.arrow { color: #ccc; font-size: 18px; }
.logout { width: calc(100% - 32px); margin: 20px 16px 0; padding: 13px; border: none; border-radius: 10px; background: #fff; color: #e74c3c; font-size: 15px; cursor: pointer; }
</style>

<template>
  <div class="home">
    <header class="header">
      <h1 class="title">Recall</h1>
      <span class="user" @click="$router.push('/mine')">{{ user?.nickname || user?.phone }}</span>
    </header>

    <div class="quick-actions">
      <button class="action-btn capture" @click="handleCapture">
        <span class="icon">📷</span>
        <span>拍照录入</span>
      </button>
    </div>

    <div class="stats-grid">
      <div class="stat-card" @click="$router.push('/review')">
        <div class="stat-value">{{ progress?.dueCount || 0 }}</div>
        <div class="stat-label">待复习</div>
      </div>
      <div class="stat-card" @click="$router.push('/review')">
        <div class="stat-value">{{ progress?.completionRate || 0 }}%</div>
        <div class="stat-label">完成率</div>
      </div>
      <div class="stat-card" @click="$router.push('/mistakes')">
        <div class="stat-value">{{ stats?.total || 0 }}</div>
        <div class="stat-label">总错题</div>
      </div>
      <div class="stat-card" @click="$router.push('/analysis')">
        <div class="stat-value">{{ weakPoints }}</div>
        <div class="stat-label">薄弱点</div>
      </div>
    </div>

    <div class="entry-grid">
      <div class="entry" @click="$router.push('/chat')">
        <span class="e-ico">💡</span><span>AI 答疑</span>
      </div>
      <div class="entry" @click="$router.push('/mistakes')">
        <span class="e-ico">📚</span><span>我的错题</span>
      </div>
      <div class="entry" @click="$router.push('/analysis')">
        <span class="e-ico">📊</span><span>学情看板</span>
      </div>
      <div class="entry" @click="$router.push('/mine')">
        <span class="e-ico">⚙️</span><span>设置</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getReviewProgress } from '@/api/review'
import { getMistakeList } from '@/api/mistakes'
import { getReport } from '@/api/analysis'

const router = useRouter()
const authStore = useAuthStore()

const user = ref(null)
const progress = ref(null)
const stats = ref(null)
const weakPoints = ref(0)

onMounted(async () => {
  await authStore.fetchProfile()
  user.value = authStore.user

  const [prog, stat, report] = await Promise.all([
    getReviewProgress().catch(() => ({ data: null })),
    getMistakeList({ pageSize: 1 }).catch(() => ({ data: null })),
    getReport().catch(() => ({ data: null })),
  ])

  progress.value = prog?.data
  stats.value = stat?.data
  weakPoints.value = report?.data?.topWeakPoints?.length || 0
})

function handleCapture() {
  // MVC 阶段：模拟拍照录入，跳转到错题列表
  router.push('/mistakes')
}
</script>

<style scoped>
.home {
  padding: 16px;
  padding-bottom: 80px;
  max-width: 480px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.title {
  font-size: 24px;
  color: #667eea;
}

.user {
  font-size: 13px;
  color: #999;
  cursor: pointer;
}

.quick-actions {
  margin: 16px 0;
}

.capture {
  width: 100%;
  padding: 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.capture .icon {
  font-size: 28px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 16px 0;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.entry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 4px;
}

.entry {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #444;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.entry .e-ico { font-size: 22px; }
</style>
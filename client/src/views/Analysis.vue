<template>
  <div class="analysis-page">
    <header class="page-header">
      <button class="back" @click="$router.push('/')">← 返回</button>
      <h2>学情分析</h2>
    </header>

    <!-- 薄弱点报告 -->
    <section class="section">
      <h3>薄弱点诊断</h3>
      <div v-if="report?.topWeakPoints?.length" class="weak-list">
        <div v-for="(item, i) in report.topWeakPoints" :key="i" class="weak-item">
          <span class="rank">{{ item.rank }}</span>
          <div class="weak-info">
            <span class="weak-name">{{ item.name }}</span>
            <span class="weak-subject">{{ item.subject }}</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (item.masteryScore * 100) + '%' }"
                   :class="{ low: item.masteryScore < 0.5, mid: item.masteryScore >= 0.5 && item.masteryScore < 0.8 }">
              </div>
            </div>
          </div>
          <span class="weak-count">{{ item.mistakeCount }}题</span>
        </div>
      </div>
      <p v-else class="empty">暂无数据，录入错题后查看</p>
    </section>

    <!-- 知识点热力图 -->
    <section class="section">
      <h3>知识点掌握度</h3>
      <div class="heatmap">
        <div v-for="item in heatmap" :key="item.id" class="heat-item">
          <span class="heat-name">{{ item.name }}</span>
          <span class="heat-badge" :class="item.level">
            {{ (item.masteryScore * 100).toFixed(0) }}%
          </span>
        </div>
      </div>
      <p v-if="heatmap.length === 0" class="empty">暂无数据</p>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getReport, getHeatmap } from '@/api/analysis'

const report = ref(null)
const heatmap = ref([])

onMounted(async () => {
  const [rep, heat] = await Promise.all([
    getReport().catch(() => ({ data: null })),
    getHeatmap().catch(() => ({ data: [] })),
  ])
  report.value = rep?.data
  heatmap.value = heat?.data || []
})
</script>

<style scoped>
.analysis-page {
  padding: 16px;
  padding-bottom: 80px;
  max-width: 480px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back { background: none; border: none; font-size: 16px; color: #667eea; cursor: pointer; }

.section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section h3 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
}

.weak-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weak-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rank {
  width: 24px;
  height: 24px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.weak-info {
  flex: 1;
}

.weak-name {
  font-size: 14px;
  font-weight: 500;
}

.weak-subject {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.progress-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  margin-top: 4px;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  background: #4caf50;
  transition: width 0.3s;
}

.progress-fill.low { background: #e74c3c; }
.progress-fill.mid { background: #f57c00; }

.weak-count {
  font-size: 13px;
  color: #999;
  flex-shrink: 0;
}

.heatmap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.heat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.heat-name {
  font-size: 14px;
}

.heat-badge {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
}

.heat-badge.good { background: #e8f5e9; color: #4caf50; }
.heat-badge.warning { background: #fff3e0; color: #f57c00; }
.heat-badge.danger { background: #fde8e8; color: #e74c3c; }

.empty {
  text-align: center;
  color: #999;
  padding: 24px;
}
</style>
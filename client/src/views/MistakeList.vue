<template>
  <div class="mistake-page">
    <header class="page-header">
      <button class="back" @click="$router.push('/')">← 返回</button>
      <h2>错题本</h2>
    </header>

    <!-- 筛选栏 -->
    <div class="filters">
      <select v-model="filter.subject" @change="loadList">
        <option value="">全部学科</option>
        <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="filter.errorType" @change="loadList">
        <option value="">全部错因</option>
        <option v-for="e in errorTypes" :key="e" :value="e">{{ e }}</option>
      </select>
    </div>

    <!-- 错题列表 -->
    <div class="list">
      <div v-for="item in list" :key="item.id" class="card" @click="showDetail(item)">
        <img v-if="item.originalImage" :src="assetUrl(item.originalImage)" class="thumb" />
        <div class="info">
          <span class="tag serial">#{{ pad(item.serialNo) }}</span>
          <span class="tag subject">{{ item.subject }}</span>
          <span class="tag error">{{ item.errorType }}</span>
          <span v-if="item.knowledgePoints" class="tag knowledge">
            {{ item.knowledgePoints[0] }}
          </span>
          <div class="time">{{ formatTime(item.createdAt) }}</div>
        </div>
      </div>
    </div>

    <p v-if="list.length === 0" class="empty">暂无错题，快去拍照录入吧</p>

    <!-- 详情弹窗 -->
    <div v-if="detail" class="modal" @click.self="detail = null">
      <div class="modal-content">
        <h3>错题详情</h3>
        <img :src="assetUrl(detail.originalImage)" class="detail-img" />
        <div class="detail-info">
          <p><strong>编号：</strong>#{{ pad(detail.serialNo) }}</p>
          <p><strong>学科：</strong>{{ detail.subject }}</p>
          <p><strong>知识点：</strong>{{ detail.knowledgePoints?.join('、') }}</p>
          <p><strong>错因：</strong>{{ detail.errorType }}</p>
          <p><strong>难度：</strong>{{ detail.difficulty }}</p>
          <p><strong>AI解析：</strong>{{ detail.analysis }}</p>
        </div>
        <button class="close-btn" @click="detail = null">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMistakeList, getMistakeDetail } from '@/api/mistakes'
import { assetUrl } from '@/api/request'

const subjects = ['数学', '物理', '化学', '英语', '语文']
const errorTypes = ['计算失误', '概念模糊', '审题偏差', '策略偏差', '思维惯性']

const list = ref([])
const detail = ref(null)
const filter = ref({ subject: '', errorType: '' })

onMounted(() => loadList())

async function loadList() {
  const res = await getMistakeList(filter.value)
  list.value = res.data?.list || []
}

async function showDetail(item) {
  const res = await getMistakeDetail(item.id)
  detail.value = res.data
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleDateString('zh-CN')
}

function pad(n) {
  return String(n || 0).padStart(3, '0')
}
</script>

<style scoped>
.mistake-page {
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

.back {
  background: none;
  border: none;
  font-size: 16px;
  color: #667eea;
  cursor: pointer;
}

.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.filters select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  display: flex;
  gap: 12px;
  background: white;
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}

.thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  background: #f0f0f0;
}

.info {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: flex-start;
}

.tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.tag.subject { background: #e8f4fd; color: #2196f3; }
.tag.error { background: #fde8e8; color: #e74c3c; }
.tag.knowledge { background: #e8f5e9; color: #4caf50; }
.tag.serial { background: #f3e8fd; color: #7c3aed; }

.time {
  width: 100%;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.empty {
  text-align: center;
  color: #999;
  margin-top: 60px;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.detail-img {
  width: 100%;
  margin: 12px 0;
  border-radius: 8px;
}

.detail-info p {
  margin: 6px 0;
  font-size: 14px;
  line-height: 1.6;
}

.close-btn {
  width: 100%;
  padding: 10px;
  margin-top: 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
<template>
  <div class="review-page">
    <header class="page-header">
      <button class="back" @click="$router.push('/')">← 返回</button>
      <h2>今日复习</h2>
      <span class="count">{{ progress?.completedCount }}/{{ progress?.dueCount }}</span>
    </header>

    <!-- 复习卡片 -->
    <div v-if="currentMistake" class="card-container">
      <div class="card" @click="showAnswer = !showAnswer">
        <img :src="assetUrl(currentMistake.mistake?.originalImage)" class="card-img" />
        <div class="card-meta">
          <span class="tag">{{ currentMistake.mistake?.subject }}</span>
          <span class="tag">{{ currentMistake.mistake?.errorType }}</span>
        </div>
      </div>

      <div v-if="showAnswer" class="answer-section">
        <p class="label">知识点：{{ currentMistake.mistake?.knowledgePoints?.join('、') }}</p>
        <p class="label">错因：{{ currentMistake.mistake?.errorType }}</p>
        <p class="label">解析：{{ currentMistake.mistake?.analysis }}</p>

        <div class="actions">
          <button class="btn forget" @click="handleReview(0)">忘记</button>
          <button class="btn fuzzy" @click="handleReview(1)">模糊</button>
          <button class="btn remember" @click="handleReview(2)">记得</button>
        </div>
      </div>

      <p class="hint" v-if="!showAnswer">点击卡片查看答案</p>
    </div>

    <div v-else class="done">
      <p>🎉 今日复习已完成！</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getTodayReview, submitReview, getReviewProgress } from '@/api/review'
import { assetUrl } from '@/api/request'

const list = ref([])
const currentIndex = ref(0)
const showAnswer = ref(false)
const progress = ref(null)

const currentMistake = computed(() => list.value[currentIndex.value])

import { computed } from 'vue'

onMounted(async () => {
  const [res, prog] = await Promise.all([
    getTodayReview(),
    getReviewProgress(),
  ])
  list.value = res.data?.list || []
  progress.value = prog?.data
})

async function handleReview(quality) {
  const item = currentMistake.value
  if (!item) return

  await submitReview(item.mistakeId, { quality })
  showAnswer.value = false
  currentIndex.value++

  // 刷新进度
  const prog = await getReviewProgress()
  progress.value = prog?.data
}
</script>

<style scoped>
.review-page {
  padding: 16px;
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
.count { margin-left: auto; font-size: 14px; color: #999; }

.card-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card {
  width: 100%;
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  text-align: center;
}

.card-img {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  background: #f9f9f9;
}

.card-meta {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.tag {
  font-size: 12px;
  padding: 4px 12px;
  background: #f0f0f0;
  border-radius: 12px;
}

.answer-section {
  width: 100%;
  margin-top: 16px;
  background: white;
  border-radius: 12px;
  padding: 16px;
}

.label {
  font-size: 14px;
  margin: 6px 0;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
}

.forget { background: #fde8e8; color: #e74c3c; }
.fuzzy { background: #fff3e0; color: #f57c00; }
.remember { background: #e8f5e9; color: #4caf50; }

.hint {
  margin-top: 12px;
  color: #999;
  font-size: 13px;
}

.done {
  text-align: center;
  margin-top: 80px;
  font-size: 18px;
  color: #666;
}
</style>
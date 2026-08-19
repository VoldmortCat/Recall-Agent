<template>
  <nav class="tabbar">
    <button
      v-for="item in items"
      :key="item.path"
      class="tab"
      :class="{ active: isActive(item) }"
      @click="go(item.path)"
    >
      <span class="ico">{{ item.icon }}</span>
      <span class="label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const items = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/mistakes', label: '错题本', icon: '📚' },
  { path: '/chat', label: 'AI答疑', icon: '💡' },
  { path: '/analysis', label: '学情', icon: '📊' },
  { path: '/mine', label: '我的', icon: '👤' },
]

function isActive(item) {
  if (item.path === '/') return route.path === '/'
  return route.path.startsWith(item.path)
}

function go(path) {
  if (route.path !== path) router.push(path)
}
</script>

<style scoped>
.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 58px;
  background: #fff;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom, 0);
  z-index: 50;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  font-size: 11px;
}
.tab .ico { font-size: 22px; line-height: 1; }
.tab.active { color: #667eea; font-weight: 600; }
</style>

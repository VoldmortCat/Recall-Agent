<template>
  <div id="recall-app">
    <router-view />
    <TabBar v-if="showTab" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'

const route = useRoute()
const showTab = computed(() => route.path !== '/login')
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', sans-serif;
  background: #f5f6fa;
  color: #222;
  -webkit-font-smoothing: antialiased;
}

#recall-app {
  min-height: 100vh;
}
</style>

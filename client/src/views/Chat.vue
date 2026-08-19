<template>
  <div class="chat-page">
    <header class="bar">
      <h2>💡 AI 答疑</h2>
      <span class="mode" :class="mode">{{ modeLabel }}</span>
    </header>

    <div class="messages" ref="box">
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="msg"
        :class="m.role"
      >
        <div class="who">{{ m.role === 'user' ? '我' : 'Recall AI' }}</div>
        <div class="bubble">{{ m.content }}</div>
      </div>
      <div v-if="loading" class="msg assistant">
        <div class="who">Recall AI</div>
        <div class="bubble typing">正在思考…</div>
      </div>
    </div>

    <div class="quick">
      <button v-for="q in suggestions" :key="q" @click="send(q)">{{ q }}</button>
    </div>

    <div class="input-bar">
      <textarea
        v-model="input"
        rows="1"
        placeholder="问点什么：这道题怎么解？怎么复习最高效？"
        @keydown.enter.exact.prevent="send()"
      ></textarea>
      <button class="send" :disabled="loading || !input.trim()" @click="send()">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { chat } from '@/api/chat'

const messages = ref([
  { role: 'assistant', content: '你好，我是 Recall 答疑助手 👋 把不会的题、或知识盲区发给我，我来分步讲解、梳理知识点、制定复习计划。' },
])
const input = ref('')
const loading = ref(false)
const mode = ref('demo')
const box = ref(null)

const suggestions = ['这道题为什么错？', '帮我制定复习计划', '怎么提高正确率？']

const modeLabel = ref('Demo 模式')

onMounted(loadMode)

async function loadMode() {
  try {
    const res = await (await import('@/api/settings')).getSettings()
    mode.value = res.data.configured ? 'llm' : 'demo'
    modeLabel.value = res.data.configured ? `在线 · ${res.data.model}` : 'Demo 模式'
  } catch {}
}

async function send(text) {
  const content = (text ?? input.value).trim()
  if (!content || loading.value) return
  messages.value.push({ role: 'user', content })
  input.value = ''
  loading.value = true
  await nextTick()
  scroll()

  try {
    const history = messages.value.map((m) => ({ role: m.role, content: m.content }))
    const res = await chat(history)
    messages.value.push({ role: 'assistant', content: res.data.reply })
    mode.value = res.data.mode
    modeLabel.value = res.data.mode === 'llm' ? `在线 · ${res.data.model}` : 'Demo 模式'
  } catch (err) {
    messages.value.push({ role: 'assistant', content: '抱歉，答疑服务暂时不可用，请稍后再试。' })
  } finally {
    loading.value = false
    await nextTick()
    scroll()
  }
}

function scroll() {
  if (box.value) box.value.scrollTop = box.value.scrollHeight
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  background: #f5f6fa;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.bar h2 { font-size: 17px; color: #333; }
.mode { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.mode.demo { background: #fff3e0; color: #e08e0b; }
.mode.llm { background: #e8f5e9; color: #2e7d32; }

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.msg { max-width: 80%; display: flex; flex-direction: column; gap: 4px; }
.msg .who { font-size: 10px; color: #999; }
.msg.user { align-self: flex-end; align-items: flex-end; }
.msg.assistant { align-self: flex-start; }
.bubble {
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.msg.user .bubble { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-bottom-right-radius: 4px; }
.msg.assistant .bubble { background: #fff; border: 1px solid #eee; border-bottom-left-radius: 4px; }
.typing { color: #999; font-style: italic; }

.quick {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  overflow-x: auto;
  background: #f5f6fa;
}
.quick button {
  flex-shrink: 0;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 14px;
  background: #fff;
  font-size: 12px;
  color: #555;
  cursor: pointer;
}

.input-bar {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-top: 1px solid #eee;
}
.input-bar textarea {
  flex: 1;
  resize: none;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  max-height: 80px;
}
.send {
  align-self: flex-end;
  padding: 10px 18px;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}
.send:disabled { background: #bbb; cursor: not-allowed; }
</style>

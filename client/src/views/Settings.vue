<template>
  <div class="settings-page">
    <header class="bar">
      <button class="back" @click="$router.back()">←</button>
      <h2>⚙️ API 模型设置</h2>
    </header>

    <div class="form">
      <div class="field">
        <label>模型服务商</label>
        <select v-model="form.provider">
          <option value="openai-compatible">OpenAI 兼容（DeepSeek / 通义 / Ollama 等）</option>
          <option value="deepseek">DeepSeek</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div class="field">
        <label>模型名称 (Model)</label>
        <input v-model="form.model" placeholder="例如：deepseek-chat / gpt-4o / qwen-plus" />
        <div class="hint">用于 AI 解析与答疑的大模型。</div>
      </div>

      <div class="field">
        <label>API Key</label>
        <input v-model="form.apiKey" type="password" placeholder="sk-************************" />
        <div class="hint">
          当前状态：<b :class="form.configured ? 'ok' : 'warn'">{{ form.configured ? '已配置（在线模式）' : '未配置（Demo 模式）' }}</b>
          <span v-if="masked"> · 已保存 {{ masked }}</span>
        </div>
      </div>

      <div class="field">
        <label>Base URL</label>
        <input v-model="form.baseUrl" placeholder="https://api.deepseek.com/v1" />
        <div class="hint">模型服务接口地址（兼容 OpenAI 格式）。</div>
      </div>

      <div class="actions">
        <button class="test" @click="testConn">测试连接</button>
        <button class="save" @click="save">保存设置</button>
      </div>
      <p v-if="msg" class="msg" :class="msgType">{{ msg }}</p>
    </div>

    <div class="tip">
      <h3>说明</h3>
      <p>· 不填 API Key 时，AI 解析 / 答疑将使用内置 Demo 逻辑，产品可正常演示。</p>
      <p>· 填入任意 OpenAI 兼容接口的 Key 后，立即切换为真实大模型。</p>
      <p>· 密钥仅保存在本机服务端 settings.json，不会上传第三方。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getSettings, saveSettings } from '@/api/settings'

const form = ref({ provider: 'openai-compatible', model: '', apiKey: '', baseUrl: '', configured: false })
const masked = ref('')
const msg = ref('')
const msgType = ref('')

onMounted(load)

async function load() {
  try {
    const res = await getSettings()
    const d = res.data
    form.value.provider = d.provider || 'openai-compatible'
    form.value.model = d.model || ''
    form.value.baseUrl = d.baseUrl || ''
    form.value.apiKey = ''
    form.value.configured = d.configured
    masked.value = d.apiKeyMasked || ''
  } catch {}
}

async function save() {
  try {
    const payload = {
      provider: form.value.provider,
      model: form.value.model,
      baseUrl: form.value.baseUrl,
    }
    if (form.value.apiKey) payload.apiKey = form.value.apiKey
    const res = await saveSettings(payload)
    masked.value = res.data.apiKeyMasked
    form.value.configured = res.data.configured
    msg.value = '✅ 设置已保存'
    msgType.value = 'ok'
  } catch (e) {
    msg.value = '❌ 保存失败：' + (e.message || '未知错误')
    msgType.value = 'warn'
  }
}

async function testConn() {
  msg.value = '🔄 正在测试…'
  msgType.value = 'warn'
  // 简单探测 baseUrl 是否可达
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const resp = await fetch(form.value.baseUrl.replace(/\/$/, '') + '/models', {
      headers: form.value.apiKey ? { Authorization: `Bearer ${form.value.apiKey}` } : {},
      signal: ctrl.signal,
    })
    clearTimeout(t)
    msg.value = resp.ok ? '✅ 接口可达（HTTP ' + resp.status + '）' : '⚠️ 接口返回 ' + resp.status
    msgType.value = resp.ok ? 'ok' : 'warn'
  } catch {
    msg.value = '⚠️ 无法连接（可能是本地服务或需鉴权，保存后仍可用 Demo）'
    msgType.value = 'warn'
  }
}
</script>

<style scoped>
.settings-page { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f5f6fa; }
.bar { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #fff; border-bottom: 1px solid #eee; }
.bar h2 { font-size: 17px; }
.back { background: none; border: none; font-size: 20px; cursor: pointer; color: #667eea; }
.form { padding: 16px; }
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; color: #666; margin-bottom: 6px; }
.field input, .field select {
  width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 9px; font-size: 14px; outline: none;
}
.field input:focus, .field select:focus { border-color: #667eea; }
.hint { font-size: 11px; color: #999; margin-top: 5px; }
.ok { color: #2e7d32; } .warn { color: #e08e0b; }
.actions { display: flex; gap: 10px; margin-top: 8px; }
.test, .save { flex: 1; padding: 12px; border: none; border-radius: 9px; font-size: 14px; cursor: pointer; }
.test { background: #fff; border: 1px solid #ddd; color: #555; }
.save { background: #667eea; color: #fff; }
.msg { margin-top: 10px; font-size: 13px; }
.tip { padding: 16px; font-size: 12px; color: #888; line-height: 1.8; }
.tip h3 { font-size: 13px; color: #555; margin-bottom: 6px; }
</style>

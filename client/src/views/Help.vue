<template>
  <div class="help-page">
    <header class="bar">
      <button class="back" @click="$router.back()">←</button>
      <h2>📖 帮助 / 关于</h2>
    </header>
    <div class="doc">
      <h3>一、产品介绍</h3>
      <div class="faq">Recall 是一款面向学生的 <b>AI 智能错题本</b>：拍照 / 录入题目 → AI 自动解析并归类知识点 → 按遗忘曲线安排间隔复习，帮你把错题真正吃透。</div>

      <h3>二、快速上手</h3>
      <div class="step">1. 在「错题本」点 <b>＋录入</b>，上传题目图片或填写题干，系统自动 AI 解析。</div>
      <div class="step">2. 用首页「拍照录入」快速收录，AI 自动标注学科 / 知识点 / 错因。</div>
      <div class="step">3. 在「复习」页按间隔复习计划作答，记「记得」拉长间隔、记「忘记」缩短间隔。</div>
      <div class="step">4. 在「AI 答疑」直接问问题，支持多轮对话、上下文记忆。</div>
      <div class="step">5. 在「API 模型设置」填入模型名 / Key / Base URL，启用真实大模型解析。</div>

      <h3>三、常见问题（FAQ）</h3>
      <div class="faq"><b>Q：没填 API Key 能用吗？</b>可以。未配置时使用内置 Demo 逻辑，功能完整可演示。</div>
      <div class="faq"><b>Q：AI 解析准吗？</b>配置 API 后由所选大模型生成；未配置为规则示例。</div>
      <div class="faq"><b>Q：支持哪些模型？</b>任意 OpenAI 兼容接口：DeepSeek / 通义 / OpenAI / 本地 Ollama 等。</div>
      <div class="faq"><b>Q：数据存在哪？</b>数据存于本地 SQLite，仅本机可见；API Key 存于服务端 settings.json。</div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.help-page { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f5f6fa; padding-bottom: 80px; }
.bar { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #fff; border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 10; }
.bar h2 { font-size: 17px; }
.back { background: none; border: none; font-size: 20px; cursor: pointer; color: #667eea; }
.doc { padding: 16px; }
.doc h3 { font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 6px; margin: 18px 0 10px; color: #333; }
.faq, .step { background: #fff; border: 1px solid #eee; border-radius: 9px; padding: 11px 13px; margin-bottom: 9px; font-size: 13px; line-height: 1.7; color: #555; }
</style>

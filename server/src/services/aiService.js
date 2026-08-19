/**
 * AI 模块（通用 OpenAI 兼容）
 * ------------------------------------------------------------------
 * 设计目标（对应产品重新设计后的 AI 能力）：
 *  1. 任意 OpenAI 兼容接口：DeepSeek / OpenAI / 通义 / 本地 Ollama 等
 *  2. 配置运行时可切换：前端「API 模型设置」页写入 settings.json
 *  3. 无 API Key 时提供「确定性 demo 兜底」，保证产品开箱即用、可演示
 *  4. 核心能力：
 *     - analyzeMistake  ：错题 AI 解析（学科/知识点/错因/难度/讲解）
 *     - chatWithAI      ：AI 答疑对话（多轮上下文 + RAG 错题召回）
 *  5. RAG：答疑时通过 ChromaDB 向量检索 + BM25 从「错题知识库」召回
 *     相关错题（含编号/学科/知识点），喂给大模型，命中"把数学题都讲一遍"
 *     这类诉求。
 */
const config = require('../config');
const prisma = require('./prisma');
const fs = require('fs');
const path = require('path');
const { getSettings } = require('./settingsService');
const chromaService = require('./chromaService');

const SUBJECTS = ['数学', '物理', '化学', '英语', '语文', '生物', '历史', '地理', '政治'];

/** 合并运行时设置与环境变量，得到当前生效的 AI 配置 */
function getActiveConfig() {
  const s = getSettings();
  return {
    provider: s.provider || config.ai.provider,
    apiKey: s.apiKey || config.ai.apiKey,
    baseUrl: (s.baseUrl || config.ai.baseUrl).replace(/\/$/, ''),
    model: s.model || config.ai.model,
    temperature: config.ai.temperature,
  };
}

/**
 * 通用 LLM 调用（chat/completions）
 * @returns {string|null} 模型回复文本；无 key 时返回 null（调用方走兜底）
 */
async function callLLM(messages, { temperature = config.ai.temperature } = {}) {
  const ai = getActiveConfig();
  if (!ai.apiKey || !ai.baseUrl) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ai.apiKey}`,
      },
      body: JSON.stringify({
        model: ai.model,
        messages,
        temperature,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      console.error(`[AI调用失败] HTTP ${resp.status}`, await resp.text().catch(() => ''));
      return null;
    }
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('[AI调用异常]', err.message);
    return null;
  }
}

/** 从模型文本中安全解析 JSON（兼容 ```json 围栏） */
function parseJSON(content) {
  try {
    const cleaned = content.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/* ===================== OCR 识别 ===================== */

/**
 * OCR 识别（服务不可用时返回空，不阻塞主流程）。
 * 本地上传图片直接读文件以 base64 传给 OCR 服务——
 * 不把 /uploads 的公开 URL 交给 OCR 服务，保证图片访问鉴权闭环。
 * @returns {Promise<{text:string, questions:string[]}>}
 */
async function performOCR(imageUrl) {
  try {
    let body = {};
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        const filePath = path.join(__dirname, '../../uploads', path.basename(imageUrl));
        const buf = await fs.promises.readFile(filePath);
        body = { image_base64: buf.toString('base64') };
      } catch (err) {
        console.warn('[OCR] 读取上传图片失败，走 URL 兜底', err.message);
        body = { image_url: imageUrl };
      }
    } else {
      body = { image_url: imageUrl || '' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(config.ocr.serviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return { text: '', questions: [] };
    const data = await resp.json();
    return {
      text: data?.text || '',
      questions: Array.isArray(data?.questions) ? data.questions : [],
    };
  } catch {
    return { text: '', questions: [] };
  }
}

/* ===================== 错题解析 ===================== */

/**
 * 异步分析错题（由 mistakes 路由在创建后触发，不阻塞响应）
 */
async function analyzeMistake(mistakeId, imageUrl) {
  try {
    const mistake = await prisma.mistake.findUnique({ where: { id: mistakeId } });
    if (!mistake) return;

    // 1. 获取题目文本：优先已有 ocrText，否则尝试 OCR
    let ocrText = mistake.ocrText || '';
    if (!ocrText && imageUrl) ocrText = await performOCR(imageUrl).then((r) => r.text);

    // 2. 调用大模型分析
    const prompt = buildAnalysisPrompt(ocrText);
    const raw = await callLLM([
      { role: 'system', content: '你是资深 K12 教育 AI 助教，擅长分析学生错题并给出结构化诊断。' },
      { role: 'user', content: prompt },
    ]);
    const analysis = raw ? parseJSON(raw) : null;

    const result = analysis && analysis.subject ? analysis : demoAnalysis(ocrText);

    // 3. 落库
    await prisma.mistake.update({
      where: { id: mistakeId },
      data: {
        subject: result.subject || 'unknown',
        knowledgePoints: JSON.stringify(result.knowledge_points || []),
        errorType: result.error_type || null,
        difficulty: result.difficulty || null,
        ocrText: ocrText || null,
        analysis: result.analysis || null,
        confidence: typeof result.confidence === 'number' ? result.confidence : null,
      },
    });

    // 4. 知识图谱 + 复习计划
    await updateKnowledgeGraph(mistake.userId, result);
    await createReviewPlan(mistake.userId, mistakeId);

    // 5. 写入 RAG 知识库（ChromaDB 向量 + BM25，降级关键词）
    const fresh = await prisma.mistake.findUnique({ where: { id: mistakeId } });
    await chromaService.upsertMistake({
      id: mistakeId,
      userId: mistake.userId,
      serialNo: mistake.serialNo || fresh?.serialNo || 0,
      subject: result.subject || 'unknown',
      ocrText,
      knowledgePoints: result.knowledge_points || [],
      analysis: result.analysis,
    }).catch(() => {});

    console.log(`[AI分析完成] mistakeId=${mistakeId}, subject=${result.subject}`);
  } catch (err) {
    console.error(`[AI分析失败] mistakeId=${mistakeId}`, err.message);
    await prisma.mistake.update({
      where: { id: mistakeId },
      data: { analysis: `AI分析失败: ${err.message}` },
    }).catch(() => {});
  }
}

function buildAnalysisPrompt(ocrText) {
  return `请分析下面这道学生错题，输出严格的 JSON（不要解释，只输出 JSON）：
{
  "subject": "学科（数学/物理/化学/英语/语文）",
  "knowledge_points": ["知识点1", "知识点2"],
  "error_type": "错因（计算失误/概念模糊/审题偏差/策略偏差/思维惯性）",
  "difficulty": "难度（易/中/难）",
  "confidence": 0.0~1.0,
  "analysis": "面向学生的分步解析与易错提醒（中文，200字内）"
}
题目内容：
${ocrText || '（无 OCR 文本，请基于常见情况给出通用诊断示例）'}`;
}

/* ===================== AI 答疑对话（含 RAG 召回） ===================== */

/**
 * 从用户问题解析出检索意图（学科 / 是否要求"全部/都讲"）。
 */
function parseRagIntent(query) {
  const q = query || '';
  const subject = SUBJECTS.find((s) => q.includes(s) || q.includes(`${s}题`)) || undefined;
  const wantsAll = /全部|所有|都|每道|一一|逐一|来一遍|过一遍/.test(q);
  return { subject, wantsAll };
}

/**
 * 召回错题并组装成上下文文本。
 * @returns {Promise<string>} 上下文（无召回时为空串）
 */
async function buildRagContext(userId, query) {
  if (!userId || !query) return '';
  const { subject, wantsAll } = parseRagIntent(query);
  const hits = await chromaService.retrieve(userId, query, {
    subject,
    limit: wantsAll ? 20 : 5,
    forceAll: wantsAll,
  });
  if (!hits.length) return '';

  const ids = hits.map((h) => h.id);
  const records = await prisma.mistake.findMany({
    where: { id: { in: ids }, userId },
    select: {
      id: true, serialNo: true, subject: true, knowledgePoints: true,
      ocrText: true, analysis: true, errorType: true, difficulty: true,
    },
  });
  const byId = new Map(records.map((r) => [r.id, r]));
  const ordered = hits
    .map((h) => byId.get(h.id))
    .filter(Boolean)
    .sort((a, b) => (a.serialNo || 0) - (b.serialNo || 0));

  const lines = ordered.map((m) => {
    const kps = safeParse(m.knowledgePoints);
    return `#${m.serialNo || '?'} [${m.subject || '未知学科'}]` +
      `${kps.length ? ` 知识点：${kps.join('、')}` : ''}` +
      `\n题目：${(m.ocrText || '').slice(0, 300)}` +
      (m.analysis ? `\n解析：${m.analysis.slice(0, 200)}` : '');
  });
  return `【你的错题本 · 检索到的相关题目】\n${lines.join('\n\n---\n\n')}`;
}

/**
 * 多轮答疑。history: [{role:'user'|'assistant', content}]
 * 返回模型文本；无 key 时返回确定性 demo 回复。
 */
async function chatWithAI(history, userId) {
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const query = lastUser?.content || '';

  // RAG：从用户错题知识库召回相关题目
  const ragContext = await buildRagContext(userId, query);

  const systemContent =
    '你是「Recall AI 智能错题本」的答疑助手。你帮助学生理解错题、讲解知识点、制定复习计划。' +
    '回答要简洁、分步、鼓励性，必要时引用「错题编号/学科/知识点/复习计划/知识图谱」等本产品功能。' +
    (ragContext ? `\n\n以下是刚从该学生「错题本」中检索到的相关错题（题目编号即错题本中的编号），回答时优先结合这些题讲解：\n${ragContext}` : '');

  const messages = [
    { role: 'system', content: systemContent },
  ];
  // 历史消息去重：只保留最后 6 条，控制 token
  const trimmed = history.slice(-6);
  // 若上下文由本次问题产生，保留完整上下文
  messages.push(...trimmed.map((m) => ({ role: m.role, content: m.content })));

  const raw = await callLLM(messages);
  if (raw) return raw;
  return demoChat({ history: trimmed, ragContext });
}

/* ===================== 知识图谱 / 复习计划 ===================== */

async function updateKnowledgeGraph(userId, analysis) {
  const points = analysis.knowledge_points || [];
  if (!userId || points.length === 0) return;
  const subject = analysis.subject || 'unknown';

  for (const name of points) {
    let node = await prisma.knowledgeNode.findFirst({ where: { name, subject } });
    if (!node) node = await prisma.knowledgeNode.create({ data: { name, subject } });

    const uk = await prisma.userKnowledge.findUnique({
      where: { userId_knowledgeId: { userId, knowledgeId: node.id } },
    });
    const newCount = (uk?.mistakeCount || 0) + 1;
    const newScore = Math.max(0.1, 1 / (1 + newCount));
    await prisma.userKnowledge.upsert({
      where: { userId_knowledgeId: { userId, knowledgeId: node.id } },
      update: { mistakeCount: newCount, masteryScore: newScore, lastMistakeAt: new Date() },
      create: { userId, knowledgeId: node.id, mistakeCount: 1, masteryScore: 0.5, lastMistakeAt: new Date() },
    });
  }
}

async function createReviewPlan(userId, mistakeId) {
  if (!userId || !mistakeId) return;
  // 新录入的错题，首次复习日期设为今天（立即可复习）
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  beijing.setHours(0, 0, 0, 0);
  // 北京时间今天 0 点转回 UTC 存储
  const today = new Date(beijing.getTime() - 8 * 60 * 60 * 1000);
  await prisma.reviewPlan.upsert({
    where: { mistakeId },
    update: {},
    create: { userId, mistakeId, repetitions: 0, interval: 1, easeFactor: 1.3, nextReviewDate: today },
  });
}

/* ===================== 确定性 Demo 兜底 ===================== */

const KP_BY_SUBJECT = {
  数学: ['函数-基本性质', '三角函数-正弦定理', '导数-极值', '数列-求和'],
  物理: ['牛顿第二定律', '受力分析', '能量守恒', '电路分析'],
  化学: ['氧化还原反应', '化学平衡', '摩尔计算', '离子方程式'],
  英语: ['虚拟语气', '定语从句', '完形逻辑', '阅读长难句'],
  语文: ['文言文实词', '古诗鉴赏', '病句辨析', '作文立意'],
};

const SUBJECT_SIGNALS = {
  数学: ['函数', '积分', '方程', '三角形', '向量', '矩阵', '导数', '几何', '概率', '数列'],
  物理: ['力', '速度', '加速度', '电场', '磁场', '功', '能量', '牛顿', '匀速', '电路'],
  化学: ['反应', '摩尔', '元素', '酸碱', '氧化还原', '化学键', '溶液', '催化'],
  英语: ['单词', '时态', '语法', '从句', '虚拟语气', '阅读', '完形', '作文'],
  语文: ['文言', '诗词', '病句', '修辞', '阅读', '作文', '成语', '古诗'],
};

function detectSubject(text) {
  let best = 'unknown';
  let bestCount = 0;
  for (const [subj, sigs] of Object.entries(SUBJECT_SIGNALS)) {
    const c = sigs.filter((s) => text.includes(s)).length;
    if (c > bestCount) { bestCount = c; best = subj; }
  }
  return best;
}

function demoAnalysis(text) {
  const subject = detectSubject(text || '');
  const points = subject === 'unknown'
    ? ['通用-待归类']
    : KP_BY_SUBJECT[subject].slice(0, 2);
  return {
    subject,
    knowledge_points: points,
    error_type: '概念模糊',
    difficulty: '中',
    confidence: subject === 'unknown' ? 0.4 : 0.85,
    analysis:
      subject === 'unknown'
        ? '（Demo 模式：未配置 AI Key，返回示例诊断）建议上传清晰题目图片或补充题干文字，系统将自动识别学科与知识点。'
        : `（Demo 模式）本题疑似「${subject}」考点，建议重点巩固：${points.join('、')}。注意理清概念本质，先复述公式再代入条件，避免审题偏差。`,
  };
}

function demoChat({ history, ragContext }) {
  const last = [...history].reverse().find((m) => m.role === 'user');
  const q = (last?.content || '').toLowerCase();

  // 有 RAG 召回时，把题目端出来（即便没有 LLM，也能"把题都讲一遍"）
  if (ragContext) {
    return '我从你的错题本里检索到了这些题目，你可以让我逐道展开讲，或在「错题本」中点击对应编号查看解析：\n\n'
      + ragContext
      + '\n\n（当前为 Demo 模式：未配置 AI Key，以上为检索结果。配置后我将对这些题逐一分步讲解。）';
  }

  if (q.includes('复习') || q.includes('计划')) {
    return '你可以进入「复习」页，系统基于遗忘曲线（SM-2）为每道错题安排间隔复习：答「记得」会拉长间隔，答「忘记」会缩短。每天坚持 10 分钟效果最好～';
  }
  if (q.includes('为什么') || q.includes('怎么') || q.includes('错')) {
    return '错题背后通常是「概念模糊」或「审题偏差」。建议：① 重做时先遮住答案独立推导；② 在错题本里记录关键步骤；③ 用 AI 解析对照你的思路差异。需要我针对某道题展开讲吗？';
  }
  return '我是 Recall 答疑助手 👋 你可以把不会的题、或知识盲区发给我。我可以帮你：分步解析错题、梳理知识点、制定复习计划。当前为 Demo 模式（未配置 AI Key），配置后我将调用真实大模型。';
}

function safeParse(v) {
  if (!v) return [];
  try { const o = JSON.parse(v); return Array.isArray(o) ? o : [o]; } catch { return []; }
}

module.exports = { analyzeMistake, chatWithAI, getActiveConfig, createReviewPlan, performOCR };
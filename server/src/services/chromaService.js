/**
 * ChromaDB 向量检索服务（Node 侧封装）
 * ------------------------------------------------------------------
 * 生产路径：调用独立的 Python 服务 ai/chroma_db/chroma_service.py
 *           （ChromaDB 向量检索 + BM25 关键词检索，含 userId/学科过滤）
 * 降级路径：Python 服务未启动时，退化为「关键词 + TF 重叠」相似度，
 *           保证产品在无外部依赖时仍可运行（功能一致、精度略低）。
 *
 * RAG 知识库文档结构：
 *   text      = 【错题#编号 · 学科】+ 题目内容 + 知识点 + AI解析
 *   metadata  = { userId, subject, serialNo, keywords }
 */
const config = require('../config');
const prisma = require('./prisma');

const RRF_K = 60;

async function callChroma(path, body, timeoutMs = 3000) {
  if (!config.chroma.serviceUrl) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${config.chroma.serviceUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

/**
 * 将错题写入向量库（RAG 知识库）
 * text   ：题目内容 + 知识点 + 解析（含编号/学科便于检索）
 * metadata：编号 serialNo / 学科 subject / 关键字 keywords
 */
async function upsertMistake(mistake) {
  const kps = Array.isArray(mistake.knowledgePoints) ? mistake.knowledgePoints
    : (typeof mistake.knowledgePoints === 'string' ? safeParse(mistake.knowledgePoints) : []);
  const subject = mistake.subject || 'unknown';
  const serialNo = mistake.serialNo || 0;
  const text = [
    `【错题#${serialNo} · ${subject}】`,
    mistake.ocrText,
    kps.length ? `知识点：${kps.join('、')}` : '',
    mistake.analysis,
  ].filter(Boolean).join('\n');
  if (!mistake.ocrText && !mistake.analysis && !kps.length) return;
  await callChroma('/embed', {
    id: mistake.id,
    text,
    metadata: {
      userId: mistake.userId,
      subject,
      serialNo,
      keywords: kps.join('、'),
    },
  });
}

async function deleteMistake(id) {
  await callChroma('/delete', { id });
}

/** 把已知知识点数组 / 题目对象统一成可嵌入结构 */
function safeParse(v) {
  try { const o = JSON.parse(v); return Array.isArray(o) ? o : [o]; } catch { return []; }
}

/**
 * RAG 混合召回：向量检索 + BM25 关键词检索 融合（RRF），供 AI 答疑使用。
 * @param {string} userId
 * @param {string} query
 * @param {{subject?: string, limit?: number, forceAll?: boolean}} opts
 * @returns {Promise<Array<{id:string, score:number, serialNo?:number, subject?:string}>>}
 */
async function retrieve(userId, query, opts = {}) {
  const limit = opts.forceAll ? Math.max(limitSafe(opts.limit, 20), 20)
    : limitSafe(opts.limit, 6);
  const subject = opts.subject || undefined;
  const body = { query, n: limit, userId, subject };

  const [vec, bm] = await Promise.all([
    callChroma('/search', body),
    callChroma('/bm25', body),
  ]);

  const pooled = new Map();
  const addRanked = (results, weight) => {
    if (!Array.isArray(results)) return;
    results.forEach((r, idx) => {
      const key = r.id;
      if (!key) return;
      const cur = pooled.get(key) || { id: key, rrf: 0, serialNo: r.metadata?.serialNo, subject: r.metadata?.subject };
      cur.rrf += weight / (RRF_K + idx + 1);
      if (r.metadata?.serialNo !== undefined) cur.serialNo = r.metadata.serialNo;
      if (r.metadata?.subject) cur.subject = r.metadata.subject;
      pooled.set(key, cur);
    });
  };
  addRanked(vec?.results, 1);
  addRanked(bm?.results, 1);

  // 两个服务都不可用 → 本地降级：关键词重叠相似度
  if (pooled.size === 0) {
    const local = await localFallback(userId, query, subject, limit);
    return local;
  }

  return [...pooled.values()]
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, limit)
    .map((x) => ({ id: x.id, score: x.rrf, serialNo: x.serialNo, subject: x.subject }));
}

/** 本地降级检索：SQL 关键词 + TF 重叠评分 */
async function localFallback(userId, query, subject, limit) {
  const where = { userId };
  if (subject) where.subject = subject;
  const all = await prisma.mistake.findMany({
    where,
    select: { id: true, serialNo: true, ocrText: true, analysis: true, knowledgePoints: true, subject: true },
  });
  const qTokens = tokenize(query);
  return all
    .map((m) => {
      const text = [
        `【错题#${m.serialNo} · ${m.subject}】`,
        m.ocrText, m.analysis, m.knowledgePoints, m.subject,
      ].filter(Boolean).join(' ');
      const score = overlap(tokenize(text), qTokens);
      return { id: m.id, score, serialNo: m.serialNo, subject: m.subject };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** 语义检索相似错题（兼容旧接口，返回 id 数组） */
async function searchSimilar(userId, query, n = 5) {
  const items = await retrieve(userId, query, { limit: n });
  return items.map((i) => i.id);
}

function limitSafe(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function tokenize(s) {
  if (!s) return [];
  const lower = s.toLowerCase();
  const en = lower.match(/[a-z0-9]+/g) || [];
  const cn = lower.match(/[\u4e00-\u9fa5]/g) || [];
  const chars = cn;
  const bigrams = [];
  for (let i = 0; i < chars.length - 1; i++) bigrams.push(chars[i] + chars[i + 1]);
  return [...en, ...cn, ...bigrams];
}

function overlap(a, b) {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let hit = 0;
  for (const t of new Set(a)) if (setB.has(t)) hit++;
  return hit / Math.sqrt(a.length * b.length);
}

/** 启动时全量重建 RAG 索引（回填缺失的错题与元数据） */
async function reindexAll() {
  try {
    const all = await prisma.mistake.findMany({
      select: { id: true, userId: true, serialNo: true, subject: true, ocrText: true, knowledgePoints: true, analysis: true },
    });
    for (const m of all) {
      await upsertMistake(m);
    }
    console.log(`[Chroma] RAG 索引同步完成，共 ${all.length} 道错题`);
  } catch (err) {
    console.error('[Chroma] 索引同步失败（可忽略，服务未启动）', err.message);
  }
}

module.exports = { upsertMistake, deleteMistake, searchSimilar, retrieve, reindexAll };
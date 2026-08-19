/**
 * 错题管理路由
 * POST   /api/v1/mistakes          - 创建错题（拍照录入）
 * GET    /api/v1/mistakes          - 错题列表（支持筛选、搜索）
 * GET    /api/v1/mistakes/:id      - 错题详情
 * PUT    /api/v1/mistakes/:id      - 编辑错题（纠错反馈）
 * DELETE /api/v1/mistakes/:id      - 删除错题
 * POST   /api/v1/mistakes/upload   - 上传图片
 */
const express = require('express');
const prisma = require('../services/prisma');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const aiService = require('../services/aiService');
const chromaService = require('../services/chromaService');

const router = express.Router();

router.use(authMiddleware);

function safeParse(v) {
  if (!v) return [];
  try { const o = JSON.parse(v); return Array.isArray(o) ? o : [o]; } catch { return []; }
}

// 上传图片
router.post('/upload', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 'NO_FILE', message: '请上传图片' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ code: 'OK', data: { imageUrl } });
  } catch (err) { next(err); }
});

// 创建错题（拍照录入 / 手动录入 / 批量导入）
// 一张照片含多道题时：上传图片且未提供文本 → 同步 OCR 切分 → 逐道建错题
router.post('/', async (req, res, next) => {
  try {
    const {
      imageUrl, ocrText, subject, knowledgePoints, errorType,
      difficulty, correctAnswer, userAnswer, analysis, source, categoryId,
      questions: bodyQuestions,
    } = req.body;

    if (!imageUrl && !ocrText && !subject) {
      return res.status(400).json({ code: 'INVALID_PARAMS', message: '请至少提供 图片 / 题目文本 / 学科 之一' });
    }

    // 1. 确定要创建的题目列表（支持一图多题）
    let questionList = [];
    if (Array.isArray(bodyQuestions)) {
      questionList = bodyQuestions
        .map((q) => (typeof q === 'string' ? q : (q?.ocrText || q?.text || '')))
        .filter(Boolean);
    } else if (imageUrl && !ocrText) {
      // 拍照录入：同步 OCR 一次，自动把一张照片里的多道题拆开
      try {
        const ocr = await aiService.performOCR(imageUrl);
        if (ocr.questions && ocr.questions.length >= 2) {
          questionList = ocr.questions;
        } else if (ocr.text) {
          questionList = [ocr.text];
        }
      } catch (err) {
        // OCR 服务不可用：保持单题，后续由异步 analyzeMistake 再尝试
      }
    }
    const items = questionList.length ? questionList : [ocrText || ''];

    // 2. 逐道创建错题（用户维度自增编号连续分配）
    let serialNo = await nextSerialNo(req.userId);
    const ids = [];
    for (const text of items) {
      const mistake = await prisma.mistake.create({
        data: {
          userId: req.userId,
          serialNo: serialNo++,
          subject: subject || 'unknown',
          originalImage: imageUrl || null,
          ocrText: text || null,
          knowledgePoints: knowledgePoints ? JSON.stringify(knowledgePoints) : null,
          errorType: errorType || null,
          difficulty: difficulty || null,
          correctAnswer: correctAnswer || null,
          userAnswer: userAnswer || null,
          analysis: analysis || null,
          source: source || (imageUrl ? '拍照录入' : '手动录入'),
          categoryId: categoryId || null,
          masteryStatus: 'pending',
        },
      });
      ids.push(mistake.id);

      // 3. 异步 AI 分析（有文本则直接用文本，缺文本则用图片再 OCR）
      const needAnalyze = !analysis;
      if (needAnalyze) {
        aiService.analyzeMistake(mistake.id, urlForImage(imageUrl, text)).catch(err => {
          console.error('[AI分析失败]', mistake.id, err.message);
        });
      }

      // 4. 自动创建复习计划
      aiService.createReviewPlan(req.userId, mistake.id).catch(err => {
        console.error('[创建复习计划失败]', mistake.id, err.message);
      });
    }

    res.status(201).json({
      code: 'OK',
      message: items.length > 1 ? `已拆分为 ${items.length} 道错题存入错题本` : '已存入错题本',
      data: { id: ids[0], ids, count: items.length },
    });
  } catch (err) { next(err); }
});

/** 用户维度的下一个自增编号 */
async function nextSerialNo(userId) {
  const max = await prisma.mistake.aggregate({
    where: { userId },
    _max: { serialNo: true },
  });
  return (max._max.serialNo || 0) + 1;
}

/** AI 分析时：有题目文本则传 null 让 analyzeMistake 用已有 ocrText；否则传图片 url */
function urlForImage(imageUrl, text) {
  return imageUrl && !text ? imageUrl : null;
}

// 错题列表
router.get('/', async (req, res, next) => {
  try {
    const {
      subject, errorType, difficulty, knowledgePoint, keyword,
      categoryId, masteryStatus, page = 1, pageSize = 20,
    } = req.query;
    const where = { userId: req.userId };

    if (subject) where.subject = subject;
    if (errorType) where.errorType = errorType;
    if (difficulty) where.difficulty = difficulty;
    if (categoryId) where.categoryId = categoryId;
    if (masteryStatus) where.masteryStatus = masteryStatus;
    if (knowledgePoint) {
      where.knowledgePoints = { contains: knowledgePoint };
    }
    if (keyword) {
      where.OR = [
        { ocrText: { contains: keyword } },
        { analysis: { contains: keyword } },
        { subject: { contains: keyword } },
      ];
    }

    const [total, list] = await Promise.all([
      prisma.mistake.count({ where }),
      prisma.mistake.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        select: {
          id: true, serialNo: true, subject: true, knowledgePoints: true, errorType: true,
          difficulty: true, originalImage: true, masteryStatus: true,
          confidence: true, createdAt: true, source: true, ocrText: true,
          analysis: true, correctAnswer: true, userAnswer: true,
          category: { select: { id: true, name: true, color: true } },
          _count: { select: { reviewLogs: true } },
        },
      }),
    ]);

    const norm = list.map((m) => ({
      ...m,
      reviewCount: m._count.reviewLogs,
      _count: undefined,
      knowledgePoints: m.knowledgePoints ? safeParse(m.knowledgePoints) : [],
    }));

    res.json({
      code: 'OK',
      data: { total, page: parseInt(page), pageSize: parseInt(pageSize), list: norm },
    });
  } catch (err) { next(err); }
});

// 语义检索相似错题（ChromaDB，降级关键词）
router.get('/search/similar', async (req, res, next) => {
  try {
    const { q, exclude, limit = 6 } = req.query;
    if (!q) return res.status(400).json({ code: 'INVALID_PARAMS', message: 'q 不能为空' });
    const ids = await chromaService.searchSimilar(req.userId, q, parseInt(limit) || 6);
    const filtered = (exclude ? ids.filter((id) => id !== exclude) : ids);
    if (!filtered.length) return res.json({ code: 'OK', data: { list: [] } });
    const list = await prisma.mistake.findMany({
      where: { userId: req.userId, id: { in: filtered } },
      select: {
        id: true, subject: true, ocrText: true, knowledgePoints: true,
        masteryStatus: true, analysis: true,
      },
      take: parseInt(limit) || 6,
    });
    const norm = list.map((m) => ({ ...m, knowledgePoints: safeParse(m.knowledgePoints) }));
    res.json({ code: 'OK', data: { list: norm } });
  } catch (err) { next(err); }
});

// 错题详情
router.get('/:id', async (req, res, next) => {
  try {
    const mistake = await prisma.mistake.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!mistake) {
      return res.status(404).json({ code: 'NOT_FOUND', message: '错题不存在' });
    }
    mistake.knowledgePoints = safeParse(mistake.knowledgePoints);
    res.json({ code: 'OK', data: mistake });
  } catch (err) { next(err); }
});

// 编辑错题（纠错反馈）
router.put('/:id', async (req, res, next) => {
  try {
    const { subject, knowledgePoints, errorType, difficulty, correctAnswer, analysis, masteryStatus } = req.body;
    const existing = await prisma.mistake.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) {
      return res.status(404).json({ code: 'NOT_FOUND', message: '错题不存在' });
    }

    const data = {};
    if (subject !== undefined) data.subject = subject;
    if (knowledgePoints !== undefined) data.knowledgePoints = JSON.stringify(knowledgePoints);
    if (errorType !== undefined) data.errorType = errorType;
    if (difficulty !== undefined) data.difficulty = difficulty;
    if (correctAnswer !== undefined) data.correctAnswer = correctAnswer;
    if (analysis !== undefined) data.analysis = analysis;
    if (masteryStatus !== undefined) data.masteryStatus = masteryStatus;

    // 如果用户手动修改了AI标注，标记为已纠正
    if (subject || knowledgePoints || errorType || difficulty) {
      data.isCorrected = true;
    }

    const updated = await prisma.mistake.update({ where: { id: req.params.id }, data });
    // 同步更新 RAG 知识库（学科/知识点/解析变化会影响召回）
    chromaService.upsertMistake(updated).catch(() => {});
    res.json({ code: 'OK', data: updated });
  } catch (err) { next(err); }
});

// 删除错题
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.mistake.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) {
      return res.status(404).json({ code: 'NOT_FOUND', message: '错题不存在' });
    }
    // 级联删除关联数据（复习计划 / 复习记录 / 图片），避免外键约束导致删除失败
    await prisma.$transaction([
      prisma.reviewLog.deleteMany({ where: { mistakeId: req.params.id } }),
      prisma.reviewPlan.deleteMany({ where: { mistakeId: req.params.id } }),
      prisma.mistakeImage.deleteMany({ where: { mistakeId: req.params.id } }),
      prisma.mistake.delete({ where: { id: req.params.id } }),
    ]);
    // 同步知识图谱：扣除该错题对应知识点的计数
    await decrementKnowledge(req.userId, safeParse(existing.knowledgePoints));
    chromaService.deleteMistake(req.params.id).catch(() => {});
    res.json({ code: 'OK', message: '已删除' });
  } catch (err) { next(err); }
});

/** 删除错题后扣除知识图谱（userKnowledge）中对应知识点的错题计数 */
async function decrementKnowledge(userId, knowledgePoints) {
  if (!Array.isArray(knowledgePoints) || knowledgePoints.length === 0) return;
  for (const name of knowledgePoints) {
    const nodes = await prisma.knowledgeNode.findMany({ where: { name } });
    for (const node of nodes) {
      const uk = await prisma.userKnowledge.findUnique({
        where: { userId_knowledgeId: { userId, knowledgeId: node.id } },
      });
      if (!uk) continue;
      if (uk.mistakeCount <= 1) {
        await prisma.userKnowledge.delete({ where: { id: uk.id } });
      } else {
        const newCount = uk.mistakeCount - 1;
        await prisma.userKnowledge.update({
          where: { id: uk.id },
          data: { mistakeCount: newCount, masteryScore: Math.max(0.1, 1 / (1 + newCount)) },
        });
      }
    }
  }
}

module.exports = router;
/**
 * 学情分析路由
 * GET /api/v1/analysis/heatmap       - 知识点热力图
 * GET /api/v1/analysis/knowledge-graph - 知识图谱数据
 * GET /api/v1/analysis/report         - 薄弱点诊断报告
 */
const express = require('express');
const prisma = require('../services/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 知识点热力图
router.get('/heatmap', async (req, res, next) => {
  try {
    const { subject } = req.query;
    const where = { userId: req.userId };
    if (subject) where.subject = subject;

    const userKnowledge = await prisma.userKnowledge.findMany({
      where,
      include: { knowledge: true },
      orderBy: { mistakeCount: 'desc' },
    });

    const heatmap = userKnowledge.map(uk => ({
      id: uk.knowledge.id,
      name: uk.knowledge.name,
      subject: uk.knowledge.subject,
      mistakeCount: uk.mistakeCount,
      masteryScore: uk.masteryScore,
      // 根据掌握度返回颜色等级
      level: uk.masteryScore >= 0.8 ? 'good' : (uk.masteryScore >= 0.5 ? 'warning' : 'danger'),
    }));

    res.json({ code: 'OK', data: heatmap });
  } catch (err) { next(err); }
});

// 知识图谱数据（仅返回当前用户关联过的知识点，用户间解析结果完全隔离）
router.get('/knowledge-graph', async (req, res, next) => {
  try {
    const { subject } = req.query;

    // 只取当前用户有错题关联的知识节点
    const userKnowledge = await prisma.userKnowledge.findMany({
      where: {
        userId: req.userId,
        ...(subject ? { knowledge: { subject } } : {}),
      },
      include: { knowledge: true },
    });
    const ids = userKnowledge.map((uk) => uk.knowledgeId);
    const nodes = await prisma.knowledgeNode.findMany({ where: { id: { in: ids } } });

    const ukMap = new Map(userKnowledge.map((uk) => [uk.knowledgeId, uk]));
    const idSet = new Set(ids);

    // 构建图数据结构（只含用户自己的节点，边仅保留两端都属于该用户的关系）
    const graphNodes = nodes.map((n) => ({
      id: n.id,
      name: n.name,
      subject: n.subject,
      parentId: n.parentId,
      mistakeCount: ukMap.get(n.id)?.mistakeCount || 0,
      masteryScore: ukMap.get(n.id)?.masteryScore || 1.0,
    }));

    const edges = nodes
      .filter((n) => n.parentId && idSet.has(n.parentId))
      .map((n) => ({ source: n.parentId, target: n.id }));

    res.json({ code: 'OK', data: { nodes: graphNodes, edges } });
  } catch (err) { next(err); }
});

// 薄弱点诊断报告
router.get('/report', async (req, res, next) => {
  try {
    // 取错题数最多的 TOP 5 知识点
    const topWeak = await prisma.userKnowledge.findMany({
      where: { userId: req.userId },
      include: { knowledge: true },
      orderBy: { mistakeCount: 'desc' },
      take: 5,
    });

    const report = {
      summary: `本周共记录 ${topWeak.reduce((s, v) => s + v.mistakeCount, 0)} 道错题`,
      topWeakPoints: topWeak.map((uk, i) => ({
        rank: i + 1,
        name: uk.knowledge.name,
        subject: uk.knowledge.subject,
        mistakeCount: uk.mistakeCount,
        masteryScore: uk.masteryScore,
        suggestion: uk.masteryScore < 0.5 ? '建议重点复习该知识点相关题目' : '适当巩固',
      })),
      generatedAt: new Date(),
    };

    res.json({ code: 'OK', data: report });
  } catch (err) { next(err); }
});

module.exports = router;
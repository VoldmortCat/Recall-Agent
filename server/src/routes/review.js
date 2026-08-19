/**
 * 复习计划路由
 * GET    /api/v1/review/today     - 今日待复习列表
 * POST   /api/v1/review/:id       - 提交复习反馈
 * GET    /api/v1/review/progress  - 复习进度看板
 */
const express = require('express');
const prisma = require('../services/prisma');
const authMiddleware = require('../middleware/auth');
const reviewService = require('../services/reviewService');

const router = express.Router();

router.use(authMiddleware);

// 今日待复习列表（包含所有未掌握的错题，按到期时间排序）
router.get('/today', async (req, res, next) => {
  try {
    const plans = await prisma.reviewPlan.findMany({
      where: {
        userId: req.userId,
        mistake: { masteryStatus: { not: 'mastered' } },
      },
      include: {
        mistake: {
          select: { id: true, subject: true, originalImage: true, ocrText: true, knowledgePoints: true, errorType: true, analysis: true },
        },
      },
      orderBy: { nextReviewDate: 'asc' },
    });

    res.json({ code: 'OK', data: { total: plans.length, list: plans } });
  } catch (err) { next(err); }
});

// 提交复习反馈
router.post('/:mistakeId', async (req, res, next) => {
  try {
    const { quality } = req.body; // 0=忘记, 1=模糊, 2=记得
    if (quality === undefined || ![0, 1, 2].includes(quality)) {
      return res.status(400).json({ code: 'INVALID_PARAMS', message: 'quality 必须为 0(忘记)/1(模糊)/2(记得)' });
    }

    const result = await reviewService.processReview(req.userId, req.params.mistakeId, quality);
    res.json({ code: 'OK', data: result });
  } catch (err) { next(err); }
});

// 复习进度看板
router.get('/progress', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [dueCount, completedCount, totalCount] = await Promise.all([
      prisma.reviewPlan.count({
        where: { userId: req.userId, mistake: { masteryStatus: { not: 'mastered' } } },
      }),
      prisma.reviewLog.count({
        where: { userId: req.userId, reviewedAt: { gte: today, lt: todayEnd } },
      }),
      prisma.mistake.count({
        where: { userId: req.userId, masteryStatus: { not: 'mastered' } },
      }),
    ]);

    res.json({
      code: 'OK',
      data: { dueCount, completedCount, totalCount, completionRate: dueCount > 0 ? (completedCount / dueCount * 100).toFixed(1) : 100 },
    });
  } catch (err) { next(err); }
});

module.exports = router;
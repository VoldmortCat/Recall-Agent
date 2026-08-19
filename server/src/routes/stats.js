/**
 * 数据看板统计路由
 * GET /api/v1/stats  -> 错题总数 / 学科分布 / 掌握度 / 待复习 / 复习成功率 / 近4周趋势
 */
const express = require('express');
const prisma = require('../services/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const userId = req.userId;
    const now = new Date();

    const [total, masteryGroups, subjectGroups, dueCount, reviewLogs] = await Promise.all([
      prisma.mistake.count({ where: { userId } }),
      prisma.mistake.groupBy({ by: ['masteryStatus'], where: { userId }, _count: { _all: true } }),
      prisma.mistake.groupBy({ by: ['subject'], where: { userId }, _count: { _all: true } }),
      prisma.reviewPlan.count({ where: { userId, nextReviewDate: { lte: now } } }),
      prisma.reviewLog.findMany({ where: { userId }, select: { quality: true } }),
    ]);

    const mastery = { pending: 0, learning: 0, reviewing: 0, corrected: 0, mastered: 0 };
    masteryGroups.forEach((g) => {
      if (g.masteryStatus === 'mastered') mastery.mastered += g._count._all;
      else if (g.masteryStatus === 'learning') mastery.learning += g._count._all;
      else if (g.masteryStatus === 'reviewing') mastery.reviewing += g._count._all;
      else if (g.masteryStatus === 'corrected') mastery.corrected += g._count._all;
      else mastery.pending += g._count._all;
    });

    const bySubject = subjectGroups
      .map((g) => ({ subject: g.subject, count: g._count._all }))
      .sort((a, b) => b.count - a.count);

    const reviewTotal = reviewLogs.length;
    const reviewSuccess = reviewLogs.filter((r) => r.quality >= 2).length;
    const successRate = reviewTotal ? Math.round((reviewSuccess / reviewTotal) * 100) : 0;

    // 近 4 周错题录入趋势
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const c = await prisma.mistake.count({
        where: { userId, createdAt: { gte: start, lt: end } },
      });
      weeks.push({ label: `第${4 - i}周`, count: c });
    }

    // 最近 30 天每日错题录入 / 复习趋势
    const dailyEntries = [];
    const dailyReviews = [];
    for (let i = 29; i >= 0; i--) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const [ec, rc] = await Promise.all([
        prisma.mistake.count({ where: { userId, createdAt: { gte: start, lt: end } } }),
        prisma.reviewLog.count({ where: { userId, reviewedAt: { gte: start, lt: end } } }),
      ]);
      const label = `${start.getMonth() + 1}/${start.getDate()}`;
      dailyEntries.push({ date: label, count: ec });
      dailyReviews.push({ date: label, count: rc });
    }

    res.json({
      code: 'OK',
      data: {
        totalMistakes: total,
        mastery,
        bySubject,
        dueReviews: dueCount,
        review: { total: reviewTotal, successRate },
        weeklyTrend: weeks,
        dailyEntries,
        dailyReviews,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;

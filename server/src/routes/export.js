/**
 * 考前冲刺导出路由
 * POST /api/v1/export/pdf  - 生成错题集PDF（ReportLab 服务，降级返回 JSON）
 */
const express = require('express');
const prisma = require('../services/prisma');
const config = require('../config');
const authMiddleware = require('../middleware/auth');
const exportService = require('../services/exportService');

const router = express.Router();

router.use(authMiddleware);

// 生成错题集PDF
router.post('/pdf', async (req, res, next) => {
  try {
    const { subject, categoryId, excludeMastered = true, includeAnalysis = true } = req.body;
    const where = { userId: req.userId };

    if (subject) where.subject = subject;
    if (categoryId) where.categoryId = categoryId;
    if (excludeMastered) where.masteryStatus = { not: 'mastered' };

    const mistakes = await prisma.mistake.findMany({
      where,
      orderBy: [{ difficulty: 'desc' }, { createdAt: 'desc' }],
      take: 50, // 单次导出最多50题
    });

    if (mistakes.length === 0) {
      return res.status(400).json({ code: 'EMPTY', message: '没有可导出的错题' });
    }

    const payload = exportService.generatePdfData(mistakes, { includeAnalysis });

    // 尝试调用 ReportLab 服务生成真实 PDF
    if (config.pdf.serviceUrl) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const resp = await fetch(config.pdf.serviceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="recall-mistakes-${Date.now()}.pdf"`);
          return res.send(buf);
        }
      } catch (e) {
        console.warn('[PDF服务不可用，降级为JSON]', e.message);
      }
    }

    // 降级：返回结构化 JSON 数据供前端渲染/打印
    res.json({
      code: 'OK',
      data: payload,
      fallback: true,
      message: 'PDF 服务未启用，已返回结构化数据（可前端打印）',
    });
  } catch (err) { next(err); }
});

module.exports = router;
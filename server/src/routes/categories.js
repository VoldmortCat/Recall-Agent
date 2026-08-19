/**
 * 错题分类路由（用户自建文件夹）
 * GET    /api/v1/categories        - 分类列表（含错题数）
 * POST   /api/v1/categories        - 新建分类
 * PUT    /api/v1/categories/:id    - 重命名/改色/排序
 * DELETE /api/v1/categories/:id    - 删除分类（错题归为未分类）
 */
const express = require('express');
const prisma = require('../services/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const PALETTE = ['#667eea', '#764ba2', '#4f8cff', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
const SUBJECTS = ['数学', '物理', '化学', '英语', '语文', '生物', '历史', '地理', '政治'];
const SUBJECT_COLORS = {
  '数学': '#3b82f6', '物理': '#ef4444', '化学': '#8b5cf6',
  '英语': '#22c55e', '语文': '#f59e0b', '生物': '#06b6d4',
  '历史': '#ec4899', '地理': '#14b8a6', '政治': '#a855f7',
};

router.get('/', async (req, res, next) => {
  try {
    // 1. 用户自定义分类
    const cats = await prisma.category.findMany({
      where: { userId: req.userId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { mistakes: true } } },
    });
    const list = cats.map((c) => ({ id: c.id, name: c.name, color: c.color, count: c._count.mistakes }));

    // 2. 内置学科分类（统计该用户各学科错题数）
    const subjectCounts = await prisma.mistake.groupBy({
      by: ['subject'],
      where: { userId: req.userId, subject: { not: 'unknown' } },
      _count: { id: true },
    });
    const countMap = {};
    subjectCounts.forEach((s) => { countMap[s.subject] = s._count.id; });
    const subjects = SUBJECTS.map((name) => ({
      id: `subject:${name}`,
      name,
      color: SUBJECT_COLORS[name] || '#94a3b8',
      count: countMap[name] || 0,
      builtin: true,
    }));

    // 3. 用户全部错题总数（独立于筛选条件，用于「全部错题」入口）
    const totalAll = await prisma.mistake.count({ where: { userId: req.userId } });

    // 4. 合并：学科作为内置分类，与用户自建分类出现在同一列表
    const merged = [
      ...list,
      ...subjects.map((s) => ({ ...s, builtin: true })),
    ];
    res.json({ code: 'OK', data: { list: merged, totalAll } });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ code: 'INVALID_PARAMS', message: '分类名称不能为空' });
    }
    const count = await prisma.category.count({ where: { userId: req.userId } });
    const cat = await prisma.category.create({
      data: {
        userId: req.userId,
        name: name.trim(),
        color: color || PALETTE[count % PALETTE.length],
        sortOrder: count,
      },
    });
    res.status(201).json({ code: 'OK', data: { id: cat.id, name: cat.name, color: cat.color, count: 0 } });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, color, sortOrder } = req.body;
    const existing = await prisma.category.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ code: 'NOT_FOUND', message: '分类不存在' });
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (color !== undefined) data.color = color;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    const cat = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json({ code: 'OK', data: { id: cat.id, name: cat.name, color: cat.color } });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.category.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ code: 'NOT_FOUND', message: '分类不存在' });
    // 该分类下的错题置为未分类（限定当前用户，防止越权影响其他用户数据）
    await prisma.mistake.updateMany({
      where: { categoryId: req.params.id, userId: req.userId },
      data: { categoryId: null },
    });
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ code: 'OK', message: '已删除' });
  } catch (err) { next(err); }
});

module.exports = router;

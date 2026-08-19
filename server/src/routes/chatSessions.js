/**
 * AI 答疑会话路由
 * ---------------------------------------------------------
 * GET    /api/v1/chat-sessions             — 当前用户所有会话列表
 * POST   /api/v1/chat-sessions             — 创建新会话（可指定 title）
 * GET    /api/v1/chat-sessions/:id         — 单会话（含消息）
 * PUT    /api/v1/chat-sessions/:id         — 修改标题
 * DELETE /api/v1/chat-sessions/:id         — 删除会话（级联删除消息）
 * POST   /api/v1/chat-sessions/:id/messages — 追加消息 + 触发 AI 回复
 */
const express = require('express');
const prisma = require('../services/prisma');
const aiService = require('../services/aiService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// 获取会话列表
router.get('/', async (req, res, next) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
    res.json({ code: 'OK', data: { list: sessions } });
  } catch (err) { next(err); }
});

// 创建新会话
router.post('/', async (req, res, next) => {
  try {
    const { title } = req.body || {};
    const session = await prisma.chatSession.create({
      data: { userId: req.userId, title: title || '新对话' },
    });
    res.status(201).json({ code: 'OK', data: { session } });
  } catch (err) { next(err); }
});

// 获取会话详情（含消息）
router.get('/:id', async (req, res, next) => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) return res.status(404).json({ code: 'NOT_FOUND', message: '会话不存在' });
    res.json({ code: 'OK', data: { session } });
  } catch (err) { next(err); }
});

// 修改标题
router.put('/:id', async (req, res, next) => {
  try {
    const { title } = req.body || {};
    const session = await prisma.chatSession.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { title },
    });
    if (session.count === 0) return res.status(404).json({ code: 'NOT_FOUND', message: '会话不存在' });
    res.json({ code: 'OK', message: '已更新' });
  } catch (err) { next(err); }
});

// 删除会话
router.delete('/:id', async (req, res, next) => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!session) return res.status(404).json({ code: 'NOT_FOUND', message: '会话不存在' });
    // 级联删除消息
    await prisma.chatMessage.deleteMany({ where: { sessionId: req.params.id } });
    await prisma.chatSession.delete({ where: { id: req.params.id } });
    res.json({ code: 'OK', message: '已删除' });
  } catch (err) { next(err); }
});

// 发送消息（追加用户消息 + 触发 AI 回复 + 追加 AI 消息）
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { content } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ code: 'INVALID_PARAMS', message: '消息内容不能为空' });
    }

    // 验证会话归属
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) return res.status(404).json({ code: 'NOT_FOUND', message: '会话不存在' });

    // 1. 保存用户消息
    const userMsg = await prisma.chatMessage.create({
      data: { sessionId: req.params.id, role: 'user', content: content.trim() },
    });

    // 2. 构建完整上下文（历史消息 + 当前用户消息）
    const history = [...session.messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 3. 调用 AI（带 RAG 错题召回）；失败时兜底提示，确保上下文不丢失
    let reply;
    try {
      reply = await aiService.chatWithAI(history, req.userId);
    } catch (err) {
      console.error('[AI回复失败]', err.message);
      reply = '抱歉，答疑服务暂时不可用，请稍后再试。';
    }

    // 4. 保存 AI 回复
    const aiMsg = await prisma.chatMessage.create({
      data: { sessionId: req.params.id, role: 'assistant', content: reply },
    });

    // 5. 自动更新会话标题（首条用户消息前 20 字）
    if (session.messages.length === 0) {
      const title = content.trim().slice(0, 20);
      await prisma.chatSession.update({
        where: { id: req.params.id },
        data: { title },
      });
    }

    const active = aiService.getActiveConfig();
    res.json({
      code: 'OK',
      data: {
        userMessage: userMsg,
        aiMessage: aiMsg,
        mode: active.apiKey ? 'llm' : 'demo',
        model: active.model,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
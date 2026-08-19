/**
 * AI 答疑对话路由
 * POST /api/v1/chat  body: { messages: [{role, content}] }
 * 返回 { code, data: { reply, mode } }  mode = 'llm' | 'demo'
 */
const express = require('express');
const aiService = require('../services/aiService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res, next) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ code: 'INVALID_PARAMS', message: 'messages 不能为空' });
    }
    const reply = await aiService.chatWithAI(messages, req.userId);
    const active = aiService.getActiveConfig();
    res.json({
      code: 'OK',
      data: {
        reply,
        mode: active.apiKey ? 'llm' : 'demo',
        model: active.model,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;

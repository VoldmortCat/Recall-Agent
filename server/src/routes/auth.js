/**
 * 认证路由
 * POST /api/v1/auth/register  - 手机号注册
 * POST /api/v1/auth/login     - 手机号登录
 * POST /api/v1/auth/wechat    - 微信登录
 * GET  /api/v1/auth/profile   - 获取用户信息
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');
const config = require('../config');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 注册
router.post('/register', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ code: 'INVALID_PARAMS', message: '手机号不能为空' });
    }

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return res.status(409).json({ code: 'PHONE_EXISTS', message: '该手机号已注册' });
    }

    const user = await prisma.user.create({ data: { phone } });
    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.status(201).json({ code: 'OK', data: { token, user: { id: user.id, phone: user.phone } } });
  } catch (err) { next(err); }
});

// 登录
router.post('/login', async (req, res, next) => {
  try {
    const { phone, code } = req.body; // code 为验证码（MVP阶段简化，直接验证）
    if (!phone) {
      return res.status(400).json({ code: 'INVALID_PARAMS', message: '手机号不能为空' });
    }

    // MVP阶段：验证码校验简化，直接登录
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', message: '用户不存在，请先注册' });
    }

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    res.json({ code: 'OK', data: { token, user: { id: user.id, phone: user.phone, nickname: user.nickname } } });
  } catch (err) { next(err); }
});

// 获取用户信息
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, phone: true, nickname: true, avatarUrl: true, createdAt: true },
    });
    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', message: '用户不存在' });
    }
    res.json({ code: 'OK', data: user });
  } catch (err) { next(err); }
});

module.exports = router;
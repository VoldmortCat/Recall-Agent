/**
 * /uploads 上传图片鉴权网关
 * ------------------------------------------------------------------
 * 上传的题目图片属于用户私密数据，必须由「图片所属用户本人」登录后才可访问。
 * - token 支持 Authorization header 或 ?token= 查询参数
 *   （`<img>` 标签无法携带 header，故允许 query 传参）
 * - 归属校验：图片作为某道错题的主图（mistakes.originalImage）
 *   或附图（mistake_images.imageUrl）且该错题属于当前用户
 */
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../services/prisma');

module.exports = async function uploadsGuard(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.query.token; // 兼容 <img> 无法带 header 的场景
    if (!token) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: '未提供认证令牌' });
    }

    let userId;
    try {
      userId = jwt.verify(token, config.jwt.secret).userId;
    } catch {
      return res.status(401).json({ code: 'TOKEN_INVALID', message: '认证令牌无效或已过期' });
    }
    if (!userId) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: '未提供认证令牌' });
    }

    // 归属校验（basename 归一化，防路径穿越）
    const filename = path.basename(req.path);
    const url = `/uploads/${filename}`;
    const [ownedMain, ownedAttach] = await Promise.all([
      prisma.mistake.count({ where: { userId, originalImage: url } }),
      prisma.mistakeImage.count({ where: { imageUrl: url, mistake: { userId } } }),
    ]);
    if (ownedMain + ownedAttach === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: '资源不存在' });
    }
    next();
  } catch (err) {
    next(err);
  }
};
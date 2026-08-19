const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const prisma = require('./services/prisma');
const chromaService = require('./services/chromaService');
const uploadsGuard = require('./middleware/uploadsGuard');

// 路由
const authRoutes = require('./routes/auth');
const mistakeRoutes = require('./routes/mistakes');
const categoryRoutes = require('./routes/categories');
const reviewRoutes = require('./routes/review');
const analysisRoutes = require('./routes/analysis');
const exportRoutes = require('./routes/export');
const chatRoutes = require('./routes/chat');
const chatSessionRoutes = require('./routes/chatSessions');
const settingsRoutes = require('./routes/settings');
const statsRoutes = require('./routes/stats');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件（上传目录）——带鉴权网关：图片仅所属用户本人可访问
app.use('/uploads', uploadsGuard, express.static(path.join(__dirname, '../uploads')));

// 路由注册
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/mistakes', mistakeRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/review', reviewRoutes);
app.use('/api/v1/analysis', analysisRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/chat-sessions', chatSessionRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/stats', statsRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || '服务器内部错误',
  });
});

/** 历史数据回填：把 serialNo=0 的旧错题按录入顺序补上自增编号 */
async function backfillSerialNumbers() {
  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    for (const u of users) {
      const zeros = await prisma.mistake.findMany({
        where: { userId: u.id, serialNo: 0 },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (!zeros.length) continue;
      const max = await prisma.mistake.aggregate({
        where: { userId: u.id },
        _max: { serialNo: true },
      });
      let no = max._max.serialNo || 0;
      for (const m of zeros) {
        no += 1;
        await prisma.mistake.update({ where: { id: m.id }, data: { serialNo: no } });
      }
      console.log(`[SerialNo] 用户 ${u.id} 回填 ${zeros.length} 道错题编号`);
    }
  } catch (err) {
    console.error('[SerialNo] 回填失败', err.message);
  }
}

app.listen(config.port, async () => {
  console.log(`[Recall] Server running on port ${config.port}`);
  console.log(`[Recall] Environment: ${config.nodeEnv}`);
  // 启动任务：编号回填 + RAG 索引重建（均不阻塞对外服务）
  await backfillSerialNumbers();
  chromaService.reindexAll();
});

module.exports = app;
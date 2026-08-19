require('dotenv').config();
const path = require('path');

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库（SQLite）
  databaseUrl: process.env.DATABASE_URL,

  // Redis（看板/缓存可选，核心流程不依赖）
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379/0',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 文件上传
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    dir: path.join(__dirname, '../../uploads'),
  },

  // OCR（可选，不可用时自动降级为占位文本）
  ocr: {
    serviceUrl: process.env.OCR_SERVICE_URL || 'http://localhost:5000/ocr',
  },

  // ChromaDB 向量检索服务（可选，不可用时降级为关键词相似度）
  chroma: {
    serviceUrl: process.env.CHROMA_SERVICE_URL || 'http://localhost:5001',
  },

  // ReportLab PDF 导出服务（可选，不可用时降级返回 JSON 数据）
  pdf: {
    serviceUrl: process.env.PDF_SERVICE_URL || 'http://localhost:5002/generate',
  },

  // AI 模块默认配置（可被运行时 /api/v1/settings 覆盖）
  // 兼容 OpenAI / DeepSeek / 通义 / 本地 Ollama 等任意 OpenAI 兼容接口
  // 说明：AI_API_KEY 若被显式设置（含空串）则优先于 DEEPSEEK_API_KEY，
  // 便于在无网/演示环境用 AI_API_KEY="" 强制走 Demo 兜底。
  ai: {
    provider: process.env.AI_PROVIDER || 'openai-compatible',
    apiKey: process.env.AI_API_KEY !== undefined ? process.env.AI_API_KEY : (process.env.DEEPSEEK_API_KEY || ''),
    baseUrl: process.env.AI_BASE_URL || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1',
    model: process.env.AI_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    temperature: 0.3,
  },

  // 运行时设置存储路径（settingsService 写入）
  settingsFile: path.join(__dirname, '../../data/settings.json'),

  // SM-2 复习算法
  sm2: {
    initialInterval: 1,
    easyFactor: 1.3,
  },
};

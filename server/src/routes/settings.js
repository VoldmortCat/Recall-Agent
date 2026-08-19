/**
 * AI 模型设置路由（运行时可切换，对应前端「API 模型设置」页）
 * GET  /api/v1/settings  -> 当前配置（apiKey 脱敏）
 * PUT  /api/v1/settings  -> 更新 { provider, model, apiKey, baseUrl }
 */
const express = require('express');
const { getSettings, saveSettings } = require('../services/settingsService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function maskKey(k) {
  if (!k) return '';
  if (k.length <= 8) return '****';
  return k.slice(0, 4) + '****' + k.slice(-4);
}

router.get('/', (req, res) => {
  const s = getSettings();
  res.json({
    code: 'OK',
    data: {
      provider: s.provider,
      model: s.model,
      baseUrl: s.baseUrl,
      apiKeyMasked: maskKey(s.apiKey),
      configured: Boolean(s.apiKey),
    },
  });
});

router.put('/', (req, res) => {
  const { provider, model, apiKey, baseUrl } = req.body || {};
  const next = saveSettings({ provider, model, apiKey, baseUrl });
  res.json({
    code: 'OK',
    message: '设置已保存',
    data: {
      provider: next.provider,
      model: next.model,
      baseUrl: next.baseUrl,
      apiKeyMasked: maskKey(next.apiKey),
      configured: Boolean(next.apiKey),
    },
  });
});

module.exports = router;

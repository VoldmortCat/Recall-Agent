/**
 * 运行时设置服务
 * 将 AI 模块配置（provider / model / apiKey / baseUrl）持久化到 data/settings.json，
 * 使前端「API 模型设置」页可随时切换模型，无需重启服务。
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

function ensureFile() {
  const dir = path.dirname(config.settingsFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(config.settingsFile)) {
    const seed = {
      provider: config.ai.provider,
      model: config.ai.model,
      apiKey: config.ai.apiKey,
      baseUrl: config.ai.baseUrl,
    };
    fs.writeFileSync(config.settingsFile, JSON.stringify(seed, null, 2), 'utf-8');
  }
}

function getSettings() {
  try {
    ensureFile();
    const raw = fs.readFileSync(config.settingsFile, 'utf-8');
    const data = JSON.parse(raw);
    // 与环境变量合并：环境变量优先级更高（便于容器/部署覆盖）
    return {
      provider: process.env.AI_PROVIDER || data.provider || config.ai.provider,
      model: process.env.AI_MODEL || data.model || config.ai.model,
      apiKey: process.env.AI_API_KEY || data.apiKey || config.ai.apiKey,
      baseUrl: process.env.AI_BASE_URL || data.baseUrl || config.ai.baseUrl,
    };
  } catch (err) {
    return {
      provider: config.ai.provider,
      model: config.ai.model,
      apiKey: config.ai.apiKey,
      baseUrl: config.ai.baseUrl,
    };
  }
}

function saveSettings(partial) {
  ensureFile();
  const current = getSettings();
  const next = {
    provider: partial.provider ?? current.provider,
    model: partial.model ?? current.model,
    apiKey: partial.apiKey ?? current.apiKey,
    baseUrl: partial.baseUrl ?? current.baseUrl,
  };
  fs.writeFileSync(config.settingsFile, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

module.exports = { getSettings, saveSettings };

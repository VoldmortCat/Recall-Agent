import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let app;

try {
  const mod = require('../../server/src/app.js');
  app = mod.default || mod;
} catch (err) {
  console.error('[EdgeOne] Failed to load Express app:', err);
  app = (req, res) => {
    res.status(500).json({
      code: 'CLOUD_FUNCTION_LOAD_ERROR',
      message: '服务器内部错误，无法加载应用',
    });
  };
}

export default app;
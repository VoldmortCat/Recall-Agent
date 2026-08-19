/** 验证：图片导入解析相关路径的用户隔离情况 */
const BASE = 'http://localhost:3000/api/v1';
const stamp = Date.now().toString().slice(-6);
const phone = `1370000${stamp}`;

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  // 1. 注册一个全新用户（0 错题）
  const reg = await api('/auth/register', { method: 'POST', body: { phone } });
  const tok = reg.json.data?.token;
  console.log('新用户注册:', reg.status, phone, 'token:', !!tok);

  // 2. 无任何错题的新用户，能看到的"知识图谱"节点（应来自其他用户图片/文字解析得到的全局知识节点）
  const kg = await api('/analysis/knowledge-graph', { token: tok });
  console.log('knowledge-graph 节点数:', kg.json.data?.nodes?.length);
  console.log('节点名称示例:', (kg.json.data?.nodes || []).slice(0, 8).map((n) => n.name).join(', '));

  // 3. 热力图（应只含自己的 userKnowledge）
  const hm = await api('/analysis/heatmap', { token: tok });
  console.log('heatmap 条数(应=0):', hm.json.data?.length);

  // 4. 无 token 访问上传图片（应被拒才算隔离）
  const img = '/uploads/0a8060e7-05bf-437e-b9ab-4cd364b45b5b.png';
  const raw = await fetch('http://localhost:3000' + img);
  console.log('匿名访问 /uploads/xxx 状态码:', raw.status, raw.headers.get('content-type'));

  // 清理
  await api('/auth/profile', { token: tok });
})().catch((e) => { console.error('异常:', e.message); });
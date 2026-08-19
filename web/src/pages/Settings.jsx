import { useEffect, useState } from 'react';
import { KeyRound, Server, Cpu, Save, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import { settingsApi } from '../api';
import { toast } from '../ui.jsx';

export default function SettingsPage() {
  const [form, setForm] = useState({ provider: 'openai-compatible', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1', apiKey: '' });
  const [masked, setMasked] = useState('');
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyTouched, setKeyTouched] = useState(false);

  useEffect(() => {
    settingsApi.get().then((r) => {
      setForm((f) => ({ ...f, model: r.data.model, baseUrl: r.data.baseUrl, provider: r.data.provider || 'openai-compatible' }));
      setMasked(r.data.apiKeyMasked || '');
      setConfigured(r.data.configured);
    }).catch(() => {});
  }, []);

  const save = async () => {
    if (!form.baseUrl.trim()) return toast('Base URL 不能为空', 'error');
    setSaving(true);
    try {
      const payload = { provider: form.provider, model: form.model, baseUrl: form.baseUrl };
      if (keyTouched && form.apiKey) payload.apiKey = form.apiKey; // 仅当用户填写了新 key 才更新
      const r = await settingsApi.save(payload);
      setMasked(r.data.apiKeyMasked);
      setConfigured(r.data.configured);
      setKeyTouched(false);
      setForm((f) => ({ ...f, apiKey: '' }));
      toast('设置已保存', 'success');
    } catch (e) { toast(e.message || '保存失败', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="page-title">API 模型设置</h1>
      <p className="page-sub">配置用于错题解析与 AI 答疑的大模型。支持任意 OpenAI 兼容接口（DeepSeek / OpenAI / 通义 / 本地 Ollama）。</p>

      <div className={`card card-pad ${configured ? '' : ''}`} style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 10, marginBottom: 4 }}>
          {configured ? <CheckCircle2 color="var(--success)" size={18} /> : <AlertTriangle color="var(--warning)" size={18} />}
          <b>当前状态：</b>
          <span style={{ color: configured ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
            {configured ? '已连接大模型（真实 AI 解析已启用）' : '未配置 Key · 当前使用内置 Demo 解析'}
          </span>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>已保存的 Key：<span className="kbd">{masked || '（无）'}</span></p>
      </div>

      <div className="card card-pad col" style={{ gap: 18 }}>
        <Field icon={Cpu} label="模型名称" hint="如 deepseek-chat、gpt-4o、qwen-plus">
          <input className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="deepseek-chat" />
        </Field>
        <Field icon={KeyRound} label="API Key" hint="留空表示不修改；仅在你填入新值时更新">
          <input className="input" type="password" value={form.apiKey} onChange={(e) => { setForm({ ...form, apiKey: e.target.value }); setKeyTouched(true); }} placeholder={masked ? `当前：${masked}（留空保持不变）` : 'sk-...'} />
        </Field>
        <Field icon={Server} label="Base URL" hint="OpenAI 兼容的 chat/completions 前缀地址">
          <input className="input" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.deepseek.com/v1" />
        </Field>
        <Field icon={Cpu} label="Provider" hint="仅用于标识，不影响调用">
          <input className="input" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
        </Field>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn" onClick={() => { setForm({ provider: 'openai-compatible', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1', apiKey: '' }); setKeyTouched(true); }}>
            <RotateCcw size={15} /> 恢复默认
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? <span className="spinner" /> : <><Save size={15} /> 保存设置</>}
          </button>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <b style={{ fontSize: 13 }}>💡 使用说明</b>
        <ul className="muted" style={{ fontSize: 12.5, margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.9 }}>
          <li>配置后，录入错题会自动调用大模型进行学科/知识点/错因解析；AI 答疑也会走真实模型。</li>
          <li>未配置 Key 时，系统使用内置「学科感知 Demo 解析」保证功能可用，适合先体验流程。</li>
          <li>所有密钥仅保存在本地服务端 <span className="kbd">data/settings.json</span>，不会随请求外发。</li>
        </ul>
      </div>
    </div>
  );
}

function Field({ icon: I, label, hint, children }) {
  return (
    <div>
      <div className="row" style={{ gap: 8, marginBottom: 6 }}>
        <I size={15} color="var(--text-3)" />
        <b style={{ fontSize: 13 }}>{label}</b>
      </div>
      {children}
      {hint && <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

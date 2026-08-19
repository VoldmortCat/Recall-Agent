import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../store/auth';
import { toast } from '../ui.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('123456');
  const [loading, setLoading] = useState(false);

  const doRegister = async () => {
    if (!/^1\d{10}$/.test(phone)) return toast('请输入 11 位手机号', 'error');
    setLoading(true);
    try {
      await register(phone);
      toast('注册成功，已自动登录', 'success');
      navigate('/mistakes');
    } catch (e) { toast(e.message || '注册失败', 'error'); }
    finally { setLoading(false); }
  };
  const doLogin = async () => {
    if (!/^1\d{10}$/.test(phone)) return toast('请输入 11 位手机号', 'error');
    setLoading(true);
    try {
      await login(phone, code);
      toast('登录成功', 'success');
      navigate('/mistakes');
    } catch (e) { toast(e.message || '登录失败', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--gradient-soft)' }}>
      <div className="card card-pad" style={{ width: 400, boxShadow: 'var(--shadow-lg)' }}>
        <div className="row" style={{ gap: 12, marginBottom: 6 }}>
          <div className="brand-logo" style={{ width: 44, height: 44, fontSize: 24 }}>📘</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Recall</div>
            <div className="muted" style={{ fontSize: 12 }}>AI 智能错题本</div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          拍照录入 · AI 解析 · 间隔复习 · 数据看板，让错题管理更聪明。
        </p>
        <div className="col" style={{ marginTop: 20, gap: 12 }}>
          <div>
            <label className="muted" style={{ fontSize: 12 }}>手机号</label>
            <input className="input" style={{ marginTop: 5 }} placeholder="11 位手机号" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="muted" style={{ fontSize: 12 }}>验证码（演示环境直接通过）</label>
            <input className="input" style={{ marginTop: 5 }} placeholder="验证码" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={loading} onClick={doLogin} style={{ justifyContent: 'center' }}>
            {loading ? <span className="spinner" /> : <>登录 <ArrowRight size={16} /></>}
          </button>
          <button className="btn" style={{ justifyContent: 'center' }} onClick={doRegister}>
            <Sparkles size={16} /> 新用户注册并登录
          </button>
        </div>
        <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 16 }}>
          演示提示：任意 11 位手机号均可注册；未配置 AI Key 时使用内置 Demo 解析。
        </p>
      </div>
    </div>
  );
}

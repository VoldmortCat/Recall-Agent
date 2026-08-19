import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, MessageSquare, BarChart3, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from './store/auth';
import Mistakes from './pages/Mistakes.jsx';
import Chat from './pages/Chat.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SettingsPage from './pages/Settings.jsx';
import Help from './pages/Help.jsx';
import Login from './pages/Login.jsx';

const NAV = [
  { to: '/mistakes', icon: BookOpen, label: '错题集' },
  { to: '/chat', icon: MessageSquare, label: 'AI答疑' },
  { to: '/dashboard', icon: BarChart3, label: '数据看板' },
  { to: '/settings', icon: Settings, label: '设置' },
  { to: '/help', icon: HelpCircle, label: '帮助' },
];

function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">📘</div>
          <span>Recall <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 13 }}>AI 智能错题本</span></span>
        </div>

        <nav className="top-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `top-nav-item ${isActive ? 'active' : ''}`}>
              <n.icon />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="row" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 8, paddingRight: 12, borderRight: '1px solid var(--border)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
              {(user?.nickname || user?.phone || 'U').slice(0, 1)}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{user?.nickname || user?.phone}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/login'); }} title="退出登录"><LogOut size={16} /></button>
        </div>
      </header>

      <div className="app-body">
        <main className="main" key={loc.pathname}>
          <Routes>
            <Route path="/mistakes" element={<Mistakes />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<Navigate to="/mistakes" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { ready, user } = useAuth();
  if (!ready) return <div className="center-empty"><div className="spinner" /></div>;
  if (!user) return <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to="/login" />} /></Routes>;
  return <Routes>
    <Route path="/login" element={<Navigate to="/mistakes" />} />
    <Route path="/*" element={<AppShell />} />
  </Routes>;
}

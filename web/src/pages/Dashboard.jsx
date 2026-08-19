import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { BookOpen, Repeat, Target, Clock, TrendingUp } from 'lucide-react';
import { statsApi } from '../api';
import { toast } from '../ui.jsx';

const COLORS = ['#6366f1', '#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    statsApi.get().then((r) => setData(r.data)).catch((e) => toast(e.message || '加载失败', 'error'));
  }, []);

  if (!data) return <div className="center-empty" style={{ paddingTop: 80 }}><span className="spinner" /></div>;

  const m = data.mastery;
  const masteredRate = data.totalMistakes ? Math.round((m.mastered / data.totalMistakes) * 100) : 0;

  const stats = [
    { label: '题目总数', value: data.totalMistakes, icon: BookOpen, color: '#6366f1', bg: '#eef2ff' },
    { label: '累计复习次数', value: data.review.total, icon: Repeat, color: '#0ea5e9', bg: '#e0f2fe' },
    { label: '错题成功率', value: `${data.review.successRate}%`, icon: Target, color: '#22c55e', bg: '#dcfce7' },
    { label: '待复习', value: data.dueReviews, icon: Clock, color: '#f59e0b', bg: '#fef3c7' },
  ];

  return (
    <div>
      <h1 className="page-title">数据看板</h1>
      <p className="page-sub">你的学习画像：共 {data.totalMistakes} 道错题，已掌握 {masteredRate}%，待复习 {data.dueReviews} 道</p>

      {/* 指标卡 */}
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="ic" style={{ background: s.bg, color: s.color }}><s.icon size={20} /></div>
            <div className="v">{s.value}</div>
            <div className="l">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 掌握度分布 + 学科分布 */}
      <div className="chart-row" style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <b style={{ fontSize: 14 }}>掌握度分布</b>
          <div className="row" style={{ gap: 16, marginTop: 16 }}>
            {[['待掌握', m.pending, '#f59e0b'], ['学习中', m.learning, '#0ea5e9'], ['待复习', m.reviewing, '#f97316'], ['已纠错', m.corrected, '#8b5cf6'], ['已掌握', m.mastered, '#22c55e']].map(([name, val, c]) => (
              <div key={name} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: c }}>{val || 0}</div>
                <div className="muted" style={{ fontSize: 12 }}>{name}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 10, borderRadius: 6, background: 'var(--surface-2)', marginTop: 16, overflow: 'hidden', display: 'flex' }}>
            {[m.pending, m.learning, m.reviewing, m.corrected, m.mastered].map((v, i) => (
              <div key={i} style={{ width: `${data.totalMistakes ? (v / data.totalMistakes) * 100 : 0}%`, background: ['#f59e0b', '#0ea5e9', '#f97316', '#8b5cf6', '#22c55e'][i] }} />
            ))}
          </div>
        </div>
        <div className="chart-card">
          <b style={{ fontSize: 14 }}>各学科错题分布</b>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.bySubject} layout="vertical" margin={{ left: 20, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="subject" width={48} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {data.bySubject.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 最近一个月趋势 */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="row" style={{ gap: 6, marginBottom: 8 }}><TrendingUp size={15} color="var(--primary)" /><b style={{ fontSize: 14 }}>最近一个月错题录入趋势</b></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.dailyEntries} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="row" style={{ gap: 6, marginBottom: 8 }}><Repeat size={15} color="var(--info)" /><b style={{ fontSize: 14 }}>最近一个月复习情况</b></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.dailyReviews} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

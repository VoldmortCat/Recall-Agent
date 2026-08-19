import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, MessageSquare, Trash2, Sparkles, Bot } from 'lucide-react';
import { chatSessionApi } from '../api';
import { toast } from '../ui.jsx';

const SUGGESTIONS = [
  '帮我讲解这个错题的知识点',
  '我该怎么制定本周复习计划？',
  '为什么我总在同一个知识点上出错？',
  '用通俗的话解释一下「遗忘曲线」',
];

export default function Chat() {
  const [sessions, setSessions] = useState([]); // [{id, title, messages:[{role,content}]}]
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const active = sessions.find((s) => s.id === activeId);

  // 加载会话列表
  useEffect(() => {
    (async () => {
      try {
        const r = await chatSessionApi.list();
        setSessions(r.data.list);
        if (r.data.list.length > 0) setActiveId(r.data.list[0].id);
      } catch (e) {
        console.error('加载会话失败', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 切换活跃会话时加载详情
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const r = await chatSessionApi.get(activeId);
        setSessions((prev) => prev.map((s) => (s.id === activeId ? r.data.session : s)));
      } catch (e) {
        console.error('加载会话详情失败', e);
      }
    })();
  }, [activeId]);

  // 滚动到底部
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active?.messages, sending]);

  const newConv = async () => {
    try {
      const r = await chatSessionApi.create();
      const session = r.data.session;
      setSessions((prev) => [{ ...session, messages: [] }, ...prev]);
      setActiveId(session.id);
    } catch (e) {
      toast('创建对话失败', 'error');
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    let cid = activeId;
    if (!cid) {
      // 没有活跃会话时先自动创建
      try {
        const r = await chatSessionApi.create();
        const session = r.data.session;
        setSessions((prev) => [{ ...session, messages: [] }, ...prev]);
        setActiveId(session.id);
        cid = session.id;
      } catch (e) {
        toast('创建对话失败', 'error');
        return;
      }
    }

    // 乐观更新 UI：添加用户消息
    const tempUserMsg = { id: 'temp-' + Date.now(), role: 'user', content: text };
    setSessions((prev) => prev.map((s) => s.id === cid ? { ...s, messages: [...(s.messages || []), tempUserMsg] } : s));
    setInput('');
    setSending(true);

    try {
      const r = await chatSessionApi.sendMessage(cid, text);
      // 用真实数据替换
      setSessions((prev) => prev.map((s) => {
        if (s.id !== cid) return s;
        const msgs = s.messages || [];
        // 替换最后一个用户消息为真实数据
        const updated = msgs.slice(0, -1);
        updated.push(r.data.userMessage, r.data.aiMessage);
        // 更新标题（如果被自动更新了）
        const title = s.messages.length === 1 ? text.slice(0, 20) : s.title;
        return { ...s, messages: updated, title };
      }));
    } catch (e) {
      toast(e.message || '请求失败', 'error');
      setSessions((prev) => prev.map((s) => s.id === cid ? { ...s, messages: [...(s.messages || []), { id: 'temp-err', role: 'assistant', content: '⚠️ 连接失败，请稍后重试。' }] } : s));
    } finally {
      setSending(false);
    }
  };

  const delConv = async (id, e) => {
    e.stopPropagation();
    try {
      await chatSessionApi.remove(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (e) {
      toast('删除失败', 'error');
    }
  };

  return (
    <div className="split" style={{ height: 'calc(100vh - 60px)' }}>
      {/* 左侧会话列表 */}
      <aside className="chat-list">
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }} onClick={newConv}>
          <Plus size={15} /> 新建对话
        </button>
        {loading ? (
          <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 20 }}>加载中...</p>
        ) : sessions.length === 0 ? (
          <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 20 }}>暂无对话<br />点击上方新建</p>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className={`cat-item ${s.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(s.id)}>
              <MessageSquare size={15} />
              <span className="chat-title-text">{s.title}</span>
              <button className="btn btn-ghost btn-sm" style={{ padding: 2 }} onClick={(e) => delConv(s.id, e)}><Trash2 size={12} /></button>
            </div>
          ))
        )}
      </aside>

      {/* 右侧聊天区 */}
      <section className="chat-area">
        {!active ? (
          <div className="center-empty">
            <div>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--gradient)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: '#fff' }}><Bot size={30} /></div>
              <h2 style={{ margin: '0 0 6px' }}>Recall AI 答疑助手</h2>
              <p className="muted" style={{ maxWidth: 360 }}>把不会的题、知识盲区发给我。我可以分步解析错题、梳理知识点、制定复习计划。</p>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 18 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="btn btn-sm" onClick={async () => {
                    const r = await chatSessionApi.create();
                    setSessions((prev) => [{ ...r.data.session, messages: [] }, ...prev]);
                    setActiveId(r.data.session.id);
                    setInput(s);
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="chat-wrap">
            <div className="chat-scroll" ref={scrollRef}>
              {(active.messages || []).map((msg, i) => (
                <div key={msg.id || i} className={`msg ${msg.role === 'user' ? 'msg-user' : 'msg-ai'}`}>{msg.content}</div>
              ))}
              {sending && <div className="msg msg-ai"><span className="spinner" /></div>}
            </div>
            <div className="chat-input">
              <textarea className="textarea" style={{ minHeight: 44 }} placeholder="输入你的问题，Enter 发送 / Shift+Enter 换行" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <button className="btn btn-primary" disabled={sending || !input.trim()} onClick={send} style={{ alignSelf: 'flex-end' }}>
                <Send size={16} /> 发送
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
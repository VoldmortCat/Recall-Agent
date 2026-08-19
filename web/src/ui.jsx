import React, { useState } from 'react';
import { X } from 'lucide-react';

/* ---------- Toast ---------- */
export function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  if (type === 'error') el.style.background = '#ef4444';
  if (type === 'success') el.style.background = '#16a34a';
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, 2200);
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <b style={{ fontSize: 16 }}>{title}</b>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
        {footer && <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18, gap: 10 }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Confirm ---------- */
export function useConfirm() {
  const [cfg, setCfg] = useState(null);
  const ConfirmComp = cfg ? (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && setCfg(null)}>
      <div className="modal" style={{ width: 380 }}>
        <b style={{ fontSize: 16 }}>{cfg.title}</b>
        <p className="muted" style={{ marginTop: 10 }}>{cfg.message}</p>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18, gap: 10 }}>
          <button className="btn" onClick={() => setCfg(null)}>取消</button>
          <button className="btn btn-danger" onClick={() => { cfg.onOk(); setCfg(null); }}>确定</button>
        </div>
      </div>
    </div>
  ) : null;
  const confirm = (title, message, onOk) => new Promise((res) => setCfg({ title, message, onOk: () => { onOk(); res(true); } }));
  return { ConfirmComp, confirm };
}

/* ---------- 标签 ---------- */
export function MasteryTag({ status }) {
  const map = {
    pending: { cls: 'tag-pending', label: '待掌握' },
    learning: { cls: 'tag-learning', label: '学习中' },
    reviewing: { cls: 'tag-reviewing', label: '需复习' },
    corrected: { cls: 'tag-corrected', label: '已纠错' },
    mastered: { cls: 'tag-mastered', label: '已掌握' },
  };
  const m = map[status] || map.pending;
  return <span className={`tag ${m.cls}`}>{m.label}</span>;
}

export function SubjectTag({ subject }) {
  return <span className="tag tag-subject">{subject || '未分类'}</span>;
}

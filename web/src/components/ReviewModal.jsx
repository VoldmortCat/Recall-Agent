import { useEffect, useState } from 'react';
import { reviewApi } from '../api';
import { assetUrl } from '../api/client.js';
import { toast } from '../ui.jsx';

export default function ReviewModal({ onClose }) {
  const [list, setList] = useState(null);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    reviewApi.today().then((r) => setList(r.data.list)).catch(() => setList([]));
  }, []);

  if (list === null) return <div className="modal-mask"><div className="spinner" /></div>;

  const done = idx >= list.length;
  const cur = list[idx];

  const submit = async (quality) => {
    if (!cur) return;
    setSubmitting(true);
    try {
      await reviewApi.submit(cur.mistakeId, quality);
      toast(quality === 2 ? '记得 ✓ 已拉长复习间隔' : quality === 1 ? '模糊，已安排近期复习' : '忘记，已缩短复习间隔', 'success');
      setShowAnswer(false);
      setIdx(idx + 1);
    } catch (e) { toast(e.message || '提交失败', 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 540 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <b style={{ fontSize: 17 }}>📚 间隔复习</b>
          <span className="muted">{list.length ? `第 ${Math.min(idx + 1, list.length)} / ${list.length} 题` : ''}</span>
        </div>

        {list.length === 0 && <p className="muted" style={{ padding: '30px 0', textAlign: 'center' }}>🎉 今日没有待复习的错题，继续保持！</p>}

        {!done && cur && (
          <>
            <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <span className="tag tag-subject">{cur.mistake?.subject}</span>
                {(cur.mistake?.knowledgePoints ? JSON.parse(cur.mistake.knowledgePoints || '[]') : []).map((k, i) => <span key={i} className="tag tag-kp">{k}</span>)}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6 }}>
                {cur.mistake?.ocrText || '（题目文字待识别，可查看原图）'}
              </div>
              {cur.mistake?.originalImage && (
                <img src={assetUrl(cur.mistake.originalImage)} alt="原题" style={{ maxWidth: '100%', marginTop: 10, borderRadius: 8, border: '1px solid var(--border)' }} />
              )}
            </div>

            {showAnswer ? (
              <div className="mistake-analysis" style={{ marginTop: 14 }}>
                <b style={{ color: 'var(--primary)' }}>🤖 AI 解析：</b>{cur.mistake?.analysis || '（暂无解析）'}
              </div>
            ) : (
              <button className="btn" style={{ marginTop: 14 }} onClick={() => setShowAnswer(true)}>显示解析 / 答案</button>
            )}

            <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>还记得这道题怎么做吗？</p>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-danger" disabled={submitting} style={{ flex: 1, justifyContent: 'center' }} onClick={() => submit(0)}>😵 忘记</button>
              <button className="btn" disabled={submitting} style={{ flex: 1, justifyContent: 'center' }} onClick={() => submit(1)}>🤔 模糊</button>
              <button className="btn btn-primary" disabled={submitting} style={{ flex: 1, justifyContent: 'center' }} onClick={() => submit(2)}>😎 记得</button>
            </div>
          </>
        )}

        {done && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 40 }}>🎉</div>
            <p style={{ fontWeight: 600, fontSize: 16, marginTop: 8 }}>本轮复习完成</p>
            <p className="muted">系统已根据你的反馈更新每道题的复习计划（SM-2 间隔记忆）</p>
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

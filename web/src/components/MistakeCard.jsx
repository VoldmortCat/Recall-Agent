import { Pencil, Trash2, Repeat, Image as ImgIcon } from 'lucide-react';
import { MasteryTag, SubjectTag } from '../ui.jsx';

export default function MistakeCard({ m, onEdit, onDelete, onView }) {
  const subject = m.subject && m.subject !== 'unknown' ? m.subject : '未分类';
  // knowledgePoints 可能为 JSON 字符串或数组，统一转数组
  const kps = (() => {
    if (!m.knowledgePoints) return [];
    if (Array.isArray(m.knowledgePoints)) return m.knowledgePoints;
    try { return JSON.parse(m.knowledgePoints); } catch { return []; }
  })();
  const reviewCount = m._count?.reviewLogs || m.reviewCount || 0;
  const serialNo = m.serialNo || 0;
  const serialLabel = `#${String(serialNo).padStart(3, '0')}`;

  return (
    <div className="mistake-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="mistake-meta" style={{ marginBottom: 0 }}>
          <span className="tag tag-serial">{serialLabel}</span>
          <SubjectTag subject={subject} />
          {m.source && <span className="tag tag-diff">{m.source}</span>}
          <MasteryTag status={m.masteryStatus} />
          {m.difficulty && <span className="tag tag-diff">难度·{m.difficulty}</span>}
        </div>
        {m.category && <span className="cat-dot" style={{ background: m.category.color }} title={m.category.name} />}
      </div>

      <div className="mistake-q" onClick={() => onView?.(m)} title="点击查看详情">
        {m.ocrText || m.analysis || '（暂无题目内容）'}
      </div>

      {kps.length > 0 && (
        <div className="mistake-meta">
          {kps.map((k, i) => <span key={i} className="tag tag-kp">{k}</span>)}
        </div>
      )}

      {m.analysis && (
        <div className="mistake-analysis">
          <b style={{ color: 'var(--primary)' }}>🤖 AI 解析：</b>{m.analysis}
        </div>
      )}

      <div className="mistake-foot">
        <span className="review-pill"><Repeat size={14} /> 复习 {reviewCount} 次</span>
        <div className="card-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => onView?.(m)}><ImgIcon size={14} /> 详情</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit?.(m)}><Pencil size={14} /> 编辑</button>
          <button className="btn btn-ghost btn-sm btn-danger" onClick={() => onDelete?.(m)}><Trash2 size={14} /> 删除</button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Upload, PlayCircle, Download, Filter, Search, FileText, Trash2,
  Pencil, Check, X, FolderPlus, Sparkles, Link2,
} from 'lucide-react';
import { categoryApi, mistakeApi, exportApi } from '../api';
import { assetUrl } from '../api/client.js';
import { toast, Modal, useConfirm, MasteryTag, SubjectTag } from '../ui.jsx';
import MistakeCard from '../components/MistakeCard.jsx';
import ReviewModal from '../components/ReviewModal.jsx';

const SUBJECTS = ['数学', '物理', '化学', '英语', '语文', '生物', '历史', '地理', '政治'];

export default function Mistakes() {
  const [params] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [totalAll, setTotalAll] = useState(0);
  const [activeCat, setActiveCat] = useState('all');
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState(params.get('q') || '');
  const [subject, setSubject] = useState('');
  const [mastery, setMastery] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [newCat, setNewCat] = useState('');
  const { ConfirmComp, confirm } = useConfirm();

  const loadCats = useCallback(() => {
    categoryApi.list().then((r) => {
      setCategories(r.data.list || []);
      setTotalAll(r.data.totalAll ?? 0);
    }).catch(() => {});
  }, []);

  const loadList = useCallback(async (catOverride) => {
    setLoading(true);
    try {
      const catId = catOverride !== undefined ? catOverride : (activeCat === 'all' ? undefined : activeCat);
      const r = await mistakeApi.list({
        page, pageSize: 20, keyword: q || undefined,
        subject: subject || undefined, masteryStatus: mastery || undefined,
        categoryId: catId,
      });
      setList(r.data.list);
      setTotal(r.data.total);
    } catch (e) { toast(e.message || '加载失败', 'error'); }
    finally { setLoading(false); }
  }, [page, q, subject, mastery, activeCat]);

  useEffect(() => { loadCats(); }, [loadCats]);
  useEffect(() => { loadList(); }, [loadList]);

  const onDelete = async (m) => {
    await confirm('删除错题', `确定删除「${m.ocrText || '该错题'}」？此操作不可恢复。`, async () => {
      try { await mistakeApi.remove(m.id); toast('已删除', 'success'); loadList(); loadCats(); }
      catch (e) { toast(e.message || '删除失败', 'error'); }
    });
  };

  const onExport = async () => {
    try {
      toast('正在生成 PDF…');
      const r = await exportApi.pdf({
        excludeMastered: true,
        includeAnalysis: true,
        categoryId: activeCat === 'all' ? undefined : activeCat,
      });
      toast('PDF 已导出', 'success');
    } catch (e) {
      toast(e.message || '导出失败，PDF 服务未启用', 'error');
    }
  };

  const addCat = async () => {
    if (!newCat.trim()) return;
    try { await categoryApi.create(newCat.trim()); toast('分类已创建', 'success'); setNewCat(''); loadCats(); }
    catch (e) { toast(e.message || '创建失败', 'error'); }
  };
  const delCat = async (c) => {
    await confirm('删除分类', `删除「${c.name}」？其下错题将变为未分类。`, async () => {
      try { await categoryApi.remove(c.id); toast('已删除'); loadCats(); } catch (e) { toast(e.message); }
    });
  };

  return (
    <div className="split" style={{ height: 'calc(100vh - 60px)' }}>
      {/* 左侧分类导航 */}
      <aside className="cat-nav">
        <div className={`cat-item ${activeCat === 'all' && !subject ? 'active' : ''}`} onClick={() => { setActiveCat('all'); setSubject(''); setPage(1); }}>
          <span className="cat-dot" style={{ background: 'var(--primary)' }} /> 全部错题
          <span className="count">{totalAll}</span>
        </div>

        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <b style={{ fontSize: 14 }}>错题分类</b>
        </div>
        {categories.map((c) => {
          const isBuiltin = !!c.builtin;
          const isActive = isBuiltin ? subject === c.name : activeCat === c.id;
          return (
            <div
              key={c.id}
              className={`cat-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (isBuiltin) {
                  setSubject(subject === c.name ? '' : c.name);
                  setActiveCat('all');
                } else {
                  setActiveCat(activeCat === c.id ? 'all' : c.id);
                  setSubject('');
                }
                setPage(1);
              }}
            >
              <span className="cat-dot" style={{ background: c.color }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span className="count">{c.count}</span>
              {!isBuiltin && (
                <button className="btn btn-ghost btn-sm" style={{ padding: 2 }} onClick={(e) => { e.stopPropagation(); delCat(c); }}><Trash2 size={12} /></button>
              )}
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input className="input" style={{ padding: 6, fontSize: 12 }} placeholder="新建分类" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCat()} />
          <button className="btn btn-primary btn-sm" onClick={addCat}><FolderPlus size={14} /></button>
        </div>
      </aside>

      {/* 右侧主区 */}
      <section className="split-main">
        <h1 className="page-title">错题集</h1>
        <p className="page-sub">共 {total} 道错题 · 支持拍照 OCR 录入、AI 解析与间隔复习</p>

        {/* 操作栏 */}
        <div className="ops-bar">
          <div className="search">
            <Search size={15} />
            <input placeholder="搜索题目 / 知识点 / 学科" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} onKeyDown={(e) => e.key === 'Enter' && loadList()} />
          </div>
          <div className="ops-group">
            <select className="select" style={{ width: 110 }} value={subject} onChange={(e) => { setSubject(e.target.value); setPage(1); loadList(); }}>
              <option value="">全部学科</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="select" style={{ width: 120 }} value={mastery} onChange={(e) => { setMastery(e.target.value); setPage(1); loadList(); }}>
              <option value="">全部状态</option>
              <option value="pending">待掌握</option>
              <option value="learning">学习中</option>
              <option value="corrected">已纠错</option>
              <option value="mastered">已掌握</option>
            </select>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> 录入</button>
            <button className="btn" onClick={() => setShowReview(true)}><PlayCircle size={16} /> 开始复习</button>
            <button className="btn" onClick={onExport}><Download size={16} /> 导出</button>
          </div>
        </div>

        {/* 卡片列表 */}
        {loading ? <div className="center-empty"><span className="spinner" /></div>
          : list.length === 0 ? (
            <div className="center-empty" style={{ height: 300 }}>
              <div>
                <div style={{ fontSize: 40 }}>📭</div>
                <p>还没有错题，点击「录入」开始积累吧</p>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> 录入第一道错题</button>
              </div>
            </div>
          ) : (
            <div className="col" style={{ gap: 14 }}>
              {list.map((m) => (
                <MistakeCard key={m.id} m={m} onEdit={setShowEdit} onDelete={onDelete} onView={setShowDetail} />
              ))}
              {list.length < total && (
                <button className="btn" style={{ justifyContent: 'center' }} onClick={() => { setPage(page + 1); loadList(); }}>加载更多</button>
              )}
            </div>
          )}
      </section>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadList(); loadCats(); }} />}
      {showEdit && <EditModal m={showEdit} onClose={() => setShowEdit(null)} onSaved={() => { setShowEdit(null); loadList(); }} />}
      {showDetail && <DetailModal m={showDetail} onClose={() => setShowDetail(null)} onEdit={setShowEdit} />}
      {showReview && <ReviewModal onClose={() => { setShowReview(false); loadList(); }} />}
      {ConfirmComp}
    </div>
  );
}

/* ---------- 录入弹窗 ---------- */
function AddModal({ onClose, onSaved }) {
  const [tab, setTab] = useState('image');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);

  const pick = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (tab === 'image' && !file) return toast('请先选择题目图片', 'error');
    if (tab === 'text' && !text.trim()) return toast('请填写题目内容', 'error');
    setSaving(true);
    try {
      if (tab === 'image') {
        const up = await mistakeApi.upload(file);
        await mistakeApi.create({ imageUrl: up.data.imageUrl, source: '拍照录入', subject: subject || undefined });
        toast('已存入，AI 正在解析…', 'success');
      } else {
        await mistakeApi.create({ ocrText: text, subject: subject || undefined, source: '手动录入' });
        toast('已存入，AI 正在解析…', 'success');
      }
      onSaved();
    } catch (e) { toast(e.message || '保存失败', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="录入错题" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>取消</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? <span className="spinner" /> : '存入错题本'}</button></>}>
      <div className="row" style={{ gap: 8, marginBottom: 14 }}>
        <button className={`btn ${tab === 'image' ? 'btn-primary' : ''}`} onClick={() => setTab('image')}><Upload size={15} /> 拍照/上传</button>
        <button className={`btn ${tab === 'text' ? 'btn-primary' : ''}`} onClick={() => setTab('text')}><FileText size={15} /> 手动录入</button>
      </div>

      {tab === 'image' ? (
        <label className="card card-pad" style={{ display: 'block', textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed' }}>
          {preview
            ? <img src={preview} alt="预览" style={{ maxHeight: 220, borderRadius: 8 }} />
            : <div className="muted" style={{ padding: '30px 0' }}><Upload size={28} /><div style={{ marginTop: 8 }}>点击选择题目图片（JPG/PNG/WebP）</div></div>}
          <input type="file" accept="image/*" hidden onChange={pick} />
        </label>
      ) : (
        <textarea className="textarea" placeholder="粘贴题目内容，例如：已知函数 f(x)=2x²+3x-5，求 f(2) 的值。" value={text} onChange={(e) => setText(e.target.value)} />
      )}

      <div style={{ marginTop: 12 }}>
        <label className="muted" style={{ fontSize: 12 }}>学科（选填，不填则由 AI 识别）</label>
        <select className="select" style={{ marginTop: 5 }} value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">AI 自动识别</option>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
        <Sparkles size={12} style={{ verticalAlign: 'middle' }} /> 录入后系统将自动 OCR + AI 解析学科/知识点/错因，并生成复习计划。
      </p>
    </Modal>
  );
}

/* ---------- 编辑弹窗 ---------- */
function EditModal({ m, onClose, onSaved }) {
  // 兼容 knowledgePoints 为字符串或数组
  const initKps = (() => {
    if (!m.knowledgePoints) return [];
    if (Array.isArray(m.knowledgePoints)) return m.knowledgePoints;
    try { return JSON.parse(m.knowledgePoints); } catch { return []; }
  })();
  const [subject, setSubject] = useState(m.subject !== 'unknown' ? m.subject : '');
  const [kpsText, setKpsText] = useState(initKps.join('、'));
  const [errorType, setErrorType] = useState(m.errorType || '');
  const [difficulty, setDifficulty] = useState(m.difficulty || '');
  const [analysis, setAnalysis] = useState(m.analysis || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await mistakeApi.update(m.id, {
        subject: subject || 'unknown',
        knowledgePoints: kpsText.split('、').map((x) => x.trim()).filter(Boolean),
        errorType: errorType || undefined,
        difficulty: difficulty || undefined,
        analysis: analysis || undefined,
        masteryStatus: m.masteryStatus,
      });
      toast('已保存', 'success');
      onSaved();
    } catch (e) { toast(e.message || '保存失败', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="编辑错题" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>取消</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? <span className="spinner" /> : '保存'}</button></>}>
      <div className="col" style={{ gap: 12 }}>
        <div><label className="muted" style={{ fontSize: 12 }}>学科</label>
          <select className="select" style={{ marginTop: 5 }} value={subject} onChange={(e) => setSubject(e.target.value)}>
            {['unknown', ...SUBJECTS].map((s) => <option key={s} value={s}>{s === 'unknown' ? '未分类' : s}</option>)}
          </select></div>
        <div><label className="muted" style={{ fontSize: 12 }}>知识点（用「、」分隔，可删除不想要的）</label>
          <input className="input" style={{ marginTop: 5 }} value={kpsText} onChange={(e) => setKpsText(e.target.value)} /></div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="muted" style={{ fontSize: 12 }}>错因</label>
            <input className="input" style={{ marginTop: 5 }} value={errorType} onChange={(e) => setErrorType(e.target.value)} placeholder="如 概念模糊" /></div>
          <div style={{ flex: 1 }}><label className="muted" style={{ fontSize: 12 }}>难度</label>
            <select className="select" style={{ marginTop: 5 }} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">—</option><option>易</option><option>中</option><option>难</option>
            </select></div>
        </div>
        <div><label className="muted" style={{ fontSize: 12 }}>AI 解析</label>
          <textarea className="textarea" style={{ marginTop: 5 }} value={analysis} onChange={(e) => setAnalysis(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

/* ---------- 详情弹窗（含相似错题·ChromaDB 向量检索） ---------- */
function DetailModal({ m, onClose, onEdit }) {
  // 兼容 knowledgePoints 为字符串或数组
  const kps = (() => {
    if (!m.knowledgePoints) return [];
    if (Array.isArray(m.knowledgePoints)) return m.knowledgePoints;
    try { return JSON.parse(m.knowledgePoints); } catch { return []; }
  })();
  const [similar, setSimilar] = useState(null);
  useEffect(() => {
    const q = m.ocrText || m.analysis || m.subject;
    if (!q) return setSimilar([]);
    mistakeApi.similar(q, m.id, 5).then((r) => setSimilar(r.data.list)).catch(() => setSimilar([]));
  }, [m]);

  return (
    <Modal title="错题详情" onClose={onClose} footer={<><button className="btn" onClick={() => { onEdit(m); onClose(); }}>编辑</button><button className="btn btn-primary" onClick={onClose}>关闭</button></>}>
      <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span className="tag tag-serial">#{String(m.serialNo || 0).padStart(3, '0')}</span>
        <SubjectTag subject={m.subject !== 'unknown' ? m.subject : '未分类'} />
        <MasteryTag status={m.masteryStatus} />
        {m.source && <span className="tag tag-diff">{m.source}</span>}
        <span className="review-pill"><Repeat0 /> 复习 {m.reviewCount || 0} 次</span>
      </div>
      {m.originalImage && <img src={assetUrl(m.originalImage)} alt="原题" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 10 }} />}
      <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.6 }}>{m.ocrText || '（无题目文本）'}</div>
      {(kps).length > 0 && (
        <div className="mistake-meta" style={{ marginTop: 10 }}>
          {kps.map((k, i) => <span key={i} className="tag tag-kp">{k}</span>)}
        </div>
      )}
      {m.analysis && <div className="mistake-analysis" style={{ marginTop: 12 }}><b style={{ color: 'var(--primary)' }}>🤖 AI 解析：</b>{m.analysis}</div>}

      <div className="divider" />
      <div className="row" style={{ gap: 6, marginBottom: 8 }}><Link2 size={15} color="var(--primary)" /><b style={{ fontSize: 13 }}>相似错题（向量检索）</b></div>
      {similar === null ? <span className="spinner" /> : similar.length === 0 ? <p className="muted" style={{ fontSize: 12 }}>暂无相似错题</p> :
        <div className="col" style={{ gap: 8 }}>
          {similar.map((s) => (
            <div key={s.id} className="card card-pad" style={{ padding: 10 }}>
              <div style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.ocrText || s.analysis}</div>
              <div className="row" style={{ gap: 6, marginTop: 4 }}><SubjectTag subject={s.subject} /></div>
            </div>
          ))}
        </div>}
    </Modal>
  );
}

function Repeat0() { return <span className="review-pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 01-4 4H3"/></svg></span>; }

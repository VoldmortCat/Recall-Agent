import { BookOpen, Upload, Repeat, MessageSquare, Settings, Download, Camera, Keyboard } from 'lucide-react';

const SECTIONS = [
  { id: 'intro', icon: BookOpen, title: '产品简介', body: [
    'Recall 是一款面向学生的 AI 智能错题管理平台，帮助你用最少的操作完成错题的「录入 → 整理 → 分析 → 复习」闭环。',
    '核心能力：拍照/OCR 录入、AI 自动解析（学科/知识点/错因）、基于遗忘曲线的间隔复习、数据看板与相似错题检索。',
  ] },
  { id: 'entry', icon: Camera, title: '1. 错题录入', body: [
    '进入「错题集」页，点击右上角「录入」。',
    '拍照/上传：选择题目图片，系统自动 OCR 识别文字，并调用 AI 解析学科、知识点与错因，生成复习计划。',
    '手动录入：直接粘贴题目文本（可指定学科），适合无图片或纯文本场景。',
    '录入后错题会出现在列表，AI 解析为异步执行，稍等片刻即可看到解析结果。',
  ] },
  { id: 'category', icon: BookOpen, title: '2. 分类管理', body: [
    '左侧「错题分类」栏可新建任意分类（如「期中复习」「函数专题」）。',
    '点击分类即可筛选该分类下的错题；删除分类不会删除错题，仅将其归为「未分类」。',
    '在录入或编辑错题时可指定所属分类，便于按专题集中复习。',
  ] },
  { id: 'review', icon: Repeat, title: '3. 间隔复习', body: [
    '点击「开始复习」，系统按 SM-2 遗忘曲线列出今日待复习错题。',
    '每张卡片先遮住解析，回忆作答；点击「显示解析/答案」对照。',
    '根据记忆程度选择「忘记 / 模糊 / 记得」：记得会拉长间隔，忘记会缩短，帮助你把薄弱点牢牢记住。',
  ] },
  { id: 'chat', icon: MessageSquare, title: '4. AI 答疑', body: [
    '进入「AI 答疑」页，新建对话后直接提问。',
    '可让它分步讲解某道错题、梳理某个知识点、或制定本周复习计划。',
    '左侧可管理多个对话（新建 / 删除），每轮对话都会带上历史上下文。',
    '未配置大模型 Key 时使用内置 Demo 答疑；在「设置」中填入 Key 后自动切换为真实模型。',
  ] },
  { id: 'export', icon: Download, title: '5. 导出与打印', body: [
    '在「错题集」页点击「导出」，可生成考前冲刺 PDF（含题目、知识点、解析与作答区）。',
    '若已启动 ReportLab 导出服务，将直接下载 PDF；否则返回结构化数据，可在浏览器打印为 PDF。',
    '支持按分类、按学科筛选导出范围。',
  ] },
  { id: 'settings', icon: Settings, title: '6. 模型设置', body: [
    '进入「设置」页，填写模型名称、API Key 与 Base URL（OpenAI 兼容接口）。',
    '支持 DeepSeek / OpenAI / 通义 / 本地 Ollama 等。',
    '配置后错题解析与 AI 答疑将使用真实大模型；未配置则走内置 Demo，保证开箱即用。',
  ] },
  { id: 'shortcut', icon: Keyboard, title: '快捷键', body: [
    '顶栏搜索框回车 → 跳转到错题集并按关键词筛选。',
    'AI 答疑输入框：Enter 发送，Shift+Enter 换行。',
  ] },
];

export default function Help() {
  return (
    <div className="split" style={{ height: 'calc(100vh - 60px)' }}>
      <aside className="cat-nav help-toc" style={{ width: 200, flex: '0 0 200px' }}>
        <b style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>目录</b>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`}>{s.title}</a>
        ))}
      </aside>
      <section className="split-main" style={{ maxWidth: 820 }}>
        <h1 className="page-title">帮助中心</h1>
        <p className="page-sub">Recall 使用手册 · 从录入到复习的完整指南</p>
        {SECTIONS.map((s) => (
          <div key={s.id} id={s.id} className="help-section">
            <div className="row" style={{ gap: 8 }}><s.icon size={18} color="var(--primary)" /><h3 style={{ margin: 0 }}>{s.title}</h3></div>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              {s.body.map((p, i) => <li key={i} style={{ marginBottom: 6 }}>{p}</li>)}
            </ul>
          </div>
        ))}
        <div className="divider" />
        <p className="muted" style={{ fontSize: 12 }}>Recall · AI 智能错题本 — 让每一道错题都成为进步的机会。</p>
      </section>
    </div>
  );
}

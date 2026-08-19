# 📘 Recall — AI 智能错题本

一站式错题管理平台：拍照/文本录入错题，AI 自动解析学科、知识点与错因，按间隔复习法规划复习计划，通过知识图谱与热力图掌握薄弱点，并支持基于个人错题库的 AI 答疑（RAG）与考前冲刺 PDF 导出。

> 面向学生个人使用的完整全栈项目：Node.js 主后端 + React Web 端 + Vue 移动端 + Python AI 微服务集群。

---

## 目录

- [核心特性](#核心特性)
- [架构总览](#架构总览)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [云服务器一键部署](#云服务器一键部署)
- [AI 配置](#ai-配置)
- [数据隔离与安全](#数据隔离与安全)
- [降级策略](#降级策略)
- [项目结构](#项目结构)
- [API 概览](#api-概览)
- [常见问题](#常见问题)

---

## 核心特性

- **多方式录入**：手动录入、拍照上传（OCR 自动识别）、批量导入；一张照片含多题时自动按题号切分为多条错题
- **AI 智能解析**：自动识别学科、知识点、错因、难度，并生成题目讲解与正确答案（OpenAI 兼容接口，支持 DeepSeek / OpenAI / 通义 / 本地 Ollama 等运行时切换）
- **间隔复习**：按艾宾浩斯间隔生成复习计划，支持忘记/模糊/记住反馈，自动调整下次复习时间
- **学情分析**：知识图谱（按用户隔离的知识点关联）、知识点热力图、薄弱点诊断报告、学习统计
- **AI 答疑（RAG）**：多轮对话时从“该学生自己的错题知识库”中向量 + 关键词混合召回相关题目，结合上下文讲解
- **考前冲刺**：一键生成可打印的错题集 PDF（科目/知识点/错因/难度/解析 + 作答区）
- **双端适配**：Web 管理端（React）与移动端 H5（Vue）
- **用户数据完全隔离**：错题、复习、会话、知识图谱、上传图片、RAG 检索全部按用户隔离

## 架构总览

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  Web 管理端 (React/Vite)     │         │  移动端 H5 (Vue/Vite, 可选)   │
│  :5173                      │         │  (端口与 Web 同为 5173,       │
└──────────────┬──────────────┘         │   同启时需调整其一)          │
               │                        └───────────────┬──────────────┘
               │                                        │
               └──────────────┬─────────────────────────┘
                              ▼ HTTP / JSON
               ┌─────────────────────────────────────────────┐
               │          Node.js 主后端 (Express)  :3000     │
               │  认证 · 错题 · 分类 · 复习 · 分析 · 会话      │
               │  Prisma ORM · JWT · SQLite                  │
               └───────┬───────────────┬───────────────┬─────┘
                       │               │               │
                       ▼               ▼               ▼
          ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
          │ OCR 微服务      │ │ 向量检索微服务    │ │ PDF 导出微服务  │
          │ (Flask+RapidOCR)│ │ (ChromaDB+BM25)  │ │ (Flask+ReportLab)│
          │ :5000           │ │ :5001            │ │ :5002           │
          └─────────────────┘ └──────────────────┘ └─────────────────┘
```

主后端与各 AI 微服务通过 HTTP 通信，任一 AI 服务不可用时自动降级（见[降级策略](#降级策略)），保证核心功能不中断。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js · Express · Prisma ORM · SQLite（可切换其他数据库） |
| 鉴权 | JWT（登录态与所有资源隔离的基础） |
| Web 端 | React 18 · Vite · react-router |
| 移动端 | Vue 3 · Vite |
| OCR | Python · Flask · RapidOCR（onnxruntime，离线 CPU 推理） |
| 向量检索 | Python · Flask · ChromaDB（离线哈希 embedding + BM25 混合召回） |
| PDF 导出 | Python · Flask · ReportLab（支持中文） |
| AI 对话 | OpenAI 兼容 `chat/completions` 协议（DeepSeek / OpenAI / 通义 / Ollama …） |

## 快速开始

### 环境要求

- Node.js ≥ 18
- Python 3.10+（Windows：需可用的 `python` 命令）

### 安装与启动

```bash
# 1. 安装后端 + Web 依赖（server/ 与 web/）
npm run setup

# 2.（首次）初始化 Python AI 微服务环境（创建 ai/ocr/.venv 并安装依赖）
npm run setup:ai

# 3. 一键启动全部服务：主后端 + Web + OCR + ChromaDB + PDF
npm run dev:all
```

启动完成后访问：

| 服务 | 地址 |
|---|---|
| Web 管理端 | http://localhost:5173 |
| 后端 API | http://localhost:3000（健康检查 `/health`） |
| OCR 微服务 | http://localhost:5000 |
| 向量检索微服务 | http://localhost:5001 |
| PDF 导出微服务 | http://localhost:5002 |
| 移动端 H5（可选） | `cd client && npm run dev` |

> 只想跑主应用、不启动 AI 微服务时，使用 `npm run dev`，业务功能会自动降级可用。

### 数据库初始化（可选）

数据模型变更后，或首次在新环境部署时：

```bash
npm run db:init   # prisma generate + prisma db push
```

## 云服务器一键部署

项目内置 Docker 编排，**一条命令在任意 Linux 服务器上跑起全栈**（Web + 后端 + OCR + 向量检索 + PDF 导出），所有数据通过 volume 持久化，无需手动配置任何环境变量。

### 前置条件

- 一台 Linux 云服务器（腾讯云轻量应用服务器即可，2C4G 起步）
- 安全组/防火墙放行 **3000** 端口（腾讯云控制台 → 防火墙 → 添加规则）
- 服务器安装 Git 与 Docker（`deploy.sh` 会自动安装 Docker，也可手动装：`curl -fsSL https://get.docker.com | sh`）

### 部署步骤（共 2 步）

```bash
# 1. 把项目拉到服务器（GitHub 或直接上传均可）
git clone <你的仓库地址> recall && cd recall

# 2. 一键构建 + 启动全部服务（首次构建需下载依赖，约几分钟）
bash deploy.sh
```

部署完成后访问 `http://服务器IP:3000`，健康检查 `http://服务器IP:3000/health`。

> 无 `server/.env` 也能运行（AI 走 demo 降级模式）。若需接入真实 AI 模型：部署后在服务器上创建 `server/.env`（参考 `server/.env.example` 填写 `DEEPSEEK_API_KEY` 等），再执行 `docker compose up -d --build` 生效。该文件含密钥，已被 `.gitignore` 排除，不会随代码提交。

### 常用运维命令

```bash
docker compose ps                 # 查看 4 个服务状态
docker compose logs -f            # 查看全部日志
docker compose logs -f server     # 只看后端日志
docker compose down               # 停止（数据不会丢）
docker compose up -d --build      # 代码更新后重新构建启动
```

### 数据持久化

| Volume | 内容 |
|---|---|
| `db_data` | SQLite 数据库（错题/用户/会话等全部业务数据） |
| `uploads_data` | 上传的错题图片 |
| `server_data` | 运行时设置（AI 配置等） |
| `chroma_data` | 向量库与 BM25 索引（RAG 检索） |

容器删除/重建数据不丢失；备份整目录或执行 `docker compose down && tar` 打包 volume 即可迁移。

### 绑定域名（可选）

- 在腾讯云 DNSPod 把域名解析到服务器 IP，然后在 EdgeOne / 云服务器安全组中放行 80/443
- 可用 Nginx 反代或腾讯云 EdgeOne 接入：`http://IP:3000` 为源站，域名访问时自动转发并启用 HTTPS

## AI 配置

项目无需任何 API Key 即可运行（无 Key 时 AI 功能返回“确定性 demo 兜底”）。接入真实模型时，可在 Web 端「设置」页运行时配置，或通过环境变量预设：

| 环境变量 | 说明 | 默认 |
|---|---|---|
| `AI_PROVIDER` | 服务商标识 | `deepseek` |
| `AI_API_KEY` | API Key | 空 |
| `AI_BASE_URL` | OpenAI 兼容的接口地址 | `https://api.deepseek.com/v1` |
| `AI_MODEL` | 模型名 | `deepseek-chat` |
| `PORT` | 后端端口 | `3000` |
| `OCR_SERVICE_URL` | OCR 微服务地址 | `http://localhost:5000/ocr` |
| `CHROMA_SERVICE_URL` | 向量检索微服务地址 | `http://localhost:5001` |
| `PDF_SERVICE_URL` | PDF 导出微服务地址 | `http://localhost:5002/generate` |

满足 **OpenAI 兼容 `chat/completions`** 的服务商均可通过设置页接入。

## 数据隔离与安全

多用户场景下，以下资源全部按 `userId` 隔离，并在接口层强制校验归属：

- 错题、分类、复习计划/记录、学习统计
- AI 会话与消息（无法读取/发送/删除他人会话）
- 知识图谱与画像（只能看到自己解析出的知识点节点）
- 上传图片（`/uploads` 需登录 + 归属校验，未登录/他人访问返回 401/404）
- RAG 检索（向量写入带 `userId` 元数据，向量检索 / BM25 / SQL 降级三层均按用户过滤）

## 降级策略

| 场景 | 行为 |
|---|---|
| 无 AI API Key | AI 解析/答疑返回确定性 demo 结果，功能可用 |
| OCR 服务不可用 | 录入不阻塞，题目先以原始文本/图片入库，可后续触发解析 |
| ChromaDB 向量服务不可用 | RAG 自动切换为 SQL 关键词 + TF 重叠检索（本地降级），隔离语义不变 |
| PDF 服务不可用 | 导出接口降级返回结构化 JSON 数据 |

## 项目结构

```
.
├── package.json              # 根脚本：dev / dev:all / setup / setup:ai / docker:*
├── docker-compose.yml        # 一键部署编排（Web+后端+3 微服务，4 个数据卷）
├── deploy.sh                 # Linux 服务器一键部署脚本（自动装 Docker）
├── server/                   # Node.js 主后端（含 Dockerfile，生产模式同源托管前端）
│   ├── prisma/               # 数据模型（schema.prisma）与数据库
│   ├── src/routes/           # API 路由（auth/mistakes/review/analysis/chat/...）
│   ├── src/services/         # 业务服务（aiService / chromaService / exportService ...）
│   ├── src/middleware/       # 鉴权 / 上传图片鉴权网关 / 文件上传
│   ├── src/config/           # 环境配置
│   └── uploads/              # 上传图片存储
├── web/                      # Web 管理端（React + Vite）
│   └── src/pages/            # 错题集 / AI答疑 / 数据看板 / 设置 / 帮助
├── client/                   # 移动端 H5（Vue + Vite）
├── ai/
│   ├── ocr/                  # OCR 识别微服务（Flask + RapidOCR）
│   ├── chroma_db/            # 向量检索微服务（Flask + ChromaDB + BM25）
│   ├── pdf/                  # PDF 导出微服务（Flask + ReportLab）
│   └── knowledge_graph/      # 知识图谱脚本（可选）
```

## API 概览

统一前缀 `/api/v1`，除注册登录外均需 `Authorization: Bearer <token>`。

| 分组 | 端点示例 | 说明 |
|---|---|---|
| Auth | `POST /auth/register` `POST /auth/login` `GET /auth/profile` | 注册 / 登录 / 个人信息 |
| 错题 | `GET\|POST /mistakes` `GET\|PUT\|DELETE /mistakes/:id` `POST /mistakes/upload` `GET /mistakes/search/similar` | 错题增删改查、图片上传、相似题检索 |
| 分类 | `GET\|POST /categories` `PUT\|DELETE /categories/:id` | 分类与各类错题计数（含 `totalAll`） |
| 复习 | `GET /review/today` `GET /review/progress` `POST /review/:mistakeId` | 今日复习、进度、复习反馈 |
| 分析 | `GET /analysis/heatmap` `GET /analysis/knowledge-graph` `GET /analysis/report` | 热力图 / 知识图谱 / 诊断报告 |
| AI 会话 | `GET\|POST /chat-sessions` `GET\|PUT\|DELETE /chat-sessions/:id` `POST /chat-sessions/:id/messages` `POST /chat` | 会话管理、AI 答疑（含 RAG）、单轮答疑 |
| 导出 | `POST /export/pdf` | 生成错题集 PDF |
| 统计 | `GET /stats` | 学习统计 |
| 设置 | `GET\|PUT /settings` | AI 模型等运行时配置 |

## 常见问题

**Q：AI 返回的内容像是模板/示例？**
A：没有配置 API Key，当前运行在 demo 兜底模式。在「设置」页填写 OpenAI 兼容的 Key 即可升级为真实模型。

**Q：为什么 OCR 识别不出文字？**
A：确认 `npm run ai:ocr` 已启动（RapidOCR 首轮初始化需要加载模型）。若图片本身模糊或为手写体，识别率会下降。

**Q：删除错题后知识图谱/向量库会同步更新吗？**
A：会。删除错题时级联清理复习计划/记录/图片，同步扣减知识图谱计数并移除向量库条目。

**Q：多用户共用一台部署，数据会串吗？**
A：不会。所有业务数据、上传图片与 RAG 检索均按登录用户隔离并校验归属。
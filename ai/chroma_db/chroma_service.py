"""
ChromaDB 向量检索 + BM25 服务（Flask）
为 Recall 提供「相似错题」「AI 答疑 RAG 召回」能力。

能力：
- 向量检索：ChromaDB（离线哈希 embedding，中文按字符 n-gram，100% 离线可用）
- BM25 关键词检索：自建轻量 BM25 索引（文档持久化到 JSON，重启不丢）
- 元数据：题目编号(serialNo) / 学科(subject) / 关键字(keywords) / userId，
  上层可按学科过滤。

启动：python chroma_service.py  默认端口 5001
"""
import os
import json
import hashlib
import math
import re
import chromadb
from flask import Flask, request, jsonify

app = Flask(__name__)

BASE_DIR = os.path.dirname(__file__)
PERSIST_DIR = os.environ.get("CHROMA_PERSIST_DIR", os.path.join(BASE_DIR, "data", "chroma"))
DOCS_FILE = os.path.join(BASE_DIR, "data", "chroma", "docs.json")
COLLECTION = "mistakes"
HASH_DIM = 256
BM25_K1 = 1.5
BM25_B = 0.75

_re = re.compile(r"[a-z0-9]+|[一-龥]")


class OfflineEmbedding:
    """确定性离线 embedding：将文本投影到固定维度向量（带符号哈希）。"""
    def __init__(self, dim: int = HASH_DIM):
        self.dim = dim

    def name(self) -> str:
        return "offline-hash-embedding"

    def _tokens(self, text: str):
        if not text:
            return []
        text = text.lower()
        parts = _re.findall(text)
        tokens = list(parts)
        for i in range(len(tokens) - 1):
            if len(tokens[i]) == 1 and len(tokens[i + 1]) == 1:
                tokens.append(tokens[i] + tokens[i + 1])
        return tokens

    def _embed(self, text: str):
        import numpy as np
        vec = np.zeros(self.dim, dtype="float32")
        for tok in self._tokens(text):
            h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dim
            vec[idx] += 1.0 if (h & 1) else -1.0
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec.tolist()

    def embed_documents(self, input):
        if isinstance(input, str):
            input = [input]
        return [self._embed(t) for t in input]

    def embed_query(self, input):
        if isinstance(input, list):
            return [self._embed(t) for t in input]
        return self._embed(input)

    def __call__(self, input):
        return self.embed_documents(input)


# ---------------- 轻量 BM25 索引 ----------------
def _load_docs():
    try:
        with open(DOCS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_docs(docs):
    os.makedirs(os.path.dirname(DOCS_FILE), exist_ok=True)
    tmp = DOCS_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(docs, f, ensure_ascii=False)
    os.replace(tmp, DOCS_FILE)

def _tokenize(text: str):
    if not text:
        return []
    t = text.lower()
    parts = _re.findall(t)
    grams = list(parts)
    for i in range(len(parts) - 1):
        if len(parts[i]) == 1 and len(parts[i + 1]) == 1:
            grams.append(parts[i] + parts[i + 1])
    return grams

def _bm25_search(docs, query, n, userId=None, subject=None):
    """标准 BM25 检索（Lucene 形式 idf）。"""
    q_tokens = _tokenize(query)
    if not q_tokens:
        return []
    filtered = []
    for doc_id, doc in docs.items():
        meta = doc.get("metadata") or {}
        if userId is not None and meta.get("userId") != userId:
            continue
        if subject is not None and meta.get("subject") != subject:
            continue
        filtered.append((doc_id, doc))
    if not filtered:
        return []

    N = len(filtered)
    dl = []
    for _, doc in filtered:
        dl.append(len(_tokenize(doc.get("text", ""))))
    avgdl = (sum(dl) / len(dl)) if dl else 1.0

    # 每个 token 的文档频率
    df = {}
    for _, doc in filtered:
        toks = set(_tokenize(doc.get("text", "")))
        for tk in toks:
            df[tk] = df.get(tk, 0) + 1

    scored = []
    for (doc_id, doc), dlen in zip(filtered, dl):
        text_toks = _tokenize(doc.get("text", ""))
        tf_map = {}
        for tk in text_toks:
            tf_map[tk] = tf_map.get(tk, 0) + 1
        score = 0.0
        for tk in set(q_tokens):
            f = tf_map.get(tk, 0)
            if f == 0:
                continue
            nq = df.get(tk, 0)
            idf = math.log(1 + (N - nq + 0.5) / (nq + 0.5))
            score += idf * (f * (BM25_K1 + 1)) / (
                f + BM25_K1 * (1 - BM25_B + BM25_B * dlen / avgdl)
            )
        scored.append((doc_id, score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [{"id": i, "score": round(s, 4)} for i, s in scored[:n]]


_client = chromadb.PersistentClient(path=PERSIST_DIR)
_collection = _client.get_or_create_collection(
    name=COLLECTION,
    embedding_function=OfflineEmbedding(),
    metadata={"hnsw:space": "cosine"},
)
_docs = _load_docs()

# 首次启动将 Chroma 里已有文档召回进 BM25 索引
if not _docs:
    try:
        all_data = _collection.get(include=["documents", "metadatas"])
        for i, doc_id in enumerate(all_data.get("ids") or []):
            _docs[doc_id] = {
                "text": (all_data.get("documents") or [])[i] or "",
                "metadata": (all_data.get("metadatas") or [])[i] or {},
            }
        _save_docs(_docs)
    except Exception:
        pass


@app.route("/embed", methods=["POST"])
def embed():
    data = request.json or {}
    mid = data.get("id")
    text = data.get("text", "")
    metadata = data.get("metadata") or {}
    if not mid or not text:
        return jsonify({"error": "id 与 text 必填"}), 400
    try:
        _collection.upsert(documents=[text], ids=[mid], metadatas=[metadata])
        _docs[mid] = {"text": text, "metadata": metadata}
        _save_docs(_docs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    return jsonify({"ok": True, "id": mid})


@app.route("/search", methods=["POST"])
def search():
    """向量语义检索（支持学科过滤）。"""
    data = request.json or {}
    q = data.get("query", "")
    n = int(data.get("n", 5))
    userId = data.get("userId")
    subject = data.get("subject")
    if not q:
        return jsonify({"error": "query 必填"}), 400
    try:
        where = None
        if userId:
            where = {"userId": userId}
            if subject:
                where["subject"] = subject
        res = _collection.query(query_texts=[q], n_results=n, where=where, include=["documents", "metadatas", "distances"])
        ids = (res.get("ids") or [[]])[0]
        dists = (res.get("distances") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        results = []
        for i, doc_id in enumerate(ids):
            results.append({
                "id": doc_id,
                "score": round(1 - (dists[i] if i < len(dists) else 0), 4),
                "metadata": metas[i] if i < len(metas) else {},
            })
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/bm25", methods=["POST"])
def bm25():
    """BM25 关键词检索（支持学科过滤），召回带元数据的题目。"""
    data = request.json or {}
    q = data.get("query", "")
    n = int(data.get("n", 5))
    userId = data.get("userId")
    subject = data.get("subject")
    if not q:
        return jsonify({"error": "query 必填"}), 400
    try:
        results = _bm25_search(_docs, q, n, userId=userId, subject=subject)
        for r in results:
            meta = _docs.get(r["id"], {}).get("metadata") or {}
            r["metadata"] = meta
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/delete", methods=["POST"])
def delete():
    data = request.json or {}
    mid = data.get("id")
    if not mid:
        return jsonify({"error": "id 必填"}), 400
    try:
        _collection.delete(ids=[mid])
    except Exception:
        pass
    _docs.pop(mid, None)
    _save_docs(_docs)
    return jsonify({"ok": True})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "chroma+bm25",
        "count": _collection.count(),
        "bm25_docs": len(_docs),
    })


if __name__ == "__main__":
    port = int(os.environ.get("CHROMA_PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
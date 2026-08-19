"""
OCR 识别服务（Python）
基于 RapidOCR（PaddleOCR 轻量替代，onnxruntime CPU 推理，含中文模型）。
作为独立微服务运行，对应 PRD 6.3.1 OCR 识别流程。

启动：python ocr_service.py   默认端口 5000

能力：
1. 真实识别：RapidOCR 可用时对图片做端到端中文识别；
2. 一图多题：识别结果自动按题号切分为多道题（questions 字段），
   供上层「错题本」把一张照片里的多道题拆成多条错题记录；
3. 自动降级：依赖缺失 / 图片获取失败时返回 Mock 示例，保证不阻塞主流程。

依赖（ai/ocr/requirements.txt）：
    flask requests rapidocr_onnxruntime
"""
import os
import re
import base64
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# ---- 真实 OCR 引擎（RapidOCR，离线 CPU）----
ocr_engine = None
try:
    from rapidocr_onnxruntime import RapidOCR
    ocr_engine = RapidOCR()
    REAL_OCR = True
    print("[OCR] 已启用 RapidOCR 真实识别", flush=True)
except Exception as e:  # pragma: no cover
    REAL_OCR = False
    print(f"[OCR] RapidOCR 不可用，降级 Mock：{e}", flush=True)

MOCK_RESULT = {
    "text": "已知函数 f(x) = 2x² + 3x - 5，求 f(2) 的值。\n\n"
            "一元二次方程 x² - 5x + 6 = 0 的解法。\n\n"
            "英语语法：用 which 或 that 填空，The book ___ I read is interesting.",
    "confidence": 0.96,
    "formulas": ["f(x) = 2x² + 3x - 5", "x² - 5x + 6 = 0"],
}


# ---------------- 一图多题切分 ----------------
# 题号起始模式：1. / 1、 / 1． / 1) （1） 第1题 一、 等
_Q_START = re.compile(
    r"^\s*(?:"
    r"[（(]\s*\d{1,3}\s*[)）]"                      # （1） (2)
    r"|第\s*\d{1,3}\s*[题问]"                        # 第1题
    r"|[一二三四五六七八九十百]+\s*、"                 # 一、
    r"|\d{1,3}\s*[.、．)）:：]"                        # 1. 2、
    r")\s*[^\d：:]"
)
# 试卷/分节标题等噪音行：不计入题目
_SECTION_HEADER = re.compile(r"^[一二三四五六七八九十]+、.*(单项选择题|多项选择题|选择题|填空题|解答题|判断题)")
_NOISE_BLOCK = re.compile(r"(本试卷|满分|考试时长|共\d+分|考试时间)")


def split_questions(text: str, min_len: int = 4) -> list:
    """把一段 OCR 文本按题号切分成多道题。

    策略：逐行扫描，遇到「题号起始行」则开启新题；连续两题间的内容归上一题。
    没有识别到多题起始时，整段视为 1 道题。试卷标题/分节标题等噪音会被剔除。
    """
    if not text:
        return []
    lines = text.splitlines()
    questions: list = []
    cur: list = []

    def flush():
        if cur:
            block = "\n".join(cur).strip()
            # 去掉块首残留的题号前缀
            block = re.sub(r"^[（(]\s*\d{1,3}\s*[)）]", "", block)
            block = re.sub(r"^第\s*\d{1,3}\s*[题问]", "", block)
            block = re.sub(r"^[一二三四五六七八九十百]+\s*、", "", block)
            block = re.sub(r"^\d{1,3}\s*[.、．)）:：]", "", block)
            block = block.strip()
            if len(block) >= min_len and not _NOISE_BLOCK.search(block):
                questions.append(block)

    for ln in lines:
        s = ln.strip()
        if not s or _SECTION_HEADER.match(s):
            continue
        if _Q_START.match(s):
            flush()
            cur = [s]
        else:
            cur.append(s)
    flush()

    # 未识别出多题（或仅 1 道）时整段返回
    if len(questions) <= 1:
        whole = text.strip()
        if whole:
            return [whole]
        return []
    return questions


# ---------------- 图片读取 ----------------
def _read_image_bytes(data):
    image_url = data.get("image_url")
    image_base64 = data.get("image_base64")
    if image_base64:
        return base64.b64decode(image_base64.split(",", 1)[-1])
    if image_url:
        try:
            resp = requests.get(image_url, timeout=8)
            resp.raise_for_status()
            return resp.content
        except Exception:
            return None
    return None


def _real_ocr(img_bytes):
    """RapidOCR 真实识别路径。"""
    import tempfile
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    tmp.write(img_bytes)
    tmp.close()
    try:
        result, _ = ocr_engine(tmp.name)
        os.unlink(tmp.name)
        lines = []
        confs = []
        for item in result or []:
            # RapidOCR 1.4.x 结构：item = [box, text, score]
            lines.append(item[1])
            confs.append(float(item[2]))
        text = "\n".join(lines)
        confidence = round(sum(confs) / len(confs), 2) if confs else 0.0
        return {"text": text, "confidence": confidence}
    except Exception as e:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass
        raise e


# ---------------- 接口 ----------------
@app.route("/ocr", methods=["POST"])
def ocr_recognize():
    data = request.json
    if not data:
        return jsonify({"error": "请提供 image_url 或 image_base64"}), 400

    img_bytes = _read_image_bytes(data)
    real = False
    if img_bytes and REAL_OCR and ocr_engine is not None:
        try:
            raw = _real_ocr(img_bytes)
            real = True
        except Exception as e:
            app.logger.warning("RapidOCR 识别失败，降级 Mock：%s", e)
            raw = dict(MOCK_RESULT)
    elif not img_bytes or not REAL_OCR:
        # 图片获取失败 / 依赖缺失：返回 Mock，保证不阻塞
        raw = dict(MOCK_RESULT)
    else:  # pragma: no cover
        raw = dict(MOCK_RESULT)

    questions = split_questions(raw.get("text", ""))
    return jsonify({
        "text": raw.get("text", ""),
        "questions": questions,
        "confidence": raw.get("confidence", 0.0),
        "formulas": raw.get("formulas", []),
        "real": real,
    })


@app.route("/ocr/split", methods=["POST"])
def ocr_split():
    """纯文本多题切分（供手动录入/纠错时复用）。"""
    data = request.json or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "text 必填"}), 400
    return jsonify({"questions": split_questions(text)})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "ocr", "real": REAL_OCR})


if __name__ == "__main__":
    port = int(os.environ.get("OCR_PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
"""
错题集 PDF 导出服务（Flask + ReportLab）
接收 Node 后端 POST 的结构化错题数据，生成可打印 PDF。

启动：python export_pdf.py  默认端口 5002
依赖：pip install flask reportlab
"""
import os
import io
from flask import Flask, request, jsonify, send_file

app = Flask(__name__)

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    )
    from reportlab.lib.enums import TA_LEFT
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    # 注册中文字体（优先微软雅黑，回退宋体 / Linux Noto CJK）
    _CN_FONT = None
    _CN_FONT_BOLD = None
    _FONT_SEARCH_PATHS = [
        ("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", "NotoSansCJK-Bold"),
        ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", "NotoSansCJK-Regular"),
        ("C:/Windows/Fonts/msyh.ttc", "msyh"),
        ("C:/Windows/Fonts/msyhbd.ttc", "msyhbd"),
        ("C:/Windows/Fonts/simsun.ttc", "simsun"),
        ("C:/Windows/Fonts/simhei.ttf", "simhei"),
    ]
    for fpath, fname in _FONT_SEARCH_PATHS:
        if os.path.exists(fpath):
            try:
                pdfmetrics.registerFont(TTFont(fname, fpath))
                if _CN_FONT is None:
                    _CN_FONT = fname
                continue
            except Exception:
                pass
    # 如果 TTC 注册失败，尝试用 TTFont 的子字体索引
    if _CN_FONT is None:
        for fpath, fname in _FONT_SEARCH_PATHS:
            if os.path.exists(fpath) and fpath.endswith('.ttc'):
                try:
                    # TTC 需要指定子字体索引（0=常规）
                    pdfmetrics.registerFont(TTFont(fname, fpath, subfontIndex=0))
                    if _CN_FONT is None:
                        _CN_FONT = fname
                except Exception:
                    pass

    _REPORTLAB_OK = True
except Exception as e:
    _REPORTLAB_OK = False
    _IMPORT_ERR = str(e)


def _cn(fallback_text):
    """返回 (中文字体名, 回退字体名) 或回退文本"""
    if _CN_FONT:
        return _CN_FONT, "Helvetica"
    return "Helvetica", "Helvetica"


def _clean(s):
    if s is None:
        return ""
    return str(s).replace("\r", " ").replace("\n", " ").strip()


def build_pdf(data: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title=_clean(data.get("title", "Recall 错题集")),
    )
    styles = getSampleStyleSheet()
    cn, fallback = _cn("")
    h1 = ParagraphStyle("h1", parent=styles["Title"], fontSize=20, spaceAfter=6, textColor=colors.HexColor("#3b3aa1"), fontName=cn)
    sub = ParagraphStyle("sub", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#888888"), spaceAfter=10, fontName=cn)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=13, textColor=colors.HexColor("#3b3aa1"), spaceBefore=8, spaceAfter=4, fontName=cn)
    body = ParagraphStyle("body", parent=styles["Normal"], fontSize=10, leading=15, alignment=TA_LEFT, fontName=cn)
    meta = ParagraphStyle("meta", parent=styles["Normal"], fontSize=8.5, textColor=colors.HexColor("#666666"), fontName=cn)

    story = []
    story.append(Paragraph(_clean(data.get("title", "Recall 错题集")), h1))
    story.append(Paragraph(f"生成时间：{_clean(data.get('generatedAt', ''))}　|　共 {data.get('totalCount', 0)} 题", sub))

    for page in data.get("pages", []):
        num = page.get("number", "")
        story.append(Paragraph(f"第 {num} 题", h2))
        q = page.get("question", {})
        qtext = _clean(q.get("text", "")) or "(题目文字待识别)"
        story.append(Paragraph(f"<b>题目：</b>{qtext}", body))
        meta_info = page.get("metadata", {})
        kp = meta_info.get("knowledgePoints", [])
        # 兼容 JSON 字符串情况
        if isinstance(kp, str):
            import json
            try: kp = json.loads(kp)
            except: kp = [kp]
        kp_str = "、".join(kp) if isinstance(kp, list) else _clean(kp)
        story.append(Paragraph(
            f"学科：{_clean(meta_info.get('subject'))}　知识点：{_clean(kp_str)}　"
            f"错因：{_clean(meta_info.get('errorType'))}　难度：{_clean(meta_info.get('difficulty'))}", meta))
        if page.get("analysis"):
            story.append(Paragraph(f"<b>解析：</b>{_clean(page.get('analysis'))}", body))
        if page.get("answer"):
            story.append(Paragraph(f"<b>正确答案：</b>{_clean(page.get('answer'))}", body))
        if page.get("answerSpace"):
            story.append(Spacer(1, 8 * mm))
            story.append(Paragraph("我的作答区：", meta))
            story.append(Spacer(1, 26 * mm))
        story.append(Spacer(1, 4 * mm))
        story.append(Table([[""]], colWidths=[doc.width], style=TableStyle([
            ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#dddddd")),
        ])))

    doc.build(story)
    buf.seek(0)
    return buf.read()


@app.route("/generate", methods=["POST"])
def generate():
    if not _REPORTLAB_OK:
        return jsonify({"error": f"ReportLab 未安装：{_IMPORT_ERR}"}), 503
    payload = request.json
    if not payload:
        return jsonify({"error": "缺少 PDF 数据"}), 400
    try:
        pdf_bytes = build_pdf(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"recall-mistakes-{int(__import__('time').time())}.pdf",
    )


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "pdf", "reportlab": _REPORTLAB_OK})


if __name__ == "__main__":
    port = int(os.environ.get("PDF_PORT", 5002))
    app.run(host="0.0.0.0", port=port, debug=False)

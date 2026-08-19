FROM python:3.11-slim

WORKDIR /app

# 中文字体（Noto CJK），供 ReportLab 生成中文 PDF
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY export_pdf.py .

EXPOSE 5002

CMD ["python", "export_pdf.py"]
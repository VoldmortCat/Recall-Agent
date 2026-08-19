ARG REGISTRY=docker.m.daocloud.io/library
FROM ${REGISTRY}/python:3.11-slim

WORKDIR /app

# 国内 pip 镜像源（加速依赖安装）
ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ENV PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn

# 中文字体（Noto CJK），供 ReportLab 生成中文 PDF；apt 源切换为国内镜像加速
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY export_pdf.py .

EXPOSE 5002

CMD ["python", "export_pdf.py"]
ARG REGISTRY=docker.m.daocloud.io/library
FROM ${REGISTRY}/python:3.11-slim

WORKDIR /app

# 国内 pip 镜像源（加速依赖安装）
ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ENV PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "ocr_service.py"]
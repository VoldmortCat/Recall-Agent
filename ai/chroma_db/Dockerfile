FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY chroma_service.py .

# 向量库持久化目录（compose 中挂载 volume）
RUN mkdir -p /app/data/chroma

EXPOSE 5001

CMD ["python", "chroma_service.py"]
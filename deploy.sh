#!/usr/bin/env bash
# ============================================================
# Recall — AI 智能错题本 · Linux 服务器一键部署脚本
# 用法（在项目根目录执行）：
#   bash deploy.sh
# 若项目已在服务器上：先 git pull 更新代码，再跑本脚本即可。
# 部署完成后访问：http://服务器IP:3000
# ============================================================
set -euo pipefail

echo "==========================================="
echo "  Recall 一键部署（Docker Compose）"
echo "==========================================="

# ---------- 1. 安装 Docker（如缺失） ----------
if ! command -v docker >/dev/null 2>&1; then
  echo ">> 未检测到 Docker，开始安装..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker 2>/dev/null || service docker start 2>/dev/null || true
fi
docker --version

# ---------- 2. 确认 docker compose 插件 ----------
if ! docker compose version >/dev/null 2>&1; then
  echo ">> 未检测到 docker compose 插件，尝试安装..."
  apt-get update && apt-get install -y docker-compose-plugin 2>/dev/null \
    || pip3 install docker-compose 2>/dev/null || true
fi
docker compose version

# ---------- 3. 构建并启动全部服务（前端 + 后端 + OCR + 向量 + PDF） ----------
echo ">> 构建镜像并启动服务（首次构建需下载依赖，请耐心等待）..."
docker compose up -d --build

# ---------- 4. 输出结果 ----------
echo ""
echo "==========================================="
echo "  部署完成！"
echo "  访问地址  : http://$(hostname -I | awk '{print $1}'):3000"
echo "  健康检查  : http://$(hostname -I | awk '{print $1}'):3000/health"
echo "  查看日志  : docker compose logs -f"
echo "==========================================="
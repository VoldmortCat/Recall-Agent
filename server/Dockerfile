# ========== Stage 1：构建前端（web/dist） ==========
# 基础镜像地址可覆盖：docker build --build-arg REGISTRY=docker.io/library ...
ARG REGISTRY=docker.m.daocloud.io/library
FROM ${REGISTRY}/node:20-alpine AS web-builder
WORKDIR /src

# 国内镜像源（npm 包 + Prisma 引擎）
ENV npm_config_registry=https://registry.npmmirror.com
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

COPY web/package*.json ./web/
RUN cd web && npm install

COPY web ./web
RUN cd web && npm run build && ls dist

# ========== Stage 2：后端运行环境 ==========
FROM ${REGISTRY}/node:20-alpine AS runner

WORKDIR /app

ENV npm_config_registry=https://registry.npmmirror.com
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

# Prisma 引擎在 Alpine(musl) 下需要 openssl
RUN apk add --no-cache openssl

# 后端依赖（根 package.json 聚合了后端全部依赖）
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm install --omit=dev --ignore-scripts

# Prisma Client 生成（需要 schema）
COPY server/prisma ./server/prisma
RUN npx prisma generate --schema=server/prisma/schema.prisma

# 后端源码
COPY server/src ./server/src
COPY server/uploads ./server/uploads
# server/data（运行时设置）由 compose volume 挂载自动创建

# 前端构建产物（生产模式下由后端同源托管）
COPY --from=web-builder /src/web/dist ./web/dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# 首次启动自动建表（prisma db push），再启动后端
CMD ["sh", "-c", "npx prisma db push --schema=server/prisma/schema.prisma && node server/src/app.js"]
# Multi-stage build to produce a single image serving API + built UI

# Build client
FROM node:18-alpine AS client-build
WORKDIR /app/client

# 仅复制依赖清单，加快缓存命中并避免无关变更导致重装
COPY client/package*.json ./

# 稳健安装依赖：优先使用 ci（如无 lock 则回退到 install）
# 不要忽略错误（去掉了 `|| true`），否则 build 期才暴露问题难以排查
RUN if [ -f package-lock.json ]; then \
      npm ci --silent; \
    else \
      npm i --silent; \
    fi

# 复制源码并构建
COPY client/ ./
RUN npm run build

# Install server deps
FROM node:18-alpine AS server-build
WORKDIR /app/server
COPY server/package.json ./
RUN npm i --omit=dev --silent || npm i --silent
COPY server/ ./

# Runtime image
FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copy server and built client
COPY --from=server-build /app/server /app/server
COPY --from=client-build /app/client/dist /app/client/dist

EXPOSE 3000
CMD ["node", "server/server.js"]

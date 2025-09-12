## Cloudflare DNS Manager

前后端分离的 Cloudflare DNS 解析记录管理面板。后端使用 Express 代理 Cloudflare API，前端使用 React + Vite + Tailwind。支持 Docker 一体化部署（API + 静态页面同端口）。

### 目录结构
- `server/`：Express 后端（代理 Cloudflare API）
- `client/`：React 前端（Vite 构建）
- `Dockerfile`、`docker-compose.yml`：容器化与编排
- `.env.example`：环境变量示例（复制为 `.env` 并填写）

### 开发运行（本地）
1) 配置环境变量
- 复制根目录 `.env.example` → `.env`，填写：
  - `CLOUDFLARE_API_TOKEN=<你的 Cloudflare API Token>`
  - 可选：`PORT=3000`、`CORS_ORIGIN=http://localhost:5173`

2) 启动后端（默认 3000）
- `cd server && npm install && npm run dev`

3) 启动前端（默认 5173）
- 另开终端：`cd client && npm install && npm run dev`

4) 访问前端
- 打开 `http://localhost:5173`，选择域名后管理解析记录。

提示：前端会在开发环境下自动将 API 指向 `http://localhost:3000`；生产构建时默认指向同源（由 Express 提供静态页面）。

### Docker 构建与运行

一体化镜像同时包含：
- Express API（端口 3000）
- 已构建的前端静态文件（由 Express 同源提供）

方法 A：直接使用 Dockerfile
```
# 构建镜像
docker build -t cf2dns:latest .

# 运行容器（替换为你的 Cloudflare Token）
docker run --rm -p 3000:3000 \
  -e CLOUDFLARE_API_TOKEN=your_token_here \
  cf2dns:latest

# 访问
# http://localhost:3000 （前端）
# API 示例：GET http://localhost:3000/api/zones
```

方法 B：脚本（适合 Windows / *nix）
- Bash：
  - `./docker-build.sh`（或 `./docker-build.sh yourname/cf2dns:latest`）
  - `CLOUDFLARE_API_TOKEN=your_token ./docker-run.sh`（或 `./docker-run.sh yourname/cf2dns:latest`）
- PowerShell：
  - `./docker-build.ps1 -ImageName yourname/cf2dns:latest`
  - `./docker-run.ps1 -ImageName yourname/cf2dns:latest -Token your_token`

方法 C：docker-compose
```
# Windows PowerShell
$env:CLOUDFLARE_API_TOKEN="your_token"; docker compose up --build

# Bash / zsh
export CLOUDFLARE_API_TOKEN="your_token" && docker compose up --build

# 访问 http://localhost:3000
```

### 上传到 GitHub（教程）
1) 初始化 Git（如果未初始化）
```
git init
git add .
git commit -m "Initial commit: Cloudflare DNS Manager"
```

2) 在 GitHub 创建一个新仓库（例如 `cf2dns`），然后关联远程：
```
git remote add origin https://github.com/<你的用户名>/cf2dns.git
git branch -M main
git push -u origin main
```

3) （可选）启用 GitHub Actions 自动构建 Docker 镜像
- 在仓库的 Settings → Secrets and variables → Actions 中设置：
  - `DOCKERHUB_USERNAME`：你的 Docker Hub 用户名
  - `DOCKERHUB_TOKEN`：Docker Hub 的访问令牌（或密码）
  - `IMAGE_NAME`：目标镜像名（例如 `yourname/cf2dns:latest`）；留空则使用 `<DOCKERHUB_USERNAME>/cf2dns:latest`
- 推送到 `main` 或手动触发 Workflow 即可构建并（若配置了凭据）推送镜像。

### 生产部署建议
- 使用上述 Docker 镜像：
  - 运行时通过环境变量注入 `CLOUDFLARE_API_TOKEN`
  - 暴露端口 `3000`
  - 反向代理（可选）按需配置 TLS（例如用 Nginx / Traefik）
- 若前后端分离部署：
  - 仍可用本镜像，只暴露 API 并将静态资源交给外部 CDN/静态服务器；或构建 Nginx 静态镜像，Express 仅处理 API。

### 环境变量
- `CLOUDFLARE_API_TOKEN`（必需）：Cloudflare API Token（最小权限）
- `PORT`（默认 3000）：后端监听端口
- `CORS_ORIGIN`（开发用）：允许的前端源（开发时 `http://localhost:5173`）

### 常见问题
- API 返回 401/403：检查 `CLOUDFLARE_API_TOKEN` 是否正确且具备相应权限。
- 前端能打开但表格为空：确认账户下存在 Zone；检查浏览器网络面板确认 `/api/zones` 是否成功。
- 跨域错误（开发模式）：确认后端 `.env` 中 `CORS_ORIGIN=http://localhost:5173`，或重启后端使其生效。


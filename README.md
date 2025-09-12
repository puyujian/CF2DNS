## CF2DNS（Cloudflare DNS 管理面板）

GitHub 仓库：https://github.com/puyujian/CF2DNS

前后端分离的 Cloudflare DNS 解析记录管理面板。后端使用 Express 代理 Cloudflare API，前端使用 React + Vite + Tailwind。支持 Docker 一体化部署（API + 静态页面同端口），也支持 GitHub Actions 自动构建镜像。

### 功能特性
- 查看账号下所有 Zone（域名）
- 查看/新增/修改/删除 DNS 解析记录
- 后端代理 Cloudflare API，前端不暴露 Token
- Docker 一体化运行；生产环境同源提供前端 + API，无跨域烦恼

### 目录结构
- `server/`：Express 后端（代理 Cloudflare API）
- `client/`：React 前端（Vite 构建）
- `Dockerfile`、`docker-compose.yml`：容器化与编排
- `.env.example`：环境变量示例（复制为 `.env` 并填写）

### Cloudflare Token 权限建议
- 建议创建最小权限的 API Token：
  - Zone → Zone → Read
  - Zone → DNS → Edit
- 作用域可设为需要管理的特定 Zone（更安全），或 All zones（更方便）。

### 本地开发（Node 18+）
1) 克隆并进入目录：
```
git clone https://github.com/puyujian/CF2DNS.git
cd CF2DNS
```

2) 配置环境变量：
- 复制根目录 `.env.example` → `.env`，填写：
  - `CLOUDFLARE_API_TOKEN=<你的 Cloudflare API Token>`
  - 可选：`PORT=3000`、`CORS_ORIGIN=http://localhost:5173`

3) 启动后端（默认 3000）：
```
cd server
npm install
npm run dev
```

4) 启动前端（默认 5173）：
```
cd client
npm install
npm run dev
```

5) 访问前端：
- 打开 `http://localhost:5173`，选择域名后管理解析记录。
- 开发模式下前端默认请求 `http://localhost:3000` 的 API；如需自定义，设置 `VITE_API_BASE`。

### Docker 部署（推荐）

镜像包含后端 API（端口 3000）与前端静态文件（同源提供）。

方法 A：docker compose（默认使用 GHCR 镜像）
```
# 1) 在仓库根目录创建 .env 或导出变量
echo CLOUDFLARE_API_TOKEN=你的Token > .env

# 2) 启动（默认拉取 ghcr.io/puyujian/cf2dns:latest）
docker compose up -d

# 访问 http://localhost:3000
```

可选：覆盖镜像（例如使用特定 SHA 标签或私有镜像）
```
IMAGE_NAME=ghcr.io/puyujian/cf2dns:sha-<短SHA> docker compose up -d
```

方法 B：直接使用 Dockerfile（本地构建）
```
# 构建镜像
docker build -t cf2dns:latest .

# 运行容器
docker run --rm -p 3000:3000 \
  -e CLOUDFLARE_API_TOKEN=你的Token \
  cf2dns:latest
```

方法 C：脚本（Windows/*nix）
- Bash：
  - `./docker-build.sh`（或 `./docker-build.sh yourname/cf2dns:latest`）
  - `CLOUDFLARE_API_TOKEN=你的Token ./docker-run.sh`（可带镜像名参数）
- PowerShell：
  - `./docker-build.ps1 -ImageName yourname/cf2dns:latest`
  - `./docker-run.ps1 -ImageName yourname/cf2dns:latest -Token 你的Token`

可选：反向代理（例如 Nginx/Traefik）在 `:443` 代理到容器 `:3000`，并配置 TLS 证书。

### GitHub Actions（推送到 GHCR，并可选推送到 Docker Hub）
工作流：`.github/workflows/docker.yml`

- 默认推送到 GHCR（GitHub Container Registry），镜像命名：
  - `ghcr.io/<owner>/<repo>:latest`
  - `ghcr.io/<owner>/<repo>:sha-<短SHA>`
- 该工作流使用 `GITHUB_TOKEN` 登录 GHCR，不需要额外配置；仓库需允许 Packages 写入权限（已在 workflow 中声明 `packages: write`）。

可选：同时推送到 Docker Hub（如需对外分发到 Docker Hub）
1) 仓库 Settings → Secrets and variables → Actions 配置：
- `DOCKERHUB_USERNAME`：Docker Hub 用户名
- `DOCKERHUB_TOKEN`：Docker Hub Access Token（或密码）
- 可选 `IMAGE_NAME`：覆盖 Docker Hub 推送目标，如 `yourname/cf2dns:latest`

2) 推送到 `main` 或手动触发 Workflow：
- 将自动登录 GHCR 并推送；若配置了 Docker Hub 凭据，也会同时推送到 Docker Hub。

3) 拉取与运行（GHCR）
```
docker pull ghcr.io/puyujian/cf2dns:latest
docker run --rm -p 3000:3000 \
  -e CLOUDFLARE_API_TOKEN=你的Token \
  ghcr.io/puyujian/cf2dns:latest
```

### 环境变量
- `CLOUDFLARE_API_TOKEN`（必需）：Cloudflare API Token（最小权限）
- `PORT`（默认 3000）：后端监听端口
- `CORS_ORIGIN`（开发用于跨域）：允许的前端源（开发时 `http://localhost:5173`）
- `VITE_API_BASE`（前端可选）：指定 API 基地址（默认生产同源、开发指向 3000）

### 常见问题（Troubleshooting）
- 401/403：Token 权限不足或无效；按“Token 权限建议”检查配置。
- 无法列出 Zone：确认账号下存在 Zone；或 Token 作用域是否仅限特定 Zone。
- 开发跨域：确认 `.env` 中 `CORS_ORIGIN=http://localhost:5173` 并重启后端。
- 查看容器日志：`docker compose logs -f` 或 `docker logs -f cf2dns`。

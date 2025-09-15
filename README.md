# CF2DNS

<div align="center">

![CF2DNS Logo](https://img.shields.io/badge/CF2DNS-v1.0.0-blue?style=for-the-badge&logo=cloudflare&logoColor=white)

**现代化的 Cloudflare DNS 管理面板**

[![GitHub release](https://img.shields.io/github/v/release/puyujian/CF2DNS)](https://github.com/puyujian/CF2DNS/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/puyujian/cf2dns)](https://hub.docker.com/r/puyujian/cf2dns)
[![GitHub Container Registry](https://img.shields.io/badge/ghcr.io-cf2dns-blue)](https://github.com/puyujian/CF2DNS/pkgs/container/cf2dns)
[![License](https://img.shields.io/github/license/puyujian/CF2DNS)](LICENSE)

[🌐 在线演示](#) • [📖 快速开始](#快速开始) • [🐳 Docker 部署](#docker-部署) • [📚 文档](#文档)

</div>

## 📖 项目简介

CF2DNS 是一个现代化的 Cloudflare DNS 管理面板，采用前后端分离架构设计。通过直观的 Web 界面，您可以轻松管理 Cloudflare 域名的 DNS 解析记录。

### ✨ 核心特性

- 🎯 **完整的 DNS 管理** - 查看、新增、修改、删除 DNS 解析记录
- 🌐 **多域名支持** - 统一管理账号下所有域名
- 🔐 **安全设计** - 后端代理 Cloudflare API，前端不暴露敏感 Token
- 🐳 **容器化部署** - 支持 Docker 一键部署，API 和静态文件同源提供
- 🚀 **自动构建** - GitHub Actions 自动构建和发布 Docker 镜像
- 💻 **现代化界面** - React + Vite + Tailwind CSS 构建的响应式界面

### 🏗️ 技术架构

| 组件 | 技术栈 | 说明 |
|------|--------|------|
| 前端 | React 18 + Vite + Tailwind CSS | 现代化响应式 Web 界面 |
| 后端 | Node.js + Express | API 代理服务器 |
| 部署 | Docker + Docker Compose | 容器化一键部署 |
| CI/CD | GitHub Actions | 自动构建和发布 |

### 📁 项目结构

```
CF2DNS/
├── client/          # React 前端应用
├── server/          # Express 后端服务
├── Dockerfile       # Docker 镜像构建文件
├── docker-compose.yml # Docker Compose 配置
├── .env.example     # 环境变量模板
└── README.md        # 项目文档
```

### 🔑 Cloudflare API Token 配置

为了安全使用，建议创建具有最小权限的 Cloudflare API Token：

**推荐权限配置：**
- `Zone:Zone:Read` - 读取域名信息
- `Zone:DNS:Edit` - 编辑 DNS 记录

**作用域选择：**
- 特定域名：更安全，仅管理指定域名
- 所有域名：更便捷，管理账号下所有域名

## 🚀 快速开始

### 📋 环境要求

- Node.js 18+ (本地开发)
- Docker & Docker Compose (容器化部署)
- Cloudflare API Token (必需)

### ⚡ 快速部署

**方法一：Docker Compose (推荐)**

```bash
# 1. 克隆项目
git clone https://github.com/puyujian/CF2DNS.git
cd CF2DNS

# 2. 配置环境变量
echo "CLOUDFLARE_API_TOKEN=你的Token" > .env

# 3. 启动服务
docker compose up -d

# 4. 访问应用
# 浏览器打开: http://localhost:3000
```

**方法二：直接使用 Docker 镜像**

```bash
docker run -d \
  --name cf2dns \
  -p 3000:3000 \
  -e CLOUDFLARE_API_TOKEN=你的Token \
  ghcr.io/puyujian/cf2dns:latest
```

## 🐳 Docker 部署

### 使用 Docker Compose 部署

Docker Compose 是推荐的部署方式，可以一键启动完整的服务栈。

**1. 准备配置文件**

```bash
# 克隆项目（或仅下载 docker-compose.yml）
git clone https://github.com/puyujian/CF2DNS.git
cd CF2DNS

# 创建环境变量文件
cp .env.example .env
# 编辑 .env 文件，填入你的 Cloudflare API Token
```

**2. 启动服务**

```bash
# 启动服务（后台运行）
docker compose up -d

# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f
```

**3. 访问应用**

打开浏览器访问 `http://localhost:3000`，开始管理您的 DNS 记录。

**4. 停止服务**

```bash
# 停止服务
docker compose down

# 停止并删除数据卷（注意：会清除所有数据）
docker compose down -v
```

### 使用 Docker 直接部署

如果您偏好直接使用 Docker 命令，可以按以下方式部署：

**1. 拉取镜像**

```bash
# 从 GitHub Container Registry 拉取
docker pull ghcr.io/puyujian/cf2dns:latest

# 或从 Docker Hub 拉取（如果可用）
docker pull puyujian/cf2dns:latest
```

**2. 运行容器**

```bash
docker run -d \
  --name cf2dns \
  --restart unless-stopped \
  -p 3000:3000 \
  -e CLOUDFLARE_API_TOKEN=你的Token \
  ghcr.io/puyujian/cf2dns:latest
```

**3. 管理容器**

```bash
# 查看容器状态
docker ps

# 查看容器日志
docker logs cf2dns

# 停止容器
docker stop cf2dns

# 重启容器
docker restart cf2dns

# 删除容器
docker rm cf2dns
```

### 自定义配置

您可以通过环境变量自定义配置：

```bash
docker run -d \
  --name cf2dns \
  --restart unless-stopped \
  -p 8080:3000 \
  -e CLOUDFLARE_API_TOKEN=你的Token \
  -e PORT=3000 \
  -e CORS_ORIGIN=https://yourdomain.com \
  ghcr.io/puyujian/cf2dns:latest
```

## 📦 手动部署

如果您需要更多控制权或在特殊环境中部署，可以选择手动部署方式。

### 环境要求

- Node.js 18 或更高版本
- npm 或 yarn 包管理器
- Git（用于克隆代码）

### 部署步骤

**1. 获取源码**

```bash
# 克隆项目
git clone https://github.com/puyujian/CF2DNS.git
cd CF2DNS

# 或下载发行版
wget https://github.com/puyujian/CF2DNS/archive/refs/tags/v1.0.0.tar.gz
tar -xzf v1.0.0.tar.gz
cd CF2DNS-1.0.0
```

**2. 安装依赖**

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

**3. 构建前端**

```bash
cd client
npm run build
```

**4. 配置环境变量**

```bash
# 返回项目根目录
cd ..

# 复制环境变量模板
cp .env.example .env

# 编辑环境变量文件
nano .env
```

在 `.env` 文件中配置以下变量：

```bash
# 必需：Cloudflare API Token
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here

# 可选：服务端口（默认 3000）
PORT=3000

# 可选：CORS 配置（开发环境使用）
CORS_ORIGIN=http://localhost:5173
```

**5. 启动服务**

```bash
cd server
npm start
```

服务将在 `http://localhost:3000` 启动。

### 生产环境优化

**使用 PM2 管理进程**

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
cd server
pm2 start server.js --name cf2dns

# 查看状态
pm2 status

# 查看日志
pm2 logs cf2dns

# 重启应用
pm2 restart cf2dns

# 开机自启
pm2 startup
pm2 save
```

**配置反向代理（Nginx 示例）**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 开发环境搭建

如果您想参与开发或进行二次开发，可以按以下步骤搭建开发环境。

### 本地开发

**1. 克隆项目**

```bash
git clone https://github.com/puyujian/CF2DNS.git
cd CF2DNS
```

**2. 配置环境变量**

```bash
cp .env.example .env
# 编辑 .env 文件，填入 Cloudflare API Token
```

**3. 启动后端服务**

```bash
cd server
npm install
npm run dev  # 后端将在 http://localhost:3000 启动
```

**4. 启动前端服务**

```bash
# 新开一个终端
cd client
npm install
npm run dev  # 前端将在 http://localhost:5173 启动
```

**5. 访问开发环境**

- 前端开发服务器: `http://localhost:5173`
- 后端 API 服务器: `http://localhost:3000`

开发模式下，前端会自动代理 API 请求到后端服务器。

### 构建生产版本

```bash
# 构建前端
cd client
npm run build

# 生产环境运行（前后端合一）
cd ../server
npm start
```

## 🌐 环境变量配置

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `CLOUDFLARE_API_TOKEN` | ✅ | - | Cloudflare API Token |
| `PORT` | ❌ | `3000` | 服务监听端口 |
| `ADMIN_PASSWORD` | ❌ | - | 后台管理密码（可选，启用后需要登录才能访问） |
| `CORS_ORIGIN` | ❌ | - | CORS 允许的源（开发环境用） |
| `VITE_API_BASE` | ❌ | - | 前端 API 基础地址 |

### 配置示例

**开发环境 (.env)**
```bash
CLOUDFLARE_API_TOKEN=your_token_here
PORT=3000
CORS_ORIGIN=http://localhost:5173
# 可选：启用后台登录验证
# ADMIN_PASSWORD=your_admin_password
```

**生产环境 (.env)**
```bash
CLOUDFLARE_API_TOKEN=your_token_here
PORT=3000
# 推荐：生产环境启用登录验证
ADMIN_PASSWORD=your_secure_password
```

### 🔐 后台登录功能（可选）

如果设置了 `ADMIN_PASSWORD` 环境变量，系统将启用后台登录验证：

- 所有 `/api/*` 路由都需要先登录才能访问
- 首次访问时会自动跳转到登录界面
- 登录成功后可正常使用所有功能
- 如果不设置此变量，则直接可以访问管理界面

**Docker 部署示例（启用登录）：**
```bash
docker run -d \
  --name cf2dns \
  --restart unless-stopped \
  -p 3000:3000 \
  -e CLOUDFLARE_API_TOKEN=你的Token \
  -e ADMIN_PASSWORD=你的管理密码 \
  ghcr.io/puyujian/cf2dns:latest
```

## 📚 API 文档

### 基础接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/zones` | 获取所有域名列表 |
| GET | `/api/zones/:zoneId/dns` | 获取指定域名的 DNS 记录 |
| POST | `/api/zones/:zoneId/dns` | 创建新的 DNS 记录 |
| PUT | `/api/zones/:zoneId/dns/:recordId` | 更新 DNS 记录 |
| DELETE | `/api/zones/:zoneId/dns/:recordId` | 删除 DNS 记录 |

### 响应格式

**成功响应**
```json
{
  "success": true,
  "data": {
    // 响应数据
  }
}
```

**错误响应**
```json
{
  "success": false,
  "error": "错误信息"
}
```

## ❓ 常见问题

### 部署相关

**Q: 启动时提示 "401 Unauthorized" 错误？**

A: 请检查您的 Cloudflare API Token 是否正确配置，且具有足够的权限：
- Zone:Zone:Read（读取域名）
- Zone:DNS:Edit（编辑 DNS 记录）

**Q: 容器启动失败？**

A: 请检查：
1. 端口 3000 是否被占用
2. 环境变量是否正确配置
3. Docker 是否正常运行

**Q: 无法访问管理界面？**

A: 请确认：
1. 服务是否正常启动（检查日志）
2. 防火墙是否开放相应端口
3. 如果使用反向代理，配置是否正确

### 功能相关

**Q: 看不到域名列表？**

A: 可能的原因：
1. API Token 权限不足
2. 账号下没有域名
3. Token 作用域限制了特定域名

**Q: DNS 记录操作失败？**

A: 请检查：
1. 记录格式是否正确
2. 是否有足够的权限
3. 网络连接是否正常

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/new-feature`)
3. 提交更改 (`git commit -m 'Add some feature'`)
4. 推送到分支 (`git push origin feature/new-feature`)
5. 创建 Pull Request

### 代码规范

- 使用 ESLint 和 Prettier
- 遵循现有的代码风格
- 添加适当的注释
- 测试新功能

## 📄 许可证

本项目使用 [MIT](LICENSE) 许可证。

## 🙏 致谢

感谢以下开源项目：

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Express](https://expressjs.com/)
- [Cloudflare API](https://api.cloudflare.com/)

---

<div align="center">

**[⬆ 回到顶部](#cf2dns)**

Made with ❤️ by [puyujian](https://github.com/puyujian)

</div>
# CF2DNS - Cloudflare DNS管理工具

一个基于 Cloudflare Workers 的现代化 DNS 管理工具，提供直观的 Web 界面来管理您的 Cloudflare DNS 记录和域名设置。

## ✨ 特性

- 🔐 **安全认证** - JWT 基础的用户认证系统
- 🌐 **多域名管理** - 支持管理多个 Cloudflare 域名
- 📝 **DNS 记录管理** - 完整的 CRUD 操作支持
- 🔍 **API 探索器** - 详细的 Cloudflare API 功能展示
- 📊 **实时监控** - 域名和 DNS 记录状态监控
- 🚀 **无服务器架构** - 基于 Cloudflare Workers 部署
- 📱 **响应式设计** - 支持桌面和移动设备

## 🛠️ 技术栈

### 前端
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 实用优先的 CSS 框架
- **React Router** - 客户端路由
- **React Query** - 数据获取和状态管理
- **Vite** - 快速的构建工具

### 后端
- **Cloudflare Workers** - 无服务器计算平台
- **Hono.js** - 轻量级 Web 框架
- **Cloudflare D1** - SQLite 数据库
- **Cloudflare KV** - 键值存储
- **JWT** - 身份验证

## 🚀 快速开始

### 前置要求

- Node.js 18+ 
- npm 或 pnpm
- Cloudflare 账户
- Wrangler CLI

### 安装

1. 克隆项目
```bash
git clone https://github.com/your-username/cf2dns.git
cd cf2dns
```

2. 安装依赖
```bash
npm install
# 或
pnpm install
```

3. 配置环境变量
```bash
cp wrangler.toml.example wrangler.toml
# 编辑 wrangler.toml 文件，填入您的配置
```

4. 创建数据库
```bash
# 创建 D1 数据库
wrangler d1 create cf2dns-db

# 应用数据库迁移
wrangler d1 migrations apply cf2dns-db --local
```

5. 创建 KV 命名空间
```bash
wrangler kv:namespace create "SESSIONS"
```

### 开发

1. 启动开发服务器
```bash
# 启动前端开发服务器
npm run dev

# 在另一个终端启动 Worker 开发服务器
wrangler dev
```

2. 访问应用
- 前端: http://localhost:3000
- API: http://localhost:8787

### 部署

1. 构建项目
```bash
npm run build
```

2. 部署到 Cloudflare Workers
```bash
wrangler deploy
```

## 📁 项目结构

```
cf2dns/
├── src/
│   ├── components/          # React 组件
│   │   ├── auth/           # 认证相关组件
│   │   ├── layout/         # 布局组件
│   │   └── ui/             # 通用 UI 组件
│   ├── lib/                # 工具库和配置
│   │   ├── auth/           # 认证逻辑
│   │   ├── constants.ts    # 常量定义
│   │   └── utils.ts        # 工具函数
│   ├── pages/              # 页面组件
│   │   ├── auth/           # 认证页面
│   │   ├── dashboard/      # 仪表板
│   │   ├── domains/        # 域名管理
│   │   └── dns/            # DNS 管理
│   ├── types/              # TypeScript 类型定义
│   ├── worker/             # Cloudflare Worker 代码
│   │   ├── middleware/     # 中间件
│   │   ├── routes/         # API 路由
│   │   └── index.ts        # Worker 入口
│   ├── App.tsx             # 应用根组件
│   └── main.tsx            # 应用入口
├── migrations/             # 数据库迁移文件
├── public/                 # 静态资源
├── package.json
├── wrangler.toml          # Cloudflare Workers 配置
├── vite.config.ts         # Vite 配置
└── tailwind.config.js     # Tailwind CSS 配置
```

## 🔧 配置

### Cloudflare Workers 配置

编辑 `wrangler.toml` 文件：

```toml
name = "cf2dns"
main = "src/worker/index.ts"
compatibility_date = "2024-12-18"

[vars]
JWT_SECRET = "your-jwt-secret"
CORS_ORIGIN = "https://your-domain.com"

[[d1_databases]]
binding = "DB"
database_name = "cf2dns-db"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-namespace-id"
```

### 环境变量

创建 `.env.local` 文件（仅用于开发）：

```env
VITE_API_BASE_URL=http://localhost:8787/api
```

## 📖 API 文档

### 认证端点

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/refresh` - 刷新令牌

### 用户端点

- `GET /api/user/profile` - 获取用户资料
- `PUT /api/user/profile` - 更新用户资料
- `GET /api/user/settings` - 获取用户设置
- `PUT /api/user/settings` - 更新用户设置

### Cloudflare API 代理

- `GET /api/cloudflare/accounts` - 获取账户列表
- `GET /api/cloudflare/zones` - 获取域名列表
- `GET /api/cloudflare/dns-records` - 获取 DNS 记录

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Cloudflare](https://cloudflare.com) - 提供强大的边缘计算平台
- [React](https://reactjs.org) - 用户界面库
- [Tailwind CSS](https://tailwindcss.com) - CSS 框架
- [Hono.js](https://hono.dev) - Web 框架

## 📞 支持

如果您有任何问题或建议，请：

- 创建 [Issue](https://github.com/your-username/cf2dns/issues)
- 发送邮件至 support@cf2dns.com
- 查看 [文档](https://docs.cf2dns.com)

---

**CF2DNS** - 让 DNS 管理变得简单高效 🚀

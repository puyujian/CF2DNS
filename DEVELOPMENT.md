# CF2DNS 开发指南

本文档提供了 CF2DNS 项目的详细开发指南，包括环境设置、开发流程和部署说明。

## 🚀 快速开始

### 前置要求

- Node.js 18+ 
- npm 或 pnpm
- Cloudflare 账户
- Wrangler CLI (`npm install -g wrangler`)

### 初始化项目

1. **克隆项目**
```bash
git clone https://github.com/your-username/cf2dns.git
cd cf2dns
```

2. **运行初始化脚本**
```bash
npm run setup
```

这个脚本会自动：
- 安装依赖
- 登录 Cloudflare
- 创建 D1 数据库
- 创建 KV 命名空间
- 应用数据库迁移
- 生成 JWT 密钥
- 创建环境配置文件

3. **配置环境**

编辑 `wrangler.toml` 文件，更新以下配置：
- `database_id`: D1 数据库 ID
- `id`: KV 命名空间 ID  
- `JWT_SECRET`: JWT 密钥

### 开发环境

#### 启动开发服务器

**方式一：分别启动前端和后端**
```bash
# 终端 1: 启动前端开发服务器
npm run dev

# 终端 2: 启动 Worker 开发服务器  
npm run dev:worker
```

**方式二：同时启动前端和后端**
```bash
npm run dev:full
```

#### 访问应用

- 前端: http://localhost:3000
- API: http://localhost:8787
- Worker 管理界面: http://localhost:8787/__scheduled

## 📁 项目结构

```
cf2dns/
├── src/
│   ├── components/          # React 组件
│   │   ├── auth/           # 认证相关组件
│   │   ├── layout/         # 布局组件
│   │   └── ui/             # 通用 UI 组件
│   ├── lib/                # 工具库和配置
│   │   ├── api/            # API 客户端
│   │   ├── auth/           # 认证逻辑
│   │   ├── hooks/          # React Hooks
│   │   ├── constants.ts    # 常量定义
│   │   └── utils.ts        # 工具函数
│   ├── pages/              # 页面组件
│   │   ├── auth/           # 认证页面
│   │   ├── dashboard/      # 仪表板
│   │   ├── domains/        # 域名管理
│   │   ├── dns/            # DNS 管理
│   │   └── api/            # API 探索器
│   ├── types/              # TypeScript 类型定义
│   ├── worker/             # Cloudflare Worker 代码
│   │   ├── lib/            # Worker 工具库
│   │   ├── middleware/     # 中间件
│   │   ├── routes/         # API 路由
│   │   └── index.ts        # Worker 入口
│   ├── App.tsx             # 应用根组件
│   └── main.tsx            # 应用入口
├── migrations/             # 数据库迁移文件
├── scripts/                # 部署和设置脚本
├── public/                 # 静态资源
└── 配置文件...
```

## 🛠️ 开发工作流

### 代码规范

项目使用以下工具确保代码质量：

- **TypeScript**: 类型安全
- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **Tailwind CSS**: 样式规范

运行代码检查：
```bash
npm run lint
npm run type-check
npm run format
```

### 数据库操作

#### 创建迁移
```bash
npm run db:generate migration_name
```

#### 应用迁移
```bash
# 本地环境
npm run db:apply:local

# 远程环境
npm run db:apply
```

### API 开发

#### 添加新的 API 端点

1. 在 `src/worker/routes/` 中创建或编辑路由文件
2. 在 `src/worker/index.ts` 中注册路由
3. 在前端创建对应的 API 客户端方法
4. 创建 React Query hooks

#### API 测试

使用内置的 API 探索器测试 API：
- 访问 `/api-explorer` 页面
- 选择要测试的端点
- 配置参数并执行请求

### 前端开发

#### 添加新页面

1. 在 `src/pages/` 中创建页面组件
2. 在 `src/App.tsx` 中添加路由
3. 在侧边栏导航中添加链接

#### 状态管理

项目使用 React Query 进行状态管理：
- 服务器状态: React Query
- 本地状态: React useState/useReducer
- 全局状态: React Context

#### UI 组件

使用 `src/components/ui/` 中的基础组件：
- Button, Input, Card, Alert 等
- 遵循设计系统规范
- 支持主题和响应式设计

## 🚀 部署

### 准备部署

1. **检查配置**
```bash
npm run type-check
npm run lint
```

2. **构建项目**
```bash
npm run build
```

### 部署到 Cloudflare Workers

#### 自动部署
```bash
npm run deploy:full
```

#### 手动部署
```bash
# 部署到生产环境
npm run deploy

# 部署到预览环境
npm run deploy:preview
```

### 环境管理

项目支持多环境部署：

- **development**: 本地开发
- **preview**: 预览环境
- **production**: 生产环境

每个环境都有独立的：
- D1 数据库
- KV 命名空间
- 环境变量

## 🔧 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `wrangler.toml` 中的数据库 ID
   - 确保数据库迁移已应用

2. **认证失败**
   - 检查 JWT_SECRET 配置
   - 确保 KV 命名空间正确配置

3. **API 请求失败**
   - 检查 CORS 配置
   - 确保 API 端点正确

4. **构建失败**
   - 运行 `npm run type-check` 检查类型错误
   - 检查依赖版本兼容性

### 调试技巧

1. **Worker 日志**
```bash
wrangler tail
```

2. **本地调试**
```bash
# 启用详细日志
wrangler dev --log-level debug
```

3. **数据库查询**
```bash
# 连接到本地数据库
wrangler d1 execute cf2dns-db --local --command "SELECT * FROM users"
```

## 📚 参考资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Hono.js 文档](https://hono.dev/)
- [React Query 文档](https://tanstack.com/query/latest)
- [Tailwind CSS 文档](https://tailwindcss.com/)

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 创建 Pull Request

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 错误修复
- `docs:` 文档更新
- `style:` 代码格式化
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

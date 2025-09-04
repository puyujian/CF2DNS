# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

CF2DNS 是一个基于 Cloudflare Workers 的 DNS 记录管理系统，采用前后端分离架构：
- **前端**：React + TypeScript + Vite 构建的 SPA 应用
- **后端**：Cloudflare Worker 提供 API 服务，使用 D1 数据库存储数据
- **部署**：Worker 和前端资源均部署到 Cloudflare 平台

## 开发命令

### 前端开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建前端资源
npm run build

# 预览构建结果
npm run preview
```

### Worker 开发与部署
```bash
# 本地开发 Worker
npm run dev:worker

# 部署到 Cloudflare
npm run deploy

# 查看 Worker 日志
wrangler tail
```

### 数据库管理
```bash
# 应用数据库迁移
wrangler d1 migrations apply cf2dns-db

# 本地数据库操作
wrangler d1 execute cf2dns-db --local --command="SELECT * FROM users"

# 生产环境数据库操作
wrangler d1 execute cf2dns-db --command="SELECT * FROM users"
```

## 核心架构

### 目录结构
- `src/` - React 前端应用源码
  - `pages/` - 页面组件（登录、DNS管理、用户配置等）
  - `components/` - 可复用组件
  - `lib/` - 工具库和 API 客户端
  - `types/` - TypeScript 类型定义
- `src/worker/` - Cloudflare Worker 后端代码
  - `routes/` - API 路由处理器
  - `lib/` - Worker 工具库和数据库操作

### 认证机制
系统使用 JWT Token 进行用户认证：
- 前端通过 `src/lib/auth/authAPI.ts` 处理登录/注册
- Worker 在 `src/worker/routes/user.ts` 中验证 Token 有效性
- Token 存储在 localStorage 中，通过 Authorization header 传递

### API 架构
- **前端 API 客户端**：`src/lib/api/cloudflareAPI.ts` 封装所有与 Cloudflare API 的交互
- **Worker API 路由**：`src/worker/routes/api.ts` 处理 DNS 记录的 CRUD 操作
- **用户管理路由**：`src/worker/routes/user.ts` 处理用户认证和配置

### 数据流
1. 用户在前端操作 DNS 记录
2. 前端调用 Worker API (`/api/*`)
3. Worker 验证用户权限并调用 Cloudflare API
4. 操作结果返回前端更新 UI

### 状态管理
- 使用 React hooks (useState, useEffect) 管理组件状态
- DNS 记录数据通过 API 调用获取，无全局状态管理器
- 用户信息和认证状态存储在 localStorage

## 数据库设计

主要表结构：
- `users` - 用户基本信息和 Cloudflare 凭证
- `dns_records` - DNS 记录缓存（可选）
- `user_settings` - 用户个性化配置

## 环境变量配置

Worker 需要以下环境变量：
- `JWT_SECRET` - JWT 签名密钥
- `DB` - D1 数据库绑定（在 wrangler.toml 中配置）

## 部署流程

1. 确保 wrangler.toml 配置正确
2. 运行 `npm run build` 构建前端
3. 运行 `npm run deploy` 部署 Worker 和前端资源
4. 通过 Cloudflare Dashboard 配置域名和路由

## 调试技巧

- 使用 `wrangler tail` 查看 Worker 实时日志
- 前端开发时可在浏览器 Network 面板查看 API 调用
- D1 数据库可通过 wrangler CLI 直接查询调试
- Worker 本地开发使用 `--local` 参数避免影响生产环境
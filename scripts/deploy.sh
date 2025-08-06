#!/bin/bash

# CF2DNS 部署脚本
# 用于部署到 Cloudflare Workers

set -e

echo "🚀 开始部署 CF2DNS..."

# 检查必要的工具
command -v wrangler >/dev/null 2>&1 || { echo "❌ 错误: 需要安装 wrangler CLI" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ 错误: 需要安装 npm" >&2; exit 1; }

# 检查配置文件
if [ ! -f "wrangler.toml" ]; then
    echo "❌ 错误: 找不到 wrangler.toml 配置文件"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 类型检查
echo "🔍 进行类型检查..."
npm run type-check

# 构建前端
echo "🏗️ 构建前端..."
npm run build:frontend

# 检查数据库配置
echo "🗄️ 检查数据库配置..."
if ! wrangler d1 list | grep -q "cf2dns-db"; then
    echo "⚠️ 警告: 数据库 cf2dns-db 不存在，请先创建数据库"
    echo "运行: wrangler d1 create cf2dns-db"
    echo "然后更新 wrangler.toml 中的 database_id"
    exit 1
fi

# 应用数据库迁移
echo "🔄 应用数据库迁移..."
wrangler d1 migrations apply cf2dns-db

# 检查 KV 命名空间
echo "🔑 检查 KV 命名空间..."
if ! wrangler kv:namespace list | grep -q "SESSIONS"; then
    echo "⚠️ 警告: KV 命名空间 SESSIONS 不存在，请先创建"
    echo "运行: wrangler kv:namespace create \"SESSIONS\""
    echo "然后更新 wrangler.toml 中的 id"
    exit 1
fi

# 部署到 Workers
echo "🚀 部署到 Cloudflare Workers..."
wrangler deploy

echo "✅ 部署完成！"
echo ""
echo "🌐 您的应用已部署到 Cloudflare Workers"
echo "📝 请确保在 Cloudflare 控制台中配置以下内容："
echo "   - 自定义域名（可选）"
echo "   - 环境变量（如果需要）"
echo "   - 安全设置"
echo ""
echo "🔗 访问您的应用: https://cf2dns.your-subdomain.workers.dev"

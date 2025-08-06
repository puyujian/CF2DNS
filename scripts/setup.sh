#!/bin/bash

# CF2DNS 初始化设置脚本
# 用于初始化项目环境

set -e

echo "🎯 CF2DNS 项目初始化..."

# 检查必要的工具
command -v wrangler >/dev/null 2>&1 || { echo "❌ 错误: 需要安装 wrangler CLI" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ 错误: 需要安装 npm" >&2; exit 1; }

# 安装依赖
echo "📦 安装项目依赖..."
npm install

# 登录 Cloudflare
echo "🔐 登录 Cloudflare..."
if ! wrangler whoami >/dev/null 2>&1; then
    echo "请登录您的 Cloudflare 账户:"
    wrangler login
fi

# 创建 D1 数据库
echo "🗄️ 创建 D1 数据库..."
DB_OUTPUT=$(wrangler d1 create cf2dns-db 2>/dev/null || echo "数据库可能已存在")
if [[ $DB_OUTPUT == *"database_id"* ]]; then
    DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | cut -d'"' -f4)
    echo "✅ 数据库创建成功，ID: $DB_ID"
    echo "请将此 ID 更新到 wrangler.toml 文件中"
else
    echo "ℹ️ 数据库可能已存在，请检查 wrangler.toml 配置"
fi

# 创建 KV 命名空间
echo "🔑 创建 KV 命名空间..."
KV_OUTPUT=$(wrangler kv:namespace create "SESSIONS" 2>/dev/null || echo "KV 命名空间可能已存在")
if [[ $KV_OUTPUT == *"id"* ]]; then
    KV_ID=$(echo "$KV_OUTPUT" | grep "id" | cut -d'"' -f4)
    echo "✅ KV 命名空间创建成功，ID: $KV_ID"
    echo "请将此 ID 更新到 wrangler.toml 文件中"
else
    echo "ℹ️ KV 命名空间可能已存在，请检查 wrangler.toml 配置"
fi

# 应用数据库迁移
echo "🔄 应用数据库迁移..."
if wrangler d1 migrations apply cf2dns-db --local; then
    echo "✅ 本地数据库迁移完成"
else
    echo "⚠️ 本地数据库迁移失败，请检查配置"
fi

# 生成 JWT 密钥
echo "🔐 生成 JWT 密钥..."
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "请手动生成 JWT 密钥")
if [[ $JWT_SECRET != "请手动生成 JWT 密钥" ]]; then
    echo "✅ JWT 密钥生成成功: $JWT_SECRET"
    echo "请将此密钥更新到 wrangler.toml 文件的 JWT_SECRET 变量中"
else
    echo "⚠️ 无法自动生成 JWT 密钥，请手动生成并更新到配置文件中"
fi

# 创建环境配置文件
echo "📝 创建环境配置文件..."
cat > .env.local << EOF
# 开发环境配置
VITE_API_BASE_URL=http://localhost:8787/api

# 如果需要，可以添加其他环境变量
# VITE_APP_NAME=CF2DNS
# VITE_APP_VERSION=1.0.0
EOF

echo "✅ 环境配置文件已创建: .env.local"

# 创建示例配置文件
echo "📋 创建示例配置文件..."
cp wrangler.toml wrangler.toml.example

echo ""
echo "🎉 初始化完成！"
echo ""
echo "📝 接下来的步骤:"
echo "1. 更新 wrangler.toml 文件中的数据库 ID 和 KV 命名空间 ID"
echo "2. 更新 JWT_SECRET 环境变量"
echo "3. 运行 'npm run dev' 启动开发服务器"
echo "4. 运行 'wrangler dev' 启动 Worker 开发服务器"
echo "5. 访问 http://localhost:3000 查看应用"
echo ""
echo "🚀 准备部署时运行: ./scripts/deploy.sh"

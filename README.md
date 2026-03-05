# YoloSkin

[English README](./README.en.md)

YoloSkin 是一个 Minecraft 皮肤服务器，采用 Rust + Next.js 的前后端架构，提供皮肤/披风管理、角色管理、微软正版绑定、管理员后台以及 Yggdrasil 兼容接口。

## 功能概览

- 用户注册、登录、会话认证
- 角色创建与管理
- 皮肤/披风上传、管理与衣柜收藏
- 微软正版账号绑定与同步
- 管理后台（用户、纹理、审计、站点设置、OAuth、邮箱设置）
- Yggdrasil 认证相关接口

## 技术栈

- 后端：Rust, Axum, Sea-ORM, PostgreSQL
- 前端：Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- 数据库迁移：sea-orm-migration

## 仓库结构

```text
.
├── crates/
│   ├── server/      # Axum 服务
│   ├── entity/      # Sea-ORM 实体
│   └── migration/   # 数据库迁移
├── web/             # Next.js 前端
├── docker-compose.yml
└── Cargo.toml       # Rust workspace
```

## 快速开始

### 1) 启动 PostgreSQL

```bash
docker compose up -d postgres
```

### 2) 启动后端

```bash
export DATABASE_URL="postgres://skinserver:skinserver@localhost:5432/skinserver"
export BIND_ADDR="127.0.0.1:3000"
export PUBLIC_BASE_URL="http://localhost:3000"
export DATA_DIR="./data"

cargo run -p migration
cargo run -p server
```

### 3) 启动前端（开发）

```bash
cd web
npm install
npm run dev
```

## 常用命令

### Rust

```bash
cargo check --workspace --all-targets
RUSTFLAGS="-Dwarnings" cargo check --workspace --all-targets
cargo run -p migration
cargo run -p server
```

### Frontend

```bash
cd web
npx tsc --noEmit
npm run build
npm run lint
```

## 关键环境变量（后端）

- `DATABASE_URL`：PostgreSQL 连接串（必填）
- `BIND_ADDR`：服务监听地址，默认 `127.0.0.1:3000`
- `PUBLIC_BASE_URL`：公开访问基础 URL
- `DATA_DIR`：纹理文件存储目录
- `SESSION_SECRET`：会话签名密钥（生产环境必须设置）
- `SESSION_COOKIE_NAME`：会话 Cookie 名称（默认 `gs_session`）
- `SESSION_COOKIE_SECURE`：是否启用 Secure Cookie（`true/false`）

## 部署说明

1. 构建前端：`cd web && npm run build`
2. 构建后端：`cargo build --release -p server`
3. 配置生产环境变量
4. 执行迁移：`./target/release/migration`
5. 启动服务：`./target/release/server`

后端会提供 `/api` 接口，并从 `web/out` 提供静态前端文件。

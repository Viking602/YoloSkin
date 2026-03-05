# YoloSkin

[简体中文 README](./README.zh-CN.md)

YoloSkin is a Minecraft skin server built with a Rust + Next.js architecture. It provides skin/cape management, player profile management, Microsoft account binding, admin tools, and Yggdrasil-compatible APIs.

## Features

- User registration, login, and session-based authentication
- Player creation and management
- Skin/cape upload, management, and closet collection
- Microsoft premium account binding and sync
- Admin console (users, textures, audit logs, site settings, OAuth, email settings)
- Yggdrasil authentication endpoints

## Tech Stack

- Backend: Rust, Axum, Sea-ORM, PostgreSQL
- Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- Migration: sea-orm-migration

## Repository Structure

```text
.
├── crates/
│   ├── server/      # Axum service
│   ├── entity/      # Sea-ORM entities
│   └── migration/   # Database migrations
├── web/             # Next.js frontend
├── docker-compose.yml
└── Cargo.toml       # Rust workspace
```

## Quick Start

### 1) Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2) Start Backend

```bash
export DATABASE_URL="postgres://skinserver:skinserver@localhost:5432/skinserver"
export BIND_ADDR="127.0.0.1:3000"
export PUBLIC_BASE_URL="http://localhost:3000"
export DATA_DIR="./data"

cargo run -p migration
cargo run -p server
```

### 3) Start Frontend (Development)

```bash
cd web
npm install
npm run dev
```

## Common Commands

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

## Key Backend Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required)
- `BIND_ADDR`: bind address, default `127.0.0.1:3000`
- `PUBLIC_BASE_URL`: public base URL used by the service
- `DATA_DIR`: texture file storage directory
- `SESSION_SECRET`: session signing secret (must be set in production)
- `SESSION_COOKIE_NAME`: cookie name (default `gs_session`)
- `SESSION_COOKIE_SECURE`: enable secure cookie (`true/false`)

## Deployment

1. Build frontend: `cd web && npm run build`
2. Build backend: `cargo build --release -p server`
3. Configure production environment variables
4. Run migration: `./target/release/migration`
5. Start server: `./target/release/server`

The backend serves API routes under `/api` and static frontend assets from `web/out`.

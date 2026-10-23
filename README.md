# YoloSkin

YoloSkin 是一个完全由 Cloudflare 托管的 Minecraft 皮肤服务：

- Cloudflare Workers：HTTP API、认证、管理后台接口和 Yggdrasil 协议。
- Cloudflare D1：用户、会话、角色、纹理元数据、衣柜、设置和审计日志。
- Cloudflare R2：PNG 皮肤与披风对象。
- Cloudflare Email Service：发送密码重置事务邮件。
- Cloudflare Queues：异步投递邮件、自动重试与死信处理。
- Cloudflare Turnstile 与 Workers Rate Limiting：保护找回密码接口。
- Workers Static Assets：同一个 Worker 域名托管 `web/out` 静态前端。

项目不再包含 Rust、PostgreSQL、本地文件系统或 Docker 运行链。

## 本地开发

要求 Bun 1.4+ 和 Node.js 22.12+（Next.js、Wrangler 的工具运行时）。依赖安装和项目命令统一使用 Bun。

当前框架版本：Next.js 16.4.2、React 19.3.1、Hono 4.13.13、TypeScript 7.0.2、Tailwind CSS 4.3.3。前后端使用 ESNext、显式类型导入和严格索引检查；Next 配置使用 `next.config.ts` 与 `satisfies NextConfig`。

升级参考：[Next.js 官方指南](https://nextjs.org/docs/app/getting-started/upgrading)、[Cloudflare Vitest 插件迁移](https://developers.cloudflare.com/workers/testing/vitest-integration/migration-guides/migrate-to-vitest-plugin/)。测试工具使用 `@cloudflare/vitest-plugin` 1.4.7 与 Vitest 5.0.5。

```bash
bun install
bun install --cwd web
cp .dev.vars.example .dev.vars
bun run build
bun run d1:migrate:local
bun run dev
```

根目录和 `web/` 分别维护 `bun.lock`；CI 可使用 `bun install --frozen-lockfile` 和 `bun install --cwd web --frozen-lockfile`。测试请使用 `bun run test`，由 Vitest 启动 Cloudflare Workers 模拟环境。

Wrangler 默认在 `.wrangler/state` 中模拟 D1、R2、Queues 和 Email Service。本地邮件不会真实发送，正文会记录到 Wrangler 输出指示的临时文件。本地站点为 `http://localhost:8787`。

## Cloudflare 资源初始化

登录并创建 D1、R2 和邮件队列：

```bash
bunx wrangler login
bunx wrangler d1 create yoloskin-db
bunx wrangler r2 bucket create yoloskin-textures
bunx wrangler queues create yoloskin-password-reset
bunx wrangler queues create yoloskin-email-dlq
```

把 `wrangler d1 create` 返回的 UUID 写入 `wrangler.jsonc` 的 `database_id`，替换全零占位值。然后执行：

```bash
bun run d1:migrate:remote
```

### 密码找回资源

1. 在 Cloudflare 控制台创建 Turnstile Widget，将正式 Site Key 写入 `wrangler.jsonc` 的 `TURNSTILE_SITE_KEY`。
2. 在 Cloudflare Email Service 中接入用于发信的域名或子域名。
3. 把 `wrangler.jsonc` 中两处 `noreply@example.com` 同时替换成已接入的发件地址。
4. 把 `PUBLIC_BASE_URL` 改为正式 HTTPS 域名。重置邮件始终使用这个固定地址生成链接，不读取请求的 Host。

Cloudflare 向任意收件人发送事务邮件需要 Workers Paid；Email Sending 当前仍为 Beta。未完成这些配置时，密码找回页面会明确显示服务不可用。

可选的 OAuth 与 Yggdrasil 签名密钥只能通过 Workers Secrets 配置，不能写入仓库或 D1：

```bash
bunx wrangler secret put GOOGLE_CLIENT_SECRET
bunx wrangler secret put MICROSOFT_CLIENT_SECRET
bunx wrangler secret put OAUTH_STATE_SECRET
bunx wrangler secret put TURNSTILE_SECRET_KEY
bunx wrangler secret put RESET_TOKEN_ENCRYPTION_KEY
bunx wrangler secret put PASSWORD_RESET_RATE_KEY
bunx wrangler secret put YGGDRASIL_PRIVATE_KEY
bunx wrangler secret put YGGDRASIL_PUBLIC_KEY
```

Yggdrasil RSA 密钥可这样生成：

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out yggdrasil-private.pem
openssl rsa -pubout -in yggdrasil-private.pem -out yggdrasil-public.pem
```

把私钥与公钥分别粘贴给对应的 `wrangler secret put`，随后安全删除本地 PEM 文件。

`RESET_TOKEN_ENCRYPTION_KEY` 和 `PASSWORD_RESET_RATE_KEY` 应分别使用独立的高熵随机值，例如先执行 `openssl rand -base64 32` 生成，再交互式粘贴给 `wrangler secret put`。不要将结果写入仓库。

## 找回密码流程

1. 用户在 `/auth/forgot` 提交邮箱并完成 Turnstile。
2. Worker 始终返回相同的 `202` 响应，避免泄漏账号是否存在。
3. 有效账号获得一个 20 分钟、单次使用的随机令牌；D1 只长期保存 SHA-256 摘要。
4. Queue Consumer 使用 Email Service 发送邮件，失败最多重试五次，之后进入 `yoloskin-email-dlq`。
5. 用户通过 `/auth/reset/#token=...` 设置新密码。URL Fragment 不会随静态页面请求进入访问日志。
6. 重置成功后，全部网页登录 Session 和 Yggdrasil Token 会在同一个 D1 事务中撤销。

同一账号始终只有最新链接有效。令牌投递前使用 AES-GCM 临时加密，邮件成功后立即从 D1 清除密文。

## 首位管理员

注册第一个账号后，用 D1 CLI 提升权限：

```bash
bunx wrangler d1 execute yoloskin-db --remote --command "UPDATE users SET permission = 2 WHERE email = 'admin@example.com'"
```

## 验证与部署

```bash
bun run check
bun run deploy
```

`bun run check` 会依次执行 Next 静态导出、前后端类型检查、绑定类型漂移检查、Vitest 测试和 Wrangler dry-run。

部署后把 `wrangler.jsonc` 的 `PUBLIC_BASE_URL` 改为正式自定义域名。Yggdrasil 基础地址为：

```text
https://your-domain.example/api/yggdrasil
```

## 数据与安全约束

- 登录态使用 `HttpOnly`、`SameSite=Lax` Cookie；D1 只保存令牌 SHA-256 摘要。
- 密码使用 Web Crypto PBKDF2-SHA256（100,000 次迭代）。
- 纹理上传上限 2 MiB，并校验 PNG 签名与 Minecraft 尺寸。
- R2 响应直接流式返回，不把对象整体读入 Worker 内存。
- OAuth 与 RSA 密钥通过 Wrangler secrets 注入。
- 找回密码使用 Turnstile、账号/IP 限流、D1 全局冷却和统一响应防止滥用与账号枚举。
- 重置密码采用一次性令牌，并在 D1 事务中撤销现有会话。
- 默认不要求注册邮箱验证；找回密码邮件本身会验证用户对该邮箱的控制权。

## 目录

```text
worker/src/          Worker 入口、通用能力、服务和路由
migrations/          D1 SQL migrations
web/                 Next.js 静态前端
wrangler.jsonc       Workers、D1、R2、Assets 和可观测性配置
```

# StatisticalSystem

六合彩邮件快照、开奖入库、用户端结算查看、管理端轻量维护的 monorepo。

## 目录

```text
apps/
  web/      React + Vite 前端，部署到 Cloudflare Pages
  worker/   Cloudflare Worker API / Email / Scheduled
packages/
  shared/   共享类型与常量
  parser/   前端本地解析、结算、图表聚合
db/
  schema.sql
  seeds.sql
docs/
  frontend-local-processing.md
```

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 初始化 D1

```bash
npx wrangler d1 execute statisticalsystem_db --config apps/worker/wrangler.jsonc --file db/schema.sql
npx wrangler d1 execute statisticalsystem_db --config apps/worker/wrangler.jsonc --file db/seeds.sql
```

3. 启动 Worker

```bash
npm run dev:worker
```

4. 启动前端

```bash
npm run dev:web
```

## Cloudflare

1. 设置 Cloudflare API Token

```bash
export CLOUDFLARE_API_TOKEN="<your-cloudflare-api-token>"
```

2. 创建 Pages 项目

```bash
npm run cf:pages:create
```

3. 部署 Worker

```bash
npm run cf:worker:deploy
```

4. 设置前端构建时 API 地址并部署 Pages

```bash
export VITE_API_BASE_URL="https://statisticalsystem-worker.<your-subdomain>.workers.dev"
npm run cf:pages:deploy
```

## 演示账号

- 用户端：`demo / user123`
- 管理端：`admin / admin123`

## 说明

- 邮件快照按 `account + expect` 覆盖保存最后一次
- 邮件期号按北京时间 `06:00 -> 次日 06:00` 计算业务日
- 开奖抓取只在返回目标 `expect` 时才入库
- 订单解析和结算计算由前端本地完成

## 部署前需要确认

- [apps/worker/wrangler.jsonc](/mnt/c/Users/victo/Desktop/tongji/apps/worker/wrangler.jsonc) 中的 `database_id`
- [apps/worker/wrangler.jsonc](/mnt/c/Users/victo/Desktop/tongji/apps/worker/wrangler.jsonc) 中的 `APP_ORIGIN`
- `accounts.inbox` 种子邮箱
- Worker 自定义域名、Pages 自定义域名与 Email Routing 配置

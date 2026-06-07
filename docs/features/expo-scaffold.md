# Expo + Node 项目骨架

| 字段 | 值 |
|------|-----|
| slug | expo-scaffold |
| 状态 | draft |
| PRD 章节 | 技术栈规划、§8 用户旅程基础设施 |
| 原型 | 底部 Tab：首页 / 路线 / 地图 / 我的（screens_01-home） |

## 用户故事

作为开发者，我希望有一套可运行的 Expo 移动端与 Node API 单体仓库骨架，以便后续按 PR 迭代业务功能。

## 验收标准

- [ ] `server/` 可启动，`GET /api/health` 返回 `{ ok: true, db: "connected" \| "disconnected" }`
- [ ] `mobile/` 可 `npx expo start`，展示 4 Tab 占位页（首页、路线、地图、我的）
- [ ] 环境变量通过 `.env.example` 文档化，不含密钥
- [ ] README 含本地启动步骤（MongoDB、server、mobile）
- [ ] 根 `.gitignore` 覆盖 `mobile/`、`server/` 构建产物

## 范围

### 做

- `server/`：Express + TypeScript、`/api/health`、MongoDB 连接封装
- `mobile/`：Expo SDK 52+、expo-router、4 Tab 布局、API base URL 配置
- `docs/features/expo-scaffold.md`（本文档）
- 更新根 `README.md` 启动说明

### 不做（本阶段）

- 用户认证、路线 CRUD、GPS、地图组件
- Apple Watch、HealthKit
- CI/CD、Docker、EAS 构建配置

## 数据模型

本 PR **不新增** 集合。仅连接已有 `yejing` 库用于 health check（`db.admin().ping()`）。

## API

### `GET /api/health`

**Response 200**

```json
{
  "ok": true,
  "service": "yejing-api",
  "db": "connected",
  "timestamp": "2026-06-07T12:00:00.000Z"
}
```

MongoDB 不可达时 `db: "disconnected"`，HTTP 仍为 200（便于运维探活）。

## 移动端

### 目录（expo-router）

```
mobile/
├── app/
│   ├── _layout.tsx      # Tab 导航
│   ├── index.tsx        # 首页
│   ├── routes.tsx       # 路线
│   ├── map.tsx          # 地图
│   └── profile.tsx      # 我的
├── constants/api.ts     # EXPO_PUBLIC_API_URL
└── package.json
```

### 对照原型

| Tab | 原型文件 | 本阶段 |
|-----|----------|--------|
| 首页 | screens_01-home | 标题 + 「野径」占位 |
| 路线 | screens_07-route-list | 占位文案 |
| 地图 | — | 占位文案 |
| 我的 | screens_09-profile | 占位文案 |

## 后端

### 目录

```
server/
├── src/
│   ├── index.ts         # Express 入口
│   ├── config.ts        # 环境变量
│   └── db.ts            # MongoClient 单例
├── package.json
└── tsconfig.json
```

### 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | `3001` | API 端口 |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | MongoDB 连接 |
| `MONGODB_DB` | `yejing` | 数据库名 |

### 移动端环境变量

| 变量 | 说明 |
|------|------|
| `EXPO_PUBLIC_API_URL` | 如 `http://localhost:3001`（真机用局域网 IP） |

## 本地启动

```bash
# 1. MongoDB
~/mongodb/start.sh

# 2. API
cd server && npm install && npm run dev

# 3. Mobile
cd mobile && npm install && npx expo start
```

## 测试计划

- [ ] `curl http://localhost:3001/api/health` 返回 JSON
- [ ] Expo Web 或模拟器可打开 4 个 Tab
- [ ] 修改 `EXPO_PUBLIC_API_URL` 后移动端可配置 API 地址

## 开放问题

- 后续是否改为 pnpm workspace  monorepo（v1.1 再评估）
- 真机调试 API 地址文档化在 README

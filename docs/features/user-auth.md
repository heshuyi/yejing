# 用户认证

| 字段 | 值 |
|------|-----|
| slug | user-auth |
| 状态 | draft |
| PRD 章节 | §8 用户旅程、数据模型（用户维度） |
| 原型 | screens_09-profile（账号入口后续扩展） |

## 用户故事

作为徒步者，我希望用邮箱注册并登录野径账号，以便我的路线与标记数据与账号绑定、可在多设备同步。

## 验收标准

- [ ] `POST /api/auth/register` 可用邮箱+密码创建用户，返回 JWT 与用户信息（不含密码）
- [ ] `POST /api/auth/login` 校验密码后返回 JWT
- [ ] `GET /api/auth/me` 携带有效 Bearer token 返回当前用户
- [ ] 无效/缺失 token 访问受保护接口返回 `401`
- [ ] Expo 提供登录页与注册页，成功后进入 Tab 首页并持久化 token
- [ ] `users` 集合已建索引；`routes` 文档预留 `userId` 字段（本阶段可不写入业务数据）

## 范围

### 做

- MongoDB `users` 集合与唯一邮箱索引
- 服务端注册、登录、`/me` 路由
- JWT 签发与 `auth` 中间件
- `server/.env` 增加 `JWT_SECRET`
- Expo：`app/(auth)/login.tsx`、`register.tsx`；`AuthContext` + SecureStore 存 token
- 未登录时重定向到登录页（Tab 路由守卫）
- `scripts/init-yejing-db.js` 补充 `users` 集合索引说明（可选种子用户）

### 不做（本阶段）

- 忘记密码、邮箱验证、第三方登录（Apple/微信）
- 路线 CRUD 与 `userId` 业务写入（留给 `routes-crud`）
- 刷新 token、多端踢下线
- 隐私政策 / 用户协议页面（留给 `profile`）

## 数据模型

### 集合 `users`

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | ObjectId | 主键 |
| `email` | string | 登录邮箱，唯一 |
| `passwordHash` | string | bcrypt 哈希 |
| `displayName` | string | 显示名，默认可取邮箱 @ 前 |
| `createdAt` | Date | 创建时间 |
| `updatedAt` | Date | 更新时间 |

### 索引

- `{ email: 1 }` unique

### `routes` 预留

后续 `routes-crud` 将为每条路线增加 `userId: ObjectId`，本 PR 仅在设计/类型层预留，不修改路线业务逻辑。

## API

### `POST /api/auth/register`

**Request**

```json
{
  "email": "hiker@example.com",
  "password": "至少8位密码",
  "displayName": "山野客"
}
```

**Response 201**

```json
{
  "token": "<jwt>",
  "user": {
    "id": "...",
    "email": "hiker@example.com",
    "displayName": "山野客"
  }
}
```

**Errors**: `400` 参数无效；`409` 邮箱已注册

### `POST /api/auth/login`

**Request**

```json
{
  "email": "hiker@example.com",
  "password": "..."
}
```

**Response 200**

```json
{
  "token": "<jwt>",
  "user": { "id": "...", "email": "...", "displayName": "..." }
}
```

**Errors**: `401` 邮箱或密码错误

### `GET /api/auth/me`

**Headers**: `Authorization: Bearer <jwt>`

**Response 200**

```json
{
  "user": { "id": "...", "email": "...", "displayName": "..." }
}
```

## 移动端

### 页面

| 路由 | 文件 | 说明 |
|------|------|------|
| 登录 | `app/(auth)/login.tsx` | 邮箱、密码、跳转注册 |
| 注册 | `app/(auth)/register.tsx` | 邮箱、密码、昵称 |

### 状态

- `contexts/AuthContext.tsx`：token、user、login/register/logout
- `expo-secure-store` 持久化 `yejing_token`
- 根 `_layout.tsx`：未登录 → `(auth)`，已登录 → `(tabs)`

### 对照原型

本阶段以功能可用为主；视觉对齐 screens_09 的简洁列表风格，主色 `#0071e3`。

## 后端

### 模块与文件

```
server/src/
├── middleware/auth.ts      # JWT 校验
├── routes/auth.ts          # register / login / me
├── models/user.ts          # 用户 CRUD、密码哈希
└── index.ts                # 挂载 /api/auth
```

### 依赖

- `bcryptjs`：密码哈希
- `jsonwebtoken`：JWT

### 环境变量

```
JWT_SECRET=开发环境随机长字符串
JWT_EXPIRES_IN=7d
```

## 测试计划

- [ ] `curl` 注册 → 登录 → `/me` 全流程
- [ ] 错误密码返回 401
- [ ] Expo 冷启动后 token 仍有效可进首页
- [ ] `npm run typecheck`（server）无报错

## 开放问题

- PRD v1 曾写「全流程无需登录」；MVP 技术栈采用账号绑定路线，登录为路线库前置条件，与 backlog 一致。若产品改为纯本地优先，可推迟本功能。

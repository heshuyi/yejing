# 路线 CRUD

| 字段 | 值 |
|------|-----|
| slug | routes-crud |
| 状态 | draft |
| PRD 章节 | §5.6 路线库 |
| 原型 | screens_07-route-list.html |

## 用户故事

作为已登录的徒步者，我希望在「路线」Tab 查看、筛选、搜索自己的路线列表，并进入单条路线查看基础信息，以便管理历史记录与进行中的徒步。

## 验收标准

- [ ] `GET /api/routes` 仅返回当前登录用户的路线，支持 `status` 筛选与 `q` 关键词搜索
- [ ] 进行中（`active`）路线排在列表前部
- [ ] `GET /api/routes/:id` 返回单条路线；非本人或无此 ID 返回 `404`
- [ ] `POST /api/routes` 可创建 `draft` 草稿（至少含名称）
- [ ] `PATCH /api/routes/:id` 可更新名称、起终点文案、环线标记、状态（限合法枚举）
- [ ] `DELETE /api/routes/:id` 删除本人路线
- [ ] Expo「路线」Tab 展示卡片列表、状态筛选 Chip、搜索框
- [ ] 点击卡片进入路线详情占位页（完整地图详情留给 `route-detail`）
- [ ] 新注册用户路线列表为空状态

## 范围

### 做

- `routes` 集合增加 `userId` 字段（新建路线必填）
- 服务端 CRUD 路由 + `requireAuth` 鉴权
- 列表排序：`active` 优先，其次 `updatedAt` 降序
- 移动端路线库列表、空状态、详情占位页
- `mobile/lib/api.ts` 路线 API 封装

### 不做（本阶段）

- 规划新路线完整表单（`plan-route`）
- 路线详情地图、轨迹、标记聚合（`route-detail`）
- 删除路线时级联清理 markers / track_points
- GPX 导入、缩略轨迹 SVG 渲染
- 首页「最近路线」「进行中卡片」（后续迭代）

## 数据模型

### 集合 `routes` 变更

在现有字段基础上新增：

| 字段 | 类型 | 说明 |
|------|------|------|
| `userId` | ObjectId | 所属用户，必填（新数据） |

已有字段沿用：`name`, `status`, `isLoop`, `startPlace`, `endPlace`, `startCoordinate`, `endCoordinate`, `goalDistanceKm`, `stats`, `startedAt`, `createdAt`, `updatedAt`

### 索引

- 新增 `{ userId: 1, status: 1, updatedAt: -1 }`
- 保留全文索引供搜索

### 列表项摘要（API 响应）

```json
{
  "id": "...",
  "name": "雾凇岭环线",
  "status": "active",
  "distanceKm": 4.2,
  "markerCount": 2,
  "startPlace": "雾凇岭停车场 P2",
  "updatedAt": "2026-06-07T12:00:00.000Z"
}
```

## API

所有接口需 `Authorization: Bearer <jwt>`。

### `GET /api/routes`

**Query**

| 参数 | 说明 |
|------|------|
| `status` | 可选：`draft` / `active` / `completed` |
| `q` | 可选：名称或地点关键词 |

**Response 200**

```json
{
  "routes": [ { "id": "...", "name": "...", "status": "active", ... } ]
}
```

### `GET /api/routes/:id`

**Response 200**：完整路线对象（含 stats、坐标等）

**Errors**: `404`

### `POST /api/routes`

**Request**

```json
{
  "name": "周末试探路线",
  "isLoop": false,
  "startPlace": "",
  "endPlace": ""
}
```

**Response 201**：新建 `draft` 路线

### `PATCH /api/routes/:id`

**Request**（字段均可选）

```json
{
  "name": "新名称",
  "status": "completed",
  "startPlace": "停车场 A",
  "endPlace": "山顶观景台",
  "isLoop": true
}
```

### `DELETE /api/routes/:id`

**Response 204**

## 移动端

### 页面

| 路由 | 文件 | 说明 |
|------|------|------|
| 路线库 | `app/(tabs)/routes.tsx` | 列表、搜索、筛选 |
| 路线详情占位 | `app/routes/[id].tsx` | 名称、状态、里程等基础信息 |

### 对照原型 screens_07

- 顶部标题「路线库」
- 搜索框 + 筛选 Chip（全部 / 进行中 / 已完成 / 草稿）
- 路线卡片：名称、里程·标记数·日期、状态徽章
- FAB「规划路线」本阶段仅提示「即将在规划功能中开放」

### 状态

- 进入 Tab 时用 `useAuth().token` 拉取列表
- 下拉刷新重新请求

## 后端

### 模块与文件

```
server/src/
├── models/route.ts
├── routes/routes.ts
└── index.ts          # 挂载 /api/routes
```

## 测试计划

- [ ] 用户 A 无法读取用户 B 的路线
- [ ] 筛选 `status=active` 只返回进行中
- [ ] 搜索关键词匹配名称或地点
- [ ] Expo 列表与空状态展示正确
- [ ] 点击进入详情页显示路线名称

## 开放问题

- 种子数据中的历史路线无 `userId`，不会出现在任何登录用户列表中；开发演示需自行创建路线。

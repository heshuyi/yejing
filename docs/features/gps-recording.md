# GPS 轨迹记录

| 字段 | 值 |
|------|-----|
| slug | gps-recording |
| 状态 | draft |
| PRD 章节 | §5.2 GPS 记录 |
| 原型 | screens_02-recording.html |

## 分析

| 维度 | 决策 |
|------|------|
| 依赖 | `routes-crud` 已有路线与 `userId` 隔离；从 `draft` 或继续 `active` 记录 |
| 后台 GPS | 本 PR 用 `expo-location` 前台轮询；iOS Background Session 留给后续 |
| 暂停 | 客户端停采样 + 服务端 `recordingState: paused` |
| 轨迹存储 | 批量写入 `track_points`；结束时可由服务端重算里程/爬升 |
| 不做 | Watch 心率、标记 Sheet、真实 MapKit 底图、HealthKit |

## 用户故事

作为徒步者，我希望对一条路线开始 GPS 记录、暂停/继续、结束后保存轨迹与统计，以便在路线库中查看已完成记录。

## 验收标准

- [ ] `POST .../recording/start`：`draft`→`active` 或恢复已暂停的 `active` 记录
- [ ] `POST .../recording/pause` / `resume`：切换 `recordingState`
- [ ] `POST .../track-points`：批量写入轨迹点（仅 `active` 路线）
- [ ] `GET .../track-points`：按时间返回轨迹点列表
- [ ] `POST .../recording/finish`：`active`→`completed`，更新 `stats.distanceKm` / `elevationGainM` / `durationSec`
- [ ] Expo 记录页：实时距离、时长、暂停/结束；地图占位 + 折线
- [ ] 路线详情「开始记录」进入记录页；首页展示进行中路线入口
- [ ] 模拟器无 GPS 时可用演示坐标降级（便于开发测试）

## 范围

### 做

- `routes` 增加 `recordingState?: 'recording' | 'paused'`（`active` 时有效）
- 记录相关 API（见下）
- `server/src/lib/geo.ts` 里程/爬升计算
- `mobile/app/recording/[id].tsx` + `expo-location`
- 首页进行中卡片、详情页开始/继续记录按钮

### 不做

- 后台持续定位、低电量降采样、弱 GPS Banner
- 标记 Bottom Sheet（`markers`）
- Watch 心率条（`watch-health`）
- 结束写入 HealthKit

## 数据模型

### `routes` 扩展

| 字段 | 类型 | 说明 |
|------|------|------|
| `recordingState` | string | `recording` / `paused`，仅 `status=active` |
| `startedAt` | Date | 首次开始记录时间 |

### `track_points`（已有）

| 字段 | 类型 | 说明 |
|------|------|------|
| `routeId` | ObjectId | 路线 |
| `timestamp` | Date | 采样时间 |
| `location` | GeoPoint | WGS84 |
| `altitude` | number | 米，可选 |
| `speed` | number | m/s，可选 |
| `accuracy` | number | 米，可选 |

## API

均需 `Authorization: Bearer <jwt>`，且路线属当前用户。

### `POST /api/routes/:id/recording/start`

**Response 200**：`{ route }`（`status: active`, `recordingState: recording`）

**Errors**: `404` / `409`（已完成路线不可再录）

### `POST /api/routes/:id/recording/pause`

**Response 200**：`{ route }`（`recordingState: paused`）

### `POST /api/routes/:id/recording/resume`

**Response 200**：`{ route }`（`recordingState: recording`）

### `POST /api/routes/:id/track-points`

**Request**

```json
{
  "points": [
    {
      "timestamp": "2026-06-08T03:00:00.000Z",
      "location": { "type": "Point", "coordinates": [120.12, 30.22] },
      "altitude": 120,
      "speed": 1.1,
      "accuracy": 8
    }
  ]
}
```

**Response 201**：`{ inserted: 1 }`

### `GET /api/routes/:id/track-points`

**Response 200**：`{ points: [...] }`

### `POST /api/routes/:id/recording/finish`

**Request**

```json
{ "durationSec": 3600 }
```

**Response 200**：`{ route }`（`status: completed`，`stats` 已更新）

## 移动端

### 页面 `app/recording/[id].tsx`

对照 screens_02：
- 顶部路线名 + 记录中徽章
- 地图占位 + 轨迹折线（已有 + 实时点）
- 指标：距离 km、时长、爬升 m
- 暂停 / 继续 / 结束（确认）

### 入口

- `routes/[id]`：草稿或进行中 →「开始记录」/「继续记录」
- 首页：有 `active` 路线时显示进行中卡片

## 测试计划

- [ ] curl：start → track-points → pause → resume → finish 全流程
- [ ] 非本人路线返回 404
- [ ] `npm run typecheck`（server）通过
- [ ] 模拟器降级模式可写入轨迹点

## 开放问题

- 真机后台记录与 4h 续航验证留待专项优化 PR。

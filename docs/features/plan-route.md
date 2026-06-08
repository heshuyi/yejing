# 规划新路线

| 字段 | 值 |
|------|-----|
| slug | plan-route |
| 状态 | draft |
| PRD 章节 | §5.7 规划路线 |
| 原型 | screens_08-plan-route.html |

## 用户故事

作为徒步者，我希望在出发前填写路线名称、起终点与环线设置，并保存为草稿，以便之后在路线库中管理并规划如何到达。

## 验收标准

- [ ] 「路线」Tab FAB 进入规划页
- [ ] 路线名称必填；起点名称、终点名称可填
- [ ] 环线开启后终点名称与坐标自动同步起点
- [ ] 地图占位区可点选起点/终点坐标（本阶段为示意地图，非真实底图）
- [ ] 可选目标距离区间
- [ ] 「仅保存草稿」创建/更新 `draft` 路线并返回路线库
- [ ] 「保存并规划到达」保存后跳转路线详情（如何到达功能留给 `transit`）
- [ ] 保存后路线出现在路线库草稿/对应筛选中

## 范围

### 做

- 扩展 `POST /api/routes`、`PATCH /api/routes/:id` 支持：
  - `startCoordinate` / `endCoordinate`（GeoJSON Point）
  - `goalDistanceKm`（`{ min?, max? }`）
  - 已有字段：`name`, `isLoop`, `startPlace`, `endPlace`
- Expo 页面 `app/routes/plan.tsx`
- 路线库 FAB 跳转规划页
- `mobile/lib/api.ts` 扩展 `createRoute` / 新增 `updateRoute`

### 不做（本阶段）

- 真实地图 SDK（react-native-maps）、卫星底图
- GPX 导入与轨迹预览
- 「如何到达」导航跳转（`transit`）
- 保存后立即开始 GPS 记录（`gps-recording`）
- 编辑进行中/已完成路线的状态变更限制（仅允许编辑草稿）

## 数据模型

沿用 `routes` 集合，规划页写入字段：

| 字段 | 说明 |
|------|------|
| `name` | 必填 |
| `startPlace` / `endPlace` | 地点文案 |
| `startCoordinate` / `endCoordinate` | `[lng, lat]` |
| `isLoop` | 环线时 `end*` 与 `start*` 一致 |
| `goalDistanceKm` | 可选，如 `{ min: 10, max: 15 }` |
| `status` | 固定 `draft`（本 PR） |

## API 变更

### `POST /api/routes` 扩展 Request

```json
{
  "name": "雾凇岭环线",
  "isLoop": true,
  "startPlace": "雾凇岭停车场 P2",
  "endPlace": "雾凇岭停车场 P2",
  "startCoordinate": { "type": "Point", "coordinates": [119.7128, 30.2841] },
  "endCoordinate": { "type": "Point", "coordinates": [119.7128, 30.2841] },
  "goalDistanceKm": { "min": 10, "max": 15 }
}
```

### `PATCH /api/routes/:id` 扩展

同上字段均可选；仅允许修改 `status === 'draft'` 的路线（否则 `409`）。

## 移动端

### 页面 `app/routes/plan.tsx`

对照 screens_08：
- 顶部返回 + 标题「规划新路线」
- 路线名称输入
- 地图占位（点选起终点 Pin）
- 起终点名称输入
- 环线 Switch
- 目标距离 Picker（不设定 / 5–10 / 10–15 / 15–25 / 25+ km）
- 底部双按钮：主按钮「保存并规划到达」、次按钮「仅保存草稿」

### 路由

- 新建：`/routes/plan`
- 编辑草稿：`/routes/plan?id=<routeId>`（可选）

## 测试计划

- [ ] 环线开启后 endPlace 与 startPlace 同步
- [ ] 保存草稿后路线库可见
- [ ] 编辑已有草稿可 PATCH 更新
- [ ] 非草稿路线编辑返回 409

## 开放问题

- 地图选点为示意坐标；接入真实地图 SDK 时替换 `MapPickPlaceholder` 组件即可。

# 补给 / 美照标记

| 字段 | 值 |
|------|-----|
| slug | markers |
| 状态 | draft |
| PRD 章节 | §5.3 标记管理 |
| 原型 | screens_03-markers.html |

## 分析

| 维度 | 决策 |
|------|------|
| 依赖 | `routes-crud` + `gps-recording`（路线与坐标已具备） |
| 数据 | 复用 `markers` 集合；类型 `supply` / `photo` 等 |
| 里程 | 有起点坐标时，用 Haversine 计算 `distanceFromStart`（km） |
| 权限 | 仅路线所有者可增删改查 |
| 本 PR 不做 | 真实地图 Pin、照片上传、左滑删除、长按地图添加 |

## 用户故事

作为徒步者，我希望在路线中记录补给点与美照位置，并按类型筛选查看，以便徒步时和回顾时快速找到关键地点。

## 验收标准

- [ ] `GET /api/routes/:id/markers` 返回该路线标记，支持 `type` 筛选
- [ ] `GET /api/markers` 返回当前用户全部标记（地图 Tab 用），支持 `routeId`、`type`
- [ ] `POST /api/routes/:id/markers` 创建标记，自动计算 `distanceFromStart`
- [ ] `PATCH` / `DELETE` 单条标记；删除后更新路线 `stats.markerCount`
- [ ] 美照类型可填 `facing`、`bestTime`
- [ ] Expo：路线标记列表页（筛选 + 添加）
- [ ] 地图 Tab 展示跨路线标记列表与类型筛选
- [ ] 记录页可快捷添加当前位置标记

## API

### `GET /api/markers?routeId=&type=`

**Response 200**

```json
{
  "markers": [
    {
      "id": "...",
      "routeId": "...",
      "routeName": "雾凇岭环线",
      "type": "supply",
      "name": "补水点",
      "distanceFromStart": 2.4,
      "coordinate": { "type": "Point", "coordinates": [120.12, 30.22] }
    }
  ]
}
```

### `GET /api/routes/:id/markers?type=`

### `POST /api/routes/:id/markers`

**Request**

```json
{
  "type": "photo",
  "name": "观景台",
  "note": "傍晚光线好",
  "coordinate": { "type": "Point", "coordinates": [120.12, 30.22] },
  "facing": "西",
  "bestTime": "日落前 1 小时"
}
```

### `PATCH /api/routes/:id/markers/:markerId`

### `DELETE /api/routes/:id/markers/:markerId`

## 移动端

| 页面 | 路径 | 说明 |
|------|------|------|
| 路线标记 | `/routes/[id]/markers` | 列表 + 类型 Chip + 添加 |
| 地图 Tab | `(tabs)/map` | 全部标记 + 路线/类型筛选 |

Pin 颜色：补给 `#0071e3`，美照 `#16a34a`。

## 测试计划

- [ ] `scripts/test-markers.sh` 全流程通过
- [ ] `npm run test`（server）通过

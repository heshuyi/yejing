# 如何到达

| 字段 | 值 |
|------|-----|
| slug | transit |
| 状态 | draft |
| PRD 章节 | §5.4 如何到达 |
| 原型 | screens_04-transit.html |

## 分析

| 维度 | 决策 |
|------|------|
| 依赖 | `routes-crud` / `plan-route` 起终点坐标与文案 |
| ETA | 本 PR 不调用 MKDirections；由系统地图 App 计算 |
| 导航 | `Linking` 打开 Apple Maps / Google Maps URL |
| 不做 | 真实公交路线解析、网约车深链、MKMapItem 原生模块 |

## 验收标准

- [ ] `GET /api/routes/:id/transit` 返回起终点信息与环线提示
- [ ] 页面可切换「徒步起点 / 徒步终点」
- [ ] 交通方式：驾车 / 公交 / 步行（影响地图 URL 参数）
- [ ] 点击「在地图中打开导航」唤起系统地图
- [ ] 环线时终点 Tab 显示与起点相同提示
- [ ] 路线详情、规划保存后跳转本页

## API

### `GET /api/routes/:id/transit`

**Response 200**

```json
{
  "routeId": "...",
  "routeName": "雾凇岭环线",
  "isLoop": true,
  "loopHint": "环线：回程与起点相同",
  "start": { "place": "停车场 P2", "coordinate": { "type": "Point", "coordinates": [119.71, 30.28] } },
  "end": { "place": "停车场 P2", "coordinate": { "type": "Point", "coordinates": [119.71, 30.28] } }
}
```

**Errors**: `404` 路线不存在；`400` 起终点均无坐标

## 移动端

### 页面 `app/routes/[id]/transit.tsx`

对照 screens_04：起终点 Tab、地点卡片、交通方式列表、打开地图按钮。

### 入口

- 路线详情「如何到达」
- 规划页「保存并规划到达」→ 本页

## 测试

- [ ] `scripts/test-transit.sh` 通过

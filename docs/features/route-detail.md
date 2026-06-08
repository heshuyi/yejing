# 路线详情（轨迹 + 标记聚合）

| 字段 | 值 |
|------|-----|
| slug | route-detail |
| 状态 | draft |
| PRD 章节 | §5.5 路线详情 |
| 原型 | screens_06-route-detail.html |

## 分析

| 维度 | 决策 |
|------|------|
| 依赖 | `gps-recording`（轨迹点）、`markers`（标记） |
| 聚合 API | 单次请求返回路线 + 轨迹 + 标记 + 统计摘要 |
| 地图 | 占位视图绘制 polyline + 彩色 Pin（非 MapKit） |
| 不做 | GPX 导出、心率图、Sheet 拖拽、再走一次 |

## 验收标准

- [ ] `GET /api/routes/:id/detail` 返回路线、轨迹点、标记、统计摘要
- [ ] 详情页：地图区展示轨迹折线与标记 Pin
- [ ] 底部统计：里程、爬升、时长、标记数
- [ ] 标记横向滑动列表，点击进入标记管理页
- [ ] 「如何到达」按钮占位（`transit` 实现）

## API

### `GET /api/routes/:id/detail`

**Response 200**

```json
{
  "route": { },
  "track": { "pointCount": 42, "coordinates": [[120.12, 30.22], ...] },
  "markers": [ ],
  "summary": {
    "distanceKm": 12.8,
    "elevationGainM": 520,
    "durationSec": 16200,
    "markerCount": 6
  }
}
```

## 测试

- [ ] `scripts/test-route-detail.sh` 通过

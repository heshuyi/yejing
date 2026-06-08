# 野径 · 参考：Backlog 与设计模板

## MVP 功能 Backlog（建议 PR 顺序）

每项 = **Design PR** + **Implementation PR**。

| 序 | slug | 功能 | 设计范围 | 实现范围 | 依赖 |
|----|------|------|----------|----------|------|
| 1 | `expo-scaffold` | Expo + Node 单体仓库骨架 | 目录结构、环境变量、启动命令 | `mobile/`、`server/` 初始化 | main 含 PRD |
| 2 | `user-auth` | 用户表与认证 | users 集合、JWT、注册登录 API | server 路由 + mobile 登录页 | expo-scaffold |
| 3 | `routes-crud` | 路线 CRUD | routes API、列表/详情 | server + mobile 路线库 Tab | user-auth |
| 4 | `plan-route` | 规划新路线 | 起终点、环线、草稿状态 | 对照 screens_08 | routes-crud |
| 5 | `gps-recording` | GPS 记录 | 轨迹写入 track_points、暂停/结束 | 对照 screens_02 | routes-crud |
| 6 | `markers` | 补给 / 美照标记 | markers API、地图+列表 | 对照 screens_03 | routes-crud |
| 7 | `route-detail` | 路线详情 | 轨迹+Pin+统计聚合查询 | 对照 screens_06 | markers, gps-recording |
| 8 | `transit` | 如何到达 | 起终点导航跳转 | 对照 screens_04 | routes-crud |
| 9 | `watch-health` | Watch 健康数据 | health_sessions 写入与查询 | 对照 screens_05 | gps-recording |
| 10 | `profile` | 我的 / 设置 | 统计、权限说明、导出 | 对照 screens_09 | user-auth |

后续 v1.1：`watch-os-app`、`gpx-import-export`、`offline-maps`

## 设计文档模板

新建 `docs/features/<slug>.md`：

```markdown
# <功能名>

| 字段 | 值 |
|------|-----|
| slug | <slug> |
| 状态 | draft |
| PRD 章节 | §x.x |
| 原型 | screens_XX-*.html |

## 用户故事

作为 <角色>，我希望 <行为>，以便 <价值>。

## 验收标准

- [ ] ...
- [ ] ...

## 范围

### 做
- ...

### 不做（本阶段）
- ...

## 数据模型

### 集合 / 表
...

### 索引
...

## API（如有）

### `METHOD /path`
**Request**
```json
```

**Response**
```json
```

## 移动端

### 页面 / 组件
- 路由：
- 对照原型：

### 状态与交互
...

## 后端

### 模块与文件
- `server/src/...`

## 测试计划

- [ ] ...

## 开放问题

- ...
```

## MongoDB 现有集合

| 集合 | 说明 |
|------|------|
| `routes` | 路线主表 |
| `markers` | 标记（supply / photo / rest） |
| `track_points` | GPS 轨迹点 |
| `health_sessions` | Watch 健康数据 |

`routes` 已增加 `userId` 字段（`routes-crud` 起新建路线必填）。

## GitHub 推送备忘

终端需代理时：

```bash
export HTTP_PROXY=http://127.0.0.1:12334 HTTPS_PROXY=http://127.0.0.1:12334
```

远程：`https://github.com/heshuyi/yejing`

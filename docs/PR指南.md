# 野径 · Pull Request 指南

> 你不用亲自操作 PR，AI 会按功能拆分、用中文写说明并提交。你只需要在 GitHub 上点 **合并**（或让 AI 代合并）。

## PR 是什么？

**Pull Request（合并请求）** = 把某个分支的改动，申请合并进 `main` 主分支。

- 每个 PR 只做 **一件事**（一份文档 / 一个功能）
- **标题和说明必须用中文**
- 合并前可 Review，合并后代码进入主线

## 本项目的 PR 节奏

每个功能通常 **2 个 PR**：

```
1. 设计 PR（docs/xxx）  → 只含设计文档
2. 实现 PR（feat/xxx）  → 只含代码
```

## 已合并的基础 PR（#1–#6）

| 顺序 | 内容 | 状态 |
|------|------|------|
| 1 | PRD 产品需求文档 | ✅ 已合并 |
| 2 | HTML 交互原型（10 屏） | ✅ 已合并 |
| 3 | MongoDB 初始化脚本 | ✅ 已合并 |
| 4 | PR 驱动开发 Cursor Skill | ✅ 已合并 |
| 5 | Expo + Node 骨架设计 | ✅ 已合并 |
| 6 | Expo + Node 骨架实现 | ✅ 已合并 |

## 已合并的功能 PR

| 顺序 | slug | 说明 | 状态 |
|------|------|------|------|
| 7 | `pr-workflow` | 本指南 + Skill 中文 PR 规范 | ✅ |
| 8–9 | `user-auth` | 用户认证（设计 → 实现） | ✅ |
| 11–12 | `routes-crud` | 路线库 CRUD（设计 → 实现） | ✅ |
| 14–15 | `plan-route` | 规划新路线（设计 → 实现） | ✅ |

## 下一步

| slug | 说明 |
|------|------|
| `gps-recording` | GPS 轨迹记录 |
| `markers` | 补给 / 美照标记 |
| 更多 | 见 `.cursor/skills/yejing-pr-driven-dev/reference.md` |

## 你怎么参与（可选）

1. 打开 https://github.com/heshuyi/yejing/pulls
2. 看 PR **标题**和 **概要** 是否看得懂
3. 没问题就点 **合并 Pull Request** → **确认合并**

不必懂 Git：PR 列表就是「待你批准的改动清单」。

## 本地与 GitHub

终端推送 GitHub 前需代理（本机 VPN）：

```bash
export HTTP_PROXY=http://127.0.0.1:12334 HTTPS_PROXY=http://127.0.0.1:12334
```

或使用：

```bash
./scripts/github-proxy.sh git push -u origin <分支名>
```

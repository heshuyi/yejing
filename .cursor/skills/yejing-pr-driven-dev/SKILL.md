---
name: yejing-pr-driven-dev
description: >-
  Drives 野径 (yejing) hiking app development with design-first, one-PR-per-feature
  workflow: write spec → open design/docs PR → implement on feature branch → commit
  and open impl PR. Use when developing 野径, yejing, Expo + Node features, splitting
  work into PRs, or when the user asks for PR-driven feature development.
---

# 野径 · 设计先行 + 分 PR 开发

每个功能：**先设计文档 PR → 再实现 PR**。禁止跳过设计直接堆代码。

## 技术栈

| 层 | 选型 |
|----|------|
| 移动端 | Expo (React Native) |
| 后端 | Node.js (Express 或 Fastify) |
| 数据库 | MongoDB `yejing` 库 |
| 原型参考 | `screens_*.html`、`index.html` |
| 需求基准 | `PRD-野径徒步App.md`（合并后位于 main） |

目标目录（逐步实现）：

```
mobile/          # Expo App
server/          # Node API
docs/features/   # 每功能设计文档
scripts/         # DB 脚本等
```

## 硬规则

1. **一功能一对 PR 组**（设计 PR + 实现 PR），文件范围不重叠
2. **设计 PR 只含** `docs/features/` 下 markdown，不含业务代码
3. **实现 PR 只含** 该功能代码；不夹带无关重构
4. **禁止** `git add .`；只 stage 本 PR 计划内文件
5. **禁止** 未获用户确认就 push / 开 PR（用户明确说「继续」「提交 PR」除外）
6. **PR 标题与正文必须用中文**（commit message 可英文，便于工具链）
6. 推送前设置代理（本机 VPN）：

```bash
export HTTP_PROXY=http://127.0.0.1:12334
export HTTPS_PROXY=http://127.0.0.1:12334
export ALL_PROXY=http://127.0.0.1:12334
```

或使用 `./scripts/github-proxy.sh <command>`

## 单功能工作流

```
Task Progress:
- [ ] Step 1: 读 PRD + 对照 HTML 原型
- [ ] Step 2: 写设计文档 docs/features/<slug>.md
- [ ] Step 3: 分支 docs/<slug> → 仅提交设计 → 开 Design PR
- [ ] Step 4: 用户确认 / PR 合并后，从 main 拉 feat/<slug>
- [ ] Step 5: 按设计实现（server → mobile 或并行）
- [ ] Step 6: 小步 commit → 开 Implementation PR
- [ ] Step 7: PR 描述附验收清单与测试说明
```

### Step 1：对齐需求

- 读 [PRD-野径徒步App.md](../../PRD-野径徒步App.md) 对应章节
- 打开相关 `screens_XX-*.html` 确认 UI 与交互
- 查 [reference.md](reference.md) 中的功能 backlog 与依赖顺序

### Step 2：写设计文档

使用 [reference.md](reference.md) 中的 **设计文档模板**，必须包含：

- 用户故事与验收标准
- API 路由 / 请求响应（如有后端）
- 数据模型变更（集合、字段、索引）
- 移动端页面与原型屏映射
- 非目标（本 PR 不做什么）

### Step 3：Design PR

```bash
git checkout main && git pull origin main
git checkout -b docs/<slug>
# 只添加 docs/features/<slug>.md
git add docs/features/<slug>.md
git commit -m "docs(<slug>): add feature design spec"
git push -u origin docs/<slug>
gh pr create --base main --head docs/<slug> \
  --title "docs: <功能名> 设计说明" \
  --body "$(cat <<'EOF'
## 概要
- 功能设计规格（无实现代码）

## 测试清单
- [ ] 与 PRD 章节一致
- [ ] API/数据模型完整
- [ ] 验收标准可执行
EOF
)"
```

`gh` 不可用时用 GitHub API（需 token + 代理），或请用户手动开 PR。

### Step 4–6：Implementation PR

```bash
git checkout main && git pull origin main
git checkout -b feat/<slug>
# 仅实现设计文档中的范围
git add <planned files only>
git commit -m "feat(<slug>): <简短说明>"
git push -u origin feat/<slug>
```

- 每个逻辑单元一次 commit（如 `feat(auth): add login endpoint`）
- Implementation PR 正文链接对应 Design PR / `docs/features/<slug>.md`
- 实现完成前不自作主张扩大 scope

### Step 7：验收

PR 正文必须含（中文）：

```markdown
## 概要
- 本 PR 做了什么

## 设计文档
- docs/features/<slug>.md

## 测试清单
- [ ] 本地 API 可调用 / Expo 页面可预览
- [ ] 与设计文档验收标准一致
- [ ] 无无关文件变更
```

用户参与说明见 `docs/PR指南.md`。批量更新/合并 PR 可用 `scripts/github-pr-manage.py`（需代理与 GitHub token）。

## 分支命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 设计 | `docs/<slug>` | `docs/user-auth` |
| 实现 | `feat/<slug>` | `feat/user-auth` |
| 修复 | `fix/<slug>` | `fix/marker-map-pin` |
| 基建 | `chore/<slug>` | `chore/expo-scaffold` |

`slug`：小写英文连字符，与 `docs/features/<slug>.md` 一致。

## Commit 规范

```
<type>(<scope>): <imperative summary>

类型: feat | fix | docs | chore | test
scope: auth | routes | markers | mobile | server | db
```

示例：`feat(markers): add photo spot facing and bestTime fields`

## 功能开发顺序

按 [reference.md](reference.md) 的 **MVP 顺序** 执行；有依赖时先合并前置功能的 Implementation PR。

## 与已有 PR 的关系

仓库已有基础 PR（文档 / 原型 / DB 脚本）。新功能在 **main 合并上述 PR 后** 从最新 main 分支。

## 何时暂停并询问用户

- 设计涉及多种可行架构且 PRD 未约定
- 需要新增 PRD 未列的第三方服务
- `gh`/GitHub 不可达且无法 API 开 PR
- 功能超出单 PR 合理体量（提议拆子功能）

## 附加资源

- 功能 backlog 与设计模板：[reference.md](reference.md)
- 完整示例流程：[examples.md](examples.md)

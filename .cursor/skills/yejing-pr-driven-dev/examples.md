# 野径 · 示例：user-auth 双 PR 流程

## 1. Design PR

**分支** `docs/user-auth`  
**文件** 仅 `docs/features/user-auth.md`

设计文档要点：
- `users` 集合：`email`、`passwordHash`、`displayName`、`createdAt`
- `POST /api/auth/register`、`POST /api/auth/login` 返回 JWT
- `routes` 增加 `userId: ObjectId`
- mobile：`app/(auth)/login.tsx`、`register.tsx`
- 验收：注册后可在路线库看到空列表

```bash
git checkout main && git pull
git checkout -b docs/user-auth
mkdir -p docs/features
# 编写 docs/features/user-auth.md
git add docs/features/user-auth.md
git commit -m "docs(user-auth): add registration and JWT auth design"
git push -u origin docs/user-auth
# 开 PR → main，标题 docs: 用户认证设计说明
```

## 2. Implementation PR（Design 合并后）

**分支** `feat/user-auth`

```bash
git checkout main && git pull
git checkout -b feat/user-auth
```

建议 commit 拆分：

```
feat(server): add users model and auth routes
feat(mobile): add login and register screens
feat(routes): scope routes collection by userId
test(server): add auth endpoint tests
```

```bash
git push -u origin feat/user-auth
# 开 PR → main，正文链接 docs/features/user-auth.md
```

PR body 示例：

```markdown
## Summary
- Implement user registration/login per design spec
- Link routes to authenticated user

## Design
- docs/features/user-auth.md

## Test plan
- [ ] POST /api/auth/register creates user
- [ ] POST /api/auth/login returns JWT
- [ ] Protected routes return 401 without token
- [ ] Expo login screen navigates to home on success
```

## 反例（不要这样做）

- 在 `docs/user-auth` 分支里顺便创建 `server/` 代码
- 一个 PR 同时做 `user-auth` + `routes-crud`
- `git add .` 把 `yejing-hiking-prototype.html` 等无关文件提交进去
- 未设置代理导致 `git push` 超时却反复重试相同命令

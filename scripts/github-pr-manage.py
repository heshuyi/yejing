#!/usr/bin/env python3
"""更新 PR 为中文并顺序合并（需 GitHub token 与代理）。"""
import json
import os
import subprocess
import urllib.error
import urllib.request

BASE = "https://api.github.com/repos/heshuyi/yejing"

PRS = {
    1: {
        "title": "docs: 添加野径产品需求文档（PRD）",
        "body": """## 概要
- 添加 v1.0 产品需求文档：定位、信息架构、10 屏原型映射、数据模型、MVP 排期与验收标准

## 测试清单
- [ ] Markdown 可正常阅读
- [ ] 与 HTML 原型章节一致
""",
    },
    2: {
        "title": "feat: 添加 iOS HTML 交互原型（10 屏）",
        "body": """## 概要
- 首页、记录中、标记、如何到达、Watch、路线详情/列表、规划、我的、watchOS 共 10 屏
- index.html 原型总览入口

## 测试清单
- [ ] 本地 python3 -m http.server 可预览
- [ ] 各屏可单独打开
""",
    },
    3: {
        "title": "feat: 添加 MongoDB 数据库初始化脚本",
        "body": """## 概要
- yejing 库：routes / markers / track_points / health_sessions
- 索引与测试数据种子

## 测试清单
- [ ] mongosh --file scripts/init-yejing-db.js 执行成功
""",
    },
    4: {
        "title": "docs: 添加 PR 驱动开发 Cursor Skill",
        "body": """## 概要
- 设计先行、一功能一 PR 的 AI 开发工作流
- 含 MVP backlog 与设计文档模板

## 测试清单
- [ ] .cursor/skills/yejing-pr-driven-dev/ 可被 Cursor 发现
""",
    },
    5: {
        "title": "docs: Expo + Node 项目骨架设计说明",
        "body": """## 概要
- docs/features/expo-scaffold.md：server / mobile 目录、健康检查 API、4 Tab 结构

## 测试清单
- [ ] 验收标准可执行
- [ ] 范围未包含业务功能
""",
    },
    6: {
        "title": "feat: 实现 Expo + Node 单体仓库骨架",
        "body": """## 概要
- server/：Express + TypeScript，GET /api/health，MongoDB 探活
- mobile/：Expo 四 Tab（首页 / 路线 / 地图 / 我的）
- 更新 README 与 .env.example

## 设计文档
- 依赖 PR #5

## 测试清单
- [ ] cd server && npm run dev → curl localhost:3001/api/health
- [ ] cd mobile && npx expo start 可打开 4 个 Tab
""",
    },
}


def get_token():
    proc = subprocess.run(
        ["git", "credential-osxkeychain", "get"],
        input="protocol=https\nhost=github.com\n\n",
        text=True,
        capture_output=True,
        check=True,
    )
    for line in proc.stdout.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    raise RuntimeError("未找到 GitHub token")


def api(token, method, path, data=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=body,
        method=method,
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise RuntimeError(f"{method} {path} → {e.code}: {err}") from e


def main():
    token = get_token()
    for num, patch in PRS.items():
        api(token, "PATCH", f"/pulls/{num}", patch)
        print(f"已更新 PR #{num}: {patch['title']}")

    for num in [1, 2, 3, 4, 5, 6]:
        res = api(
            token,
            "PUT",
            f"/pulls/{num}/merge",
            {"merge_method": "merge", "commit_title": f"合并 PR #{num}"},
        )
        print(f"已合并 PR #{num}: {res.get('sha', '')[:7]}")


if __name__ == "__main__":
    main()

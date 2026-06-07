# 野径

个人徒步路线记录 App：GPS 轨迹、补给点与美照位置标记、起终点导航，以及与 Apple Watch 同步的健康数据。

## 项目结构

```
├── mobile/                 # Expo (React Native) App
├── server/                 # Node.js API
├── docs/features/          # 功能设计文档（按 PR 迭代）
├── scripts/                # MongoDB 等脚本
├── index.html              # HTML 原型总览
└── screens_*.html          # iOS / watchOS 原型
```

## 快速启动

### 1. MongoDB

```bash
~/mongodb/start.sh
# 可选：初始化数据（需 scripts/init-yejing-db.js 合并后）
# npx mongosh mongodb://127.0.0.1:27017 --file scripts/init-yejing-db.js
```

### 2. API Server

```bash
cd server
cp ../.env.example .env   # 或手动设置 PORT / MONGODB_URI
npm install
npm run dev
```

验证：`curl http://localhost:3001/api/health`

### 3. Mobile (Expo)

```bash
cd mobile
echo 'EXPO_PUBLIC_API_URL=http://localhost:3001' > .env
npm install
npx expo start
```

真机调试时将 `EXPO_PUBLIC_API_URL` 改为电脑的局域网 IP。

## 原型预览

```bash
python3 -m http.server 8080
# http://localhost:8080/index.html
```

## 开发流程

见 [.cursor/skills/yejing-pr-driven-dev/SKILL.md](.cursor/skills/yejing-pr-driven-dev/SKILL.md)（合并后）：设计 PR → 实现 PR。

## 技术栈

- 移动端：Expo + expo-router
- 后端：Node.js + Express + TypeScript
- 数据库：MongoDB (`yejing`)

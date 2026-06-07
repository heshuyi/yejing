# 野径

个人徒步路线记录 App：GPS 轨迹、补给点与美照位置标记、起终点导航，以及与 Apple Watch 同步的健康数据。

## 项目结构

```
├── PRD-野径徒步App.md    产品需求文档
├── index.html            原型总览入口
├── screens_*.html        iOS / watchOS 交互原型（10 屏）
└── scripts/
    └── init-yejing-db.js MongoDB 初始化脚本
```

## 预览原型

```bash
cd /path/to/shan
python3 -m http.server 8080
```

浏览器打开 [http://localhost:8080/index.html](http://localhost:8080/index.html)

## 本地 MongoDB

```bash
# 启动（若已安装于 ~/mongodb）
~/mongodb/start.sh

# 初始化数据库
npx mongosh mongodb://127.0.0.1:27017 --file scripts/init-yejing-db.js
```

数据库名：`yejing`，集合：`routes`、`markers`、`track_points`、`health_sessions`

## 文档

详见 [PRD-野径徒步App.md](./PRD-野径徒步App.md)

## 技术栈（规划）

- 移动端：Expo (React Native)
- 后端：Node.js
- 数据库：MongoDB

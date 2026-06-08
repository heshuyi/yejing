// 野径 MongoDB 初始化：建库、索引、测试数据
const DB_NAME = 'yejing';

const conn = new Mongo();
const db = conn.getDB(DB_NAME);

// ── 1. 清空旧数据（开发环境） ──
['routes', 'markers', 'track_points', 'health_sessions', 'users'].forEach((c) => {
  db[c].drop();
});

// ── 2. 集合校验 ──
db.createCollection('routes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'status', 'createdAt', 'updatedAt'],
      properties: {
        userId: { bsonType: 'objectId' },
        name: { bsonType: 'string' },
        status: { enum: ['draft', 'active', 'completed'] },
        recordingState: { enum: ['recording', 'paused'] },
        isLoop: { bsonType: 'bool' },
        startPlace: { bsonType: 'string' },
        endPlace: { bsonType: 'string' },
        startCoordinate: {
          bsonType: 'object',
          required: ['type', 'coordinates'],
          properties: {
            type: { enum: ['Point'] },
            coordinates: { bsonType: 'array', minItems: 2, maxItems: 2 },
          },
        },
        endCoordinate: { bsonType: 'object' },
        goalDistanceKm: { bsonType: 'object' },
        stats: { bsonType: 'object' },
        startedAt: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

db.createCollection('markers', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['routeId', 'type', 'name', 'coordinate', 'createdAt'],
      properties: {
        routeId: { bsonType: 'objectId' },
        type: { enum: ['supply', 'photo', 'rest', 'view', 'fork', 'other'] },
        name: { bsonType: 'string' },
        note: { bsonType: 'string' },
        distanceFromStart: { bsonType: 'double' },
        coordinate: {
          bsonType: 'object',
          required: ['type', 'coordinates'],
          properties: {
            type: { enum: ['Point'] },
            coordinates: { bsonType: 'array' },
          },
        },
        facing: { bsonType: 'string' },
        bestTime: { bsonType: 'string' },
        photos: { bsonType: 'array' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

db.createCollection('track_points');
db.createCollection('health_sessions');

// ── 3. 索引 ──
db.routes.createIndex({ status: 1, updatedAt: -1 });
db.routes.createIndex({ userId: 1, status: 1, updatedAt: -1 });
db.routes.createIndex({ name: 'text', startPlace: 'text', endPlace: 'text' });
db.routes.createIndex({ startCoordinate: '2dsphere' });

db.markers.createIndex({ routeId: 1, distanceFromStart: 1 });
db.markers.createIndex({ type: 1 });
db.markers.createIndex({ coordinate: '2dsphere' });

db.track_points.createIndex({ routeId: 1, timestamp: 1 });
db.track_points.createIndex({ location: '2dsphere' });

db.health_sessions.createIndex({ routeId: 1 }, { unique: true });

db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });

// ── 4. 测试数据 ──
const now = new Date();
const yesterday = new Date(now.getTime() - 86400000);
const lastMonth = new Date('2026-03-28T10:00:00Z');

// 路线 1：进行中
const routeActive = db.routes.insertOne({
  name: '雾凇岭环线',
  status: 'active',
  isLoop: true,
  startPlace: '雾凇岭停车场 P2',
  endPlace: '雾凇岭停车场 P2',
  startCoordinate: { type: 'Point', coordinates: [119.7128, 30.2841] },
  endCoordinate: { type: 'Point', coordinates: [119.7128, 30.2841] },
  goalDistanceKm: { min: 10, max: 15 },
  stats: {
    distanceKm: 4.2,
    elevationGainM: 287,
    durationSec: 5048,
    avgHeartRate: 118,
    markerCount: 2,
  },
  startedAt: new Date(now.getTime() - 5048000),
  createdAt: yesterday,
  updatedAt: now,
});

// 路线 2：已完成
const routeDone1 = db.routes.insertOne({
  name: '西湖群山 · 九溪至龙井',
  status: 'completed',
  isLoop: false,
  startPlace: '九溪公交站',
  endPlace: '龙井村',
  startCoordinate: { type: 'Point', coordinates: [120.1184, 30.1988] },
  endCoordinate: { type: 'Point', coordinates: [120.1302, 30.2289] },
  stats: {
    distanceKm: 12.8,
    elevationGainM: 520,
    durationSec: 16200,
    avgHeartRate: 112,
    markerCount: 6,
  },
  startedAt: new Date(yesterday.getTime() - 16200000),
  completedAt: yesterday,
  createdAt: new Date(yesterday.getTime() - 86400000 * 3),
  updatedAt: yesterday,
});

// 路线 3：已完成
const routeDone2 = db.routes.insertOne({
  name: '莫干山古道 · 单日',
  status: 'completed',
  isLoop: false,
  startPlace: '莫干山收费站',
  endPlace: '庾村广场',
  startCoordinate: { type: 'Point', coordinates: [119.8972, 30.5556] },
  endCoordinate: { type: 'Point', coordinates: [119.9123, 30.6012] },
  stats: {
    distanceKm: 18.1,
    elevationGainM: 890,
    durationSec: 24120,
    avgHeartRate: 115,
    markerCount: 9,
  },
  completedAt: lastMonth,
  createdAt: lastMonth,
  updatedAt: lastMonth,
});

// 路线 4：草稿
const routeDraft = db.routes.insertOne({
  name: '天目山 · 西线（规划中）',
  status: 'draft',
  isLoop: false,
  startPlace: '天目山景区入口',
  endPlace: '西天目山顶',
  startCoordinate: { type: 'Point', coordinates: [119.4401, 30.3412] },
  endCoordinate: { type: 'Point', coordinates: [119.4288, 30.3689] },
  goalDistanceKm: { min: 15, max: 25 },
  stats: { markerCount: 0 },
  createdAt: now,
  updatedAt: now,
});

const r1 = routeActive.insertedId;
const r2 = routeDone1.insertedId;
const r3 = routeDone2.insertedId;

// 标记
db.markers.insertMany([
  {
    routeId: r1,
    type: 'supply',
    name: '山泉水站',
    note: '可饮用',
    distanceFromStart: 2.1,
    coordinate: { type: 'Point', coordinates: [119.7152, 30.2912] },
    lastSupplyAt: new Date('2026-03-02'),
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    routeId: r1,
    type: 'photo',
    name: '观景台',
    note: '面向东南 · 日出视野佳',
    distanceFromStart: 3.8,
    coordinate: { type: 'Point', coordinates: [119.7188, 30.2988] },
    facing: '东南',
    bestTime: '日出',
    photos: [],
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    routeId: r2,
    type: 'supply',
    name: '驿站小卖部',
    note: '热水、能量胶 · 营业至 17:00',
    distanceFromStart: 5.4,
    coordinate: { type: 'Point', coordinates: [120.1220, 30.2100] },
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    routeId: r2,
    type: 'photo',
    name: '十里琅珰入口',
    note: '茶园全景',
    distanceFromStart: 8.2,
    coordinate: { type: 'Point', coordinates: [120.1265, 30.2195] },
    facing: '西',
    bestTime: '下午',
    photos: ['local://photos/xihu-001.jpg'],
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    routeId: r3,
    type: 'photo',
    name: '冷杉林道口',
    note: '你标记的拍照点',
    distanceFromStart: 6.2,
    coordinate: { type: 'Point', coordinates: [119.9020, 30.5720] },
    facing: '北',
    bestTime: '四季皆宜',
    photos: [],
    createdAt: lastMonth,
    updatedAt: lastMonth,
  },
]);

// 轨迹点（每条路线采样几个点）
function makeTrack(routeId, coords, baseTime) {
  return coords.map((c, i) => ({
    routeId,
    timestamp: new Date(baseTime.getTime() + i * 120000),
    location: { type: 'Point', coordinates: c },
    altitude: 280 + i * 15,
    speed: 1.2 + i * 0.05,
  }));
}

db.track_points.insertMany([
  ...makeTrack(r1, [
    [119.7128, 30.2841],
    [119.7140, 30.2870],
    [119.7152, 30.2912],
    [119.7188, 30.2988],
  ], new Date(now.getTime() - 5048000)),
  ...makeTrack(r2, [
    [120.1184, 30.1988],
    [120.1220, 30.2100],
    [120.1265, 30.2195],
    [120.1302, 30.2289],
  ], new Date(yesterday.getTime() - 16200000)),
]);

// 健康数据
db.health_sessions.insertMany([
  {
    routeId: r1,
    workoutType: 'hiking',
    syncedFromWatch: true,
    device: 'Apple Watch Ultra 2',
    calories: 412,
    steps: 6240,
    spo2: 97,
    elevationGainM: 287,
    heartRateSamples: [
      { t: 0, bpm: 95 },
      { t: 300, bpm: 108 },
      { t: 600, bpm: 118 },
      { t: 900, bpm: 125 },
      { t: 1200, bpm: 118 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    routeId: r2,
    workoutType: 'hiking',
    syncedFromWatch: true,
    device: 'Apple Watch Ultra 2',
    calories: 980,
    steps: 18420,
    spo2: 96,
    elevationGainM: 520,
    heartRateSamples: [
      { t: 0, bpm: 102 },
      { t: 600, bpm: 115 },
      { t: 1800, bpm: 108 },
    ],
    createdAt: yesterday,
    updatedAt: yesterday,
  },
]);

print('=== 野径数据库初始化完成 ===');
print('数据库: ' + DB_NAME);
print('路线: ' + db.routes.countDocuments());
print('标记: ' + db.markers.countDocuments());
print('轨迹点: ' + db.track_points.countDocuments());
print('健康会话: ' + db.health_sessions.countDocuments());

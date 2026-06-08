#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3001}"
EMAIL="detail-$(date +%s)@yejing.dev"

TOKEN=$(curl -sf -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

RID=$(curl -sf -X POST "$BASE/api/routes" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"详情测试","startCoordinate":{"type":"Point","coordinates":[120.12,30.22]}}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['route']['id'])")

curl -sf -X POST "$BASE/api/routes/$RID/recording/start" -H "Authorization: Bearer $TOKEN" > /dev/null

curl -sf -X POST "$BASE/api/routes/$RID/track-points" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"points":[{"timestamp":"2026-06-08T05:00:00.000Z","location":{"type":"Point","coordinates":[120.12,30.22]},"altitude":100},{"timestamp":"2026-06-08T05:05:00.000Z","location":{"type":"Point","coordinates":[120.125,30.225]},"altitude":120}]}' > /dev/null

curl -sf -X POST "$BASE/api/routes/$RID/markers" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"type":"supply","name":"补水","coordinate":{"type":"Point","coordinates":[120.122,30.223]}}' > /dev/null

DETAIL=$(curl -sf "$BASE/api/routes/$RID/detail" -H "Authorization: Bearer $TOKEN")
echo "$DETAIL" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['track']['pointCount'] == 2
assert len(d['track']['coordinates']) == 2
assert len(d['markers']) == 1
assert d['summary']['markerCount'] == 1
assert d['route']['name'] == '详情测试'
print('detail aggregate ok')
"

echo "test-route-detail.sh: 全部通过 (route=$RID)"

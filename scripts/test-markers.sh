#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3001}"
EMAIL="markers-$(date +%s)@yejing.dev"

TOKEN=$(curl -sf -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

RID=$(curl -sf -X POST "$BASE/api/routes" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"标记测试路线","startCoordinate":{"type":"Point","coordinates":[120.12,30.22]}}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['route']['id'])")

MID=$(curl -sf -X POST "$BASE/api/routes/$RID/markers" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"type":"supply","name":"补水点","coordinate":{"type":"Point","coordinates":[120.121,30.221]}}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['marker']['id'])")

curl -sf "$BASE/api/routes/$RID/markers" -H "Authorization: Bearer $TOKEN" | grep -q '"name":"补水点"'

curl -sf -X POST "$BASE/api/routes/$RID/markers" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"type":"photo","name":"观景台","coordinate":{"type":"Point","coordinates":[120.122,30.222]},"facing":"西","bestTime":"日落"}' \
  | grep -q '"type":"photo"'

curl -sf "$BASE/api/markers?type=supply" -H "Authorization: Bearer $TOKEN" | grep -q '"type":"supply"'

curl -sf -X PATCH "$BASE/api/routes/$RID/markers/$MID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"更新补水点"}' | grep -q '更新补水点'

curl -sf -X DELETE "$BASE/api/routes/$RID/markers/$MID" \
  -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}" | grep -q 204

COUNT=$(curl -sf "$BASE/api/routes/$RID" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['route']['markerCount'])")
test "$COUNT" = "1"

echo "test-markers.sh: 全部通过 (route=$RID)"

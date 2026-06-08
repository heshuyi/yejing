#!/usr/bin/env bash
# GPS 记录 API 集成测试（需 server 运行于 localhost:3001）
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3001}"
EMAIL="gps-test-$(date +%s)@yejing.dev"

register() {
  curl -sf -X POST "$BASE/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}"
}

TOKEN=$(register | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

ROUTE=$(curl -sf -X POST "$BASE/api/routes" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"GPS测试路线"}')
RID=$(echo "$ROUTE" | python3 -c "import sys,json; print(json.load(sys.stdin)['route']['id'])")

curl -sf -X POST "$BASE/api/routes/$RID/recording/start" \
  -H "Authorization: Bearer $TOKEN" | grep -q '"status":"active"'

curl -sf -X POST "$BASE/api/routes/$RID/track-points" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"points":[{"timestamp":"2026-06-08T04:00:00.000Z","location":{"type":"Point","coordinates":[120.12,30.22]},"altitude":100},{"timestamp":"2026-06-08T04:01:00.000Z","location":{"type":"Point","coordinates":[120.121,30.221]},"altitude":110}]}' \
  | grep -q '"inserted":2'

curl -sf -X POST "$BASE/api/routes/$RID/recording/pause" \
  -H "Authorization: Bearer $TOKEN" | grep -q '"recordingState":"paused"'

curl -sf -X POST "$BASE/api/routes/$RID/recording/resume" \
  -H "Authorization: Bearer $TOKEN" | grep -q '"recordingState":"recording"'

curl -sf -X POST "$BASE/api/routes/$RID/recording/finish" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"durationSec":120}' | grep -q '"status":"completed"'

PTS=$(curl -sf "$BASE/api/routes/$RID/track-points" -H "Authorization: Bearer $TOKEN")
echo "$PTS" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d['points'])==2"

echo "test-gps-recording.sh: 全部通过 (route=$RID)"

#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3001}"
EMAIL="transit-$(date +%s)@yejing.dev"

TOKEN=$(curl -sf -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

RID=$(curl -sf -X POST "$BASE/api/routes" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"到达测试","isLoop":true,"startPlace":"停车场P2","startCoordinate":{"type":"Point","coordinates":[119.71,30.28]}}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['route']['id'])")

TRANSIT=$(curl -sf "$BASE/api/routes/$RID/transit" -H "Authorization: Bearer $TOKEN")
echo "$TRANSIT" | python3 -c "
import sys, json
t = json.load(sys.stdin)
assert t['routeName'] == '到达测试'
assert t['isLoop'] is True
assert t['start']['place'] == '停车场P2'
assert t['end']['place'] == '停车场P2'
assert t['loopHint'] is not None
assert t['start']['coordinate']['coordinates'] == [119.71, 30.28]
"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/routes/$RID/transit" -H "Authorization: Bearer invalid")
test "$CODE" = "401"

echo "test-transit.sh: 全部通过 (route=$RID)"

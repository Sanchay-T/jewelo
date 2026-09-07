#!/usr/bin/env bash
# Caleums backend end-to-end driver.
#
# Drives one real customer journey against a running web instance and asserts
# the durable Supabase truth behind it, then exercises the edge cases:
# cancellation, idempotent replay, cross-tenant isolation, malformed input,
# attempt budget, and reservation accounting.
#
#   BASE          web base URL                     (default http://localhost:3000)
#   E2E_MOCK      1 = run the mock-only steps       (default 1)
#   E2E_MOCKFAIL_TIMEOUT  seconds allowed for the MOCKFAIL block/re-block polls
#                 (default 900)
#   E2E_BAD_INNGEST_BASE  optional second web instance whose Inngest transport
#                 is broken (unreachable INNGEST_BASE_URL, or a rejected
#                 INNGEST_EVENT_KEY), used for the injected dispatch-failure
#                 step
#
# Supabase service-role credentials come from the repository .env.
# Operator credentials (OPERATOR_EMAIL / OPERATOR_PASSPHRASE) are optional;
# the operator steps print SKIP when they are absent.
#
# Error contract asserted (Caleums phase 3):
#   401 unauthenticated · 403 forbidden · 404 not_found · 409 state_conflict
#   422 invalid_input   · 429 spend_guard · 500 internal
#   approve: 201 accepted · 202 pending · 200 idempotent replay
# Bodies are expected to be {"error":<string>,"code":<string>}.

set -uo pipefail

BASE="${BASE:-http://localhost:3000}"
E2E_MOCK="${E2E_MOCK:-1}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
SR=(-H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

# ---------------------------------------------------------------------------
# Harness
# ---------------------------------------------------------------------------
now() { python3 -c 'import time;print(int(time.time()*1000))'; }
T0=$(now)
FAILURES=0
declare -a FAILED=()
declare -a TIMING=()
declare -a IDS=()

elapsed() { echo $(( $(now) - T0 )); }
line() { printf '[%7s] %s -> %s %s %s\n' "$(elapsed)ms" "$1" "$2" "$3" "$4"; }
ok() { line "$1" "${2:--}" "ok" "${3:-}"; }
bad() {
  line "$1" "${2:--}" "FAIL" "${3:-}"
  FAILURES=$((FAILURES + 1))
  FAILED+=("$1 [http=${2:--}] ${3:-}")
}
info() { line "$1" "${2:--}" "INFO" "${3:-}"; }
skip() { line "$1" "-" "SKIP" "${2:-}"; }
mark() { TIMING+=("$1=$(elapsed)"); }
note_id() { IDS+=("$1=$2"); }

# req METHOD PATH DATA [extra curl args...] -> sets HTTP and BODY
req() {
  local method=$1 path=$2 data=$3
  shift 3
  local args=(-s -m 60 -w $'\n%{http_code}' -X "$method" "$BASE$path" "$@")
  [[ -n "$data" ]] && args+=(-H 'content-type: application/json' -d "$data")
  local raw
  raw=$(curl "${args[@]}")
  HTTP=${raw##*$'\n'}
  BODY=${raw%$'\n'*}
  # 000 is a transport failure, not an answer: a dev server that hot-reloaded
  # mid-request. Retry once so a reload is never reported as a contract break.
  if [[ "$HTTP" == "000" ]]; then
    sleep 2
    raw=$(curl "${args[@]}")
    HTTP=${raw##*$'\n'}
    BODY=${raw%$'\n'*}
  fi
}

db() { curl -s -m 60 "${SR[@]}" "$SUPABASE_URL/rest/v1/$1"; }
j() { echo "$BODY" | jq -rc "$1" 2>/dev/null || echo "?"; }
# Short rendering of an error body under the {error, code} contract.
err() { echo "$BODY" | jq -rc '{code:(.code//"<no-code>"),error:((.error//.message//"")|tostring|.[0:90])}' 2>/dev/null || echo "${BODY:0:100}"; }

expect_status() { # label "expected list" [detail]
  if [[ " $2 " == *" $HTTP "* ]]; then ok "$1" "$HTTP" "${3:-}"; else bad "$1" "$HTTP" "want=[$2] $(err) ${3:-}"; fi
}
expect_non2xx() { # label [detail]
  if [[ "$HTTP" =~ ^2 ]]; then bad "$1" "$HTTP" "want=non-2xx ${2:-}"; else ok "$1" "$HTTP" "$(err) ${2:-}"; fi
}
expect_code() { # label  (soft: the code key is phase-3 work)
  local c
  c=$(echo "$BODY" | jq -r '.code // empty' 2>/dev/null)
  if [[ -n "$c" ]]; then ok "$1" "$HTTP" "code=$c"; else info "$1" "$HTTP" "no \`code\` key yet: $(err)"; fi
}
expect_eq() { # label expected actual [detail]
  if [[ "$2" == "$3" ]]; then ok "$1" "-" "$3 ${4:-}"; else bad "$1" "-" "want=$2 got=$3 ${4:-}"; fi
}
expect_true() { # label condition-description actual-bool
  if [[ "$3" == "true" ]]; then ok "$1" "-" "$2"; else bad "$1" "-" "$2 (false)"; fi
}

# poll_until LABEL MAX_SECONDS INTERVAL FUNCTION [args...]
poll_until() {
  local label=$1 max=$2 iv=$3
  shift 3
  local deadline=$(( $(now) + max * 1000 ))
  while :; do
    if "$@"; then return 0; fi
    if [[ $(now) -ge $deadline ]]; then
      bad "$label" "-" "timeout after ${max}s"
      return 1
    fi
    sleep "$iv"
  done
}

uuid() { uuidgen | tr 'A-Z' 'a-z'; }

echo "=== Caleums backend E2E · BASE=$BASE · E2E_MOCK=$E2E_MOCK ==="

# ---------------------------------------------------------------------------
# Specification fixtures
# ---------------------------------------------------------------------------
SPEC_AR='{"jewelryType":"name-pendant","nameCount":1,"names":[{"approvedEnglishText":null,"approvedArabicText":"ليلى"}],"arabicStyle":"contemporary","layout":"single-name","source":"fresh","metalKarat":"18K","metalColor":"yellow","finish":"polished","stoneCoverage":"none","gemstone":"none","connector":"none","sizeProfile":"classic","dimensions":{"widthMm":30,"heightMm":18,"thicknessMm":1.2},"chain":{"style":"cable","lengthCm":45},"complexity":2,"spellingConfirmed":false}'
SPEC_FAIL=$(echo "$SPEC_AR" | jq -c '.names=[{"approvedEnglishText":"MOCKFAIL","approvedArabicText":null}] | .arabicStyle="none" | .spellingConfirmed=true')

# ---------------------------------------------------------------------------
# 1. Anonymous principal A
# ---------------------------------------------------------------------------
req POST /api/auth/anonymous ""
TOKEN_A=$(j '.access_token'); UID_A=$(j '.user.id')
expect_status "01 auth.anonymous(A)" "200" "user=$UID_A"
mark auth
note_id principal_a "$UID_A"
[[ "$TOKEN_A" == "null" || -z "$TOKEN_A" ]] && { bad "01 auth.anonymous(A) token" "-" "no access_token"; exit 1; }
AUTH_A=(-H "authorization: Bearer $TOKEN_A")

# ---------------------------------------------------------------------------
# 2. Draft, spelling confirmation, transliteration
# ---------------------------------------------------------------------------
req POST /api/designs/drafts "{\"locale\":\"ar\",\"specification\":$SPEC_AR}" "${AUTH_A[@]}"
DRAFT_A=$(j '.id')
expect_status "02 drafts.create" "201" "draft=$DRAFT_A"
mark draft
note_id draft_a "$DRAFT_A"

SPEC_OK=$(echo "$SPEC_AR" | jq -c '.spellingConfirmed=true')
req PATCH "/api/designs/drafts/$DRAFT_A" "{\"specification\":$SPEC_OK,\"spellingConfirmed\":true}" "${AUTH_A[@]}"
expect_status "03 drafts.confirm-spelling" "200" "spelling_confirmed=$(j '.spelling_confirmed')"
expect_eq "03 drafts.confirm-spelling persisted" "true" "$(j '.spelling_confirmed')"

# /api/transliterate takes {"name": "<Latin name>"} and calls OpenAI directly
# with no mock path, so the happy case is opt-in and off by default: this
# driver must not spend provider budget. The rejection case is validated
# before any provider call, so it always runs.
if [[ "${E2E_TRANSLITERATE:-0}" == "1" ]]; then
  req POST /api/transliterate '{"name":"Layla"}' "${AUTH_A[@]}"
  expect_status "04 transliterate(short name)" "200" "$(j '.')"
else
  skip "04 transliterate(short name)" "real OpenAI call; set E2E_TRANSLITERATE=1 to include it"
fi
LONG=$(python3 -c 'print("Layla"*20)')
req POST /api/transliterate "{\"name\":\"$LONG\"}" "${AUTH_A[@]}"
expect_status "04b transliterate(100 chars rejected)" "422" "route caps names at 36 characters"
expect_code "04b transliterate code (want invalid_input)"

# ---------------------------------------------------------------------------
# 3. Reference upload (multipart)
# ---------------------------------------------------------------------------
PNG="$(mktemp -t e2e-ref).png"
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8tZAAAAAElFTkSuQmCC' | base64 -d > "$PNG"
REF_ID="e2e$(date +%s)"
req POST /api/references "" "${AUTH_A[@]}" -F "referenceId=$REF_ID" -F "file=@$PNG;type=image/png;filename=reference.png"
expect_status "05 references.upload" "200 201" "path=$(j '.objectPath')"
rm -f "$PNG"

# ---------------------------------------------------------------------------
# 4. Approve the revision and start the run
# ---------------------------------------------------------------------------
KEY_A=$(uuid)
TA=$(now)
req POST /api/revisions/approve "{\"draftId\":\"$DRAFT_A\",\"specification\":$SPEC_OK,\"idempotencyKey\":\"$KEY_A\"}" "${AUTH_A[@]}"
RUN_A=$(j '.run_id'); DESIGN_A=$(j '.approved_design_id'); REV_A=$(j '.revision_id')
APPROVE_MS=$(( $(now) - TA ))
expect_status "06 revisions.approve" "201" "run=$RUN_A dispatch=$(j '{dispatchState,acceptedCount,pendingCount}') in ${APPROVE_MS}ms"
expect_eq "06 approve dispatchState" "accepted" "$(j '.dispatchState')"
# Studio-first chain (migration 20260827150000): approve dispatches only the
# studio still. release_dependent_tasks creates the other three outbox rows
# after the studio still is ready, so 1 is the truthful value at this instant
# and step 08b below proves all four are published by the end of the run.
expect_eq "06 approve acceptedCount" "1" "$(j '.acceptedCount')"
mark approve
note_id run_a "$RUN_A"
note_id design_a "$DESIGN_A"
note_id revision_a "$REV_A"
[[ "$RUN_A" == "null" || -z "$RUN_A" ]] && { bad "06 revisions.approve" "-" "no run_id; cannot continue"; exit 1; }

STILLS=$(db "generation_tasks?run_id=eq.$RUN_A&provider_profile=neq.video.fal&select=id,presentation_view,status,attempt")
expect_eq "07 db.still-task count" "4" "$(echo "$STILLS" | jq 'length')" "$(echo "$STILLS" | jq -c 'map({(.presentation_view):.status})|add')"
EARLY=$(echo "$STILLS" | jq '[.[]|select(.status=="queued" or .status=="generating")]|length')
if [[ "$EARLY" == "4" ]]; then
  ok "07 db.stills queued|generating" "-" "4/4"
else
  info "07 db.stills queued|generating" "-" "$EARLY/4 still early; mock worker already advanced: $(echo "$STILLS" | jq -c 'map(.status)')"
fi
TASK_IDS=$(echo "$STILLS" | jq -r 'map(.id)|join(",")')
OUTBOX=$(db "outbox_events?or=(aggregate_id.eq.$RUN_A,aggregate_id.in.($TASK_IDS))&select=state,aggregate_type,payload")
PUBLISHED=$(echo "$OUTBOX" | jq '[.[]|select(.state=="published")]|length')
expect_eq "08 db.outbox published (studio only)" "1" "$PUBLISHED" "states=$(echo "$OUTBOX" | jq -c 'map(.state)')"

# ---------------------------------------------------------------------------
# 5. One active run per design; idempotent replay
# ---------------------------------------------------------------------------
req POST /api/revisions/approve "{\"draftId\":\"$DRAFT_A\",\"specification\":$SPEC_OK,\"idempotencyKey\":\"$(uuid)\"}" "${AUTH_A[@]}"
expect_status "09 approve.second-run-while-active" "409" ""
expect_code "09 approve.second-run code (want run_active)"

req POST /api/revisions/approve "{\"draftId\":\"$DRAFT_A\",\"specification\":$SPEC_OK,\"idempotencyKey\":\"$KEY_A\"}" "${AUTH_A[@]}"
expect_status "10 approve.idempotent-replay" "200" "run=$(j '.run_id')"
expect_eq "10 approve.replay same run_id" "$RUN_A" "$(j '.run_id')"

# ---------------------------------------------------------------------------
# 6. Motion preview appears (auto-requested by the first ready still), cancel it
# ---------------------------------------------------------------------------
motion_exists() {
  MOTION=$(db "generation_tasks?run_id=eq.$RUN_A&presentation_view=eq.motion_preview&select=id,status" | jq -r '.[0].id // empty')
  [[ -n "$MOTION" ]]
}
if poll_until "11 poll.motion-preview-created" 300 1 motion_exists; then
  ok "11 poll.motion-preview-created" "-" "task=$MOTION"
  mark motion_task
  note_id motion_task "$MOTION"
  req POST "/api/tasks/$MOTION/cancel" "" "${AUTH_A[@]}"
  MSTATE=$(db "generation_tasks?id=eq.$MOTION&select=status" | jq -r '.[0].status')
  if [[ "$HTTP" != "200" && "$MSTATE" == "ready" ]]; then
    info "12 tasks.cancel(motion)" "$HTTP" "race: preview finished before the cancel landed ($(err))"
  else
    expect_status "12 tasks.cancel(motion)" "200" "status=$(j '.status')"
    expect_eq "12 tasks.cancel status" "cancelled" "$(j '.status')" "db=$MSTATE"
  fi
  RUNST=$(db "generation_runs?id=eq.$RUN_A&select=status" | jq -r '.[0].status')
  if [[ "$RUNST" == "cancelled" ]]; then bad "13 run.not-cancelled-by-sibling" "-" "run=$RUNST"; else ok "13 run.not-cancelled-by-sibling" "-" "run=$RUNST"; fi
else
  info "12 tasks.cancel(motion)" "-" "no motion task to cancel"
fi

# ---------------------------------------------------------------------------
# 7. All four stills ready, run complete, assets and /api/state
# ---------------------------------------------------------------------------
FIRST_READY_MS=""
LAST_ROWS="[]"
stills_ready() {
  local rows ready
  rows=$(db "generation_tasks?run_id=eq.$RUN_A&provider_profile=neq.video.fal&select=presentation_view,status")
  ready=$(echo "$rows" | jq '[.[]|select(.status=="ready")]|length')
  if [[ -z "$FIRST_READY_MS" && "$ready" -ge 1 ]]; then FIRST_READY_MS=$(elapsed); TIMING+=("first_still_ready=$FIRST_READY_MS"); fi
  LAST_ROWS=$rows
  [[ "$ready" == "4" ]]
}
if poll_until "14 poll.four-stills-ready" 300 2 stills_ready; then
  ok "14 poll.four-stills-ready" "-" "$(echo "$LAST_ROWS" | jq -c 'map({(.presentation_view):.status})|add')"
else
  info "14 poll.four-stills-ready" "-" "last=$(echo "$LAST_ROWS" | jq -c 'map({(.presentation_view):.status})|add')"
fi
mark all_stills_ready
OUTBOX=$(db "outbox_events?or=(aggregate_id.eq.$RUN_A,aggregate_id.in.($TASK_IDS))&select=state,aggregate_type,payload")
PUBLISHED=$(echo "$OUTBOX" | jq '[.[]|select(.state=="published")]|length')
expect_eq "08b db.outbox published (all four views)" "4" "$PUBLISHED" "states=$(echo "$OUTBOX" | jq -c 'map(.state)')"
RUNST=$(db "generation_runs?id=eq.$RUN_A&select=status,reserved_spend_cents,actual_spend_cents,operator_review_reason")
expect_eq "15 run.status complete" "complete" "$(echo "$RUNST" | jq -r '.[0].status')" "$(echo "$RUNST" | jq -c '.[0]')"
ASSETS=$(db "assets?run_id=eq.$RUN_A&select=id,presentation_view,byte_size,provider,model,mime_type")
# The four stills are the assertion. A motion asset may or may not exist: the
# mock preview can finish before the step-12 cancel lands, and an asset that was
# fully generated and copied to private storage is deliberately kept (rule 11)
# even though its task ends `cancelled`.
STILL_ASSETS=$(echo "$ASSETS" | jq '[.[]|select(.presentation_view!="motion_preview")]|length')
expect_eq "16 db.assets count (stills)" "4" "$STILL_ASSETS" "$(echo "$ASSETS" | jq -c 'map({(.presentation_view):.byte_size})|add') provider=$(echo "$ASSETS" | jq -r '.[0].provider')"
MOTION_ASSETS=$(echo "$ASSETS" | jq '[.[]|select(.presentation_view=="motion_preview")]|length')
[[ "$MOTION_ASSETS" != "0" ]] && info "16b motion asset kept after cancel" "-" "$MOTION_ASSETS (preview finished before the cancel landed)"

TS=$(now)
req GET /api/state "" "${AUTH_A[@]}"
expect_status "17 state.read" "200" "in $(( $(now) - TS ))ms $(j '{designs:(.designs|length),runs:(.generation_runs|length),tasks:(.generation_tasks|length),assets:(.assets|length)}')"
mark state
SIGNED=$(echo "$BODY" | jq '[.assets[]|select(.signed_url != null)]|length')
if [[ "${SIGNED:-0}" -ge 4 ]]; then ok "17 state.signed assets >=4" "-" "$SIGNED"; else bad "17 state.signed assets >=4" "-" "$SIGNED"; fi
if echo "$BODY" | jq -e 'has("estimates")' >/dev/null 2>&1; then ok "17 state.estimates key" "-" "present"; else bad "17 state.estimates key" "-" "missing"; fi

# ---------------------------------------------------------------------------
# 8. Commerce: estimate -> resume -> quote request -> accept -> checkout
# ---------------------------------------------------------------------------
req POST "/api/designs/$DESIGN_A/commands" '{"command":"estimate"}' "${AUTH_A[@]}"
LOW=$(j '.low_amount'); HIGH=$(j '.high_amount')
expect_status "18 commands.estimate" "201" "low=$LOW high=$HIGH currency=$(j '.currency')"
mark estimate
if [[ "$LOW" =~ ^[0-9]+$ && "$HIGH" =~ ^[0-9]+$ && "$LOW" -lt "$HIGH" ]]; then
  ok "18 estimate low<high" "-" "$LOW<$HIGH"
else
  bad "18 estimate low<high" "-" "low=$LOW high=$HIGH"
fi

req POST "/api/designs/$DESIGN_A/commands" "{\"command\":\"set_resume\",\"resumePath\":\"/ar/design/$DESIGN_A\"}" "${AUTH_A[@]}"
expect_status "19 commands.set_resume" "200" "resume_path=$(j '.resume_path')"

QKEY=$(uuid)
req POST "/api/designs/$DESIGN_A/commands" "{\"command\":\"request_quote\",\"idempotencyKey\":\"$QKEY\"}" "${AUTH_A[@]}"
QUOTE=$(j '.id'); TOTAL=$(j '.total')
expect_status "20 commands.request_quote" "201" "quote=$QUOTE total=$TOTAL status=$(j '.status')"
mark quote
# The quote row is the durable truth; recover it from the database when the
# HTTP response failed after the row was already committed.
DBQ=$(db "quotes?checkout_idempotency_key=eq.$QKEY&select=id,total,status" | jq -c '.[0] // {}')
if [[ "$QUOTE" == "null" || -z "$QUOTE" ]]; then
  QUOTE=$(echo "$DBQ" | jq -r '.id // empty'); TOTAL=$(echo "$DBQ" | jq -r '.total // empty')
  info "20b request_quote db-recovery" "-" "row committed despite the HTTP error: $DBQ"
fi
note_id quote_a "$QUOTE"
if [[ "$LOW" =~ ^[0-9]+$ && "$HIGH" =~ ^[0-9]+$ ]]; then
  WANT=$(python3 -c "import math;print(math.floor(($LOW+$HIGH)/2+0.5))")
  expect_eq "20 quote.total == round((low+high)/2)" "$WANT" "$TOTAL"
fi

req POST "/api/designs/$DESIGN_A/commands" "{\"command\":\"request_quote\",\"idempotencyKey\":\"$QKEY\"}" "${AUTH_A[@]}"
expect_status "20c request_quote.idempotent-replay" "200 201" "quote=$(j '.id')"
expect_eq "20c request_quote.replay same quote" "$QUOTE" "$(j '.id')"
expect_eq "20c request_quote.replay creates no duplicate" "1" "$(db "quotes?checkout_idempotency_key=eq.$QKEY&select=id" | jq 'length')"

CKEY=$(uuid)
req POST "/api/designs/$DESIGN_A/commands" "{\"command\":\"accept_quote\",\"quoteId\":\"$QUOTE\",\"idempotencyKey\":\"$QKEY\",\"checkoutIdempotencyKey\":\"$CKEY\"}" "${AUTH_A[@]}"
expect_status "21 commands.accept_quote(before issue)" "409" "only an issued quote is acceptable"
expect_code "21 accept_quote code (want state_conflict)"

req POST /api/checkout "{\"quoteId\":\"$QUOTE\",\"idempotencyKey\":\"$CKEY\"}" "${AUTH_A[@]}"
expect_non2xx "22 checkout.fails-closed"
expect_code "22 checkout code"

# ---------------------------------------------------------------------------
# 9. Operator surface
# ---------------------------------------------------------------------------
JAR="$(mktemp -t e2e-operator-jar)"
if [[ -n "${OPERATOR_EMAIL:-}" && -n "${OPERATOR_PASSPHRASE:-}" ]]; then
  req POST /api/operator/session "{\"email\":\"$OPERATOR_EMAIL\",\"passphrase\":\"$OPERATOR_PASSPHRASE\"}" -c "$JAR"
  expect_status "23 operator.session" "200" "$(j '.')"
  if [[ "$HTTP" == "200" ]]; then
    req GET "/api/operator/prompts?profile=image.packshot" "" -b "$JAR"
    expect_status "24 operator.prompts" "200" "active=$(j '.activeReleaseId') releases=$(j '.releases|length')"

    EXP=$(python3 -c 'import datetime;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=7)).isoformat())')
    req POST /api/operator/commands "{\"command\":\"issue_quote\",\"designId\":\"$DESIGN_A\",\"targetId\":\"$QUOTE\",\"idempotencyKey\":\"$(uuid)\",\"payload\":{\"total\":$TOTAL,\"expiresAt\":\"$EXP\"}}" -b "$JAR"
    expect_status "25 operator.issue_quote" "200 201" "status=$(j '.status')"

    req POST "/api/designs/$DESIGN_A/commands" "{\"command\":\"accept_quote\",\"quoteId\":\"$QUOTE\",\"idempotencyKey\":\"$QKEY\",\"checkoutIdempotencyKey\":\"$CKEY\"}" "${AUTH_A[@]}"
    expect_status "26 commands.accept_quote(after issue)" "200 201" "status=$(j '.status')"

    req DELETE /api/operator/session "" -b "$JAR" -c "$JAR"
    expect_status "27 operator.session.delete" "200" "$(j '.')"
  fi
else
  skip "23 operator.session" "OPERATOR_EMAIL/OPERATOR_PASSPHRASE absent from .env"
  skip "24 operator.prompts" "operator credentials absent"
  skip "25 operator.issue_quote" "operator credentials absent"
  skip "26 commands.accept_quote(after issue)" "operator credentials absent"
  skip "27 operator.session.delete" "operator credentials absent"
fi
rm -f "$JAR"

# ---------------------------------------------------------------------------
# 10. Negatives
# ---------------------------------------------------------------------------
req GET /api/state ""
expect_status "28 neg.state without bearer" "401" ""
expect_code "28 neg.state code (want unauthenticated)"

req POST /api/auth/anonymous ""
TOKEN_B=$(j '.access_token'); UID_B=$(j '.user.id')
expect_status "29 auth.anonymous(B)" "200" "user=$UID_B"
note_id principal_b "$UID_B"
AUTH_B=(-H "authorization: Bearer $TOKEN_B")

req PATCH "/api/designs/drafts/$DRAFT_A" "{\"specification\":$SPEC_OK,\"spellingConfirmed\":true}" "${AUTH_B[@]}"
expect_status "30 neg.cross-tenant draft PATCH" "404" ""
expect_code "30 neg.cross-tenant code (want not_found)"

req POST /api/revisions/approve '{"draftId": ' "${AUTH_A[@]}"
expect_status "31 neg.approve malformed JSON" "422" ""
expect_code "31 neg.malformed code (want invalid_input)"

req POST /api/revisions/approve '{}' "${AUTH_A[@]}"
expect_status "32 neg.approve empty body" "422" ""
expect_code "32 neg.empty-body code (want invalid_input)"

req POST /api/tasks/00000000-0000-0000-0000-000000000000/retry '{}' "${AUTH_A[@]}"
expect_status "33 neg.retry unknown task" "404" ""
expect_code "33 neg.unknown-task code (want not_found)"

READY_TASK=$(db "generation_tasks?run_id=eq.$RUN_A&status=eq.ready&select=id" | jq -r '.[0].id // empty')
if [[ -n "$READY_TASK" ]]; then
  req POST "/api/tasks/$READY_TASK/retry" '{}' "${AUTH_A[@]}"
  expect_status "34 neg.retry ready task" "409" ""
  expect_code "34 neg.retry-ready code (want state_conflict)"
else
  skip "34 neg.retry ready task" "no ready task available"
fi

req POST /api/webhooks/shopify '{"id":1,"financial_status":"paid"}' \
  -H 'x-shopify-hmac-sha256: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' \
  -H 'x-shopify-topic: orders/paid' \
  -H 'x-shopify-shop-domain: caleums.myshopify.com' \
  -H 'x-shopify-webhook-id: e2e-bad-hmac'
expect_status "35 neg.shopify bad HMAC" "401" ""
expect_code "35 neg.bad-hmac code (want unauthenticated)"

# ---------------------------------------------------------------------------
# 11. Mock-only: deterministic generation failure, operator review, retry budget
# ---------------------------------------------------------------------------
if [[ "$E2E_MOCK" == "1" ]]; then
  req POST /api/designs/drafts "{\"locale\":\"en\",\"specification\":$SPEC_FAIL}" "${AUTH_A[@]}"
  DRAFT_F=$(j '.id')
  expect_status "36 mockfail.draft" "201" "draft=$DRAFT_F"
  req PATCH "/api/designs/drafts/$DRAFT_F" "{\"specification\":$SPEC_FAIL,\"spellingConfirmed\":true}" "${AUTH_A[@]}"
  expect_status "37 mockfail.confirm-spelling" "200" ""

  req POST /api/revisions/approve "{\"draftId\":\"$DRAFT_F\",\"specification\":$SPEC_FAIL,\"idempotencyKey\":\"$(uuid)\"}" "${AUTH_A[@]}"
  RUN_F=$(j '.run_id')
  expect_status "38 mockfail.approve" "201" "run=$RUN_F"
  note_id run_mockfail "$RUN_F"

  if [[ -n "$RUN_F" && "$RUN_F" != "null" ]]; then
    # The `presentation-task` Inngest function runs with retries 0, so a
    # non-terminal provider failure parks the task in `retrying` until the
    # stale sweeper (cron */2) re-dispatches it. The driver calls the same service-role
    # recovery RPC with a now() window so the scenario finishes in minutes
    # instead of ~20; the recovery path exercised is identical.
    nudge_recovery() {
      # Only when this run has nothing actively running, so recovery never
      # races a live provider attempt. Window is 60s behind now.
      local live n
      live=$(db "generation_tasks?run_id=eq.$RUN_F&status=in.(queued,generating,verifying)&select=id" | jq 'length' 2>/dev/null)
      [[ "${live:-1}" != "0" ]] && return 0
      n=$(curl -s -m 30 "${SR[@]}" -H 'content-type: application/json' \
        -X POST "$SUPABASE_URL/rest/v1/rpc/recover_stale_generation_tasks" \
        -d "{\"p_stale_before\":\"$(python3 -c 'import datetime;print((datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(seconds=60)).isoformat())')\",\"p_limit\":100}" \
        | jq -c '[.[]?|.recovery_action]' 2>/dev/null)
      [[ "$n" != "[]" && -n "$n" ]] && info "   stale-recovery nudge" "-" "$n"
      return 0
    }
    run_blocked() {
      RUNF=$(db "generation_runs?id=eq.$RUN_F&select=status,operator_review_reason" | jq -r '.[0].status')
      BLOCKED=$(db "generation_tasks?run_id=eq.$RUN_F&status=eq.blocked&select=id,attempt,terminal_error_code")
      if [[ "$RUNF" == "operator_review" && "$(echo "$BLOCKED" | jq 'length')" -ge 1 ]]; then return 0; fi
      nudge_recovery
      return 1
    }
    if poll_until "39 mockfail.poll operator_review+blocked" "${E2E_MOCKFAIL_TIMEOUT:-900}" 10 run_blocked; then
      ok "39 mockfail.poll operator_review+blocked" "-" "run=$RUNF blocked=$(echo "$BLOCKED" | jq -c 'map({a:.attempt,e:.terminal_error_code})')"
      FTASK=$(echo "$BLOCKED" | jq -r '.[0].id')
      note_id mockfail_task "$FTASK"

      task_reblocked() {
        TSTATE=$(db "generation_tasks?id=eq.$FTASK&select=status,attempt,terminal_error_code" | jq -c '.[0]')
        if [[ "$(echo "$TSTATE" | jq -r '.status')" == "blocked" && "$(echo "$TSTATE" | jq -r '.attempt')" -gt "$ATT" ]]; then return 0; fi
        nudge_recovery
        return 1
      }
      for round in 1 2 3; do
        ATT=$(db "generation_tasks?id=eq.$FTASK&select=attempt,status" | jq -r '.[0].attempt')
        req POST "/api/tasks/$FTASK/retry" "{\"idempotencyKey\":\"$(uuid)\"}" "${AUTH_A[@]}"
        if [[ "${ATT:-9}" -lt 3 ]]; then
          expect_status "40.$round mockfail.retry (attempt=$ATT, budget left)" "200" "status=$(j '.status')"
          OB=$(db "outbox_events?aggregate_id=eq.$FTASK&select=payload,state" | jq -rc '[.[]|.payload.operation]|unique')
          expect_true "41.$round mockfail.outbox operation=still_execute" "ops=$OB" "$(echo "$OB" | jq 'index("still_execute")!=null')"
          poll_until "42.$round mockfail.re-blocked" "${E2E_MOCKFAIL_TIMEOUT:-900}" 10 task_reblocked \
            && ok "42.$round mockfail.re-blocked" "-" "$TSTATE"
        else
          expect_non2xx "40.$round mockfail.retry (attempt=$ATT, budget exhausted)"
          expect_code "40.$round mockfail.budget code (want spend_guard/state_conflict)"
          break
        fi
      done
    fi
  fi
else
  skip "36-42 mockfail scenario" "E2E_MOCK=0"
fi

# ---------------------------------------------------------------------------
# 12. Mock-only injected dispatch failure
# ---------------------------------------------------------------------------
if [[ -n "${E2E_BAD_INNGEST_BASE:-}" ]]; then
  SAVED=$BASE; BASE=$E2E_BAD_INNGEST_BASE
  req POST /api/designs/drafts "{\"locale\":\"ar\",\"specification\":$SPEC_OK}" "${AUTH_B[@]}"
  DRAFT_D=$(j '.id')
  req POST /api/revisions/approve "{\"draftId\":\"$DRAFT_D\",\"specification\":$SPEC_OK,\"idempotencyKey\":\"$(uuid)\"}" "${AUTH_B[@]}"
  RUN_D=$(j '.run_id')
  expect_status "43 dispatch-failure.approve commits" "202 201" "dispatchState=$(j '.dispatchState') run=$RUN_D"
  expect_eq "43 dispatch-failure dispatchState" "pending" "$(j '.dispatchState')"
  BASE=$SAVED
  dispatch_reconciled() {
    [[ "$(db "outbox_events?aggregate_id=eq.$RUN_D&state=eq.published&select=id" | jq 'length')" -ge 1 ]]
  }
  poll_until "44 dispatch-failure.reconciled" 180 5 dispatch_reconciled \
    && ok "44 dispatch-failure.reconciled" "-" "outbox published by reconciliation"
else
  skip "43-44 injected dispatch failure" "set E2E_BAD_INNGEST_BASE to a web instance with an unreachable INNGEST_BASE_URL"
fi

# ---------------------------------------------------------------------------
# 13. Reservation accounting for principal A
# ---------------------------------------------------------------------------
TODAY=$(date -u +%F)
USAGE=$(db "principal_daily_usage?principal_id=eq.$UID_A&usage_date=eq.$TODAY&select=*")
USAGE_RESERVED=$(echo "$USAGE" | jq '[.[]?|.reserved_spend_cents]|add // 0' 2>/dev/null || echo "?")
OPEN=$(db "generation_tasks?owner_principal_id=eq.$UID_A&status=in.(queued,retrying,generating,verifying)&select=id,status,reservation_cents")
OPEN_SUM=$(echo "$OPEN" | jq '[.[]?|.reservation_cents]|add // 0' 2>/dev/null || echo "?")
info "45 reservations.raw" "-" "usage=$(echo "$USAGE" | jq -c .) open_tasks=$(echo "$OPEN" | jq -c 'map({s:.status,c:.reservation_cents})')"
expect_eq "45 reservations.usage == open task reservations" "$OPEN_SUM" "$USAGE_RESERVED" "(cents)"
info "46 run.reserved_spend_cents" "-" "$(db "generation_runs?id=eq.$RUN_A&select=status,reserved_spend_cents,actual_spend_cents" | jq -c '.[0]')"

# ---------------------------------------------------------------------------
# 14. Honest degrade: preview request capture (W4)
#
# The production failure state: the shopper keeps the labelled illustrated
# sample and leaves a way to be contacted, and the request becomes durable
# operator work. Skipped until the preview_requests migration is applied.
# ---------------------------------------------------------------------------
PR_TABLE=$(curl -s -o /dev/null -m 30 -w '%{http_code}' "${SR[@]}" "$SUPABASE_URL/rest/v1/preview_requests?select=id&limit=1")
if [[ "$PR_TABLE" != "200" ]]; then
  skip "47-53 preview-request capture" "preview_requests table absent (rest=$PR_TABLE); apply supabase/migrations/20260907010000_preview_requests.sql"
else
  PR_SPEC='{"script":"Arabic","names":["ليلى"],"construction":"Diamond rails","lettering":"Kufi","gold":{"karat":"18K","color":"Rose gold"},"stones":{"coverage":"Accent","gemstone":"Lab diamond"},"pendantWidthMm":32,"chainStyle":"Rolo"}'
  PR_SAMPLE='{"manifestId":"sample-assets-v9","sampleId":"akr-white-none-Studio-v9","view":"Studio","assetPath":"/atelier/arabic-kufi-rails-white-none-studio.png"}'
  PR_KEY=$(uuid)
  PR_BODY="{\"locale\":\"ar\",\"specification\":$PR_SPEC,\"contact\":{\"channel\":\"whatsapp\",\"value\":\"+971 50 123 4567\",\"name\":\"Layla\"},\"sampleReference\":$PR_SAMPLE,\"requestKey\":\"$PR_KEY\"}"

  req POST /api/preview-requests "$PR_BODY" "${AUTH_A[@]}"
  PREQ=$(j '.id')
  expect_status "47 preview-request.create" "201" "id=$PREQ status=$(j '.status')"
  note_id preview_request_a "$PREQ"
  expect_eq "47 preview-request.status new" "new" "$(j '.status')"
  expect_eq "47 preview-request.customer read hides operator fields" "nullnull" "$(j '.contact')$(j '.operatorNote')"

  if [[ -n "$PREQ" && "$PREQ" != "null" ]]; then
    PRROW=$(db "preview_requests?id=eq.$PREQ&select=principal_id,status,contact,sample_reference,request_key")
    expect_eq "48 preview-request.owner is the anonymous principal" "$UID_A" "$(echo "$PRROW" | jq -r '.[0].principal_id')"
    expect_eq "48 preview-request.contact normalized to E.164" "+971501234567" "$(echo "$PRROW" | jq -r '.[0].contact.value')"
    expect_eq "48 preview-request.labelled sample recorded" "illustrative-reference-only" "$(echo "$PRROW" | jq -r '.[0].sample_reference.role')"
    AUDITED=$(db "audit_events?action=eq.preview_request.captured&select=detail" | jq --arg id "$PREQ" '[.[]?|select(.detail.previewRequestId==$id)]|length')
    expect_eq "48 preview-request.audit row appended" "1" "$AUDITED"

    req POST /api/preview-requests "$PR_BODY" "${AUTH_A[@]}"
    expect_status "49 preview-request.idempotent-replay" "200" "id=$(j '.id')"
    expect_eq "49 preview-request.replay same id" "$PREQ" "$(j '.id')"
    expect_eq "49 preview-request.replay creates no duplicate" "1" "$(db "preview_requests?principal_id=eq.$UID_A&request_key=eq.$PR_KEY&select=id" | jq 'length')"

    req GET "/api/preview-requests/$PREQ" "" "${AUTH_A[@]}"
    expect_status "50 preview-request.owner reload" "200" "status=$(j '.status')"

    req GET "/api/preview-requests/$PREQ" "" "${AUTH_B[@]}"
    expect_status "51 neg.cross-tenant preview-request GET" "403 404" ""
    expect_code "51 neg.cross-tenant preview-request code (want not_found)"
  fi

  req POST /api/preview-requests "{\"locale\":\"ar\",\"specification\":$PR_SPEC,\"contact\":{\"channel\":\"whatsapp\",\"value\":\"12345\"}}" "${AUTH_A[@]}"
  expect_status "52 neg.preview-request unusable contact" "422" ""
  expect_code "52 neg.preview-request contact code (want invalid_input)"

  req POST /api/preview-requests "$PR_BODY"
  expect_status "52b neg.preview-request without bearer" "401" ""

  PRJAR="$(mktemp -t e2e-preview-operator-jar)"
  if [[ -n "${OPERATOR_EMAIL:-}" && -n "${OPERATOR_PASSPHRASE:-}" && -n "$PREQ" && "$PREQ" != "null" ]]; then
    req POST /api/operator/session "{\"email\":\"$OPERATOR_EMAIL\",\"passphrase\":\"$OPERATOR_PASSPHRASE\"}" -c "$PRJAR"
    if [[ "$HTTP" == "200" ]]; then
      req GET /api/operator/preview-requests "" -b "$PRJAR"
      expect_status "53 operator.preview-requests list" "200" "count=$(j '.previewRequests|length')"
      LISTED=$(echo "$BODY" | jq --arg id "$PREQ" '[.previewRequests[]?|select(.id==$id)]|length')
      expect_eq "53 operator.list contains the capture" "1" "$LISTED" "summary=$(echo "$BODY" | jq -r --arg id "$PREQ" '[.previewRequests[]?|select(.id==$id)|.summary][0] // "-"')"

      req POST /api/operator/commands "{\"command\":\"preview_request.mark_contacted\",\"targetId\":\"$PREQ\",\"idempotencyKey\":\"$(uuid)\",\"payload\":{\"note\":\"E2E driver\"}}" -b "$PRJAR"
      expect_status "53b operator.mark_contacted" "200" "$(j '{id,status}')"
      PRAFTER=$(db "preview_requests?id=eq.$PREQ&select=status,contacted_at,operator_note" | jq -c '.[0]')
      expect_eq "53b preview-request.status contacted" "contacted" "$(echo "$PRAFTER" | jq -r '.status')" "$PRAFTER"
      expect_true "53b preview-request.contacted_at set" "timestamp recorded" "$(echo "$PRAFTER" | jq '.contacted_at != null')"

      req DELETE /api/operator/session "" -b "$PRJAR" -c "$PRJAR"
      expect_status "53c operator.session.delete" "200" ""
    else
      skip "53 operator.preview-requests list" "operator session rejected (http=$HTTP)"
    fi
  else
    skip "53 operator.preview-requests list" "OPERATOR_EMAIL/OPERATOR_PASSPHRASE absent from .env"
    skip "53b operator.mark_contacted" "operator credentials absent"
  fi
  rm -f "$PRJAR"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo
echo "=== timing (ms since start) ==="
for entry in "${TIMING[@]}"; do printf '  %-24s %s\n' "${entry%%=*}" "${entry#*=}"; done
printf '  %-24s %s\n' "approve_call_only" "$APPROVE_MS"
echo
echo "=== ids ==="
for entry in "${IDS[@]}"; do printf '  %-24s %s\n' "${entry%%=*}" "${entry#*=}"; done
echo
if [[ $FAILURES -eq 0 ]]; then
  echo "=== PASS · 0 failed assertions · $(elapsed)ms ==="
  exit 0
fi
echo "=== FAIL · $FAILURES failed assertions · $(elapsed)ms ==="
for entry in "${FAILED[@]}"; do echo "  - $entry"; done
exit 1

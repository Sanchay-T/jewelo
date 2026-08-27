#!/usr/bin/env bash
set -uo pipefail
BASE="${BASE:-http://localhost:4371}"
cd /Users/sanchay/.codex/worktrees/3db9/jewelo; set -a; source .env; set +a
SR_H=(-H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
now(){ python3 -c 'import time;print(int(time.time()*1000))'; }
T0=$(now); step(){ echo "[$(( $(now)-T0 ))ms] $*"; }
db(){ curl -s "${SR_H[@]}" "$SUPABASE_URL/rest/v1/$1"; }

R=$(curl -s -w '\n%{http_code}' -X POST $BASE/api/auth/anonymous); code=${R##*$'\n'}; body=${R%$'\n'*}
TOKEN=$(echo "$body" | jq -r .access_token); UID_=$(echo "$body" | jq -r .user.id); step "auth $code user=$UID_"
AUTH=(-H "authorization: Bearer $TOKEN" -H "content-type: application/json")
SPEC='{"jewelryType":"name-pendant","nameCount":1,"names":[{"approvedEnglishText":null,"approvedArabicText":"ليلى"}],"arabicStyle":"contemporary","layout":"single-name","source":"fresh","metalKarat":"18K","metalColor":"yellow","finish":"polished","stoneCoverage":"none","gemstone":"none","connector":"none","sizeProfile":"classic","dimensions":{"widthMm":30,"heightMm":18,"thicknessMm":1.2},"chain":{"style":"cable","lengthCm":45},"complexity":2,"spellingConfirmed":false}'
R=$(curl -s -w '\n%{http_code}' -X POST $BASE/api/designs/drafts "${AUTH[@]}" -d "{\"locale\":\"ar\",\"specification\":$SPEC}"); code=${R##*$'\n'}; body=${R%$'\n'*}
DRAFT=$(echo "$body" | jq -r .id); step "draft $code id=$DRAFT"
SPEC_OK=$(echo "$SPEC" | jq -c '.spellingConfirmed=true')
R=$(curl -s -w '\n%{http_code}' -X PATCH $BASE/api/designs/drafts/$DRAFT "${AUTH[@]}" -d "{\"specification\":$SPEC_OK,\"spellingConfirmed\":true}"); code=${R##*$'\n'}; step "confirm-spelling $code spelling_confirmed=$(echo "${R%$'\n'*}" | jq -r .spelling_confirmed)"
KEY=$(uuidgen | tr A-Z a-z)
TA=$(now)
R=$(curl -s -w '\n%{http_code}' -X POST $BASE/api/revisions/approve "${AUTH[@]}" -d "{\"draftId\":\"$DRAFT\",\"specification\":$SPEC_OK,\"idempotencyKey\":\"$KEY\"}"); code=${R##*$'\n'}; body=${R%$'\n'*}
RUN=$(echo "$body" | jq -r .run_id); step "approve $code ($(( $(now)-TA ))ms) run=$RUN dispatch=$(echo "$body" | jq -c '{dispatchState,acceptedCount,pendingCount}')"
echo "$body" | jq -c 'del(.canonical_identity_anchor)'
step "tasks: $(db "generation_tasks?run_id=eq.$RUN&select=id,presentation_view,status,created_at" | jq -c 'map({v:.presentation_view,s:.status})')"
step "outbox: $(db "outbox_events?aggregate_id=eq.$RUN&select=id,state,attempt_count,trigger_run_id,last_error,payload" | jq -c 'map({s:.state,a:.attempt_count,tr:.trigger_run_id,e:.last_error,op:.payload.operation,k:.payload.taskKind})')"
# replay approve with same key
R=$(curl -s -w '\n%{http_code}' -X POST $BASE/api/revisions/approve "${AUTH[@]}" -d "{\"draftId\":\"$DRAFT\",\"specification\":$SPEC_OK,\"idempotencyKey\":\"$KEY\"}"); step "approve-replay ${R##*$'\n'} run=$(echo "${R%$'\n'*}" | jq -r '.run_id // .error')"
for i in $(seq 1 90); do
  ST=$(db "generation_tasks?run_id=eq.$RUN&select=presentation_view,status,updated_at&presentation_view=neq.motion_preview" | jq -c 'map({v:.presentation_view,s:.status})')
  READY=$(echo "$ST" | jq '[.[]|select(.s=="ready")]|length'); DONE=$(echo "$ST" | jq '[.[]|select(.s=="ready" or .s=="blocked" or .s=="failed" or .s=="cancelled" or .s=="operator_review")]|length')
  [[ $i -eq 1 || $((i%5)) -eq 0 ]] && step "poll $ST"
  [[ $DONE -ge 4 ]] && break; sleep 2
done
step "final tasks: $(db "generation_tasks?run_id=eq.$RUN&select=presentation_view,status,attempt,updated_at,terminal_error_code" | jq -c .)"
step "run: $(db "generation_runs?id=eq.$RUN&select=status,reserved_spend_cents,actual_spend_cents,updated_at" | jq -c .)"
step "assets: $(db "assets?run_id=eq.$RUN&select=id,presentation_view,bucket_id,byte_size,provider,model,mime_type" | jq -c 'map({v:.presentation_view,b:.bucket_id,bytes:.byte_size,p:.provider,m:.model,mime:.mime_type})')"
step "outbox: $(db "outbox_events?aggregate_id=eq.$RUN&select=state,attempt_count,trigger_run_id,last_error,published_at,created_at" | jq -c .)"
step "attempts: $(db "provider_attempts?task_id=in.($(db "generation_tasks?run_id=eq.$RUN&select=id" | jq -r 'map(.id)|join(",")'))&select=attempt,provider,status,actual_cost_cents,created_at,completed_at" | jq -c .)"
R=$(curl -s -w '\n%{http_code}' $BASE/api/state -H "authorization: Bearer $TOKEN"); step "state ${R##*$'\n'} $(echo "${R%$'\n'*}" | jq -c '{designs:(.designs|length),runs:(.generation_runs|length),tasks:(.generation_tasks|length),assets:(.assets|length),signed:([.assets[].signed_url]|map(select(.!=null))|length)}')"
echo "RUN=$RUN TOKEN_LEN=${#TOKEN} DESIGN=$(echo "$body" | jq -r .approved_design_id)"
TS=$(now); R=$(curl -s -w '\n%{http_code}' $BASE/api/state -H "authorization: Bearer $TOKEN"); step "state-again ${R##*$'\n'} in $(( $(now)-TS ))ms bytes=${#R}"
R=$(curl -s -w '\n%{http_code}' $BASE/api/state); step "NEG no-bearer state -> ${R##*$'\n'} $(echo "${R%$'\n'*}" | head -c 80)"
R=$(curl -s -w '\n%{http_code}' -X POST $BASE/api/revisions/approve "${AUTH[@]}" -d '{"nope":1}'); step "NEG malformed approve -> ${R##*$'\n'} $(echo "${R%$'\n'*}" | head -c 120)"
R=$(curl -s -w '\n%{http_code}' -X PATCH $BASE/api/designs/drafts/015bd05c-b850-47a2-8de7-1c717bb5064c "${AUTH[@]}" -d '{"spellingConfirmed":true}'); step "NEG other-user draft PATCH -> ${R##*$'\n'} $(echo "${R%$'\n'*}" | head -c 120)"
R=$(curl -s -w '\n%{http_code}' -X POST $BASE/api/tasks/00000000-0000-0000-0000-000000000000/retry "${AUTH[@]}" -d '{}'); step "NEG retry unknown task -> ${R##*$'\n'} $(echo "${R%$'\n'*}" | head -c 120)"
R=$(curl -s -w '\n%{http_code}' -X POST $BASE/api/revisions/approve "${AUTH[@]}" -d "{\"draftId\":\"$DRAFT\",\"specification\":$SPEC_OK,\"idempotencyKey\":\"$(uuidgen)\"}"); step "NEG second run while active -> ${R##*$'\n'} $(echo "${R%$'\n'*}" | head -c 120)"
STILL=$(db "generation_tasks?run_id=eq.$RUN&presentation_view=eq.studio&select=id" | jq -r '.[0].id')
R=$(curl -s -w '\n%{http_code}' -X POST $BASE/api/tasks/$STILL/retry "${AUTH[@]}" -d '{}'); step "retry ready still -> ${R##*$'\n'} $(echo "${R%$'\n'*}" | head -c 160)"
VID=$(db "generation_tasks?run_id=eq.$RUN&presentation_view=eq.motion_preview&select=id" | jq -r '.[0].id')
R=$(curl -s -w '\n%{http_code}' -X POST $BASE/api/tasks/$VID/cancel "${AUTH[@]}"); step "cancel video -> ${R##*$'\n'} $(echo "${R%$'\n'*}" | head -c 160)"
echo "TOKEN=$TOKEN" > /private/tmp/claude-501/-Users-sanchay--codex-worktrees-3db9-jewelo/cc7ef4f0-d3c9-465a-b1fe-aa63338b904a/scratchpad/token.env

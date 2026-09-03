#!/usr/bin/env bash
#
# publish-push.sh (S341) — the recovery half of every scheduled publisher.
#
# WHY THIS FILE EXISTS
# --------------------
# A scheduled publisher is two transactions, not one: generate + validate, then
# land on main. This repo had invested heavily in the first half — the uptime
# publisher alone runs twenty-plus `--check` gates before it stages a byte — and
# had no contract at all over the second. Eleven of twelve publishers could not
# survive a rebase conflict, and on 2026-09-03 the uptime cron proved it live.
#
# The shape they all carried:
#
#     for attempt in 1 2 3 4; do
#       git pull --rebase --autostash origin main || true
#       if git push; then pushed=1; break; fi
#       sleep ...
#     done
#
# Attempt 1's rebase conflicts on derived artifacts and leaves the repo mid-rebase
# on a detached HEAD. `|| true` swallows that. The push fails — "You are not
# currently on a branch." Attempts 2, 3 and 4 then each re-enter `git pull --rebase`,
# which fails instantly on "Pulling is not possible because you have unmerged
# files", is swallowed again, and pushes into the same wedged state. Three of the
# four attempts are structurally incapable of succeeding. The loop burns fifty
# seconds re-reporting attempt 1, then reports failure "after 4 attempts".
#
# `git rebase --abort` on the failure path is what makes a retry a retry. That
# single line is the P0 fix, and it is why this logic lives in ONE file that
# twelve workflows call rather than in twelve copies that drift.
#
# TWO PROPERTIES, NOT ONE
# -----------------------
#  1. RECOVERABLE — never re-enter the loop wedged. Abort any in-progress rebase
#     before sleeping, whatever failed.
#  2. NOT STALE — a rebase can bring in a new INPUT to an artifact this publisher
#     already generated and gated. `-X theirs` resolves the collision in favour of
#     the freshly regenerated side, which is correct for a derived artifact, but it
#     says nothing about a dependent that never conflicted and merely hashes an
#     input that moved underneath it. A conflict list shows collisions, not
#     dependents. `--resync` closes that with the evidence graph (resync-derived,
#     S309) and amends the repair into the publish commit, so the publisher cannot
#     land an artifact that its own build:check would reject minutes later.
#
# USAGE
#   bash scripts/ci/publish-push.sh <label> [--resync] [--attempts N]
#
#   <label>      names the publisher in every log line and in the final ::error::
#   --resync     rebuild + verify the derived closure of whatever the rebase brought
#                in, and amend it into the publish commit before pushing
#   --attempts N override the default of 4
#
# Exit 0 = the publish is on main. Exit 1 = it is not, and the reason is named.
#
set -uo pipefail

label=""
resync=0
attempts=4

while [ "$#" -gt 0 ]; do
  case "$1" in
    --resync)   resync=1; shift ;;
    --attempts) attempts="${2:?--attempts needs a value}"; shift 2 ;;
    --) shift; break ;;
    *)  if [ -z "$label" ]; then label="$1"; shift; else
          echo "publish-push: unexpected argument '$1'" >&2; exit 2
        fi ;;
  esac
done

if [ -z "$label" ]; then
  echo "publish-push: a label is required (usage: publish-push.sh <label> [--resync])" >&2
  exit 2
fi

attempt=1
while [ "$attempt" -le "$attempts" ]; do
  # Record where we stood BEFORE the rebase. ORIG_HEAD is the documented default
  # for resync-derived, but it is written by git only when a rebase actually
  # happens and survives from unrelated earlier operations otherwise — on a fresh
  # CI checkout it may not exist at all. An explicit sha is always resolvable and
  # always means the thing we need it to mean.
  before="$(git rev-parse HEAD)"

  # During a rebase git calls the fetched main side "ours" and the commit being
  # replayed — this publisher's — "theirs". Every artifact this step can conflict
  # on was regenerated and gated seconds ago, so the replayed side is the correct
  # one. (Same reasoning, same flag, as news-publish.yml, the one publisher that
  # already survived this class.)
  if git pull --rebase -X theirs --autostash origin main; then

    if [ "$resync" = "1" ] && [ "$before" != "$(git rev-parse HEAD)" ]; then
      # The rebase moved us, so something arrived from main. Repair the derived
      # closure of it and prove the repair with each node's own --check, rather
      # than discovering the drift as a red build:check on the next human push.
      if ! node scripts/resync-derived.mjs --since "$before" --verify; then
        echo "::error::${label}: derived artifacts could not be resynced after rebase — refusing to publish a stale artifact"
        exit 1
      fi
      # resync-derived stages what it rebuilds; carry it in the publish commit.
      if ! git diff --cached --quiet; then
        echo "${label}: rebase brought new inputs — amending the resynced artifacts into the publish commit."
        git commit --amend --no-edit
      fi
    fi

    if git push; then
      echo "${label}: published on attempt ${attempt}."
      exit 0
    fi
  fi

  # Whatever failed above, do not carry a half-finished rebase into the next
  # attempt. This is the line whose absence made the retry loop decorative.
  git rebase --abort >/dev/null 2>&1 || true

  if [ "$attempt" -lt "$attempts" ]; then
    delay=$(( attempt * 5 ))
    echo "${label}: publish attempt ${attempt}/${attempts} failed — retrying in ${delay}s"
    sleep "$delay"
  fi
  attempt=$(( attempt + 1 ))
done

echo "::error::${label}: could not be published after ${attempts} attempts"
exit 1

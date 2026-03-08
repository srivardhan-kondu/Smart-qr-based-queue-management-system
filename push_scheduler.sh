#!/bin/zsh
# push_scheduler.sh
# Pushes one commit to GitHub every 30 minutes.
# Run AFTER setup_commits.sh has created all 18 local commits.
# Keep this terminal open (or run with: nohup zsh push_scheduler.sh > push.log 2>&1 &)

cd '/Users/srivardhan/PULSE PROJECTS/March/QR Code'

REMOTE="origin"
BRANCH="main"
INTERVAL=1800   # 30 minutes in seconds

# Collect all commits oldest → newest
COMMITS=($(git log --reverse --format="%H" $BRANCH))
TOTAL=${#COMMITS[@]}

if [[ $TOTAL -eq 0 ]]; then
  echo "No commits found. Run setup_commits.sh first."
  exit 1
fi

echo "========================================="
echo "Push Scheduler — Smart QR Queue System"
echo "Total commits : $TOTAL"
echo "Interval      : 30 minutes each"
echo "Estimated time: $((TOTAL * 30 / 60)) hours $((TOTAL * 30 % 60)) minutes"
echo "Started at    : $(date '+%d %b %Y %H:%M:%S')"
echo "========================================="
echo ""

NUM=0
for HASH in "${COMMITS[@]}"; do
  NUM=$((NUM + 1))
  MSG=$(git log --format="%s" -1 "$HASH")

  echo "[$(date '+%H:%M:%S')] Pushing commit $NUM/$TOTAL"
  echo "  Hash : $HASH"
  echo "  Msg  : $MSG"

  git push "$REMOTE" "${HASH}:refs/heads/${BRANCH}"

  echo "  Done : commit $NUM pushed at $(date '+%H:%M:%S')"
  echo ""

  if [[ $NUM -lt $TOTAL ]]; then
    echo "  Next push in 30 minutes..."
    echo "---"
    sleep $INTERVAL
  fi
done

echo "========================================="
echo "All $TOTAL commits pushed to GitHub!"
echo "Finished at : $(date '+%d %b %Y %H:%M:%S')"
echo "Repo        : https://github.com/srivardhan-kondu/Smart-qr-based-queue-management-system"
echo "========================================="

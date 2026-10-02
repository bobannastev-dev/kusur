#!/usr/bin/env bash
# Податоците меѓу дневните пуштања (снимки 7 дена + промени 365 дена) како архива во
# GitHub Release. Употреба (во Actions или локално, со gh најавен на repo-то):
#   scripts/data-archive.sh restore   # data-latest → data/   (без податоци: грешка, без објава)
#   scripts/data-archive.sh publish   # data/ → data-latest, плус дневна копија во data-daily (7 дена)

set -euo pipefail

KEEP_DAILY_DAYS=7
ARCHIVE=data.tar.gz

snapshot_count() {
  find data/snapshots -name '*.json' 2>/dev/null | wc -l
}

ensure_release() {
  gh release view "$1" >/dev/null 2>&1 ||
    gh release create "$1" --title "$2" --notes "$3" --latest=false >/dev/null
}

case "${1:-}" in
  restore)
    rm -f "$ARCHIVE"
    gh release download data-latest --pattern "$ARCHIVE" --dir . --clobber
    tar xzf "$ARCHIVE"
    count=$(snapshot_count)
    if [ "$count" -eq 0 ]; then
      echo "Архивата нема ниту една снимка — запирам (без објава, без препишување)." >&2
      exit 1
    fi
    echo "Вратени податоци: $count снимки, $(find data/changes -name '*.json' | wc -l) записи со промени."
    ;;

  publish)
    count=$(snapshot_count)
    if [ "$count" -eq 0 ]; then
      echo "Нема снимки во data/ — не ја препишувам архивата." >&2
      exit 1
    fi
    tar czf "$ARCHIVE" data/snapshots data/changes
    ensure_release data-latest "Податоци (последни)" "Снимки (7 дена) и промени (365 дена) за дневното преземање. Се препишува секој ден."
    gh release upload data-latest "$ARCHIVE" --clobber

    day=$(date +%F)
    cp "$ARCHIVE" "data-$day.tar.gz"
    ensure_release data-daily "Податоци (дневни копии)" "Дневни копии од data-latest за последните $KEEP_DAILY_DAYS дена, за враќање ако нешто се расипе."
    gh release upload data-daily "data-$day.tar.gz" --clobber

    cutoff=$(date -d "-$KEEP_DAILY_DAYS days" +%F)
    gh release view data-daily --json assets --jq '.assets[].name' | while read -r name; do
      d=${name#data-}
      d=${d%.tar.gz}
      if [[ "$d" < "$cutoff" ]]; then gh release delete-asset data-daily "$name" --yes; fi
    done
    echo "Зачувано: $count снимки ($(du -h "$ARCHIVE" | cut -f1)), дневна копија data-$day."
    ;;

  *)
    echo "Употреба: $0 restore|publish" >&2
    exit 2
    ;;
esac

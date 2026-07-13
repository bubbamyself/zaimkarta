#!/bin/sh

set -u

umask 077

CONFIG_FILE=${HEALTH_CONFIG_FILE:-/etc/zaimkarta-health.conf}
if [ -r "$CONFIG_FILE" ]; then
  # Файл создаётся root-инсталлятором. Heartbeat URL не печатается в лог.
  # shellcheck disable=SC1090
  . "$CONFIG_FILE"
fi

PROJECT_DIR=${PROJECT_DIR:-/home/deploy/zaimkarta/deploy}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
BACKUP_ROOT=${BACKUP_ROOT:-/home/deploy/backups/zaimkarta}
BACKUP_COMMAND=${BACKUP_COMMAND:-/usr/local/sbin/zaimkarta-backup}
STATE_DIR=${STATE_DIR:-/var/lib/zaimkarta-health}
LOG_FILE=${LOG_FILE:-/var/log/zaimkarta-health.log}
SITE_URL=${SITE_URL:-https://zaimkarta.ru}
HEALTH_MARKER_FILE=${HEALTH_MARKER_FILE:-/tmp/zaimkarta-health-ok}
DISK_WARNING_PERCENT=${DISK_WARNING_PERCENT:-80}
MEMORY_WARNING_PERCENT=${MEMORY_WARNING_PERCENT:-90}
MAX_LOAD_PER_CPU_X100=${MAX_LOAD_PER_CPU_X100:-200}
MIN_BACKUP_FREE_KB=${MIN_BACKUP_FREE_KB:-5242880}
MAX_BACKUP_AGE_HOURS=${MAX_BACKUP_AGE_HOURS:-36}
MAX_RESTARTS_PER_RUN=${MAX_RESTARTS_PER_RUN:-3}
LOG_LOOKBACK=${LOG_LOOKBACK:-10m}
MAX_5XX_PER_WINDOW=${MAX_5XX_PER_WINDOW:-5}
MAX_4XX_PER_WINDOW=${MAX_4XX_PER_WINDOW:-100}
MAX_GO_429_PER_WINDOW=${MAX_GO_429_PER_WINDOW:-20}

LOCK_DIR="$STATE_DIR/.health.lock"
BACKUP_FAILURE_FLAG="$STATE_DIR/backup-check.failed"
TEMP_CADDY_LOG="/tmp/zaimkarta-health-caddy.$$"
FAILURES=0
PUBLISH_MARKER=0

log() {
  level=$1
  shift
  line="$(date -u '+%Y-%m-%dT%H:%M:%SZ') [$level] $*"
  printf '%s\n' "$line"
  printf '%s\n' "$line" >> "$LOG_FILE"
}

fail_check() {
  FAILURES=$((FAILURES + 1))
  log ERROR "$*"
}

cleanup() {
  rm -f -- "$TEMP_CADDY_LOG"
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

finish() {
  status=$?
  trap - EXIT HUP INT TERM
  cleanup
  exit "$status"
}

require_integer() {
  name=$1
  value=$2
  case "$value" in
    ''|*[!0-9]*) printf 'ERROR: %s должен быть целым числом\n' "$name" >&2; exit 2 ;;
  esac
}

validate_settings() {
  [ "$(id -u)" -eq 0 ] || {
    printf 'ERROR: проверку нужно запускать через sudo\n' >&2
    exit 2
  }

  for pair in \
    "DISK_WARNING_PERCENT:$DISK_WARNING_PERCENT" \
    "MEMORY_WARNING_PERCENT:$MEMORY_WARNING_PERCENT" \
    "MAX_LOAD_PER_CPU_X100:$MAX_LOAD_PER_CPU_X100" \
    "MIN_BACKUP_FREE_KB:$MIN_BACKUP_FREE_KB" \
    "MAX_BACKUP_AGE_HOURS:$MAX_BACKUP_AGE_HOURS" \
    "MAX_RESTARTS_PER_RUN:$MAX_RESTARTS_PER_RUN" \
    "MAX_5XX_PER_WINDOW:$MAX_5XX_PER_WINDOW" \
    "MAX_4XX_PER_WINDOW:$MAX_4XX_PER_WINDOW" \
    "MAX_GO_429_PER_WINDOW:$MAX_GO_429_PER_WINDOW"
  do
    require_integer "${pair%%:*}" "${pair#*:}"
  done

  [ "$DISK_WARNING_PERCENT" -gt 0 ] && [ "$DISK_WARNING_PERCENT" -lt 100 ] \
    || { printf 'ERROR: DISK_WARNING_PERCENT должен быть от 1 до 99\n' >&2; exit 2; }
  [ "$MEMORY_WARNING_PERCENT" -gt 0 ] && [ "$MEMORY_WARNING_PERCENT" -lt 100 ] \
    || { printf 'ERROR: MEMORY_WARNING_PERCENT должен быть от 1 до 99\n' >&2; exit 2; }

  case "$PROJECT_DIR:$BACKUP_ROOT:$STATE_DIR:$LOG_FILE" in
    *..*) printf 'ERROR: пути не должны содержать ..\n' >&2; exit 2 ;;
  esac
  case "$PROJECT_DIR:$BACKUP_ROOT:$STATE_DIR:$LOG_FILE" in
    /*:/*:/*:/*) ;;
    *) printf 'ERROR: production-пути должны быть абсолютными\n' >&2; exit 2 ;;
  esac

  mkdir -p "$STATE_DIR"
  touch "$LOG_FILE"
  chmod 700 "$STATE_DIR"
  chmod 600 "$LOG_FILE"
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    printf 'ERROR: другая health-проверка уже выполняется\n' >&2
    exit 2
  fi
}

compose() {
  (cd "$PROJECT_DIR" && docker compose -f "$COMPOSE_FILE" "$@")
}

check_disk() {
  disk_used=$(df -P / | awk 'NR == 2 { gsub("%", "", $5); print $5 }')
  case "$disk_used" in
    ''|*[!0-9]*) fail_check "Не удалось определить заполнение системного диска"; return ;;
  esac
  if [ "$disk_used" -ge "$DISK_WARNING_PERCENT" ]; then
    fail_check "Системный диск заполнен на ${disk_used}% (порог ${DISK_WARNING_PERCENT}%)"
  else
    log INFO "Диск: ${disk_used}% занято"
  fi

  if [ ! -d "$BACKUP_ROOT" ]; then
    fail_check "Не найден каталог бэкапов: $BACKUP_ROOT"
    return
  fi
  backup_free_kb=$(df -Pk "$BACKUP_ROOT" | awk 'NR == 2 { print $4 }')
  case "$backup_free_kb" in
    ''|*[!0-9]*) fail_check "Не удалось определить свободное место для бэкапов"; return ;;
  esac
  if [ "$backup_free_kb" -lt "$MIN_BACKUP_FREE_KB" ]; then
    backup_free_mb=$((backup_free_kb / 1024))
    fail_check "Для бэкапов осталось только ${backup_free_mb} МБ"
  else
    backup_free_mb=$((backup_free_kb / 1024))
    log INFO "Свободное место для бэкапов: ${backup_free_mb} МБ"
  fi
}

check_memory_and_load() {
  mem_total=$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo)
  mem_available=$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo)
  case "$mem_total:$mem_available" in
    *[!0-9:]*|:*|*:) fail_check "Не удалось определить использование памяти" ;;
    *)
      memory_used=$(( (mem_total - mem_available) * 100 / mem_total ))
      if [ "$memory_used" -ge "$MEMORY_WARNING_PERCENT" ]; then
        fail_check "Память занята на ${memory_used}% (порог ${MEMORY_WARNING_PERCENT}%)"
      else
        log INFO "Память: ${memory_used}% занято"
      fi
      ;;
  esac

  cpu_count=$(getconf _NPROCESSORS_ONLN 2>/dev/null || printf '1')
  load_x100=$(awk '{ printf "%.0f", $1 * 100 }' /proc/loadavg)
  case "$cpu_count:$load_x100" in
    *[!0-9:]*|:*|*:) fail_check "Не удалось определить нагрузку CPU" ;;
    *)
      load_limit=$((cpu_count * MAX_LOAD_PER_CPU_X100))
      if [ "$load_x100" -ge "$load_limit" ]; then
        fail_check "Load average за 1 минуту слишком высокий: ${load_x100}/100 при ${cpu_count} CPU"
      else
        log INFO "Load average: ${load_x100}/100 при ${cpu_count} CPU"
      fi
      ;;
  esac
}

check_container() {
  service=$1
  expected_health=$2
  container_id=$(compose ps -q "$service" 2>/dev/null | sed -n '1p')
  if [ -z "$container_id" ]; then
    fail_check "Docker-сервис '$service' не найден"
    return
  fi

  inspect=$(docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} {{.RestartCount}}' "$container_id" 2>/dev/null) || {
    fail_check "Не удалось прочитать состояние Docker-сервиса '$service'"
    return
  }
  set -- $inspect
  container_status=${1:-unknown}
  container_health=${2:-unknown}
  restart_count=${3:-0}

  [ "$container_status" = "running" ] \
    || fail_check "Docker-сервис '$service' имеет состояние '$container_status'"
  if [ "$expected_health" = "healthy" ] && [ "$container_health" != "healthy" ]; then
    fail_check "Docker-сервис '$service' имеет health '$container_health'"
  fi

  restart_file="$STATE_DIR/restarts-$service"
  previous_restarts=0
  if [ -r "$restart_file" ]; then
    previous_restarts=$(sed -n '1p' "$restart_file")
  fi
  case "$previous_restarts:$restart_count" in
    *[!0-9:]*|:*|*:) fail_check "Некорректный счётчик перезапусков '$service'" ;;
    *)
      restart_delta=$((restart_count - previous_restarts))
      [ "$restart_delta" -ge 0 ] || restart_delta=$restart_count
      if [ "$restart_delta" -ge "$MAX_RESTARTS_PER_RUN" ]; then
        fail_check "Docker-сервис '$service' перезапустился ${restart_delta} раз с прошлой проверки"
      fi
      printf '%s\n' "$restart_count" > "$restart_file"
      ;;
  esac
  log INFO "Docker '$service': status=$container_status, health=$container_health, restarts=$restart_count"
}

check_docker() {
  [ -d "$PROJECT_DIR" ] || { fail_check "Не найден production-каталог: $PROJECT_DIR"; return; }
  [ -f "$PROJECT_DIR/$COMPOSE_FILE" ] || { fail_check "Не найден Compose-файл: $PROJECT_DIR/$COMPOSE_FILE"; return; }
  command -v docker >/dev/null 2>&1 || { fail_check "Docker не найден"; return; }
  check_container app healthy
  check_container db healthy
  check_container caddy running
}

check_http_endpoint() {
  path=$1
  label=$2
  if http_status=$(curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}' "$SITE_URL$path" 2>/dev/null); then
    if [ "$http_status" = "200" ]; then
      log INFO "HTTPS $label: 200"
    else
      fail_check "HTTPS $label вернул статус $http_status вместо 200"
    fi
  else
    fail_check "HTTPS $label недоступен или сертификат не прошёл проверку"
  fi
}

check_http() {
  command -v curl >/dev/null 2>&1 || { fail_check "curl не найден"; return; }
  check_http_endpoint / "главная"
  check_http_endpoint /admin/login "admin/login"
  check_http_endpoint /robots.txt "robots.txt"
  check_http_endpoint /sitemap.xml "sitemap.xml"
}

newest_file() {
  directory=$1
  pattern=$2
  find "$directory" -type f -name "$pattern" -print 2>/dev/null | sort | tail -n 1
}

check_backup_file_age() {
  directory=$1
  pattern=$2
  label=$3
  latest_file=$(newest_file "$directory" "$pattern")
  if [ -z "$latest_file" ]; then
    fail_check "Не найден свежий бэкап: $label"
    return
  fi
  now=$(date '+%s')
  modified=$(date -r "$latest_file" '+%s' 2>/dev/null || printf '0')
  age_hours=$(( (now - modified) / 3600 ))
  if [ "$age_hours" -gt "$MAX_BACKUP_AGE_HOURS" ]; then
    fail_check "$label старше ${MAX_BACKUP_AGE_HOURS} часов: ${age_hours}ч"
  else
    log INFO "$label: возраст ${age_hours}ч"
  fi
}

check_backup_freshness() {
  check_backup_file_age "$BACKUP_ROOT/db/daily" 'db-*.dump' "Бэкап PostgreSQL"
  check_backup_file_age "$BACKUP_ROOT/uploads/daily" 'uploads-logos-*.tar.gz' "Бэкап uploads/logos"
  if [ -f "$BACKUP_FAILURE_FLAG" ]; then
    fail_check "Последняя глубокая проверка бэкапов завершилась ошибкой"
  fi
}

check_caddy_logs() {
  if ! compose logs --since "$LOG_LOOKBACK" --no-color caddy > "$TEMP_CADDY_LOG" 2>/dev/null; then
    fail_check "Не удалось прочитать свежие Caddy access logs"
    return
  fi

  count_5xx=$(awk '$0 ~ /"status":[[:space:]]*5[0-9][0-9]/ { count++ } END { print count + 0 }' "$TEMP_CADDY_LOG")
  count_4xx=$(awk '$0 ~ /"status":[[:space:]]*4[0-9][0-9]/ { count++ } END { print count + 0 }' "$TEMP_CADDY_LOG")
  count_go_429=$(awk 'index($0, "\"uri\":\"/go/") && $0 ~ /"status":[[:space:]]*429/ { count++ } END { print count + 0 }' "$TEMP_CADDY_LOG")

  [ "$count_5xx" -lt "$MAX_5XX_PER_WINDOW" ] \
    || fail_check "За $LOG_LOOKBACK найдено $count_5xx ответов 5xx"
  [ "$count_4xx" -lt "$MAX_4XX_PER_WINDOW" ] \
    || fail_check "За $LOG_LOOKBACK найдено $count_4xx ответов 4xx: возможен всплеск сканирования"
  [ "$count_go_429" -lt "$MAX_GO_429_PER_WINDOW" ] \
    || fail_check "За $LOG_LOOKBACK найдено $count_go_429 ответов 429 на /go/"
  log INFO "Caddy за $LOG_LOOKBACK: 4xx=$count_4xx, 5xx=$count_5xx, /go 429=$count_go_429"
}

run_backup_check() {
  if [ ! -x "$BACKUP_COMMAND" ]; then
    : > "$BACKUP_FAILURE_FLAG"
    fail_check "Не найдена команда проверки бэкапов: $BACKUP_COMMAND"
    return
  fi
  if "$BACKUP_COMMAND" check >> "$LOG_FILE" 2>&1; then
    rm -f -- "$BACKUP_FAILURE_FLAG"
    log INFO "Глубокая проверка локальных и Google Drive бэкапов пройдена"
  else
    : > "$BACKUP_FAILURE_FLAG"
    fail_check "Команда zaimkarta-backup check завершилась ошибкой"
  fi
}

publish_health_marker() {
  marker_timestamp=$(date '+%s')
  if compose exec -T app sh -ec 'umask 077; printf "%s\n" "$1" > "$2"' sh "$marker_timestamp" "$HEALTH_MARKER_FILE" >/dev/null 2>&1; then
    log INFO "Служебный health marker обновлён"
  else
    fail_check "Не удалось обновить служебный health marker в контейнере app"
  fi
}

clear_health_marker() {
  compose exec -T app rm -f -- "$HEALTH_MARKER_FILE" >/dev/null 2>&1 || true
}

run_quick_checks() {
  check_disk
  check_memory_and_load
  check_docker
  check_http
  check_backup_freshness
  check_caddy_logs
}

validate_settings
trap finish EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

mode=${1:-all}
log INFO "Начинаю health-проверку: режим=$mode"
case "$mode" in
  quick) PUBLISH_MARKER=1; run_quick_checks ;;
  backup) run_backup_check ;;
  all) PUBLISH_MARKER=1; run_quick_checks; run_backup_check ;;
  *) printf 'Использование: %s [quick|backup|all]\n' "$0" >&2; exit 2 ;;
esac

if [ "$FAILURES" -eq 0 ] && [ "$PUBLISH_MARKER" -eq 1 ]; then
  publish_health_marker
fi

if [ "$FAILURES" -eq 0 ]; then
  log INFO "STATUS OK: все проверки пройдены"
  exit 0
fi

clear_health_marker
log ERROR "STATUS FAIL: проблем найдено — $FAILURES; внешний health endpoint переведён в ошибку"
exit 1

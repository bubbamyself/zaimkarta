#!/bin/sh

set -eu

umask 077

BACKUP_CONFIG_FILE=${BACKUP_CONFIG_FILE:-/etc/zaimkarta-backup.conf}
if [ -r "$BACKUP_CONFIG_FILE" ]; then
  # Конфигурация создаётся root-инсталлятором и не хранит пароль Google или базы.
  # shellcheck disable=SC1090
  . "$BACKUP_CONFIG_FILE"
fi

PROJECT_DIR=${PROJECT_DIR:-/home/deploy/zaimkarta/deploy}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
BACKUP_ROOT=${BACKUP_ROOT:-/home/deploy/backups/zaimkarta}
BACKUP_OWNER=${BACKUP_OWNER:-}
DB_SERVICE=${DB_SERVICE:-db}
APP_SERVICE=${APP_SERVICE:-app}
DAILY_RETENTION_DAYS=${DAILY_RETENTION_DAYS:-7}
WEEKLY_RETENTION_DAYS=${WEEKLY_RETENTION_DAYS:-28}
MAX_BACKUP_AGE_HOURS=${MAX_BACKUP_AGE_HOURS:-36}
RCLONE_BIN=${RCLONE_BIN:-rclone}
RCLONE_CONFIG=${RCLONE_CONFIG:-/home/deploy/.config/rclone/rclone.conf}
OFFSITE_REMOTE=${OFFSITE_REMOTE:-}
REQUIRE_OFFSITE_COPY=${REQUIRE_OFFSITE_COPY:-0}
ALLOW_REMOTE_DELETE=${ALLOW_REMOTE_DELETE:-0}
REMOTE_DAILY_RETENTION_DAYS=${REMOTE_DAILY_RETENTION_DAYS:-7}
REMOTE_WEEKLY_RETENTION_DAYS=${REMOTE_WEEKLY_RETENTION_DAYS:-28}
RESTORE_TEST_CONTAINER=${RESTORE_TEST_CONTAINER:-zaimkarta-backup-restore-test}
RESTORE_TEST_DATABASE=${RESTORE_TEST_DATABASE:-restore_test}

DB_DAILY_DIR="$BACKUP_ROOT/db/daily"
DB_WEEKLY_DIR="$BACKUP_ROOT/db/weekly"
UPLOADS_DAILY_DIR="$BACKUP_ROOT/uploads/daily"
UPLOADS_WEEKLY_DIR="$BACKUP_ROOT/uploads/weekly"
LOG_DIR="$BACKUP_ROOT/logs"
LOCK_DIR="$BACKUP_ROOT/.backup.lock"
TIMESTAMP=$(date -u '+%Y%m%dT%H%M%SZ')
LOG_FILE="$LOG_DIR/backup-$TIMESTAMP.log"
DB_FILE="$DB_DAILY_DIR/db-$TIMESTAMP.dump"
UPLOADS_FILE="$UPLOADS_DAILY_DIR/uploads-logos-$TIMESTAMP.tar.gz"
DB_PARTIAL="$DB_FILE.partial"
UPLOADS_PARTIAL="$UPLOADS_FILE.partial"
WEEKLY_CREATED=0
RESTORE_CONTAINER_CREATED=0

log() {
  level=$1
  shift
  line="$(date -u '+%Y-%m-%dT%H:%M:%SZ') [$level] $*"
  printf '%s\n' "$line"
  if [ -n "${LOG_FILE:-}" ] && [ -d "${LOG_DIR:-/path/that/does/not/exist}" ]; then
    printf '%s\n' "$line" >> "$LOG_FILE"
  fi
}

fail() {
  log ERROR "$*"
  exit 1
}

cleanup() {
  rm -f -- "$DB_PARTIAL" "$UPLOADS_PARTIAL"
  if [ "$RESTORE_CONTAINER_CREATED" -eq 1 ]; then
    docker rm -f "$RESTORE_TEST_CONTAINER" >/dev/null 2>&1 || true
    RESTORE_CONTAINER_CREATED=0
  fi
  if [ -d "$LOCK_DIR" ]; then
    rmdir "$LOCK_DIR" 2>/dev/null || true
  fi
}

finish() {
  status=$?
  trap - EXIT HUP INT TERM
  if [ "$status" -ne 0 ]; then
    log ERROR "Production backup завершился аварийно, код ошибки: $status"
  fi
  cleanup
  exit "$status"
}

validate_settings() {
  case "$BACKUP_ROOT" in
    /*) ;;
    *) fail "BACKUP_ROOT должен быть абсолютным путём" ;;
  esac

  case "$BACKUP_ROOT" in
    /|*/../*|*/..|*/site/public|*/site/public/*|*/public/uploads|*/public/uploads/*)
      fail "Небезопасный BACKUP_ROOT: каталог не должен быть корнем, содержать '..' или находиться в public/uploads"
      ;;
  esac

  case "$DAILY_RETENTION_DAYS:$WEEKLY_RETENTION_DAYS:$MAX_BACKUP_AGE_HOURS:$REMOTE_DAILY_RETENTION_DAYS:$REMOTE_WEEKLY_RETENTION_DAYS" in
    *[!0-9:]*|:*|*::*|*:)
      fail "Сроки хранения и максимальный возраст должны быть целыми числами"
      ;;
  esac

  [ "$DAILY_RETENTION_DAYS" -ge 7 ] || fail "DAILY_RETENTION_DAYS не может быть меньше 7"
  [ "$WEEKLY_RETENTION_DAYS" -ge 28 ] || fail "WEEKLY_RETENTION_DAYS не может быть меньше 28"
  [ "$MAX_BACKUP_AGE_HOURS" -ge 1 ] || fail "MAX_BACKUP_AGE_HOURS должен быть больше нуля"
  [ "$REMOTE_DAILY_RETENTION_DAYS" -ge 7 ] || fail "REMOTE_DAILY_RETENTION_DAYS не может быть меньше 7"
  [ "$REMOTE_WEEKLY_RETENTION_DAYS" -ge 28 ] || fail "REMOTE_WEEKLY_RETENTION_DAYS не может быть меньше 28"

  case "$REQUIRE_OFFSITE_COPY:$ALLOW_REMOTE_DELETE" in
    0:0|0:1|1:0|1:1) ;;
    *) fail "REQUIRE_OFFSITE_COPY и ALLOW_REMOTE_DELETE принимают только 0 или 1" ;;
  esac

  if [ "$REQUIRE_OFFSITE_COPY" -eq 1 ] || [ -n "$OFFSITE_REMOTE" ]; then
    [ -n "$OFFSITE_REMOTE" ] || fail "OFFSITE_REMOTE обязателен для внешней копии"
    case "$OFFSITE_REMOTE" in
      *:*) ;;
      *) fail "OFFSITE_REMOTE должен иметь формат remote:закрытая-папка" ;;
    esac
    remote_path=${OFFSITE_REMOTE#*:}
    [ -n "$remote_path" ] || fail "OFFSITE_REMOTE не должен указывать на корень Google Drive"
    case "$remote_path" in
      /|/*|*/../*|*/..)
        fail "Небезопасный путь OFFSITE_REMOTE"
        ;;
    esac
    case "$RCLONE_CONFIG" in
      /*) ;;
      *) fail "RCLONE_CONFIG должен быть абсолютным путём" ;;
    esac
  fi
}

apply_owner() {
  [ -n "$BACKUP_OWNER" ] || return 0
  chown "$BACKUP_OWNER" "$@"
}

prepare_directories() {
  mkdir -p "$DB_DAILY_DIR" "$DB_WEEKLY_DIR" "$UPLOADS_DAILY_DIR" "$UPLOADS_WEEKLY_DIR" "$LOG_DIR"
  chmod 700 "$BACKUP_ROOT" "$BACKUP_ROOT/db" "$DB_DAILY_DIR" "$DB_WEEKLY_DIR" \
    "$BACKUP_ROOT/uploads" "$UPLOADS_DAILY_DIR" "$UPLOADS_WEEKLY_DIR" "$LOG_DIR"
  apply_owner "$BACKUP_ROOT" "$BACKUP_ROOT/db" "$DB_DAILY_DIR" "$DB_WEEKLY_DIR" \
    "$BACKUP_ROOT/uploads" "$UPLOADS_DAILY_DIR" "$UPLOADS_WEEKLY_DIR" "$LOG_DIR"
  : > "$LOG_FILE"
  chmod 600 "$LOG_FILE"
  apply_owner "$LOG_FILE"

  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    fail "Другой запуск бэкапа уже выполняется: $LOCK_DIR"
  fi
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

check_services() {
  [ -d "$PROJECT_DIR" ] || fail "Не найден production-каталог: $PROJECT_DIR"
  cd "$PROJECT_DIR"
  [ -f "$COMPOSE_FILE" ] || fail "Не найден Compose-файл: $PROJECT_DIR/$COMPOSE_FILE"
  command -v docker >/dev/null 2>&1 || fail "Docker не найден"
  compose ps --status running "$DB_SERVICE" | grep -q "$DB_SERVICE" || fail "Сервис PostgreSQL '$DB_SERVICE' не запущен"
  compose ps --status running "$APP_SERVICE" | grep -q "$APP_SERVICE" || fail "Сервис приложения '$APP_SERVICE' не запущен"
}

create_database_backup() {
  log INFO "Создаю сжатый PostgreSQL dump"
  if ! compose exec -T "$DB_SERVICE" sh -ec \
    'exec pg_dump --format=custom --compress=9 --no-owner --no-acl --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
    > "$DB_PARTIAL"; then
    fail "pg_dump завершился с ошибкой"
  fi
  [ -s "$DB_PARTIAL" ] || fail "pg_dump создал пустой файл"
  if ! compose exec -T "$DB_SERVICE" pg_restore --list < "$DB_PARTIAL" >/dev/null; then
    fail "Созданный PostgreSQL dump не прошёл проверку pg_restore --list"
  fi
  mv "$DB_PARTIAL" "$DB_FILE"
  chmod 600 "$DB_FILE"
  apply_owner "$DB_FILE"
  log INFO "PostgreSQL dump готов: $DB_FILE"
}

create_uploads_backup() {
  log INFO "Архивирую uploads/logos без изменения рабочих файлов"
  if ! compose exec -T "$APP_SERVICE" sh -ec \
    'test -d /app/public/uploads/logos && exec tar -czf - -C /app/public uploads/logos' \
    > "$UPLOADS_PARTIAL"; then
    fail "Не удалось создать архив uploads/logos"
  fi
  [ -s "$UPLOADS_PARTIAL" ] || fail "Архив uploads/logos пуст"
  if ! tar -tzf "$UPLOADS_PARTIAL" | grep -q '^uploads/logos/'; then
    fail "Архив не содержит каталог uploads/logos"
  fi
  mv "$UPLOADS_PARTIAL" "$UPLOADS_FILE"
  chmod 600 "$UPLOADS_FILE"
  apply_owner "$UPLOADS_FILE"
  log INFO "Архив логотипов готов: $UPLOADS_FILE"
}

create_weekly_copies() {
  if [ "$(date -u '+%u')" -eq 7 ]; then
    cp -p "$DB_FILE" "$DB_WEEKLY_DIR/$(basename "$DB_FILE")"
    cp -p "$UPLOADS_FILE" "$UPLOADS_WEEKLY_DIR/$(basename "$UPLOADS_FILE")"
    apply_owner "$DB_WEEKLY_DIR/$(basename "$DB_FILE")" "$UPLOADS_WEEKLY_DIR/$(basename "$UPLOADS_FILE")"
    WEEKLY_CREATED=1
    log INFO "Созданы недельные копии"
  fi
}

rclone_command() {
  "$RCLONE_BIN" --config "$RCLONE_CONFIG" "$@"
}

check_offsite_ready() {
  if [ -z "$OFFSITE_REMOTE" ]; then
    [ "$REQUIRE_OFFSITE_COPY" -eq 0 ] || fail "Внешнее хранилище обязательно, но OFFSITE_REMOTE не задан"
    return 1
  fi
  [ -x "$RCLONE_BIN" ] || command -v "$RCLONE_BIN" >/dev/null 2>&1 \
    || fail "rclone не найден: $RCLONE_BIN"
  [ -r "$RCLONE_CONFIG" ] || fail "Не найден закрытый rclone config: $RCLONE_CONFIG"
  rclone_command listremotes | grep -q "^${OFFSITE_REMOTE%%:*}:$" \
    || fail "В rclone config не найден remote '${OFFSITE_REMOTE%%:*}'"
}

check_remote_file() {
  local_dir=$1
  remote_dir=$2
  filename=$3
  rclone_command check "$local_dir" "$remote_dir" --include "/$filename" --one-way \
    || fail "Внешняя копия не прошла проверку: $remote_dir/$filename"
}

upload_offsite() {
  if ! check_offsite_ready; then
    log WARN "Внешняя отправка не настроена: свежие архивы остаются только на VPS"
    return 0
  fi

  db_name=$(basename "$DB_FILE")
  uploads_name=$(basename "$UPLOADS_FILE")
  log INFO "Отправляю свежие архивы во внешнее хранилище"
  rclone_command copyto "$DB_FILE" "$OFFSITE_REMOTE/db/daily/$db_name" --checksum --immutable \
    || fail "Не удалось отправить PostgreSQL dump во внешнее хранилище"
  rclone_command copyto "$UPLOADS_FILE" "$OFFSITE_REMOTE/uploads/daily/$uploads_name" --checksum --immutable \
    || fail "Не удалось отправить uploads-архив во внешнее хранилище"

  check_remote_file "$DB_DAILY_DIR" "$OFFSITE_REMOTE/db/daily" "$db_name"
  check_remote_file "$UPLOADS_DAILY_DIR" "$OFFSITE_REMOTE/uploads/daily" "$uploads_name"

  if [ "$WEEKLY_CREATED" -eq 1 ]; then
    rclone_command copyto "$DB_WEEKLY_DIR/$db_name" "$OFFSITE_REMOTE/db/weekly/$db_name" --checksum --immutable \
      || fail "Не удалось отправить недельный PostgreSQL dump"
    rclone_command copyto "$UPLOADS_WEEKLY_DIR/$uploads_name" "$OFFSITE_REMOTE/uploads/weekly/$uploads_name" --checksum --immutable \
      || fail "Не удалось отправить недельный uploads-архив"
    check_remote_file "$DB_WEEKLY_DIR" "$OFFSITE_REMOTE/db/weekly" "$db_name"
    check_remote_file "$UPLOADS_WEEKLY_DIR" "$OFFSITE_REMOTE/uploads/weekly" "$uploads_name"
  fi
  log INFO "Внешняя копия создана и проверена"
}

delete_remote_old_files() {
  remote_dir=$1
  days=$2
  pattern=$3
  mode=$4
  # На первом запуске weekly-каталоги в Google Drive ещё отсутствуют.
  # Создаём пустой каталог, чтобы rclone не считал нормальное состояние ошибкой.
  rclone_command mkdir "$remote_dir"
  if [ "$mode" = "dry-run" ]; then
    rclone_command delete "$remote_dir" --min-age "${days}d" --include "$pattern" --dry-run --verbose
  else
    rclone_command delete "$remote_dir" --min-age "${days}d" --include "$pattern"
  fi
}

apply_remote_retention() {
  mode=${1:-apply}
  check_offsite_ready || fail "Для проверки remote retention не настроено внешнее хранилище"
  [ "$mode" = "dry-run" ] || [ "$ALLOW_REMOTE_DELETE" -eq 1 ] \
    || fail "Удаление старых внешних копий заблокировано: сначала выполните retention-dry-run"

  delete_remote_old_files "$OFFSITE_REMOTE/db/daily" "$REMOTE_DAILY_RETENTION_DAYS" 'db-*.dump' "$mode"
  delete_remote_old_files "$OFFSITE_REMOTE/uploads/daily" "$REMOTE_DAILY_RETENTION_DAYS" 'uploads-logos-*.tar.gz' "$mode"
  delete_remote_old_files "$OFFSITE_REMOTE/db/weekly" "$REMOTE_WEEKLY_RETENTION_DAYS" 'db-*.dump' "$mode"
  delete_remote_old_files "$OFFSITE_REMOTE/uploads/weekly" "$REMOTE_WEEKLY_RETENTION_DAYS" 'uploads-logos-*.tar.gz' "$mode"

  if [ "$mode" = "dry-run" ]; then
    log INFO "Remote retention dry-run завершён: файлы не удалялись"
  else
    log INFO "Remote retention применён: daily=$REMOTE_DAILY_RETENTION_DAYS дней, weekly=$REMOTE_WEEKLY_RETENTION_DAYS дней"
  fi
}

apply_retention() {
  find "$DB_DAILY_DIR" -type f -name 'db-*.dump' -mtime "+$DAILY_RETENTION_DAYS" -delete
  find "$UPLOADS_DAILY_DIR" -type f -name 'uploads-logos-*.tar.gz' -mtime "+$DAILY_RETENTION_DAYS" -delete
  find "$DB_WEEKLY_DIR" -type f -name 'db-*.dump' -mtime "+$WEEKLY_RETENTION_DAYS" -delete
  find "$UPLOADS_WEEKLY_DIR" -type f -name 'uploads-logos-*.tar.gz' -mtime "+$WEEKLY_RETENTION_DAYS" -delete
  find "$LOG_DIR" -type f -name 'backup-*.log' -mtime "+$WEEKLY_RETENTION_DAYS" -delete
  log INFO "Retention применён: daily=$DAILY_RETENTION_DAYS дней, weekly=$WEEKLY_RETENTION_DAYS дней"
}

newest_file() {
  directory=$1
  pattern=$2
  find "$directory" -type f -name "$pattern" -print 2>/dev/null | sort | tail -n 1
}

check_freshness() {
  validate_settings
  prepare_directories
  trap finish EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  check_services

  latest_db=$(newest_file "$DB_DAILY_DIR" 'db-*.dump')
  latest_uploads=$(newest_file "$UPLOADS_DAILY_DIR" 'uploads-logos-*.tar.gz')
  [ -n "$latest_db" ] || fail "Не найден ни один ежедневный dump базы"
  [ -n "$latest_uploads" ] || fail "Не найден ни один ежедневный архив uploads/logos"

  now=$(date '+%s')
  db_age_hours=$(( (now - $(date -r "$latest_db" '+%s')) / 3600 ))
  uploads_age_hours=$(( (now - $(date -r "$latest_uploads" '+%s')) / 3600 ))
  [ "$db_age_hours" -le "$MAX_BACKUP_AGE_HOURS" ] || fail "Dump базы старше $MAX_BACKUP_AGE_HOURS часов"
  [ "$uploads_age_hours" -le "$MAX_BACKUP_AGE_HOURS" ] || fail "Архив uploads старше $MAX_BACKUP_AGE_HOURS часов"

  compose exec -T "$DB_SERVICE" pg_restore --list < "$latest_db" >/dev/null \
    || fail "Свежий dump не читается через pg_restore --list"
  tar -tzf "$latest_uploads" | grep -q '^uploads/logos/' \
    || fail "Свежий uploads-архив не содержит uploads/logos"
  if check_offsite_ready; then
    check_remote_file "$DB_DAILY_DIR" "$OFFSITE_REMOTE/db/daily" "$(basename "$latest_db")"
    check_remote_file "$UPLOADS_DAILY_DIR" "$OFFSITE_REMOTE/uploads/daily" "$(basename "$latest_uploads")"
  fi
  log INFO "Свежесть и структура бэкапов проверены: db=${db_age_hours}ч, uploads=${uploads_age_hours}ч"
}

run_retention_dry_run() {
  validate_settings
  prepare_directories
  trap finish EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  apply_remote_retention dry-run
}

run_restore_test() {
  validate_settings
  prepare_directories
  trap finish EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  check_services

  latest_db=$(newest_file "$DB_DAILY_DIR" 'db-*.dump')
  [ -n "$latest_db" ] || fail "Для тестового восстановления не найден dump базы"
  if docker ps -a --format '{{.Names}}' | grep -Fxq "$RESTORE_TEST_CONTAINER"; then
    fail "Тестовый контейнер уже существует: $RESTORE_TEST_CONTAINER"
  fi
  command -v openssl >/dev/null 2>&1 || fail "OpenSSL не найден для временного пароля restore-test"
  restore_password=$(openssl rand -hex 24)

  log INFO "Запускаю изолированный контейнер тестового восстановления без публикации портов"
  docker run --detach --name "$RESTORE_TEST_CONTAINER" --network none \
    -e "POSTGRES_PASSWORD=$restore_password" -e "POSTGRES_DB=$RESTORE_TEST_DATABASE" \
    postgres:17-alpine >/dev/null \
    || fail "Не удалось запустить контейнер тестового восстановления"
  RESTORE_CONTAINER_CREATED=1

  attempt=0
  until docker exec "$RESTORE_TEST_CONTAINER" pg_isready -U postgres -d "$RESTORE_TEST_DATABASE" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 30 ] || fail "Тестовый PostgreSQL не стал готов за 30 секунд"
    sleep 1
  done

  docker exec -i "$RESTORE_TEST_CONTAINER" pg_restore --exit-on-error --no-owner --no-acl \
    -U postgres -d "$RESTORE_TEST_DATABASE" < "$latest_db" >/dev/null \
    || fail "Тестовое восстановление pg_restore завершилось с ошибкой"

  restored_tables=$(docker exec "$RESTORE_TEST_CONTAINER" psql -U postgres -d "$RESTORE_TEST_DATABASE" -Atc \
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('Offer','AffiliateOffer','OfferClick','AdminUser','SeoPage','SystemSetting') ORDER BY tablename;")
  for table in Offer AffiliateOffer OfferClick AdminUser SeoPage SystemSetting; do
    printf '%s\n' "$restored_tables" | grep -Fxq "$table" \
      || fail "После восстановления не найдена ключевая таблица: $table"
  done
  log INFO "Тестовое восстановление успешно: проверены 6 ключевых таблиц"
}

run_backup() {
  validate_settings
  prepare_directories
  trap finish EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  check_services
  log INFO "Начинаю production backup"
  create_database_backup
  create_uploads_backup
  create_weekly_copies
  upload_offsite
  if [ -n "$OFFSITE_REMOTE" ] && [ "$ALLOW_REMOTE_DELETE" -eq 1 ]; then
    apply_remote_retention apply
  fi
  apply_retention
  log INFO "Production backup успешно завершён"
}

case "${1:-run}" in
  run) run_backup ;;
  check) check_freshness ;;
  retention-dry-run) run_retention_dry_run ;;
  restore-test) run_restore_test ;;
  *) printf 'Использование: %s [run|check|retention-dry-run|restore-test]\n' "$0" >&2; exit 2 ;;
esac

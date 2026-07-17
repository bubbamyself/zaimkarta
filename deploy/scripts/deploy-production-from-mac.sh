#!/usr/bin/env bash

set -euo pipefail

SSH_TARGET=${ZAIMKARTA_SSH_TARGET:-deploy@155.212.223.62}

command -v ssh >/dev/null 2>&1 || {
  printf '%s\n' 'ОШИБКА: на Mac не найдена команда ssh.' >&2
  exit 1
}

REMOTE_SCRIPT=
IFS= read -r -d '' REMOTE_SCRIPT <<'REMOTE_SCRIPT_EOF' || true
set -euo pipefail

PROJECT_DIR=/home/deploy/zaimkarta
DEPLOY_DIR=$PROJECT_DIR/deploy
COMPOSE_FILE=docker-compose.prod.yml
EXPECTED_BRANCH=main
HEALTH_URL=https://zaimkarta.ru/api/health/server
HEALTH_MARKER_FILE=/tmp/zaimkarta-health-ok
HEALTH_LOG=/var/log/zaimkarta-health.log
APP_URL=https://zaimkarta.ru/
ADMIN_URL=https://zaimkarta.ru/admin/login
LOCK_FILE=$HOME/.zaimkarta-production-deploy.lock
SUDO_KEEPALIVE_PID=

fail() {
  printf 'ОШИБКА: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  if [ -n "$SUDO_KEEPALIVE_PID" ]; then
    kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true
  fi
}

redact_logs() {
  sed -E \
    -e 's/(ZAIMKARTA_MAIL_PASSWORD=)[^[:space:]]+/\1[СКРЫТО]/g' \
    -e 's#(postgresql://[^:/@]+:)[^@]+@#\1[СКРЫТО]@#g'
}

show_app_logs() {
  sudo -n docker compose -f "$COMPOSE_FILE" logs --no-color --tail=100 app 2>/dev/null \
    | redact_logs || true
}

trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

command -v flock >/dev/null 2>&1 || fail 'на VPS не найдена команда flock.'
command -v git >/dev/null 2>&1 || fail 'на VPS не найдена команда git.'
command -v curl >/dev/null 2>&1 || fail 'на VPS не найдена команда curl.'
[ -d "$PROJECT_DIR/.git" ] || fail "не найден Git-проект $PROJECT_DIR."
[ -f "$DEPLOY_DIR/$COMPOSE_FILE" ] || fail "не найден production Compose $DEPLOY_DIR/$COMPOSE_FILE."
[ -f "$DEPLOY_DIR/production.env.server" ] || fail 'не найден закрытый production.env.server.'

exec 9>"$LOCK_FILE"
flock -n 9 || fail 'другой production-деплой уже выполняется.'

cd "$PROJECT_DIR"

current_branch=$(git symbolic-ref --short HEAD 2>/dev/null || true)
[ "$current_branch" = "$EXPECTED_BRANCH" ] \
  || fail "на VPS выбрана ветка '$current_branch' вместо '$EXPECTED_BRANCH'."

status=$(git status --porcelain)
unexpected=$(printf '%s\n' "$status" \
  | grep -Ev '^(\?\? deploy/Caddyfile|\?\? deploy/docker-compose\.prod\.yml)?$' || true)
[ -z "$unexpected" ] || {
  printf '%s\n' 'Найдены неожиданные изменения Git:' >&2
  printf '%s\n' "$unexpected" >&2
  fail 'рабочая копия VPS не изменялась.'
}

printf '%s\n' 'Получаю сведения о новом main без изменения рабочих файлов...'
git fetch origin main

tracked_server_files=$(git ls-tree -r --name-only origin/main -- \
  deploy/Caddyfile deploy/docker-compose.prod.yml deploy/production.env.server)
[ -z "$tracked_server_files" ] || {
  printf '%s\n' 'Новый main содержит закрытые серверные файлы:' >&2
  printf '%s\n' "$tracked_server_files" >&2
  fail 'деплой остановлен до ручной проверки.'
}

git merge-base --is-ancestor HEAD origin/main \
  || fail 'история VPS и origin/main разошлась; fast-forward невозможен.'

old_commit=$(git rev-parse HEAD)
target_commit=$(git rev-parse origin/main)

if [ "$old_commit" = "$target_commit" ]; then
  fail 'на VPS уже установлен последний main; нового коммита для деплоя нет.'
fi

printf '\n%s\n' 'Коммиты, которые будут размещены:'
git log --oneline "$old_commit..$target_commit"
printf '\nТекущий commit: %s\nНовый commit:   %s\n' "$old_commit" "$target_commit"
printf '%s' 'Для продолжения введите DEPLOY: '
read -r confirmation
[ "$confirmation" = 'DEPLOY' ] || fail 'пользователь отменил деплой.'

printf '%s\n' 'Проверяю sudo. Пароль вводится скрыто и не сохраняется...'
sudo -v

(
  while true; do
    sudo -n true || exit
    sleep 60
  done
) &
SUDO_KEEPALIVE_PID=$!

cd "$DEPLOY_DIR"
db_before=$(sudo -n docker compose -f "$COMPOSE_FILE" ps -q db)
caddy_before=$(sudo -n docker compose -f "$COMPOSE_FILE" ps -q caddy)
[ -n "$db_before" ] || fail 'контейнер PostgreSQL не найден.'
[ -n "$caddy_before" ] || fail 'контейнер Caddy не найден.'

db_state=$(sudo -n docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$db_before")
case "$db_state" in
  'running healthy') : ;;
  *) fail "PostgreSQL не готов до деплоя: $db_state." ;;
esac

caddy_state=$(sudo -n docker inspect --format '{{.State.Status}}' "$caddy_before")
[ "$caddy_state" = 'running' ] || fail "Caddy не работает до деплоя: $caddy_state."

[ -f "$HEALTH_LOG" ] || fail "не найден журнал monitoring: $HEALTH_LOG."

cd "$PROJECT_DIR"
printf '%s\n' 'Применяю только fast-forward из origin/main...'
git pull --ff-only origin main
[ "$(git rev-parse HEAD)" = "$target_commit" ] || fail 'после pull установлен неожиданный commit.'

cd "$DEPLOY_DIR"
printf '%s\n' 'Пересобираю только app...'
sudo -n docker compose -f "$COMPOSE_FILE" build app

health_log_start_line=$(sudo -n wc -l "$HEALTH_LOG" | awk '{print $1}')
case "$health_log_start_line" in
  ''|*[!0-9]*) fail 'не удалось запомнить позицию в журнале monitoring.' ;;
esac

printf '%s\n' 'Заменяю только app без запуска и пересоздания зависимостей...'
sudo -n docker compose -f "$COMPOSE_FILE" up -d --no-deps app

db_after=$(sudo -n docker compose -f "$COMPOSE_FILE" ps -q db)
caddy_after=$(sudo -n docker compose -f "$COMPOSE_FILE" ps -q caddy)
[ "$db_after" = "$db_before" ] || fail 'контейнер PostgreSQL неожиданно изменился.'
[ "$caddy_after" = "$caddy_before" ] || fail 'контейнер Caddy неожиданно изменился.'

app_id=$(sudo -n docker compose -f "$COMPOSE_FILE" ps -q app)
[ -n "$app_id" ] || fail 'новый контейнер app не найден.'

printf '%s\n' 'Жду состояния app=healthy...'
app_healthy=0
for attempt in $(seq 1 48); do
  app_state=$(sudo -n docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$app_id")
  case "$app_state" in
    'running healthy') app_healthy=1; break ;;
    'exited '*|'dead '*|'removing '*|'restarting unhealthy')
      printf 'app перешёл в опасное состояние: %s\n' "$app_state" >&2
      show_app_logs
      fail 'новый app не запустился.'
      ;;
  esac
  sleep 5
done

if [ "$app_healthy" -ne 1 ]; then
  show_app_logs
  fail 'app не получил healthy за 4 минуты.'
fi

app_logs=$(sudo -n docker compose -f "$COMPOSE_FILE" logs --no-color --tail=180 app)
grep -q 'Ready in' <<<"$app_logs" || {
  printf '%s\n' "$app_logs" | redact_logs
  fail 'в логах app не найдена строка Ready.'
}
grep -Eq 'No pending migrations to apply|All migrations have been successfully applied' <<<"$app_logs" || {
    printf '%s\n' "$app_logs" | redact_logs
    fail 'не подтверждён успешный результат миграций.'
  }

check_http_200() {
  url=$1
  label=$2
  status=$(curl --silent --show-error --max-time 20 --output /dev/null --write-out '%{http_code}' "$url" || true)
  [ "$status" = '200' ] || fail "$label вернул HTTP $status вместо 200."
  printf '%s: HTTP 200\n' "$label"
}

check_http_200 "$APP_URL" 'Главная страница'
check_http_200 "$ADMIN_URL" 'Страница входа в админку'

printf '%s\n' 'Жду успешной плановой health-проверки. К сайту во время ожидания не обращаюсь...'
health_marker_ready=0
for minute in $(seq 0 20); do
  new_health_logs=$(sudo -n tail -n "+$((health_log_start_line + 1))" "$HEALTH_LOG" 2>/dev/null || true)
  if sudo -n docker compose -f "$COMPOSE_FILE" exec -T app test -f "$HEALTH_MARKER_FILE" \
    && grep -q 'STATUS OK: все проверки пройдены' <<<"$new_health_logs"; then
    health_marker_ready=1
    break
  fi
  [ "$minute" -lt 20 ] || break
  printf 'Плановый monitoring ещё не опубликовал health marker; жду 1 минуту (%s/20).\n' "$((minute + 1))"
  sleep 60
done

if [ "$health_marker_ready" -ne 1 ]; then
  printf '%s\n' 'Последние строки журнала monitoring:' >&2
  sudo -n tail -n 50 /var/log/zaimkarta-health.log 2>/dev/null | redact_logs || true
  fail 'плановый monitoring не создал health marker за 20 минут.'
fi

health_status=$(curl --silent --show-error --max-time 20 --output /dev/null --write-out '%{http_code}' "$HEALTH_URL" || true)
[ "$health_status" = '200' ] || fail "после STATUS OK внешний health-check вернул HTTP ${health_status:-нет ответа} вместо 200."

printf '%s\n' 'Плановый monitoring: STATUS OK'
printf '%s\n' 'Внешний health-check: HTTP 200'
printf '%s\n' 'Итоговое состояние контейнеров:'
sudo -n docker compose -f "$COMPOSE_FILE" ps

printf '\n%s\n' 'DEPLOY SUCCESS'
printf 'Установлен commit: %s\n' "$(git -C "$PROJECT_DIR" log -1 --oneline)"
printf '%s\n' 'PostgreSQL и Caddy не пересоздавались.'
printf '%s\n' 'Миграции, app=healthy, главная, админка и внешний health-check проверены.'
REMOTE_SCRIPT_EOF

printf '%s\n' 'Запускаю безопасный production-деплой ZaimKarta.'
printf '%s\n' 'Скрипт сначала покажет новые коммиты и попросит ввести DEPLOY.'
printf '%s\n' 'Пароль sudo вводится только в защищённом SSH-сеансе и не сохраняется.'

ssh \
  -tt \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=120 \
  "$SSH_TARGET" \
  "bash -lc $(printf '%q' "$REMOTE_SCRIPT")"
